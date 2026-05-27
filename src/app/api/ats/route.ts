import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Polyfill DOM elements for pdf.js running in Node
    if (typeof global !== "undefined") {
      if (!global.DOMMatrix) global.DOMMatrix = class DOMMatrix {} as any;
      if (!global.ImageData) global.ImageData = class ImageData {} as any;
      if (!global.Path2D) global.Path2D = class Path2D {} as any;
    }
    
    const pdfParseModule = require("pdf-parse");
    const pdfParse = typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default;
    
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const role = formData.get("role") as string;

    if (!file || !role) {
      return NextResponse.json({ error: "File and role are required." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let text = "";

    // Parse Document
    if (file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const pdfData = await pdfParse(buffer);
        text = pdfData.text || "";
      } catch (err: any) {
        console.warn("pdf-parse failed, falling back to pdf2json:", err.message);
      }
      
      if (!text || text.trim().length < 50) {
        try {
          const PDFParser = require("pdf2json");
          text = await new Promise<string>((resolve, reject) => {
            const pdfParser = new PDFParser(null, 1);
            pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
            pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
            pdfParser.parseBuffer(buffer);
          });
        } catch (fallbackErr: any) {
          console.error("Fallback pdf2json failed:", fallbackErr.message);
        }
      }

    } else if (file.name.toLowerCase().endsWith(".docx")) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch (err: any) {
        console.error("DOCX parsing failed:", err.message);
        return NextResponse.json({ error: "Failed to parse DOCX file." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Unsupported file type. Please upload PDF or DOCX." }, { status: 400 });
    }

    const cleanPDFText = (raw: string) => {
      if (!raw) return "";
      return raw
        // 1. Collapse multiple spaces and tabs into a single space
        .replace(/[ \t]{2,}/g, ' ')
        // 2. Fix isolated letters at the start of words (e.g., "N ode" -> "Node", "f or" -> "for")
        // Ignoring valid 1-letter words "a" and "i"
        .replace(/\b([^aiAI\W\d])\s+([a-z]{2,})\b/ig, '$1$2')
        // 3. Fix isolated letters in the middle of words (e.g., "bro w ser" -> "browser")
        .replace(/\b([a-zA-Z]{2,})\s+([^aiAI\W\d])\s+([a-zA-Z]{2,})\b/ig, '$1$2$3')
        // 4. Fix split words across newlines (e.g., "bro\nwser")
        .replace(/\b([a-zA-Z]{2,})\s*\n\s*([a-z]{2,})\b/g, '$1$2')
        // 5. Fix single hanging letters across lines (e.g., "o\nf" -> "of")
        .replace(/\b([^aiAI\W\d])\s*\n\s*([a-zA-Z]+)\b/ig, '$1$2')
        // 6. Fix scattered acronyms (e.g., "A P I" -> "API")
        .replace(/\b([A-Z])\s+(?=[A-Z]\b)/g, '$1')
        // 7. Normalize line breaks (max 2 consecutive newlines)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    };

    text = cleanPDFText(text);

    const cleanTextForCounting = text.replace(/[^a-zA-Z0-9\s\.\@\+\-]/g, ' ').toLowerCase(); 
    const words = cleanTextForCounting.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // FAKE / CORRUPTED RESUME DETECTION
    if (wordCount < 30) {
      return NextResponse.json({ error: "Invalid Resume: The document contains too little text. If this is an image-based PDF, please convert it to a standard text PDF." }, { status: 400 });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
You are a strict, enterprise-grade ATS (Applicant Tracking System) Analyzer and AI Resume Coach.
Your task is to analyze the following resume text against the target job role: "${role}".

Rules:
1. Be highly critical and objective about the content, but lenient about PDF extraction artifacts.
2. Provide a rigorous overall score (0-100) and specific section scores (0-100) for Skills, Projects, Experience, Education, and Contact.
3. Calculate a keyword match percentage against standard requirements for the role.
4. Identify granular issues: weak summaries, weak project descriptions, missing keywords, formatting errors, or ATS compatibility issues.
5. For EVERY issue found (except missing sections), extract the EXACT "currentText" from the resume, and provide a "suggestedText" showing a greatly improved version.
6. Detect if the resume is fake, corrupted, or an image-based PDF lacking text.
7. CRITICAL: The text provided was extracted by a basic PDF parser. It may contain unnatural whitespaces, kerning issues, or weird spacing between characters (e.g. 'N ode' instead of 'Node'). Do NOT flag the resume as corrupted or fake simply because of these whitespace/extraction artifacts. Only flag as fake if it is clearly gibberish, empty, or malicious.

Return the result STRICTLY as a JSON object matching this schema. Do not use markdown wrappers.

{
  "overallScore": number, // 0-100
  "keywordMatchPercentage": number, // 0-100
  "sectionScores": {
    "skills": number,
    "projects": number,
    "experience": number,
    "education": number,
    "contact": number
  },
  "issues": [
    {
      "type": "weak_summary" | "missing_keyword" | "weak_project" | "missing_section" | "formatting" | "ats_compatibility",
      "severity": "critical" | "warning" | "good",
      "section": string,
      "message": string,
      "currentText": string, // The exact text snippet from the resume that has the issue (leave empty if the issue is a missing section)
      "suggestedText": string // The AI improved version or recommendation
    }
  ],
  "missingSkills": [ "string" ], // List of important skills missing for this role
  "isFakeOrCorrupted": boolean,
  "fakeReason": string // Explanation if fake/corrupted, otherwise empty
}

Resume Text:
${text}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    const parsedData = JSON.parse(responseText);
    
    // Attach raw text so the frontend can use it for the preview and highlighting
    parsedData.rawText = text;

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("ATS Parsing Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process resume via Gemini AI." }, { status: 500 });
  }
}
