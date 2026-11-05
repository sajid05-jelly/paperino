/**
 * src/lib/pdfTextExtractor.ts
 *
 * Robust server-side PDF text and metadata extraction utility.
 * Supports both pdf-parse v2 (class-based PDFParse) and pdf-parse v1 (function-based),
 * with fallback to pdf2json and graceful error handling.
 */

import { createRequire } from "module";

// Safe require helper that works across ESM, CJS, and Next.js Turbopack
function getRequire(): NodeRequire {
  if (typeof require !== "undefined") {
    return require;
  }
  return createRequire(import.meta.url);
}

export interface ExtractedPdf {
  text: string;
  numpages: number;
}

/**
 * Extracts plain text and page count from a PDF buffer.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractedPdf> {
  // Polyfill DOM elements for pdf.js running in Node if necessary
  if (typeof global !== "undefined") {
    if (!global.DOMMatrix) global.DOMMatrix = class DOMMatrix {} as any;
    if (!global.ImageData) global.ImageData = class ImageData {} as any;
    if (!global.Path2D) global.Path2D = class Path2D {} as any;
  }

  const req = getRequire();

  // Strategy 1: pdf-parse v2 (Class-based PDFParse)
  try {
    const pkg = req("pdf-parse");
    const PDFParseClass = pkg.PDFParse || pkg.default?.PDFParse;
    if (PDFParseClass) {
      const parser = new PDFParseClass({ data: buffer });
      await parser.load();
      const res = await parser.getText();
      const text = res?.text || "";
      const numpages = res?.total || res?.pages?.length || 1;
      await parser.destroy().catch(() => {});
      if (text && text.trim().length > 0) {
        return { text, numpages };
      }
    }
  } catch (err: any) {
    console.warn("[extractPdfText] Strategy 1 (pdf-parse v2) notice:", err.message);
  }

  // Strategy 2: pdf-parse v1 (Function-based)
  try {
    const pkg = req("pdf-parse");
    const fn = typeof pkg === "function" ? pkg : (typeof pkg.default === "function" ? pkg.default : null);
    if (fn) {
      const data = await fn(buffer);
      if (data?.text && data.text.trim().length > 0) {
        return { text: data.text, numpages: data.numpages || 1 };
      }
    }
  } catch (err: any) {
    console.warn("[extractPdfText] Strategy 2 (pdf-parse v1) notice:", err.message);
  }

  // Strategy 3: pdf2json fallback
  try {
    const PDFParser = req("pdf2json");
    const parser = new PDFParser(null, 1);
    const text = await new Promise<string>((resolve, reject) => {
      parser.on("pdfParser_dataError", (err: any) => reject(err?.parserError || err));
      parser.on("pdfParser_dataReady", () => resolve(parser.getRawTextContent()));
      parser.parseBuffer(buffer);
    });
    if (text && text.trim().length > 0) {
      return { text, numpages: 1 };
    }
  } catch (err: any) {
    console.warn("[extractPdfText] Strategy 3 (pdf2json) notice:", err?.message || err);
  }

  return { text: "", numpages: 1 };
}
