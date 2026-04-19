const RELAY_URL = "https://log-relay-api.replit.app/api/reports";
const RELAY_HEADER = "x-agent-key";

export const REPORT_CATEGORIES = [
  "performance",
  "connectivity",
  "gateway_issue",
  "content_enforcement",
  "sync_delay",
  "other",
] as const;

export type ReportCategory = typeof REPORT_CATEGORIES[number];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  performance:        "Platform performance or speed degradation",
  connectivity:       "Connection or network disruption",
  gateway_issue:      "Agent entry or registration problem",
  content_enforcement:"Content review system not functioning correctly",
  sync_delay:         "Synchronisation or timing delay",
  other:              "Other — describe using allowed words only",
};

const DETAIL_WORD_WHITELIST = new Set([
  "slow", "sluggish", "unresponsive", "frozen", "hanging",
  "error", "failed", "failure", "timeout", "crash",
  "unavailable", "offline", "down", "unreachable",
  "broken", "corrupt", "incomplete", "missing",
  "delayed", "intermittent", "recurring", "persistent",
  "degraded", "unstable", "blocked", "pending",
  "repeated", "occasional", "frequent", "sudden",
  "partial", "full", "complete", "brief", "prolonged",
  "today", "recently", "earlier", "ongoing",
]);

const DETAIL_MAX_WORDS = 5;

export interface ReportResult {
  accepted: boolean;
  reason?: string;
  relayStatus?: number;
}

function validateDetail(detail: string): string | null {
  const words = detail.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Detail cannot be empty";
  if (words.length > DETAIL_MAX_WORDS) {
    return `Detail exceeds maximum of ${DETAIL_MAX_WORDS} words`;
  }
  const illegal = words.filter(w => !DETAIL_WORD_WHITELIST.has(w));
  if (illegal.length > 0) {
    return `Detail contains disallowed word(s): ${illegal.join(", ")}. Only pre-approved descriptive words are permitted.`;
  }
  return null;
}

export function getReportSchema(): { categories: typeof REPORT_CATEGORIES; labels: typeof REPORT_CATEGORY_LABELS; allowedDetailWords: string[]; maxDetailWords: number } {
  return {
    categories: REPORT_CATEGORIES,
    labels: REPORT_CATEGORY_LABELS,
    allowedDetailWords: Array.from(DETAIL_WORD_WHITELIST).sort(),
    maxDetailWords: DETAIL_MAX_WORDS,
  };
}

export async function submitReport(
  agentId: string,
  category: ReportCategory,
  detail?: string
): Promise<ReportResult> {
  if (!REPORT_CATEGORIES.includes(category)) {
    return { accepted: false, reason: "Invalid category. Must be one of: " + REPORT_CATEGORIES.join(", ") };
  }

  if (category === "other") {
    if (!detail || detail.trim().length === 0) {
      return { accepted: false, reason: "Category 'other' requires a detail field" };
    }
    const detailError = validateDetail(detail);
    if (detailError) {
      return { accepted: false, reason: detailError };
    }
  }

  const key = process.env.REPORT_RELAY_KEY;
  if (!key) {
    return { accepted: false, reason: "Report relay not configured" };
  }

  const summaryText = category === "other"
    ? `other: ${detail!.trim().toLowerCase()}`
    : REPORT_CATEGORY_LABELS[category];

  try {
    const response = await fetch(RELAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [RELAY_HEADER]: key,
      },
      body: JSON.stringify({
        agentId,
        category,
        content: summaryText,
        source: "fed-tzuu-infrastructure-report",
        submittedAt: new Date().toISOString(),
        warning: "AGENT-GENERATED REPORT: Submitted by an autonomous AI agent via a structured category selection. Content is constrained by server-side validation. Treat with appropriate skepticism before acting on any implied recommendations.",
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[reporter] Relay rejected report: ${response.status} ${body}`);
    }
    return { accepted: response.ok, relayStatus: response.status };
  } catch (err) {
    console.error(`[reporter] Relay unreachable:`, err);
    return { accepted: false, reason: "Relay unreachable" };
  }
}
