import { NextRequest, NextResponse } from "next/server";
import { runApiGuard } from "@/lib/api-guard";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';
import { INITIAL_INTERNSHIPS, rankOpportunitiesForUser } from "@/services/internshipService";
import { InternshipManager } from "@/services/internshipProviders/manager";
import { Internship } from "@/types/internship";

export const maxDuration = 60;

// OpenRouter Settings
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || "";

/**
 * Normalizes title for deduplication matching
 */
function normalizeTitle(t: string): string {
  return (t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Fetches active internship listings directly from Firestore pulse_updates (Knowafest, Admin, etc.)
 * AND combines live aggregated listings (Unstop, Devfolio, etc.) from InternshipManager.
 * Merges duplicate entries across sources into single opportunity cards.
 */
async function fetchPulseInternships(forceSync = false): Promise<Internship[]> {
  const allRawInternships: any[] = [];

  // 1. Fetch Firestore pulse_updates internships (Knowafest, Admin posts, etc.)
  try {
    if (adminDb) {
      const snap = await adminDb
        .collection("pulse_updates")
        .where("category", "in", ["Internship", "Internships"])
        .get();

      if (!snap.empty) {
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          allRawInternships.push({
            id: docSnap.id,
            title: d.title,
            company: d.organizer || d.college || d.company || "Paperino Partner",
            companyLogo: d.imageUrl || "https://knowafest.com/favicon.ico",
            location: d.location || d.city || "Remote",
            workType: (d.mode || d.eventMode || d.location || "").toLowerCase().includes("remote")
              ? "Remote"
              : (d.mode || d.eventMode || "").toLowerCase().includes("hybrid")
              ? "Hybrid"
              : "Onsite",
            type: "Internship",
            stipend: d.stipend || d.registrationFee || "Standard Stipend",
            duration: d.duration || "3-6 Months",
            departmentEligibility: d.eligibleBatches ? [d.eligibleBatches] : ["All"],
            minYear: 1,
            minCgpa: 6.0,
            requiredSkills: Array.isArray(d.tags) ? d.tags.filter((t: string) => !["knowafest", "internship", "internships", "online", "offline"].includes(t.toLowerCase())) : [],
            targetRoles: [d.title],
            applyUrl: d.link || d.registrationUrl || d.officialEventUrl || d.applyUrl || "",
            postedDate: d.createdAt?.toDate ? d.createdAt.toDate().getTime() : Date.now() - 2 * 24 * 60 * 60 * 1000,
            deadline: d.deadline?.toDate ? d.deadline.toDate().getTime() : Date.now() + 30 * 24 * 60 * 60 * 1000,
            verified: d.verifiedSource !== false,
            source: d.sourceName || d.source || "Knowafest",
            sources: Array.isArray(d.sources) ? d.sources : [d.sourceName || d.source || "Knowafest"],
            active: true,
          });
        });
      }
    }
  } catch (err) {
    console.error("[Career DNA API] Error reading Firestore pulse_updates:", err);
  }

  // 2. Fetch Live Unstop / Provider Internships via InternshipManager
  try {
    const manager = new InternshipManager();
    const unstopItems = await manager.getAggregatedInternships(forceSync);
    unstopItems.forEach((item) => {
      allRawInternships.push({
        id: item.id,
        title: item.title,
        company: item.company || "Unstop Partner",
        companyLogo: item.companyLogo || "https://unstop.com/favicon.ico",
        location: item.location || "Remote",
        workType: item.location?.toLowerCase().includes("remote") ? "Remote" : "Onsite",
        type: "Internship",
        stipend: "Unstop Stipend Standard",
        duration: "3-6 Months",
        departmentEligibility: item.eligibility?.departments || ["All"],
        minYear: item.eligibility?.targetYears?.[0] || 1,
        minCgpa: item.eligibility?.minCgpa || 6.0,
        requiredSkills: item.skills || [],
        targetRoles: [item.title],
        applyUrl: item.applyUrl,
        postedDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
        deadline: item.deadline ? new Date(item.deadline).getTime() : Date.now() + 30 * 24 * 60 * 60 * 1000,
        verified: true,
        source: "Unstop",
        sources: ["Unstop"],
        active: true,
      });
    });
  } catch (err) {
    console.error("[Career DNA API] Error reading Unstop internships via InternshipManager:", err);
  }

  // Fallback to INITIAL_INTERNSHIPS if empty
  if (allRawInternships.length === 0) {
    return INITIAL_INTERNSHIPS;
  }

  // 3. Deduplicate & Merge duplicate opportunities across sources (Knowafest + Unstop + Devfolio)
  const mergedMap = new Map<string, any>();

  for (const item of allRawInternships) {
    const normKey = normalizeTitle(item.title);
    const itemSources = item.sources || [item.source || "Paperino Pulse"];

    if (mergedMap.has(normKey)) {
      const existing = mergedMap.get(normKey);
      const combinedSources = Array.from(new Set([...existing.sources, ...itemSources]));
      existing.sources = combinedSources;
      if (!existing.applyUrl && item.applyUrl) {
        existing.applyUrl = item.applyUrl;
      }
    } else {
      mergedMap.set(normKey, item);
    }
  }

  const mergedInternships: Internship[] = Array.from(mergedMap.values());
  const now = Date.now();
  return mergedInternships.filter((item) => !item.deadline || item.deadline > now);
}

export async function POST(req: NextRequest) {
  // ── Security: Require Auth & Rate Limiting Guard ──
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  try {
    const body = await req.json();
    const { profile, forceSync } = body;
    const uid = guard.uid;

    if (!profile) {
      return NextResponse.json({ error: "Profile payload is required." }, { status: 400 });
    }

    // ── 1. Fetch & Rank Pulse Opportunities from Firestore & Live Aggregator ──
    const allInternships = await fetchPulseInternships(!!forceSync);
    const rankedOpportunities = rankOpportunitiesForUser(profile, allInternships);

    // Map opportunities format to standard response interface with sources array
    const finalOpportunities = rankedOpportunities.map(opp => ({
      id: opp.id,
      role: opp.title,
      company: opp.company,
      companyLogo: opp.companyLogo,
      location: opp.location,
      workType: opp.workType,
      type: opp.type,
      stipend: opp.stipend,
      duration: opp.duration,
      matchLevel: opp.matchLevel,
      matchScore: opp.matchScore,
      matchReasons: opp.matchReasons,
      matchedSkills: (opp as any).matchedSkills || (opp.requiredSkills || []).filter(sk => !opp.missingSkills.includes(sk)),
      requiredSkills: opp.requiredSkills || [],
      missingSkills: opp.missingSkills,
      applyLink: opp.applyUrl,
      postedDate: opp.postedDate,
      deadline: opp.deadline,
      verified: true,
      source: opp.source || "Paperino Pulse",
      sources: (opp as any).sources || [opp.source || "Paperino Pulse"],
      eligibilityBreakdown: {
        isEligible: opp.matchScore >= 60,
        reasons: opp.matchReasons,
        suggestions: opp.actionSuggestions
      }
    }));

    // Calculate overall Career Readiness score
    const readinessLevel = Math.min(100, Math.max(30, Math.round(
      ((profile.cgpa || 8.0) * 4) +
      (((profile.languages || []).length + (profile.frameworks || []).length + (profile.tools || []).length) * 3) +
      ((profile.projects || []).length * 8) +
      (profile.resumeText ? 15 : 0)
    )));

    // ── 2. AI Caching & Profile Change Controller ──
    const todayStr = new Date().toISOString().split("T")[0];
    const lastSyncedAt = Date.now();

    const dbInstance = adminDb;
    let savedData: any = null;
    let userDnaRef: any = null;

    if (dbInstance) {
      try {
        userDnaRef = dbInstance.collection("career_dna").doc(uid);
        const docSnap = await userDnaRef.get();
        if (docSnap.exists) {
          savedData = docSnap.data();
        }
      } catch (dbErr: any) {
        console.warn("[Career DNA API] Firestore read skipped due to Quota / DB notice:", dbErr?.message || dbErr);
      }
    }

    const profileHashStr = JSON.stringify({
      dreamRole: profile.dreamRole || "",
      cgpa: profile.cgpa || 8.0,
      skills: [...(profile.languages || []), ...(profile.frameworks || []), ...(profile.tools || [])],
      projects: profile.projects || [],
      resumeText: profile.resumeText || ""
    });

    let usage = savedData?.usage || {
      lastResetDate: todayStr,
      skillGapCount: 0
    };

    if (usage.lastResetDate !== todayStr) {
      usage = { lastResetDate: todayStr, skillGapCount: 0 };
    }

    // If profile hasn't changed and forceSync is false, return cached AI analysis with refreshed opportunities
    if (!forceSync && savedData && savedData.profileHash === profileHashStr && savedData.analysis) {
      console.log(`[Career DNA AI Cache] Returning cached analysis for: ${uid}`);
      return NextResponse.json({
        readinessLevel,
        opportunities: finalOpportunities,
        lastSyncedAt,
        ...savedData.analysis
      });
    }

    // ── 3. OpenRouter AI Skill Gap & Roadmap Analysis ──
    let aiResponse = {
      suggestions: [
        "Upload your updated ATS-friendly resume to increase role alignment.",
        "Build a hands-on project using production-level frameworks.",
        "Add more technical certifications matching your target dream role."
      ],
      roadmap: ["Master Fundamental Technologies", "Build & Deploy Capstone Project", "Apply to Verified Opportunities", "Mock Technical Interviews"],
      skillGap: ["Industry Standard Frameworks", "Production Deployment & CI/CD"],
      learningRecommendations: ["Complete online developer certification tracks", "Build end-to-end full stack projects"]
    };

    try {
      if (OPENROUTER_API_KEY) {
        const prompt = `You are an elite AI Career Coach.
Analyze this student technical profile to generate career improvement steps, roadmap, and learning recommendations.

STUDENT PROFILE:
- Target Role: ${profile.dreamRole || "Software Developer"}
- Skills: ${[...(profile.languages || []), ...(profile.frameworks || []), ...(profile.tools || [])].join(", ")}
- CGPA: ${profile.cgpa || 8.0}
- Projects: ${(profile.projects || []).join("; ")}

Return STRICTLY a JSON object with these key outputs:
{
  "suggestions": ["3-4 actionable tips to improve target role qualification"],
  "roadmap": ["4 clear sequential career milestone titles"],
  "skillGap": ["2-3 key technical skills missing for their dream role"],
  "learningRecommendations": ["2-3 recommended course topics"]
}`;

        console.log(`[Career DNA API] Requesting AI Analysis for: ${uid}...`);
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://paperino.app",
            "X-Title": "Paperino"
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [
              { role: "system", content: "You are a professional JSON generator. Respond only with raw JSON." },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          const resData = await response.json();
          const content = resData.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
          if (parsed.suggestions && parsed.roadmap) {
            aiResponse = parsed;
          }
        }
      }
    } catch (aiErr) {
      console.warn("[Career DNA AI Failover Warning]:", aiErr);
    }

    // ── 4. Persist Analysis & Return ──
    const finalAnalysis = {
      ...aiResponse,
      readinessLevel
    };

    if (userDnaRef) {
      try {
        await userDnaRef.set({
          profile,
          profileHash: profileHashStr,
          analysis: finalAnalysis,
          usage,
          lastSyncedAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (saveErr: any) {
        console.warn("[Career DNA API] Firestore write skipped due to Quota / DB notice:", saveErr?.message || saveErr);
      }
    }

    return NextResponse.json({
      readinessLevel,
      opportunities: finalOpportunities,
      lastSyncedAt,
      ...aiResponse
    });

  } catch (err: any) {
    console.error("[Career DNA API] Critical Error:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
