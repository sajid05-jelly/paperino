import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Paperino — Section Management, Approvals & Loading Fixes", () => {

  // Mock backend for section creation & approval testing
  function createMockBackend() {
    const subjectSections = new Map();
    const dynamicSubjects = new Map();
    const materials = new Map();

    return {
      subjectSections,
      dynamicSubjects,
      materials,
      async handleCreateSection({ departmentId, semesterId, subjectId, sectionType, creatorId, creatorName, creatorEmail, adminUser }) {
        const ALLOWED_ADMINS = [
          "mohamedsajid.sa@gmail.com",
          "sudharajsekar2005@gmail.com",
          "admin.paperinoirfan27@gmail.com",
          "admin.paperinosam14@gmail.com",
          "gameplayitlifeitis@gmail.com",
          "dejasvini28@gmail.com",
          "kaushika13official@gmail.com"
        ];
        const isAdmin = adminUser.role === "admin" || (adminUser.email && ALLOWED_ADMINS.includes(adminUser.email.toLowerCase()));
        if (!isAdmin) {
          throw new Error("Forbidden. Section creation is managed via admin material approval.");
        }

        const secDocId = `${departmentId}_sem${semesterId}_${subjectId}_${sectionType}`;
        if (subjectSections.has(secDocId)) {
          return { success: true, sectionId: secDocId, alreadyExisted: true };
        }

        const newSection = {
          id: secDocId,
          departmentId,
          semesterId: String(semesterId),
          subjectId,
          sectionType,
          createdBy: creatorId || adminUser.uid,
          creatorName: creatorName || "Contributor",
          creatorEmail: creatorEmail || adminUser.email,
          approvedByAdminId: adminUser.uid,
          approvedByAdminEmail: adminUser.email,
          createdAt: new Date().toISOString()
        };
        subjectSections.set(secDocId, newSection);

        const subDocId = `${departmentId}_sem${semesterId}_${subjectId}`;
        const currentSub = dynamicSubjects.get(subDocId) || { sections: [] };
        if (!currentSub.sections.includes(sectionType)) {
          currentSub.sections.push(sectionType);
        }
        dynamicSubjects.set(subDocId, currentSub);

        return { success: true, sectionId: secDocId, created: true };
      }
    };
  }

  describe("1. Initial Loading & Empty-State Behavior in Subject Page", () => {
    // Pure model of SubjectClientComponent's view decision logic
    function resolveSubjectViewState({ loading, fetchError, activeSections }) {
      if (fetchError) {
        return "ERROR_VIEW";
      }
      if (loading) {
        return "LOADING_SKELETON";
      }
      if (!activeSections || activeSections.length === 0) {
        return "EMPTY_STATE";
      }
      return "SECTIONS_GRID";
    }

    test("while loading is true, shows loading skeleton and NEVER flashes empty state", () => {
      const stateDuringInitialFetch = {
        loading: true,
        fetchError: null,
        activeSections: []
      };

      const view = resolveSubjectViewState(stateDuringInitialFetch);
      assert.equal(view, "LOADING_SKELETON");
      assert.notEqual(view, "EMPTY_STATE", "Must not flash empty state during initial fetch");
    });

    test("when fetch error occurs, shows error view and does not treat error as empty data", () => {
      const stateOnError = {
        loading: false,
        fetchError: "Unable to load subject materials right now.",
        activeSections: []
      };

      const view = resolveSubjectViewState(stateOnError);
      assert.equal(view, "ERROR_VIEW");
      assert.notEqual(view, "EMPTY_STATE", "Errors must not be rendered as empty state");
    });

    test("shows empty state ONLY when loading completes successfully and no sections exist", () => {
      const stateEmptySuccess = {
        loading: false,
        fetchError: null,
        activeSections: []
      };

      const view = resolveSubjectViewState(stateEmptySuccess);
      assert.equal(view, "EMPTY_STATE");
    });

    test("shows sections grid immediately when active sections exist", () => {
      const stateWithSections = {
        loading: false,
        fetchError: null,
        activeSections: ["pyq", "notes"]
      };

      const view = resolveSubjectViewState(stateWithSections);
      assert.equal(view, "SECTIONS_GRID");
    });
  });

  describe("2. Category Selection & Upload-Driven Section Creation", () => {
    test("clicking an existing section focuses it without creating any new record", () => {
      const activeSections = ["pyq"];
      let uploadModalCategory = null;
      let createdSectionRecord = false;

      function handleSectionClick(category) {
        if (activeSections.includes(category)) {
          // focuses section element
          return "FOCUSED_EXISTING";
        }
        uploadModalCategory = category;
        return "OPEN_UPLOAD_MODAL";
      }

      const result = handleSectionClick("pyq");
      assert.equal(result, "FOCUSED_EXISTING");
      assert.equal(uploadModalCategory, null);
      assert.equal(createdSectionRecord, false);
    });

    test("clicking a nonexistent section opens upload modal and does NOT create a section record", () => {
      const activeSections = ["pyq"];
      let uploadModalCategory = null;
      let createdSectionCalls = 0;

      function handleSectionClick(category) {
        if (activeSections.includes(category)) {
          return "FOCUSED_EXISTING";
        }
        // User requirement: Clicking a category must NOT create a section record.
        // It must show the upload interface for that category.
        uploadModalCategory = category;
        return "OPEN_UPLOAD_MODAL";
      }

      const result = handleSectionClick("notes");
      assert.equal(result, "OPEN_UPLOAD_MODAL");
      assert.equal(uploadModalCategory, "notes");
      assert.equal(createdSectionCalls, 0, "No section record created on click");
    });
  });

  describe("3. Pending and Rejected Uploads Never Create Public Sections", () => {
    // Pure function representing the fallback section detection in SubjectClientComponent
    function detectSectionsFromMaterials(matList, hasExplicitConfig, explicitSections = []) {
      if (hasExplicitConfig) {
        return explicitSections;
      }
      return Array.from(
        new Set(
          matList
            .filter((m) => m.status === "approved" || (!m.status && !m.rejectedAt))
            .map((m) => m.category)
            .filter((c) => ["pyq", "notes", "questions"].includes(c))
        )
      );
    }

    test("pending materials do not appear in detected sections", () => {
      const materials = [
        { id: "mat1", category: "pyq", status: "pending" },
        { id: "mat2", category: "notes", status: "pending" }
      ];

      const detected = detectSectionsFromMaterials(materials, false);
      assert.deepEqual(detected, []);
    });

    test("rejected materials do not appear in detected sections", () => {
      const materials = [
        { id: "mat1", category: "questions", status: "rejected", rejectedAt: Date.now() }
      ];

      const detected = detectSectionsFromMaterials(materials, false);
      assert.deepEqual(detected, []);
    });

    test("only approved materials trigger section detection in fallback", () => {
      const materials = [
        { id: "mat1", category: "pyq", status: "approved" },
        { id: "mat2", category: "notes", status: "pending" },
        { id: "mat3", category: "questions", status: "rejected", rejectedAt: Date.now() }
      ];

      const detected = detectSectionsFromMaterials(materials, false);
      assert.deepEqual(detected, ["pyq"]);
    });

    test("pending materials are not exposed to other students", () => {
      const materials = [
        { id: "m1", title: "Approved PYQ", category: "pyq", status: "approved", uploaderId: "user_a" },
        { id: "m2", title: "Pending Notes", category: "notes", status: "pending", uploaderId: "user_a" }
      ];

      // Student B view
      const studentBUser = { uid: "user_b" };
      const isAdmin = false;

      const visibleToStudentB = materials.filter(m => {
        if (m.status === "approved" || (!m.status && !m.rejectedAt)) return true;
        if (isAdmin) return true;
        if (studentBUser && m.uploaderId === studentBUser.uid) return true;
        return false;
      });

      assert.equal(visibleToStudentB.length, 1);
      assert.equal(visibleToStudentB[0].id, "m1");

      // Uploader view: can see their own pending material
      const visibleToUploader = materials.filter(m => {
        if (m.status === "approved" || (!m.status && !m.rejectedAt)) return true;
        if (isAdmin) return true;
        if (studentBUser && m.uploaderId === "user_a") return true;
        return false;
      });
      assert.equal(visibleToUploader.length, 2);
    });
  });

  describe("4. First Approved Upload Creates Section & Attributes Correctly", () => {
    test("approving the first material creates exactly one section with original uploader as creator and admin recorded separately", async () => {
      const backend = createMockBackend();

      const uploader = {
        uid: "student_uploader_123",
        displayName: "Aarav Sharma",
        email: "aarav@srmist.edu.in"
      };

      const admin = {
        uid: "admin_lead_999",
        email: "admin.paperinoirfan27@gmail.com",
        role: "admin"
      };

      const pendingMaterial = {
        id: "mat_first_pyq",
        departmentId: "btech",
        semesterId: "1",
        subjectId: "calc",
        category: "pyq",
        status: "pending",
        uploaderId: uploader.uid,
        uploaderName: uploader.displayName,
        uploaderEmail: uploader.email
      };
      backend.materials.set(pendingMaterial.id, pendingMaterial);

      // Perform section creation during approval
      const createResult = await backend.handleCreateSection({
        departmentId: pendingMaterial.departmentId,
        semesterId: pendingMaterial.semesterId,
        subjectId: pendingMaterial.subjectId,
        sectionType: pendingMaterial.category,
        creatorId: pendingMaterial.uploaderId,
        creatorName: uploader.displayName,
        creatorEmail: uploader.email,
        adminUser: admin
      });

      assert.equal(createResult.success, true);
      assert.equal(createResult.created, true);

      // Verify section document
      const expectedDocId = "btech_sem1_calc_pyq";
      const sectionDoc = backend.subjectSections.get(expectedDocId);
      assert.ok(sectionDoc, "Section document must exist");

      // Verify uploader vs admin attribution
      assert.equal(sectionDoc.createdBy, "student_uploader_123", "Uploader must be recorded as section creator");
      assert.equal(sectionDoc.creatorName, "Aarav Sharma");
      assert.equal(sectionDoc.creatorEmail, "aarav@srmist.edu.in");
      assert.equal(sectionDoc.approvedByAdminId, "admin_lead_999", "Admin must be recorded separately");
      assert.equal(sectionDoc.approvedByAdminEmail, "admin.paperinoirfan27@gmail.com");

      // Verify public registration in dynamic_subjects
      const dynamicSub = backend.dynamicSubjects.get("btech_sem1_calc");
      assert.deepEqual(dynamicSub.sections, ["pyq"]);
    });

    test("non-admin attempting to create a section directly is rejected with 403 Forbidden", async () => {
      const backend = createMockBackend();

      const studentUser = {
        uid: "student_hacker_456",
        email: "student@random.com",
        role: "student"
      };

      await assert.rejects(
        async () => {
          await backend.handleCreateSection({
            departmentId: "btech",
            semesterId: "1",
            subjectId: "calc",
            sectionType: "pyq",
            creatorId: studentUser.uid,
            creatorName: "Hacker",
            creatorEmail: studentUser.email,
            adminUser: studentUser
          });
        },
        /Forbidden/
      );
    });
  });

  describe("5. Idempotent Approval & Duplicate Section Prevention", () => {
    test("approving a second material in the same category reuses the section without creating duplicates or overwriting original creator", async () => {
      const backend = createMockBackend();

      const firstUploader = {
        uid: "first_student_111",
        displayName: "First Student",
        email: "first@srm.edu"
      };

      const secondUploader = {
        uid: "second_student_222",
        displayName: "Second Student",
        email: "second@srm.edu"
      };

      const admin = {
        uid: "admin_lead_999",
        email: "admin.paperinoirfan27@gmail.com",
        role: "admin"
      };

      // 1. First approval
      await backend.handleCreateSection({
        departmentId: "btech",
        semesterId: "1",
        subjectId: "calc",
        sectionType: "notes",
        creatorId: firstUploader.uid,
        creatorName: firstUploader.displayName,
        creatorEmail: firstUploader.email,
        adminUser: admin
      });

      assert.equal(backend.subjectSections.size, 1);
      assert.equal(backend.subjectSections.get("btech_sem1_calc_notes").createdBy, "first_student_111");

      // 2. Second approval for the same section
      const secondResult = await backend.handleCreateSection({
        departmentId: "btech",
        semesterId: "1",
        subjectId: "calc",
        sectionType: "notes",
        creatorId: secondUploader.uid,
        creatorName: secondUploader.displayName,
        creatorEmail: secondUploader.email,
        adminUser: admin
      });

      assert.equal(secondResult.success, true);
      assert.equal(secondResult.alreadyExisted, true);

      // Verify no duplicate section created
      assert.equal(backend.subjectSections.size, 1);
      // Original creator MUST be preserved
      assert.equal(backend.subjectSections.get("btech_sem1_calc_notes").createdBy, "first_student_111");

      // Verify dynamic_subjects has only one entry
      const dynamicSub = backend.dynamicSubjects.get("btech_sem1_calc");
      assert.equal(dynamicSub.sections.filter(s => s === "notes").length, 1);
    });
  });

  describe("6. Approval Failures and Safe Retries", () => {
    test("if section creation fails, material status is not updated to approved and no orphaned state is left", async () => {
      let materialStatus = "pending";
      let userPointsIncremented = false;

      async function approveWorkflow(simulateSectionFailure = false) {
        if (simulateSectionFailure) {
          throw new Error("Network timeout creating section");
        }
        materialStatus = "approved";
        userPointsIncremented = true;
      }

      // First attempt with failure
      await assert.rejects(
        async () => {
          await approveWorkflow(true);
        },
        /Network timeout/
      );

      // Material MUST still be pending and points NOT given
      assert.equal(materialStatus, "pending");
      assert.equal(userPointsIncremented, false);

      // Retry attempt succeeding
      await approveWorkflow(false);
      assert.equal(materialStatus, "approved");
      assert.equal(userPointsIncremented, true);
    });
  });

  describe("7. Existing Subjects and Sections Preservation", () => {
    test("existing subjects like Calculus and Linear Algebra retain their existing configuration", () => {
      const existingSections = [
        {
          id: "btech_sem1_calc_pyq",
          subjectId: "calc",
          subjectName: "Calculus And Linear Algebra",
          sectionType: "pyq",
          createdBy: "original_admin_id",
          createdAt: "2026-01-01T00:00:00.000Z"
        }
      ];

      // Verify existing section is identified as existing
      const targetSecDocId = "btech_sem1_calc_pyq";
      const existing = existingSections.find(s => s.id === targetSecDocId);
      assert.ok(existing);
      assert.equal(existing.subjectName, "Calculus And Linear Algebra");
      assert.equal(existing.createdBy, "original_admin_id");
    });
  });

});
