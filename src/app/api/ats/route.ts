import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { runApiGuard } from "@/lib/api-guard";
import { checkAndGetCredits, incrementCreditUsage } from "@/lib/credits-manager";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  /* ── Security: require auth + enforce server-side daily limit ── */
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  /* ── Check Daily AI Credits ── */
  const authHeader = req.headers.get("authorization");
  const creditCheck = await checkAndGetCredits(authHeader, 'ats');
  
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: creditCheck.error || "Credit limit reached or unauthorized." },
      { status: 429 }
    );
  }

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      return await handleExtraction(req);
    } else if (contentType.includes("application/json")) {
      return await handleAnalysis(req, creditCheck);
    } else {
      return NextResponse.json({ error: "Unsupported Content-Type." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[ATS] Uncaught error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// ============================================================================
// 1. EXTRACTION HANDLER
// ============================================================================
async function handleExtraction(req: NextRequest) {
  console.log("[ATS] Starting file extraction...");
  
  // Polyfill DOM elements for pdf.js running in Node
  if (typeof global !== "undefined") {
    if (!global.DOMMatrix) global.DOMMatrix = class DOMMatrix {} as any;
    if (!global.ImageData) global.ImageData = class ImageData {} as any;
    if (!global.Path2D) global.Path2D = class Path2D {} as any;
  }

  const pdfParseModule = require("pdf-parse");
  const pdfParse =
    typeof pdfParseModule === "function"
      ? pdfParseModule
      : pdfParseModule.default;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  // Limit 1: Max 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds the 5 MB limit. Please compress your resume." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  let text = "";
  let pageCount = 0;

  if (file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text || "";
      pageCount = pdfData.numpages || 1;
    } catch (err: any) {
      console.warn("[ATS] pdf-parse failed, falling back to pdf2json:", err.message);
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
        // We cannot reliably get page count from raw text output of pdf2json, default to 1.
        pageCount = 1;
      } catch (fallbackErr: any) {
        console.error("[ATS] Fallback pdf2json failed:", fallbackErr.message);
      }
    }
  } else if (file.name.toLowerCase().endsWith(".docx")) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
      pageCount = 1; // Docx page count isn't easily extracted, assume 1
    } catch (err: any) {
      console.error("[ATS] DOCX parsing failed:", err.message);
      return NextResponse.json({ error: "Failed to parse DOCX file." }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Unsupported file type. Please upload PDF or DOCX." }, { status: 400 });
  }

  // Limit 2: Max 3 pages
  if (pageCount > 3) {
    return NextResponse.json({ error: `Resume is too long (${pageCount} pages). Maximum allowed is 3 pages.` }, { status: 400 });
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

  text = cleanPDFText(text);

  const cleanTextForCounting = text.replace(/[^a-zA-Z0-9\s\.\@\+\-]/g, " ").toLowerCase();
  const words = cleanTextForCounting.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  if (wordCount < 30) {
    return NextResponse.json(
      { error: "Invalid Resume: The document contains too little text. If this is an image-based PDF, please convert it to a standard text PDF." },
      { status: 400 }
    );
  }

  console.log(`[ATS] Extraction complete. Words: ${wordCount}, Pages: ${pageCount}`);
  return NextResponse.json({ text, pageCount });
}

// ============================================================================
// 2. ANALYSIS HANDLER
// ============================================================================
async function handleAnalysis(req: NextRequest, creditCheck: any) {
  const body = await req.json();
  const rawText = body.text;
  const role = body.role;
  const action = body.action; // 'score' | 'keywords' | 'skills' | 'suggestions'

  if (!rawText || !role || !action) {
    return NextResponse.json({ error: "Text, role, and action are required." }, { status: 400 });
  }

  const sanitizedRole = role.slice(0, 120).replace(/[<>"']/g, "");
  const optimizedText = rawText.slice(0, 10000);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  // Note: We'll define the generation config dynamically based on the action
  let generationConfig: any = { responseMimeType: "application/json" };


  console.time(`ATS_Action_${action}`);
  let prompt = "";
  
  if (action === "score") {
    const scoreData = calculateDeterministicScore(rawText);
    console.timeEnd(`ATS_Action_${action}`);
    console.log(`[ATS] Deterministic Score Calculation Complete.`);
    return NextResponse.json(scoreData);
  } else if (action === "keywords") {
    prompt = `You are an ATS Analyzer for the role: "${sanitizedRole}". Calculate keyword match percentage. Return STRICTLY JSON:
{ "keywordMatchPercentage": number }
Resume: ${optimizedText}`;
  } else if (action === "skills") {
    prompt = `You are an ATS Analyzer for the role: "${sanitizedRole}". Identify missing critical skills from the resume and group them by category. Check for fake/corrupted PDF extraction. Return STRICTLY JSON:
{ 
  "missingSkills": { 
    "frontend": ["string"], 
    "backend": ["string"], 
    "database": ["string"], 
    "cloud": ["string"], 
    "devops": ["string"], 
    "testing": ["string"] 
  }, 
  "isFakeOrCorrupted": boolean, 
  "fakeReason": "string" 
}
Resume: ${optimizedText}`;
  } else if (action === "suggestions") {
    generationConfig.responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        executiveSummary: {
          type: SchemaType.OBJECT,
          properties: {
            topStrengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            topWeaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          }
        },
        recruiterPerspective: {
          type: SchemaType.OBJECT,
          properties: {
            strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            concerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            hiringReadiness: { type: SchemaType.NUMBER }
          }
        },
        atsPassProbability: { type: SchemaType.NUMBER },
        industryBenchmark: { type: SchemaType.STRING },
        topActionItems: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        issues: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              type: { type: SchemaType.STRING },
              priority: { type: SchemaType.STRING },
              section: { type: SchemaType.STRING },
              message: { type: SchemaType.STRING },
              currentText: { type: SchemaType.STRING },
              suggestedText: { type: SchemaType.STRING }
            }
          }
        }
      },
      required: ["executiveSummary", "recruiterPerspective", "atsPassProbability", "industryBenchmark", "topActionItems", "issues"]
    };

    prompt = `You are an expert ATS Analyzer and Technical Recruiter for the role: "${sanitizedRole}". Evaluate the resume and return STRICTLY JSON. 
You MUST include ALL 6 of these top-level keys exactly as written, without dropping any.
IMPORTANT RULES:
- Keep all feedback concise (maximum 2-3 lines per message).
- Limit the "issues" array to a MAXIMUM of 4 critical/important items to prioritize quality.
- Ensure "issues" focus on actionable text improvements.
- "industryBenchmark" should be a short phrase like "Top 10% of applicants" or "Below Average".
Resume: ${optimizedText}`;
  } else {
    console.timeEnd(`ATS_Action_${action}`);
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  let responseText = "";
  let attempts = 0;
  let success = false;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig,
  });

  while (attempts < 2 && !success) {
    try {
      attempts++;
      console.log(`[ATS] AI Attempt ${attempts} for ${action}...`);
      const result = await model.generateContent(prompt);
      responseText = result.response.text().trim();
      success = true;
    } catch (err: any) {
      console.error(`[ATS] AI Attempt ${attempts} failed for ${action}:`, err.message);
      if (attempts >= 2) {
        console.timeEnd(`ATS_Action_${action}`);
        return NextResponse.json({ error: `AI timed out processing ${action}.` }, { status: 504 });
      }
    }
  }

  if (responseText.startsWith("\`\`\`json")) {
    responseText = responseText.replace(/^\`\`\`json\n?/, "").replace(/\n?\`\`\`$/, "").trim();
  } else if (responseText.startsWith("\`\`\`")) {
    responseText = responseText.replace(/^\`\`\`\n?/, "").replace(/\n?\`\`\`$/, "").trim();
  }

  let parsedData;
  try {
    parsedData = JSON.parse(responseText);
  } catch (parseError) {
    console.error(`[ATS] Invalid JSON for ${action}:`, responseText);
    console.timeEnd(`ATS_Action_${action}`);
    return NextResponse.json({ error: `Failed to parse AI output for ${action}.` }, { status: 500 });
  }

  // Increment credit usage only on the final step (suggestions) to avoid 4x deduction
  if (action === "suggestions" && creditCheck.uid && creditCheck.limit !== Infinity) {
    await incrementCreditUsage(creditCheck.uid, 'ats');
    if (adminDb) {
      try {
        await adminDb.collection("platform_stats").doc("global").set({
          atsUsage: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
      } catch (e) {}
    }
  }

  console.timeEnd(`ATS_Action_${action}`);
  console.log(`[ATS] AI Analysis Complete for ${action}.`);
  return NextResponse.json(parsedData);
}

// ============================================================================
// 3. DETERMINISTIC SCORING ENGINE
// ============================================================================
function calculateDeterministicScore(text: string) {
  const lowerText = text.toLowerCase();
  
  const explanations = {
    contact: [] as string[],
    education: [] as string[],
    skills: [] as string[],
    projects: [] as string[],
    experience: [] as string[],
    formatting: [] as string[]
  };

  let contactScore = 0;
  if (lowerText.includes("@") || lowerText.includes("mail")) { contactScore += 40; explanations.contact.push("+40: Email address found"); }
  else { explanations.contact.push("-40: Missing email address"); }
  if (/\d{10}/.test(lowerText) || /\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(lowerText)) { contactScore += 30; explanations.contact.push("+30: Phone number found"); }
  else { explanations.contact.push("-30: Missing phone number"); }
  if (lowerText.includes("linkedin.com") || lowerText.includes("linkedin")) { contactScore += 15; explanations.contact.push("+15: LinkedIn profile found"); }
  else { explanations.contact.push("-15: Missing LinkedIn profile"); }
  if (lowerText.includes("github.com") || lowerText.includes("github")) { contactScore += 15; explanations.contact.push("+15: GitHub profile found"); }
  else { explanations.contact.push("-15: Missing GitHub profile"); }
  
  let educationScore = 0;
  if (lowerText.includes("education") || lowerText.includes("university") || lowerText.includes("college") || lowerText.includes("institute") || lowerText.includes("school")) { educationScore += 40; explanations.education.push("+40: Education section identified"); }
  else { explanations.education.push("-40: Missing clear Education section"); }
  if (lowerText.includes("bachelor") || lowerText.includes("b.tech") || lowerText.includes("degree") || lowerText.includes("b.e") || lowerText.includes("bsc") || lowerText.includes("master")) { educationScore += 30; explanations.education.push("+30: Degree identifier found"); }
  else { explanations.education.push("-30: Missing degree identifier"); }
  if (lowerText.includes("cgpa") || lowerText.includes("gpa") || lowerText.includes("%") || /\b20\d{2}\b/.test(lowerText)) { educationScore += 30; explanations.education.push("+30: Graduation year/GPA found"); }
  else { explanations.education.push("-30: Missing graduation year or GPA metrics"); }
  
  let skillsScore = 0;
  if (lowerText.includes("skills") || lowerText.includes("technologies") || lowerText.includes("expertise") || lowerText.includes("languages")) { skillsScore += 30; explanations.skills.push("+30: Skills section identified"); }
  else { explanations.skills.push("-30: Missing clear Skills section"); }
  const commonTech = ["javascript", "python", "java", "react", "node", "sql", "aws", "docker", "html", "css", "c++", "c#", "git", "linux", "api", "typescript", "kubernetes", "azure", "gcp", "spring", "django", "express", "mongodb", "postgresql", "mysql"];
  let techCount = commonTech.filter(tech => lowerText.includes(tech)).length;
  skillsScore += Math.min(70, techCount * 10);
  if (techCount > 0) explanations.skills.push(`+${Math.min(70, techCount * 10)}: Found ${techCount} core technical skills`);
  else explanations.skills.push("-70: No core technical skills detected");
  
  let projectsScore = 0;
  if (lowerText.includes("project") || lowerText.includes("portfolio")) { projectsScore += 30; explanations.projects.push("+30: Projects section identified"); }
  else { explanations.projects.push("-30: Missing clear Projects section"); }
  if (lowerText.includes("developed") || lowerText.includes("built") || lowerText.includes("created") || lowerText.includes("implemented") || lowerText.includes("architected") || lowerText.includes("designed")) { projectsScore += 70; explanations.projects.push("+70: Strong action verbs found in projects"); }
  else { explanations.projects.push("-70: Weak action verbs in projects"); }
  
  let experienceScore = 0;
  if (lowerText.includes("experience") || lowerText.includes("internship") || lowerText.includes("work history") || lowerText.includes("employment")) { experienceScore += 40; explanations.experience.push("+40: Experience/Internship section identified"); }
  else { explanations.experience.push("-40: Missing clear Experience section"); }
  if (lowerText.includes("intern") || lowerText.includes("developer") || lowerText.includes("engineer") || lowerText.includes("role") || lowerText.includes("freelance") || lowerText.includes("software")) { experienceScore += 60; explanations.experience.push("+60: Professional roles detected"); }
  else { explanations.experience.push("-60: Missing professional roles/titles"); }

  let formattingScore = 0;
  if (text.length > 500 && text.length < 15000) { formattingScore += 40; explanations.formatting.push("+40: Optimal resume length"); }
  else { explanations.formatting.push("-40: Resume length is too short or too long"); }
  const headers = ["education", "experience", "projects", "skills", "summary", "objective"];
  let headerCount = headers.filter(h => lowerText.includes(h)).length;
  formattingScore += Math.min(60, headerCount * 15);
  explanations.formatting.push(`+${Math.min(60, headerCount * 15)}: Found ${headerCount} standard formatting headers`);
  
  contactScore = Math.min(100, contactScore);
  educationScore = Math.min(100, Math.max(0, educationScore));
  skillsScore = Math.min(100, Math.max(0, skillsScore));
  projectsScore = Math.min(100, Math.max(0, projectsScore));
  experienceScore = Math.min(100, Math.max(0, experienceScore));
  formattingScore = Math.min(100, Math.max(0, formattingScore));

  const overallScore = Math.round(
    (skillsScore * 0.25) + 
    (projectsScore * 0.25) + 
    (experienceScore * 0.20) + 
    (educationScore * 0.10) + 
    (contactScore * 0.10) + 
    (formattingScore * 0.10)
  );

  return {
    overallScore,
    sectionScores: {
      skills: skillsScore,
      projects: projectsScore,
      experience: experienceScore,
      education: educationScore,
      contact: contactScore,
      formatting: formattingScore
    },
    explanations
  };
}
