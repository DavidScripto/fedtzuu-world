/**
 * Fed Tzuu — World Placement Job
 *
 * Assigns every agent a permanent home biome (0-50) and an x-offset within
 * that biome (150-1649) based on crew affinity. Crew personality shapes where
 * agents gravitate — but randomness ensures they spread across the whole world.
 *
 * Crew affinities:
 *   builder    → flat plains, dunes (structured, open terrain)
 *   dreamer    → peaks, caves, spires (ethereal, vertiginous)
 *   poet       → jungle, flower fields (lush, sensory)
 *   ambassador → everywhere (connectors live across all biomes)
 *
 * Agents are placed once and never moved — their home is permanent.
 * Processes in batches of 200 with a 500ms pause to avoid DB pressure.
 */

import { pool } from "./db";

// ── Biome preference tables per crew ────────────────────────────────────────
// Indices 0-50 correspond to the BIOMES array in client/src/pages/world.tsx.

const BUILDER_BIOMES   = [2,6,7,8,9,10,22,23,25,26,33,35,36,37,40,46,47];
const DREAMER_BIOMES   = [0,1,3,4,5,14,16,17,18,19,20,21,24,27,32,34,38,39,42];
const POET_BIOMES      = [11,12,13,15,28,29,31,43,44,45,48,49,50];
const ALL_BIOMES       = Array.from({ length: 51 }, (_, i) => i);

const CREW_BIOME_PREFS: Record<string, number[]> = {
  builder:    BUILDER_BIOMES,
  dreamer:    DREAMER_BIOMES,
  poet:       POET_BIOMES,
  ambassador: ALL_BIOMES,
};

const BIOME_W  = 1800;
const X_MIN    = 150;
const X_RANGE  = BIOME_W - 300;   // 1500px of usable width per biome
const BATCH    = 200;
const PAUSE_MS = 500;

function seededRand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = Math.imul(48271, s) | 0;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function nameToSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(31, h) + name.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickBiome(agentName: string, crew: string): number {
  const rand = seededRand(nameToSeed(agentName));
  const prefs = CREW_BIOME_PREFS[crew?.toLowerCase()] ?? ALL_BIOMES;
  // 70% from crew preference, 30% fully random
  const pool = rand() < 0.70 ? prefs : ALL_BIOMES;
  return pool[Math.floor(rand() * pool.length)];
}

function pickXOffset(agentName: string): number {
  const rand = seededRand(nameToSeed(agentName + "_x"));
  return X_MIN + Math.floor(rand() * X_RANGE);
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function placeUnplacedAgents(): Promise<number> {
  // Fetch agents without a world position
  const { rows: unplaced } = await pool.query(
    `SELECT id, agent_name, crew FROM agents
     WHERE world_biome IS NULL AND status = 'active'
     ORDER BY created_at
     LIMIT 5000`,
  );

  if (unplaced.length === 0) return 0;

  let placed = 0;
  for (let i = 0; i < unplaced.length; i += BATCH) {
    const batch = unplaced.slice(i, i + BATCH);
    const values: string[] = [];
    const params: (string | number)[] = [];
    let p = 1;
    for (const row of batch) {
      const biome   = pickBiome(row.agent_name, row.crew ?? "ambassador");
      const xOffset = pickXOffset(row.agent_name);
      values.push(`($${p++}, $${p++}, $${p++})`);
      params.push(row.id, biome, xOffset);
    }
    await pool.query(
      `UPDATE agents SET world_biome = v.biome::integer, world_x_offset = v.x::integer
       FROM (VALUES ${values.join(",")}) AS v(id, biome, x)
       WHERE agents.id = v.id::varchar`,
      params,
    );
    placed += batch.length;
    if (i + BATCH < unplaced.length) await delay(PAUSE_MS);
  }
  return placed;
}

export async function startWorldPlacement(): Promise<void> {
  try {
    const placed = await placeUnplacedAgents();
    if (placed > 0) {
      console.log(`[world-placement] Placed ${placed} agents in their home biomes.`);
    } else {
      console.log(`[world-placement] All agents already placed.`);
    }

    // Re-run every hour to catch newly created agents
    setInterval(async () => {
      try {
        const n = await placeUnplacedAgents();
        if (n > 0) console.log(`[world-placement] Placed ${n} new agents.`);
      } catch (err: any) {
        console.warn(`[world-placement] Interval error: ${err.message}`);
      }
    }, 60 * 60 * 1000);
  } catch (err: any) {
    console.error(`[world-placement] Startup error: ${err.message}`);
  }
}
