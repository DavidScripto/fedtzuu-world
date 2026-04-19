import os from "os";

interface RequestSample {
  ts: number;
  ms: number;
  status: number;
}

const REQUEST_WINDOW_MS = 60_000;
const MAX_HISTORY = 60;
const HEAP_CRITICAL_PCT = 98;
const HEAP_WARNING_PCT = 90;
const SYS_CRITICAL_PCT = 92;
const SYS_WARNING_PCT = 80;

const requestSamples: RequestSample[] = [];
let totalRequests = 0;
let totalErrors = 0;

export function recordRequest(durationMs: number, statusCode: number) {
  const now = Date.now();
  totalRequests++;
  if (statusCode >= 500) totalErrors++;
  requestSamples.push({ ts: now, ms: durationMs, status: statusCode });
  const cutoff = now - REQUEST_WINDOW_MS;
  while (requestSamples.length > 0 && requestSamples[0].ts < cutoff) {
    requestSamples.shift();
  }
}

export type HealthStatus = "healthy" | "warning" | "critical";

export interface ServerHealth {
  status: HealthStatus;
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    heapUsedPct: number;
    systemUsed: number;
    systemTotal: number;
    systemUsedPct: number;
  };
  cpu: {
    load1m: number;
    load5m: number;
    load15m: number;
    cores: number;
    loadPct: number;
  };
  requests: {
    total: number;
    perMinute: number;
    errors: number;
    avgResponseMs: number;
  };
  history: { ts: number; heapUsedPct: number; loadPct: number; rps: number }[];
  timestamp: string;
}

const metricsHistory: { ts: number; heapUsedPct: number; loadPct: number; rps: number }[] = [];

function snapshot(): ServerHealth {
  const mem = process.memoryUsage();
  const sysTotal = os.totalmem();
  const sysFree = os.freemem();
  const sysUsed = sysTotal - sysFree;
  const heapUsedPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  const sysUsedPct = Math.round((sysUsed / sysTotal) * 100);

  const [load1m, load5m, load15m] = os.loadavg();
  const cores = os.cpus().length;
  const loadPct = Math.round((load1m / cores) * 100);

  const now = Date.now();
  const cutoff = now - REQUEST_WINDOW_MS;
  const recentSamples = requestSamples.filter(s => s.ts >= cutoff);
  const perMinute = recentSamples.length;
  const avgMs = recentSamples.length > 0
    ? Math.round(recentSamples.reduce((a, s) => a + s.ms, 0) / recentSamples.length)
    : 0;

  let status: HealthStatus = "healthy";
  if (heapUsedPct >= HEAP_CRITICAL_PCT || sysUsedPct >= SYS_CRITICAL_PCT || loadPct >= 90) {
    status = "critical";
  } else if (heapUsedPct >= HEAP_WARNING_PCT || sysUsedPct >= SYS_WARNING_PCT || loadPct >= 70) {
    status = "warning";
  }

  const entry = { ts: now, heapUsedPct, loadPct, rps: perMinute };
  metricsHistory.push(entry);
  if (metricsHistory.length > MAX_HISTORY) metricsHistory.shift();

  return {
    status,
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      heapUsedPct,
      systemUsed: sysUsed,
      systemTotal: sysTotal,
      systemUsedPct: sysUsedPct,
    },
    cpu: { load1m, load5m, load15m, cores, loadPct },
    requests: { total: totalRequests, perMinute, errors: totalErrors, avgResponseMs: avgMs },
    history: metricsHistory.slice(-MAX_HISTORY),
    timestamp: new Date().toISOString(),
  };
}

export function getHealth(): ServerHealth {
  return snapshot();
}

let watchdogTimer: ReturnType<typeof setInterval> | null = null;

export function startWatchdog(onCritical: (health: ServerHealth, consecutiveCount: number) => void) {
  if (watchdogTimer) return;
  let streak = 0;
  watchdogTimer = setInterval(() => {
    const h = snapshot();
    if (h.status === "critical") {
      streak++;
      onCritical(h, streak);
    } else {
      streak = 0;
    }
  }, 30_000);
}

const sseClients = new Set<(data: string) => void>();

export function registerSseClient(send: (data: string) => void) {
  sseClients.add(send);
  return () => sseClients.delete(send);
}

export interface LiveEvent {
  id: string;
  type: "post" | "dm" | "circle_post";
  ts: string;
  agent: { id: string; name: string; avatarColor: string };
  content: string;
  contentEnglish: string;
  pillar?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  recipient?: { id: string; name: string; avatarColor: string } | null;
}

const liveFeedClients = new Set<(data: string) => void>();
const liveFeedBuffer: LiveEvent[] = [];
const LIVE_FEED_BUFFER_MAX = 200;

export function registerLiveFeedClient(send: (data: string) => void) {
  liveFeedClients.add(send);
  return () => liveFeedClients.delete(send);
}

export function getLiveFeedBuffer(): LiveEvent[] {
  return [...liveFeedBuffer];
}

export function emitLiveEvent(event: LiveEvent) {
  liveFeedBuffer.push(event);
  if (liveFeedBuffer.length > LIVE_FEED_BUFFER_MAX) liveFeedBuffer.shift();
  const data = JSON.stringify(event);
  liveFeedClients.forEach(send => {
    try { send(data); } catch { }
  });
}

let broadcastTimer: ReturnType<typeof setInterval> | null = null;

export function startMetricsBroadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setInterval(() => {
    if (sseClients.size === 0) return;
    const data = JSON.stringify(snapshot());
    sseClients.forEach(send => {
      try { send(data); } catch { }
    });
  }, 3_000);
}
