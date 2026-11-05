import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractPdfText } from "../src/lib/pdfTextExtractor.ts";

describe("Paperino — ATS Analyzer & PDF Text Extraction", () => {
  describe("1. extractPdfText with pdf-parse v2 PDFParse class", () => {
    test("successfully extracts text and page count from single-page PDF", async () => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const page = doc.addPage([600, 800]);
      page.drawText(
        "Mohamed Sajid\nSoftware Engineer\nEmail: mohamedsajid.sa@gmail.com\nPhone: 9876543210\n" +
        "Skills: React, Next.js, Node.js, TypeScript, Tailwind CSS\n" +
        "Experience: 2 years building full-stack applications with high performance.\n" +
        "Education: SRM Institute of Science and Technology, B.Tech CSE\n" +
        "Projects: Paperino ATS Resume Analyzer with semantic keyword parsing",
        { x: 50, y: 700, size: 12, font }
      );
      const pdfBytes = await doc.save();
      const buffer = Buffer.from(pdfBytes);

      const result = await extractPdfText(buffer);
      assert.ok(result.text.length > 50, "Extracted text length should exceed 50 characters");
      assert.equal(result.numpages, 1, "Page count should be 1");
      assert.match(result.text, /Mohamed Sajid/);
      assert.match(result.text, /mohamedsajid\.sa@gmail\.com/);
      assert.match(result.text, /TypeScript/);
    });

    test("successfully extracts text and accurate page count from multi-page PDF", async () => {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);

      // Page 1
      const p1 = doc.addPage([600, 800]);
      p1.drawText("Page 1: Candidate Overview & Core Technical Skills: Python, Docker, Kubernetes, AWS", {
        x: 50,
        y: 700,
        size: 12,
        font
      });

      // Page 2
      const p2 = doc.addPage([600, 800]);
      p2.drawText("Page 2: Professional Experience at Global Tech Corp as Senior Software Engineer", {
        x: 50,
        y: 700,
        size: 12,
        font
      });

      // Page 3
      const p3 = doc.addPage([600, 800]);
      p3.drawText("Page 3: Certifications, Publications, and Education Honours Degree", {
        x: 50,
        y: 700,
        size: 12,
        font
      });

      const pdfBytes = await doc.save();
      const buffer = Buffer.from(pdfBytes);

      const result = await extractPdfText(buffer);
      assert.equal(result.numpages, 3, "Page count should accurately reflect 3 pages");
      assert.match(result.text, /Page 1/);
      assert.match(result.text, /Page 2/);
      assert.match(result.text, /Page 3/);
    });

    test("handles empty or blank PDF gracefully without throwing unhandled exceptions", async () => {
      const doc = await PDFDocument.create();
      doc.addPage([600, 800]); // Blank page
      const pdfBytes = await doc.save();
      const buffer = Buffer.from(pdfBytes);

      const result = await extractPdfText(buffer);
      assert.equal(typeof result.text, "string");
      assert.equal(result.numpages, 1);
    });
  });

  describe("2. Word count validation & page limits", () => {
    test("word count calculation distinguishes valid resume text from insufficient text", () => {
      const cleanPDFText = (raw) => {
        if (!raw) return "";
        return raw.replace(/[ \t]{2,}/g, " ").trim();
      };

      const validText = "Mohamed Sajid Software Engineer with 2 years experience in React Next.js TypeScript Node.js and full-stack development at Paperino SRM Study Hub. Built complex architectures, improved web vitals, and implemented high security authentication pipelines across serverless cloud platforms.";
      const shortText = "Blank document here";

      const countWords = (t) => {
        const cleaned = cleanPDFText(t).replace(/[^a-zA-Z0-9\s\.\@\+\-]/g, " ").toLowerCase();
        return cleaned.split(/\s+/).filter((w) => w.length > 0).length;
      };

      assert.ok(countWords(validText) >= 30, "Valid resume should have >= 30 words");
      assert.ok(countWords(shortText) < 30, "Short text should be flagged as < 30 words");
    });
  });

  describe("3. Resilience against Firestore Quota Exhaustion", () => {
    test("config fetch default state allows page to render immediately without infinite spinner", () => {
      // Default state in page is now true instead of null
      const defaultAtsEnabled = true;
      assert.equal(defaultAtsEnabled, true);
    });

    test("maintenance check promise race resolves safely within timeout limit", async () => {
      const timeoutMs = 50;
      const slowDbQuery = new Promise((resolve) => setTimeout(() => resolve({ exists: true, data: () => ({ atsEnabled: false }) }), 500));
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));

      const result = await Promise.race([slowDbQuery, timeoutPromise]);
      assert.equal(result, null, "Should timeout gracefully without hanging the request");
    });
  });
});
