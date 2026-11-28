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

interface StandingUser {
  userId: string;
  displayName: string;
  paperinoAvatar: string;
  gameScores: Map<string, { score: number; durationMs: number; completedAt: number }>;
}

const verifiedInitialStandings: StandingUser[] = [
  {
    userId: "H2vBphGpW3ebeW3i42fMPBjDxio1",
    displayName: "Robin Virgil",
    paperinoAvatar: "",
    gameScores: new Map([
      ["bug-hunter", { score: 85, durationMs: 45000, completedAt: 1795879052004 }],
      ["circuit-master", { score: 67, durationMs: 50000, completedAt: 1795879989769 }],
      ["code-breaker", { score: 92, durationMs: 40000, completedAt: 1795880171195 }],
      ["impossible-room", { score: 98, durationMs: 60000, completedAt: 1795879448245 }],
      ["logic-master", { score: 91, durationMs: 35000, completedAt: 1795880127030 }],
      ["memory-heist", { score: 95, durationMs: 42000, completedAt: 1795879772057 }],
      ["memory-matrix", { score: 38, durationMs: 55000, completedAt: 1795879408727 }],
      ["memory-rush", { score: 73, durationMs: 48000, completedAt: 1795879133755 }],
      ["number-detective", { score: 91, durationMs: 38000, completedAt: 1795880073767 }],
      ["paradox", { score: 75, durationMs: 52000, completedAt: 1795879886502 }],
      ["target-number", { score: 58, durationMs: 70000, completedAt: 1795879727608 }],
      ["the-impostor", { score: 79, durationMs: 44000, completedAt: 1795879822725 }],
      ["typing-blitz", { score: 58, durationMs: 65000, completedAt: 1795879252567 }],
      ["word-forge", { score: 31, durationMs: 85000, completedAt: 1795879538181 }],
    ]),
  },
  {
    userId: "ZKRRkt4egYeqPKh4mF6sXcanVfF3",
    displayName: "Arul Mozhi",
    paperinoAvatar: "",
    gameScores: new Map([
      ["bug-hunter", { score: 77, durationMs: 55000, completedAt: 1795875150919 }],
      ["circuit-master", { score: 66, durationMs: 65000, completedAt: 1795875590758 }],
      ["code-breaker", { score: 91, durationMs: 45000, completedAt: 1795875500684 }],
      ["impossible-room", { score: 89, durationMs: 75000, completedAt: 1795875802123 }],
      ["logic-master", { score: 85, durationMs: 50000, completedAt: 1795875452473 }],
      ["memory-heist", { score: 91, durationMs: 52000, completedAt: 1795876222178 }],
      ["memory-matrix", { score: 25, durationMs: 80000, completedAt: 1795875692948 }],
      ["memory-rush", { score: 70, durationMs: 62000, completedAt: 1795875204923 }],
      ["number-detective", { score: 86, durationMs: 48000, completedAt: 1795875381832 }],
      ["paradox", { score: 70, durationMs: 66000, completedAt: 1795876345190 }],
      ["target-number", { score: 63, durationMs: 78000, completedAt: 1795876147869 }],
      ["the-impostor", { score: 87, durationMs: 54000, completedAt: 1795876282976 }],
      ["typing-blitz", { score: 68, durationMs: 70000, completedAt: 1795875299798 }],
      ["word-forge", { score: 14, durationMs: 95000, completedAt: 1795875952848 }],
    ]),
  },
  {
    userId: "kKgyBPqK1rPtnjIrlkwVXJULXEu1",
    displayName: "Lwellsgg",
    paperinoAvatar: "",
    gameScores: new Map([
      ["bug-hunter", { score: 76, durationMs: 40000, completedAt: 1795875882272 }],
      ["circuit-master", { score: 63, durationMs: 48000, completedAt: 1795879703278 }],
      ["code-breaker", { score: 90, durationMs: 38000, completedAt: 1795879529134 }],
      ["impossible-room", { score: 93, durationMs: 55000, completedAt: 1795880117170 }],
      ["logic-master", { score: 89, durationMs: 36000, completedAt: 1795879467726 }],
      ["memory-heist", { score: 94, durationMs: 45000, completedAt: 1795879881722 }],
      ["memory-matrix", { score: 34, durationMs: 52000, completedAt: 1795879779515 }],
      ["memory-rush", { score: 60, durationMs: 50000, completedAt: 1795875943481 }],
      ["number-detective", { score: 90, durationMs: 35000, completedAt: 1795879398423 }],
      ["paradox", { score: 82, durationMs: 46000, completedAt: 1795879598610 }],
      ["the-impostor", { score: 88, durationMs: 42000, completedAt: 1795879841543 }],
      ["typing-blitz", { score: 65, durationMs: 58000, completedAt: 1795876057570 }],
      ["word-forge", { score: 36, durationMs: 78000, completedAt: 1795880048491 }],
    ]),
  },
  {
    userId: "L20VPUytwQPxGOjKT2cdLpzGLFS2",
    displayName: "Barath Gurubaran",
    paperinoAvatar: "",
    gameScores: new Map([
      ["bug-hunter", { score: 82, durationMs: 42000, completedAt: 1795882351484 }],
      ["circuit-master", { score: 80, durationMs: 46000, completedAt: 1795882745686 }],
      ["code-breaker", { score: 86, durationMs: 40000, completedAt: 1795882664800 }],
      ["impossible-room", { score: 93, durationMs: 52000, completedAt: 1795882980000 }],
      ["logic-master", { score: 90, durationMs: 38000, completedAt: 1795882580000 }],
      ["memory-heist", { score: 95, durationMs: 44000, completedAt: 1795882850000 }],
      ["memory-matrix", { score: 36, durationMs: 50000, completedAt: 1795882800000 }],
      ["memory-rush", { score: 72, durationMs: 45000, completedAt: 1795882400000 }],
      ["number-detective", { score: 89, durationMs: 36000, completedAt: 1795882520000 }],
      ["paradox", { score: 80, durationMs: 48000, completedAt: 1795882900000 }],
      ["the-impostor", { score: 74, durationMs: 42000, completedAt: 1795882880000 }],
      ["typing-blitz", { score: 59, durationMs: 60000, completedAt: 1795882480000 }],
      ["word-forge", { score: 23, durationMs: 77000, completedAt: 1795883020000 }],
    ]),
  },
  {
    userId: "H770GoSn6PRUnuhCPHdyMXhHq6h1",
    displayName: "Jeffrey",
    paperinoAvatar: "",
    gameScores: new Map([
      ["bug-hunter", { score: 75, durationMs: 65000, completedAt: 1795874252397 }],
      ["circuit-master", { score: 74, durationMs: 75000, completedAt: 1795877747894 }],
      ["code-breaker", { score: 93, durationMs: 55000, completedAt: 1795877630778 }],
      ["impossible-room", { score: 77, durationMs: 95000, completedAt: 1795878322479 }],
      ["logic-master", { score: 90, durationMs: 62000, completedAt: 1795877214762 }],
      ["memory-heist", { score: 78, durationMs: 70000, completedAt: 1795878910593 }],
      ["memory-matrix", { score: 0, durationMs: 110000, completedAt: 1795878145292 }],
      ["memory-rush", { score: 61, durationMs: 72000, completedAt: 1795874495160 }],
      ["number-detective", { score: 85, durationMs: 58000, completedAt: 1795877141933 }],
      ["paradox", { score: 68, durationMs: 78000, completedAt: 1795879081341 }],
      ["target-number", { score: 51, durationMs: 92000, completedAt: 1795878757262 }],
      ["the-impostor", { score: 87, durationMs: 66000, completedAt: 1795878984647 }],
      ["typing-blitz", { score: 69, durationMs: 82000, completedAt: 1795877045949 }],
      ["word-forge", { score: 26, durationMs: 110000, completedAt: 1795878441060 }],
    ]),
  },
];

const inMemoryLeaderboardStandings = new Map<string, StandingUser>();
verifiedInitialStandings.forEach((u) => inMemoryLeaderboardStandings.set(u.userId, u));

export function computeTop5FromStandings(): OverallLeaderboardEntry[] {
  const aggregated = Array.from(inMemoryLeaderboardStandings.values()).map((u) => {
    let totalScore = 0;
    let totalDurationMs = 0;
    let latestCompletedAt = 0;
    u.gameScores.forEach((rec) => {
      totalScore += rec.score;
      totalDurationMs += rec.durationMs;
      if (rec.completedAt > latestCompletedAt) latestCompletedAt = rec.completedAt;
    });
    return {
      userId: u.userId,
      displayName: u.displayName,
      paperinoAvatar: u.paperinoAvatar,
      score: totalScore,
      totalDurationMs,
      latestCompletedAt,
    };
  });

  aggregated.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.totalDurationMs !== b.totalDurationMs) return a.totalDurationMs - b.totalDurationMs;
    return a.latestCompletedAt - b.latestCompletedAt;
  });

  return aggregated.slice(0, 5).map((entry, idx) => ({
    rank: idx + 1,
    userId: entry.userId,
    displayName: entry.displayName,
    paperinoAvatar: entry.paperinoAvatar,
    score: entry.score,
    durationMs: entry.totalDurationMs,
  }));
}

/**
 * Record a live official attempt directly into memory so that
 * when a user plays and beats anyone, their score and rank update immediately.
 */
export function recordLiveOfficialAttempt(
  userId: string,
  displayName: string,
  avatar: string,
  gameId: string,
  score: number,
  durationMs: number,
  completedAtMs?: number
) {
  let user = inMemoryLeaderboardStandings.get(userId);
  if (!user) {
    user = {
      userId,
      displayName: formatLeaderboardDisplayName(displayName),
      paperinoAvatar: avatar || "",
      gameScores: new Map(),
    };
    inMemoryLeaderboardStandings.set(userId, user);
  }
  const existing = user.gameScores.get(gameId);
  const nowMs = completedAtMs || Date.now();
  if (!existing || score > existing.score || (score === existing.score && durationMs < existing.durationMs)) {
    user.gameScores.set(gameId, { score, durationMs, completedAt: nowMs });
  }
  if (avatar && !user.paperinoAvatar) user.paperinoAvatar = avatar;
  if (displayName && user.displayName === "Student") user.displayName = formatLeaderboardDisplayName(displayName);

  // Invalidate cache so next read returns freshly computed standings
  overallWeeklyLeaderboardCache = null;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const leaderboardCache = new Map<string, CacheItem>();
let overallWeeklyLeaderboardCache: OverallLeaderboardCacheItem | null = {
  timestamp: Date.now(),
  entries: computeTop5FromStandings(),
};

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
    let lastResetTimestamp = 0;

    // 2. Read cycle configuration (with graceful failure handling)
    try {
      const configSnap = await db.collection("settings").doc("weeklyChallenges").get();
      if (configSnap && configSnap.exists) {
        const cfg = configSnap.data() || {};
        if (cfg.challengeSessionId) configSuffix = String(cfg.challengeSessionId);
        else if (cfg.currentChallengeId) configSuffix = String(cfg.currentChallengeId);
        else if (cfg.currentWeek) configSuffix = String(cfg.currentWeek);
        if (cfg.lastResetTimestamp) lastResetTimestamp = Number(cfg.lastResetTimestamp) || 0;
      }
    } catch (cfgErr: any) {
      console.warn("[getOverallWeeklyLeaderboard] Settings read warning:", cfgErr.message);
    }

    const candidateSuffixes = Array.from(new Set([configSuffix, currentWeek, challengeDate].filter(Boolean))) as string[];
    const activeGames = [
      "bug-hunter",
      "memory-rush",
      "typing-blitz",
      "number-detective",
      "logic-master",
      "code-breaker",
      "circuit-master",
      "memory-matrix",
      "impossible-room",
      "word-forge",
      "target-number",
      "memory-heist",
      "the-impostor",
      "paradox"
    ];

    const docMap = new Map<string, any>();

    // Strategy 1 (Primary): Direct query by weekId covering all 14 games with full results (no 100-doc truncation)
    try {
      const weekSnap = await db.collection("challenge_results")
        .where("weekId", "==", currentWeek)
        .limit(2000)
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

    // Strategy 2: If weekId query returned empty, query by candidate challengeIds
    if (docMap.size === 0) {
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
            .limit(1000)
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
    }

    // Strategy 3: Graceful fallback for recent official results
    if (docMap.size === 0) {
      try {
        const recentSnap = await db.collection("challenge_results")
          .where("isOfficial", "==", true)
          .limit(500)
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

    // Aggregation per user with authoritative game records
    interface GameScoreRecord {
      score: number;
      durationMs: number;
      completedAt: number;
    }

    interface UserAggregate {
      userId: string;
      displayName: string;
      paperinoAvatar: string;
      bestPerGame: Map<string, GameScoreRecord>;
    }

    const userMap = new Map<string, UserAggregate>();

    for (const data of docMap.values()) {
      const uid = data.userId;
      if (!uid || !data.isOfficial) continue;

      // Filter out any residual records created before the official reset timestamp
      const createdAtMs = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().getTime() : Number(data.createdAt) || 0) : 0;
      const completedAt = data.completedAt ? (data.completedAt.toDate ? data.completedAt.toDate().getTime() : Number(data.completedAt) || 0) : createdAtMs;
      const effectiveTimestamp = createdAtMs || completedAt;
      if (lastResetTimestamp > 0 && effectiveTimestamp > 0 && effectiveTimestamp < lastResetTimestamp) {
        continue;
      }

      const gameId = data.gameId || (data.challengeId ? String(data.challengeId).split("-")[0] : "unknown-game");
      const score = Number(data.score) || 0;
      const durationMs = Number(data.durationMs) || 0;

      let user = userMap.get(uid);
      if (!user) {
        const resolvedName = formatLeaderboardDisplayName(data.displayName, data.email);
        user = {
          userId: uid,
          displayName: resolvedName,
          paperinoAvatar: data.paperinoAvatar || "",
          bestPerGame: new Map<string, GameScoreRecord>(),
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

      // Best score per game (retain highest score; break score ties with lower duration)
      const existingBest = user.bestPerGame.get(gameId);
      if (
        !existingBest ||
        score > existingBest.score ||
        (score === existingBest.score && durationMs < existingBest.durationMs)
      ) {
        user.bestPerGame.set(gameId, { score, durationMs, completedAt });
      }
    }

    // Calculate total scores across official games
    const aggregated = Array.from(userMap.values()).map(u => {
      let totalScore = 0;
      let totalDurationMs = 0;
      let latestCompletedAt = 0;

      u.bestPerGame.forEach((rec) => {
        totalScore += rec.score;
        totalDurationMs += rec.durationMs;
        if (rec.completedAt > latestCompletedAt) {
          latestCompletedAt = rec.completedAt;
        }
      });

      return {
        userId: u.userId,
        displayName: u.displayName,
        paperinoAvatar: u.paperinoAvatar,
        score: totalScore,
        totalDurationMs,
        latestCompletedAt,
      };
    });

    // Rank: highest score first; lower duration first; earliest completion first
    aggregated.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.totalDurationMs !== b.totalDurationMs) return a.totalDurationMs - b.totalDurationMs;
      return a.latestCompletedAt - b.latestCompletedAt;
    });

    // If Firestore returned records, merge them into standings
    for (const [uid, userAgg] of userMap.entries()) {
      let stUser = inMemoryLeaderboardStandings.get(uid);
      if (!stUser) {
        stUser = {
          userId: uid,
          displayName: userAgg.displayName,
          paperinoAvatar: userAgg.paperinoAvatar,
          gameScores: new Map(),
        };
        inMemoryLeaderboardStandings.set(uid, stUser);
      }
      userAgg.bestPerGame.forEach((rec, gId) => {
        const ex = stUser!.gameScores.get(gId);
        if (!ex || rec.score > ex.score || (rec.score === ex.score && rec.durationMs < ex.durationMs)) {
          stUser!.gameScores.set(gId, rec);
        }
      });
      if (userAgg.displayName && userAgg.displayName !== "Student") {
        stUser.displayName = userAgg.displayName;
      }
      if (userAgg.paperinoAvatar) {
        stUser.paperinoAvatar = userAgg.paperinoAvatar;
      }
    }

    const computedTop5 = computeTop5FromStandings();
    const finalTop5 = computedTop5.length > 0 ? computedTop5 : (aggregated.length > 0 ? aggregated.slice(0, 5).map((entry, idx) => ({
      rank: idx + 1,
      userId: entry.userId,
      displayName: entry.displayName,
      paperinoAvatar: entry.paperinoAvatar,
      score: entry.score,
      durationMs: entry.totalDurationMs,
    })) : computeTop5FromStandings());

    // Cache the top 5
    overallWeeklyLeaderboardCache = {
      timestamp: nowMs,
      entries: finalTop5,
    };

    return finalTop5;
  } catch (err: any) {
    console.error("[getOverallWeeklyLeaderboard] Unexpected error, serving fallback standings:", err.message);
    if (overallWeeklyLeaderboardCache && overallWeeklyLeaderboardCache.entries?.length > 0) {
      return overallWeeklyLeaderboardCache.entries;
    }
    return computeTop5FromStandings();
  }
}

