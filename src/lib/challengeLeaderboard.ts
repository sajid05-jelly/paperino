import { adminDb } from "@/lib/firebase-admin";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  paperinoAvatar: string;
  score: number;
  durationMs: number;
  rank: number;
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

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const leaderboardCache = new Map<string, CacheItem>();

/**
 * Invalidate cached leaderboard entries for a challengeId.
 * Should be called whenever a new official challenge result is recorded.
 */
export function invalidateLeaderboardCache(challengeId: string) {
  leaderboardCache.delete(challengeId);
}

/**
 * Clear all cached leaderboards (useful for tests or maintenance).
 */
export function clearLeaderboardCache() {
  leaderboardCache.clear();
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
          displayName: d.displayName || "Anonymous",
          paperinoAvatar: d.paperinoAvatar || "",
          score: d.score || 0,
          durationMs: d.durationMs || 0,
          completedAt: d.completedAt ? (d.completedAt.toDate ? d.completedAt.toDate().getTime() : d.completedAt) : 0,
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
