import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { runApiGuard } from "@/lib/api-guard";
import { generateJSONResponse } from "@/services/groqService";
import { checkAndGetCredits, incrementCreditUsage } from "@/lib/credits-manager";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  /* ── Security: ATS Maintenance Mode Check ── */
  if (adminDb) {
    try {
      const configDoc = await adminDb.collection("platform_config").doc("features").get();
      if (configDoc.exists) {
        const config = configDoc.data();
        if (config && config.atsEnabled === false) {
          return NextResponse.json(
            { error: config.maintenanceMessage || "ATS Analyzer is currently under maintenance." },
            { status: 403 }
          );
        }
      }
    } catch (e) {
      console.error("[ATS] Failed to check maintenance mode:", e);
    }
  }

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

  if (!rawText) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  if (body.mode === "dna") {
    return await handleDnaAnalysis(req, body, creditCheck);
  }

  if (!role) {
    return NextResponse.json({ error: "Role is required." }, { status: 400 });
  }

  const sanitizedRole = role.slice(0, 120).replace(/[<>"']/g, "");
  const optimizedText = rawText.slice(0, 10000);

  console.time(`ATS_Analysis`);
  
  // Phase 1: Pure Deterministic Extraction
  const extractionData = performDeterministicExtraction(rawText);

  // Phase 2: AI Parser (Only for semantic lists, NO SCORES)
  const prompt = `You are an expert Technical Recruiter and ATS parser for the role: "${sanitizedRole}".
Extract and categorize semantic data from the resume.
DO NOT GENERATE ANY SCORES.
Return STRICTLY JSON matching this schema:
{
  "requiredKeywords": ["string"], // Top 15 keywords expected for this job role
  "matchedKeywords": ["string"], // Which of the required keywords are actually present in the resume
  "missingKeywords": ["string"], // Which required keywords are missing
  "strongSkills": ["string"], // Top impressive skills found
  "missingSkills": ["string"], // Important industry skills they lack
  "recruiterSimulation": {
    "decision": "YES" | "MAYBE" | "NO",
    "topStrengths": ["string", "string"], // Exactly 2
    "topConcerns": ["string", "string"] // Exactly 2
  },
  "criticalIssues": ["string"], // Max 5 issues (e.g. "No GitHub link", "Missing core AWS skill")
  "actionableImprovements": [
    { "current": "string", "replacement": "string" } // Provide 3 exact text replacements
  ]
}

Resume Text:
${optimizedText}
`;

  let aiData;
  try {
    console.log(`[ATS] AI processing for semantic extraction via Groq...`);
    aiData = await generateJSONResponse(prompt);
  } catch (err: any) {
    console.error(`[ATS_ERROR_LOG] AI parsing failed: ${err.message}`);
    return NextResponse.json({ error: "AI parsing failed. Please try again." }, { status: 504 });
  }

  // Phase 3: Deterministic Scoring Engine
  const finalResult = calculateFinalScores(extractionData, aiData);

  // Increment credit usage
  if (creditCheck.uid && creditCheck.limit !== Infinity) {
    await incrementCreditUsage(creditCheck.uid, 'ats');
    if (adminDb) {
      try {
        await adminDb.collection("platform_stats").doc("global").set({
          atsUsage: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
      } catch (e) {}
    }
  }

  console.timeEnd(`ATS_Analysis`);
  return NextResponse.json(finalResult);
}

async function handleDnaAnalysis(req: NextRequest, body: any, creditCheck: any) {
  const rawText = body.text;
  const dreamRole = body.role || "Software Engineer";
  
  if (!rawText) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const optimizedText = rawText.slice(0, 10000);

  const prompt = `You are an expert Technical Recruiter and Career DNA Advisor.
Analyze the student resume text and extract/analyze ALL sections.
Target Dream Role: "${dreamRole}".

Return STRICTLY JSON matching this schema:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "linkedin": "string",
  "github": "string",
  "portfolio": "string",
  "college": "string",
  "degree": "string",
  "department": "string",
  "graduationYear": number,
  "cgpa": number,
  "languages": ["string"],
  "frameworks": ["string"],
  "tools": ["string"],
  "certifications": ["string"],
  "projects": ["string"],
  "detailedProjects": [
    {
      "title": "string",
      "technologies": ["string"],
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "industryRelevance": "string",
      "impact": "string",
      "missingInfo": "string",
      "atsKeywords": ["string"],
      "strengths": "string",
      "weaknesses": "string"
    }
  ],
  "detailedCertifications": [
    {
      "name": "string",
      "classification": "Cloud" | "Programming" | "AI" | "Networking" | "Security" | "Data",
      "valueForDreamRole": "string",
      "suggestions": ["string"]
    }
  ],
  "summary": "string"
}

Resume Text:
${optimizedText}
`;

  try {
    console.log("[ATS] Generating AI Career DNA parsing via Groq...");
    const parsed = await generateJSONResponse(prompt);

    // Increment credit usage
    if (creditCheck.uid && creditCheck.limit !== Infinity) {
      await incrementCreditUsage(creditCheck.uid, 'ats');
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("[ATS DNA Error]:", err.message);
    return NextResponse.json({ error: "Resume analysis failed: " + err.message }, { status: 500 });
  }
}

// ============================================================================
// 3. DETERMINISTIC SCORING ENGINE
// ============================================================================
function performDeterministicExtraction(text: string) {
  const lowerText = text.toLowerCase();
  
  // Project Quality indicators
  const hasBasicProjects = /(calculator|todo list|basic html|weather app)/.test(lowerText);
  const hasHighQualityProjects = /(production|deployed|users|ai |machine learning|full stack|system architecture|microservices)/.test(lowerText);
  
  // Experience indicators
  const hasInternship = lowerText.includes("internship") || lowerText.includes("intern ");
  const internshipCount = (lowerText.match(/internship|intern /g) || []).length;
  const hasIndustryExperience = /(software engineer|developer|manager|lead|architect)[\s\S]*?(full-time|present|202[0-9]|201[0-9])/i.test(lowerText) && !lowerText.includes("intern");
  const hasAcademicProjectsOnly = lowerText.includes("academic project") || lowerText.includes("coursework");
  
  // Impact indicators
  const hasMeasurableImpact = /\b\d+%\b/.test(lowerText) || /\b(increased|reduced|improved|achieved|optimized|scaled)[\s\S]{0,30}?\b\d+\b/i.test(lowerText);
  const hasStrongMeasurableImpact = /\b(increased|reduced|improved|achieved|optimized|scaled)[\s\S]{0,30}?\b\d+(%|x|\+ users)\b/i.test(lowerText);

  // Formatting checks
  const hasComplexLayout = /\s{10,}/.test(lowerText); // Very large blocks of whitespace indicate complex layouts/tables
  
  return {
    hasEmail: lowerText.includes("@") || lowerText.includes("mail"),
    hasPhone: /\d{10}/.test(lowerText) || /\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(lowerText),
    hasLinkedIn: lowerText.includes("linkedin.com") || lowerText.includes("linkedin"),
    hasGitHub: lowerText.includes("github.com") || lowerText.includes("github"),
    
    hasEducation: lowerText.includes("education") || lowerText.includes("university") || lowerText.includes("college"),
    hasDegree: lowerText.includes("bachelor") || lowerText.includes("b.tech") || lowerText.includes("degree") || lowerText.includes("master"),
    hasGPA: lowerText.includes("cgpa") || lowerText.includes("gpa") || lowerText.includes("%"),
    
    hasSkills: lowerText.includes("skills") || lowerText.includes("technologies") || lowerText.includes("expertise"),
    hasProjects: lowerText.includes("project") || lowerText.includes("portfolio"),
    hasExperience: lowerText.includes("experience") || lowerText.includes("internship") || lowerText.includes("work history"),
    
    hasBasicProjects,
    hasHighQualityProjects,
    hasInternship,
    internshipCount,
    hasIndustryExperience,
    hasAcademicProjectsOnly,
    hasMeasurableImpact,
    hasStrongMeasurableImpact,
    hasComplexLayout,
    
    wordCount: text.split(/\s+/).length
  };
}

function calculateFinalScores(ext: any, ai: any) {
  // 1. ATS Compatibility (Max 100 - Weight: 20%)
  let atsScore = 100;
  let atsChecks = {
    contact: ext.hasEmail && ext.hasPhone,
    education: ext.hasEducation,
    skills: ext.hasSkills,
    projects: ext.hasProjects,
    experience: ext.hasExperience
  };
  let atsIssues = [];
  if (!atsChecks.contact) { atsScore -= 15; atsIssues.push("Missing complete contact info (Email/Phone)"); }
  if (!atsChecks.education) { atsScore -= 10; atsIssues.push("Missing clear Education section"); }
  if (!atsChecks.skills) { atsScore -= 10; atsIssues.push("Missing clear Skills section"); }
  if (!atsChecks.projects) { atsScore -= 10; atsIssues.push("Missing clear Projects section"); }
  if (!atsChecks.experience) { atsScore -= 10; atsIssues.push("Missing clear Experience section"); }
  if (ext.hasComplexLayout) { atsScore -= 15; atsIssues.push("Detected complex layout or tables that ATS may fail to parse."); }

  // 2. Keyword Match (Max 100 - Weight: 25%)
  const reqLen = Math.max(1, ai.requiredKeywords?.length || 1);
  const matchedLen = ai.matchedKeywords?.length || 0;
  let keywordScore = Math.min(100, Math.round((matchedLen / reqLen) * 100));
  if (matchedLen < reqLen) {
    // Never show 100% unless every important keyword exists
    keywordScore = Math.min(99, keywordScore);
  }

  // 3. Skills Coverage (Max 100 - Weight: 15%)
  let skillsScore = ext.hasSkills ? 40 : 0;
  skillsScore += Math.min(60, (ai.strongSkills?.length || 0) * 10);
  if (ai.missingSkills?.length > 0) {
    skillsScore -= (ai.missingSkills.length * 5); // penalty for missing industry skills
  }

  // 4. Projects Quality (Max 100 - Weight: 10%)
  let projectsScore = ext.hasProjects ? 40 : 10;
  if (ext.hasGitHub) projectsScore += 15;
  if (ext.hasBasicProjects && !ext.hasHighQualityProjects) projectsScore = 50; // Low quality cap
  if (ext.hasHighQualityProjects) projectsScore += 30;
  if (ext.hasMeasurableImpact) projectsScore += 15;

  // 5. Experience Strength (Max 100 - Weight: 15%)
  let expScore = 30; // No Experience
  if (ext.hasAcademicProjectsOnly) expScore = 40;
  if (ext.hasInternship) expScore = 60;
  if (ext.internshipCount > 1) expScore = 80;
  if (ext.hasIndustryExperience) expScore = 95;

  // 6. Achievements & Impact (Max 100 - Weight: 10%)
  let achScore = 30; // Weak baseline
  if (ext.hasMeasurableImpact) achScore = 70;
  if (ext.hasStrongMeasurableImpact) achScore = 100;

  // 7. Formatting Quality (Max 100 - Weight: 5%)
  let fmtScore = 100;
  if (ext.wordCount < 150) fmtScore -= 30;
  if (ext.wordCount > 1000) fmtScore -= 20;
  if (ext.hasComplexLayout) fmtScore -= 20;

  // Bound all scores
  atsScore = Math.max(0, Math.min(100, atsScore));
  keywordScore = Math.max(0, Math.min(100, keywordScore));
  skillsScore = Math.max(0, Math.min(100, skillsScore));
  projectsScore = Math.max(0, Math.min(100, projectsScore));
  expScore = Math.max(0, Math.min(100, expScore));
  achScore = Math.max(0, Math.min(100, achScore));
  fmtScore = Math.max(0, Math.min(100, fmtScore));

  // Overall Score (Weighted Average)
  const overallScore = Math.round(
    (atsScore * 0.20) +
    (keywordScore * 0.25) +
    (skillsScore * 0.15) +
    (projectsScore * 0.10) +
    (expScore * 0.15) +
    (achScore * 0.10) +
    (fmtScore * 0.05)
  );

  let benchmark = "Poor";
  if (overallScore >= 93) benchmark = "Exceptional";
  else if (overallScore >= 86) benchmark = "Excellent";
  else if (overallScore >= 76) benchmark = "Good";
  else if (overallScore >= 61) benchmark = "Average";
  else if (overallScore >= 41) benchmark = "Needs Improvement";

  return {
    overallScore,
    atsCompatibility: { score: atsScore, checks: atsChecks, issues: atsIssues },
    keywordMatch: { score: keywordScore, matched: ai.matchedKeywords || [], missing: ai.missingKeywords || [] },
    skillsAnalysis: { score: skillsScore, strong: ai.strongSkills || [], missing: ai.missingSkills || [] },
    projectsQuality: { score: projectsScore },
    experienceAnalysis: { score: expScore },
    achievementsAnalysis: { score: achScore },
    educationQuality: { score: ext.hasEducation ? (ext.hasDegree ? 95 : 70) : 0 }, // For backward compatibility if UI still expects education, we mock a strict score
    formattingQuality: { score: fmtScore },
    sectionScores: {
      skills: skillsScore,
      projects: projectsScore,
      experience: expScore,
      achievements: achScore,
      education: ext.hasEducation ? (ext.hasDegree ? 95 : 70) : 0,
      contact: (ext.hasEmail ? 50 : 0) + (ext.hasPhone ? 50 : 0),
      formatting: fmtScore
    },
    recruiterSimulation: ai.recruiterSimulation || { decision: "MAYBE", topStrengths: [], topConcerns: [] },
    criticalIssues: ai.criticalIssues?.slice(0, 5) || [],
    actionableImprovements: ai.actionableImprovements || [],
    industryBenchmark: benchmark
  };
}
