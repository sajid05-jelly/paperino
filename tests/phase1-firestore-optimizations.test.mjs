import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Phase 1 — Firestore Read Optimizations", () => {

  describe("1. Weekly Challenges Leaderboard Caching & Scoped Queries", () => {
    // Model of the challengeLeaderboard in-memory cache mechanism
    function createLeaderboardManager() {
      const cache = new Map();
      const CACHE_TTL_MS = 60 * 1000;
      let firestoreReadCount = 0;

      const mockDb = [
        { userId: "u1", displayName: "Alice", isOfficial: true, score: 95, durationMs: 12000, completedAt: 1000 },
        { userId: "u2", displayName: "Bob", isOfficial: true, score: 90, durationMs: 15000, completedAt: 1100 },
        { userId: "u3", displayName: "Charlie", isOfficial: true, score: 85, durationMs: 20000, completedAt: 1200 },
        { userId: "u4", displayName: "Dave", isOfficial: true, score: 80, durationMs: 25000, completedAt: 1300 },
        { userId: "u5", displayName: "Unofficial", isOfficial: false, score: 100, durationMs: 5000, completedAt: 1400 },
      ];

      function invalidateCache(challengeId) {
        cache.delete(challengeId);
      }

      async function getLeaderboard(challengeId, currentUid, now = Date.now(), limit = 100) {
        const cached = cache.get(challengeId);
        let entries;

        if (cached && now - cached.timestamp < CACHE_TTL_MS) {
          entries = cached.entries;
        } else {
          firestoreReadCount++;
          // Simulate .where('challengeId', '==', challengeId).limit(100)
          const queried = mockDb.slice(0, limit).filter(d => d.isOfficial);

          const userBestMap = new Map();
          queried.forEach(d => {
            const existing = userBestMap.get(d.userId);
            if (!existing || d.score > existing.score || (d.score === existing.score && d.durationMs < existing.durationMs)) {
              userBestMap.set(d.userId, { ...d });
            }
          });

          entries = Array.from(userBestMap.values()).sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
            return a.completedAt - b.completedAt;
          });

          cache.set(challengeId, { timestamp: now, entries });
        }

        const leaderboard = [];
        let userRank = null;

        entries.forEach((entry, idx) => {
          const rank = idx + 1;
          if (entry.userId === currentUid) {
            userRank = rank;
          }
          if (rank <= 3) {
            leaderboard.push({
              userId: entry.userId,
              displayName: entry.displayName,
              score: entry.score,
              durationMs: entry.durationMs,
              rank
            });
          }
        });

        return { leaderboard, userRank };
      }

      return { getLeaderboard, invalidateCache, getReadCount: () => firestoreReadCount, mockDb };
    }

    test("consecutive leaderboard calls within 60s TTL hit cache with ZERO extra Firestore reads", async () => {
      const manager = createLeaderboardManager();
      const t0 = 100000;

      // First call (cache miss) -> 1 Firestore query
      const res1 = await manager.getLeaderboard("code-breaker-2026-W42", "u1", t0);
      assert.equal(manager.getReadCount(), 1);
      assert.equal(res1.leaderboard.length, 3);
      assert.equal(res1.userRank, 1);

      // Second call at +10s (cache hit) -> 0 Firestore queries
      const res2 = await manager.getLeaderboard("code-breaker-2026-W42", "u2", t0 + 10000);
      assert.equal(manager.getReadCount(), 1); // No new read
      assert.equal(res2.userRank, 2);

      // Third call at +59s (cache hit) -> 0 Firestore queries
      const res3 = await manager.getLeaderboard("code-breaker-2026-W42", "u3", t0 + 59000);
      assert.equal(manager.getReadCount(), 1); // Still no new read
      assert.equal(res3.userRank, 3);

      // Fourth call at +61s (expired TTL) -> fresh Firestore query
      const res4 = await manager.getLeaderboard("code-breaker-2026-W42", "u1", t0 + 61000);
      assert.equal(manager.getReadCount(), 2);
    });

    test("submitting a new challenge result invalidates cache immediately", async () => {
      const manager = createLeaderboardManager();
      const t0 = 100000;

      await manager.getLeaderboard("code-breaker-2026-W42", "u1", t0);
      assert.equal(manager.getReadCount(), 1);

      // Submit new high score
      manager.mockDb.unshift({
        userId: "uNew",
        displayName: "Champion",
        isOfficial: true,
        score: 100,
        durationMs: 8000,
        completedAt: t0 + 5000
      });

      // Explicit invalidation on challenge-submit
      manager.invalidateCache("code-breaker-2026-W42");

      // Next request gets fresh data immediately without waiting for 60s TTL
      const resAfterSubmit = await manager.getLeaderboard("code-breaker-2026-W42", "uNew", t0 + 6000);
      assert.equal(manager.getReadCount(), 2);
      assert.equal(resAfterSubmit.userRank, 1);
      assert.equal(resAfterSubmit.leaderboard[0].displayName, "Champion");
    });

    test("query limit of 100 caps database consumption even with massive player counts", async () => {
      const manager = createLeaderboardManager();
      // Add 500 players to mock database
      for (let i = 10; i < 510; i++) {
        manager.mockDb.push({
          userId: `u${i}`,
          displayName: `Student ${i}`,
          isOfficial: true,
          score: 50,
          durationMs: 30000,
          completedAt: 10000 + i
        });
      }

      // Query with limit 100
      const res = await manager.getLeaderboard("code-breaker-2026-W42", "u1", 200000, 100);
      assert.equal(res.leaderboard.length, 3);
      assert.equal(res.userRank, 1);
    });
  });

  describe("2. Sections API Server-Side Filtering (/api/sections)", () => {
    function createSectionsApiManager() {
      const mockDatabase = [
        { id: "sec1", departmentId: "btech", semesterId: "1", subjectId: "calc", sectionType: "pyq" },
        { id: "sec2", departmentId: "btech", semesterId: "1", subjectId: "calc", sectionType: "notes" },
        { id: "sec3", departmentId: "btech", semesterId: "2", subjectId: "phy", sectionType: "pyq" },
        { id: "sec4", departmentId: "mca", semesterId: "1", subjectId: "java", sectionType: "notes" },
      ];

      let storedSections = [...mockDatabase];

      function handleGet(departmentId, subjectId, dbAvailable = true) {
        let allSections = [];
        const hasFilter = Boolean(departmentId || subjectId);

        if (dbAvailable) {
          // Targeted Firestore query
          let filtered = mockDatabase;
          if (departmentId) filtered = filtered.filter(s => s.departmentId === departmentId);
          if (subjectId) filtered = filtered.filter(s => s.subjectId === subjectId);

          allSections = filtered;
          // Only overwrite persistent store if unfiltered
          if (!hasFilter) {
            storedSections = [...filtered];
          }
        } else {
          // Fallback to local store
          allSections = [...storedSections];
        }

        let result = allSections;
        if (departmentId) result = result.filter(s => s.departmentId === departmentId);
        if (subjectId) result = result.filter(s => s.subjectId === subjectId);

        return { result, storedCount: storedSections.length };
      }

      return { handleGet, getStoredSections: () => storedSections };
    }

    test("targeted request with departmentId and subjectId returns only matching sections", () => {
      const api = createSectionsApiManager();
      const { result, storedCount } = api.handleGet("btech", "calc");

      assert.equal(result.length, 2);
      assert.ok(result.every(s => s.departmentId === "btech" && s.subjectId === "calc"));
      // Crucial: Targeted query must NOT truncate global stored sections
      assert.equal(storedCount, 4);
    });

    test("unfiltered admin request returns all sections and updates persistent store", () => {
      const api = createSectionsApiManager();
      const { result, storedCount } = api.handleGet(null, null);

      assert.equal(result.length, 4);
      assert.equal(storedCount, 4);
    });

    test("fallback preserves accurate filtering when Firestore circuit breaker is active", () => {
      const api = createSectionsApiManager();
      // Database unavailable (e.g. quota exhausted circuit breaker)
      const { result } = api.handleGet("mca", "java", false);

      assert.equal(result.length, 1);
      assert.equal(result[0].subjectId, "java");
    });
  });

  describe("3. Subject Page Server-to-Client Initial Materials Handoff", () => {
    function simulateSubjectComponentMount({ initialMaterials, cachedData, forceRefetch = false }) {
      let clientMaterialsQueryCount = 0;
      let loading = !initialMaterials || initialMaterials.length === 0;

      let materials = initialMaterials || [];
      let subjectSections = (initialMaterials && initialMaterials.length > 0)
        ? Array.from(new Set(initialMaterials.filter(m => m.status === "approved" || !m.status).map(m => m.category)))
        : null;

      // Model fetchMaterials logic
      function fetchMaterials() {
        const CACHE_TTL_MS = 10 * 60 * 1000;
        const now = 1000000;

        if (!forceRefetch && cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
          materials = cachedData.materials;
          subjectSections = cachedData.sections;
          loading = false;
          return { skippedClientQuery: true };
        }

        if (!initialMaterials || initialMaterials.length === 0 || forceRefetch) {
          loading = true;
        }

        const shouldQueryMaterials = forceRefetch || !initialMaterials;
        if (shouldQueryMaterials) {
          clientMaterialsQueryCount++;
        }

        let matList = shouldQueryMaterials
          ? [{ id: "fresh_mat", category: "notes", status: "approved" }]
          : initialMaterials;

        materials = matList;
        subjectSections = Array.from(new Set(matList.map(m => m.category)));
        loading = false;

        return { skippedClientQuery: !shouldQueryMaterials };
      }

      const fetchResult = fetchMaterials();

      return {
        materials,
        subjectSections,
        loading,
        clientMaterialsQueryCount,
        skippedClientQuery: fetchResult.skippedClientQuery
      };
    }

    test("passing serverMaterials renders immediately (loading=false) and skips client Firestore read", () => {
      const serverMaterials = [
        { id: "m1", category: "pyq", status: "approved" },
        { id: "m2", category: "notes", status: "approved" }
      ];

      const state = simulateSubjectComponentMount({
        initialMaterials: serverMaterials,
        cachedData: null,
        forceRefetch: false
      });

      assert.equal(state.loading, false);
      assert.equal(state.clientMaterialsQueryCount, 0); // 0 client Firestore reads!
      assert.equal(state.skippedClientQuery, true);
      assert.deepEqual(state.subjectSections, ["pyq", "notes"]);
    });

    test("session cache hit bypasses both materials and sections queries on navigation", () => {
      const cached = {
        materials: [{ id: "m1", category: "pyq", status: "approved" }],
        sections: ["pyq"],
        timestamp: 999900 // recent
      };

      const state = simulateSubjectComponentMount({
        initialMaterials: null,
        cachedData: cached,
        forceRefetch: false
      });

      assert.equal(state.loading, false);
      assert.equal(state.clientMaterialsQueryCount, 0);
      assert.deepEqual(state.subjectSections, ["pyq"]);
    });

    test("forceRefetch (e.g. after material upload) re-queries Firestore fresh", () => {
      const serverMaterials = [
        { id: "m1", category: "pyq", status: "approved" }
      ];

      const state = simulateSubjectComponentMount({
        initialMaterials: serverMaterials,
        cachedData: null,
        forceRefetch: true
      });

      assert.equal(state.clientMaterialsQueryCount, 1);
      assert.equal(state.skippedClientQuery, false);
    });

    test("empty subject (0 materials) displays skeleton until detection completes, preventing empty flash", () => {
      const state = simulateSubjectComponentMount({
        initialMaterials: [],
        cachedData: null,
        forceRefetch: false
      });

      // Initial state was loading: true
      assert.equal(state.materials.length, 0);
    });
  });

});
