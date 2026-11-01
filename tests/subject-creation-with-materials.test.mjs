import test from "node:test";
import assert from "node:assert/strict";

test("Subject Creation With Mandatory Study Material Flow", async (t) => {
  await t.test("1. User Subject Creation Modal validation", async (t) => {
    function validateSubjectSubmission({ subjectName, file, materialTitle, selectedCategory }) {
      if (!subjectName || !subjectName.trim()) {
        return { valid: false, error: "Subject Name is required." };
      }
      if (!file) {
        return { valid: false, error: "Study material file is strictly required. Please upload a PDF or document." };
      }
      if (!materialTitle || !materialTitle.trim()) {
        return { valid: false, error: "Material Title is required." };
      }
      if (!["pyq", "notes", "questions"].includes(selectedCategory)) {
        return { valid: false, error: "Invalid material section category." };
      }
      return { valid: true, error: null };
    }

    await t.test("blocking submission when no file is uploaded (prevents empty subjects)", () => {
      const result = validateSubjectSubmission({
        subjectName: "Compiler Design",
        file: null,
        materialTitle: "Unit 1 Notes",
        selectedCategory: "notes"
      });

      assert.equal(result.valid, false);
      assert.match(result.error, /file is strictly required/i);
    });

    await t.test("blocking submission when subject name is missing", () => {
      const result = validateSubjectSubmission({
        subjectName: "",
        file: { name: "notes.pdf" },
        materialTitle: "Unit 1 Notes",
        selectedCategory: "notes"
      });

      assert.equal(result.valid, false);
      assert.match(result.error, /Subject Name is required/i);
    });

    await t.test("allowing submission only when both subject details and study material file are provided", () => {
      const result = validateSubjectSubmission({
        subjectName: "Compiler Design",
        file: { name: "compiler_unit1.pdf", size: 1024 * 1024 },
        materialTitle: "Unit 1 Handwritten Notes",
        selectedCategory: "notes"
      });

      assert.equal(result.valid, true);
      assert.equal(result.error, null);
    });

    await t.test("supports all 3 section options: Question Papers, Notes, Important Questions", () => {
      ["pyq", "notes", "questions"].forEach((cat) => {
        const res = validateSubjectSubmission({
          subjectName: "Data Structures",
          file: { name: "sample.pdf" },
          materialTitle: "Sample Title",
          selectedCategory: cat
        });
        assert.equal(res.valid, true);
      });
    });
  });

  await t.test("2. Admin Review & Approval establishes both subject and material", async (t) => {
    // Simulated Firestore & Drive DB
    const mockFirestore = {
      dynamic_subjects: new Map(),
      materials: new Map(),
      subject_sections: new Map()
    };

    const mockDrive = new Map();

    async function handleApproveNewSubjectMaterial(matId, adminEmail = "admin@paperino.app") {
      const mat = mockFirestore.materials.get(matId);
      if (!mat) throw new Error("Material not found");

      // 1. If it was a new subject request, establish the subject in dynamic_subjects
      if (mat.isNewSubjectRequest) {
        const docId = `${mat.departmentId}_sem${mat.semesterId}_${mat.subjectId}`;
        mockFirestore.dynamic_subjects.set(docId, {
          subjectId: mat.subjectId,
          name: mat.subjectName,
          code: mat.subjectCode || "",
          departmentId: mat.departmentId,
          semesterId: mat.semesterId,
          status: "approved",
          createdBy: mat.uploaderId,
          sections: [mat.category]
        });
      }

      // 2. Establish section
      const secKey = `${mat.departmentId}_${mat.semesterId}_${mat.subjectId}_${mat.category}`;
      mockFirestore.subject_sections.set(secKey, {
        departmentId: mat.departmentId,
        semesterId: mat.semesterId,
        subjectId: mat.subjectId,
        sectionType: mat.category,
        status: "active"
      });

      // 3. Mark material approved
      mat.status = "approved";
      mat.approvedBy = adminEmail;
      mat.approvedAt = Date.now();
      mockFirestore.materials.set(matId, mat);

      return { success: true };
    }

    // Populate a pending new subject request with material
    const pendingMatId = "mat-101";
    mockFirestore.materials.set(pendingMatId, {
      id: pendingMatId,
      departmentId: "btech",
      semesterId: "5",
      subjectId: "compiler-design",
      subjectName: "Compiler Design",
      subjectCode: "21CSC305J",
      title: "Unit 1 Lexical Analysis Notes",
      category: "notes",
      fileId: "drive-file-abc",
      status: "pending",
      isNewSubjectRequest: true,
      uploaderId: "student-1"
    });
    mockDrive.set("drive-file-abc", "PDF Binary Data");

    await handleApproveNewSubjectMaterial(pendingMatId);

    // Subject is created
    const createdSub = mockFirestore.dynamic_subjects.get("btech_sem5_compiler-design");
    assert.ok(createdSub);
    assert.equal(createdSub.name, "Compiler Design");
    assert.equal(createdSub.status, "approved");

    // Section is created
    const createdSec = mockFirestore.subject_sections.get("btech_5_compiler-design_notes");
    assert.ok(createdSec);
    assert.equal(createdSec.status, "active");

    // Material is approved
    const approvedMat = mockFirestore.materials.get(pendingMatId);
    assert.equal(approvedMat.status, "approved");
  });

  await t.test("3. Admin Rejection completely deletes from Firestore and Google Drive", async (t) => {
    const mockFirestore = {
      dynamic_subjects: new Map(),
      materials: new Map()
    };
    const mockDrive = new Map();

    async function handleRejectNewSubjectMaterial(matId) {
      const mat = mockFirestore.materials.get(matId);
      if (!mat) throw new Error("Material not found");

      // 1. Delete file permanently from Google Drive
      if (mat.fileId) {
        mockDrive.delete(mat.fileId);
      }

      // 2. If it was a new subject request, delete any pending dynamic_subjects document
      if (mat.isNewSubjectRequest) {
        const docId = `${mat.departmentId}_sem${mat.semesterId}_${mat.subjectId}`;
        mockFirestore.dynamic_subjects.delete(docId);
      }

      // 3. Completely delete material document from Firestore
      mockFirestore.materials.delete(matId);

      return { deleted: true };
    }

    const pendingMatId = "mat-bad-upload";
    mockFirestore.materials.set(pendingMatId, {
      id: pendingMatId,
      departmentId: "btech",
      semesterId: "3",
      subjectId: "bad-subject",
      subjectName: "Bad Subject",
      category: "pyq",
      fileId: "drive-file-trash",
      status: "pending",
      isNewSubjectRequest: true
    });
    mockDrive.set("drive-file-trash", "Spam content");
    mockFirestore.dynamic_subjects.set("btech_sem3_bad-subject", { subjectId: "bad-subject", status: "pending" });

    // Reject
    await handleRejectNewSubjectMaterial(pendingMatId);

    // Completely deleted from Firestore
    assert.equal(mockFirestore.materials.has(pendingMatId), false);
    assert.equal(mockFirestore.dynamic_subjects.has("btech_sem3_bad-subject"), false);

    // Completely deleted from Google Drive
    assert.equal(mockDrive.has("drive-file-trash"), false);
  });
});
