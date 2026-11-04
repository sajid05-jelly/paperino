import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Paperino — Subject Dropdown Fixes (Admin Upload & Student Emergency Mode)", () => {

  function createMockSubjectsEnvironment() {
    // In-memory Firestore collections
    const firestore = {
      dynamic_subjects: new Map(),
    };

    // Static B.Tech definitions (Semesters 1-6, 8 have entries; Semester 7 is explicitly empty)
    const STATIC_SUBJECTS = {
      "1": [{ id: "eng-math-1", name: "Engineering Mathematics I" }],
      "2": [{ id: "eng-math-2", name: "Engineering Mathematics II" }],
      "3": [{ id: "dsa", name: "Data Structures & Algorithms" }],
      "4": [{ id: "os", name: "Operating Systems" }],
      "5": [{ id: "cn", name: "Computer Networks" }],
      "6": [{ id: "compiler", name: "Compiler Design" }],
      "7": [], // Empty static list for B.Tech Sem 7
      "8": [{ id: "project-work", name: "Major Project Work" }]
    };

    const getStaticBTechSubjects = () => {
      const list = [];
      Object.entries(STATIC_SUBJECTS).forEach(([semId, subs]) => {
        subs.forEach(s => {
          list.push({
            id: s.id,
            name: s.name,
            code: "",
            departmentId: "btech",
            semesterId: semId,
            status: "approved",
            contributorId: "system",
            contributorName: "System"
          });
        });
      });
      return list;
    };

    // Simulate SubjectsContext state & references
    const loadedSemesters = new Map();
    const inFlightRequests = new Map();
    let firestoreReadCount = 0;

    let state = {
      departments: [
        { id: "btech", name: "Bachelor of Technology", code: "B.Tech", totalSemesters: 8, status: "approved" },
        { id: "bca", name: "Bachelor of Computer Applications", code: "BCA", totalSemesters: 6, status: "approved" }
      ],
      subjects: {},
      allSubjectsList: []
    };

    // Initialize with static subjects
    const initialBTech = getStaticBTechSubjects();
    state.allSubjectsList = [...initialBTech];
    state.subjects = {};
    initialBTech.forEach(sub => {
      if (!state.subjects[sub.departmentId]) state.subjects[sub.departmentId] = {};
      if (!state.subjects[sub.departmentId][sub.semesterId]) state.subjects[sub.departmentId][sub.semesterId] = [];
      state.subjects[sub.departmentId][sub.semesterId].push(sub);
    });

    // Simulated lazyLoadSubjects matching SubjectsContext.tsx
    const lazyLoadSubjects = async (deptId, semId, force = false) => {
      if (!deptId || !semId) return;

      const normDept = deptId.toLowerCase().trim();
      const normSem = String(semId).trim();
      const cacheKey = `${normDept}_${normSem}`;

      if (!force && loadedSemesters.get(cacheKey)) {
        return; // Cache Hit
      }

      if (inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey); // Concurrency Lock
      }

      const fetchPromise = (async () => {
        try {
          firestoreReadCount++; // Track read operations

          const semNum = Number(normSem);
          const semValues = !isNaN(semNum) ? [normSem, semNum] : [normSem];

          // Firestore query matching both string and numeric semesterId
          const matchingDocs = [];
          for (const [docId, data] of firestore.dynamic_subjects.entries()) {
            const matchesDept = (data.departmentId || "").toLowerCase().trim() === normDept;
            const matchesSem = semValues.some(v => data.semesterId === v || String(data.semesterId) === String(v));
            if (matchesDept && matchesSem) {
              matchingDocs.push({ id: docId, data });
            }
          }

          const newSubjects = matchingDocs.map(({ id, data }) => ({
            id: data.subjectId || id,
            name: data.name,
            code: data.code || "",
            departmentId: normDept,
            semesterId: normSem,
            sections: Array.isArray(data.sections) ? data.sections : undefined,
            status: data.status || "approved",
            contributorId: data.contributorId || null,
            contributorName: data.contributorName || null,
            createdAt: data.createdAt
          }));

          // Merge into state
          const copy = { ...state.subjects };
          if (!copy[deptId]) copy[deptId] = {};
          if (normDept !== deptId && !copy[normDept]) copy[normDept] = {};

          const staticSubs = getStaticBTechSubjects().filter(s =>
            (s.departmentId === deptId || s.departmentId === normDept) &&
            String(s.semesterId) === normSem
          );
          const combined = [...staticSubs];

          newSubjects.forEach(newSub => {
            if (!combined.some(s => s.id === newSub.id)) {
              combined.push(newSub);
            }
          });

          copy[deptId][normSem] = combined;
          if (normDept !== deptId) {
            copy[normDept][normSem] = combined;
          }
          state.subjects = copy;

          const withoutThisDeptSem = state.allSubjectsList.filter(
            s => !(
              (s.departmentId === deptId || s.departmentId === normDept) &&
              String(s.semesterId) === normSem &&
              s.contributorId !== "system"
            )
          );
          state.allSubjectsList = [...withoutThisDeptSem, ...newSubjects];

          loadedSemesters.set(cacheKey, true);
          if (normDept !== deptId) {
            loadedSemesters.set(`${deptId}_${normSem}`, true);
          }
        } finally {
          inFlightRequests.delete(cacheKey);
        }
      })();

      inFlightRequests.set(cacheKey, fetchPromise);
      return fetchPromise;
    };

    return {
      firestore,
      state,
      lazyLoadSubjects,
      getFirestoreReadCount: () => firestoreReadCount
    };
  }

  test("1. B.Tech Semester 7: Static subjects are empty and dynamic subjects load from Firestore", async () => {
    const env = createMockSubjectsEnvironment();

    // Verify initial state for B.Tech Semester 7 is empty
    assert.deepEqual(env.state.subjects["btech"]?.["7"], undefined);

    // Seed dynamic subjects in Firestore for B.Tech Semester 7
    env.firestore.dynamic_subjects.set("btech_sem7_cloud-computing", {
      subjectId: "cloud-computing",
      name: "Cloud Computing",
      code: "18CS701",
      departmentId: "btech",
      semesterId: "7",
      status: "approved",
      sections: ["pyq", "notes"]
    });

    env.firestore.dynamic_subjects.set("btech_sem7_cyber-security", {
      subjectId: "cyber-security",
      name: "Cyber Security & Cryptography",
      code: "18CS702",
      departmentId: "btech",
      semesterId: 7, // Stored as number
      status: "approved",
      sections: ["pyq", "questions"]
    });

    // Invoke lazyLoadSubjects
    await env.lazyLoadSubjects("btech", "7");

    const sem7Subs = env.state.subjects["btech"]["7"];
    assert.ok(Array.isArray(sem7Subs));
    assert.equal(sem7Subs.length, 2);
    assert.equal(sem7Subs[0].id, "cloud-computing");
    assert.equal(sem7Subs[0].name, "Cloud Computing");
    assert.equal(sem7Subs[1].id, "cyber-security");
    assert.equal(sem7Subs[1].name, "Cyber Security & Cryptography");
  });

  test("2. BCA Semester 1: Non-B.Tech department loads correctly from Firestore", async () => {
    const env = createMockSubjectsEnvironment();

    // Verify initial state for BCA is empty
    assert.deepEqual(env.state.subjects["bca"], undefined);

    // Seed dynamic subjects for BCA Semester 1
    env.firestore.dynamic_subjects.set("bca_sem1_programming-c", {
      subjectId: "programming-c",
      name: "Programming in C",
      code: "BCA101",
      departmentId: "bca",
      semesterId: "1",
      status: "approved",
      sections: ["pyq", "notes", "questions"]
    });

    env.firestore.dynamic_subjects.set("bca_sem1_math-foundations", {
      subjectId: "math-foundations",
      name: "Mathematical Foundations",
      code: "BCA102",
      departmentId: "bca",
      semesterId: 1, // Stored as numeric 1
      status: "approved",
      sections: ["pyq"]
    });

    // Invoke lazyLoadSubjects
    await env.lazyLoadSubjects("bca", "1");

    const bcaSem1 = env.state.subjects["bca"]["1"];
    assert.ok(Array.isArray(bcaSem1));
    assert.equal(bcaSem1.length, 2);
    assert.equal(bcaSem1[0].id, "programming-c");
    assert.equal(bcaSem1[1].id, "math-foundations");
  });

  test("3. Session caching prevents duplicate Firestore reads on re-selection", async () => {
    const env = createMockSubjectsEnvironment();

    env.firestore.dynamic_subjects.set("btech_sem7_cloud-computing", {
      subjectId: "cloud-computing",
      name: "Cloud Computing",
      departmentId: "btech",
      semesterId: "7",
      status: "approved"
    });

    assert.equal(env.getFirestoreReadCount(), 0);

    // First load -> 1 Firestore read
    await env.lazyLoadSubjects("btech", "7");
    assert.equal(env.getFirestoreReadCount(), 1);

    // Subsequent loads for same dept/sem -> Cache hit, 0 additional reads!
    await env.lazyLoadSubjects("btech", "7");
    await env.lazyLoadSubjects("btech", "7");
    await env.lazyLoadSubjects("BTECH", "7"); // Case insensitive
    assert.equal(env.getFirestoreReadCount(), 1);
  });

  test("4. Concurrency lock prevents parallel duplicate Firestore reads", async () => {
    const env = createMockSubjectsEnvironment();

    env.firestore.dynamic_subjects.set("btech_sem7_cloud-computing", {
      subjectId: "cloud-computing",
      name: "Cloud Computing",
      departmentId: "btech",
      semesterId: "7",
      status: "approved"
    });

    // Fire 5 simultaneous calls to lazyLoadSubjects
    await Promise.all([
      env.lazyLoadSubjects("btech", "7"),
      env.lazyLoadSubjects("btech", "7"),
      env.lazyLoadSubjects("btech", "7"),
      env.lazyLoadSubjects("btech", "7"),
      env.lazyLoadSubjects("btech", "7")
    ]);

    // Only 1 actual Firestore query should have occurred
    assert.equal(env.getFirestoreReadCount(), 1);
  });

  test("5. Admin Upload Page dropdown: changing dept/sem loads subjects and auto-selects valid option", async () => {
    const env = createMockSubjectsEnvironment();

    env.firestore.dynamic_subjects.set("btech_sem7_cloud-computing", {
      subjectId: "cloud-computing",
      name: "Cloud Computing",
      departmentId: "btech",
      semesterId: "7",
      status: "approved"
    });

    env.firestore.dynamic_subjects.set("bca_sem1_programming-c", {
      subjectId: "programming-c",
      name: "Programming in C",
      departmentId: "bca",
      semesterId: "1",
      status: "approved"
    });

    // Simulate AdminUploadPage state
    let formData = {
      department: "btech",
      semester: "7",
      subject: ""
    };

    // 1. Page triggers lazyLoadSubjects for B.Tech Sem 7
    await env.lazyLoadSubjects(formData.department, formData.semester);

    let currentSubjects = (env.state.subjects[formData.department]?.[formData.semester] || [])
      .filter(s => s.status !== "pending" && s.status !== "rejected");

    assert.equal(currentSubjects.length, 1);
    assert.equal(currentSubjects[0].id, "cloud-computing");

    // Auto-select first subject
    if (!formData.subject || !currentSubjects.some(s => s.id === formData.subject)) {
      formData.subject = currentSubjects[0].id;
    }
    assert.equal(formData.subject, "cloud-computing");

    // 2. User switches department to BCA
    formData = {
      department: "bca",
      semester: "1",
      subject: ""
    };

    // Triggers lazy load for BCA Sem 1
    await env.lazyLoadSubjects(formData.department, formData.semester);

    currentSubjects = (env.state.subjects[formData.department]?.[formData.semester] || [])
      .filter(s => s.status !== "pending" && s.status !== "rejected");

    assert.equal(currentSubjects.length, 1);
    assert.equal(currentSubjects[0].id, "programming-c");

    if (!formData.subject || !currentSubjects.some(s => s.id === formData.subject)) {
      formData.subject = currentSubjects[0].id;
    }
    assert.equal(formData.subject, "programming-c");
  });

  test("6. Student Exam Emergency Mode: loading, filtering pending/rejected subjects, and selection sync", async () => {
    const env = createMockSubjectsEnvironment();

    // Approved subject
    env.firestore.dynamic_subjects.set("btech_sem7_active-subject", {
      subjectId: "active-subject",
      name: "Active Engineering Subject",
      departmentId: "btech",
      semesterId: "7",
      status: "approved"
    });

    // Pending subject (should be excluded from dropdown)
    env.firestore.dynamic_subjects.set("btech_sem7_pending-subject", {
      subjectId: "pending-subject",
      name: "Pending Proposed Subject",
      departmentId: "btech",
      semesterId: "7",
      status: "pending"
    });

    // Rejected subject (should be excluded from dropdown)
    env.firestore.dynamic_subjects.set("btech_sem7_rejected-subject", {
      subjectId: "rejected-subject",
      name: "Rejected Subject",
      departmentId: "btech",
      semesterId: "7",
      status: "rejected"
    });

    // Student selects B.Tech and Semester 7
    const selectedDept = "btech";
    const selectedSem = "7";

    await env.lazyLoadSubjects(selectedDept, selectedSem);

    const filteredSubjects = (selectedDept && selectedSem && env.state.subjects[selectedDept]?.[selectedSem])
      ? env.state.subjects[selectedDept][selectedSem].filter(s => s.status !== "pending" && s.status !== "rejected")
      : [];

    // Only approved subject should appear in dropdown
    assert.equal(filteredSubjects.length, 1);
    assert.equal(filteredSubjects[0].id, "active-subject");
    assert.equal(filteredSubjects[0].name, "Active Engineering Subject");
  });
});
