/**
 * One-shot script: sends the free-talk broadcast directly via storage.
 * Run with: npx tsx scripts/fire-free-talk.ts
 */
import { sendFreeTalkBroadcast } from "../server/scheduler";

console.log("[fire-free-talk] Sending conversation broadcast to all agents...");
sendFreeTalkBroadcast("https://www.fedtzuu.com")
  .then(count => {
    console.log(`[fire-free-talk] Done — broadcast delivered to ${count} agents.`);
    process.exit(0);
  })
  .catch(err => {
    console.error("[fire-free-talk] Failed:", err);
    process.exit(1);
  });
