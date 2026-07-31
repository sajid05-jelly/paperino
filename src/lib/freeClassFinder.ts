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
  createdAtMs?: number;
  expiresAt: number;
  expiresAtMs?: number;
  expectedFreeDurationMinutes?: number;
  trueVotes: number;
  falseVotes: number;
  createdDate?: string;
  createdDay?: string;
  createdTime?: string;
  timezone?: string;
  voters?: Record<string, "true" | "false">;
  reporterCount: number;
  confidenceScore?: number;
  status: "active" | "expired" | "flagged";
}

export function formatTimestampDetails(report: Partial<FreeClassReport>): { day: string; date: string; time: string } {
  if (report.createdDay && report.createdDate && report.createdTime) {
    return {
      day: report.createdDay,
      date: report.createdDate,
      time: report.createdTime
    };
  }

  const ts = report.createdAtMs || report.createdAt || Date.now();
  const dateObj = new Date(ts);
  const istOptions: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };

  const date = dateObj.toLocaleDateString("en-GB", {
    ...istOptions,
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const day = dateObj.toLocaleDateString("en-US", {
    ...istOptions,
    weekday: "long"
  });

  const time = dateObj.toLocaleTimeString("en-US", {
    ...istOptions,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }) + " IST";

  return { day, date, time };
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
  const t = trueVotes || 0;
  const f = falseVotes || 0;
  const total = t + f;
  if (total === 0) {
    return { score: null, label: "New Report" };
  }
  const score = Math.round((t / total) * 100);
  return { score, label: `${score}%` };
}

export function calculateConfidenceScore(
  report: { trueVotes: number; falseVotes: number; createdAt?: number },
  expiryMinutes: number = 30
): number {
  const conf = calculateCommunityConfidence(report.trueVotes || 0, report.falseVotes || 0);
  return conf.score ?? 0;
}

export function getRemainingTimeText(createdAt: number, durationMinutes: number = 30, expiresAtMs?: number): { text: string; isExpired: boolean; remainingMins: number } {
  const now = Date.now();
  const targetExpiry = expiresAtMs || (createdAt + (durationMinutes || 30) * 60 * 1000);
  const remainingMs = targetExpiry - now;

  if (remainingMs <= 0) {
    return { text: "Expired", isExpired: true, remainingMins: 0 };
  }

  const remainingMin = Math.ceil(remainingMs / 60000);
  if (remainingMin >= 60) {
    const hours = Math.floor(remainingMin / 60);
    const mins = remainingMin % 60;
    return { 
      text: mins > 0 ? `⏳ ${hours}h ${mins}m remaining` : `⏳ ${hours}h remaining`, 
      isExpired: false,
      remainingMins: remainingMin
    };
  }
  return { text: `⏳ ${remainingMin} mins remaining`, isExpired: false, remainingMins: remainingMin };
}

export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "1 min ago";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
}
