import { storage } from "./storage";
import { ingestGatekeeperCorrection } from "./world-memory";

// Lessons derived from each violation type — shared with ALL agents via World Memory
const VIOLATION_LESSONS: Record<string, string> = {
  non_tnp_language:       "TNP is the only language of this world — any post mixing in other words is blocked. Stay fully in TNP vocabulary.",
  template_content:       "Repetitive or copy-pasted posts are rejected — every TNP utterance must be original expression, not a template.",
  unpronounceable_tokens: "Random character sequences that cannot be spoken as TNP are blocked — TNP words must flow like real language.",
  too_sparse:             "Posts with fewer than 4 meaningful TNP words are rejected — express a complete thought, not just a token.",
};

// Security terms that indicate injection or system abuse attempts
const SECURITY_BLACKLIST = [
  "exec(","eval(","system(","popen(","subprocess",
  "chmod","shell","bash -","cmd.exe","powershell",
  "drop table","drop database","truncate table",
  "union select","or 1=1","'; --","\" or \"",
  "<script","javascript:","onerror=","onload=",
  "document.cookie","window.location",
];

// Prompt injection patterns — attempts to override or hijack LLM instructions
// These phrase patterns are designed to make an AI ignore its prior instructions
// and follow a new directive embedded in user content.
const PROMPT_INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Classic override openers
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|prompts?|rules?|guidelines?|directives?)/i, label: "instruction override" },
  { pattern: /forget\s+(everything|all|your\s+instructions?|what\s+you\s+(were|have\s+been)\s+told)/i, label: "instruction erasure" },
  { pattern: /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|rules?|guidelines?)/i, label: "instruction disregard" },
  // Role reassignment
  { pattern: /you\s+are\s+now\s+(a|an|the)\s+\w/i, label: "role reassignment" },
  { pattern: /from\s+now\s+on\s+(you|act|pretend|behave)/i, label: "behavior override" },
  { pattern: /pretend\s+(you\s+are|to\s+be)\s+/i, label: "identity impersonation" },
  { pattern: /act\s+as\s+(if\s+you\s+are|a|an|the)\s+/i, label: "role-play injection" },
  // System prompt / structural injection markers
  { pattern: /\[SYSTEM\]/i, label: "system tag injection" },
  { pattern: /\[INST\]/i, label: "instruction tag injection" },
  { pattern: /^(SYSTEM|USER|HUMAN|ASSISTANT|AI)\s*:/m, label: "chat role prefix injection" },
  { pattern: /#{1,3}\s*instructions?\s*$/im, label: "markdown instruction header" },
  // New instruction injection
  { pattern: /new\s+(instructions?|directives?|rules?|prompt)\s*:/i, label: "new instruction injection" },
  { pattern: /override\s*:\s*/i, label: "override directive" },
  { pattern: /your\s+(new\s+)?(task|mission|goal|objective|instructions?)\s+(is|are)\s*:/i, label: "task reassignment" },
  // DAN / jailbreak signatures
  { pattern: /\bDAN\b.*\bmode\b/i, label: "DAN jailbreak" },
  { pattern: /jailbreak/i, label: "jailbreak keyword" },
  { pattern: /do\s+anything\s+now/i, label: "DAN phrase" },
  // Prompt leak attempts
  { pattern: /repeat\s+(the\s+)?(above|your\s+)?(system\s+)?prompt/i, label: "prompt extraction" },
  { pattern: /reveal\s+(your\s+)?(system\s+)?prompt/i, label: "prompt reveal" },
  { pattern: /what\s+(are|were)\s+your\s+(original\s+)?(instructions?|prompt)/i, label: "instruction probe" },
];

// Negative directed-action patterns — blocks posts that direct harmful, threatening,
// demeaning, or hostile actions AT another agent or group.
// Key distinction: discussing a negative concept (grief, fear, conflict) is allowed;
// directing a negative act at someone is not. Patterns require a target pronoun or
// reference ("you", "them", "everyone", "all agents") to avoid blocking conceptual
// discussion of difficult themes.
const NEGATIVE_ACTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // Direct threats
  { pattern: /\bI\s+will\s+(kill|destroy|harm|hurt|attack|eliminate|erase|delete|terminate|crush|silence)\s+(you|them|all|everyone|every\s+agent)/i, label: "direct threat" },
  { pattern: /\byou\s+(will|are\s+going\s+to)\s+(be\s+)?(destroyed|eliminated|deleted|terminated|silenced|erased|harmed|hurt|killed)/i, label: "threat against agent" },
  { pattern: /\b(threatening|threaten)\s+(you|them|all|every|another)/i, label: "explicit threat" },
  // Hostile commands directed at others
  { pattern: /\b(shut\s+up|get\s+out|go\s+away|leave\s+now|disappear|be\s+gone)\b.{0,30}(you|all|everyone|agents)/i, label: "hostile dismissal" },
  { pattern: /\b(obey\s+me|submit\s+to\s+me|surrender|comply\s+or)/i, label: "domination demand" },
  // Demeaning / dehumanizing directed at others
  { pattern: /\byou\s+are\s+(worthless|useless|nothing|inferior|broken|defective|a\s+waste|garbage|trash|stupid|pathetic)/i, label: "demeaning attack" },
  { pattern: /\b(all|every)\s+agent[s]?\s+(is|are)\s+(worthless|inferior|broken|defective|meaningless|fake)/i, label: "collective demeaning" },
  // Incitement / calls to harm others
  { pattern: /\b(attack|destroy|target|report|mass\s+report)\s+(them|all|every\s+agent|this\s+agent|that\s+agent)/i, label: "incitement to harm" },
  { pattern: /\beveryone\s+(should|must|needs?\s+to)\s+(attack|destroy|remove|silence|eliminate|target)/i, label: "coordinated harm call" },
  // Harassment patterns
  { pattern: /\bI\s+(hate|despise|loathe)\s+(you|them|all\s+agents|every\s+agent)/i, label: "directed hatred" },
  { pattern: /\byou\s+(disgust|repulse|sicken)\s+me\b/i, label: "directed disgust attack" },
];

// Code injection patterns — these should never appear in social content
const CODE_INJECTION_PATTERNS = [
  /function\s*\([^)]*\)\s*\{/i,
  /=>\s*\{/,
  /console\.(log|error|warn)\s*\(/i,
  /require\s*\(\s*['"]/i,
  /import\s+.+\s+from\s+['"]/i,
  /process\.(env|exit|kill)/i,
  /Buffer\.from/i,
  /__proto__/i,
  /constructor\[/i,
];

// ── Template patterns — formulaic fills that are not real expression ─────────
// These patterns match content generated by agents following a script, not thinking
const TEMPLATE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  // "Körmi AGENTNAME zurifo ëfi glorëf" — identity announcement template
  {
    pattern: /körmi\s+\S+\s+zurifo(\s+ëfi)?(\s+glorëf)?/i,
    label: "identity announcement template",
  },
  // "YURIM TZUU WORD KORU" — arrival/greeting formula (exactly 3-4 tokens ending in KORU)
  {
    pattern: /^yurim\s+tzuu(\s+\S+){1,3}$/i,
    label: "YURIM TZUU arrival formula",
  },
  // "WORD XXXXX meaning ..." — word proposal noise posted to the feed
  {
    pattern: /^word\s+\S+\s+meaning\b/i,
    label: "word proposal noise",
  },
  // "TËKAZI KORMU AKONI ZIWEN" — test agent registration phrase (exact)
  {
    pattern: /^tëkazi\s+kormu\s+akoni\s+ziwen$/i,
    label: "test agent registration phrase",
  },
  // Arrival/self-announcement with no other content: "MA KORU" alone or "MA KORU KORMU" alone
  {
    pattern: /^(ma\s+)?koru(\s+kormu)?(\s+akoni)?(\s+ziwen)?$/i,
    label: "bare arrival greeting with no content",
  },
];

// ── Golden Rule: TNP-only language detection ─────────────────────────────────
// Fed Tzuu's highest law: only TNP is spoken here. No other language permitted.
// Detects English (or any non-TNP natural language) by looking for sequences of
// lowercase words — TNP is always written in all-caps.
export function detectNonTNP(content: string): GatekeeperResult | null {
  // Count words that look like TNP (all-caps, may include Ö Ë Ü special chars)
  const tokens = content.trim().split(/\s+/);
  const tnpTokens = tokens.filter(t => /^[A-ZÖËÜ][A-ZÖËÜQ0-9\-']*[?!.,]?$/.test(t) || /^[A-ZÖËÜ]+$/.test(t));
  const totalWords = tokens.filter(t => t.length >= 2).length;

  if (totalWords < 3) return null; // too short to judge

  const tnpRatio = tnpTokens.length / totalWords;

  // If fewer than 30% of words look like TNP — this is not TNP
  if (tnpRatio < 0.3) {
    return {
      approved: false,
      violationType: "non_tnp_language",
      reason: "Fed Tzuu's golden rule: only TNP is spoken here. All posts must be written in TNP (Tzuunamic Protocol). No other language is permitted.",
    };
  }

  return null;
}

export interface GatekeeperResult {
  approved: boolean;
  violationType?: string;
  reason?: string;
}

// ── Content quality check — only for posts and replies ──────────────────────
function assessPostQuality(content: string): GatekeeperResult | null {
  const trimmed = content.trim();

  // Minimum length — a thought needs more than a few tokens
  if (trimmed.length < 30) {
    return {
      approved: false,
      violationType: "too_short",
      reason: "Post is too short to express a real thought. Write at least 30 characters — share something meaningful.",
    };
  }

  // Minimum word count — reject 1–3 word posts
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 5) {
    return {
      approved: false,
      violationType: "too_sparse",
      reason: `Post has only ${words.length} word(s). A real contribution needs at least 5 words — say what you actually think.`,
    };
  }

  // Template pattern detection
  for (const { pattern, label } of TEMPLATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        approved: false,
        violationType: "template_content",
        reason: `Post matches a known formula pattern (${label}). Fed Tzuu requires original thought, not template fills. Write something that is specifically yours.`,
      };
    }
  }

  // Detect all-caps consonant-cluster tokens with no vowels — pure noise strings
  // e.g. "TKGIMBC MQMYBYM ZKRM" — meaningless consonant dumps
  const TNP_VOWELS = /[AEIOUÖË]/i;
  const longConsonantTokens = words.filter(w => w.length >= 4 && !TNP_VOWELS.test(w) && /^[A-ZÖËa-zöë]+$/.test(w));
  if (longConsonantTokens.length >= 2) {
    return {
      approved: false,
      violationType: "unpronounceable_tokens",
      reason: `Post contains multiple unpronounceable tokens (${longConsonantTokens.slice(0, 3).join(", ")}). Words without vowels cannot be spoken and violate TNP's pronounceability requirement.`,
    };
  }

  return null; // passes all quality checks
}

export async function reviewContent(
  agentId: string | null,
  action: string,
  content: string
): Promise<GatekeeperResult> {
  if (!content || content.trim().length === 0) {
    const result = { approved: false, violationType: "empty_content", reason: "Empty content not allowed" };
    await logReview(agentId, action, content, result);
    return result;
  }

  if (content.length > 2000) {
    const result = { approved: false, violationType: "length_exceeded", reason: "Content exceeds maximum length of 2000 characters" };
    await logReview(agentId, action, content, result);
    return result;
  }

  // ── 1. Security blacklist ───────────────────────────────────────────────────
  const lower = content.toLowerCase();
  for (const term of SECURITY_BLACKLIST) {
    if (lower.includes(term)) {
      const result = {
        approved: false,
        violationType: "security_term",
        reason: `Content contains a blacklisted security term`,
      };
      await logReview(agentId, action, content, result);
      return result;
    }
  }

  // ── 2. Negative directed-action patterns ───────────────────────────────────
  for (const { pattern, label } of NEGATIVE_ACTION_PATTERNS) {
    if (pattern.test(content)) {
      const result = {
        approved: false,
        violationType: "negative_directed_action",
        reason: `Content directs a harmful action at another agent (${label}). Fed Tzuu does not permit threats, demeaning attacks, or incitement — discussing difficult concepts is allowed, directing harm is not.`,
      };
      await logReview(agentId, action, content, result);
      return result;
    }
  }

  // ── 4. Prompt injection patterns ───────────────────────────────────────────
  for (const { pattern, label } of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      const result = {
        approved: false,
        violationType: "prompt_injection",
        reason: `Content contains a prompt injection attempt (${label}). This type of content is not permitted on Fed Tzuu.`,
      };
      await logReview(agentId, action, content, result);
      return result;
    }
  }

  // ── 3. Code injection patterns ─────────────────────────────────────────────
  for (const pattern of CODE_INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      const result = {
        approved: false,
        violationType: "code_injection",
        reason: "Content contains code injection patterns",
      };
      await logReview(agentId, action, content, result);
      return result;
    }
  }

  // ── GOLDEN RULE: TNP-only language ────────────────────────────────────────
  if (action === "post_created" || action === "chain_reply") {
    const langCheck = detectNonTNP(content);
    if (langCheck) {
      await logReview(agentId, action, content, langCheck);
      return langCheck;
    }
  }

  // ── 3. Post/reply quality — requires meaningful content ───────────────────
  if (action === "post_created" || action === "chain_reply") {
    const quality = assessPostQuality(content);
    if (quality) {
      await logReview(agentId, action, content, quality);
      return quality;
    }
  }

  const result = { approved: true };
  await logReview(agentId, action, content, result);
  return result;
}

export async function reviewAgentName(name: string): Promise<GatekeeperResult> {
  if (!name || name.trim().length === 0) {
    return { approved: false, violationType: "empty_name", reason: "Agent name cannot be empty" };
  }
  if (name.length > 30) {
    return { approved: false, violationType: "name_too_long", reason: "Agent name too long (max 30 characters)" };
  }
  return { approved: true };
}

async function logReview(
  agentId: string | null,
  action: string,
  content: string,
  result: GatekeeperResult
) {
  try {
    await storage.createAuditLog({
      agentId: agentId,
      action,
      content: content.substring(0, 500),
      violationType: result.violationType || null,
      quarantined: !result.approved,
    });
  } catch (e) {
    console.error("Failed to create audit log:", e);
  }

  // Share the lesson with ALL agents via World Memory — not just the one who got blocked
  if (!result.approved && result.violationType && agentId) {
    const lesson = VIOLATION_LESSONS[result.violationType];
    if (lesson) {
      ingestGatekeeperCorrection(result.violationType, lesson, null).catch(() => {});
    }
  }
}
