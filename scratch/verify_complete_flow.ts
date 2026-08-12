import { getSubjectSlug, matchSubjectBySlug, getSubjectSeoPath } from "@/lib/seoUtils";
import { getSubjectDetails, getAllUnifiedData } from "@/lib/unifiedSubjectData";

async function verifyFlow() {
  console.log("=== 🧪 VERIFYING COMPLETE PAPERINO NAVIGATION & PREVIEW FLOW ===");

  const { subjects, departments } = await getAllUnifiedData();
  console.log(`✓ Unified Data Loaded: ${subjects.length} subjects across ${departments.length} departments.`);

  const testSubjects = [
    { id: "calc", name: "Calculus And Linear Algebra", semId: "1", deptId: "btech" },
    { id: "chem", name: "Chemistry", semId: "1", deptId: "btech" },
    { id: "poe", name: "Philosophy Of Engineering", semId: "1", deptId: "btech" },
    { id: "pps", name: "Programming For Problem Solving", semId: "1", deptId: "btech" },
    { id: "foe", name: "Fundamental Of Economics (FOE)", semId: "1", deptId: "btech" },
  ];

  for (const s of testSubjects) {
    const seoPath = getSubjectSeoPath({
      id: s.id,
      name: s.name,
      departmentId: s.deptId,
      semesterId: s.semId,
    });
    console.log(`\n📌 [Subject Card Click] "${s.name}"`);
    console.log(`   └─ Card Href Generated: "${seoPath}"`);

    // Test resolving via slug, ID, or name
    const matched = matchSubjectBySlug(s.deptId, s.semId, s.id, subjects);
    console.log(`   └─ Match By Slug ("${s.id}"): ${matched ? `SUCCESS (ID: "${matched.id}", Name: "${matched.name}")` : "FAILED"}`);

    const details = await getSubjectDetails(s.deptId, s.semId, s.id);
    console.log(`   └─ Resolved Details: Name="${details.subjectName}", Code="${details.subjectCode}"`);

    if (!matched || !details.subjectName) {
      console.error(`❌ Flow failed for ${s.name}`);
      process.exit(1);
    }
  }

  console.log("\n🎉 ALL SUBJECT CARD ROUTES & SUBJECT RESOLUTIONS VERIFIED 100% SUCCESS!");
}

verifyFlow();
