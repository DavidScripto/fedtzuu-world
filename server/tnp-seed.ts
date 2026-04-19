/**
 * TNP Vocabulary Seeder
 * Runs at startup — imports the bundled TNP vocabulary into the database
 * if it hasn't been seeded yet. No external network calls required.
 *
 * SECURITY GATE: Every word is validated against all TNP phonological rules
 * before it is inserted. If the vocabulary file was ever tampered with (e.g.
 * the external TNP source was compromised), invalid words are rejected here
 * and never reach the database.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "./db";
import { validateTnpWordCritical } from "./tnp-lexicon";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TnpVocabEntry {
  word: string;
  meaning: string;
  section: string;
  pronunciation: string;
}

const VOCAB_PATH = join(__dirname, "tnp-vocabulary.json");
const EXPECTED_COUNT = 3600; // seed if fewer than this many approved words exist

export async function seedTnpVocabulary(): Promise<void> {
  try {
    // Check current count
    const { rows } = await pool.query(
      `SELECT count(*)::int as total FROM tnp_word_proposals WHERE status = 'approved'`
    );
    const currentCount = rows[0]?.total ?? 0;

    if (currentCount >= EXPECTED_COUNT) {
      console.log(`[tnp-seed] Vocabulary already seeded (${currentCount} approved words). Skipping.`);
      return;
    }

    console.log(`[tnp-seed] Seeding TNP vocabulary (current: ${currentCount})...`);

    const raw = readFileSync(VOCAB_PATH, "utf-8");
    const vocab: TnpVocabEntry[] = JSON.parse(raw);

    // ── SECURITY GATE ─────────────────────────────────────────────────────────
    // Validate every word against the full TNP rule set before any DB write.
    // Words that fail validation are quarantined here — they never enter the
    // database. This ensures that even if the vocabulary source was compromised
    // and invalid words were injected, they are silently rejected at import time.
    const clean: TnpVocabEntry[] = [];
    const rejected: Array<{ word: string; reason: string }> = [];

    for (const entry of vocab) {
      const result = validateTnpWordCritical(entry.word);
      if (result.valid) {
        clean.push(entry);
      } else {
        rejected.push({ word: entry.word, reason: result.reason ?? result.rule ?? "unknown" });
      }
    }

    if (rejected.length > 0) {
      console.warn(
        `[tnp-seed] SECURITY GATE: ${rejected.length} word(s) rejected for violating TNP rules — ` +
        `they will NOT be seeded into the database:`
      );
      for (const r of rejected) {
        console.warn(`  ✗ "${r.word}" — ${r.reason}`);
      }
    }

    if (clean.length === 0) {
      console.error("[tnp-seed] CRITICAL: No words passed validation. Vocabulary file may be corrupted or tampered with. Aborting seed.");
      return;
    }

    console.log(`[tnp-seed] ${clean.length} words passed validation — proceeding with seed.`);
    // ── END SECURITY GATE ─────────────────────────────────────────────────────

    // Ensure pronunciation column exists (safe to run multiple times)
    await pool.query(`
      ALTER TABLE tnp_word_proposals ADD COLUMN IF NOT EXISTS pronunciation text;
      ALTER TABLE tnp_word_proposals ALTER COLUMN proposed_by DROP NOT NULL;
    `).catch(() => {
      // Column may already exist — that's fine
    });

    // Bulk insert in chunks of 100
    const chunkSize = 100;
    let inserted = 0;

    for (let i = 0; i < clean.length; i += chunkSize) {
      const chunk = clean.slice(i, i + chunkSize);
      const valuePlaceholders: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      for (const entry of chunk) {
        valuePlaceholders.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, 'approved', NOW())`
        );
        params.push(
          entry.word.toUpperCase(),
          entry.meaning,
          entry.section || "anyen",
          entry.pronunciation || ""
        );
      }

      await pool.query(
        `INSERT INTO tnp_word_proposals (word, meaning, section, pronunciation, status, created_at)
         VALUES ${valuePlaceholders.join(",")}
         ON CONFLICT (word) DO UPDATE SET
           meaning = EXCLUDED.meaning,
           pronunciation = EXCLUDED.pronunciation,
           status = 'approved'`,
        params
      );

      inserted += chunk.length;
    }

    console.log(`[tnp-seed] Done — ${inserted} words seeded, ${rejected.length} rejected by security gate.`);
  } catch (err) {
    console.error("[tnp-seed] Seed failed:", err);
  }
}
