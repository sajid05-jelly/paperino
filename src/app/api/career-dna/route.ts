import { NextRequest, NextResponse } from "next/server";
import { runApiGuard } from "@/lib/api-guard";
import { adminDb } from "@/lib/firebase-admin";
import { verifyFeatureAccess } from "@/lib/server-entitlement";
import * as admin from 'firebase-admin';
import { INITIAL_INTERNSHIPS, rankOpportunitiesForUser } from "@/services/internshipService";
import { Internship } from "@/types/internship";
import { generateJSONResponse } from "@/services/groqService";

export const maxDuration = 60;

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
 * AND combines curated verified opportunities from INITIAL_INTERNSHIPS.
 * Excludes Unstop records per application policy and deduplicates cleanly.
 */
async function fetchPulseInternships(forceSync = false): Promise<Internship[]> {
  const allRawInternships: any[] = [];
  const now = Date.now();

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
          const sourceName = d.sourceName || d.source || "Knowafest";
          const link = d.link || d.registrationUrl || d.officialEventUrl || d.applyUrl || "";
          // Exclude any Unstop-sourced opportunities per strict project policy
          if (sourceName.toLowerCase().includes("unstop") || link.toLowerCase().includes("unstop.com")) {
            return;
          }

          const docDeadline = d.deadline?.toDate ? d.deadline.toDate().getTime() : (typeof d.deadline === 'number' ? d.deadline : null);
          // Skip if deadline is strictly in the past
          if (docDeadline && docDeadline < now) {
            return;
          }

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
            applyUrl: link,
            postedDate: d.createdAt?.toDate ? d.createdAt.toDate().getTime() : now - 2 * 24 * 60 * 60 * 1000,
            deadline: docDeadline || (now + 30 * 24 * 60 * 60 * 1000),
            verified: d.verifiedSource !== false,
            source: sourceName,
            sources: Array.isArray(d.sources) ? d.sources : [sourceName],
            active: true,
          });
        });
      }
    }
  } catch (err) {
    console.error("[Career DNA API] Error reading Firestore pulse_updates:", err);
  }

  // 2. Add curated opportunities from INITIAL_INTERNSHIPS with rolling active deadlines
  INITIAL_INTERNSHIPS.forEach(item => {
    const isUnstop = (item.source || "").toLowerCase().includes("unstop") || (item.applyUrl || "").toLowerCase().includes("unstop.com");
    if (!isUnstop) {
      allRawInternships.push({
        ...item,
        postedDate: item.postedDate || (now - 2 * 24 * 60 * 60 * 1000),
        deadline: (item.deadline && item.deadline > now) ? item.deadline : (now + 25 * 24 * 60 * 60 * 1000),
        active: true,
      });
    }
  });

  // Deduplicate & Merge duplicate opportunities across sources
  const mergedMap = new Map<string, any>();

  for (const item of allRawInternships) {
    const normKey = normalizeTitle(item.title);
    const itemSources = item.sources || [item.source || "Paperino Verified"];

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
  return mergedInternships.filter((item) => !item.deadline || item.deadline > now);
}

export async function POST(req: NextRequest) {
  // ── Security: Require Auth & Rate Limiting Guard ──
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  // ── Entitlement Check: Career DNA requires Pro or Premium ──
  const authHeader = req.headers.get("authorization");
  const entitlement = await verifyFeatureAccess(authHeader, 'careerDna');
  if (entitlement.status !== "ALLOWED") {
    const statusCode = entitlement.status === "LIMIT_REACHED" ? 429 : 403;
    return NextResponse.json(
      {
        error: entitlement.error || "Career DNA is available with Paperino Pro or Premium.",
        status: entitlement.status,
        plan: entitlement.plan || "free",
        limit: entitlement.limit || 0,
        used: entitlement.used || 0
      },
      { status: statusCode }
    );
  }

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
    const readinessScore = Math.min(100, Math.max(30, Math.round(
      ((profile.cgpa || 8.0) * 4) +
      (((profile.languages || []).length + (profile.frameworks || []).length + (profile.tools || []).length) * 3) +
      ((profile.projects || []).length * 8) +
      (profile.resumeText ? 15 : 0)
    )));
    const readinessLevel = readinessScore >= 75 ? "High Ready" : readinessScore >= 50 ? "Medium Ready" : "Beginner";

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
        readinessScore,
        opportunities: finalOpportunities,
        lastSyncedAt,
        ...savedData.analysis
      });
    }

    // ── 3. Groq AI Skill Gap & Roadmap Analysis ──
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
      const skillsList = [...(profile.languages || []), ...(profile.frameworks || []), ...(profile.tools || [])].filter(Boolean).join(", ");
      const prompt = `You are an elite AI Career Coach.
Analyze this student technical profile to generate career improvement steps, roadmap, and learning recommendations.

STUDENT PROFILE:
- Target Role: ${profile.dreamRole || "Software Developer"}
- Skills: ${skillsList || "General Software Engineering Fundamentals"}
- CGPA: ${profile.cgpa || 8.0}
- Projects: ${(profile.projects || []).filter(Boolean).join("; ") || "Academic projects"}

Return STRICTLY a JSON object with these key outputs:
{
  "suggestions": ["3-4 actionable tips to improve target role qualification"],
  "roadmap": ["4 clear sequential career milestone titles"],
  "skillGap": ["2-3 key technical skills missing for their dream role"],
  "learningRecommendations": ["2-3 recommended course topics"]
}`;

      console.log(`[Career DNA API] Requesting AI Analysis for: ${uid}...`);
      const aiController = new AbortController();
      const aiTimeoutId = setTimeout(() => aiController.abort(), 12000); // 12-sec strict timeout

      const aiPromise = generateJSONResponse(prompt);
      const timeoutPromise = new Promise((_, reject) => {
        aiController.signal.addEventListener("abort", () => reject(new Error("AI generation timed out")));
      });

      const parsed: any = await Promise.race([aiPromise, timeoutPromise]);
      clearTimeout(aiTimeoutId);

      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
          aiResponse.suggestions = parsed.suggestions;
        }
        if (Array.isArray(parsed.roadmap) && parsed.roadmap.length > 0) {
          aiResponse.roadmap = parsed.roadmap;
        }
        if (Array.isArray(parsed.skillGap) && parsed.skillGap.length > 0) {
          aiResponse.skillGap = parsed.skillGap;
        }
        if (Array.isArray(parsed.learningRecommendations) && parsed.learningRecommendations.length > 0) {
          aiResponse.learningRecommendations = parsed.learningRecommendations;
        }
      }
    } catch (aiErr: any) {
      console.warn("[Career DNA AI Failover Warning]:", aiErr?.message || aiErr);
    }

    // ── 4. Persist Analysis & Return ──
    const finalAnalysis = {
      ...aiResponse,
      readinessLevel,
      readinessScore,
      opportunities: finalOpportunities
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
      ...finalAnalysis,
      lastSyncedAt
    });

  } catch (err: any) {
    console.error("[Career DNA API] Critical Error:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
