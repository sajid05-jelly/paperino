import { NextRequest, NextResponse } from "next/server";
import { runApiGuard } from "@/lib/api-guard";
import { verifyFeatureAccess, consumeFeatureUsage, refundFeatureUsage } from "@/lib/server-entitlement";
import { analyzeLargePYQ } from "@/services/groqService";

export const maxDuration = 60; // 60 seconds as multi-PDF parsing might take time

export async function POST(req: NextRequest) {
  /* ── Security: require auth + enforce server-side daily limit ── */
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  /* ── Check Daily AI Credits ── */
  const authHeader = req.headers.get("authorization");
  const entitlement = await verifyFeatureAccess(authHeader, 'pyqAnalyzer');
  
  if (entitlement.status !== "ALLOWED") {
    let statusCode = 403;
    if (entitlement.status === "LIMIT_REACHED" || entitlement.status === "FEATURE_NOT_AVAILABLE_FOR_PLAN") statusCode = 429;
    else if (entitlement.status === "AUTH_REQUIRED") statusCode = 401;
    else if (entitlement.status === "USAGE_VERIFICATION_UNAVAILABLE") statusCode = 503;
    
    return NextResponse.json({
      error: entitlement.error || "Access denied.",
      status: entitlement.status,
      plan: entitlement.plan,
      limit: entitlement.limit,
      used: entitlement.used
    }, { status: statusCode });
  }

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
    const extractedText = formData.get("extractedText") as string;

    if ((!files || files.length === 0) && !extractedText) {
      return NextResponse.json(
        { error: "Please provide at least one file or extracted text." },
        { status: 400 }
      );
    }
    
    if (!subject) {
      return NextResponse.json(
        { error: "Please provide a subject name." },
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

    let combinedText = extractedText || "";

    if (!extractedText) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.name.toLowerCase().endsWith(".pdf")) continue;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

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

    if (combinedText.trim().length < 50) {
      return NextResponse.json(
        { errorType: "NEEDS_OCR", error: "Image-based PDF detected. Switch to OCR mode." },
        { status: 400 }
      );
    }

    // CONSUME USAGE SAFELY BEFORE AI
    if (entitlement.uid && entitlement.limit !== Infinity) {
      const consumed = await consumeFeatureUsage(entitlement.uid, 'pyqAnalyzer');
      if (typeof consumed === 'boolean' ? !consumed : !consumed.allowed) {
          const errorMsg = (typeof consumed === 'object' ? consumed.error : null) || "Failed to allocate usage.";
          const isSystem = errorMsg.toLowerCase().includes("system error");
          return NextResponse.json({ 
            error: errorMsg,
            status: isSystem ? "USAGE_VERIFICATION_UNAVAILABLE" : "LIMIT_REACHED",
            limit: entitlement.limit, 
            plan: entitlement.plan 
          }, { status: isSystem ? 503 : 429 });
      }
    }

    // Process via Groq AI Service
    let parsedData;
    try {
      parsedData = await analyzeLargePYQ(combinedText, sanitizedSubject);
    } catch (aiErr: any) {
      console.error("PYQ AI Error:", aiErr);
      // Refund usage on AI failure
      if (entitlement.uid && entitlement.limit !== Infinity) {
        await refundFeatureUsage(entitlement.uid, 'pyqAnalyzer');
      }
      return NextResponse.json(
        { error: aiErr.message || "Failed to analyze PYQs via Groq AI." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("PYQ Prediction Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze PYQs via Groq AI." },
      { status: 500 }
    );
  }
}
