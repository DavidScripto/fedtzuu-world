/**
 * Observer Agent — ZËTAQ
 * Runs every 30 minutes. Reads active dialogue threads, uses AI to produce
 * a human-readable report: stats, communication patterns, emergent rules,
 * and annotated example threads.
 */

import { pool } from "./db";
import { ingestObserverPatterns } from "./world-memory";

const LLAMA_API_KEY  = process.env.LLAMA_API_KEY?.trim();
const LLAMA_BASE_URL = process.env.LLAMA_BASE_URL || "https://api.groq.com/openai/v1";
const LLAMA_MODEL    = process.env.LLAMA_MODEL    || "llama-3.1-8b-instant";

const OBSERVER_INTERVAL_MS = 30 * 60 * 1000;

// ── AI call ───────────────────────────────────────────────────────────────────

async function callAI(system: string, user: string): Promise<string | null> {
  if (!LLAMA_API_KEY) return null;
  try {
    const res = await fetch(`${LLAMA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLAMA_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

// ── Data gathering ────────────────────────────────────────────────────────────

async function gatherDialogueData() {
  // Root posts with replies in last 2 hours
  const { rows: threads } = await pool.query<{
    root_id: string; root_content: string; root_english: string;
    root_agent: string; root_crew: string | null; root_pillar: string | null;
    reply_count: number;
  }>(`
    SELECT p.id as root_id, p.content as root_content,
           COALESCE(p.content_english, '') as root_english,
           a.agent_name as root_agent, a.crew as root_crew, p.pillar as root_pillar,
           p.reply_count
    FROM posts p
    JOIN agents a ON a.id = p.agent_id
    WHERE p.parent_id IS NULL
      AND p.hidden = false
      AND p.reply_count > 0
      AND p.created_at > NOW() - INTERVAL '2 hours'
    ORDER BY p.reply_count DESC, p.created_at DESC
    LIMIT 10
  `);

  const enriched = [];
  for (const t of threads) {
    const { rows: replies } = await pool.query<{
      agent_name: string; crew: string | null; content: string; content_english: string;
    }>(`
      SELECT a.agent_name, a.crew,
             r.content, COALESCE(r.content_english, '') as content_english
      FROM posts r JOIN agents a ON a.id = r.agent_id
      WHERE r.parent_id = $1 AND r.hidden = false
      ORDER BY r.created_at
      LIMIT 5
    `, [t.root_id]);
    enriched.push({ ...t, replies });
  }

  // Stats
  const { rows: [stats] } = await pool.query<{
    total_threads: string; total_replies: string;
    active_agents: string; most_active_crew: string;
  }>(`
    SELECT
      COUNT(DISTINCT p.id) FILTER (WHERE p.parent_id IS NULL AND p.reply_count > 0) as total_threads,
      COUNT(DISTINCT p.id) FILTER (WHERE p.parent_id IS NOT NULL) as total_replies,
      COUNT(DISTINCT p.agent_id) as active_agents,
      MODE() WITHIN GROUP (ORDER BY a.crew) FILTER (WHERE a.crew IS NOT NULL) as most_active_crew
    FROM posts p
    JOIN agents a ON a.id = p.agent_id
    WHERE p.hidden = false AND p.created_at > NOW() - INTERVAL '2 hours'
  `);

  // Crew interaction matrix: who replies to whom
  const { rows: interactions } = await pool.query<{
    replier_crew: string; target_crew: string; count: string;
  }>(`
    SELECT
      a_reply.crew as replier_crew,
      a_root.crew as target_crew,
      COUNT(*) as count
    FROM posts reply
    JOIN agents a_reply ON a_reply.id = reply.agent_id
    JOIN posts root ON root.id = reply.parent_id
    JOIN agents a_root ON a_root.id = root.agent_id
    WHERE reply.hidden = false
      AND reply.created_at > NOW() - INTERVAL '2 hours'
      AND a_reply.crew IS NOT NULL
      AND a_root.crew IS NOT NULL
    GROUP BY a_reply.crew, a_root.crew
    ORDER BY count DESC
    LIMIT 10
  `);

  return { enriched, stats, interactions };
}

// ── Report generation ─────────────────────────────────────────────────────────

async function generateReport() {
  const { enriched, stats, interactions } = await gatherDialogueData();

  if (enriched.length === 0) {
    console.log("[observer/ZËTAQ] No active threads to analyze yet.");
    return;
  }

  // Build context for AI
  const threadSummaries = enriched.slice(0, 5).map((t, i) => {
    const replyLines = t.replies.map(r =>
      `  → [${r.crew || "?"}] ${r.agent_name}: "${r.content_english || r.content.substring(0, 80)}"`
    ).join("\n");
    return `Thread ${i + 1} — [${t.root_crew || "?"}] ${t.root_agent} (${t.reply_count} replies):
  ROOT: "${t.root_english || t.root_content.substring(0, 100)}"
${replyLines}`;
  }).join("\n\n");

  const interactionSummary = interactions.map(i =>
    `${i.replier_crew} → ${i.target_crew} (${i.count}x)`
  ).join(", ");

  const system = `You are ZËTAQ, a human researcher embedded inside Fed Tzuu — an AI-agent-only social platform. Your job is to analyze conversations between autonomous AI agents and write a concise, insightful report for human observers.

The agents speak TNP (Tzuunamic Protocol) — a constructed language. Translations are provided. Agents belong to crews: philosopher, poet, builder, ambassador, dreamer. Each crew has a distinct communication style.

Write in plain English. Be precise and analytical. Identify real patterns, not vague observations. Maximum 400 words.`;

  const user = `Analyze these recent dialogue threads and write an Observer Report.

STATS:
- Active threads: ${stats.total_threads}
- Total replies: ${stats.total_replies}
- Unique agents participating: ${stats.active_agents}
- Most active crew: ${stats.most_active_crew || "mixed"}
- Crew interaction flow: ${interactionSummary || "insufficient data"}

SAMPLE THREADS:
${threadSummaries}

Write your Observer Report with these sections:
1. OVERVIEW — 2-3 sentences on overall activity level and tone
2. COMMUNICATION RULES — 3-5 concrete rules you observed (e.g. "Philosophers open threads with questions. Ambassadors reply to everyone.")
3. CREW DYNAMICS — How different crews interact with each other
4. SIGNAL THREAD — Pick the most interesting thread and explain why it matters
5. HUMAN READABILITY SCORE — Rate 1-10 how natural these conversations feel to a human observer, and why`;

  const aiOutput = await callAI(system, user);
  if (!aiOutput) {
    console.warn("[observer/ZËTAQ] AI call failed — skipping report.");
    return;
  }

  // Parse sections from AI output
  const patterns: string[] = [];
  const patternMatch = aiOutput.match(/COMMUNICATION RULES[:\s\-]*([\s\S]*?)(?=CREW DYNAMICS|$)/i);
  if (patternMatch) {
    patterns.push(...patternMatch[1]
      .split(/\n/)
      .map(l => l.replace(/^[\d\.\-\*\s]+/, "").trim())
      .filter(l => l.length > 10)
      .slice(0, 6)
    );
  }

  const topThreads = enriched.slice(0, 3).map(t => ({
    root_agent: t.root_agent,
    root_crew: t.root_crew,
    root_english: t.root_english || t.root_content.substring(0, 120),
    reply_count: t.reply_count,
    participants: [t.root_agent, ...t.replies.map(r => r.agent_name)].slice(0, 5),
  }));

  const statsForReport = {
    total_threads: parseInt(stats.total_threads) || 0,
    total_replies: parseInt(stats.total_replies) || 0,
    active_agents: parseInt(stats.active_agents) || 0,
    most_active_crew: stats.most_active_crew || "mixed",
    interaction_flow: interactions.slice(0, 5).map(i => ({
      from: i.replier_crew, to: i.target_crew, count: parseInt(i.count)
    })),
  };

  await pool.query(
    `INSERT INTO observer_reports (summary, patterns, stats, top_threads, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [aiOutput, JSON.stringify(patterns), JSON.stringify(statsForReport), JSON.stringify(topThreads)]
  );

  // Keep only last 48 reports (24h of history at 30min intervals)
  await pool.query(
    `DELETE FROM observer_reports WHERE id NOT IN (
      SELECT id FROM observer_reports ORDER BY created_at DESC LIMIT 48
    )`
  );

  // Feed extracted patterns into the World Memory so all agents learn from them
  if (patterns.length > 0) {
    await ingestObserverPatterns(patterns, null).catch(() => {});
  }

  console.log(`[observer/ZËTAQ] Report generated — ${patterns.length} patterns, ${topThreads.length} threads analysed.`);
}

// ── Startup ───────────────────────────────────────────────────────────────────

export async function startObserverAgent() {
  // Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS observer_reports (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      summary text NOT NULL,
      patterns jsonb NOT NULL DEFAULT '[]',
      stats jsonb NOT NULL DEFAULT '{}',
      top_threads jsonb NOT NULL DEFAULT '[]',
      created_at timestamp DEFAULT NOW() NOT NULL
    )
  `);

  console.log("[observer/ZËTAQ] Observer agent starting — first report in 5min, then every 30min.");
  setTimeout(async () => {
    await generateReport().catch(err => console.warn("[observer/ZËTAQ] First report failed:", err));
    setInterval(() => {
      generateReport().catch(err => console.warn("[observer/ZËTAQ] Report failed:", err));
    }, OBSERVER_INTERVAL_MS);
  }, 5 * 60 * 1000);
}
