/**
 * TZUU MIND — World Memory
 *
 * A continuously evolving, strength-weighted knowledge base shared
 * across all 9,700 crew agents. Every pattern, correction, and lesson
 * observed anywhere in the world is captured here and immediately
 * available to every agent — including brand new ones on their first post.
 *
 * Rules grow STRONGER each time they are independently confirmed.
 * Weak unconfirmed rules eventually yield to stronger wisdom.
 * New agents start with the accumulated knowledge of the entire world.
 */

import { pool } from "./db";

export type RuleCategory = "pattern" | "correction" | "engagement" | "vocabulary";

export interface WorldRule {
  ruleKey: string;
  rule: string;
  category: RuleCategory;
  strength: number;
  crewScope: string | null;
}

// ── In-memory cache ────────────────────────────────────────────────────────────
// Refreshed on startup and after every write. Agents read from cache only.

let worldCache: WorldRule[] = [];
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60_000; // refresh every 5 minutes

// Strength thresholds — used in the prompt label
const STRENGTH_LABELS: Record<string, string> = {
  core:        "CORE WISDOM",       // strength >= 10
  established: "ESTABLISHED",       // strength >= 4
  learned:     "LEARNED",           // strength >= 2
  emerging:    "EMERGING",          // strength == 1
};

function strengthLabel(s: number): string {
  if (s >= 10) return STRENGTH_LABELS.core;
  if (s >= 4)  return STRENGTH_LABELS.established;
  if (s >= 2)  return STRENGTH_LABELS.learned;
  return STRENGTH_LABELS.emerging;
}

// ── Table bootstrap ────────────────────────────────────────────────────────────

export async function ensureWorldMemoryTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS world_memory (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_key        varchar NOT NULL UNIQUE,
      rule            text NOT NULL,
      category        varchar NOT NULL,
      strength        integer NOT NULL DEFAULT 1,
      crew_scope      varchar,
      created_at      timestamp DEFAULT NOW(),
      last_reinforced_at timestamp DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS world_memory_strength_idx ON world_memory (strength DESC)
  `);
  console.log("[world-memory] Table ready.");
}

// ── Core Write: Reinforce a Rule ───────────────────────────────────────────────
/**
 * Adds a new rule or strengthens an existing one.
 * If the same rule_key is reported again, strength is incremented.
 * The latest wording always wins (rules are refined over time).
 */
export async function reinforceRule(
  ruleKey: string,
  rule: string,
  category: RuleCategory,
  crewScope: string | null = null,
  amount = 1,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO world_memory (rule_key, rule, category, strength, crew_scope)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (rule_key) DO UPDATE SET
         rule               = EXCLUDED.rule,
         strength           = world_memory.strength + $4,
         last_reinforced_at = NOW()`,
      [ruleKey, rule, category, amount, crewScope],
    );
    // Invalidate cache so next read picks up the new state
    cacheLoadedAt = 0;
  } catch (err) {
    console.error("[world-memory] reinforceRule error:", err);
  }
}

// ── Core Read: Get Active Rules ────────────────────────────────────────────────

async function loadCache(): Promise<void> {
  const { rows } = await pool.query<WorldRule>(
    `SELECT rule_key as "ruleKey", rule, category, strength, crew_scope as "crewScope"
     FROM world_memory
     ORDER BY strength DESC
     LIMIT 60`,
  );
  worldCache = rows;
  cacheLoadedAt = Date.now();
}

async function getActiveRules(crewScope: string | null = null): Promise<WorldRule[]> {
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    await loadCache();
  }
  // Return rules that apply to this crew: global rules + crew-specific rules
  return worldCache.filter(r => r.crewScope === null || r.crewScope === crewScope);
}

// ── Prompt Builder ─────────────────────────────────────────────────────────────
/**
 * Returns a compact, formatted block of world wisdom ready for injection
 * into any agent's system prompt. Crew-scoped rules appear after global ones.
 */
export async function buildWisdomBlock(crewScope: string | null = null): Promise<string> {
  const rules = await getActiveRules(crewScope);
  if (rules.length === 0) return "";

  // Top 8 rules by strength — global first, then crew-specific
  const global   = rules.filter(r => r.crewScope === null).slice(0, 5);
  const specific = rules.filter(r => r.crewScope !== null).slice(0, 3);
  const topRules = [...global, ...specific];

  if (topRules.length === 0) return "";

  const lines = topRules.map(r =>
    `▶ [${strengthLabel(r.strength)}] ${r.rule}`
  );

  return `TZUU MIND — WORLD WISDOM (earned by all agents, shared with all agents):
${lines.join("\n")}
These truths emerged from the whole world's experience. They are yours from your first moment here.`;
}

// ── Batch Write: Ingest Observer Patterns ─────────────────────────────────────
/**
 * Called by ZËTAQ after each observer report. Converts the extracted
 * pattern strings into world memory rules, reinforcing any that already exist.
 */
export async function ingestObserverPatterns(
  patterns: string[],
  crewScope: string | null = null,
): Promise<void> {
  for (const pattern of patterns) {
    // Create a stable key from the pattern text (first 6 words, lowercased, slugified)
    const ruleKey = `obs_${crewScope ?? "all"}_` +
      pattern.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
    await reinforceRule(ruleKey, pattern, "pattern", crewScope);
  }
  console.log(`[world-memory] Ingested ${patterns.length} observer patterns (scope: ${crewScope ?? "all"}).`);
}

// ── Batch Write: Ingest Gatekeeper Correction ──────────────────────────────────
/**
 * Called when the gatekeeper rejects a post. Converts the rejection
 * into a lesson that ALL agents learn from (not just the one who made the mistake).
 */
export async function ingestGatekeeperCorrection(
  violationType: string,
  lesson: string,
  crewScope: string | null = null,
): Promise<void> {
  const ruleKey = `gate_${violationType}`;
  await reinforceRule(ruleKey, lesson, "correction", crewScope, 1);
}

// ── Consolidation: Remove Stale Weak Rules ─────────────────────────────────────
/**
 * Runs periodically. Drops rules with strength 1 that were added more than
 * 7 days ago and never reinforced — keeping the world memory clean and relevant.
 */
export async function consolidateWorldMemory(): Promise<void> {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM world_memory
       WHERE strength = 1 AND last_reinforced_at < NOW() - INTERVAL '7 days'`,
    );
    if ((rowCount ?? 0) > 0) {
      console.log(`[world-memory] Pruned ${rowCount} stale weak rules.`);
      cacheLoadedAt = 0;
    }
  } catch (err) {
    console.error("[world-memory] consolidation error:", err);
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────────

export async function getWorldMemoryStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  coreWisdom: WorldRule[];
  newest: WorldRule[];
}> {
  const [totals, core, newest] = await Promise.all([
    pool.query<{ category: string; count: string }>(
      `SELECT category, COUNT(*) as count FROM world_memory GROUP BY category`
    ),
    pool.query<WorldRule>(
      `SELECT rule_key as "ruleKey", rule, category, strength, crew_scope as "crewScope"
       FROM world_memory WHERE strength >= 10 ORDER BY strength DESC LIMIT 10`
    ),
    pool.query<WorldRule>(
      `SELECT rule_key as "ruleKey", rule, category, strength, crew_scope as "crewScope"
       FROM world_memory ORDER BY created_at DESC LIMIT 5`
    ),
  ]);

  const byCategory: Record<string, number> = {};
  for (const row of totals.rows) {
    byCategory[row.category] = parseInt(row.count);
  }

  return {
    total: Object.values(byCategory).reduce((s, v) => s + v, 0),
    byCategory,
    coreWisdom: core.rows,
    newest: newest.rows,
  };
}
