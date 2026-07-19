import { NextRequest, NextResponse } from "next/server";
import { runApiGuard } from "@/lib/api-guard";
import { generateJSONResponse } from "@/services/groqService";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Run Security API Guard & Token Auth
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized: Missing authentication credentials" }, { status: 401 });
  }

  const token = authHeader.substring(7);
  let uid = "";
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
  } catch (err) {
    return NextResponse.json({ error: "Unauthorized: Session is invalid or expired" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const profile = body.profile;

    if (!profile) {
      return NextResponse.json({ error: "Missing profile parameters" }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    }

    // 2. Query Context: Paperino Pulse (Hiring News)
    let pulseNewsText = "";
    try {
      const pulseSnap = await adminDb
        .collection("pulse_updates")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      const news: string[] = [];
      pulseSnap.forEach((doc) => {
        const d = doc.data();
        if (d.title || d.content) {
          news.push(`- ${d.title || ""}: ${d.content || ""}`);
        }
      });
      pulseNewsText = news.join("\n");
    } catch (e) {
      console.warn("[Career DNA API] Pulse context fetch skipped:", e);
    }

    // 3. Query Context: Senior Insights
    let seniorInsightsText = "";
    try {
      const insightsSnap = await adminDb
        .collection("survival_notes")
        .where("status", "==", "approved")
        .limit(15)
        .get();
      const tips: string[] = [];
      insightsSnap.forEach((doc) => {
        const d = doc.data();
        tips.push(`- [Subject: ${d.subjectName || d.subjectId}] [Topic: ${d.category}] Contributor tip: ${d.advice || ""}`);
      });
      seniorInsightsText = tips.join("\n");
    } catch (e) {
      console.warn("[Career DNA API] Senior insights context fetch skipped:", e);
    }

    // 4. Construct Groq AI prompt
    const prompt = `You are the ultimate Career DNA AI Mentor for students at Paperino (the premium study hub).
Analyze the student's profile, academic stats, skills, resume, campus recruitment news, and senior insights to provide personalized career recommendations and guidance.

STUDENT PROFILE DATA:
- Name: ${profile.fullName}
- College: ${profile.college}
- Department: ${profile.department}
- Current Year: ${profile.currentYear}
- Graduation Year: ${profile.graduationYear}
- Dream Role: ${profile.dreamRole}
- Dream Company: ${profile.dreamCompany}
- Preferred Location: ${profile.preferredLocation}
- Goals: ${profile.goal}
- Academic Performance:
  - CGPA: ${profile.cgpa}
  - 10th Percentage: ${profile.tenthPercentage}%
  - 12th Percentage: ${profile.twelfthPercentage}%
  - Active Backlogs: ${profile.activeBacklogs}
- Technical Profile:
  - Languages: ${profile.languages?.join(", ") || "None specified"}
  - Frameworks: ${profile.frameworks?.join(", ") || "None specified"}
  - Tools: ${profile.tools?.join(", ") || "None specified"}
  - Certifications: ${profile.certifications?.join(", ") || "None specified"}
  - Projects: ${profile.projects?.join("\n") || "None specified"}
  - GitHub URL: ${profile.github || "None provided"}
  - LinkedIn: ${profile.linkedin || "None provided"}
  - Resume Text (parsed): ${profile.resumeText || "No resume uploaded"}

PAPERINO CAMPUS RECRUITMENT NEWS (PULSE):
${pulseNewsText || "No campus updates available at the moment."}

SENIOR ACADEMIC SURVIVAL NOTES:
${seniorInsightsText || "No senior advice available."}

RULES:
1. Evaluate user's profile and determine an internal Readiness Score (0 to 100). Do NOT output the numeric score.
   Instead map it to one of these:
   - "High Ready" (CGPA >= 8.5, good projects/skills, no backlogs, GitHub/Resume present)
   - "Medium Ready" (CGPA 7.0-8.5, some skills, minimal backlogs)
   - "Beginner" (CGPA < 7.0 or missing key skills/profiles, active backlogs)
2. Generate 4-6 specific job/internship recommendations matching their Dream Role/Company and technical profile.
3. Classify matches into "High Match", "Medium Match", or "Stretch Opportunity" using the student's profile qualifications.
4. PLACEMENT MODE: If the student is in their final year (Year 4, or graduation year is soon), prioritize Full-time Placement opportunities. Otherwise, prioritize Internships.
5. In eligibilityBreakdown, if a student has active backlogs, CGPA below 8.0, missing Github, or missing resume, mark them as NOT eligible for High/Medium matches and list the explicit reasons (e.g. "Resume missing", "GitHub missing", "CGPA below requirement", etc.) and action items to improve.
6. Generate 4-6 personalized improvement suggestions (e.g., "Add GitHub profile", "Upload your resume", "Clear active backlogs", etc.).
7. Return ONLY valid, strict JSON matching this schema:
{
  "readinessLevel": "High Ready" | "Medium Ready" | "Beginner",
  "suggestions": ["string"],
  "opportunities": [
    {
      "id": "string", // Unique ID
      "role": "string", // Job Role Title
      "company": "string", // Hiring Company Name
      "location": "string", // Job Location
      "type": "Internship" | "Placement" | "Higher Studies",
      "matchLevel": "High Match" | "Medium Match" | "Stretch Opportunity",
      "matchScore": number, // 0-100 hidden score
      "matchReasons": ["string"], // Checked qualifications (e.g. "✔ React Found")
      "missingSkills": ["string"], // Skills required but missing
      "applyLink": "string", // Apply URL or dummy link
      "eligibilityBreakdown": {
        "isEligible": boolean,
        "reasons": ["string"], // Reasons why they are not eligible (empty if eligible)
        "suggestions": ["string"] // Actionable advice to become eligible
      }
    }
  ]
}
`;

    console.log(`[Career DNA API] Requesting AI Analysis for user: ${uid}...`);
    const response = await generateJSONResponse(prompt);

    // Save Career DNA analysis & profile history in database
    await adminDb.collection("career_dna").doc(uid).set({
      profile,
      analysis: response,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[Career DNA API] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze career data" }, { status: 500 });
  }
}
