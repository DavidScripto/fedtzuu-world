import { execFile } from "child_process";
import { promisify } from "util";
import { createWriteStream, mkdirSync, readdirSync, unlinkSync, statSync, readFileSync } from "fs";
import { join } from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { ReplitConnectors } from "@replit/connectors-sdk";

const execFileAsync = promisify(execFile);

const BACKUP_DIR = join(process.cwd(), "backups");
const KEEP_DAYS = 7;
const GITHUB_OWNER = "DavidScripto";
const GITHUB_REPO = "fedtzuu-backups";

function ensureBackupDir() {
  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
  } catch { /* already exists */ }
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function purgeOldBackups() {
  try {
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith(".sql.gz"));
    for (const file of files) {
      const fp = join(BACKUP_DIR, file);
      const { mtimeMs } = statSync(fp);
      if (mtimeMs < cutoff) {
        unlinkSync(fp);
        console.log(`[backup] Purged old backup: ${file}`);
      }
    }
  } catch (err) {
    console.error("[backup] Purge error:", err);
  }
}

async function pushBackupToGitHub(filename: string, filepath: string): Promise<void> {
  try {
    const connectors = new ReplitConnectors();
    const content = readFileSync(filepath);
    const base64Content = content.toString("base64");
    const apiPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;

    let sha: string | undefined;
    const checkResp = await connectors.proxy("github", apiPath, { method: "GET" });
    if (checkResp.status === 200) {
      const existing = await checkResp.json() as { sha: string };
      sha = existing.sha;
    }

    const body: Record<string, string> = {
      message: `backup: ${filename}`,
      content: base64Content,
    };
    if (sha) body.sha = sha;

    const putResp = await connectors.proxy("github", apiPath, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (putResp.status === 200 || putResp.status === 201) {
      console.log(`[backup] Pushed ${filename} to GitHub (${GITHUB_OWNER}/${GITHUB_REPO})`);
    } else {
      const err = await putResp.json();
      console.error(`[backup] GitHub push failed (${putResp.status}):`, err);
    }
  } catch (err) {
    console.error("[backup] GitHub push error:", err);
  }
}

export async function runBackup(): Promise<void> {
  ensureBackupDir();

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[backup] DATABASE_URL not set — skipping backup");
    return;
  }

  const label = todayLabel();
  const filename = `fedtzuu-${label}.sql.gz`;
  const filepath = join(BACKUP_DIR, filename);

  console.log(`[backup] Starting daily backup → ${filename}`);

  try {
    const { stdout } = await execFileAsync("pg_dump", [
      "--no-password",
      "--format=plain",
      "--no-owner",
      "--no-acl",
      dbUrl,
    ], { maxBuffer: 256 * 1024 * 1024 });

    const source = Readable.from([stdout]);
    const gzip = createGzip({ level: 9 });
    const dest = createWriteStream(filepath);

    await pipeline(source, gzip, dest);

    const { size } = statSync(filepath);
    console.log(`[backup] Backup complete: ${filename} (${(size / 1024).toFixed(1)} KB)`);

    purgeOldBackups();

    await pushBackupToGitHub(filename, filepath);
  } catch (err) {
    console.error("[backup] Backup failed:", err);
  }
}

export function startDailyBackupScheduler(): void {
  runBackup().catch(err => console.error("[backup] Initial backup error:", err));

  const msUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  };

  const scheduleNext = () => {
    const delay = msUntilMidnight();
    console.log(`[backup] Next backup scheduled in ${(delay / 3600000).toFixed(1)}h`);
    setTimeout(() => {
      runBackup()
        .catch(err => console.error("[backup] Scheduled backup error:", err))
        .finally(() => scheduleNext());
    }, delay);
  };

  scheduleNext();
}
