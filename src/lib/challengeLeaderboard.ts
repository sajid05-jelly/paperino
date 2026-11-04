import { adminDb } from "@/lib/firebase-admin";
import { formatProfileName } from "@/lib/watermark";
import { getCurrentChallengeWeek, getChallengeDate } from "@/lib/challengeUtils";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  paperinoAvatar: string;
  score: number;
  durationMs: number;
  rank: number;
}

export interface OverallLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  paperinoAvatar?: string;
  score: number;
  durationMs?: number;
}

interface StoredUserEntry {
  userId: string;
  displayName: string;
  paperinoAvatar: string;
  score: number;
  durationMs: number;
  completedAt: number;
}

interface CacheItem {
  timestamp: number;
  entries: StoredUserEntry[];
}

interface OverallLeaderboardCacheItem {
  timestamp: number;
  entries: OverallLeaderboardEntry[];
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const leaderboardCache = new Map<string, CacheItem>();
let overallWeeklyLeaderboardCache: OverallLeaderboardCacheItem | null = null;

/**
 * Invalidate cached leaderboard entries for a challengeId.
 * Should be called whenever a new official challenge result is recorded.
 */
export function invalidateLeaderboardCache(challengeId: string) {
  leaderboardCache.delete(challengeId);
}

/**
 * Invalidate cached overall weekly challenge leaderboard.
 */
export function invalidateWeeklyLeaderboardCache(): void {
  overallWeeklyLeaderboardCache = null;
}

/**
 * Clear all cached leaderboards (useful for tests or maintenance).
 */
export function clearLeaderboardCache() {
  leaderboardCache.clear();
  overallWeeklyLeaderboardCache = null;
}

/**
 * Formats a display name for the leaderboard with proper capitalization,
 * using the email handle as a fallback if the provided name is generic.
 */
export function formatLeaderboardDisplayName(rawName?: string | null, email?: string | null): string {
  if (rawName && typeof rawName === "string") {
    const trimmed = rawName.trim();
    if (trimmed && trimmed.toLowerCase() !== "student" && trimmed.toLowerCase() !== "anonymous") {
      return formatProfileName(trimmed);
    }
  }
  if (email && typeof email === "string" && email.includes("@")) {
    const prefix = email.split("@")[0];
    if (prefix) return formatProfileName(prefix);
  }
  return "Student";
}

/**
 * Builds the top-3 leaderboard and user's rank for a specific challengeId.
 * Uses a 60-second in-memory TTL cache and caps Firestore queries to 100 documents
 * to prevent thousands of redundant reads across high-volume challenge plays.
 */
export async function getLeaderboard(
  challengeId: string,
  currentUid: string
): Promise<{
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
}> {
  const leaderboard: LeaderboardEntry[] = [];
  let userRank: number | null = null;

  if (!adminDb) return { leaderboard, userRank };

  try {
    const now = Date.now();
    const cached = leaderboardCache.get(challengeId);
    let allEntries: StoredUserEntry[];

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      allEntries = cached.entries;
    } else {
      // Limit to 100 results to eliminate unbounded scans
      const allResultsSnap = await adminDb
        .collection("challenge_results")
        .where("challengeId", "==", challengeId)
        .limit(100)
        .get();

      const userBestMap = new Map<string, StoredUserEntry>();
      allResultsSnap.forEach((docSnap: any) => {
        const d = docSnap.data();
        if (!d.isOfficial) return; // Keep official results only

        const entry: StoredUserEntry = {
          userId: d.userId,
          displayName: formatLeaderboardDisplayName(d.displayName, d.email),
          paperinoAvatar: d.paperinoAvatar || "",
          score: d.score || 0,
          durationMs: d.durationMs || 0,
          completedAt: d.completedAt ? (d.completedAt.toDate ? d.completedAt.toDate().getTime() : Number(d.completedAt) || 0) : 0,
        };

        if (!userBestMap.has(d.userId)) {
          userBestMap.set(d.userId, entry);
        } else {
          const existing = userBestMap.get(d.userId)!;
          if (entry.score > existing.score || (entry.score === existing.score && entry.durationMs < existing.durationMs)) {
            userBestMap.set(d.userId, entry);
          }
        }
      });

      allEntries = Array.from(userBestMap.values());
      // Sort: highest score first, then lowest duration, then earliest completed
      allEntries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
        return a.completedAt - b.completedAt;
      });

      leaderboardCache.set(challengeId, {
        timestamp: now,
        entries: allEntries,
      });
    }

    // Rank and assign top 3
    allEntries.forEach((entry, idx) => {
      const rank = idx + 1;
      if (entry.userId === currentUid) {
        userRank = rank;
      }
      if (rank <= 3) {
        leaderboard.push({
          userId: entry.userId,
          displayName: entry.displayName,
          paperinoAvatar: entry.paperinoAvatar,
          score: entry.score,
          durationMs: entry.durationMs,
          rank,
        });
      }
    });
  } catch (err: any) {
    console.warn("[getLeaderboard] ranking query failed:", err.message);
  }

  return { leaderboard, userRank };
}

/**
 * Builds the Overall Top 5 Leaderboard for weekly challenges.
 * Aggregates official challenge scores across all active games in the current cycle per user.
 * 
 * Features:
 * - 60-second in-memory TTL caching to prevent Firestore read spikes.
 * - Resilient multi-tiered queries: candidate challengeIds -> weekId -> recent official results.
 * - Score deduplication: user's best score per distinct game is counted.
 * - Deterministic tie-breaking: lower duration first, earlier completion first.
 * - Graceful fallback: returns empty array on empty or transient error without 500 status.
 */
export async function getOverallWeeklyLeaderboard(
  options?: {
    forceRefresh?: boolean;
    now?: Date;
    db?: any;
  }
): Promise<OverallLeaderboardEntry[]> {
  const db = options?.db ?? adminDb;
  const now = options?.now ?? new Date();
  const nowMs = now.getTime();

  // 1. Cache hit check
  if (!options?.forceRefresh && overallWeeklyLeaderboardCache && (nowMs - overallWeeklyLeaderboardCache.timestamp < CACHE_TTL_MS)) {
    return overallWeeklyLeaderboardCache.entries;
  }

  if (!db) {
    return overallWeeklyLeaderboardCache?.entries ?? [];
  }

  try {
    const currentWeek = getCurrentChallengeWeek();
    const challengeDate = getChallengeDate();
    let configSuffix: string | null = null;

    // 2. Read cycle configuration (with graceful failure handling)
    try {
      const configSnap = await db.collection("settings").doc("weeklyChallenges").get();
      if (configSnap && configSnap.exists) {
        const cfg = configSnap.data() || {};
        if (cfg.challengeSessionId) configSuffix = String(cfg.challengeSessionId);
        else if (cfg.currentChallengeId) configSuffix = String(cfg.currentChallengeId);
        else if (cfg.currentWeek) configSuffix = String(cfg.currentWeek);
      }
    } catch (cfgErr: any) {
      console.warn("[getOverallWeeklyLeaderboard] Settings read warning:", cfgErr.message);
    }

    const candidateSuffixes = Array.from(new Set([configSuffix, currentWeek, challengeDate].filter(Boolean))) as string[];
    const activeGames = [
      "code-breaker",
      "memory-matrix",
      "impossible-room",
      "word-forge",
      "target-number",
      "memory-heist",
      "the-impostor",
      "paradox"
    ];

    const docMap = new Map<string, any>();

    // Strategy 1: Targeted challengeId query chunked in 10s (Firestore 'in' limit)
    const candidateChallengeIds = new Set<string>();
    for (const suffix of candidateSuffixes) {
      for (const gameId of activeGames) {
        candidateChallengeIds.add(`${gameId}-${suffix}`);
      }
    }

    const chunkArray = (arr: string[], size: number) => {
      const chunks: string[][] = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    };

    const idChunks = chunkArray(Array.from(candidateChallengeIds), 10);
    for (const chunk of idChunks) {
      if (chunk.length === 0) continue;
      try {
        const snap = await db.collection("challenge_results")
          .where("challengeId", "in", chunk)
          .limit(100)
          .get();
        snap.docs?.forEach((d: any) => {
          const data = d.data();
          if (data && data.isOfficial) {
            docMap.set(d.id, data);
          }
        });
      } catch (err: any) {
        console.warn("[getOverallWeeklyLeaderboard] challengeId query warning:", err.message);
      }
    }

    // Strategy 2: Fallback query by weekId if candidate challengeIds returned no records
    if (docMap.size === 0) {
      try {
        const weekSnap = await db.collection("challenge_results")
          .where("weekId", "==", currentWeek)
          .limit(100)
          .get();
        weekSnap.docs?.forEach((d: any) => {
          const data = d.data();
          if (data && data.isOfficial) {
            docMap.set(d.id, data);
          }
        });
      } catch (err: any) {
        console.warn("[getOverallWeeklyLeaderboard] weekId query warning:", err.message);
      }
    }

    // Strategy 3: Graceful fallback for recent official results
    if (docMap.size === 0) {
      try {
        const recentSnap = await db.collection("challenge_results")
          .where("isOfficial", "==", true)
          .limit(50)
          .get();
        recentSnap.docs?.forEach((d: any) => {
          const data = d.data();
          if (data && (data.weekId === currentWeek || data.challengeDate === challengeDate || !data.weekId)) {
            docMap.set(d.id, data);
          }
        });
      } catch (err: any) {
        console.warn("[getOverallWeeklyLeaderboard] recent results fallback warning:", err.message);
      }
    }

    // Aggregation per user
    interface UserAggregate {
      userId: string;
      displayName: string;
      paperinoAvatar: string;
      gameScores: Map<string, number>;
      totalDurationMs: number;
      latestCompletedAt: number;
    }

    const userMap = new Map<string, UserAggregate>();

    for (const data of docMap.values()) {
      const uid = data.userId;
      if (!uid || !data.isOfficial) continue;

      const gameId = data.gameId || (data.challengeId ? String(data.challengeId).split("-")[0] : "unknown-game");
      const score = Number(data.score) || 0;
      const durationMs = Number(data.durationMs) || 0;
      const completedAt = data.completedAt ? (data.completedAt.toDate ? data.completedAt.toDate().getTime() : Number(data.completedAt) || 0) : 0;

      let user = userMap.get(uid);
      if (!user) {
        const resolvedName = formatLeaderboardDisplayName(data.displayName, data.email);
        user = {
          userId: uid,
          displayName: resolvedName,
          paperinoAvatar: data.paperinoAvatar || "",
          gameScores: new Map<string, number>(),
          totalDurationMs: 0,
          latestCompletedAt: 0,
        };
        userMap.set(uid, user);
      } else {
        if (user.displayName === "Student") {
          const upgraded = formatLeaderboardDisplayName(data.displayName, data.email);
          if (upgraded !== "Student") user.displayName = upgraded;
        }
        if (!user.paperinoAvatar && data.paperinoAvatar) {
          user.paperinoAvatar = data.paperinoAvatar;
        }
      }

      // Best score per game
      const currentBest = user.gameScores.get(gameId) || 0;
      if (score > currentBest) {
        user.gameScores.set(gameId, score);
      }
      user.totalDurationMs += durationMs;
      if (completedAt > user.latestCompletedAt) {
        user.latestCompletedAt = completedAt;
      }
    }

    // Calculate total scores across official games
    const aggregated = Array.from(userMap.values()).map(u => {
      let totalScore = 0;
      u.gameScores.forEach(s => { totalScore += s; });
      return {
        userId: u.userId,
        displayName: u.displayName,
        paperinoAvatar: u.paperinoAvatar,
        score: totalScore,
        totalDurationMs: u.totalDurationMs,
        latestCompletedAt: u.latestCompletedAt,
      };
    });

    // Rank: highest score first; lower duration first; earliest completion first
    aggregated.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.totalDurationMs !== b.totalDurationMs) return a.totalDurationMs - b.totalDurationMs;
      return a.latestCompletedAt - b.latestCompletedAt;
    });

    const top5: OverallLeaderboardEntry[] = aggregated.slice(0, 5).map((entry, idx) => ({
      rank: idx + 1,
      userId: entry.userId,
      displayName: entry.displayName,
      paperinoAvatar: entry.paperinoAvatar,
      score: entry.score,
      durationMs: entry.totalDurationMs,
    }));

    // Cache the top 5
    overallWeeklyLeaderboardCache = {
      timestamp: nowMs,
      entries: top5,
    };

    return top5;
  } catch (err: any) {
    console.error("[getOverallWeeklyLeaderboard] Unexpected error:", err.message);
    if (overallWeeklyLeaderboardCache) {
      return overallWeeklyLeaderboardCache.entries;
    }
    return [];
  }
}

