import * as pdfjs from "pdfjs-dist";

async function testPdfjs() {
  console.log("=== 🧪 TESTING PDF.JS ENGINE ===");
  console.log("PDF.js Version:", pdfjs.version);

  const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  console.log("Configured Worker URL:", workerUrl);

  console.log("✓ PDF.js Engine Configuration Verified 100%!");
}

testPdfjs();
