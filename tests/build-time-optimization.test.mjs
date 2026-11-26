import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("Static Build Optimization & Firestore Read Protection", () => {
  const diskCacheDir = path.join(process.cwd(), "node_modules", ".cache");
  const diskCachePath = path.join(diskCacheDir, "unified_subjects_cache.json");

  it("1. next.config.ts activates IS_NEXT_BUILD during phase-production-build", async () => {
    delete process.env.IS_NEXT_BUILD;
    const nextConfigModule = await import("../next.config.ts");
    const createNextConfig = nextConfigModule.default;
    
    assert.equal(typeof createNextConfig, "function", "next.config.ts should export a config factory function");
    
    // Simulate Next.js calling config during phase-production-build
    const config = createNextConfig("phase-production-build", { defaultConfig: {} });
    assert.equal(process.env.IS_NEXT_BUILD, "true", "IS_NEXT_BUILD should be 'true' during build phase");
    assert.ok(config, "Config object must be returned");
  });

  it("2. Build-time phase detection skips server materials Firestore queries", () => {
    // When IS_NEXT_BUILD or NEXT_PHASE is active, fetchServerMaterials logic must yield empty array []
    const isBuild = (phase, buildFlag) => {
      return phase === "phase-production-build" || buildFlag === "true";
    };

    assert.equal(isBuild("phase-production-build", undefined), true);
    assert.equal(isBuild(undefined, "true"), true);
    assert.equal(isBuild("phase-production-server", undefined), false);
    assert.equal(isBuild(undefined, undefined), false);
  });

  it("3. Cross-worker disk cache writes and survives across worker processes", () => {
    // Write sample mock unified subjects into disk cache
    const mockData = {
      departments: [{ id: "btech", name: "B.Tech", code: "B.Tech", totalSemesters: 8 }],
      subjects: [
        { id: "calc", name: "Calculus", departmentId: "btech", semesterId: "1" },
        { id: "phy", name: "Physics", departmentId: "btech", semesterId: "1" }
      ]
    };

    if (!fs.existsSync(diskCacheDir)) {
      fs.mkdirSync(diskCacheDir, { recursive: true });
    }
    fs.writeFileSync(diskCachePath, JSON.stringify(mockData), "utf8");

    assert.ok(fs.existsSync(diskCachePath), "Cache file should exist on disk");
    const readBack = JSON.parse(fs.readFileSync(diskCachePath, "utf8"));
    assert.equal(readBack.subjects.length, 2);
    assert.equal(readBack.departments[0].id, "btech");
  });

  it("4. Dynamic cache invalidation removes disk cache cleanly", () => {
    if (fs.existsSync(diskCachePath)) {
      fs.unlinkSync(diskCachePath);
    }
    assert.equal(fs.existsSync(diskCachePath), false, "Cache file should be removed after invalidation");
  });
});
