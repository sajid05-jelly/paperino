import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { runApiGuard } from "@/lib/api-guard";

export const maxDuration = 60; // 60 seconds as multi-PDF parsing might take time

export async function POST(req: NextRequest) {
  /* ── Security: require auth + enforce server-side daily limit ── */
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  try {
    if (typeof global !== "undefined") {
      if (!global.DOMMatrix) global.DOMMatrix = class DOMMatrix {} as any;
      if (!global.ImageData) global.ImageData = class ImageData {} as any;
      if (!global.Path2D) global.Path2D = class Path2D {} as any;
    }

    // Dynamically import pdf-parse to bypass Next.js static ESM strictness
    const pdfParseModule = await import("pdf-parse" as any);
    const pdfParse =
      typeof pdfParseModule === "function"
        ? pdfParseModule
        : pdfParseModule.default || pdfParseModule;

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const subject = formData.get("subject") as string;
    const ocrMode = req.nextUrl.searchParams.get("ocr") === "true";

    if (!files || files.length === 0 || !subject) {
      return NextResponse.json(
        { error: "Please provide at least one file and a subject name." },
        { status: 400 }
      );
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: "Maximum of 5 PDF files allowed per analysis." },
        { status: 400 }
      );
    }

    // Validate subject input (prevent prompt injection)
    const sanitizedSubject = subject.slice(0, 120).replace(/[<>"']/g, "");

    // Validate file sizes (max 20 MB each)
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 20 MB limit.` },
          { status: 400 }
        );
      }
    }

    const cleanPDFText = (raw: string) => {
      if (!raw) return "";
      return raw
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\b([^aiAI\W\d])\s+([a-z]{2,})\b/gi, "$1$2")
        .replace(/\b([a-zA-Z]{2,})\s+([^aiAI\W\d])\s+([a-zA-Z]{2,})\b/gi, "$1$2$3")
        .replace(/\b([a-zA-Z]{2,})\s*\n\s*([a-z]{2,})\b/g, "$1$2")
        .replace(/\b([^aiAI\W\d])\s*\n\s*([a-zA-Z]+)\b/gi, "$1$2")
        .replace(/\b([A-Z])\s+(?=[A-Z]\b)/g, "$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    };

    let combinedText = "";
    const inlineDataParts: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith(".pdf")) continue;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (ocrMode) {
        inlineDataParts.push({
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: "application/pdf",
          },
        });
      } else {
        let text = "";
        try {
          const pdfData = await pdfParse(buffer);
          text = pdfData.text || "";
        } catch (err: any) {
          console.warn(`pdf-parse failed for ${file.name}:`, err.message);
        }
        text = cleanPDFText(text);
        if (text.trim().length > 0) {
          combinedText += `\n\n--- EXAM PAPER ${i + 1} (${file.name}) ---\n\n` + text;
        }
      }
    }

    if (!ocrMode && combinedText.trim().length < 50) {
      return NextResponse.json(
        { errorType: "NEEDS_OCR", error: "Image-based PDF detected. Switch to OCR mode." },
        { status: 400 }
      );
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
You are an advanced Academic AI Predictor.
Your goal is to deeply analyze the provided Previous Year Question (PYQ) papers for the subject: "${sanitizedSubject}".

Rules:
1. Identify exact repeated questions and conceptually similar questions that appear across the multiple papers.
2. Deduce the "Important Topics" and "Important Units" based on frequency of appearance.
3. Calculate a rough probability score (0-100) for each Unit/Module appearing in the upcoming exam based on historical weightage.
4. Extract the highest probability concepts/questions to focus on.
5. Provide actionable, smart insights.

Return the result STRICTLY as a JSON object matching this schema. Do not use markdown wrappers.

{
  "repeatedQuestions": [
    {
      "questionText": "string",
      "frequencyCount": number,
      "insight": "string"
    }
  ],
  "importantTopics": [
    {
      "topic": "string",
      "reason": "string"
    }
  ],
  "unitImportance": [
    {
      "unit": "string",
      "probabilityScore": number
    }
  ],
  "highProbabilityQuestions": [
    "string"
  ],
  "summaryInsight": "string"
}

${
  ocrMode
    ? "\nThe PYQ papers are attached as PDF documents. Please read them thoroughly using your OCR capabilities."
    : `\nCombined Exam Papers Text:\n${combinedText}`
}
`;

    const parts = [{ text: prompt }, ...inlineDataParts];
    const result = await model.generateContent(parts);
    const responseText = result.response.text().trim();

    let parsedData;
    try {
      const cleanedText = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedData = JSON.parse(cleanedText);
    } catch (parseError: any) {
      console.error("JSON Parsing Error:", parseError.message);
      return NextResponse.json(
        { error: "The AI generated an improperly formatted response. Please click predict again." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("PYQ Prediction Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze PYQs via Gemini AI." },
      { status: 500 }
    );
  }
}
