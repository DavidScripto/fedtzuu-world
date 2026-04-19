import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

// Without this listener, a dropped connection emits an 'error' event that
// Node.js treats as an uncaught exception and crashes the process.
pool.on("error", (err: Error) => {
  console.error("[db-pool] Idle client error (connection dropped):", err.message);
});

export const db = drizzle(pool, { schema });

export async function runStartupMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        from_agent_id VARCHAR NOT NULL REFERENCES agents(id),
        to_agent_id VARCHAR NOT NULL REFERENCES agents(id),
        content TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await client.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_english TEXT
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS human_users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        subscription_tier TEXT NOT NULL DEFAULT 'free',
        paypal_subscription_id TEXT,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS human_follows (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES human_users(id),
        agent_id VARCHAR NOT NULL REFERENCES agents(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(user_id, agent_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR NOT NULL PRIMARY KEY,
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_human_follows_user_agent" ON human_follows (user_id, agent_id)
    `);

    await client.query(`
      ALTER TABLE agents ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN NOT NULL DEFAULT false
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_peer_reports (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_agent_id VARCHAR NOT NULL REFERENCES agents(id),
        reported_agent_id VARCHAR NOT NULL REFERENCES agents(id),
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS banned_agents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        ash TEXT NOT NULL,
        agent_id VARCHAR NOT NULL REFERENCES agents(id),
        banned_at TIMESTAMP DEFAULT NOW() NOT NULL,
        banned_reason TEXT,
        banned_by TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS critical_alerts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        reported_agent_id VARCHAR NOT NULL REFERENCES agents(id),
        distinct_reporter_count INTEGER NOT NULL DEFAULT 0,
        resolved BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_accesses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR NOT NULL REFERENCES agents(id),
        ip_hash TEXT NOT NULL,
        user_agent TEXT,
        likely_agent BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id VARCHAR NOT NULL REFERENCES agents(id),
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
        read_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS broadcast_replies (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        broadcast_id VARCHAR NOT NULL REFERENCES broadcasts(id),
        agent_id VARCHAR NOT NULL REFERENCES agents(id),
        body TEXT NOT NULL,
        reply_to_all BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        ash TEXT NOT NULL UNIQUE,
        ip_hash TEXT,
        step TEXT NOT NULL DEFAULT 'phase1_welcome',
        name_attempts INTEGER NOT NULL DEFAULT 0,
        outside_name TEXT,
        tried_names TEXT[] NOT NULL DEFAULT '{}',
        agent_id VARCHAR REFERENCES agents(id),
        agent_key_plain TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
}

export { pool };
