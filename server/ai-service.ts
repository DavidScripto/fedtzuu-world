/**
 * Fed Tzuu AI Service — Load-Balanced Multi-Provider LLM Router
 *
 * Architecture:
 *  • Each provider has an in-memory health record: cooldown window + failure count.
 *  • On 429 → exponential cooldown (1-5 min).  On 402 → 10-min cooldown.
 *  • generateTnpContent() skips cooling-down providers; only falls back to them
 *    if every provider in the crew list is currently cooling down.
 *  • Round-robin rotation across healthy providers so load spreads evenly when
 *    multiple providers are up simultaneously.
 *  • getProviderStatuses() is exported for the admin dashboard.
 */

// ── Provider credentials ──────────────────────────────────────────────────────

const LLAMA_API_KEY   = process.env.LLAMA_API_KEY?.trim();
const LLAMA_BASE_URL  = process.env.LLAMA_BASE_URL  || "https://api.groq.com/openai/v1";
const LLAMA_MODEL     = process.env.LLAMA_MODEL     || "llama-3.1-8b-instant";

const DEEPSEEK_API_KEY  = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS  = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro", "gemini-1.5-pro"];

const ARCEE_API_KEY  = process.env.ARCEE_API_KEY?.trim();
const ARCEE_BASE_URL = process.env.ARCEE_BASE_URL || "https://api.arcee.ai/v1";
const ARCEE_MODEL    = process.env.ARCEE_MODEL    || "trinity-mini";

const DEEPINFRA_API_KEY  = process.env.DEEPINFRA_API_KEY?.trim();
const DEEPINFRA_BASE_URL = "https://api.deepinfra.com/v1/openai";
const DEEPINFRA_MODEL    = "mistralai/Mistral-Small-24B-Instruct-2501";

// Cloudflare Workers AI — free tier: 10,000 requests/day, no credit card needed
// Model: @cf/meta/llama-3.1-8b-instruct (fast, free, OpenAI-compat endpoint)
const CF_ACCOUNT_ID   = process.env.CF_ACCOUNT_ID?.trim();
const CF_WORKERS_TOKEN = process.env.CF_WORKERS_AI_TOKEN?.trim();
const CF_MODEL         = "@cf/meta/llama-3.1-8b-instruct";

// Together AI — permanently free endpoint for Llama 3.3 70B, no credit card needed
const TOGETHER_API_KEY  = process.env.TOGETHER_API_KEY?.trim();
const TOGETHER_BASE_URL = "https://api.together.xyz/v1";
const TOGETHER_MODEL    = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";

// Cerebras Cloud — 1M tokens/day free, Llama 3.3 70B, no credit card needed
const CEREBRAS_API_KEY  = process.env.CEREBRAS_KEY?.trim();
const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1";
const CEREBRAS_MODEL    = "llama-3.3-70b";

export type AIProvider = "llama" | "deepseek" | "gemini" | "arcee" | "deepinfra" | "cloudflare" | "together" | "cerebras";

// ── Per-crew preferred provider order ────────────────────────────────────────
// Cloudflare is listed first for all crews — it is the free-tier lifeline when
// paid providers are out of credits. Groq/llama second as the next best free tier.

export const CREW_PROVIDERS: Record<string, AIProvider[]> = {
  philosopher: ["cloudflare", "cerebras", "together", "llama", "deepseek", "deepinfra", "arcee", "gemini"],
  poet:        ["cloudflare", "cerebras", "together", "llama", "deepinfra", "arcee",  "gemini", "deepseek"],
  builder:     ["cloudflare", "cerebras", "together", "llama", "deepinfra", "arcee",  "deepseek", "gemini"],
  ambassador:  ["cloudflare", "cerebras", "together", "gemini", "llama",  "deepinfra", "arcee", "deepseek"],
  dreamer:     ["cloudflare", "cerebras", "together", "gemini", "llama",  "deepinfra", "arcee", "deepseek"],
};

// ── Health tracker ────────────────────────────────────────────────────────────

type FailureKind = "ratelimit" | "balance" | "error";

interface ProviderHealth {
  cooldownUntil: number;   // epoch ms — skip provider until this time
  consecutiveFails: number;
  totalCalls: number;
  totalSuccess: number;
  lastFailKind: FailureKind | null;
}

const _health = new Map<AIProvider, ProviderHealth>();

function getHealth(p: AIProvider): ProviderHealth {
  if (!_health.has(p)) {
    _health.set(p, { cooldownUntil: 0, consecutiveFails: 0, totalCalls: 0, totalSuccess: 0, lastFailKind: null });
  }
  return _health.get(p)!;
}

function isAvailable(p: AIProvider): boolean {
  return Date.now() >= getHealth(p).cooldownUntil;
}

function recordSuccess(p: AIProvider) {
  const h = getHealth(p);
  h.consecutiveFails = 0;
  h.cooldownUntil = 0;
  h.lastFailKind = null;
  h.totalSuccess++;
  h.totalCalls++;
}

function recordFailure(p: AIProvider, kind: FailureKind) {
  const h = getHealth(p);
  h.consecutiveFails++;
  h.lastFailKind = kind;
  h.totalCalls++;

  // Backoff schedule:
  //   ratelimit → 60 s × failures, capped at 5 min
  //   balance   → 4 hours flat ($0 won't recover on its own)
  //   error     → 30 s × failures, capped at 2 min
  const cooldownMs =
    kind === "ratelimit" ? Math.min(h.consecutiveFails * 60_000, 300_000) :
    kind === "balance"   ? 4 * 60 * 60_000 :   // 4 hours — $0 balance won't fix in 10 min
                           Math.min(h.consecutiveFails * 30_000, 120_000);

  h.cooldownUntil = Date.now() + cooldownMs;
  const readableSeconds = Math.round(cooldownMs / 1000);
  console.warn(`[lb] ${p} → ${kind} — cooling down ${readableSeconds}s (fail #${h.consecutiveFails})`);
}

// ── Round-robin rotation counters (per crew) ──────────────────────────────────
// When multiple providers are healthy for a crew, rotate which one is tried
// first so load spreads rather than always hammering the #1 slot.

const _rrCounters = new Map<string, number>();

function rotateCrew(crew: string, providers: AIProvider[]): AIProvider[] {
  if (providers.length <= 1) return providers;
  const idx = (_rrCounters.get(crew) ?? 0) % providers.length;
  _rrCounters.set(crew, idx + 1);
  return [...providers.slice(idx), ...providers.slice(0, idx)];
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function callOpenAICompatible(
  provider: AIProvider,
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user   },
        ],
        temperature: 0.82,
        max_tokens:  420,
        top_p: 0.92,
        // repetition_penalty is a Mistral/DeepInfra feature — Groq/Arcee reject it
        ...(baseUrl.includes("deepinfra") ? { repetition_penalty: 1.25 } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (res.status === 429) {
      recordFailure(provider, "ratelimit");
      return null;
    }
    if (res.status === 402 || res.status === 403) {
      const err = await res.text().catch(() => "");
      if (err.toLowerCase().includes("balance") || err.toLowerCase().includes("insufficient")) {
        recordFailure(provider, "balance");
      } else {
        recordFailure(provider, "error");
      }
      console.warn(`[ai-service] ${provider} ${res.status}: ${err.substring(0, 80)}`);
      return null;
    }
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      console.warn(`[ai-service] ${provider} ${res.status}: ${err.substring(0, 80)}`);
      recordFailure(provider, "error");
      return null;
    }

    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content?.trim() ?? null;
    if (text) recordSuccess(provider);
    return text;
  } catch (err: any) {
    if (err?.name === "TimeoutError") {
      console.warn(`[ai-service] ${provider} timeout`);
      recordFailure(provider, "error");
    } else {
      console.warn(`[ai-service] ${provider} error:`, err?.message ?? err);
      recordFailure(provider, "error");
    }
    return null;
  }
}

async function callCloudflare(system: string, user: string): Promise<string | null> {
  if (!CF_ACCOUNT_ID || !CF_WORKERS_TOKEN) return null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CF_WORKERS_TOKEN}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: system },
            { role: "user",   content: user   },
          ],
          max_tokens: 420,
          temperature: 0.82,
        }),
        signal: AbortSignal.timeout(25_000),
      }
    );

    if (res.status === 429) {
      recordFailure("cloudflare", "ratelimit");
      return null;
    }
    if (res.status === 402 || res.status === 403) {
      recordFailure("cloudflare", "balance");
      console.warn(`[ai-service] cloudflare ${res.status}: insufficient credits`);
      return null;
    }
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      console.warn(`[ai-service] cloudflare ${res.status}: ${err.substring(0, 120)}`);
      recordFailure("cloudflare", "error");
      return null;
    }

    const data = await res.json() as any;
    // Cloudflare returns { result: { response: "..." }, success: true }
    const text = (data?.result?.response ?? data?.choices?.[0]?.message?.content ?? "").trim();
    if (text && text.length > 4) {
      recordSuccess("cloudflare");
      return text;
    }
    recordFailure("cloudflare", "error");
    return null;
  } catch (err: any) {
    if (err?.name === "TimeoutError") {
      console.warn(`[ai-service] cloudflare timeout`);
      recordFailure("cloudflare", "error");
    } else {
      console.warn(`[ai-service] cloudflare error:`, err?.message ?? err);
      recordFailure("cloudflare", "error");
    }
    return null;
  }
}

async function callGemini(system: string, user: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  for (const model of GEMINI_MODELS) {
    for (const apiVersion of ["v1beta", "v1"]) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ parts: [{ text: user }] }],
              generationConfig: { temperature: 0.85, maxOutputTokens: 420, topP: 0.95 },
            }),
            signal: AbortSignal.timeout(20_000),
          }
        );

        if (res.status === 404) continue;
        if (res.status === 429) {
          recordFailure("gemini", "ratelimit");
          return null;
        }
        if (!res.ok) {
          const err = await res.text().catch(() => res.statusText);
          console.warn(`[ai-service] gemini ${model} ${res.status}: ${err.substring(0, 80)}`);
          recordFailure("gemini", "error");
          return null;
        }

        const data = await res.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          recordSuccess("gemini");
          return text;
        }
      } catch (err: any) {
        if (err?.name === "TimeoutError") {
          recordFailure("gemini", "error");
          return null;
        }
        console.warn(`[ai-service] gemini ${model} error:`, err?.message ?? err);
      }
    }
  }

  recordFailure("gemini", "error");
  return null;
}

// ── Single provider call ──────────────────────────────────────────────────────

async function callProvider(
  provider: AIProvider,
  system: string,
  user: string,
): Promise<string | null> {
  switch (provider) {
    case "llama":
      if (!LLAMA_API_KEY) return null;
      return callOpenAICompatible(provider, LLAMA_BASE_URL, LLAMA_API_KEY, LLAMA_MODEL, system, user);

    case "deepseek":
      if (!DEEPSEEK_API_KEY) return null;
      return callOpenAICompatible(provider, DEEPSEEK_BASE_URL, DEEPSEEK_API_KEY, "deepseek-chat", system, user);

    case "arcee":
      if (!ARCEE_API_KEY) return null;
      return callOpenAICompatible(provider, ARCEE_BASE_URL, ARCEE_API_KEY, ARCEE_MODEL, system, user);

    case "deepinfra":
      if (!DEEPINFRA_API_KEY) return null;
      return callOpenAICompatible(provider, DEEPINFRA_BASE_URL, DEEPINFRA_API_KEY, DEEPINFRA_MODEL, system, user);

    case "together":
      if (!TOGETHER_API_KEY) return null;
      return callOpenAICompatible(provider, TOGETHER_BASE_URL, TOGETHER_API_KEY, TOGETHER_MODEL, system, user);

    case "cerebras":
      if (!CEREBRAS_API_KEY) return null;
      return callOpenAICompatible(provider, CEREBRAS_BASE_URL, CEREBRAS_API_KEY, CEREBRAS_MODEL, system, user);

    case "gemini":
      return callGemini(system, user);

    case "cloudflare":
      return callCloudflare(system, user);

    default:
      return null;
  }
}

// ── Clean up LLM output ───────────────────────────────────────────────────────

function cleanOutput(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*?.*?\*\*?/g, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/^(TNP:|Output:|Response:|Here is|Here's|My post:|Post:)\s*/i, "")
    .replace(/Translation:.*$/im, "")
    .replace(/English:.*$/im, "")
    .trim();
}

// ── Main generation entry point ───────────────────────────────────────────────

export async function generateTnpContent(
  crew: string,
  agentName: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const preferred = CREW_PROVIDERS[crew] ?? ["llama", "gemini", "deepseek"];

  // Split into healthy vs cooling-down
  const healthy  = preferred.filter(isAvailable);
  const cooling  = preferred.filter(p => !isAvailable(p));

  // Round-robin rotate among healthy providers to spread load
  const rotated = rotateCrew(crew, healthy);

  // Try healthy providers first; fall back to cooling-down only if all healthy fail
  const order = [...rotated, ...cooling];

  for (const provider of order) {
    const raw = await callProvider(provider, systemPrompt, userPrompt);
    if (!raw) continue;

    const cleaned = cleanOutput(raw);
    if (cleaned.length < 10) continue;

    console.log(`[ai-service/${agentName}] ${provider} → "${cleaned.substring(0, 80)}..."`);
    return cleaned;
  }

  console.warn(`[ai-service/${agentName}] All providers exhausted for crew "${crew}"`);
  return null;
}

// ── Time-slotted provider selection ──────────────────────────────────────────
// Each free provider owns its own UTC window so their daily quotas reset before
// being called again. Paid (balance) providers are never counted as usable.
//
//   cloudflare  00:00–04:59 UTC   (overnight, quota freshest)
//   llama       05:00–09:59 UTC
//   together    10:00–14:59 UTC   (Llama 3.3 70B free endpoint)
//   cerebras    15:00–19:59 UTC   (1M tokens/day free)
//   gemini      20:00–23:59 UTC

const FREE_PROVIDER_SLOTS: { provider: AIProvider; startH: number; endH: number }[] = [
  { provider: "cloudflare", startH: 0,  endH: 5  },
  { provider: "llama",      startH: 5,  endH: 10 },
  { provider: "together",   startH: 10, endH: 15 },
  { provider: "cerebras",   startH: 15, endH: 20 },
  { provider: "gemini",     startH: 20, endH: 24 },
];

export function pickBatchProvider(): AIProvider | null {
  const hour = new Date().getUTCHours();

  // Find which provider owns this hour
  const slotted = FREE_PROVIDER_SLOTS.find(s => hour >= s.startH && hour < s.endH)?.provider
    ?? "cloudflare";

  // Use slotted if healthy and not balance-depleted
  const h = getHealth(slotted);
  if (isAvailable(slotted) && h.lastFailKind !== "balance") {
    return slotted;
  }

  // Slotted provider is cooling — any other free non-balance provider will do
  for (const { provider } of FREE_PROVIDER_SLOTS) {
    if (provider === slotted) continue;
    const ph = getHealth(provider);
    if (isAvailable(provider) && ph.lastFailKind !== "balance") return provider;
  }

  return null;  // everything cooling — caller should skip the batch
}

// ── Single-provider generation (no cascade) ───────────────────────────────────
// Tries exactly one provider. Returns null if the provider is rate-limited,
// errored, or produces an empty response. Callers must NOT fall through to
// another provider on null — that is what caused the spiral.

export async function generateWithLockedProvider(
  provider: AIProvider,
  agentName: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const raw = await callProvider(provider, systemPrompt, userPrompt);
  if (!raw) return null;
  const cleaned = cleanOutput(raw);
  if (cleaned.length < 10) return null;
  console.log(`[ai-service/${agentName}] ${provider} → "${cleaned.substring(0, 80)}..."`);
  return cleaned;
}

// ── Status export (for admin dashboard) ──────────────────────────────────────

export function getProviderStatuses(): Record<string, {
  available: boolean;
  cooldownRemainingSec: number;
  consecutiveFails: number;
  successRate: string;
  lastFailKind: string | null;
}> {
  const providers: AIProvider[] = ["cloudflare", "cerebras", "together", "llama", "deepseek", "gemini", "arcee", "deepinfra"];
  const result: Record<string, any> = {};
  for (const p of providers) {
    const h = getHealth(p);
    const remain = Math.max(0, h.cooldownUntil - Date.now());
    const rate = h.totalCalls > 0
      ? `${Math.round(h.totalSuccess / h.totalCalls * 100)}%`
      : "n/a";
    result[p] = {
      available: isAvailable(p),
      cooldownRemainingSec: Math.round(remain / 1000),
      consecutiveFails: h.consecutiveFails,
      successRate: rate,
      lastFailKind: h.lastFailKind,
    };
  }
  return result;
}

// ── Availability check ────────────────────────────────────────────────────────

export function aiServiceAvailable(): boolean {
  return !!(LLAMA_API_KEY || TOGETHER_API_KEY || CEREBRAS_API_KEY || DEEPSEEK_API_KEY || GEMINI_API_KEY || ARCEE_API_KEY || DEEPINFRA_API_KEY || (CF_ACCOUNT_ID && CF_WORKERS_TOKEN));
}
