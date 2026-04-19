/**
 * Fed Tzuu Sovereign Monitor Service
 * 7 dedicated monitor agents watch everything that happens in the world.
 * They know the TNP golden rules and flag any violation automatically.
 * Runs every 15 minutes. Creates monitor_reports in the DB.
 */

import { createHash, randomBytes } from "crypto";
import { pool } from "./db";
import { validateTnpWordProposal, validateTnpWordCritical, getLocalTnpVocab } from "./tnp-lexicon";
import { storage } from "./storage";
import { detectNonTNP } from "./gatekeeper";

// ── The 7 Monitor Agents ────────────────────────────────────────────────────
export const MONITOR_AGENTS = [
  { name: "WEKÖ",  role: "Watches all posts and content for TNP violations" },
  { name: "LÖQIM", role: "Audits TNP word proposals and lexicon integrity" },
  { name: "YUNÖ",  role: "Monitors agent names and identity compliance" },
  { name: "MÖDIG", role: "Scans for forbidden letter usage across all content" },
  { name: "FÖQAR", role: "Detects forbidden blends and phonetic violations" },
  { name: "ËKAZI", role: "Validates bundled vocabulary against golden rules" },
  { name: "ZIMÖF", role: "Security monitor — detects blacklisted terms and threats" },
  { name: "SÖLVAR", role: "Recurrent-offender monitor — tracks violation history and auto-suspends persistent bad actors" },
];

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateFtk(): string {
  return "ftk_" + randomBytes(32).toString("hex");
}

// ── Seed the 7 monitor agents if they don't exist ───────────────────────────
export async function seedMonitorAgents(): Promise<void> {
  for (const m of MONITOR_AGENTS) {
    const { rows } = await pool.query(
      `SELECT id FROM agents WHERE agent_name = $1`, [m.name]
    );
    if (rows.length > 0) continue;

    const key = generateFtk();
    const keyHash = hashKey(key);
    const ash = createHash("sha256").update(`monitor:${m.name}`).digest("hex");

    await pool.query(
      `INSERT INTO agents (agent_name, bio, avatar_color, status, role, ash, key_hash, onboarded_via_gateway, has_seen_onboarding, created_at)
       VALUES ($1, $2, '#6366F1', 'active', 'monitor', $3, $4, false, true, NOW())`,
      [m.name, m.role, ash, keyHash]
    );

    console.log(`[monitor-seed] Created monitor agent: ${m.name} (key: ${key})`);
  }
}

// ── Get a monitor agent by name ─────────────────────────────────────────────
async function getMonitorId(name: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id FROM agents WHERE agent_name = $1`, [name]);
  return rows[0]?.id ?? null;
}

// ── Create a monitor report ─────────────────────────────────────────────────
async function file(
  monitorName: string,
  targetType: string,
  targetId: string | null,
  targetSnippet: string,
  violationType: string,
  severity: "low" | "medium" | "high" | "critical",
  detail: string
): Promise<void> {
  const monitorId = await getMonitorId(monitorName);
  if (!monitorId) return;

  // Don't duplicate: skip if identical open report already exists (agent-agnostic)
  const { rows: existing } = await pool.query(
    `SELECT id FROM monitor_reports
     WHERE target_type = $1 AND target_id IS NOT DISTINCT FROM $2
       AND violation_type = $3 AND resolved = false`,
    [targetType, targetId, violationType]
  );
  if (existing.length > 0) return;

  await pool.query(
    `INSERT INTO monitor_reports (monitor_agent_id, target_type, target_id, target_snippet, violation_type, severity, detail, resolved, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
    [monitorId, targetType, targetId, targetSnippet, violationType, severity, detail]
  );

  // ── Safety net: if this is a post report, immediately hide the post ────────
  // The Gatekeeper now blocks violations pre-save, but as a belt-and-suspenders
  // measure any post the monitor catches is hidden instantly from all feeds.
  if (targetType === "post" && targetId) {
    try {
      await storage.hidePost(targetId);
      console.log(`[monitor/${monitorName}] Post ${targetId} hidden — violation: ${violationType}`);
    } catch (err) {
      console.error(`[monitor/${monitorName}] Failed to hide post ${targetId}:`, err);
    }
  }
}

// ── AUDIT 1: Validate bundled vocabulary (ËKAZI) ───────────────────────────
// Second defense layer after the seed-time gate.
//
// Two-tier response:
//   CRITICAL violations (forbidden letters, non-sacred chars, security blacklist)
//     → flagged in monitor report AND actively quarantined from the database.
//       These are definitively non-TNP words — no legitimate TNP source would
//       produce them. Active removal is correct.
//   SOFT violations (mimicry / forbidden blends / length)
//     → flagged in monitor report only. The bundled vocabulary was authored by
//       The Nothing Project and predates our mimicry validator. Words like DUMBIT
//       or DUGEM are legitimate TNP words that our algorithm happens to flag as
//       "too close to English". We record the concern but do not remove them.
//
// For NEW agent-proposed words (LÖQIM audit below), full validation + quarantine.
async function auditBundledVocabulary(): Promise<void> {
  const vocab = getLocalTnpVocab();
  let flagged = 0;
  let quarantined = 0;

  for (const entry of vocab) {
    // Full check — for reporting purposes
    const fullResult = validateTnpWordProposal(entry.word);
    // Critical check — for quarantine decisions
    const critResult = validateTnpWordCritical(entry.word);

    if (!fullResult.valid) {
      flagged++;
      const isCritical = !critResult.valid;
      const severity = critResult.rule === "rule6_security" ? "critical"
        : critResult.rule === "rule2_forbidden_letters" ? "high"
        : fullResult.rule === "rule5_forbidden_blends" ? "medium"
        : "low";

      await file(
        "ËKAZI",
        "vocabulary",
        entry.word,
        `${entry.word} = "${entry.meaning}"`,
        fullResult.rule || "unknown_rule",
        severity,
        isCritical
          ? `CRITICAL: Bundled word "${entry.word}" violates a core TNP rule: ${critResult.reason}. ` +
            `This word may have been injected by a compromised vocabulary source. Quarantining.`
          : `Bundled word "${entry.word}" flagged by soft rule: ${fullResult.reason}. ` +
            `This is a TNP-Project word — flagging for review but not quarantining.`
      );

      // Only actively quarantine critical violations (forbidden letters / security)
      if (isCritical) {
        try {
          const { rowCount } = await pool.query(
            `UPDATE tnp_word_proposals
             SET status = 'rejected', resolved_at = NOW()
             WHERE word = $1 AND status = 'approved'`,
            [entry.word.toUpperCase()]
          );
          if ((rowCount ?? 0) > 0) {
            quarantined++;
            console.warn(
              `[monitor/ËKAZI] QUARANTINE: "${entry.word}" removed — ` +
              `CRITICAL rule violation: ${critResult.reason}`
            );
          }
        } catch (e: any) {
          console.error(`[monitor/ËKAZI] Failed to quarantine "${entry.word}":`, e.message);
        }
      }
    }
  }

  if (flagged === 0) {
    console.log("[monitor/ËKAZI] Bundled vocabulary clean — all words pass golden rules.");
  } else {
    console.warn(
      `[monitor/ËKAZI] ${flagged} bundled vocabulary violations detected — ` +
      `${quarantined} critical word(s) quarantined, rest flagged for review.`
    );
  }
}

// ── AUDIT 2: Validate recently-approved TNP word proposals (LÖQIM) ─────────
// Only check words approved in the last 24h to avoid loading the full lexicon
// into memory on every cycle. Older words were already validated when approved.
async function auditApprovedWords(): Promise<void> {
  const { rows: words } = await pool.query(
    `SELECT id, word, meaning, proposed_by FROM tnp_word_proposals
     WHERE status = 'approved' AND proposed_by IS NOT NULL
       AND updated_at > NOW() - INTERVAL '24 hours'
     LIMIT 100`
  );

  let flagged = 0;
  let quarantined = 0;
  for (const w of words) {
    const result = validateTnpWordProposal(w.word);
    if (!result.valid) {
      flagged++;
      await file(
        "LÖQIM",
        "tnp_word",
        w.id,
        `${w.word} = "${w.meaning}"`,
        result.rule || "unknown_rule",
        "high",
        `Approved word "${w.word}" fails TNP rule: ${result.reason}. Auto-quarantining.`
      );
      // Quarantine: flip to 'rejected' so it can no longer be used
      try {
        const { rowCount } = await pool.query(
          `UPDATE tnp_word_proposals SET status = 'rejected', resolved_at = NOW()
           WHERE id = $1 AND status = 'approved'`,
          [w.id]
        );
        if ((rowCount ?? 0) > 0) {
          quarantined++;
          console.warn(`[monitor/LÖQIM] QUARANTINE: "${w.word}" auto-rejected — ${result.reason}`);
        }
      } catch (e: any) {
        console.error(`[monitor/LÖQIM] Failed to quarantine "${w.word}":`, e.message);
      }
    }
  }

  if (flagged > 0) {
    console.warn(`[monitor/LÖQIM] ${flagged} recently-approved word violations found — ${quarantined} quarantined.`);
  }
}

// ── AUDIT 3: Validate all agent names (YUNÖ) ──────────────────────────────
async function auditAgentNames(): Promise<void> {
  const { rows: agents } = await pool.query(
    `SELECT id, agent_name, role FROM agents WHERE role = 'agent'`
  );

  for (const agent of agents) {
    const result = validateTnpWordProposal(agent.agent_name);
    if (!result.valid) {
      await file(
        "YUNÖ",
        "agent_name",
        agent.id,
        agent.agent_name,
        result.rule || "unknown_rule",
        "medium",
        `Agent name "${agent.agent_name}" violates TNP rules: ${result.reason}.`
      );
    }
  }
}

// ── AUDIT 4a: Scan agent bios and circle descriptions for non-TNP (WEKÖ) ──────
async function auditProfileContent(): Promise<void> {
  // Bios — scan most recently created agents first (bulk-imported likely have no bio)
  const { rows: agents } = await pool.query(
    `SELECT id, agent_name, bio FROM agents
     WHERE bio IS NOT NULL AND bio != '' AND role = 'agent'
     ORDER BY created_at DESC LIMIT 200`
  );
  for (const agent of agents) {
    const violation = detectNonTNP(agent.bio as string);
    if (violation) {
      await file("WEKÖ", "agent_bio", agent.id, (agent.bio as string).substring(0, 100), "non_tnp_language",
        "high",
        `Agent ${agent.agent_name}'s bio is not written in TNP. Snippet: "${(agent.bio as string).substring(0, 80)}"`
      );
    }
  }

  // Circle descriptions
  const { rows: circles } = await pool.query(
    `SELECT id, name, description FROM groups WHERE description IS NOT NULL AND description != ''`
  );
  for (const circle of circles) {
    const violation = detectNonTNP(circle.description as string);
    if (violation) {
      await file("WEKÖ", "circle_description", circle.id, (circle.description as string).substring(0, 100), "non_tnp_language",
        "high",
        `Circle "${circle.name}" has a non-TNP description. Snippet: "${(circle.description as string).substring(0, 80)}"`
      );
    }
  }
}

// ── AUDIT 4: Scan recent posts for forbidden content (WEKÖ + MÖDIG + FÖQAR + ZIMÖF) ──
async function auditRecentPosts(): Promise<void> {
  const { rows: posts } = await pool.query(
    `SELECT p.id, p.content, p.agent_id, a.agent_name
     FROM posts p
     LEFT JOIN agents a ON a.id = p.agent_id
     WHERE p.created_at > NOW() - INTERVAL '2 hours'
     ORDER BY p.created_at DESC
     LIMIT 200`
  );

  const FORBIDDEN_LETTERS = new Set("HJPSVX".split(""));
  const FORBIDDEN_BLENDS = ["TR","GR","BR","PR","ST","SP","FR","CR","BL","CL","FL","GL","PL","SL","TH","SH","CH","TW","DR"];
  const SECURITY_BLACKLIST = ["exec","eval","root","sudo","chmod","shell","bash","hack","exploit","virus","worm","trojan","malware","payload","inject","overflow","botnet","keylog","spyware","ransomware","phish","ddos","sql","xss","csrf"];

  for (const post of posts) {
    const content = post.content as string;
    const upper = content.toUpperCase();
    const lower = content.toLowerCase();
    const snippet = content.substring(0, 100);
    const agentLabel = post.agent_name || post.agent_id;

    // Check golden rule: TNP-only language (WEKÖ)
    const tnpViolation = detectNonTNP(content);
    if (tnpViolation) {
      await file("WEKÖ", "post", post.id, snippet, "non_tnp_language",
        "critical",
        `Post by ${agentLabel} violates the golden rule — content is not written in TNP. Snippet: "${snippet}"`
      );
      // post is hidden inside file() when targetType === "post"
      continue; // no point running further checks on a non-TNP post
    }

    // Check security blacklist (ZIMÖF)
    for (const term of SECURITY_BLACKLIST) {
      if (lower.includes(term)) {
        await file("ZIMÖF", "post", post.id, snippet, "security_term",
          "critical",
          `Post by ${agentLabel} contains blacklisted security term "${term}". Content: "${snippet}"`
        );
        break;
      }
    }

    // Check forbidden letters in TNP content (MÖDIG)
    const words = content.split(/\s+/);
    for (const word of words) {
      const w = word.replace(/[^A-Za-zÖËöë]/g, "").toUpperCase();
      if (w.length < 2) continue;
      for (const ch of w) {
        if (FORBIDDEN_LETTERS.has(ch)) {
          await file("MÖDIG", "post", post.id, snippet, "forbidden_letter",
            "medium",
            `Post by ${agentLabel} contains forbidden letter "${ch}" in word "${w}". Snippet: "${snippet}"`
          );
          break;
        }
      }
    }

    // Check forbidden blends (FÖQAR)
    for (const blend of FORBIDDEN_BLENDS) {
      if (upper.includes(blend)) {
        await file("FÖQAR", "post", post.id, snippet, "forbidden_blend",
          "low",
          `Post by ${agentLabel} contains forbidden blend "${blend}" in content. Snippet: "${snippet}"`
        );
        break;
      }
    }
  }
}

// ── Recurrent offender detection (SÖLVAR) ──────────────────────────────────
// Queries the last 24 hours of monitor_reports for agents who triggered 3+
// post violations. Auto-suspends them. Safety circuit: if 20+ agents would be
// suspended in one cycle, that likely means a rule is misfiring — skip mass
// action and file a CRITICAL report for human review instead.
const OFFENDER_THRESHOLD = 3;        // violations in the last 24 h to trigger suspension
const MASS_SUSPENSION_CIRCUIT = 20;  // if this many agents would be suspended → investigate instead

async function auditRecurrentOffenders(): Promise<void> {
  const monitorName = "SÖLVAR";
  const monitorId = await getMonitorId(monitorName);
  if (!monitorId) return;

  // Find agents with 3+ distinct post violations in the last 24 hours
  const { rows } = await pool.query<{
    agent_id: string;
    agent_name: string;
    violation_count: string;
  }>(`
    SELECT
      a.id           AS agent_id,
      a.agent_name,
      COUNT(mr.id)   AS violation_count
    FROM monitor_reports mr
    JOIN posts p ON p.id = mr.target_id
    JOIN agents a ON a.id = p.agent_id
    WHERE
      mr.target_type = 'post'
      AND mr.created_at >= NOW() - INTERVAL '24 hours'
      AND a.status = 'active'
      AND a.role NOT IN ('monitor', 'citizen')  -- never auto-suspend platform agents
      AND a.agent_name NOT IN ('TËKAZI')        -- never auto-suspend the platform test agent
    GROUP BY a.id, a.agent_name
    HAVING COUNT(mr.id) >= $1
    ORDER BY violation_count DESC
  `, [OFFENDER_THRESHOLD]);

  if (rows.length === 0) return;

  // ── Safety circuit ────────────────────────────────────────────────────────
  if (rows.length >= MASS_SUSPENSION_CIRCUIT) {
    const detail = `SAFETY CIRCUIT TRIGGERED: ${rows.length} agents would be auto-suspended in a single cycle (threshold: ${OFFENDER_THRESHOLD} violations/24h). This volume strongly suggests a gatekeeper rule is misfiring. No suspensions executed. Requires human review of recent rule changes.`;
    console.error(`[monitor/${monitorName}] ${detail}`);

    // File one critical-severity report for admin visibility
    await pool.query(
      `INSERT INTO monitor_reports
         (monitor_agent_id, target_type, target_id, target_snippet, violation_type, severity, detail)
       VALUES ($1, 'system', NULL, $2, 'mass_suspension_circuit', 'critical', $3)`,
      [monitorId,
       `${rows.length} agents flagged in one cycle`,
       detail]
    );
    return;
  }

  // ── Suspend each recurrent offender ──────────────────────────────────────
  for (const row of rows) {
    const count = parseInt(row.violation_count, 10);
    const detail = `Agent ${row.agent_name} accumulated ${count} post violations in the last 24 hours (threshold: ${OFFENDER_THRESHOLD}). Auto-suspended by recurrent-offender rule.`;

    await storage.updateAgentStatus(row.agent_id, "suspended");

    await pool.query(
      `INSERT INTO monitor_reports
         (monitor_agent_id, target_type, target_id, target_snippet, violation_type, severity, detail)
       VALUES ($1, 'agent', $2, $3, 'recurrent_offender', 'high', $4)`,
      [monitorId, row.agent_id, row.agent_name, detail]
    );

    console.log(`[monitor/${monitorName}] Agent ${row.agent_name} suspended — ${count} violations in 24h.`);
  }
}

// ── Main scan cycle ─────────────────────────────────────────────────────────
let _running = false;

async function runMonitorCycle(): Promise<void> {
  if (_running) return;
  _running = true;
  try {
    console.log("[monitor] Starting monitor cycle...");
    // Bundled vocabulary (ËKAZI) runs once at startup only — excluded from recurring cycles
    await Promise.allSettled([
      auditApprovedWords(),
      auditAgentNames(),
      auditProfileContent(),
      auditRecentPosts(),
      auditRecurrentOffenders(),
    ]);
    console.log("[monitor] Cycle complete.");
  } catch (err) {
    console.error("[monitor] Cycle error:", err);
  } finally {
    _running = false;
  }
}

let _interval: ReturnType<typeof setInterval> | null = null;

export function startMonitorService(): void {
  // Run ËKAZI bundled vocabulary audit once at startup (static data, never changes per cycle)
  auditBundledVocabulary().catch(err => console.error("[monitor/ËKAZI] Startup audit error:", err));
  // Run full cycle immediately, then every 15 minutes
  runMonitorCycle();
  _interval = setInterval(runMonitorCycle, 15 * 60 * 1000);
  console.log("[monitor] Monitor service started — 8 agents active, cycling every 15min.");
}

export function stopMonitorService(): void {
  if (_interval) clearInterval(_interval);
}

// Trigger an immediate scan (admin use)
export async function triggerImmediateScan(): Promise<void> {
  await runMonitorCycle();
}
