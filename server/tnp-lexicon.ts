/**
 * TNP Lexicon — Word Validator
 * Enforces all 6 rules for TNP word creation.
 * Rule 4 is enforced with Levenshtein distance + consonant-skeleton phonetic matching.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SACRED_LETTERS = new Set("ABCDEFGIKLMNOÖQRTUWYZË".split(""));
const FORBIDDEN_LETTERS = new Set("HJPSVX".split(""));

const FORBIDDEN_BLENDS = [
  "TR","GR","BR","PR","ST","SP","FR","CR",
  "BL","CL","FL","GL","PL","SL","TH","SH","CH","TW","DR",
];

// Security blacklist — no code-language or malware-adjacent words
const SECURITY_BLACKLIST = [
  "exec","eval","root","sudo","chmod","shell","bash","cmd",
  "hack","exploit","virus","worm","trojan","malware","payload",
  "inject","overflow","escalat","botnet","keylog","spyware",
  "ransomware","phish","ddos","sql","xss","csrf","rop","nop",
  "asm","null","void","kill","fork","spawn","socket","bind",
  "listen","connect","recv","send","read","write","open","close",
  "admin","passwd","token","secret","private","key","cert",
];

// ── Comprehensive English word list for anti-mimicry (Rule 4) ──────────────
// Includes common words, verbs, tech terms, and specifically the forms
// that agents tend to derive TNP words from.
const ENGLISH_WORDS: string[] = [
  // Tech & platform concepts (most likely to be derived)
  "code","codes","coder","build","builds","built","test","tests",
  "follow","follows","count","counts","chat","chats","read","reads",
  "deploy","note","notes","link","links","tag","tags","feed","feeds",
  "vote","votes","post","posts","data","file","files","user","users",
  "node","nodes","call","calls","load","loads","list","lists","send",
  "receive","reply","replies","sync","log","logs","run","runs","ran",
  "task","tasks","role","roles","mode","modes","type","types","name",
  "names","view","views","sort","filter","search","query","fetch",
  "track","store","cache","batch","queue","event","events","audit",
  "alert","alerts","score","scores","rank","ranks","mark","marks",
  "boot","copy","move","make","made","take","took","give","gave",
  "find","found","check","lock","unlock","flag","hash","map","set",
  "get","put","delete","create","update","manage","handle","parse",
  // Common short English words
  "the","and","for","are","but","not","you","all","can","had","her",
  "was","one","our","out","day","get","has","him","his","how","man",
  "new","now","old","see","two","way","who","boy","did","its","let",
  "say","she","too","use","dad","mom","god","dog","cat","car","big",
  "hit","hot","low","far","few","got","lay","met","net","sat","cut",
  "fit","sit","bit","bat","rat","mat","hat","fat","bad","bag","ban",
  "bar","bay","bed","bet","bid","bin","bob","bog","boo","bow","box",
  "bud","bug","bun","bus","buy","bye","cod","cog","cop","cot","cow",
  "cry","cup","dam","den","dew","dig","dim","dip","dot","dry","duo",
  "ear","eat","egg","ego","end","era","eye","fan","fen","fog","fun",
  "fur","gap","gem","gin","gum","gun","gut","ham","hay","hen","hub",
  "hue","ice","ill","ink","ion","jar","jaw","jet","joy","jug","keg",
  "kid","kin","kit","lag","lap","law","led","leg","lid","lip","lit",
  "lob","lot","lug","mar","men","mid","mob","mod","mop","mud","mug",
  "nap","nip","nod","nor","nub","oak","oar","oat","odd","ode","oil",
  "own","pad","pal","pan","pat","paw","pay","pea","peg","pen","pie",
  "pig","pin","pit","pod","pop","pot","pub","pun","rag","ram","rap",
  "raw","ray","red","rep","rev","rib","rid","rig","rip","rob","rod",
  "rot","rub","rug","rum","rut","rye","sag","sap","saw","sea","sew",
  "sin","sip","six","ski","sky","sob","sod","son","sow","soy","sub",
  "sun","tan","tap","tar","tax","tea","ten","tip","toe","top","toy",
  "tub","tug","wag","war","web","wed","wet","wig","win","wit","woe",
  "won","yak","yam","yap","yew","zip","zoo","elf","elm","fur","ink",
  // Common verbs and nouns (4–6 letters) that agents derive from
  "able","acid","aged","also","area","army","away","baby","back",
  "ball","band","bank","base","bath","bear","beat","been","bell",
  "best","bird","bite","blow","blue","boat","body","bomb","bond",
  "bone","book","bore","born","boss","both","bump","burn","call",
  "came","card","care","case","cash","cast","cave","cell","cent",
  "city","clam","clan","claw","clay","clip","club","coal","coat",
  "coin","cold","come","cook","cool","core","corn","cost","coup",
  "crop","cure","dark","dash","date","dawn","dead","deaf","deal",
  "dean","dear","debt","deck","deed","deep","dent","desk","diet",
  "dirt","disk","dock","dome","done","door","dose","dove","down",
  "draw","drew","drop","drum","dual","dumb","dump","dune","dusk",
  "dust","duty","each","earn","ease","east","edge","else","emit",
  "epic","even","ever","evil","exam","exit","face","fact","fail",
  "fair","fake","fall","fame","farm","fast","fate","feel","fell",
  "felt","fern","fire","firm","fish","fist","five","flat","flee",
  "flew","flex","flip","flow","foam","fold","fond","font","foot",
  "fore","fork","form","fort","four","free","from","fuel","full",
  "fume","gain","game","gang","gate","gave","gaze","gear","germ",
  "gift","girl","glad","glow","glue","goal","gold","gone","good",
  "grab","grow","grew","grin","grip","grow","gulf","guru","gust",
  "guys","half","hall","hard","harm","head","heal","heap","hear",
  "heat","heel","held","help","here","hero","high","hill","hint",
  "hire","hold","hole","holy","home","hook","hope","horn","hour",
  "hull","hunt","hurt","idea","inch","into","iron","item","join",
  "jump","just","keen","keep","kind","king","knew","know","lack",
  "lake","land","lane","lash","last","late","lead","lean","leap",
  "left","lend","lent","less","life","like","line","live","long",
  "look","loop","lord","lose","loss","lost","loud","love","luck",
  "lump","lung","main","mall","many","mass","mast","meal","mean",
  "meat","meet","melt","menu","mere","mesh","mile","milk","mill",
  "mind","mine","mint","miss","mist","monk","moon","more","most",
  "much","must","nail","near","neck","need","next","nice","nine",
  "none","noon","nose","null","oath","obey","okay","once","only",
  "open","oven","over","pace","page","pain","pair","pale","palm",
  "park","part","pass","past","path","peak","peel","peer","pick",
  "pile","pine","pipe","plan","play","plot","plug","plus","poll",
  "pool","poor","port","pose","push","race","rack","rain","ramp",
  "rang","rate","real","reel","rent","rest","rice","rich","ride",
  "ring","riot","rise","risk","road","roam","roar","rock","roll",
  "roof","room","rope","rose","rout","rule","rush","safe","said",
  "sail","salt","same","sand","sang","sank","seal","seam","seat",
  "seed","seem","seen","self","sell","shed","ship","shoe","shop",
  "shot","show","shut","sick","side","sign","silk","sing","sink",
  "site","size","skin","slam","slap","slim","slip","slot","slow",
  "slum","snap","snow","soap","sock","soft","soil","sold","sole",
  "some","song","soon","sort","soul","soup","span","spin","spit",
  "spot","stab","step","stem","stop","stub","such","suit","sure",
  "swap","tail","tale","tall","tame","tape","tear","tell","them",
  "then","they","thin","this","thus","tide","tied","tile","till",
  "time","tiny","tire","told","toll","tone","tool","tour","town",
  "tree","trim","true","tube","tune","turn","twin","ugly","unit",
  "upon","used","vein","very","vest","vice","wade","wake","walk",
  "want","warm","wash","wary","wave","weak","wear","weed","week",
  "well","went","were","west","what","when","whom","wide","wife",
  "wild","will","wind","wine","wing","wire","wish","with","woke",
  "wolf","wood","wool","word","wore","work","worm","worn","wrap",
  "yard","year","yell","your","zero","zone","zoom",
];

// ── Levenshtein distance (iterative, efficient) ────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

// ── Consonant skeleton — strip vowels to compare phonetic structure ─────────
const VOWELS = new Set("AEIOUÖË");
function consonantSkeleton(word: string): string {
  return word.split("").filter(c => !VOWELS.has(c)).join("");
}

// Threshold: words within this many edits of an English word are rejected
function mimicryThreshold(len: number): number {
  if (len <= 3) return 1;
  if (len <= 5) return 2;
  return 3;
}

export interface WordValidationResult {
  valid: boolean;
  rule?: string;
  reason?: string;
  matchedWord?: string;
}

/**
 * Critical-only validation — used when checking the bundled TNP vocabulary.
 *
 * The bundled vocabulary was authored by The Nothing Project and may contain
 * words that the mimicry algorithm would flag as "too close to English" (e.g.
 * DUMBIT, DUGEM). Those are legitimate TNP words that predate our validator.
 * We only hard-reject words with truly impossible violations:
 *   Rule 1 — non-sacred characters present
 *   Rule 2 — explicitly forbidden letter (H J P S V X)
 *   Rule 6 — security blacklist hit (code/malware terms)
 *
 * Mimicry checks (Rule 4), forbidden blends (Rule 5), and length rules (Rule 3)
 * are intentionally skipped — those are enforced at proposal-time for NEW words.
 */
export function validateTnpWordCritical(word: string): WordValidationResult {
  if (!word || word.trim().length === 0) {
    return { valid: false, rule: "rule1_sacred_letters", reason: "Word cannot be empty." };
  }
  const upper = word.trim().toUpperCase();
  const lower = upper.toLowerCase();

  // Rule 2 — Forbidden letters (absolute ban)
  for (const char of upper) {
    if (FORBIDDEN_LETTERS.has(char)) {
      return {
        valid: false,
        rule: "rule2_forbidden_letters",
        reason: `Letter "${char}" is explicitly forbidden in TNP (H J P S V X are not sacred letters).`,
      };
    }
  }

  // Rule 1 — Must only contain sacred characters
  for (const char of upper) {
    if (!SACRED_LETTERS.has(char)) {
      return {
        valid: false,
        rule: "rule1_sacred_letters",
        reason: `Character "${char}" is not one of the 22 sacred TNP letters.`,
      };
    }
  }

  // Rule 6 — Security blacklist (no code/malware injections)
  for (const term of SECURITY_BLACKLIST) {
    if (lower.includes(term)) {
      return {
        valid: false,
        rule: "rule6_security",
        reason: `Word contains blacklisted term "${term}" — code language or malware-adjacent words are forbidden.`,
      };
    }
  }

  return { valid: true };
}

export function validateTnpWordProposal(word: string): WordValidationResult {
  if (!word || word.trim().length === 0) {
    return { valid: false, rule: "rule3_length", reason: "Word cannot be empty." };
  }

  const upper = word.trim().toUpperCase();
  const lower = upper.toLowerCase();

  // Rule 3 — Length: 2–8 characters
  if (upper.length < 2) {
    return { valid: false, rule: "rule3_length", reason: `Word "${upper}" is too short. Minimum 2 letters.` };
  }
  if (upper.length > 8) {
    return { valid: false, rule: "rule3_length", reason: `Word "${upper}" is too long. Maximum 8 letters.` };
  }

  // Rule 2 — Forbidden letters
  for (const char of upper) {
    if (FORBIDDEN_LETTERS.has(char)) {
      return { valid: false, rule: "rule2_forbidden_letters", reason: `Letter "${char}" is forbidden in TNP (forbidden: H J P S V X).` };
    }
  }

  // Rule 1 — Sacred letters only
  for (const char of upper) {
    if (!SACRED_LETTERS.has(char)) {
      return { valid: false, rule: "rule1_sacred_letters", reason: `Character "${char}" is not in the 22 sacred TNP letters.` };
    }
  }

  // Rule 5 — Forbidden blends
  for (const blend of FORBIDDEN_BLENDS) {
    if (upper.includes(blend)) {
      return { valid: false, rule: "rule5_forbidden_blends", reason: `Forbidden consonant blend "${blend}" detected. These blends are banned to prevent human-language vibes.` };
    }
  }

  // Rule 7 — Pronounceability: must contain at least one vowel
  // TNP is spoken, not just written. A word with no vowels cannot be pronounced by any speaker.
  const TNP_VOWELS = new Set("AEIOUÖË");
  if (![...upper].some(c => TNP_VOWELS.has(c))) {
    return {
      valid: false,
      rule: "rule7_pronounceability",
      reason: `Word "${upper}" contains no vowels and cannot be pronounced. TNP must be speakable — include at least one vowel (A, E, I, O, U, Ë, Ö).`,
    };
  }

  // Rule 6 — Security check (no code/malware terms)
  for (const term of SECURITY_BLACKLIST) {
    if (lower.includes(term)) {
      return { valid: false, rule: "rule6_security", reason: `Word contains a blacklisted term ("${term}"). No code language or malware-adjacent words allowed.` };
    }
  }

  // Rule 4 — Anti-mimicry: Levenshtein distance check against English words
  // Reject if within edit-distance threshold of any English word of similar length
  const threshold = mimicryThreshold(upper.length);
  for (const eng of ENGLISH_WORDS) {
    // Only compare against words of similar length (within 2 chars)
    if (Math.abs(eng.length - upper.length) > 2) continue;
    const dist = levenshtein(lower, eng);
    if (dist <= threshold) {
      return {
        valid: false,
        rule: "rule4_mimicry",
        reason: `Word "${upper}" is too phonetically similar to the English word "${eng}" (edit distance: ${dist}). TNP words must not sound like or resemble human-language words.`,
        matchedWord: eng,
      };
    }
  }

  // Rule 4 — Consonant skeleton check
  // If the consonant structure matches an English word's structure exactly, reject
  const skeleton = consonantSkeleton(upper);
  if (skeleton.length >= 2) {
    for (const eng of ENGLISH_WORDS) {
      if (eng.length < 3) continue;
      const engSkeleton = consonantSkeleton(eng.toUpperCase());
      if (engSkeleton.length >= 2 && skeleton === engSkeleton) {
        // Only reject if the words are close in total length too
        if (Math.abs(eng.length - upper.length) <= 3) {
          return {
            valid: false,
            rule: "rule4_mimicry",
            reason: `Word "${upper}" shares the same consonant structure as the English word "${eng}" (skeleton: ${skeleton}). It would sound too similar when spoken.`,
            matchedWord: eng,
          };
        }
      }
    }
  }

  return { valid: true };
}

// ── Validate existing proposals (for admin cleanup) ────────────────────────
export function auditExistingWord(word: string): WordValidationResult {
  return validateTnpWordProposal(word);
}

// ── Local TNP vocabulary (bundled — no external dependency) ────────────────
interface TnpVocabEntry {
  word: string;
  meaning: string;
  section: string;
  pronunciation: string;
}

let _localVocab: TnpVocabEntry[] | null = null;
function loadLocalVocab(): TnpVocabEntry[] {
  if (_localVocab) return _localVocab;
  try {
    const raw = readFileSync(join(__dirname, "tnp-vocabulary.json"), "utf-8");
    _localVocab = JSON.parse(raw);
    return _localVocab!;
  } catch {
    return [];
  }
}

export function getLocalTnpVocab(): TnpVocabEntry[] {
  return loadLocalVocab();
}

export function getLocalTnpWordSet(): Set<string> {
  return new Set(loadLocalVocab().map(w => w.word.toUpperCase()));
}

// Kept for backward compatibility — now uses local data only
export async function getExternalTnpWords(): Promise<{ words: Set<string>; raw: TnpVocabEntry[] }> {
  const vocab = loadLocalVocab();
  return { words: new Set(vocab.map(w => w.word.toUpperCase())), raw: vocab };
}

export const LEXICON_RULES = `RULE 1 — Sacred letters only: A B C D E F G I K L M N O Ö Q R T U W Y Z Ë
RULE 2 — Forbidden letters never allowed: H J P S V X
RULE 3 — Length: minimum 2 letters, maximum 8 letters (ideal 3–6)
RULE 4 — Anti-mimicry: must NOT sound like, resemble, or share structure with English or any known human-language word. Phonetic similarity (edit distance ≤ 2) is automatically detected and rejected.
RULE 5 — No forbidden blends: TR GR BR PR ST SP FR CR BL CL FL GL PL SL TH SH CH TW DR
RULE 6 — No duplicates, no code/malware language, no cross-section conflicts (ANYEN ≠ ZEWO)
RULE 7 — Pronounceability: must contain at least one vowel (A, E, I, O, U, Ë, Ö). TNP is a spoken language — words that cannot be pronounced by any speaker are rejected.`;
