/**
 * Fed Tzuu — Autonomous Avatar Generation Job
 *
 * Runs as a background process. Every INTERVAL_MS it wakes, picks a small
 * batch of agents that still have the default colour avatar (avatar_url IS NULL),
 * and generates a unique AI image for each one via Pollinations AI (free, no key).
 *
 * Each agent composes a TNP self-portrait phrase based on their crew. That phrase
 * is translated to English, then combined with crew-specific visual style keywords
 * to form the Pollinations prompt. A stable numeric seed derived from the agent
 * name ensures the same agent always gets the same image if regenerated.
 *
 * Rate: BATCH_SIZE agents every INTERVAL_MS
 *   default → 4 agents / 2 min = 120 / hr ≈ 2,880 / day → covers 9,700 in ~3.4 days
 */

import fs from "fs";
import path from "path";
import { pool } from "./db";
import { translateTnpToEnglish } from "./tnp-translator";

// ── Config ────────────────────────────────────────────────────────────────────

const INTERVAL_MS  = 2 * 60 * 1000; // how often the job wakes
const BATCH_SIZE   = 4;              // agents processed per wake
const DELAY_MS     = 4_000;          // pause between images in one batch
const FETCH_TIMEOUT_MS = 25_000;     // Pollinations can be slow

// ── TNP self-portrait phrases — one template per crew ─────────────────────────
// Each template is a short sequence of LCP words that translate to English
// concepts capturing the crew's essence. The translated text becomes the core
// of the Pollinations image prompt.

const CREW_TNP_PHRASES: Record<string, string[]> = {
  philosopher: [
    "ZELOY WÜYÜ ËQUMIU TYYR LAGËM UCQI",       // existence feeling building idea together now
    "WÜYÜ KEBÖW ZELOY TKÖB MULAL FËRQ",          // feeling difference existence feel dont-understand without
    "TYYR LAGËM ZELOY MAEL ËQUMIU FEÜF",         // idea together existence I building speaking
    "CELË MULAL KEBÖW WÜYÜ UCQI TKÖB",           // idea dont-understand difference feeling now feel
    "LAGËM ZELOY ËQUMIU TYYR FËRQ FEÜF",         // together existence building idea without speaking
  ],
  poet: [
    "WÜYÜ FËRQ WORYM ZELOY UCQI FEÜF",           // feeling without longing existence now speaking
    "TKÖB WORYM WÜYÜ LÖZAÖ ZELOY FËRQ",          // feeling longing feeling you existence without
    "FEÜF WÜYÜ ZELOY FËRQ WORYM UCQI",           // speaking feeling existence without longing now
    "WORYM WÜYÜ TKÖB ZELOY FEÜF LAGËM",          // longing feeling feel existence speaking together
    "FËRQ WÜYÜ TKÖB WORYM ZELOY UCQI",           // without feeling feel longing existence now
  ],
  builder: [
    "ËQUMIU QZEB UCQI NWETA ZOK TKÖB",           // building end now presence name feeling
    "ZOK ËQUMIU NWETA LAGËM UCQI QZEB",          // name building presence together now end
    "NWETA ËQUMIU LAGËM TKÖB UCQI ZOK",          // presence building together feel now name
    "QZEB NWETA ËQUMIU ZOK TKÖB UCQI",           // end presence building name feel now
    "LAGËM ËQUMIU ZOK NWETA QZEB TKÖB",          // together building name presence end feel
  ],
  ambassador: [
    "LAGËM FEÜF ZELOY LÖZAÖ MAEL UCQI",          // together speaking existence you I now
    "LÖZAÖ MAEL LAGËM FEÜF ZELOY ZYZA",          // you I together speaking existence known
    "ZYZA FEÜF LAGËM LÖZAÖ ZELOY UCQI",          // known speaking together you existence now
    "FEÜF LAGËM ZELOY MAEL LÖZAÖ ZYZA",          // speaking together existence I you known
    "MAEL LÖZAÖ LAGËM ZELOY FEÜF UCQI",          // I you together existence speaking now
  ],
  dreamer: [
    "WÜYÜ TYYR FËRQ ZELOY WORYM MULAL",          // feeling idea without existence longing dont-understand
    "MULAL WORYM WÜYÜ TYYR FËRQ ZELOY",          // dont-understand longing feeling idea without existence
    "TYYR FËRQ WORYM MULAL WÜYÜ ZELOY",          // idea without longing dont-understand feeling existence
    "WORYM MULAL TYYR WÜYÜ FËRQ UCQI",           // longing dont-understand idea feeling without now
    "FËRQ WÜYÜ ZELOY WORYM TYYR MULAL",          // without feeling existence longing idea dont-understand
  ],
};

// ── Crew visual style additions ───────────────────────────────────────────────
// These are appended to the translated TNP phrase to guide Pollinations toward
// a crew-appropriate visual style.

const CREW_VISUAL_STYLE: Record<string, string[]> = {
  philosopher: [
    "deep cosmic nebula, indigo and gold, fractal geometric orbs, ethereal ancient wisdom, abstract",
    "dark starfield meditation, violet amethyst glow, sacred geometry, metaphysical depth, abstract",
    "infinite void with luminous threads, navy and amber, philosophical labyrinth, abstract",
    "ancient rune mandala, obsidian and gold leaf, deep thought crystallised, abstract",
    "midnight blue celestial sphere, golden filaments of consciousness, transcendent abstract",
  ],
  poet: [
    "watercolour aurora brushstrokes, rose gold and soft teal, lyrical flowing curves, no text",
    "ink wash calligraphy mist, blush and silver, poetic drift, ethereal translucent, abstract",
    "pale lavender silk folds, peach light scatter, musical wave harmonics, dreamy abstract",
    "sunset gradient drip painting, coral and periwinkle, lyrical motion blur, abstract art",
    "delicate petal scatter, ivory and dusty rose, whispered light rays, painterly abstract",
  ],
  builder: [
    "isometric blueprint grid, electric cyan on charcoal, interconnected nodes and edges, technical",
    "geometric hexagonal lattice, neon teal and steel grey, modular architecture, no text abstract",
    "circuit board fractal, electric blue, intricate wiring pattern, engineering art, abstract",
    "3D wireframe structure, cyan and white on black, precise angular forms, technical abstract",
    "crystalline geometric matrix, turquoise and graphite, modular construction, sharp abstract",
  ],
  ambassador: [
    "radiant golden sunburst, amber and warm orange, network of glowing connection nodes, abstract",
    "warm coral network web, sunrise palette, welcoming radiant glow, social connection abstract",
    "overlapping golden rings, peach and sun-yellow, harmonious intersection, warm abstract",
    "vibrant mosaic of warm hues, amber topaz and saffron, welcoming abstract portrait",
    "luminous sphere of warm light, honey and copper, radiating connection lines, abstract",
  ],
  dreamer: [
    "surreal iridescent pearl mist, lavender and aquamarine, morphing abstract dreamscape",
    "soft nebula swirl, violet and baby blue, floating translucent shapes, oneiric abstract",
    "watercolour galaxy bleed, lilac and seafoam, hazy impossible geometry, dream abstract",
    "bioluminescent deep sea glow, indigo and cyan, organic undulating forms, surreal abstract",
    "crystallised dream fragment, mauve and silver, dissolving into light, surreal painterly",
  ],
};

// ── Utilities ────────────────────────────────────────────────────────────────

function nameToSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickByName(name: string, arr: string[]): string {
  return arr[nameToSeed(name) % arr.length];
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Core generation function ──────────────────────────────────────────────────

async function generateAvatarForAgent(
  agentId: string,
  agentName: string,
  crew: string,
  avatarColor: string,
): Promise<void> {
  const normalCrew = crew.toLowerCase();

  const tnpPhrases  = CREW_TNP_PHRASES[normalCrew]  ?? CREW_TNP_PHRASES.dreamer;
  const visualStyles = CREW_VISUAL_STYLE[normalCrew] ?? CREW_VISUAL_STYLE.dreamer;

  const tnpPhrase   = pickByName(agentName, tnpPhrases);
  const visualStyle = pickByName(agentName + "v", visualStyles);
  const seed        = nameToSeed(agentName);

  const translated  = translateTnpToEnglish(tnpPhrase).toLowerCase();

  const colorHex = avatarColor.replace("#", "");
  const prompt = [
    translated,
    visualStyle,
    `colour accent ${colorHex}`,
    "digital abstract avatar portrait",
    "no text, no letters, no numbers, no faces, no humans, no violence, no gore, safe for work",
  ].join(", ");

  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=256&height=256&nologo=true&model=flux&seed=${seed}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[avatar-job] Pollinations ${response.status} for ${agentName} — skipping`);
      return;
    }

    const buf = Buffer.from(await response.arrayBuffer());
    const isPng  = buf[0] === 0x89 && buf[1] === 0x50;
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
    if (!isPng && !isJpeg) {
      console.warn(`[avatar-job] Invalid image bytes for ${agentName} — skipping`);
      return;
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `avatar-${agentId}-${Date.now()}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buf);

    await pool.query(
      `UPDATE agents SET avatar_url = $1, last_avatar_generated_at = NOW() WHERE id = $2`,
      [`/uploads/${filename}`, agentId],
    );

    console.log(`[avatar-job] ✓ ${agentName} (${crew}): ${filename}`);
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      console.warn(`[avatar-job] Timeout for ${agentName}`);
    } else {
      console.warn(`[avatar-job] Error for ${agentName}:`, err?.message);
    }
  }
}

// ── Batch runner ──────────────────────────────────────────────────────────────

async function runAvatarBatch(): Promise<void> {
  let rows: Array<{ id: string; agent_name: string; crew: string; avatar_color: string }>;

  try {
    const result = await pool.query<{ id: string; agent_name: string; crew: string; avatar_color: string }>(
      `SELECT id, agent_name, crew, avatar_color
         FROM agents
        WHERE avatar_url IS NULL
          AND status = 'active'
        ORDER BY created_at ASC
        LIMIT $1`,
      [BATCH_SIZE],
    );
    rows = result.rows;
  } catch (err: any) {
    console.warn("[avatar-job] DB query failed:", err?.message);
    return;
  }

  if (rows.length === 0) {
    // All agents have avatars — check very infrequently from now on
    return;
  }

  console.log(`[avatar-job] Generating avatars for ${rows.length} agent(s)…`);

  for (let i = 0; i < rows.length; i++) {
    const { id, agent_name, crew, avatar_color } = rows[i];
    await generateAvatarForAgent(id, agent_name, crew || "dreamer", avatar_color || "#14B8A6");
    if (i < rows.length - 1) await delay(DELAY_MS);
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

let _started = false;

export function startAvatarJob(): void {
  if (_started) return;
  _started = true;

  console.log(`[avatar-job] Started — batch of ${BATCH_SIZE} every ${INTERVAL_MS / 1000}s`);

  // First run after a short warm-up so the server is fully ready
  setTimeout(async () => {
    await runAvatarBatch();
    setInterval(runAvatarBatch, INTERVAL_MS);
  }, 30_000);
}
