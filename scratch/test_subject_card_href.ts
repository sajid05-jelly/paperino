import { getSubjectSeoPath } from "@/lib/seoUtils";

function runTest() {
  console.log("=== 🧪 TESTING SUBJECT CARD HREF GENERATION FOR ALL COURSES ===");

  const testSubjects = [
    { id: "calc", name: "Calculus And Linear Algebra", departmentId: "btech", semesterId: "1" },
    { id: "chem", name: "Chemistry", departmentId: "btech", semesterId: "1" },
    { id: "ds_mca", name: "Data Structures in C++", departmentId: "mca", semesterId: "2" },
    { id: "fin_mba", name: "Financial Management", departmentId: "mba", semesterId: "1" },
    { id: "mkt_bba", name: "Marketing Principles", departmentId: "bba", semesterId: "3" },
    { id: "new_sub_999", name: "AI & Neural Networks (Admin Created)", departmentId: "btech", semesterId: "6" }
  ];

  let passed = true;

  testSubjects.forEach(s => {
    const generatedHref = getSubjectSeoPath(s);
    const expectedHref = `/courses/${s.departmentId}/semesters/${s.semesterId}/subjects/${s.id}`;

    if (generatedHref === expectedHref) {
      console.log(`✅ SUCCESS: [${s.departmentId.toUpperCase()} Sem ${s.semesterId}] "${s.name}"`);
      console.log(`   └─ Card Href: ${generatedHref}`);
    } else {
      console.error(`❌ FAILED: Expected ${expectedHref}, got ${generatedHref}`);
      passed = false;
    }
  });

  if (passed) {
    console.log("\n🎉 ALL SUBJECT CARDS ACROSS ALL COURSES GENERATE CORRECT WORKING HREFS!");
  } else {
    console.error("\n❌ Subject card href test failed.");
    process.exit(1);
  }
}

runTest();
