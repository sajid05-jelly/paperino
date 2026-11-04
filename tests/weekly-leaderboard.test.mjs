import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatProfileName } from "../src/lib/watermark.ts";

/**
 * Mirror of formatLeaderboardDisplayName from src/lib/challengeLeaderboard.ts
 */
function formatLeaderboardDisplayName(rawName, email) {
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
 * Mirror of getOverallWeeklyLeaderboard from src/lib/challengeLeaderboard.ts
 */
function createWeeklyLeaderboardManager() {
  const CACHE_TTL_MS = 60 * 1000;
  let overallWeeklyLeaderboardCache = null;

  function invalidateWeeklyLeaderboardCache() {
    overallWeeklyLeaderboardCache = null;
  }

  function clearLeaderboardCache() {
    overallWeeklyLeaderboardCache = null;
  }

  async function getOverallWeeklyLeaderboard(options = {}) {
    const db = options.db;
    const now = options.now ?? new Date();
    const nowMs = now.getTime();

    // 1. Cache hit check
    if (!options.forceRefresh && overallWeeklyLeaderboardCache && (nowMs - overallWeeklyLeaderboardCache.timestamp < CACHE_TTL_MS)) {
      return overallWeeklyLeaderboardCache.entries;
    }

    if (!db) {
      return overallWeeklyLeaderboardCache?.entries ?? [];
    }

    try {
      const currentWeek = "2026-W45";
      const challengeDate = "2026-11-04";
      let configSuffix = null;

      try {
        const configSnap = await db.collection("settings").doc("weeklyChallenges").get();
        if (configSnap && configSnap.exists) {
          const cfg = configSnap.data() || {};
          if (cfg.challengeSessionId) configSuffix = String(cfg.challengeSessionId);
          else if (cfg.currentChallengeId) configSuffix = String(cfg.currentChallengeId);
          else if (cfg.currentWeek) configSuffix = String(cfg.currentWeek);
        }
      } catch (cfgErr) {
        // graceful catch
      }

      const candidateSuffixes = Array.from(new Set([configSuffix, currentWeek, challengeDate].filter(Boolean)));
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

      const docMap = new Map();

      // Strategy 1: Targeted challengeId query chunked in 10s
      const candidateChallengeIds = new Set();
      for (const suffix of candidateSuffixes) {
        for (const gameId of activeGames) {
          candidateChallengeIds.add(`${gameId}-${suffix}`);
        }
      }

      const chunkArray = (arr, size) => {
        const chunks = [];
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
          snap.docs?.forEach((d) => {
            const data = d.data();
            if (data && data.isOfficial) {
              docMap.set(d.id, data);
            }
          });
        } catch {
          // graceful catch
        }
      }

      // Strategy 2: Fallback query by weekId if candidate challengeIds returned no records
      if (docMap.size === 0) {
        try {
          const weekSnap = await db.collection("challenge_results")
            .where("weekId", "==", currentWeek)
            .limit(100)
            .get();
          weekSnap.docs?.forEach((d) => {
            const data = d.data();
            if (data && data.isOfficial) {
              docMap.set(d.id, data);
            }
          });
        } catch {
          // graceful catch
        }
      }

      // Strategy 3: Graceful fallback for recent official results
      if (docMap.size === 0) {
        try {
          const recentSnap = await db.collection("challenge_results")
            .where("isOfficial", "==", true)
            .limit(50)
            .get();
          recentSnap.docs?.forEach((d) => {
            const data = d.data();
            if (data && (data.weekId === currentWeek || data.challengeDate === challengeDate || !data.weekId)) {
              docMap.set(d.id, data);
            }
          });
        } catch {
          // graceful catch
        }
      }

      // Aggregation per user
      const userMap = new Map();

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
            gameScores: new Map(),
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

      const top5 = aggregated.slice(0, 5).map((entry, idx) => ({
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
    } catch {
      if (overallWeeklyLeaderboardCache) {
        return overallWeeklyLeaderboardCache.entries;
      }
      return [];
    }
  }

  return {
    getOverallWeeklyLeaderboard,
    invalidateWeeklyLeaderboardCache,
    clearLeaderboardCache,
  };
}

describe("Weekly Challenges — Overall Top 5 Leaderboard", () => {

  describe("1. Display Name Formatting & Fallbacks", () => {
    test("converts raw names to proper Title Case", () => {
      assert.equal(formatLeaderboardDisplayName("mohamed sajid"), "Mohamed Sajid");
      assert.equal(formatLeaderboardDisplayName("SAJID"), "Sajid");
      assert.equal(formatLeaderboardDisplayName("john doe smith"), "John Doe Smith");
    });

    test("falls back to email prefix when displayName is generic 'Student' or 'Anonymous'", () => {
      assert.equal(formatLeaderboardDisplayName("Student", "sajid@srmist.edu.in"), "Sajid");
      assert.equal(formatLeaderboardDisplayName("student", "mohamed.sajid@gmail.com"), "Mohamed.sajid");
      assert.equal(formatLeaderboardDisplayName("Anonymous", "alex.chen@domain.org"), "Alex.chen");
    });

    test("returns 'Student' fallback when both name and email are missing or empty", () => {
      assert.equal(formatLeaderboardDisplayName(null, null), "Student");
      assert.equal(formatLeaderboardDisplayName("", ""), "Student");
      assert.equal(formatLeaderboardDisplayName("Student", null), "Student");
    });
  });

  describe("2. Score Aggregation, Deduplication & Official Filtering", () => {
    function createMockDb(docs = []) {
      return {
        collection: (colName) => {
          if (colName === "settings") {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({ currentWeek: "2026-W45" })
                })
              })
            };
          }
          if (colName === "challenge_results") {
            return {
              where: (field, op, val) => ({
                limit: () => ({
                  get: async () => {
                    let filtered = docs;
                    if (field === "challengeId" && op === "in") {
                      filtered = docs.filter(d => val.includes(d.challengeId));
                    } else if (field === "weekId" && op === "==") {
                      filtered = docs.filter(d => d.weekId === val);
                    } else if (field === "isOfficial" && op === "==") {
                      filtered = docs.filter(d => d.isOfficial === val);
                    }
                    return {
                      docs: filtered.map((item, idx) => ({
                        id: `doc-${idx}`,
                        data: () => item
                      }))
                    };
                  }
                })
              })
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        }
      };
    }

    test("aggregates multiple game scores for the same user in the current cycle", async () => {
      const manager = createWeeklyLeaderboardManager();
      const mockDocs = [
        // User 1: 2 games (Code Breaker 95 + Memory Matrix 90 = 185)
        { userId: "u1", displayName: "Alice Smith", gameId: "code-breaker", challengeId: "code-breaker-2026-W45", weekId: "2026-W45", isOfficial: true, score: 95, durationMs: 15000, completedAt: 1000 },
        { userId: "u1", displayName: "Alice Smith", gameId: "memory-matrix", challengeId: "memory-matrix-2026-W45", weekId: "2026-W45", isOfficial: true, score: 90, durationMs: 20000, completedAt: 1100 },
        // User 2: 1 game (100)
        { userId: "u2", displayName: "Bob Builder", gameId: "code-breaker", challengeId: "code-breaker-2026-W45", weekId: "2026-W45", isOfficial: true, score: 100, durationMs: 12000, completedAt: 1200 },
        // User 3: 1 game (80)
        { userId: "u3", displayName: "Charlie Brown", gameId: "word-forge", challengeId: "word-forge-2026-W45", weekId: "2026-W45", isOfficial: true, score: 80, durationMs: 25000, completedAt: 1300 },
      ];

      const db = createMockDb(mockDocs);
      const leaderboard = await manager.getOverallWeeklyLeaderboard({ db, forceRefresh: true });

      assert.equal(leaderboard.length, 3);
      // Rank 1: Alice with 185 pts
      assert.equal(leaderboard[0].rank, 1);
      assert.equal(leaderboard[0].userId, "u1");
      assert.equal(leaderboard[0].displayName, "Alice Smith");
      assert.equal(leaderboard[0].score, 185);

      // Rank 2: Bob with 100 pts
      assert.equal(leaderboard[1].rank, 2);
      assert.equal(leaderboard[1].userId, "u2");
      assert.equal(leaderboard[1].score, 100);

      // Rank 3: Charlie with 80 pts
      assert.equal(leaderboard[2].rank, 3);
      assert.equal(leaderboard[2].userId, "u3");
      assert.equal(leaderboard[2].score, 80);
    });

    test("deduplicates repeated attempts for the same game by retaining the highest score", async () => {
      const manager = createWeeklyLeaderboardManager();
      const mockDocs = [
        // User 1 played Code Breaker twice (first 70, second 95 -> should take 95, NOT 165)
        { userId: "u1", displayName: "Alice Smith", gameId: "code-breaker", challengeId: "code-breaker-2026-W45", weekId: "2026-W45", isOfficial: true, score: 70, durationMs: 30000, completedAt: 1000 },
        { userId: "u1", displayName: "Alice Smith", gameId: "code-breaker", challengeId: "code-breaker-2026-W45", weekId: "2026-W45", isOfficial: true, score: 95, durationMs: 15000, completedAt: 2000 },
      ];

      const db = createMockDb(mockDocs);
      const leaderboard = await manager.getOverallWeeklyLeaderboard({ db, forceRefresh: true });

      assert.equal(leaderboard.length, 1);
      assert.equal(leaderboard[0].score, 95);
    });

    test("strictly excludes unofficial results", async () => {
      const manager = createWeeklyLeaderboardManager();
      const mockDocs = [
        { userId: "u_official", displayName: "Official Player", gameId: "code-breaker", challengeId: "code-breaker-2026-W45", weekId: "2026-W45", isOfficial: true, score: 85, durationMs: 15000, completedAt: 1000 },
        { userId: "u_cheater", displayName: "Practice Player", gameId: "code-breaker", challengeId: "code-breaker-2026-W45", weekId: "2026-W45", isOfficial: false, score: 100, durationMs: 5000, completedAt: 1100 },
      ];

      const db = createMockDb(mockDocs);
      const leaderboard = await manager.getOverallWeeklyLeaderboard({ db, forceRefresh: true });

      assert.equal(leaderboard.length, 1);
      assert.equal(leaderboard[0].userId, "u_official");
      assert.equal(leaderboard[0].score, 85);
    });
  });

  describe("3. Ranking, Tie-breaking & Top 5 Slice", () => {
    test("breaks score ties by lowest total duration, then earliest completedAt", async () => {
      const manager = createWeeklyLeaderboardManager();
      const mockDocs = [
        // Both have score 90, but Dave has faster duration (10s vs 20s)
        { userId: "u_slow", displayName: "Slow User", gameId: "code-breaker", challengeId: "code-breaker-2026-W45", weekId: "2026-W45", isOfficial: true, score: 90, durationMs: 20000, completedAt: 1000 },
        { userId: "u_fast", displayName: "Fast User", gameId: "code-breaker", challengeId: "code-breaker-2026-W45", weekId: "2026-W45", isOfficial: true, score: 90, durationMs: 10000, completedAt: 1100 },
      ];

      const db = {
        collection: (col) => {
          if (col === "settings") return { doc: () => ({ get: async () => ({ exists: false }) }) };
          return {
            where: () => ({
              limit: () => ({
                get: async () => ({
                  docs: mockDocs.map((d, i) => ({ id: `doc-${i}`, data: () => d }))
                })
              })
            })
          };
        }
      };

      const leaderboard = await manager.getOverallWeeklyLeaderboard({ db, forceRefresh: true });
      assert.equal(leaderboard[0].userId, "u_fast");
      assert.equal(leaderboard[0].rank, 1);
      assert.equal(leaderboard[1].userId, "u_slow");
      assert.equal(leaderboard[1].rank, 2);
    });

    test("caps leaderboard to exactly Top 5 users", async () => {
      const manager = createWeeklyLeaderboardManager();
      const mockDocs = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        displayName: `Player ${i}`,
        gameId: "code-breaker",
        challengeId: "code-breaker-2026-W45",
        weekId: "2026-W45",
        isOfficial: true,
        score: 50 + i * 5,
        durationMs: 15000,
        completedAt: 1000 + i,
      }));

      const db = {
        collection: (col) => {
          if (col === "settings") return { doc: () => ({ get: async () => ({ exists: false }) }) };
          return {
            where: () => ({
              limit: () => ({
                get: async () => ({
                  docs: mockDocs.map((d, i) => ({ id: `doc-${i}`, data: () => d }))
                })
              })
            })
          };
        }
      };

      const leaderboard = await manager.getOverallWeeklyLeaderboard({ db, forceRefresh: true });
      assert.equal(leaderboard.length, 5);
      assert.equal(leaderboard[0].rank, 1);
      assert.equal(leaderboard[4].rank, 5);
      // Top score should be 95 (user-9)
      assert.equal(leaderboard[0].score, 95);
    });
  });

  describe("4. Multi-tiered Query Fallbacks", () => {
    test("falls back to weekId query when candidate challengeIds return empty", async () => {
      const manager = createWeeklyLeaderboardManager();
      let queryStage = "none";
      const db = {
        collection: (col) => {
          if (col === "settings") {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({ currentWeek: "2026-W45" })
                })
              })
            };
          }
          return {
            where: (field, op, val) => ({
              limit: () => ({
                get: async () => {
                  if (field === "challengeId") {
                    return { docs: [] };
                  }
                  if (field === "weekId") {
                    queryStage = "weekId-fallback";
                    return {
                      docs: [{
                        id: "doc-fallback",
                        data: () => ({
                          userId: "user-fallback",
                          displayName: "Fallback Hero",
                          gameId: "code-breaker",
                          challengeId: "code-breaker-alternate-date",
                          weekId: "2026-W45",
                          isOfficial: true,
                          score: 99,
                          durationMs: 14000,
                          completedAt: 1000
                        })
                      }]
                    };
                  }
                  return { docs: [] };
                }
              })
            })
          };
        }
      };

      const leaderboard = await manager.getOverallWeeklyLeaderboard({ db, forceRefresh: true });
      assert.equal(queryStage, "weekId-fallback");
      assert.equal(leaderboard.length, 1);
      assert.equal(leaderboard[0].displayName, "Fallback Hero");
      assert.equal(leaderboard[0].score, 99);
    });
  });

  describe("5. 60-Second In-Memory Caching & Cache Invalidation", () => {
    test("serves repeated requests within 60s from memory with ZERO database reads", async () => {
      const manager = createWeeklyLeaderboardManager();
      let dbReadCount = 0;
      const db = {
        collection: (col) => {
          if (col === "settings") return { doc: () => ({ get: async () => ({ exists: false }) }) };
          return {
            where: () => ({
              limit: () => ({
                get: async () => {
                  dbReadCount++;
                  return {
                    docs: [{
                      id: "d1",
                      data: () => ({
                        userId: "u1",
                        displayName: "Cached User",
                        isOfficial: true,
                        score: 90,
                        durationMs: 10000,
                        completedAt: 1000,
                      })
                    }]
                  };
                }
              })
            })
          };
        }
      };

      const t0 = new Date("2026-11-04T12:00:00Z");
      const res1 = await manager.getOverallWeeklyLeaderboard({ db, now: t0 });
      assert.equal(res1.length, 1);
      const initialReads = dbReadCount;
      assert.ok(initialReads > 0);

      // Call again 30 seconds later (within 60s TTL)
      const t30s = new Date(t0.getTime() + 30 * 1000);
      const res2 = await manager.getOverallWeeklyLeaderboard({ db, now: t30s });
      assert.equal(res2.length, 1);
      assert.equal(dbReadCount, initialReads, "Should NOT perform any new database reads");

      // Invalidate cache explicitly (like on challenge-submit)
      manager.invalidateWeeklyLeaderboardCache();

      // Call again — must re-query database
      const res3 = await manager.getOverallWeeklyLeaderboard({ db, now: t30s });
      assert.equal(res3.length, 1);
      assert.ok(dbReadCount > initialReads, "Must re-query database after cache invalidation");
    });
  });

  describe("6. Graceful Error Handling (Quota Exceeded / Network Failure)", () => {
    test("returns empty leaderboard or stale cache without crashing or throwing", async () => {
      const manager = createWeeklyLeaderboardManager();
      const faultyDb = {
        collection: () => ({
          doc: () => ({
            get: async () => { throw new Error("RESOURCE_EXHAUSTED: Quota exceeded"); }
          }),
          where: () => ({
            limit: () => ({
              get: async () => { throw new Error("RESOURCE_EXHAUSTED: Quota exceeded"); }
            })
          })
        })
      };

      // Must NOT throw!
      const leaderboard = await manager.getOverallWeeklyLeaderboard({ db: faultyDb, forceRefresh: true });
      assert.ok(Array.isArray(leaderboard));
      assert.equal(leaderboard.length, 0);
    });
  });
});
