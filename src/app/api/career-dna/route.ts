import { NextRequest, NextResponse } from "next/server";
import { runApiGuard } from "@/lib/api-guard";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { InternshipManager } from "@/services/internshipProviders/manager";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// OpenRouter Settings
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || ""; // Fallback

function isRoleRelated(dreamRole: string, targetRole: string): boolean {
  const dream = dreamRole.toLowerCase().trim();
  const target = targetRole.toLowerCase().trim();

  if (target.includes(dream) || dream.includes(target)) return true;

  const techKeywords = ["sde", "software", "developer", "frontend", "backend", "full stack", "fullstack", "web", "programmer", "coder", "cloud", "devops", "aws", "data", "ml", "ai", "python", "java", "react", "node", "systems", "platform"];
  const marketingKeywords = ["marketing", "seo", "sales", "business development", "social media", "growth", "advertising", "pr"];
  const hrKeywords = ["hr", "human resources", "recruiter", "talent", "people", "staffing"];
  const financeKeywords = ["finance", "accounting", "analyst", "audit", "investment", "tax", "wealth"];

  const isDreamTech = techKeywords.some(kw => dream.includes(kw));
  const isDreamMarketing = marketingKeywords.some(kw => dream.includes(kw));
  const isDreamHr = hrKeywords.some(kw => dream.includes(kw));
  const isDreamFinance = financeKeywords.some(kw => dream.includes(kw));

  const isTargetTech = techKeywords.some(kw => target.includes(kw));
  const isTargetMarketing = marketingKeywords.some(kw => target.includes(kw));
  const isTargetHr = hrKeywords.some(kw => target.includes(kw));
  const isTargetFinance = financeKeywords.some(kw => target.includes(kw));

  if (isDreamTech && isTargetTech) return true;
  if (isDreamMarketing && isTargetMarketing) return true;
  if (isDreamHr && isTargetHr) return true;
  if (isDreamFinance && isTargetFinance) return true;

  return false;
}

// Predefined Opportunities Database for Rule-Based Matcher (Zero AI Cost)
interface OpportunityTemplate {
  role: string;
  company: string;
  location: string;
  minCgpa: number;
  maxBacklogs: number;
  requiredSkills: string[];
  deptMatches: string[];
  applyLink: string;
}

const INTERNSHIP_TEMPLATES: OpportunityTemplate[] = [
  {
    role: "Full Stack Developer Intern",
    company: "Netflix",
    location: "Chennai (Remote)",
    minCgpa: 8.0,
    maxBacklogs: 0,
    requiredSkills: ["javascript", "react", "node.js", "git"],
    deptMatches: ["cse", "it", "ece", "mca", "btech"],
    applyLink: "https://jobs.netflix.com/"
  },
  {
    role: "Software Engineer Intern",
    company: "Google",
    location: "Chennai",
    minCgpa: 8.5,
    maxBacklogs: 0,
    requiredSkills: ["java", "python", "c++", "data structures", "git"],
    deptMatches: ["cse", "it", "ece", "btech", "mtech"],
    applyLink: "https://www.google.com/about/careers/applications/"
  },
  {
    role: "Frontend Developer Intern",
    company: "Orchestrix",
    location: "Chennai (Hybrid)",
    minCgpa: 7.5,
    maxBacklogs: 1,
    requiredSkills: ["javascript", "react", "html", "css", "figma"],
    deptMatches: ["cse", "it", "ece", "mca", "btech"],
    applyLink: "https://orchestrix.com/careers"
  },
  {
    role: "Data Science Intern",
    company: "Walmart Labs",
    location: "Bangalore (Remote)",
    minCgpa: 8.0,
    maxBacklogs: 0,
    requiredSkills: ["python", "sql", "aws", "git"],
    deptMatches: ["cse", "it", "ece", "btech", "mtech", "mba"],
    applyLink: "https://careers.walmart.com/"
  },
  {
    role: "Cloud DevOps Intern",
    company: "Amazon Web Services",
    location: "Bangalore",
    minCgpa: 8.2,
    maxBacklogs: 0,
    requiredSkills: ["python", "docker", "kubernetes", "aws", "git"],
    deptMatches: ["cse", "it", "ece", "btech", "mtech"],
    applyLink: "https://www.amazon.jobs/"
  },
  {
    role: "Mobile App Developer Intern",
    company: "Swiggy",
    location: "Bangalore",
    minCgpa: 7.8,
    maxBacklogs: 1,
    requiredSkills: ["javascript", "react", "swift", "kotlin", "git"],
    deptMatches: ["cse", "it", "ece", "mca", "btech"],
    applyLink: "https://careers.swiggy.com/"
  }
];

const PLACEMENT_TEMPLATES: OpportunityTemplate[] = [
  {
    role: "Graduate Software Engineer",
    company: "Microsoft",
    location: "Hyderabad",
    minCgpa: 8.5,
    maxBacklogs: 0,
    requiredSkills: ["java", "c#", "c++", "data structures", "git", "aws"],
    deptMatches: ["cse", "it", "ece", "btech", "mtech"],
    applyLink: "https://careers.microsoft.com/"
  },
  {
    role: "Associate Frontend Developer",
    company: "Zoho Corporation",
    location: "Chennai",
    minCgpa: 7.0,
    maxBacklogs: 1,
    requiredSkills: ["javascript", "react", "html", "css", "git"],
    deptMatches: ["cse", "it", "ece", "mca", "btech"],
    applyLink: "https://www.zoho.com/careers/"
  },
  {
    role: "Full Stack Engineer (L1)",
    company: "Freshworks",
    location: "Chennai",
    minCgpa: 7.8,
    maxBacklogs: 0,
    requiredSkills: ["javascript", "react", "node.js", "sql", "git"],
    deptMatches: ["cse", "it", "ece", "mca", "btech"],
    applyLink: "https://www.freshworks.com/company/careers/"
  },
  {
    role: "Data Analyst / Scientist",
    company: "Deloitte",
    location: "Bangalore",
    minCgpa: 7.5,
    maxBacklogs: 0,
    requiredSkills: ["python", "sql", "aws", "git", "figma"],
    deptMatches: ["cse", "it", "ece", "btech", "mtech", "mba", "mca"],
    applyLink: "https://jobs.deloitte.com/"
  },
  {
    role: "Systems DevOps Engineer",
    company: "Cognizant",
    location: "Coimbatore",
    minCgpa: 7.0,
    maxBacklogs: 2,
    requiredSkills: ["python", "docker", "aws", "git"],
    deptMatches: ["cse", "it", "ece", "mca", "btech"],
    applyLink: "https://careers.cognizant.com/"
  }
];

export async function POST(req: NextRequest) {
  // 1. Security API Guard
  const guard = await runApiGuard(req);
  if (guard.blocked) return guard.response;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized: Missing credentials" }, { status: 401 });
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

    // Backend validation of required fields
    if (
      !profile.fullName?.trim() ||
      !profile.college?.trim() ||
      !profile.department?.trim() ||
      !profile.currentYear ||
      !profile.graduationYear ||
      !profile.dreamRole?.trim() ||
      !profile.goal ||
      profile.cgpa === undefined ||
      profile.cgpa <= 0 ||
      profile.cgpa > 10 ||
      ((profile.languages || []).length === 0 &&
       (profile.frameworks || []).length === 0 &&
       (profile.tools || []).length === 0)
    ) {
      return NextResponse.json({
        error: "Validation Error",
        message: "Please complete all required fields (Name, College, Department, Year, Graduation Year, Dream Role, Goal, CGPA, and at least one technical skill)."
      }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    }

    // A. DYNAMIC SHADOW RULES ENGINE (ZERO TOKEN COST)
    // ----------------------------------------------------
    const currentYear = Number(profile.currentYear) || 1;
    const cgpa = Number(profile.cgpa) || 8.0;
    const backlogs = Number(profile.activeBacklogs) || 0;
    const dept = String(profile.department).toLowerCase().trim();
    const dreamRole = String(profile.dreamRole).toLowerCase().trim();

    // Determine readiness badge statically using complete profile analysis (projects, certs, resume, etc)
    let readinessLevel: "High Ready" | "Medium Ready" | "Beginner" = "Beginner";
    const certsCount = (profile.certifications || []).length;
    const projectsCount = (profile.projects || []).length;
    const hasGithub = !!profile.github && String(profile.github).startsWith("http");
    const hasLinkedin = !!profile.linkedin && String(profile.linkedin).startsWith("http");
    const hasResume = !!profile.resumeText && String(profile.resumeText).trim().length > 50;

    if (
      cgpa >= 8.0 &&
      backlogs === 0 &&
      hasResume &&
      hasGithub &&
      hasLinkedin &&
      certsCount >= 1 &&
      projectsCount >= 1
    ) {
      readinessLevel = "High Ready";
    } else if (
      cgpa >= 6.5 &&
      backlogs <= 1 &&
      (hasResume || hasGithub || hasLinkedin || certsCount >= 1 || projectsCount >= 1)
    ) {
      readinessLevel = "Medium Ready";
    }

    // Determine templates based on placement mode (Year 4 gets placement, others get internship)
    const isPlacementMode = currentYear >= 4;

    // A. FETCH STANDARDIZED OPPORTUNITIES FROM MODULAR MANAGER (ZERO TIGHT COUPLING)
    // ----------------------------------------------------
    let rawOpportunities: any[] = [];
    try {
      const manager = new InternshipManager();
      rawOpportunities = await manager.getAggregatedInternships();
    } catch (managerErr: any) {
      console.error("[Career DNA Match Engine] Aggregator failed:", managerErr.message);
    }

    if (rawOpportunities.length === 0) {
      return NextResponse.json({
        error: "Unavailable",
        message: "Internship recommendations are temporarily unavailable."
      }, { status: 503 });
    }

    // Build user user-skills list for static matching
    const userSkills = new Set<string>();
    (profile.languages || []).forEach((s: string) => userSkills.add(s.toLowerCase().trim()));
    (profile.frameworks || []).forEach((s: string) => userSkills.add(s.toLowerCase().trim()));
    (profile.tools || []).forEach((s: string) => userSkills.add(s.toLowerCase().trim()));

    // Run Rule-Based Matching for Opportunities
    const opportunities = rawOpportunities
      .filter((opp) => {
        if (!isRoleRelated(dreamRole, opp.title)) {
          return false;
        }
        if (isPlacementMode) {
          return opp.opportunityType === "Placement";
        } else {
          return opp.opportunityType === "Internship";
        }
      })
      .map((tpl, index) => {
        // 1. Check eligibility reasons
        const reasons: string[] = [];
        const minCgpa = tpl.eligibility?.minCgpa || 7.0;
        const maxBacklogs = tpl.eligibility?.maxBacklogs || 0;

        if (cgpa < minCgpa) {
          reasons.push(`Minimum CGPA requirement is ${minCgpa} (Your CGPA: ${cgpa})`);
        }
        if (backlogs > maxBacklogs) {
          reasons.push(`Maximum allowed backlogs is ${maxBacklogs} (Your backlogs: ${backlogs})`);
        }
        if (isPlacementMode && currentYear < 4) {
          reasons.push("Final Year preferred");
        }
        if (!profile.resumeText) {
          reasons.push("Resume not uploaded");
        }
        if (!profile.github) {
          reasons.push("GitHub link missing");
        }

        // Identify missing skills
        const missingSkills = (tpl.skills || []).filter((sk: string) => !userSkills.has(sk));
        missingSkills.forEach((sk: string) => {
          reasons.push(`${sk.toUpperCase()} required`);
        });

        const isEligible = reasons.length === 0;

        // 2. Compute Match Score out of 100
        let dreamRoleScore = 0;
        let isDreamRoleMatched = false;
        if (dreamRole && tpl.title.toLowerCase().includes(dreamRole)) {
          dreamRoleScore = 25;
          isDreamRoleMatched = true;
        } else if (dreamRole) {
          const dreamWords = dreamRole.split(/\s+/);
          const matchedWords = dreamWords.filter(w => tpl.title.toLowerCase().includes(w));
          if (matchedWords.length > 0) {
            dreamRoleScore = Math.floor((matchedWords.length / dreamWords.length) * 15);
            isDreamRoleMatched = true;
          }
        }

        const totalSkillsCount = tpl.skills?.length || 1;
        const matchedSkillsCount = (tpl.skills || []).filter((sk: string) => userSkills.has(sk)).length;
        const skillsScore = Math.floor((matchedSkillsCount / totalSkillsCount) * 25);

        let locationScore = 0;
        let isLocationMatched = false;
        const prefLoc = String(profile.preferredLocation || "").toLowerCase().trim();
        if (prefLoc && tpl.location.toLowerCase().includes(prefLoc)) {
          locationScore = 15;
          isLocationMatched = true;
        } else if (prefLoc && prefLoc.includes("remote") && tpl.location.toLowerCase().includes("remote")) {
          locationScore = 15;
          isLocationMatched = true;
        }

        const cgpaScore = cgpa >= minCgpa ? 15 : Math.max(0, Math.floor((cgpa / minCgpa) * 10));
        
        let yearScore = 0;
        const targetYears = tpl.eligibility?.targetYears || [1, 2, 3, 4];
        if (targetYears.includes(currentYear)) {
          yearScore = 10;
        }

        let deptScore = 0;
        const targetDepts = tpl.eligibility?.departments || [];
        if (targetDepts.length === 0 || targetDepts.includes(dept)) {
          deptScore = 10;
        }

        const matchScore = dreamRoleScore + skillsScore + locationScore + cgpaScore + yearScore + deptScore;

        // Determine matchLevel classification using strict scoring brackets
        // 85-100 = High Match
        // 70-84 = Medium Match
        // Below 70 = Stretch Opportunity
        let matchLevel: "High Match" | "Medium Match" | "Stretch Opportunity" = "Stretch Opportunity";
        if (matchScore >= 85) {
          matchLevel = "High Match";
        } else if (matchScore >= 70) {
          matchLevel = "Medium Match";
        }

        // 3. Identify Match Reasons
        const matchReasons: string[] = [];
        (tpl.skills || []).forEach((sk: string) => {
          if (userSkills.has(sk)) {
            const formatted = sk.charAt(0).toUpperCase() + sk.slice(1);
            matchReasons.push(`✔ ${formatted} required and student knows ${formatted}`);
          }
        });
        if (currentYear >= 1) {
          const suffix = currentYear === 2 ? "nd" : currentYear === 3 ? "rd" : "th";
          matchReasons.push(`✔ Student is eligible for ${currentYear}${suffix} Year`);
        }
        if (isLocationMatched) {
          matchReasons.push("✔ Location preference matches");
        }
        if (isDreamRoleMatched) {
          matchReasons.push("✔ Dream role matches");
        }
        if (cgpa >= minCgpa) {
          matchReasons.push("✔ CGPA Eligible");
        }

        // Actionable advice to qualify
        const actionSuggestions: string[] = [];
        if (cgpa < minCgpa) actionSuggestions.push(`Improve CGPA to above ${minCgpa}`);
        if (backlogs > maxBacklogs) actionSuggestions.push(`Clear active backlogs to less than ${maxBacklogs}`);
        if (!profile.resumeText) actionSuggestions.push("Upload your parsed resume");
        if (!profile.github) actionSuggestions.push("Add your GitHub profile link");
        missingSkills.forEach((sk: string) => {
          actionSuggestions.push(`Acquire and add skill: ${sk.toUpperCase()}`);
        });

        return {
          id: tpl.id || `opp_${index}`,
          role: tpl.title,
          company: tpl.company,
          location: tpl.location,
          type: tpl.opportunityType,
          matchLevel,
          matchScore,
          matchReasons,
          missingSkills,
          applyLink: tpl.applyUrl || "",
          eligibilityBreakdown: {
            isEligible,
            reasons,
            suggestions: actionSuggestions
          }
        };
      });

    // B. AI CACHING & RATE LIMIT CONTROLLER (OPENROUTER SPAM PROTECTION)
    // ----------------------------------------------------
    const todayStr = new Date().toISOString().split("T")[0];
    const userDnaRef = adminDb.collection("career_dna").doc(uid);
    const docSnap = await userDnaRef.get();
    const savedData = docSnap.exists ? docSnap.data() : null;

    // Construct profile hash for change detection
    const profileHashStr = JSON.stringify({
      resumeText: profile.resumeText || "",
      languages: profile.languages || [],
      frameworks: profile.frameworks || [],
      tools: profile.tools || [],
      projects: profile.projects || [],
      cgpa: profile.cgpa || 8.0,
      dreamRole: profile.dreamRole || "",
    });

    // Check rate limit status
    let usage = savedData?.usage || {
      lastResetDate: todayStr,
      chatCount: 0,
      resumeCount: 0,
      skillGapCount: 0,
      roadmapCount: 0
    };

    // Daily reset check
    if (usage.lastResetDate !== todayStr) {
      usage = {
        lastResetDate: todayStr,
        chatCount: 0,
        resumeCount: 0,
        skillGapCount: 0,
        roadmapCount: 0
      };
    }

    // Limit Check: Skill Gap Analyses (maximum 5/day)
    if (usage.skillGapCount >= 5 && savedData?.profileHash !== profileHashStr) {
      return NextResponse.json({
        error: "Rate Limit Exceeded",
        message: "You have exceeded your limit of 5 AI Skill Gap analyses per day. Please try again tomorrow."
      }, { status: 429 });
    }

    // Return cached response if profile has not changed
    if (savedData && savedData.profileHash === profileHashStr && savedData.analysis) {
      console.log(`[Career DNA AI Cache] Profile unchanged. Returning cached analysis for: ${uid}`);
      return NextResponse.json({
        readinessLevel,
        opportunities,
        ...savedData.analysis
      });
    }

    // C. MINIMAL PROMPTING SMART CONTROLLER & OPENROUTER FETCH
    // ----------------------------------------------------
    // Send ONLY required parameters to keep context window low
    const minimalProfile = {
      role: profile.dreamRole,
      skills: Array.from(userSkills),
      cgpa: profile.cgpa,
      projects: profile.projects || [],
      certifications: profile.certifications || [],
      hasResume: !!profile.resumeText
    };

    const prompt = `You are a premium career advisor.
    Analyze this student technical profile to generate career improvement steps, roadmap, and learning recommendations.
    
    STUDENT PROFILE:
    - Target Role: ${minimalProfile.role}
    - Skills: ${minimalProfile.skills.join(", ")}
    - CGPA: ${minimalProfile.cgpa}
    - Projects: ${minimalProfile.projects.join("; ")}
    - Certifications: ${minimalProfile.certifications.join("; ")}
    
    Return STRICTLY a JSON object with these key outputs:
    {
      "suggestions": ["4-5 quick strategic improvement tips to boost target role preparedness"],
      "roadmap": ["3-5 clear roadmap step titles"],
      "skillGap": ["3-4 technical skills missing to qualify for the dream role"],
      "learningRecommendations": ["3-4 recommended courses or topics to learn"]
    }
    Respond ONLY with raw JSON. No conversational text or markdown wrappers.`;

    console.log(`[Career DNA API] Requesting OpenRouter Llama API for: ${uid}...`);
    
    let aiResponse = {
      suggestions: [
        "Improve profile by uploading a parsed resume.",
        "Add more coding projects in your repository.",
        "Clear active backlogs to boost placement criteria.",
        "Develop additional framework skills matching your target role."
      ],
      roadmap: ["Acquire Foundational Core Skills", "Build Projects & Portfolios", "Apply for Internships", "Interview Prep"],
      skillGap: ["Industry Standard Frameworks", "System Design Fundamentals"],
      learningRecommendations: ["Complete online developer certification tracks", "Build end-to-end full stack projects"]
    };

    try {
      if (!OPENROUTER_API_KEY) {
        throw new Error("No AI API Keys found");
      }

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

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
      }

      const resData = await response.json();
      const content = resData.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
      
      if (parsed.suggestions && parsed.roadmap) {
        aiResponse = parsed;
      }
      
      // Increment Usage Count on Successful Call
      usage.skillGapCount += 1;

    } catch (aiErr) {
      console.error("[Career DNA AI Failover Warning]:", aiErr);
      // Soft Failover - return predefined fallback instead of crashing
    }

    // D. PERSIST CACHE AND METRICS TO FIRESTORE
    // ----------------------------------------------------
    const finalAnalysis = {
      ...aiResponse,
      readinessLevel
    };

    await userDnaRef.set({
      profile,
      profileHash: profileHashStr,
      analysis: finalAnalysis,
      usage,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json({
      readinessLevel,
      opportunities,
      ...aiResponse
    });
  } catch (err: any) {
    console.error("[Career DNA API] Critical Error:", err);
    return NextResponse.json({
      error: "AI Career Mentor is temporarily unavailable. Please try again later.",
      message: err.message
    }, { status: 500 });
  }
}
