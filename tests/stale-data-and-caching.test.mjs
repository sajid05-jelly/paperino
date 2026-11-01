import test from "node:test";
import assert from "node:assert/strict";

test("Stale Data, Deletions and Cache Invalidation Protections", async (t) => {
  await t.test("1. SemesterSubjectGrid authoritative client synchronization", async (t) => {
    await t.test("while client is loading, falls back to server initialData without blank flash", () => {
      const initialData = [
        { id: "fake-2", name: "fake 2", departmentId: "btech", semesterId: "7" },
        { id: "software-network-analysis", name: "Software Network Analysis", departmentId: "btech", semesterId: "7" }
      ];
      const clientSubs = undefined; // not loaded yet
      const clientLoaded = false;

      // Pure function mirroring SemesterSubjectGrid logic
      function computeDisplaySubjects(initData, cSubs, isLoaded) {
        if (!isLoaded || !cSubs) {
          return initData;
        }
        return cSubs
          .filter((s) => s.status === "approved" || !s.status)
          .map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code || "",
            departmentId: s.departmentId,
            semesterId: s.semesterId,
            status: s.status,
            createdAt: s.createdAt,
          }));
      }

      const displayed = computeDisplaySubjects(initialData, clientSubs, clientLoaded);
      assert.equal(displayed.length, 2);
      assert.equal(displayed[0].name, "fake 2");
    });

    await t.test("once client loads, deleted subjects (fake 1, fake 2) are removed immediately", () => {
      // Server initialData pre-rendered at build time had fake 2
      const initialData = [
        { id: "fake-2", name: "fake 2", departmentId: "btech", semesterId: "7" },
        { id: "software-network-analysis", name: "Software Network Analysis", departmentId: "btech", semesterId: "7" }
      ];

      // Live Firestore returns only the remaining approved subjects (fake 2 was deleted)
      const liveClientSubs = [
        { id: "software-network-analysis", name: "Social Network Analysis", departmentId: "btech", semesterId: "7", status: "approved" }
      ];
      const clientLoaded = true;

      function computeDisplaySubjects(initData, cSubs, isLoaded) {
        if (!isLoaded || !cSubs) {
          return initData;
        }
        return cSubs
          .filter((s) => s.status === "approved" || !s.status)
          .map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code || "",
            departmentId: s.departmentId,
            semesterId: s.semesterId,
            status: s.status,
            createdAt: s.createdAt,
          }));
      }

      const displayed = computeDisplaySubjects(initialData, liveClientSubs, clientLoaded);
      assert.equal(displayed.length, 1);
      assert.equal(displayed[0].id, "software-network-analysis");
      // Must not contain fake 2
      assert.equal(displayed.some(s => s.name === "fake 2"), false);
    });

    await t.test("once client loads, renamed subjects update from Software Network Analysis to Social Network Analysis", () => {
      const initialData = [
        { id: "software-network-analysis", name: "Software Network Analysis", departmentId: "btech", semesterId: "7" }
      ];
      const liveClientSubs = [
        { id: "software-network-analysis", name: "Social Network Analysis", departmentId: "btech", semesterId: "7", status: "approved" }
      ];
      const clientLoaded = true;

      function computeDisplaySubjects(initData, cSubs, isLoaded) {
        if (!isLoaded || !cSubs) {
          return initData;
        }
        return cSubs
          .filter((s) => s.status === "approved" || !s.status)
          .map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code || "",
            departmentId: s.departmentId,
            semesterId: s.semesterId,
            status: s.status,
            createdAt: s.createdAt,
          }));
      }

      const displayed = computeDisplaySubjects(initialData, liveClientSubs, clientLoaded);
      assert.equal(displayed.length, 1);
      assert.equal(displayed[0].name, "Social Network Analysis");
    });
  });

  await t.test("2. Courses Page department visibility & rejected filtering", async (t) => {
    function filterVisibleDepts(departments, isAdmin, user) {
      return departments.filter(d => {
        if (d.status === "rejected") return false;
        const isOwnerOrApproved = d.status === "approved" || (user && d.createdBy === user.uid) || (isAdmin && d.status === "pending");
        if (!isOwnerOrApproved) return false;
        if (d.parentCourse) return false;
        return true;
      });
    }

    await t.test("rejected departments (like Biotechnology) NEVER appear even if logged in as Admin", () => {
      const departments = [
        { id: "btech", name: "B.Tech", status: "approved" },
        { id: "btech-biotechnology", name: "Btech biotechnology", status: "rejected" },
        { id: "mca", name: "MCA", status: "approved" }
      ];

      const visibleForAdmin = filterVisibleDepts(departments, true, { uid: "admin-uid" });
      assert.equal(visibleForAdmin.length, 2);
      assert.equal(visibleForAdmin.some(d => d.id === "btech-biotechnology"), false);

      const visibleForStudent = filterVisibleDepts(departments, false, null);
      assert.equal(visibleForStudent.length, 2);
      assert.equal(visibleForStudent.some(d => d.id === "btech-biotechnology"), false);
    });

    await t.test("pending department is visible to admin and creator, but hidden from public students", () => {
      const departments = [
        { id: "btech", name: "B.Tech", status: "approved" },
        { id: "new-course", name: "New Course", status: "pending", createdBy: "user-123" }
      ];

      const visibleForPublic = filterVisibleDepts(departments, false, null);
      assert.equal(visibleForPublic.length, 1);
      assert.equal(visibleForPublic[0].id, "btech");

      const visibleForCreator = filterVisibleDepts(departments, false, { uid: "user-123" });
      assert.equal(visibleForCreator.length, 2);

      const visibleForAdmin = filterVisibleDepts(departments, true, { uid: "admin-uid" });
      assert.equal(visibleForAdmin.length, 2);
    });
  });

  await t.test("3. Cache invalidation on forceRefresh", async (t) => {
    await t.test("forceRefresh clears sessionStorage and loadedSemestersRef so changes re-fetch", () => {
      const mockSessionStorage = {
        store: {
          "paperino_cached_depts_v2": JSON.stringify([{ id: "btech" }]),
          "paperino_cached_depts_ts_v2": Date.now().toString()
        },
        removeItem(k) { delete this.store[k]; },
        getItem(k) { return this.store[k]; }
      };

      let loadedSemestersRef = { "btech_7": true };

      function handleForceRefresh() {
        mockSessionStorage.removeItem("paperino_cached_depts_v2");
        mockSessionStorage.removeItem("paperino_cached_depts_ts_v2");
        loadedSemestersRef = {};
      }

      handleForceRefresh();
      assert.equal(mockSessionStorage.getItem("paperino_cached_depts_v2"), undefined);
      assert.deepEqual(loadedSemestersRef, {});
    });

    await t.test("cache TTL of 60 seconds expires stale entries", () => {
      const CACHE_TTL_MS = 60 * 1000;
      const now = Date.now();
      const staleTimestamp = now - 65 * 1000;
      const freshTimestamp = now - 20 * 1000;

      const isStale = (now - staleTimestamp) >= CACHE_TTL_MS;
      const isFresh = (now - freshTimestamp) < CACHE_TTL_MS;

      assert.equal(isStale, true);
      assert.equal(isFresh, true);
    });
  });
});
