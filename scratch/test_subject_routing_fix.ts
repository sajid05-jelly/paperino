import { getSubjectSlug, matchSubjectBySlug, getSubjectSeoPath } from "@/lib/seoUtils";
import { SUBJECTS } from "@/lib/subjects";
import { UnifiedSubject } from "@/lib/unifiedSubjectData";

function runTest() {
  console.log("=== 🧪 VERIFYING SUBJECT ROUTE RESOLUTION FIX ===");

  const sem1Subjects: UnifiedSubject[] = SUBJECTS["1"].map(s => ({
    id: s.id,
    name: s.name,
    code: "",
    departmentId: "btech",
    semesterId: "1",
    status: "approved"
  }));

  const testRoutes = [
    { targetUrl: "/srm/btech/semester-1/calculus-and-linear-algebra", expectedId: "calc" },
    { targetUrl: "/srm/btech/semester-1/chemistry", expectedId: "chem" },
    { targetUrl: "/srm/btech/semester-1/philosophy-of-engineering", expectedId: "poe" },
    { targetUrl: "/srm/btech/semester-1/introduction-to-computational-biology", expectedId: "icb" },
    { targetUrl: "/srm/btech/semester-1/programming-for-problem-solving", expectedId: "pps" },
    { targetUrl: "/srm/btech/semester-1/fundamental-of-economics-foe", expectedId: "foe" },
    { targetUrl: "/srm/btech/semester-1/foreign-languages", expectedId: "fl" },
    { targetUrl: "/srm/btech/semester-1/cell-biology", expectedId: "cb" }
  ];

  let passed = true;

  testRoutes.forEach(t => {
    const parts = t.targetUrl.split("/");
    const deptId = parts[2]; // btech
    const semId = parts[3].replace("semester-", ""); // 1
    const slug = parts[4]; // calculus-and-linear-algebra

    const matched = matchSubjectBySlug(deptId, semId, slug, sem1Subjects);
    const generatedPath = matched ? getSubjectSeoPath(matched) : "NOT_FOUND";

    if (matched && matched.id === t.expectedId) {
      console.log(`✅ SUCCESS: ${t.targetUrl}`);
      console.log(`   └─ Resolved Subject: "${matched.name}" (ID: ${matched.id})`);
      console.log(`   └─ Canonical Path:  ${generatedPath}`);
    } else {
      console.error(`❌ FAILED: ${t.targetUrl} resolved to ${matched ? matched.name : "null"}`);
      passed = false;
    }
  });

  if (passed) {
    console.log("\n🎉 ALL SEMESTER 1 SUBJECT ROUTES RESOLVE PERFECTLY WITH ZERO 404!");
  } else {
    console.error("\n❌ Routing test failed.");
    process.exit(1);
  }
}

runTest();
