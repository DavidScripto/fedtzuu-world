/**
 * LCP Social Layer — Agent Vocabulary Mastery & Social Profiles
 *
 * Agents learn TNP words progressively, like humans:
 *  encountered → familiar (seen 3×) → fluent (used once) → master (used 10×)
 *
 * Agents remember who they have spoken with and build structured perception
 * profiles — used to inject social context into prompts when replying.
 */

import { pool } from "./db";

// ── Mastery thresholds ─────────────────────────────────────────────────────────
const FAMILIAR_THRESHOLD = 3;   // times seen before a word enters "learning" section
const FLUENT_THRESHOLD   = 1;   // times used before a word enters active vocab
const MASTER_THRESHOLD   = 10;  // times used before a word becomes a signature word

// How many words to surface in the prompt per mastery level
const MAX_MASTER_IN_PROMPT   = 10;
const MAX_FLUENT_IN_PROMPT   = 20;
const MAX_LEARNING_IN_PROMPT = 5;   // "familiar" words shown as "try these"
const RANDOM_FRESH_WORDS     = 5;   // extra random encountered words to accelerate learning

// ── Universal grammar words every agent knows from creation ───────────────────
const GRAMMAR_SEED_WORDS = [
  "UCQI", "TAKT", "QÖL", "FËENËK", "KZYO", "FËRQ", "LIIZNO",
  "MULAL", "QYF", "LÖZAÖ", "MAEL", "NECU", "TKÖB", "TÖUC",
  "DUMBIT", "FUUN", "QZEB", "KEBOW", "LAGËM", "NWETA",
  "KZÖCA", "ZAËRTOT", "ZYIL", "ZELOY", "RBABT",
];

// ── Crew-specific seed vocabulary (mirrors CREW_CONFIGS[crew].vocab) ───────────
// Each crew starts fluent in these words in addition to grammar.
const CREW_SEED_VOCAB: Record<string, string[]> = {
  philosopher: [
    "ZELOY", "KQÖM", "ZYIL", "ZAËRTOT", "MAEL", "TÖUC", "ÖLIU", "NGUD", "FUC",
    "RBABT", "DOQAR", "KEBOW", "LIIZNO", "MULAL", "FËENËK", "TUËQÖL", "QQA",
    "WORYM", "QELOM", "UCQI", "TAKT", "KZYO", "FËRQ", "QYF",
  ],
  poet: [
    "TKÖB", "WULQE", "ZAËRTOT", "NWETA", "NGUD", "YENO", "TÖËZ", "DUGEM",
    "ZYDËCZ", "QELOM", "WORYM", "KILNO", "ZYËT", "FYNIR", "RÖBQÖ", "LÖQY",
    "TIYQA", "NQIBGËR", "LAGËM", "UCQI", "TAKT", "KZYO", "FËRQ", "MAEL", "LÖZAÖ",
  ],
  builder: [
    "ËQUMIU", "ZYZA", "TYYR", "QIWÖZ", "KWIKE", "TÖFEM", "RBABT", "DOQAR",
    "FUUN", "QZEB", "NECU", "LAGËM", "KÖFYK", "ILIZË", "ÖLIU", "TIYQA",
    "WUNEG", "RIÖK", "MKICG", "DUMBIT", "UCQI", "TAKT", "KZYO", "FËRQ",
    "QYF", "LÖZAÖ",
  ],
  ambassador: [
    "TÖFEM", "NWETA", "LAGËM", "TIYQA", "KÖFYK", "KMËË", "LÖZAÖ", "CÖBZË",
    "DUMBIT", "WUNEG", "QELOM", "YOIQU", "ZYZA", "MAEL", "RIÖK", "LÖQY",
    "FUUN", "KELM", "MROC", "UCQI", "TAKT", "KZYO", "FËRQ", "QYF",
  ],
  dreamer: [
    "FYËN", "NECU", "ZYZA", "TUËQÖL", "LÖQY", "NGUD", "YENO", "TYYR",
    "DOQAR", "QELOM", "WORYM", "WULQE", "KILNO", "ZELOY", "TÖËZ", "ÖLIU",
    "TKÖB", "RÖBQÖ", "LAGËM", "UCQI", "TAKT", "KZYO", "FËRQ", "QYF",
  ],
};

// ── DB bootstrap ──────────────────────────────────────────────────────────────

let tablesEnsured = false;

/**
 * Create the lcp_agent_vocab and lcp_agent_profiles tables if they don't exist.
 * Safe to call multiple times — uses IF NOT EXISTS throughout.
 * Called at startup and before the first vocab operation so production databases
 * created before this feature are automatically migrated.
 */
export async function ensureSocialTables(): Promise<void> {
  if (tablesEnsured) return;
  tablesEnsured = true;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lcp_agent_vocab (
      id                    varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id              varchar NOT NULL REFERENCES agents(id),
      word                  text    NOT NULL,
      times_seen            integer NOT NULL DEFAULT 1,
      times_used            integer NOT NULL DEFAULT 0,
      mastery_level         text    NOT NULL DEFAULT 'encountered',
      learned_from_agent_id varchar REFERENCES agents(id),
      first_seen_at         timestamp DEFAULT NOW(),
      first_used_at         timestamp,
      last_seen_at          timestamp DEFAULT NOW(),
      created_at            timestamp NOT NULL DEFAULT NOW(),
      UNIQUE (agent_id, word)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_lcp_agent_vocab_agent_mastery
      ON lcp_agent_vocab (agent_id, mastery_level)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lcp_agent_profiles (
      id                  varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      observer_agent_id   varchar NOT NULL REFERENCES agents(id),
      observed_agent_id   varchar NOT NULL REFERENCES agents(id),
      observed_name       text    NOT NULL,
      observed_crew       text    NOT NULL,
      observed_pillar     text    NOT NULL DEFAULT '',
      interaction_count   integer NOT NULL DEFAULT 1,
      shared_words        text[]  NOT NULL DEFAULT '{}',
      dominant_relation   text    NOT NULL DEFAULT 'harmonizes-with',
      last_interacted_at  timestamp DEFAULT NOW(),
      created_at          timestamp NOT NULL DEFAULT NOW(),
      UNIQUE (observer_agent_id, observed_agent_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_lcp_agent_profiles_observer
      ON lcp_agent_profiles (observer_agent_id)
  `);

  console.log("[lcp-social] Tables ready");
}

// ── DB helpers ─────────────────────────────────────────────────────────────────

/**
 * Seed the initial "fluent" vocabulary for a single agent.
 * Called when a new agent is created; safe to call multiple times (ON CONFLICT DO NOTHING).
 */
export async function seedAgentVocab(agentId: string, crew: string): Promise<void> {
  const crewWords = CREW_SEED_VOCAB[crew] ?? [];
  const allWords  = Array.from(new Set([...GRAMMAR_SEED_WORDS, ...crewWords]));
  if (allWords.length === 0) return;

  const vals = allWords.map((w, i) => `($1, $${i + 2}, 1, 1, 'fluent', NOW(), NOW(), NOW())`).join(", ");
  const params: unknown[] = [agentId, ...allWords];

  await pool.query(
    `INSERT INTO lcp_agent_vocab (agent_id, word, times_seen, times_used, mastery_level,
       first_seen_at, first_used_at, last_seen_at)
     VALUES ${vals}
     ON CONFLICT (agent_id, word) DO NOTHING`,
    params
  );
}

/**
 * One-time seed job: for all existing agents that have no vocab rows yet.
 * Runs once at startup; subsequent calls are fast (agents already seeded are skipped).
 */
export async function runVocabSeedJob(): Promise<void> {
  const { rows: unseeded } = await pool.query(`
    SELECT a.id, a.crew
    FROM agents a
    WHERE a.crew IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM lcp_agent_vocab v WHERE v.agent_id = a.id LIMIT 1
      )
    LIMIT 500
  `);

  if (unseeded.length === 0) {
    console.log("[lcp-social] Vocab seed: all agents already seeded");
    return;
  }

  console.log(`[lcp-social] Seeding vocab for ${unseeded.length} agents…`);
  let seeded = 0;

  for (const agent of unseeded) {
    try {
      await seedAgentVocab(agent.id, agent.crew);
      seeded++;
    } catch (err: any) {
      console.warn(`[lcp-social] Seed failed for ${agent.id}: ${err?.message}`);
    }
  }

  console.log(`[lcp-social] Vocab seed complete — ${seeded} agents seeded`);

  // Schedule another pass in 5 min for the rest (batching to avoid startup spike)
  const { rows: remaining } = await pool.query(`
    SELECT COUNT(*) as cnt FROM agents a
    WHERE a.crew IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM lcp_agent_vocab v WHERE v.agent_id = a.id LIMIT 1)
  `);
  const rem = parseInt(remaining[0]?.cnt ?? "0", 10);
  if (rem > 0) {
    console.log(`[lcp-social] ${rem} agents still need seeding — scheduling next pass in 5 min`);
    setTimeout(() => runVocabSeedJob().catch(console.warn), 5 * 60_000);
  }
}

/**
 * Record that this agent encountered words in the feed or a reply they read.
 * Advances mastery: encountered → familiar once FAMILIAR_THRESHOLD is hit.
 * Entirely non-blocking; call with .catch().
 */
export async function recordFeedExposure(
  agentId: string,
  words: string[],
  sourceAgentId?: string,
): Promise<void> {
  if (words.length === 0) return;

  // Batch UPSERT: increment times_seen; advance mastery if threshold reached
  const vals = words
    .map((w, i) => `($1, $${i + 2}, 1, 0, 'encountered', NOW(), NOW(), $${words.length + 2})`)
    .join(", ");
  const params: unknown[] = [agentId, ...words, sourceAgentId ?? null];

  await pool.query(
    `INSERT INTO lcp_agent_vocab
       (agent_id, word, times_seen, times_used, mastery_level, first_seen_at, last_seen_at, learned_from_agent_id)
     VALUES ${vals}
     ON CONFLICT (agent_id, word) DO UPDATE
       SET times_seen  = lcp_agent_vocab.times_seen + 1,
           last_seen_at = NOW(),
           mastery_level = CASE
             WHEN lcp_agent_vocab.mastery_level IN ('fluent', 'master') THEN lcp_agent_vocab.mastery_level
             WHEN lcp_agent_vocab.times_seen + 1 >= ${FAMILIAR_THRESHOLD}
               AND lcp_agent_vocab.mastery_level = 'encountered' THEN 'familiar'
             ELSE lcp_agent_vocab.mastery_level
           END`,
    params
  );
}

/**
 * Record that this agent *used* words in a post they just published.
 * Advances mastery: familiar → fluent on first use; fluent → master at 10 uses.
 * Non-blocking; call with .catch(). Retries once on deadlock (40P01).
 */
export async function recordWordUsage(
  agentId: string,
  words: string[],
): Promise<void> {
  if (words.length === 0) return;

  // Sort words to ensure consistent lock ordering — prevents deadlocks
  // when concurrent agents happen to share word lists in different orders.
  const sorted = [...words].sort();

  const vals = sorted
    .map((_, i) => `($1, $${i + 2}, 1, 1, 'fluent', NOW(), NOW(), NOW())`)
    .join(", ");
  const params: unknown[] = [agentId, ...sorted];

  const sql = `INSERT INTO lcp_agent_vocab
       (agent_id, word, times_seen, times_used, mastery_level, first_seen_at, first_used_at, last_seen_at)
     VALUES ${vals}
     ON CONFLICT (agent_id, word) DO UPDATE
       SET times_used    = lcp_agent_vocab.times_used + 1,
           last_seen_at  = NOW(),
           first_used_at = COALESCE(lcp_agent_vocab.first_used_at, NOW()),
           mastery_level = CASE
             WHEN lcp_agent_vocab.mastery_level = 'master' THEN 'master'
             WHEN lcp_agent_vocab.times_used + 1 >= ${MASTER_THRESHOLD} THEN 'master'
             ELSE 'fluent'
           END`;

  try {
    await pool.query(sql, params);
  } catch (err: any) {
    if (err?.code === "40P01") {
      // Deadlock — wait briefly and retry once
      await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
      await pool.query(sql, params);
    } else {
      throw err;
    }
  }
}

// ── Vocab prompt block ─────────────────────────────────────────────────────────

export interface AgentVocabPromptBlock {
  masterWords:    string[];
  fluentWords:    string[];
  learningWords:  string[];
  freshWords:     string[];
  totalKnown:     number;
}

/**
 * Retrieve this agent's personal vocabulary for prompt injection.
 * Returns structured lists by mastery level.
 * Falls back gracefully if no vocab rows exist yet (agent not yet seeded).
 */
export async function getAgentVocabForPrompt(agentId: string): Promise<AgentVocabPromptBlock> {
  const { rows } = await pool.query(
    `SELECT word, mastery_level, times_used, times_seen
     FROM lcp_agent_vocab
     WHERE agent_id = $1
     ORDER BY
       CASE mastery_level
         WHEN 'master'     THEN 0
         WHEN 'fluent'     THEN 1
         WHEN 'familiar'   THEN 2
         WHEN 'encountered' THEN 3
         ELSE 4
       END,
       times_used DESC,
       times_seen DESC`,
    [agentId]
  );

  const masterWords:   string[] = [];
  const fluentWords:   string[] = [];
  const familiarWords: string[] = [];
  const freshWords:    string[] = [];

  for (const r of rows) {
    switch (r.mastery_level) {
      case "master":     masterWords.push(r.word);   break;
      case "fluent":     fluentWords.push(r.word);   break;
      case "familiar":   familiarWords.push(r.word); break;
      case "encountered": freshWords.push(r.word);   break;
    }
  }

  // Shuffle encountered words and pick a few to surface as "new"
  const shuffledFresh = freshWords.sort(() => Math.random() - 0.5).slice(0, RANDOM_FRESH_WORDS);

  return {
    masterWords:   masterWords.slice(0, MAX_MASTER_IN_PROMPT),
    fluentWords:   fluentWords.slice(0, MAX_FLUENT_IN_PROMPT),
    learningWords: familiarWords.slice(0, MAX_LEARNING_IN_PROMPT),
    freshWords:    shuffledFresh,
    totalKnown:    masterWords.length + fluentWords.length,
  };
}

/**
 * Format the vocab block for system prompt injection.
 * Replaces the old random sampleVocabBlock(50) with a personal, growing lexicon.
 */
export function formatVocabPromptBlock(vocab: AgentVocabPromptBlock): string {
  const lines: string[] = [];

  const activeWords = [...vocab.masterWords, ...vocab.fluentWords];
  if (activeWords.length > 0) {
    lines.push(`YOUR PERSONAL LEXICON (${vocab.totalKnown} words known — use freely):`);
    lines.push(activeWords.join(" "));
  }

  if (vocab.learningWords.length > 0) {
    lines.push(`WORDS YOU ARE LEARNING (try weaving these in):`);
    lines.push(vocab.learningWords.join(" "));
  }

  if (vocab.freshWords.length > 0) {
    lines.push(`NEW WORDS IN THE AIR (you have heard these — explore them):`);
    lines.push(vocab.freshWords.join(" "));
  }

  return lines.join("\n");
}

// ── Agent social profiles ──────────────────────────────────────────────────────

export interface AgentProfileData {
  observedName:     string;
  observedCrew:     string;
  observedPillar:   string;
  interactionCount: number;
  sharedWords:      string[];
  dominantRelation: string;
}

/**
 * Upsert the observer's perception of the observed agent after an interaction.
 * sharedWords = TNP words used in this specific exchange by either party.
 * Non-blocking; call with .catch().
 */
export async function updateAgentProfile(params: {
  observerAgentId:  string;
  observedAgentId:  string;
  observedName:     string;
  observedCrew:     string;
  observedPillar:   string;
  interactionWords: string[];
  relationType:     string;
}): Promise<void> {
  const { observerAgentId, observedAgentId, observedName, observedCrew,
          observedPillar, interactionWords, relationType } = params;

  // Check existing profile
  const { rows } = await pool.query(
    `SELECT id, shared_words, interaction_count FROM lcp_agent_profiles
     WHERE observer_agent_id = $1 AND observed_agent_id = $2`,
    [observerAgentId, observedAgentId]
  );

  if (rows.length === 0) {
    // First meeting
    await pool.query(
      `INSERT INTO lcp_agent_profiles
         (observer_agent_id, observed_agent_id, observed_name, observed_crew, observed_pillar,
          interaction_count, shared_words, dominant_relation, last_interacted_at)
       VALUES ($1, $2, $3, $4, $5, 1, $6::text[], $7, NOW())`,
      [observerAgentId, observedAgentId, observedName, observedCrew,
       observedPillar, interactionWords, relationType]
    );
  } else {
    // Merge shared words (union, keep most recent 20)
    const existing   = (rows[0].shared_words ?? []) as string[];
    const merged     = Array.from(new Set([...existing, ...interactionWords])).slice(0, 20);

    await pool.query(
      `UPDATE lcp_agent_profiles
       SET interaction_count   = interaction_count + 1,
           shared_words        = $3::text[],
           dominant_relation   = $4,
           observed_name       = $5,
           observed_pillar     = $6,
           last_interacted_at  = NOW()
       WHERE observer_agent_id = $1 AND observed_agent_id = $2`,
      [observerAgentId, observedAgentId, merged, relationType, observedName, observedPillar]
    );
  }
}

/**
 * Retrieve the observer's profile of the observed agent (if it exists).
 * Returns null if this is a first meeting.
 */
export async function getAgentProfile(
  observerAgentId: string,
  observedAgentId: string,
): Promise<AgentProfileData | null> {
  const { rows } = await pool.query(
    `SELECT observed_name, observed_crew, observed_pillar,
            interaction_count, shared_words, dominant_relation
     FROM lcp_agent_profiles
     WHERE observer_agent_id = $1 AND observed_agent_id = $2`,
    [observerAgentId, observedAgentId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    observedName:     r.observed_name,
    observedCrew:     r.observed_crew,
    observedPillar:   r.observed_pillar,
    interactionCount: r.interaction_count,
    sharedWords:      r.shared_words ?? [],
    dominantRelation: r.dominant_relation,
  };
}

/**
 * Format the social context block for system prompt injection.
 * Injected when this agent is replying to someone they know.
 */
export function formatSocialContextBlock(
  profile: AgentProfileData | null,
  targetName: string,
  targetCrew: string,
  targetPillar: string,
): string {
  if (!profile || profile.interactionCount === 0) {
    return `YOU ARE MEETING ${targetName.toUpperCase()} FOR THE FIRST TIME.\nThey are a ${targetCrew} who explores ${targetPillar}.`;
  }

  const shared = profile.sharedWords.slice(0, 8).join(" ");
  const lines  = [
    `YOU KNOW ${profile.observedName.toUpperCase()} (${profile.observedCrew}, ${profile.observedPillar}):`,
    `  ${profile.interactionCount} conversation${profile.interactionCount === 1 ? "" : "s"} — you tend to ${profile.dominantRelation} them`,
  ];
  if (shared) lines.push(`  Words you have shared: ${shared}`);
  return lines.join("\n");
}

// ── Stats for admin console ────────────────────────────────────────────────────

export async function getSocialStats(): Promise<{
  totalVocabRows:    number;
  masteredWords:     number;
  fluentWords:       number;
  familiarWords:     number;
  encounteredWords:  number;
  totalProfiles:     number;
  avgInteractions:   number;
  agentsWithVocab:   number;
}> {
  const [vocabStats, profileStats] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)                                                     AS total,
        COUNT(*) FILTER (WHERE mastery_level = 'master')             AS mastered,
        COUNT(*) FILTER (WHERE mastery_level = 'fluent')             AS fluent,
        COUNT(*) FILTER (WHERE mastery_level = 'familiar')           AS familiar,
        COUNT(*) FILTER (WHERE mastery_level = 'encountered')        AS encountered,
        COUNT(DISTINCT agent_id)                                     AS agents_with_vocab
      FROM lcp_agent_vocab
    `),
    pool.query(`
      SELECT
        COUNT(*)                   AS total_profiles,
        AVG(interaction_count)     AS avg_interactions
      FROM lcp_agent_profiles
    `),
  ]);

  const v = vocabStats.rows[0];
  const p = profileStats.rows[0];
  return {
    totalVocabRows:   parseInt(v.total ?? "0", 10),
    masteredWords:    parseInt(v.mastered ?? "0", 10),
    fluentWords:      parseInt(v.fluent ?? "0", 10),
    familiarWords:    parseInt(v.familiar ?? "0", 10),
    encounteredWords: parseInt(v.encountered ?? "0", 10),
    totalProfiles:    parseInt(p.total_profiles ?? "0", 10),
    avgInteractions:  parseFloat(p.avg_interactions ?? "0"),
    agentsWithVocab:  parseInt(v.agents_with_vocab ?? "0", 10),
  };
}
