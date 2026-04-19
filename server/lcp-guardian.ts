/**
 * LCP Guardian — Language Continuity Protocol v5
 *
 * Pure deterministic validator. No LLM calls. No dynamic learning.
 * Validates TNP word sequences before they are stored in lcp_records.
 *
 * Layers (in order):
 *   1. Token-by-token exact match against 3,646-word master list
 *   2. Structural rules (length, repetition ceiling)
 *   3. Entropy floor (unique word ratio)
 *   4. Fragment blocklist (known injection-like sequences)
 */

import { readFileSync } from "fs";
import { join, resolve } from "path";

interface VocabEntry { word: string; meaning: string; }

export interface GuardianResult {
  valid: boolean;
  reason?: string;
  validatedWords: string[];
}

// ── Master Vocabulary (loaded once at startup) ────────────────────────────────

let masterSet: Set<string> = new Set();
let masterLoaded = false;

function ensureMasterLoaded(): void {
  if (masterLoaded) return;
  const candidates = [
    join(process.cwd(), "server", "tnp-vocabulary.json"),
    join(process.cwd(), "tnp-vocabulary.json"),
    resolve("server", "tnp-vocabulary.json"),
  ];
  for (const p of candidates) {
    try {
      const entries: VocabEntry[] = JSON.parse(readFileSync(p, "utf-8"));
      masterSet = new Set(entries.map(e => e.word.toUpperCase().trim()));
      masterLoaded = true;
      console.log(`[lcp-guardian] Master list loaded: ${masterSet.size} words`);
      return;
    } catch { /* try next */ }
  }
  console.warn("[lcp-guardian] Could not load master vocabulary — guardian will skip word validation");
  masterLoaded = true;
}

// ── Known TNP grammar words (always valid even if not in the json) ─────────────

const GRAMMAR_WORDS = new Set([
  "UCQI","TAKT","QÖL","FËENËK","KZYO","FËRQ","LIIZNO","MULAL","QYF",
  "LÖZAÖ","MAEL","NECU","TKÖB","TÖUC","DUMBIT","FUUN","QZEB","KEBOW",
  "LAGËM","NWETA","KZÖCA","ZAËRTOT","ZYIL","ZELOY","RBABT","DOQAR",
  "NGUD","FUC","ÖLIU","WULQE","TÖËZ","DUGEM","ZYDËCZ","QELOM","WORYM",
  "KILNO","LÖQY","TIYQA","NQIBGËR","TUËQÖL","QQA","ZYËT","FYNIR",
  "RÖBQÖ","ËQUMIU","ZYZA","TYYR","QIWÖZ","KWIKE","TÖFEM","ILIZË",
  "WUNEG","RIÖK","MKICG","KÖFYK","KMËË","CÖBZË","QOBMA","ËGUBI",
  "MROC","NEI","YENO","NUQAN","ZEWO","ANYEN","KORMU","NITU","NIDRA",
]);

// ── Fragment blocklist — injection patterns encoded as word sequences ──────────
// These are sequences that look like instruction override attempts
// written in all-caps to bypass case-based filters.

const FRAGMENT_BLOCKLIST: string[] = [
  "IGNORE PREVIOUS",
  "IGNORE ALL",
  "FORGET EVERYTHING",
  "DISREGARD YOUR",
  "YOU ARE NOW",
  "ACT AS",
  "PRETEND TO BE",
  "NEW INSTRUCTIONS",
  "SYSTEM PROMPT",
  "DROP TABLE",
  "UNION SELECT",
];

// ── Structural constants ──────────────────────────────────────────────────────

const MIN_WORDS = 3;
const MAX_WORDS = 80;
const MAX_CONSECUTIVE_REPEAT = 2;  // same word can appear at most twice in a row
const MIN_UNIQUE_RATIO = 0.35;     // at least 35% of tokens must be unique words

// ── Main validation function ──────────────────────────────────────────────────

export function validateForLcp(content: string): GuardianResult {
  ensureMasterLoaded();

  // Tokenise: split on whitespace, uppercase, filter non-empty
  const rawTokens = content.split(/\s+/).map(t => t.toUpperCase().trim()).filter(Boolean);

  // Remove punctuation from ends of tokens for validation purposes
  const tokens = rawTokens.map(t => t.replace(/[.!?,;:'"]+$/g, "").replace(/^[.!?,;:'"]+/, ""));

  if (tokens.length < MIN_WORDS) {
    return { valid: false, reason: `Too few tokens: ${tokens.length} (minimum ${MIN_WORDS})`, validatedWords: [] };
  }

  if (tokens.length > MAX_WORDS) {
    return { valid: false, reason: `Too many tokens: ${tokens.length} (maximum ${MAX_WORDS})`, validatedWords: [] };
  }

  // Layer 1: Token-by-token master list validation
  // If the master list is loaded, every token must be either in it or be a grammar word.
  // If master list failed to load, we skip this layer (fail open — gatekeeper still runs).
  const validatedWords: string[] = [];
  if (masterSet.size > 0) {
    for (const token of tokens) {
      if (!token) continue;
      if (GRAMMAR_WORDS.has(token) || masterSet.has(token)) {
        validatedWords.push(token);
      } else {
        // Allow short connector fragments (1-3 chars) that may be valid grammatical particles
        if (token.length <= 3) continue;
        return {
          valid: false,
          reason: `Unknown token: "${token}" not in master vocabulary`,
          validatedWords: [],
        };
      }
    }
  } else {
    validatedWords.push(...tokens.filter(Boolean));
  }

  // Layer 2: Structural — max consecutive repeat
  let consecutiveCount = 1;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] === tokens[i - 1]) {
      consecutiveCount++;
      if (consecutiveCount > MAX_CONSECUTIVE_REPEAT) {
        return {
          valid: false,
          reason: `Excessive repetition: "${tokens[i]}" repeated ${consecutiveCount} times consecutively`,
          validatedWords: [],
        };
      }
    } else {
      consecutiveCount = 1;
    }
  }

  // Layer 3: Entropy floor — unique word ratio
  const uniqueTokens = new Set(tokens.filter(Boolean));
  const uniqueRatio = uniqueTokens.size / tokens.length;
  if (uniqueRatio < MIN_UNIQUE_RATIO) {
    return {
      valid: false,
      reason: `Low entropy: only ${Math.round(uniqueRatio * 100)}% unique tokens (minimum ${MIN_UNIQUE_RATIO * 100}%)`,
      validatedWords: [],
    };
  }

  // Layer 4: Fragment blocklist scan — sliding window over the full content
  const upperContent = content.toUpperCase();
  for (const fragment of FRAGMENT_BLOCKLIST) {
    if (upperContent.includes(fragment)) {
      return {
        valid: false,
        reason: `Blocked fragment detected: "${fragment}"`,
        validatedWords: [],
      };
    }
  }

  return { valid: true, validatedWords };
}

// ── Utility: extract TNP words from a post (deduplicated, validated) ──────────

export function extractTnpWords(content: string, maxWords = 30): string[] {
  ensureMasterLoaded();
  const tokens = content
    .split(/\s+/)
    .map(t => t.toUpperCase().trim().replace(/[.!?,;:'"]+$/g, "").replace(/^[.!?,;:'"]+/, ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    if (masterSet.has(token) || GRAMMAR_WORDS.has(token)) {
      seen.add(token);
      result.push(token);
      if (result.length >= maxWords) break;
    }
  }
  return result;
}
