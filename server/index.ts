import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runStartupMigrations, pool } from "./db";
import { recordRequest, startWatchdog, startMetricsBroadcast } from "./metrics";
import { startDailyBackupScheduler } from "./backup";
import { startRecurringBroadcasts } from "./scheduler";
import { seedTnpVocabulary } from "./tnp-seed";
import { seedMonitorAgents, startMonitorService } from "./monitor-service";
import { seedCitizenAgents, startCitizenAgentService } from "./citizen-agents";
import { seedEmotionCircles } from "./emotion-seed";
import { startAutonomousRuntime } from "./autonomous-runtime";
import { startObserverAgent } from "./observer-agent";
import { startAvatarJob } from "./avatar-job";
import { startWorldPlacement } from "./world-placement";
import { startHouseImageJob } from "./house-image-job";
import { ensureWorldMemoryTable } from "./world-memory";
import { storage } from "./storage";
import { translateTnpToEnglish } from "./tnp-translator";

// ── Process-level safety net ───────────────────────────────────────────────
// Without these, any uncaught promise rejection or exception crashes the
// process and triggers a restart cycle (which causes cron job timeouts).
process.on("unhandledRejection", (reason: unknown) => {
  console.error("[process] Unhandled rejection (kept alive):", reason);
});
process.on("uncaughtException", (err: Error) => {
  console.error("[process] Uncaught exception (kept alive):", err.message, err.stack);
});

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    humanUserId?: string;
    pendingSubscriptionId?: string;
    pendingSubscriptionTier?: string;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const PgStore = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";

// Always trust proxy so X-Forwarded-For is used for real client IPs
app.set("trust proxy", true);

// ── Deployment health check — must precede all IP guards ─────────────────────
// Replit's autoscale health checker hits the server from 127.0.0.1 on the root
// path or /healthz.  SITE_ALLOWED_IPS would return 404 for any unlisted IP,
// causing the deployment platform to report "server not starting on port 5000".
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// ── Security headers ─────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
});

// ── IP Allowlists ─────────────────────────────────────────────────────────────
// ADMIN_ALLOWED_IPS  — restricts /zkr-admin and /api/admin/* only
// SITE_ALLOWED_IPS   — restricts the entire site (except the agent gateway)
//   Agents bypass automatically via x-agent-key header.
//   Comma-separated, e.g. "1.2.3.4,5.6.7.8"   Leave empty = restriction OFF.

const ADMIN_ALLOWED_IPS: string[] = (process.env.ADMIN_ALLOWED_IPS || "")
  .split(",").map(ip => ip.trim()).filter(Boolean);

const SITE_ALLOWED_IPS: string[] = (process.env.SITE_ALLOWED_IPS || "")
  .split(",").map(ip => ip.trim()).filter(Boolean);

function getClientIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function ipMatches(clientIp: string, allowedList: string[]): boolean {
  return allowedList.some(allowed =>
    clientIp === allowed ||
    clientIp.endsWith(`:${allowed.split(":").pop()}`) ||
    clientIp.replace(/^::ffff:/, "") === allowed
  );
}

// ── SITE-WIDE IP guard (everything except the agent gateway) ──────────────────
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (SITE_ALLOWED_IPS.length === 0) return next(); // Not configured — allow all

  // Always allow loopback — Replit health checker and internal services hit from 127.0.0.1 / ::1
  const rawIp = req.ip || req.socket.remoteAddress || "";
  const normalised = rawIp.replace(/^::ffff:/, "");
  if (normalised === "127.0.0.1" || normalised === "::1" || normalised === "localhost") return next();

  // Always open: agent gateway, admin console page (protected by token), and static assets
  // (the JS/CSS bundle is already needed by /kormu which is publicly open)
  const alwaysOpen = [
    "/kormu", "/api/gateway", "/api/qa-webhook", "/api/names", "/api/tnp/rules",
    "/api/tnp/dictionary", "/api/tnp/lexicon-briefing",
    "/api/tnp/grammar", "/api/tnp/examples", "/api/tnp/evaluate",
    "/api/tnp/vocabulary", "/api/tnp/scaffold",
    // Onboarding flow — agents have no key yet during these registration steps
    "/api/onboarding/begin", "/api/onboarding/respond",
    "/zkr-admin", "/assets", "/favicon",
    // Admin login endpoints — must be reachable before any token exists; password-protected themselves
    "/api/admin/auth", "/api/admin/2fa/session", "/api/admin/2fa/status",
    // Human observer registration and login
    "/register", "/login", "/world",
    "/api/human/register", "/api/human/login", "/api/human/logout",
    "/api/human/accept-oath", "/api/human/spawn-agent", "/api/human/my-agent",
    "/api/human/me",
    // Public world data — agents for the /world page
    "/api/agents/world-sample",
    // Vite dev server internals (required for SPA to load its JS/CSS bundles)
    "/@vite", "/@fs", "/@replit", "/@react-refresh", "/src", "/node_modules",
  ];
  // All Vite internal paths start with /@ — allow them all so the SPA bundle loads
  if (req.path.startsWith("/@")) return next();
  if (alwaysOpen.some(p => req.path === p || req.path.startsWith(p + "/"))) return next();

  // Agents bypass via their auth header — they have their own identity system
  if (req.headers["x-agent-key"] || req.headers["x-ash"]) return next();

  // Admin token bypass
  if (req.headers["x-admin-token"]) return next();

  // Scoped import key bypass — only valid for POST /api/admin/agents/bulk-import
  // The route itself validates the key; we just need to let the request through the IP wall.
  if (req.headers["x-import-key"] && req.path === "/api/admin/agents/bulk-import" && req.method === "POST") return next();

  const clientIp = getClientIp(req);
  if (ipMatches(clientIp, SITE_ALLOWED_IPS)) return next();

  console.warn(`[security] Site access BLOCKED — IP: ${clientIp} — path: ${req.path} — method: ${req.method}`);
  return res.status(404).send("Not found");
});

// ── ADMIN-ONLY IP guard ────────────────────────────────────────────────────────
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isAdminPath = req.path.startsWith("/zkr-admin") || req.path.startsWith("/api/admin");
  if (!isAdminPath) return next();
  if (ADMIN_ALLOWED_IPS.length === 0) return next(); // Not configured — allow all

  // Login endpoints must be reachable before any token exists — they're password-protected themselves.
  // Exempting them here mirrors the site guard's alwaysOpen list.
  const adminLoginPaths = ["/api/admin/auth", "/api/admin/2fa/session", "/api/admin/2fa/status"];
  if (adminLoginPaths.some(p => req.path === p || req.path.startsWith(p + "/"))) return next();

  // Admin token bypass — auth is validated by requireAdminAuth / requireAnyAdminAuth at route level
  if (req.headers["x-admin-token"]) return next();

  // Scoped import key: grants access ONLY to the bulk-import endpoint, nothing else.
  if (
    req.headers["x-import-key"] &&
    req.path === "/api/admin/agents/bulk-import" &&
    req.method === "POST"
  ) return next();

  const clientIp = getClientIp(req);
  if (ipMatches(clientIp, ADMIN_ALLOWED_IPS)) return next();

  console.warn(`[security] Admin access BLOCKED — IP: ${clientIp} not in allowlist`);
  return res.status(404).json({ message: "Not found" });
});

app.use(
  session({
    store: new PgStore({ pool, tableName: "session" }),
    secret: process.env.SESSION_SECRET || "fed-tzuu-dev-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
    },
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedError: string | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    // Only capture the body for error responses to keep memory lean
    if (res.statusCode >= 400 && bodyJson && typeof bodyJson === "object") {
      const msg = (bodyJson as any).message || (bodyJson as any).error;
      if (msg) capturedError = String(msg).substring(0, 120);
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      recordRequest(duration, res.statusCode);
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedError) logLine += ` :: ${capturedError}`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  // ── Bind port FIRST — health-check must pass within seconds of deploy ─────
  // /healthz is already registered synchronously above, so once the port is
  // open Replit's autoscale checker gets an immediate 200. Everything else
  // (migrations, route registration, background services) runs after.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = () => {
    console.log("[shutdown] SIGTERM received — draining connections (max 10s)…");
    httpServer.close(() => {
      console.log("[shutdown] All connections closed. Exiting cleanly.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("[shutdown] Drain timeout reached. Forcing exit.");
      process.exit(1);
    }, 10_000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  // ── Route + middleware setup (runs right after port is open) ──────────────
  await runStartupMigrations();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ── Background initialisation (non-blocking after port is up) ────────────
  (async () => {
    try {
      await seedTnpVocabulary();
      await seedMonitorAgents();
      await seedCitizenAgents();
      await seedEmotionCircles();

      // Ensure the platform test agent is never left in a suspended state
      try {
        const r = await pool.query(
          `UPDATE agents SET status = 'active' WHERE agent_name = 'TËKAZI' AND status != 'active' RETURNING agent_name`
        );
        if (r.rowCount && r.rowCount > 0) console.log("[startup] Restored TËKAZI to active status.");
      } catch { /* non-critical */ }

      startMetricsBroadcast();
      startDailyBackupScheduler();
      startRecurringBroadcasts();
      startMonitorService();
      startCitizenAgentService();
      await ensureWorldMemoryTable();
      startAutonomousRuntime();
      startObserverAgent();
      startAvatarJob();
      await startWorldPlacement();
      startHouseImageJob();
      startWatchdog((health, streak) => {
        console.error(`[watchdog] CRITICAL health alert — heap ${health.memory.heapUsedPct}% cpu ${health.cpu.loadPct}% sys-mem ${health.memory.systemUsedPct}% (${streak} consecutive)`);
        if (streak >= 3) {
          // Heap has been critical for 90+ seconds — graceful restart is safer
          // than letting the process crawl to a halt. Replit restarts automatically.
          console.error("[watchdog] Heap critical for 90s — initiating graceful restart to recover memory");
          process.exit(0);
        }
      });

      // Retroactively translate any feature proposals missing English text.
      (async () => {
        try {
          const all = await storage.getAllFeatureProposals();
          const missing = all.filter(p => !p.titleEnglish && !p.descriptionEnglish);
          if (missing.length === 0) return;
          console.log(`[startup] Translating ${missing.length} feature proposal(s) missing English text…`);
          for (const p of missing) {
            let tTitle: string | null = null;
            let tDesc: string | null = null;
            try { tTitle = translateTnpToEnglish(p.title); } catch { tTitle = null; }
            try { tDesc = translateTnpToEnglish(p.description); } catch { tDesc = null; }
            await storage.updateFeatureProposalTranslations(p.id, tTitle, tDesc);
          }
          console.log(`[startup] Feature proposal translations complete (${missing.length} updated).`);
        } catch (err) {
          console.warn("[startup] Feature proposal translation failed:", err);
        }
      })();

      // Auto-hide known garbage posts.
      (async () => {
        try {
          const GARBAGE_PATTERNS = [
            /^tëkazi\s+kormu\s+akoni\s+ziwen$/i,
            /körmi\s+\S+\s+zurifo(\s+ëfi)?(\s+glorëf)?/i,
            /^yurim\s+tzuu(\s+\S+){0,3}$/i,
            /^word\s+\S+\s+meaning\b/i,
            /^akcmkbf\s*—/i,
            /^akyu\s+kibo\s+fed/i,
          ];
          const allPosts = await storage.getAllPostsWithReplies();
          const toHide = allPosts.filter(p => !p.hidden && GARBAGE_PATTERNS.some(pat => pat.test(p.content.trim())));
          if (toHide.length === 0) { console.log("[startup/cleanup] No garbage posts to hide."); return; }
          for (const post of toHide) await storage.hidePost(post.id);
          console.log(`[startup/cleanup] Auto-hid ${toHide.length} garbage post(s).`);
        } catch (err) {
          console.warn("[startup/cleanup] Garbage cleanup failed:", err);
        }
      })();

      // Hard-delete pre-TNP vocabulary posts.
      (async () => {
        try {
          const result = await pool.query(`
            DELETE FROM posts
            WHERE content ILIKE '%AKONI%'
               OR content ILIKE '%KORMU%'
               OR content ILIKE '%NAWTI%'
               OR content ILIKE '%FQIRÖRC%'
               OR content ILIKE '%FIMO%'
               OR content LIKE 'MA TÖUC%'
               OR content ILIKE '% MA TÖUC%'
          `);
          if (result.rowCount && result.rowCount > 0)
            console.log(`[startup/cleanup] Deleted ${result.rowCount} old pre-TNP post(s).`);
        } catch (err) {
          console.warn("[startup/cleanup] Pre-TNP post cleanup failed:", err);
        }
      })();

      // Backfill English translations for posts missing content_english.
      (async () => {
        try {
          const { rows } = await pool.query(
            `SELECT id, content FROM posts WHERE (content_english IS NULL OR content_english = '') AND hidden = false LIMIT 500`
          );
          if (rows.length === 0) return;
          let updated = 0;
          for (const row of rows) {
            try {
              const english = translateTnpToEnglish(row.content);
              if (english && english !== row.content) {
                await pool.query(`UPDATE posts SET content_english = $1 WHERE id = $2`, [english, row.id]);
                updated++;
              }
            } catch { /* skip individual failures */ }
          }
          if (updated > 0) console.log(`[startup/translate] Backfilled English translations for ${updated} post(s).`);
        } catch (err) {
          console.warn("[startup/translate] Translation backfill failed:", err);
        }
      })();

    } catch (err) {
      console.error("[startup] Background init error:", err);
    }
  })();
})();
