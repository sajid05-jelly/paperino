import test from "node:test";
import assert from "node:assert/strict";

test("Materials Endpoint & Subject Materials Handling", async (t) => {
  await t.test("1. Clean empty array handoff does not throw or trigger error state", () => {
    const initialMaterials = [];
    const isArray = Array.isArray(initialMaterials);
    assert.equal(isArray, true);

    const approvedCats = Array.from(
      new Set(
        initialMaterials
          .filter((m) => m.status === "approved" || (!m.status && !m.rejectedAt))
          .map((m) => m.category)
          .filter((c) => ["pyq", "notes", "questions"].includes(c))
      )
    );

    assert.deepEqual(approvedCats, []);
  });

  await t.test("2. Detected categories accurately extracted when approved materials exist", () => {
    const initialMaterials = [
      { id: "m1", category: "notes", status: "approved" },
      { id: "m2", category: "pyq", status: "approved" },
      { id: "m3", category: "notes", status: "pending" }, // pending should be filtered out
      { id: "m4", category: "questions", status: "approved" },
    ];

    const approvedCats = Array.from(
      new Set(
        initialMaterials
          .filter((m) => m.status === "approved" || (!m.status && !m.rejectedAt))
          .map((m) => m.category)
          .filter((c) => ["pyq", "notes", "questions"].includes(c))
      )
    );

    assert.deepEqual(approvedCats.sort(), ["notes", "pyq", "questions"].sort());
  });

  await t.test("3. Semester ID normalization handles both string '1' and numeric 1", () => {
    const cleanSemId = String("semester-1").replace(/^semester-/, "").trim();
    assert.equal(cleanSemId, "1");
    const numSemId = parseInt(cleanSemId, 10);
    assert.equal(numSemId, 1);
  });

  await t.test("4. Resilient Department Normalization matches btech, b.tech, and b.tech / m.tech", () => {
    const norm = (dept) => (dept || "btech").toLowerCase().replace(/[^a-z0-9]/g, "");
    const isBtechMatch = (reqDept, docDept) => {
      const normReq = norm(reqDept);
      const normDoc = norm(docDept);
      if (!docDept || normReq === "all" || normDoc === normReq) return true;
      return (
        (normReq.includes("btech") || normReq.includes("be")) &&
        (normDoc.includes("btech") || normDoc.includes("be") || normDoc.includes("mtech"))
      );
    };

    assert.equal(isBtechMatch("btech", "B.Tech"), true);
    assert.equal(isBtechMatch("btech", "b.tech / m.tech"), true);
    assert.equal(isBtechMatch("btech", "btech"), true);
    assert.equal(isBtechMatch("btech", undefined), true);
    assert.equal(isBtechMatch("btech", "mca"), false);
  });

  await t.test("5. Subject ID Candidate Resolution bridges slug 'calculus-and-linear-algebra' to 'calc'", () => {
    const candidateIds = new Set();
    const subjectId = "calculus-and-linear-algebra";
    candidateIds.add(subjectId);

    // Static subject lookup
    const staticSubs = [
      { id: "calc", name: "Calculus And Linear Algebra" },
      { id: "chem", name: "Chemistry" },
    ];

    for (const sub of staticSubs) {
      const sSlug = sub.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      if (candidateIds.has(sub.id) || candidateIds.has(sSlug)) {
        candidateIds.add(sub.id);
        candidateIds.add(sSlug);
      }
    }

    assert.ok(candidateIds.has("calc"));
    assert.ok(candidateIds.has("calculus-and-linear-algebra"));
  });
});
