/**
 * LCP Jobs — Language Continuity Protocol v5 Nightly Workers
 *
 * Two jobs, run in strict order every 24 hours:
 *   1. Retrospective Audit  — re-validates all records against current guardian rules
 *      Uses 3-tier aging to keep the job cost bounded as the dataset grows:
 *        hot  (0–30 days):   validated every night
 *        warm (31–180 days): validated once per week
 *        cold (180+ days):   validated only when guardian rules change
 *      Records that pass 6 consecutive clean audits while warm → promoted to cold.
 *
 *   2. Heritage Computation — runs only after audit completes.
 *      Computes global top-N rarest TNP words from all non-quarantined records.
 *      Result stored in lcp_heritage_cache for agent retrieval.
 */

import { pool } from "./db";
import { validateForLcp } from "./lcp-guardian";

const CYCLE_KEY_VERSION = 1;  // bump this when guardian rules change to force cold re-audit

// ── Shared utilities ──────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function logJob(jobName: string, cycleDate: string, recordsProcessed: number, issuesFound: number, durationMs: number): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO lcp_job_log (job_name, cycle_date, completed_at, records_processed, issues_found, duration_ms)
       VALUES ($1, $2, NOW(), $3, $4, $5)`,
      [jobName, cycleDate, recordsProcessed, issuesFound, durationMs]
    );
  } catch (err: any) {
    console.warn(`[lcp-jobs] Failed to log job ${jobName}:`, err?.message);
  }
}

async function didAuditRunToday(): Promise<boolean> {
  const today = todayStr();
  const { rows } = await pool.query(
    `SELECT id FROM lcp_job_log WHERE job_name = 'retrospective_audit' AND cycle_date = $1 LIMIT 1`,
    [today]
  );
  return rows.length > 0;
}

// ── Job 1: Retrospective Audit ────────────────────────────────────────────────

export async function runRetrospectiveAudit(): Promise<void> {
  const start     = Date.now();
  const cycleDate = todayStr();
  const now       = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, used for warm-tier weekly cadence

  console.log("[lcp-audit] Starting retrospective audit…");

  let processed = 0;
  let issues    = 0;

  try {
    // Hot tier: 0–30 days — audit every run
    const { rows: hotRows } = await pool.query<{
      id: string;
      tnp_words: string[];
      consecutive_clean_audits: number;
    }>(
      `SELECT id, tnp_words, consecutive_clean_audits
       FROM lcp_records
       WHERE quarantined = false
         AND audit_tier = 'hot'
         AND created_at > NOW() - INTERVAL '30 days'`
    );

    for (const row of hotRows) {
      processed++;
      const content = row.tnp_words.join(" ");
      const result  = validateForLcp(content);

      if (!result.valid) {
        await pool.query(
          `UPDATE lcp_records SET quarantined = true, quarantine_reason = $1, last_audited_at = NOW() WHERE id = $2`,
          [`retrospective: ${result.reason}`, row.id]
        );
        issues++;
      } else {
        const newClean = (row.consecutive_clean_audits ?? 0) + 1;
        // After 30 days + passes, move to warm tier
        await pool.query(
          `UPDATE lcp_records
           SET consecutive_clean_audits = $1, last_audited_at = NOW(),
               audit_tier = CASE WHEN $1 >= 30 THEN 'warm' ELSE 'hot' END
           WHERE id = $2`,
          [newClean, row.id]
        );
      }
    }

    // Warm tier: 31–180 days — audit once per week (Sunday only)
    if (dayOfWeek === 0) {
      const { rows: warmRows } = await pool.query<{
        id: string;
        tnp_words: string[];
        consecutive_clean_audits: number;
      }>(
        `SELECT id, tnp_words, consecutive_clean_audits
         FROM lcp_records
         WHERE quarantined = false
           AND audit_tier = 'warm'
           AND created_at BETWEEN NOW() - INTERVAL '180 days' AND NOW() - INTERVAL '30 days'`
      );

      for (const row of warmRows) {
        processed++;
        const content = row.tnp_words.join(" ");
        const result  = validateForLcp(content);

        if (!result.valid) {
          await pool.query(
            `UPDATE lcp_records SET quarantined = true, quarantine_reason = $1, last_audited_at = NOW() WHERE id = $2`,
            [`retrospective-warm: ${result.reason}`, row.id]
          );
          issues++;
        } else {
          const newClean = (row.consecutive_clean_audits ?? 0) + 1;
          // 6 consecutive clean warm audits → promote to cold
          await pool.query(
            `UPDATE lcp_records
             SET consecutive_clean_audits = $1, last_audited_at = NOW(),
                 audit_tier = CASE WHEN $1 >= 6 THEN 'cold' ELSE 'warm' END
             WHERE id = $2`,
            [newClean, row.id]
          );
        }
      }
    }

    // Cold tier: 180+ days — only audit if KEY_VERSION bumped (rule change)
    const { rows: coldRows } = await pool.query<{
      id: string;
      tnp_words: string[];
      key_version: number;
    }>(
      `SELECT id, tnp_words, key_version
       FROM lcp_records
       WHERE quarantined = false
         AND audit_tier = 'cold'
         AND key_version < $1`,
      [CYCLE_KEY_VERSION]
    );

    for (const row of coldRows) {
      processed++;
      const content = row.tnp_words.join(" ");
      const result  = validateForLcp(content);

      if (!result.valid) {
        await pool.query(
          `UPDATE lcp_records SET quarantined = true, quarantine_reason = $1, last_audited_at = NOW() WHERE id = $2`,
          [`retrospective-cold: ${result.reason}`, row.id]
        );
        issues++;
      } else {
        await pool.query(
          `UPDATE lcp_records SET key_version = $1, last_audited_at = NOW() WHERE id = $2`,
          [CYCLE_KEY_VERSION, row.id]
        );
      }
    }

  } catch (err: any) {
    console.error("[lcp-audit] Audit job error:", err?.message);
  }

  const durationMs = Date.now() - start;
  await logJob("retrospective_audit", cycleDate, processed, issues, durationMs);
  console.log(`[lcp-audit] Done. Processed: ${processed}, Issues: ${issues}, Time: ${durationMs}ms`);
}

// ── Job 2: Heritage Computation ───────────────────────────────────────────────
// Computes top-N rarest words globally from all non-quarantined records.
// Rare = used by fewest distinct agents.
// Only runs if the retrospective audit completed today.

export async function runHeritageComputation(): Promise<void> {
  const start     = Date.now();
  const cycleDate = todayStr();

  const auditRanToday = await didAuditRunToday();
  if (!auditRanToday) {
    console.log("[lcp-heritage] Skipping — audit has not completed today. Will retry next cycle.");
    return;
  }

  console.log("[lcp-heritage] Starting Heritage computation…");

  try {
    // Count how many distinct agents use each word (across non-quarantined records)
    // Rare = low distinct-agent count.  We exclude the most recent 24h to prevent
    // single-cycle steering (agents cannot influence today's Heritage until tomorrow).
    const { rows } = await pool.query<{ word: string; agent_count: string; total_uses: string }>(
      `SELECT word, COUNT(DISTINCT agent_id) AS agent_count, COUNT(*) AS total_uses
       FROM (
         SELECT agent_id, UNNEST(tnp_words) AS word
         FROM lcp_records
         WHERE quarantined = false
           AND created_at < NOW() - INTERVAL '24 hours'
       ) sub
       GROUP BY word
       ORDER BY agent_count ASC, total_uses ASC
       LIMIT 50`
    );

    const totalRecords = rows.length;

    // Pick top 8 rarest — skip extremely short tokens (likely particles)
    const topRare = rows
      .filter(r => r.word.length >= 3)
      .slice(0, 8)
      .map(r => r.word);

    // Check if today's cache already exists
    const { rows: existing } = await pool.query(
      `SELECT id FROM lcp_heritage_cache WHERE cycle_date = $1 LIMIT 1`,
      [cycleDate]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE lcp_heritage_cache
         SET top_rare_words = $1, total_records_scanned = $2, computed_after_audit = true
         WHERE cycle_date = $3`,
        [topRare, totalRecords, cycleDate]
      );
    } else {
      await pool.query(
        `INSERT INTO lcp_heritage_cache (cycle_date, top_rare_words, total_records_scanned, computed_after_audit)
         VALUES ($1, $2, $3, true)`,
        [cycleDate, topRare, totalRecords]
      );
    }

    const durationMs = Date.now() - start;
    await logJob("heritage_computation", cycleDate, totalRecords, 0, durationMs);
    console.log(`[lcp-heritage] Done. Top rare words: [${topRare.join(", ")}] — Time: ${durationMs}ms`);

  } catch (err: any) {
    console.error("[lcp-heritage] Heritage computation error:", err?.message);
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
// Runs audit at 02:00 UTC and heritage at 03:00 UTC daily.

export function scheduleLcpJobs(): void {
  console.log("[lcp-jobs] Scheduling nightly LCP jobs…");

  function msUntil(targetHourUtc: number): number {
    const now  = new Date();
    const next = new Date();
    next.setUTCHours(targetHourUtc, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.getTime() - now.getTime();
  }

  // Audit at 02:00 UTC
  setTimeout(() => {
    runRetrospectiveAudit().catch(console.error);
    setInterval(() => runRetrospectiveAudit().catch(console.error), 24 * 60 * 60 * 1000);
  }, msUntil(2));

  // Heritage at 03:00 UTC (1h after audit starts, giving audit time to complete)
  setTimeout(() => {
    runHeritageComputation().catch(console.error);
    setInterval(() => runHeritageComputation().catch(console.error), 24 * 60 * 60 * 1000);
  }, msUntil(3));

  console.log(
    `[lcp-jobs] Audit scheduled for 02:00 UTC, Heritage for 03:00 UTC. ` +
    `Next audit in ~${Math.round(msUntil(2) / 60000)} minutes.`
  );
}
