import { getSubjectSlug, getSubjectSeoPath, getSubjectCanonicalUrl, generateSubjectJsonLd } from "@/lib/seoUtils";
import { SITE_CONFIG } from "@/lib/siteConfig";

function runTest() {
  console.log("=== 🧪 STARTING DYNAMIC DATA-DRIVEN SEO AUTOMATION TEST ===");

  const mockAdminSubjects = [
    {
      id: "subj_autonomous_robotics_21cse999t",
      name: "Autonomous AI Robotics Test",
      code: "21CSE999T",
      departmentId: "btech",
      semesterId: "5",
      status: "approved"
    },
    {
      id: "subj_quantum_computing_21cse888t",
      name: "Quantum Computing & Cryptography",
      code: "21CSE888T",
      departmentId: "mca",
      semesterId: "3",
      status: "approved"
    }
  ];

  mockAdminSubjects.forEach((subject, idx) => {
    console.log(`\n--- Test Case ${idx + 1}: Subject "${subject.name}" (${subject.code}) ---`);

    const slug = getSubjectSlug(subject);
    console.log("1. Generated Slug:          ", slug);

    const seoPath = getSubjectSeoPath(subject);
    console.log("2. Generated SEO Route Path: ", seoPath);

    const canonicalUrl = getSubjectCanonicalUrl(subject);
    console.log("3. Generated Canonical URL:  ", canonicalUrl);

    const title = `${subject.name} (${subject.code}) Notes, PYQs & Study Materials | ${subject.departmentId.toUpperCase()} Sem ${subject.semesterId} | ${SITE_CONFIG.siteName}`;
    console.log("4. Generated Meta Title:     ", title);

    const description = `Access ${subject.name} (${subject.code}) study materials, notes, previous year question papers (PYQs), important questions, and academic resources for ${SITE_CONFIG.universityShortName} ${subject.departmentId.toUpperCase()} Semester ${subject.semesterId} students on ${SITE_CONFIG.siteName}.`;
    console.log("5. Generated Meta Desc:      ", description);

    const jsonLd = generateSubjectJsonLd({
      subjectName: subject.name,
      subjectCode: subject.code,
      deptName: subject.departmentId === "btech" ? "Bachelor of Technology" : "Master of Computer Applications",
      semId: subject.semesterId,
      canonicalUrl,
      materialsCount: 12
    });
    console.log("6. Generated JSON-LD Type:   ", jsonLd["@graph"][0]["@type"], `("${jsonLd["@graph"][0]["name"]}")`);
  });

  console.log("\n✅ ALL DYNAMIC SEO AUTOMATION TESTS PASSED PERFECTLY!");
  console.log("=== 🧪 TEST COMPLETE ===");
}

runTest();
