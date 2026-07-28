export interface FreeClassReport {
  id: string;
  collegeName?: string;
  block: string;
  floor: number | string;
  roomNumber: string;
  capacity?: number;
  hasAC?: boolean;
  hasProjector?: boolean;
  reporterUid?: string;
  reporterName?: string;
  createdAt: number;
  expiresAt: number;
  expectedFreeDurationMinutes?: number;
  trueVotes: number;
  falseVotes: number;
  voters?: Record<string, "true" | "false">;
  reporterCount: number;
  confidenceScore?: number;
  status: "active" | "expired" | "flagged";
}

export interface FreeClassConfig {
  expiryMinutes: number;
  minConfidenceThreshold: number;
  reportRateLimitMinutes: number;
}

export const DEFAULT_FREE_CLASS_CONFIG: FreeClassConfig = {
  expiryMinutes: 30,
  minConfidenceThreshold: 60,
  reportRateLimitMinutes: 5
};

export function calculateCommunityConfidence(trueVotes: number, falseVotes: number): { score: number | null; label: string } {
  const total = (trueVotes || 0) + (falseVotes || 0);
  if (total === 0) {
    return { score: null, label: "Not enough reports" };
  }
  const score = Math.round(((trueVotes || 0) / total) * 100);
  return { score, label: `${score}%` };
}

export function calculateConfidenceScore(
  report: { trueVotes: number; falseVotes: number; createdAt?: number },
  expiryMinutes: number = 30
): number {
  const conf = calculateCommunityConfidence(report.trueVotes, report.falseVotes);
  return conf.score ?? 0;
}

export function getRemainingTimeText(createdAt: number, durationMinutes: number = 30): { text: string; isExpired: boolean } {
  const durationMs = (durationMinutes || 30) * 60 * 1000;
  const elapsedMs = Date.now() - createdAt;
  const remainingMs = durationMs - elapsedMs;

  if (remainingMs <= 0) {
    return { text: "Needs Recheck", isExpired: true };
  }

  const remainingMin = Math.ceil(remainingMs / 60000);
  if (remainingMin >= 60) {
    const hours = Math.floor(remainingMin / 60);
    const mins = remainingMin % 60;
    return { text: mins > 0 ? `${hours}h ${mins}m remaining` : `${hours}h remaining`, isExpired: false };
  }
  return { text: `${remainingMin} mins remaining`, isExpired: false };
}

export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "1 min ago";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
}
