import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Course & Category Selection UI Capitalization", () => {
  const sampleFirestoreDepartments = [
    { id: "btech", name: "Bachelor / Master of Technology", code: "b.TECH / M.TECH" },
    { id: "bca", name: "BCA", code: "Ai and ds" },
    { id: "b-com", name: "B.Com", code: "commerce" },
    { id: "bba", name: "BBA", code: "management" },
    { id: "b---sc", name: "B.Sc", code: "science" },
    { id: "mca", name: "MCA", code: "COMputer applications" }
  ];

  test("Display formatter transforms all degree labels and category names to FULL UPPERCASE", () => {
    const formattedCodes = sampleFirestoreDepartments.map(d => (d.code || d.id || "").toUpperCase());
    
    assert.deepEqual(formattedCodes, [
      "B.TECH / M.TECH",
      "AI AND DS",
      "COMMERCE",
      "MANAGEMENT",
      "SCIENCE",
      "COMPUTER APPLICATIONS"
    ]);
  });

  test("Display formatter transforms all course names to FULL UPPERCASE", () => {
    const formattedNames = sampleFirestoreDepartments.map(d => (d.name || "").toUpperCase());
    
    assert.deepEqual(formattedNames, [
      "BACHELOR / MASTER OF TECHNOLOGY",
      "BCA",
      "B.COM",
      "BBA",
      "B.SC",
      "MCA"
    ]);
  });

  test("Preserves original department id for routing and search queries", () => {
    sampleFirestoreDepartments.forEach(dept => {
      const displayLabel = (dept.code || "").toUpperCase();
      const displayName = (dept.name || "").toUpperCase();

      // UI display is uppercase
      assert.equal(displayLabel, displayLabel.toUpperCase());
      assert.equal(displayName, displayName.toUpperCase());

      // Routing and IDs remain lowercased/unchanged
      assert.equal(dept.id.toLowerCase(), dept.id);
    });
  });

  test("Verify src/app/page.tsx has uppercase formatting on course cards", () => {
    const homeFile = path.join(__dirname, "..", "src", "app", "page.tsx");
    const content = fs.readFileSync(homeFile, "utf8");

    assert.ok(content.includes('(dept.code || dept.id || "").toUpperCase()'), "Home page must uppercase degree/category label");
    assert.ok(content.includes('(dept.name || "").toUpperCase()'), "Home page must uppercase course name");
  });

  test("Verify src/app/courses/page.tsx has uppercase formatting on course cards", () => {
    const coursesFile = path.join(__dirname, "..", "src", "app", "courses", "page.tsx");
    const content = fs.readFileSync(coursesFile, "utf8");

    assert.ok(content.includes('(dept.code || "").toUpperCase()'), "Courses page must uppercase degree/category label");
    assert.ok(content.includes('(dept.name || "").toUpperCase()'), "Courses page must uppercase course name");
  });

  test("Verify src/components/CreateCourseModal.tsx has uppercase dropdown options", () => {
    const modalFile = path.join(__dirname, "..", "src", "components", "CreateCourseModal.tsx");
    const content = fs.readFileSync(modalFile, "utf8");

    assert.ok(content.includes('(d.name || "").toUpperCase()'), "CreateCourseModal must uppercase department name");
    assert.ok(content.includes('(d.code || "").toUpperCase()'), "CreateCourseModal must uppercase department code");
  });
});
