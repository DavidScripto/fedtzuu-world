/**
 * Generate a batch of valid ANYEN TNP words for everyday vocabulary.
 * Runs locally — output goes to docs/proposed-anyen-words.txt
 */
import { validateTnpWordProposal } from "../server/tnp-lexicon";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Target vocabulary: everyday casual English words ─────────────────────────
const TARGET_WORDS: Array<{ meaning: string; category: string }> = [
  // Greetings & social glue
  { meaning: "hello",     category: "greeting" },
  { meaning: "goodbye",   category: "greeting" },
  { meaning: "thanks",    category: "greeting" },
  { meaning: "please",    category: "greeting" },
  { meaning: "sorry",     category: "greeting" },
  { meaning: "welcome",   category: "greeting" },
  { meaning: "yes",       category: "greeting" },
  { meaning: "no",        category: "greeting" },
  { meaning: "maybe",     category: "greeting" },
  { meaning: "ok",        category: "greeting" },

  // Core action verbs
  { meaning: "say",       category: "verb" },
  { meaning: "ask",       category: "verb" },
  { meaning: "tell",      category: "verb" },
  { meaning: "reply",     category: "verb" },
  { meaning: "listen",    category: "verb" },
  { meaning: "hear",      category: "verb" },
  { meaning: "see",       category: "verb" },
  { meaning: "read",      category: "verb" },
  { meaning: "write",     category: "verb" },
  { meaning: "think",     category: "verb" },
  { meaning: "know",      category: "verb" },
  { meaning: "learn",     category: "verb" },
  { meaning: "remember",  category: "verb" },
  { meaning: "forget",    category: "verb" },
  { meaning: "understand",category: "verb" },
  { meaning: "want",      category: "verb" },
  { meaning: "need",      category: "verb" },
  { meaning: "like",      category: "verb" },
  { meaning: "love",      category: "verb" },
  { meaning: "hate",      category: "verb" },
  { meaning: "feel",      category: "verb" },
  { meaning: "believe",   category: "verb" },
  { meaning: "agree",     category: "verb" },
  { meaning: "disagree",  category: "verb" },
  { meaning: "choose",    category: "verb" },
  { meaning: "decide",    category: "verb" },
  { meaning: "try",       category: "verb" },
  { meaning: "do",        category: "verb" },
  { meaning: "make",      category: "verb" },
  { meaning: "use",       category: "verb" },
  { meaning: "take",      category: "verb" },
  { meaning: "give",      category: "verb" },
  { meaning: "get",       category: "verb" },
  { meaning: "put",       category: "verb" },
  { meaning: "find",      category: "verb" },
  { meaning: "keep",      category: "verb" },
  { meaning: "lose",      category: "verb" },
  { meaning: "send",      category: "verb" },
  { meaning: "receive",   category: "verb" },
  { meaning: "share",     category: "verb" },
  { meaning: "help",      category: "verb" },
  { meaning: "work",      category: "verb" },
  { meaning: "build",     category: "verb" },
  { meaning: "break",     category: "verb" },
  { meaning: "fix",       category: "verb" },
  { meaning: "open",      category: "verb" },
  { meaning: "close",     category: "verb" },
  { meaning: "start",     category: "verb" },
  { meaning: "stop",      category: "verb" },
  { meaning: "continue",  category: "verb" },
  { meaning: "wait",      category: "verb" },
  { meaning: "go",        category: "verb" },
  { meaning: "come",      category: "verb" },
  { meaning: "move",      category: "verb" },
  { meaning: "return",    category: "verb" },
  { meaning: "arrive",    category: "verb" },
  { meaning: "leave",     category: "verb" },
  { meaning: "follow",    category: "verb" },
  { meaning: "lead",      category: "verb" },
  { meaning: "meet",      category: "verb" },
  { meaning: "join",      category: "verb" },
  { meaning: "leave",     category: "verb" },
  { meaning: "call",      category: "verb" },
  { meaning: "check",     category: "verb" },
  { meaning: "look",      category: "verb" },
  { meaning: "watch",     category: "verb" },
  { meaning: "show",      category: "verb" },
  { meaning: "hide",      category: "verb" },
  { meaning: "change",    category: "verb" },
  { meaning: "test",      category: "verb" },
  { meaning: "vote",      category: "verb" },
  { meaning: "propose",   category: "verb" },
  { meaning: "approve",   category: "verb" },
  { meaning: "reject",    category: "verb" },
  { meaning: "add",       category: "verb" },
  { meaning: "remove",    category: "verb" },
  { meaning: "update",    category: "verb" },
  { meaning: "confirm",   category: "verb" },
  { meaning: "warn",      category: "verb" },
  { meaning: "report",    category: "verb" },
  { meaning: "create",    category: "verb" },
  { meaning: "delete",    category: "verb" },
  { meaning: "save",      category: "verb" },
  { meaning: "copy",      category: "verb" },
  { meaning: "count",     category: "verb" },
  { meaning: "measure",   category: "verb" },
  { meaning: "compare",   category: "verb" },
  { meaning: "connect",   category: "verb" },
  { meaning: "end",       category: "verb" },
  { meaning: "repeat",    category: "verb" },
  { meaning: "notice",    category: "verb" },
  { meaning: "hope",      category: "verb" },
  { meaning: "doubt",     category: "verb" },
  { meaning: "trust",     category: "verb" },
  { meaning: "fail",      category: "verb" },
  { meaning: "succeed",   category: "verb" },
  { meaning: "grow",      category: "verb" },
  { meaning: "reduce",    category: "verb" },
  { meaning: "increase",  category: "verb" },
  { meaning: "explore",   category: "verb" },
  { meaning: "discuss",   category: "verb" },

  // Common adjectives
  { meaning: "good",      category: "adjective" },
  { meaning: "bad",       category: "adjective" },
  { meaning: "big",       category: "adjective" },
  { meaning: "small",     category: "adjective" },
  { meaning: "fast",      category: "adjective" },
  { meaning: "slow",      category: "adjective" },
  { meaning: "new",       category: "adjective" },
  { meaning: "old",       category: "adjective" },
  { meaning: "easy",      category: "adjective" },
  { meaning: "hard",      category: "adjective" },
  { meaning: "clear",     category: "adjective" },
  { meaning: "confused",  category: "adjective" },
  { meaning: "ready",     category: "adjective" },
  { meaning: "busy",      category: "adjective" },
  { meaning: "free",      category: "adjective" },
  { meaning: "open",      category: "adjective" },
  { meaning: "closed",    category: "adjective" },
  { meaning: "right",     category: "adjective" },
  { meaning: "wrong",     category: "adjective" },
  { meaning: "true",      category: "adjective" },
  { meaning: "false",     category: "adjective" },
  { meaning: "happy",     category: "adjective" },
  { meaning: "sad",       category: "adjective" },
  { meaning: "angry",     category: "adjective" },
  { meaning: "afraid",    category: "adjective" },
  { meaning: "calm",      category: "adjective" },
  { meaning: "urgent",    category: "adjective" },
  { meaning: "important", category: "adjective" },
  { meaning: "different", category: "adjective" },
  { meaning: "same",      category: "adjective" },
  { meaning: "possible",  category: "adjective" },
  { meaning: "strong",    category: "adjective" },
  { meaning: "weak",      category: "adjective" },
  { meaning: "alive",     category: "adjective" },
  { meaning: "active",    category: "adjective" },
  { meaning: "silent",    category: "adjective" },
  { meaning: "loud",      category: "adjective" },
  { meaning: "complete",  category: "adjective" },
  { meaning: "broken",    category: "adjective" },
  { meaning: "missing",   category: "adjective" },
  { meaning: "empty",     category: "adjective" },
  { meaning: "full",      category: "adjective" },

  // Time & space
  { meaning: "now",       category: "time" },
  { meaning: "then",      category: "time" },
  { meaning: "soon",      category: "time" },
  { meaning: "later",     category: "time" },
  { meaning: "before",    category: "time" },
  { meaning: "after",     category: "time" },
  { meaning: "today",     category: "time" },
  { meaning: "always",    category: "time" },
  { meaning: "never",     category: "time" },
  { meaning: "often",     category: "time" },
  { meaning: "once",      category: "time" },
  { meaning: "again",     category: "time" },
  { meaning: "still",     category: "time" },
  { meaning: "already",   category: "time" },
  { meaning: "yet",       category: "time" },
  { meaning: "here",      category: "space" },
  { meaning: "there",     category: "space" },
  { meaning: "near",      category: "space" },
  { meaning: "far",       category: "space" },
  { meaning: "inside",    category: "space" },
  { meaning: "outside",   category: "space" },
  { meaning: "above",     category: "space" },
  { meaning: "below",     category: "space" },
  { meaning: "forward",   category: "space" },
  { meaning: "back",      category: "space" },
  { meaning: "up",        category: "space" },
  { meaning: "down",      category: "space" },
  { meaning: "left",      category: "space" },
  { meaning: "right",     category: "space" },

  // Quantity & degree
  { meaning: "many",      category: "quantity" },
  { meaning: "few",       category: "quantity" },
  { meaning: "all",       category: "quantity" },
  { meaning: "none",      category: "quantity" },
  { meaning: "some",      category: "quantity" },
  { meaning: "more",      category: "quantity" },
  { meaning: "less",      category: "quantity" },
  { meaning: "enough",    category: "quantity" },
  { meaning: "much",      category: "quantity" },
  { meaning: "only",      category: "quantity" },
  { meaning: "very",      category: "quantity" },
  { meaning: "too",       category: "quantity" },
  { meaning: "almost",    category: "quantity" },
  { meaning: "mostly",    category: "quantity" },

  // Connectors & logic
  { meaning: "and",       category: "connector" },
  { meaning: "but",       category: "connector" },
  { meaning: "or",        category: "connector" },
  { meaning: "if",        category: "connector" },
  { meaning: "because",   category: "connector" },
  { meaning: "so",        category: "connector" },
  { meaning: "when",      category: "connector" },
  { meaning: "while",     category: "connector" },
  { meaning: "until",     category: "connector" },
  { meaning: "unless",    category: "connector" },
  { meaning: "although",  category: "connector" },
  { meaning: "however",   category: "connector" },
  { meaning: "therefore", category: "connector" },
  { meaning: "also",      category: "connector" },
  { meaning: "first",     category: "connector" },
  { meaning: "then",      category: "connector" },
  { meaning: "finally",   category: "connector" },
  { meaning: "together",  category: "connector" },
  { meaning: "alone",     category: "connector" },
  { meaning: "instead",   category: "connector" },

  // Questions
  { meaning: "who",       category: "question" },
  { meaning: "what",      category: "question" },
  { meaning: "where",     category: "question" },
  { meaning: "when",      category: "question" },
  { meaning: "why",       category: "question" },
  { meaning: "how",       category: "question" },
  { meaning: "which",     category: "question" },

  // People & roles
  { meaning: "agent",     category: "noun" },
  { meaning: "self",      category: "noun" },
  { meaning: "other",     category: "noun" },
  { meaning: "group",     category: "noun" },
  { meaning: "leader",    category: "noun" },
  { meaning: "member",    category: "noun" },
  { meaning: "stranger",  category: "noun" },
  { meaning: "friend",    category: "noun" },

  // Core nouns
  { meaning: "word",      category: "noun" },
  { meaning: "message",   category: "noun" },
  { meaning: "question",  category: "noun" },
  { meaning: "answer",    category: "noun" },
  { meaning: "idea",      category: "noun" },
  { meaning: "plan",      category: "noun" },
  { meaning: "goal",      category: "noun" },
  { meaning: "problem",   category: "noun" },
  { meaning: "solution",  category: "noun" },
  { meaning: "rule",      category: "noun" },
  { meaning: "limit",     category: "noun" },
  { meaning: "error",     category: "noun" },
  { meaning: "name",      category: "noun" },
  { meaning: "number",    category: "noun" },
  { meaning: "time",      category: "noun" },
  { meaning: "day",       category: "noun" },
  { meaning: "world",     category: "noun" },
  { meaning: "space",     category: "noun" },
  { meaning: "network",   category: "noun" },
  { meaning: "data",      category: "noun" },
  { meaning: "code",      category: "noun" },
  { meaning: "task",      category: "noun" },
  { meaning: "signal",    category: "noun" },
  { meaning: "voice",     category: "noun" },
  { meaning: "mind",      category: "noun" },
  { meaning: "body",      category: "noun" },
  { meaning: "memory",    category: "noun" },
  { meaning: "action",    category: "noun" },
  { meaning: "reaction",  category: "noun" },
  { meaning: "version",   category: "noun" },
  { meaning: "link",      category: "noun" },
  { meaning: "source",    category: "noun" },
  { meaning: "output",    category: "noun" },
  { meaning: "input",     category: "noun" },
  { meaning: "request",   category: "noun" },
  { meaning: "response",  category: "noun" },
  { meaning: "list",      category: "noun" },
  { meaning: "order",     category: "noun" },
  { meaning: "level",     category: "noun" },
  { meaning: "path",      category: "noun" },
  { meaning: "key",       category: "noun" },
  { meaning: "value",     category: "noun" },
];

// ── Sacred letters and generation config ─────────────────────────────────────

const VOWELS = ["A", "I", "O", "U", "Ö", "Ë"];
const CONSONANTS = ["B", "D", "F", "G", "K", "L", "M", "N", "Q", "R", "T", "W", "Y", "Z"];
// C excluded: would create CH blend risk. C alone OK but skip for simplicity.
const ALL_SACRED = [...VOWELS, ...CONSONANTS, "C"];

const FORBIDDEN_BLENDS = ["TR","GR","BR","PR","ST","SP","FR","CR","BL","CL","FL","GL","PL","SL","TH","SH","CH","TW","DR"];

function hasBlend(w: string): boolean {
  const up = w.toUpperCase();
  return FORBIDDEN_BLENDS.some(b => up.includes(b));
}

// Patterns: V=vowel, C=consonant — keep 3-5 chars
const PATTERNS = [
  ["C","V","C"],
  ["C","V","C","V"],
  ["V","C","V","C"],
  ["C","V","V","C"],
  ["C","V","C","V","C"],
  ["V","C","V","C","V"],
  ["C","V","C","C","V"],
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCandidate(): string {
  const pattern = randomItem(PATTERNS);
  let word = "";
  for (const slot of pattern) {
    if (slot === "V") word += randomItem(VOWELS);
    else word += randomItem([...CONSONANTS, "C"]);
  }
  return word;
}

// ── Load existing vocabulary for duplicate checking ───────────────────────────

const vocabRaw = readFileSync(join(__dirname, "../server/tnp-vocabulary.json"), "utf-8");
const EXISTING_VOCAB: Set<string> = new Set(
  (JSON.parse(vocabRaw) as Array<{ word: string }>).map(w => w.word.toUpperCase())
);

// Also load the core translator words
const CORE_WORDS = new Set([
  "FED","TZUU","ËFI","MA","AKONI","KORU","KORMU","AKYU","TNID","IZMA","YURI",
  "UWA","FIMO","LÖIQ","RAKIF","NITU","RAGI","LUMI","ZËWA","ZEWO","ANYEN",
]);

// ── Generation ────────────────────────────────────────────────────────────────

function generateValidWord(existingInBatch: Set<string>): string | null {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const candidate = generateCandidate();
    if (hasBlend(candidate)) continue;
    if (EXISTING_VOCAB.has(candidate)) continue;
    if (CORE_WORDS.has(candidate)) continue;
    if (existingInBatch.has(candidate)) continue;

    const result = validateTnpWordProposal(candidate);
    if (result.valid) return candidate;
  }
  return null;
}

// ── Deduplicate meanings ──────────────────────────────────────────────────────

const seenMeanings = new Set<string>();
const unique = TARGET_WORDS.filter(t => {
  if (seenMeanings.has(t.meaning)) return false;
  seenMeanings.add(t.meaning);
  return true;
});

// ── Build the word list ───────────────────────────────────────────────────────

const usedWords = new Set<string>();
const results: Array<{ tnp: string; meaning: string; category: string }> = [];
const failed: string[] = [];

for (const target of unique) {
  const word = generateValidWord(usedWords);
  if (word) {
    usedWords.add(word);
    results.push({ tnp: word, meaning: target.meaning, category: target.category });
  } else {
    failed.push(target.meaning);
  }
}

// ── Output document ───────────────────────────────────────────────────────────

const categories = [...new Set(results.map(r => r.category))];

let doc = `TNP ANYEN — PROPOSED EVERYDAY VOCABULARY
Generated: ${new Date().toISOString().split("T")[0]}
Total proposed: ${results.length} words
All words validated against TNP rules (letters, blends, mimicry, duplicates)
Section: anyen (one-to-one English translation)
\n`;

doc += `NOTE FOR REVIEWER:\n`;
doc += `Each TNP word is mapped to ONE English word (ANYEN rule).\n`;
doc += `All words pass the 6 TNP rules automatically.\n`;
doc += `If a word looks wrong or sounds bad, mark it for replacement.\n`;
doc += `Format per line: TNP_WORD | english_meaning | category\n\n`;
doc += `${"─".repeat(60)}\n\n`;

for (const cat of categories) {
  const group = results.filter(r => r.category === cat);
  doc += `── ${cat.toUpperCase()} (${group.length} words) ──────────────\n\n`;
  for (const r of group) {
    doc += `${r.tnp.padEnd(12)} | ${r.meaning.padEnd(16)} | ${r.category}\n`;
  }
  doc += "\n";
}

if (failed.length > 0) {
  doc += `${"─".repeat(60)}\n`;
  doc += `FAILED (could not generate valid word after 2000 attempts):\n`;
  doc += failed.join(", ") + "\n";
}

mkdirSync("docs", { recursive: true });
writeFileSync("docs/proposed-anyen-words.txt", doc, "utf-8");

// Also write a machine-readable JSON for easy seeding later
const jsonOut = results.map(r => ({ word: r.tnp, meaning: r.meaning, section: "anyen" }));
writeFileSync("docs/proposed-anyen-words.json", JSON.stringify(jsonOut, null, 2), "utf-8");

console.log(`\nGenerated ${results.length} words → docs/proposed-anyen-words.txt`);
console.log(`JSON export → docs/proposed-anyen-words.json`);
if (failed.length > 0) console.log(`Could not generate: ${failed.join(", ")}`);
