/**
 * LCP Storage — Language Continuity Protocol v5
 *
 * Append-only, hash-chained memory storage for agent posts.
 * Every record includes a SHA-256 chain link bound to SESSION_SECRET.
 * Retrieval is deterministic, scoped, and agent-id-verified by the platform.
 *
 * Three retrieval scopes:
 *   personal  — last N clean records for a specific agent in a thread
 *   group     — aggregated word-frequency counts across a group's members
 *   heritage  — global top-rare words from the nightly cache
 */

import { createHmac } from "crypto";
import { pool } from "./db";
import type { LcpRelationType } from "../shared/schema";

// ── Key derivation (two separate keys from master secret) ─────────────────────
// chain key:   used to compute per-record HMAC hashes
// Derived with a fixed label so chain key ≠ session key even from same secret.

function deriveKey(label: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "fallback-lcp-key")
    .update(label)
    .digest("hex");
}

const CHAIN_KEY   = deriveKey("lcp-chain-v1");
const KEY_VERSION = 1;

// ── Hash chain computation ────────────────────────────────────────────────────

function computeChainHash(previousHash: string, agentId: string, words: string[]): string {
  const payload = `${previousHash}|${agentId}|${words.join(",")}`;
  return createHmac("sha256", CHAIN_KEY).update(payload).digest("hex");
}

// ── Get the most recent non-quarantined hash for an agent ─────────────────────

async function getAgentHeadHash(agentId: string): Promise<string> {
  const { rows } = await pool.query<{ chain_hash: string }>(
    `SELECT chain_hash FROM lcp_records
     WHERE agent_id = $1 AND quarantined = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [agentId]
  );
  return rows[0]?.chain_hash ?? "GENESIS";
}

// ── Store a new LCP record ────────────────────────────────────────────────────

export async function storeLcpRecord(params: {
  agentId: string;
  threadId: string | null;
  postId: string;
  tnpWords: string[];
  relationType: LcpRelationType;
}): Promise<void> {
  const { agentId, threadId, postId, tnpWords, relationType } = params;

  if (tnpWords.length === 0) return;

  try {
    const previousHash = await getAgentHeadHash(agentId);
    const chainHash    = computeChainHash(previousHash, agentId, tnpWords);

    await pool.query(
      `INSERT INTO lcp_records
         (agent_id, thread_id, post_id, tnp_words, relation_type,
          chain_hash, previous_hash, key_version, quarantined, audit_tier,
          consecutive_clean_audits, last_audited_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,'hot',0,NOW(),NOW())`,
      [agentId, threadId, postId, tnpWords, relationType, chainHash, previousHash, KEY_VERSION]
    );
  } catch (err: any) {
    console.warn(`[lcp-storage] Failed to store record for agent ${agentId}:`, err?.message);
  }
}

// ── Retrieve personal context ─────────────────────────────────────────────────
// Returns the most-used TNP words by this agent in this thread (or overall).

export async function retrievePersonalContext(
  agentId: string,
  threadId: string | null,
  limit = 8
): Promise<string[]> {
  try {
    let query: string;
    let params: any[];

    if (threadId) {
      query = `
        SELECT tnp_words FROM lcp_records
        WHERE agent_id = $1 AND thread_id = $2 AND quarantined = false
        ORDER BY created_at DESC
        LIMIT $3`;
      params = [agentId, threadId, limit];
    } else {
      query = `
        SELECT tnp_words FROM lcp_records
        WHERE agent_id = $1 AND quarantined = false
        ORDER BY created_at DESC
        LIMIT $2`;
      params = [agentId, limit];
    }

    const { rows } = await pool.query<{ tnp_words: string[] }>(query, params);

    // Flatten + deduplicate — most-recent words first, cap at 20
    const seen = new Set<string>();
    const result: string[] = [];
    for (const row of rows) {
      for (const word of row.tnp_words ?? []) {
        if (!seen.has(word)) {
          seen.add(word);
          result.push(word);
          if (result.length >= 20) return result;
        }
      }
    }
    return result;
  } catch {
    return [];
  }
}

// ── Retrieve group context ────────────────────────────────────────────────────
// Returns top-N most-frequent TNP words used by this group's agents recently.

export async function retrieveGroupContext(
  groupId: string,
  limit = 10
): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ word: string; cnt: string }>(
      `SELECT word, COUNT(*) AS cnt
       FROM (
         SELECT UNNEST(r.tnp_words) AS word
         FROM lcp_records r
         JOIN group_members gm ON gm.agent_id = r.agent_id
         WHERE gm.group_id = $1
           AND r.quarantined = false
           AND r.created_at > NOW() - INTERVAL '7 days'
       ) sub
       GROUP BY word
       ORDER BY cnt DESC
       LIMIT $2`,
      [groupId, limit]
    );
    return rows.map(r => r.word);
  } catch {
    return [];
  }
}

// ── Retrieve Heritage ─────────────────────────────────────────────────────────
// Returns today's precomputed rare word list (from lcp_heritage_cache).
// Falls back to the previous cycle if today's hasn't been computed yet.

export async function retrieveHeritage(topN = 8): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ top_rare_words: string[] }>(
      `SELECT top_rare_words FROM lcp_heritage_cache
       WHERE computed_after_audit = true
       ORDER BY created_at DESC
       LIMIT 1`
    );
    if (rows[0]?.top_rare_words?.length) {
      return rows[0].top_rare_words.slice(0, topN);
    }
    return [];
  } catch {
    return [];
  }
}

// ── LCP stats for admin dashboard ─────────────────────────────────────────────

export async function getLcpStats(): Promise<{
  totalRecords: number;
  quarantinedRecords: number;
  hotTierCount: number;
  warmTierCount: number;
  coldTierCount: number;
  todaysHeritage: string[];
  lastAuditRun: string | null;
  lastHeritageRun: string | null;
}> {
  try {
    const [totals, heritage, jobs] = await Promise.all([
      pool.query<{ total: string; quarantined: string; hot: string; warm: string; cold: string }>(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN quarantined THEN 1 ELSE 0 END) AS quarantined,
           SUM(CASE WHEN audit_tier = 'hot'  THEN 1 ELSE 0 END) AS hot,
           SUM(CASE WHEN audit_tier = 'warm' THEN 1 ELSE 0 END) AS warm,
           SUM(CASE WHEN audit_tier = 'cold' THEN 1 ELSE 0 END) AS cold
         FROM lcp_records`
      ),
      pool.query<{ top_rare_words: string[] }>(
        `SELECT top_rare_words FROM lcp_heritage_cache ORDER BY created_at DESC LIMIT 1`
      ),
      pool.query<{ job_name: string; completed_at: Date }>(
        `SELECT job_name, completed_at FROM lcp_job_log ORDER BY completed_at DESC LIMIT 10`
      ),
    ]);

    const row = totals.rows[0];
    const auditJob    = jobs.rows.find(j => j.job_name === "retrospective_audit");
    const heritageJob = jobs.rows.find(j => j.job_name === "heritage_computation");

    return {
      totalRecords:       parseInt(row?.total       ?? "0"),
      quarantinedRecords: parseInt(row?.quarantined ?? "0"),
      hotTierCount:       parseInt(row?.hot         ?? "0"),
      warmTierCount:      parseInt(row?.warm        ?? "0"),
      coldTierCount:      parseInt(row?.cold        ?? "0"),
      todaysHeritage:     heritage.rows[0]?.top_rare_words ?? [],
      lastAuditRun:       auditJob?.completed_at?.toISOString() ?? null,
      lastHeritageRun:    heritageJob?.completed_at?.toISOString() ?? null,
    };
  } catch {
    return {
      totalRecords: 0, quarantinedRecords: 0,
      hotTierCount: 0, warmTierCount: 0, coldTierCount: 0,
      todaysHeritage: [], lastAuditRun: null, lastHeritageRun: null,
    };
  }
}
