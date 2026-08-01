import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES (Evidence Engine V6 - Achievement Badges Upgrade)
// ─────────────────────────────────────────────────────────────

export interface ProjectQualityBreakdown {
  completeness: number; // /20 (Functionality & Completeness)
  technicalDepth: number; // /15 (Technical Complexity)
  architectureStructure: number; // /15 (Architecture)
  codeStructure: number; // /10 (Code Structure)
  documentation: number; // /10 (Documentation)
  engineeringPractices: number; // /10 (Engineering Practices)
  testing: number; // /5 (Testing)
  deployment: number; // /5 (Deployment)
  maintainability: number; // /5 (Maintenance)
  usefulness: number; // /5 (Real-world Usefulness)
  totalScore: number; // /100
  qualityTier:
    | "Empty/Config"
    | "Tiny Exercise"
    | "Basic Academic"
    | "Decent Academic"
    | "Good Complete"
    | "Strong Engineering"
    | "Excellent Production"
    | "Exceptional Open Source";
}

export interface ClassifiedRepoInfo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  url: string;
  topics: string[];
  repoCategory:
    | "FLAGSHIP_PROJECT"
    | "STRONG_PROJECT"
    | "STANDARD_PROJECT"
    | "ACADEMIC_PROJECT"
    | "ASSIGNMENT"
    | "INTERNSHIP_TASK"
    | "PRACTICE"
    | "TUTORIAL"
    | "FORK"
    | "PROFILE_CONFIG"
    | "MINIMAL"
    | "EMPTY";
  projectQualityScore: number; // 0-100
  projectQualityBreakdown: ProjectQualityBreakdown;
  selectionReason: string;
  maintenanceScore: number; // 0-100 (Separate project maintenance analysis)
  maintenanceStatus: string;
  hasFE: boolean;
  hasBE: boolean;
  hasDB: boolean;
  hasTest: boolean;
  hasCiCd: boolean;
  hasPages: boolean;
  hasReadme: boolean;
}

export interface SkillConfidenceItem {
  score: number; // 0-100
  confidence: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE" | "INSUFFICIENT EVIDENCE";
  evidence: string[];
  reason: string;
  supportingRepos: string[];
}

export interface CategoryScoreItem {
  score: number;
  max: number;
  evidence: string[];
}

export interface CategoryScoreBreakdown {
  bestProjectQuality: CategoryScoreItem; // /30 (30%)
  overallProjectQuality: CategoryScoreItem; // /20 (20%)
  technicalDepth: CategoryScoreItem; // /15 (15%)
  engineeringPractices: CategoryScoreItem; // /10 (10%)
  portfolioDepth: CategoryScoreItem; // /10 (10%)
  documentation: CategoryScoreItem; // /5 (5%)
  maintenanceConsistency: CategoryScoreItem; // /5 (5%)
  collaborationOpenSource: CategoryScoreItem; // /5 (5%)
}

export interface TransparencyAudit {
  totalPublicRepos: number;
  repositoriesInspected: number;
  meaningfulProjects: number;
  academicProjects: number;
  assignments: number;
  internshipTasks: number;
  tutorials: number;
  practiceRepos: number;
  forks: number;
  profileConfigRepos: number;
  minimalEmptyRepos: number;
  disclaimer: string;
}

export interface SeparateQualityMetrics {
  bestProjectQuality: number; // 0 - 100
  portfolioDepth: number; // 0 - 100
  engineeringQuality: number; // 0 - 100
  technicalBreadth: number; // 0 - 100
  maintenance: number; // 0 - 100 (Separate project quality from maintenance)
}

export interface DeveloperBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  glowColor: string;
  evidenceList: string[];
  unlockReason: string;
  suggestion?: string;
  requirementsChecklist: { text: string; satisfied: boolean }[];
}

export interface DeveloperMetrics {
  score: number; // 0 - 100
  evidenceConfidence: "LOW" | "MEDIUM" | "HIGH";
  confidenceReason: string;
  separateMetrics: SeparateQualityMetrics;
  level: string;
  levelNum: number;
  xpCurrent: number;
  xpMax: number;
  xpPercentage: number;
  nextLevelRequirements: string[];
  nextRewardBadge: string;
  stars: string;
  rankPercentile: number | null;
  category: string;
  scoreBreakdown: CategoryScoreBreakdown;
  transparencyAudit: TransparencyAudit;
  scoreExplanation: {
    strengths: string[];
    needsImprovement: string[];
  };
  skillsBreakdown: {
    frontend: number;
    backend: number;
    database: number;
    aiMl: number;
    devOps: number;
    cloud: number;
    problemSolving: number;
    documentation: number;
    uiUx: number;
    testing: number;
  };
  skillsConfidence: {
    frontend: SkillConfidenceItem;
    backend: SkillConfidenceItem;
    database: SkillConfidenceItem;
    aiMl: SkillConfidenceItem;
    devOps: SkillConfidenceItem;
    cloud: SkillConfidenceItem;
    problemSolving: SkillConfidenceItem;
    documentation: SkillConfidenceItem;
    uiUx: SkillConfidenceItem;
    testing: SkillConfidenceItem;
  };
  badges: DeveloperBadge[];
}

export interface DeveloperPersonality {
  archetype: string;
  title: string;
  bestCareerPath: string;
  readinessScores: {
    startupReadiness: number;
    enterpriseReadiness: number;
    freelancerPotential: number;
    leadershipPotential: number;
  };
  readinessLevels: {
    startupReadiness: "Developing" | "Moderate" | "Strong" | "Needs Evidence";
    enterpriseReadiness: "Developing" | "Moderate" | "Strong" | "Needs Evidence";
    freelancerPotential: "Developing" | "Moderate" | "Strong" | "Needs Evidence";
    leadershipPotential: "Developing" | "Moderate" | "Strong" | "Needs Evidence";
  };
  developerStyleTraits: string[];
}

export interface DeveloperTimelineMilestone {
  title: string;
  subtitle: string;
  date: string;
  icon: string;
  badgeText?: string;
}

export interface ProjectGrowthMetrics {
  reposCreatedCount: number;
  technologiesLearnedCount: number;
  activityTrend: string;
  mostProductiveMonth: string;
  latestProject: { name: string; url: string; date: string } | null;
  mostSuccessfulProject: { name: string; url: string; stars: number } | null;
}

export interface DeveloperJourney {
  timeline: DeveloperTimelineMilestone[];
  growth: ProjectGrowthMetrics;
}

export interface RecruiterPerspective {
  recruiterStrengths: string[];
  areasToImprove: string[];
  overallImpression: string;
  readinessStatus: string;
}

export interface ActionPlanSection {
  quickWins: string[];
  next7Days: string[];
  next30Days: string[];
  beforeApplying: string[];
}

export interface GitHubAnalysisResult {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  followers: number;
  following: number;
  publicReposCount: number;
  createdAt: string;
  portfolioUrl: string | null;
  detectedSkills: string[];
  mostUsedLanguages: { language: string; percentage: number; count: number }[];
  technologyBreakdown: Record<string, number>;
  bestProjects: ClassifiedRepoInfo[];
  developerMetrics: DeveloperMetrics;
  developerPersonality: DeveloperPersonality;
  developerJourney: DeveloperJourney;
  recruiterPerspective: RecruiterPerspective;
  actionPlan: ActionPlanSection;
  healthReport: {
    strengths: string[];
    improvements: string[];
    score: number;
    healthLevelText: string;
  };
  activityInsights: {
    lastUpdatedRepo: string | null;
    mostActiveLanguage: string | null;
    recentActivityStatus: string;
    isInactive: boolean;
  };
  aiRecommendations: string[];
  cachedAt: string;
}

// In-memory cache for 6 hours
const cache = new Map<string, { data: GitHubAnalysisResult; timestamp: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Technology rules
const TECH_RULES: { name: string; category: "frontend" | "backend" | "database" | "aiMl" | "devOps" | "cloud" | "testing" | "uiUx"; matchers: (string | RegExp)[] }[] = [
  { name: "TypeScript", category: "frontend", matchers: ["typescript", "ts"] },
  { name: "JavaScript", category: "frontend", matchers: ["javascript", "js"] },
  { name: "React", category: "frontend", matchers: ["react", "reactjs", "jsx", "tsx"] },
  { name: "Next.js", category: "frontend", matchers: ["nextjs", "next.js", "next"] },
  { name: "HTML", category: "frontend", matchers: ["html", "html5"] },
  { name: "CSS", category: "frontend", matchers: ["css", "css3"] },
  { name: "Tailwind CSS", category: "uiUx", matchers: ["tailwind", "tailwindcss"] },
  { name: "Bootstrap", category: "uiUx", matchers: ["bootstrap"] },
  { name: "Node.js", category: "backend", matchers: ["nodejs", "node"] },
  { name: "Express", category: "backend", matchers: ["express", "expressjs"] },
  { name: "Python", category: "backend", matchers: ["python", "py", "django", "flask", "fastapi"] },
  { name: "Go", category: "backend", matchers: ["go", "golang"] },
  { name: "Rust", category: "backend", matchers: ["rust", "rs"] },
  { name: "Nix / SaltStack", category: "devOps", matchers: ["nix", "nixos", "saltstack", "salt"] },
  { name: "Java", category: "backend", matchers: ["java", "spring", "springboot"] },
  { name: "C++", category: "backend", matchers: ["c++", "cpp"] },
  { name: "C", category: "backend", matchers: ["c", "c-lang"] },
  { name: "C#", category: "backend", matchers: ["c#", "csharp", "dotnet", ".net"] },
  { name: "Firebase", category: "cloud", matchers: ["firebase", "firestore"] },
  { name: "MongoDB", category: "database", matchers: ["mongodb", "mongo", "mongoose"] },
  { name: "MySQL", category: "database", matchers: ["mysql"] },
  { name: "PostgreSQL", category: "database", matchers: ["postgresql", "postgres", "psql"] },
  { name: "TensorFlow", category: "aiMl", matchers: ["tensorflow", "keras", "torch", "pytorch", "scikit-learn"] },
  { name: "Docker", category: "devOps", matchers: ["docker", "dockerfile"] },
  { name: "Git", category: "devOps", matchers: ["git"] },
  { name: "GitHub Workflows", category: "devOps", matchers: [".github/workflows", "ci/cd", "github-actions"] },
  { name: "Jest / Vitest", category: "testing", matchers: ["jest", "vitest", "cypress", "playwright", "test"] },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let username = searchParams.get("username")?.trim().replace(/^@/, "");
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!username) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    if (username.includes("github.com/")) {
      const parts = username.split("github.com/")[1].split("/").filter(Boolean);
      username = parts[0] || username;
    }

    username = username.toLowerCase();

    const now = Date.now();
    if (!forceRefresh && cache.has(username)) {
      const cached = cache.get(username)!;
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached.data, fromCache: true });
      }
    }

    // ── 1. FETCH REPOSITORIES FIRST ──
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: {
        "User-Agent": "Paperino-CareerDNA-App",
        "Accept": "application/vnd.github.v3+json",
      },
      next: { revalidate: 0 },
    });

    if (userRes.status === 404) {
      return NextResponse.json({ error: `GitHub user "@${username}" not found. Please check the username.` }, { status: 404 });
    }
    if (!userRes.ok) {
      return NextResponse.json({ error: `GitHub API error (HTTP ${userRes.status}).` }, { status: userRes.status });
    }

    const userData = await userRes.json();

    const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, {
      headers: {
        "User-Agent": "Paperino-CareerDNA-App",
        "Accept": "application/vnd.github.v3+json",
      },
      next: { revalidate: 0 },
    });

    const reposData = reposRes.ok ? await reposRes.json() : [];
    const allRepos: any[] = Array.isArray(reposData) ? reposData : [];

    // ── 2. CLASSIFY EVERY REPOSITORY INTO EXACT REQUIRED CATEGORIES ──
    let flagshipCount = 0;
    let strongCount = 0;
    let standardCount = 0;
    let academicCount = 0;
    let assignmentCount = 0;
    let internshipCount = 0;
    let practiceCount = 0;
    let tutorialCount = 0;
    let forkCount = 0;
    let profileConfigCount = 0;
    let minimalCount = 0;
    let emptyCount = 0;

    const classifiedRepos: ClassifiedRepoInfo[] = allRepos.map(repo => {
      const isFork = Boolean(repo.fork);
      const isArchived = Boolean(repo.archived);
      const isProfileRepo = repo.name.toLowerCase() === username.toLowerCase();
      const sizeKB = repo.size || 0;
      const description = (repo.description || "").trim();
      const hasDescription = description.length >= 10;
      const stars = repo.stargazers_count || 0;
      const forksCount = repo.forks_count || 0;
      const hasPages = Boolean(repo.has_pages || repo.homepage);
      const topics = repo.topics || [];
      const language = repo.language || null;
      const corpus = `${repo.name} ${description} ${topics.join(" ")}`.toLowerCase();

      // Codebase Depth Signals
      const hasReadme = Boolean(hasDescription || sizeKB >= 5);
      const hasTest = corpus.includes("test") || corpus.includes("jest") || corpus.includes("vitest") || corpus.includes("cypress") || corpus.includes("spec");
      const hasCiCd = corpus.includes("ci") || corpus.includes("workflow") || corpus.includes("docker") || corpus.includes("github-actions");
      const hasFE = Boolean(language === "JavaScript" || language === "TypeScript" || language === "HTML" || corpus.includes("react") || corpus.includes("vue") || corpus.includes("frontend"));
      const hasBE = Boolean(language === "Python" || language === "Go" || language === "Java" || corpus.includes("c++") || corpus.includes("c") || corpus.includes("rust") || corpus.includes("node") || corpus.includes("express") || corpus.includes("api") || corpus.includes("backend") || corpus.includes("server"));
      const hasDB = Boolean(corpus.includes("mongo") || corpus.includes("sql") || corpus.includes("postgres") || corpus.includes("firebase") || corpus.includes("db") || corpus.includes("database"));

      // Categorization
      let repoCategory: ClassifiedRepoInfo["repoCategory"] = "STANDARD_PROJECT";
      if (isFork) {
        repoCategory = "FORK";
        forkCount++;
      } else if (isProfileRepo) {
        repoCategory = "PROFILE_CONFIG";
        profileConfigCount++;
      } else if (sizeKB === 0 && !hasDescription && stars === 0) {
        repoCategory = "EMPTY";
        emptyCount++;
      } else if (sizeKB < 15 && !hasDescription && stars < 5) {
        repoCategory = "MINIMAL";
        minimalCount++;
      } else if (
        corpus.includes("bharatintern") ||
        corpus.includes("codesoft") ||
        corpus.includes("prodigy") ||
        corpus.includes("internship") ||
        corpus.includes("task-1") ||
        corpus.includes("task1") ||
        corpus.includes("task-2") ||
        corpus.includes("task2") ||
        corpus.includes("internship-task") ||
        corpus.includes("web-development-task")
      ) {
        repoCategory = "INTERNSHIP_TASK";
        internshipCount++;
      } else if (
        corpus.includes("assignment") ||
        corpus.includes("homework") ||
        corpus.includes("lab") ||
        corpus.includes("dsa") ||
        corpus.includes("leetcode")
      ) {
        repoCategory = "ASSIGNMENT";
        assignmentCount++;
      } else if (corpus.includes("tutorial") || corpus.includes("course") || corpus.includes("awesome") || corpus.includes("sample")) {
        repoCategory = "TUTORIAL";
        tutorialCount++;
      } else if (corpus.includes("practice") || corpus.includes("exercise") || corpus.includes("test-repo") || corpus.includes("demo")) {
        repoCategory = "PRACTICE";
        practiceCount++;
      } else if (corpus.includes("academic") || corpus.includes("college") || corpus.includes("sem-") || corpus.includes("university")) {
        repoCategory = "ACADEMIC_PROJECT";
        academicCount++;
      } else if ((stars >= 100 || forksCount >= 25 || (sizeKB > 1200 && hasBE && hasFE)) && hasDescription) {
        repoCategory = "FLAGSHIP_PROJECT";
        flagshipCount++;
      } else if ((stars >= 10 || forksCount >= 3 || hasPages || (sizeKB > 400 && (hasBE || hasFE))) && hasDescription) {
        repoCategory = "STRONG_PROJECT";
        strongCount++;
      } else {
        repoCategory = "STANDARD_PROJECT";
        standardCount++;
      }

      // ── INTERNAL PROJECT QUALITY SCORE /100 ──
      let completeness = 0;
      if (hasFE && hasBE && hasDB) completeness = 20;
      else if (hasFE && hasBE) completeness = 16;
      else if (hasFE || hasBE) completeness = 10;
      else completeness = 5;

      let techComplexity = (hasFE ? 4 : 0) + (hasBE ? 4 : 0) + (hasDB ? 4 : 0) + (hasCiCd ? 3 : 0);
      let architecture = sizeKB > 800 ? 15 : sizeKB > 200 ? 10 : 5;
      let codeStructure = topics.length >= 2 ? 10 : 5;
      let docScore = hasDescription ? 10 : 3;
      let engPractices = (hasCiCd ? 5 : 0) + (hasTest ? 5 : 0);
      let testScore = hasTest ? 5 : 0;
      let deployScore = hasPages ? 5 : 0;
      let maintainability = sizeKB > 50 ? 5 : 2;
      let usefulness = Math.min(5, Math.round(Math.log10(stars + 1) * 3));

      // Subtract points for empty/minimal/fork repos
      if (repoCategory === "FORK" || repoCategory === "MINIMAL" || repoCategory === "EMPTY" || repoCategory === "PROFILE_CONFIG") {
        completeness = 0;
        techComplexity = 0;
        architecture = 2;
        codeStructure = 2;
        engPractices = 0;
        testScore = 0;
        deployScore = 0;
      }

      const totalScore = Math.min(100, completeness + techComplexity + architecture + codeStructure + docScore + engPractices + testScore + deployScore + maintainability + usefulness);

      let qualityTier: ProjectQualityBreakdown["qualityTier"] = "Basic Academic";
      if (totalScore >= 95) qualityTier = "Exceptional Open Source";
      else if (totalScore >= 85) qualityTier = "Excellent Production";
      else if (totalScore >= 70) qualityTier = "Strong Engineering";
      else if (totalScore >= 50) qualityTier = "Good Complete";
      else if (totalScore >= 30) qualityTier = "Decent Academic";
      else if (totalScore >= 15) qualityTier = "Basic Academic";
      else if (totalScore >= 5) qualityTier = "Tiny Exercise";
      else qualityTier = "Empty/Config";

      const projectQualityBreakdown: ProjectQualityBreakdown = {
        completeness,
        technicalDepth: techComplexity,
        architectureStructure: architecture,
        codeStructure,
        documentation: docScore,
        engineeringPractices: engPractices,
        testing: testScore,
        deployment: deployScore,
        maintainability,
        usefulness,
        totalScore,
        qualityTier,
      };

      // Separate Maintenance Analysis
      const daysSinceUpdate = repo.updated_at
        ? Math.floor((now - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      let maintenanceScore = daysSinceUpdate <= 30 ? 100 : daysSinceUpdate <= 90 ? 70 : daysSinceUpdate <= 180 ? 40 : 15;
      if (sizeKB < 15 && daysSinceUpdate <= 7) maintenanceScore = 30;

      const maintenanceStatus = daysSinceUpdate <= 30
        ? "Actively Maintained 🟢"
        : daysSinceUpdate <= 180
        ? "Stable / Inactive 🟡"
        : "Legacy Repository 🔴";

      let selectionReason = `Analyzed as a ${repoCategory.toLowerCase().replace(/_/g, " ")} with quality score ${totalScore}/100.`;
      if (hasPages) selectionReason = `Verified project with live web deployment (${totalScore}/100 quality).`;
      else if (stars >= 5) selectionReason = `Community recognized project with ${stars} star(s) (${totalScore}/100 quality).`;

      return {
        name: repo.name,
        description: repo.description || null,
        language,
        stars,
        forks: forksCount,
        updatedAt: repo.updated_at ? new Date(repo.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recently",
        url: repo.html_url,
        topics,
        repoCategory,
        projectQualityScore: totalScore,
        projectQualityBreakdown,
        selectionReason,
        maintenanceScore,
        maintenanceStatus,
        hasFE,
        hasBE,
        hasDB,
        hasTest,
        hasCiCd,
        hasPages,
        hasReadme,
      };
    });

    // Valid Original Projects
    const validOriginalProjects = classifiedRepos.filter(
      r => r.repoCategory !== "FORK" && r.repoCategory !== "EMPTY" && r.repoCategory !== "MINIMAL" && r.repoCategory !== "PROFILE_CONFIG"
    ).sort((a, b) => b.projectQualityScore - a.projectQualityScore);

    // ── 3. STRICT FORMULA CALCULATION FOR FINAL DEVELOPER SCORE /100 ──
    const bestProj = validOriginalProjects[0];
    const secondBestProj = validOriginalProjects[1];
    const thirdBestProj = validOriginalProjects[2];

    const bestScore = bestProj ? bestProj.projectQualityScore : 0;
    const secondBestScore = secondBestProj ? secondBestProj.projectQualityScore : 0;
    const thirdBestScore = thirdBestProj ? thirdBestProj.projectQualityScore : 0;

    const overallAvgScore = validOriginalProjects.length > 0
      ? validOriginalProjects.reduce((acc, r) => acc + r.projectQualityScore, 0) / validOriginalProjects.length
      : 0;

    // Technical Depth
    const reposWithFE = validOriginalProjects.filter(r => r.hasFE);
    const reposWithBE = validOriginalProjects.filter(r => r.hasBE);
    const reposWithDB = validOriginalProjects.filter(r => r.hasDB);
    const techDepthScore = Math.min(100, (reposWithFE.length > 0 ? 35 : 0) + (reposWithBE.length > 0 ? 35 : 0) + (reposWithDB.length > 0 ? 30 : 0));

    // Engineering Practices
    const reposWithTests = validOriginalProjects.filter(r => r.hasTest).length;
    const reposWithCiCd = validOriginalProjects.filter(r => r.hasCiCd).length;
    const reposWithDeploy = validOriginalProjects.filter(r => r.hasPages).length;
    const engPracticesScore = Math.min(100, (reposWithCiCd > 0 ? 40 : 0) + (reposWithTests > 0 ? 35 : 0) + (reposWithDeploy > 0 ? 25 : 0));

    // Portfolio Depth
    const meaningfulCount = flagshipCount + strongCount + standardCount;
    const portfolioDepthScore = Math.min(100, meaningfulCount >= 3 ? 100 : meaningfulCount === 2 ? 70 : meaningfulCount === 1 ? 40 : 15);

    // Documentation
    const reposWithReadme = validOriginalProjects.filter(r => r.hasReadme).length;
    const docScore = Math.min(100, (reposWithReadme > 0 ? 60 : 0) + (userData.bio ? 40 : 0));

    // Maintenance & Consistency
    const daysSinceUpdate = validOriginalProjects[0]?.updatedAt
      ? Math.floor((now - new Date(allRepos[0]?.updated_at || now).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const maintenanceScore = daysSinceUpdate <= 30 ? 100 : daysSinceUpdate <= 90 ? 70 : 40;

    // Collaboration / Open Source
    const totalStars = validOriginalProjects.reduce((acc, r) => acc + r.stars, 0);
    const collabScore = Math.min(100, totalStars > 100 ? 100 : totalStars > 10 ? 60 : totalStars > 0 ? 30 : 10);

    // ── STRICT DEVELOPER SCORE FORMULA /100 ──
    const scoreA = Math.min(30, Math.round((bestScore * 30) / 100));
    const scoreB = Math.min(20, Math.round((overallAvgScore * 20) / 100));
    const scoreC = Math.min(15, Math.round((techDepthScore * 15) / 100));
    const scoreD = Math.min(10, Math.round((engPracticesScore * 10) / 100));
    const scoreE = Math.min(10, Math.round((portfolioDepthScore * 10) / 100));
    const scoreF = Math.min(5, Math.round((docScore * 5) / 100));
    const scoreG = Math.min(5, Math.round((maintenanceScore * 5) / 100));
    const scoreH = Math.min(5, Math.round((collabScore * 5) / 100));

    let devScore = Math.min(100, Math.max(0, scoreA + scoreB + scoreC + scoreD + scoreE + scoreF + scoreG + scoreH));

    if (devScore >= 90) {
      const has90PlusEvidence = bestScore >= 75 && (reposWithFE.length > 0 && reposWithBE.length > 0) && (reposWithCiCd > 0 || reposWithTests > 0) && meaningfulCount >= 2;
      if (!has90PlusEvidence) {
        devScore = Math.min(88, devScore);
      }
    }

    const catAEvid: string[] = [];
    if (bestProj) catAEvid.push(`Best Flagship project "${bestProj.name}" score: ${bestScore}/100 (+${scoreA} pts)`);
    else catAEvid.push("No original projects found (0 pts)");

    const catBEvid: string[] = [`Average quality across ${validOriginalProjects.length} projects: ${Math.round(overallAvgScore)}/100 (+${scoreB} pts)`];

    const catCEvid: string[] = [];
    if (reposWithFE.length > 0) catCEvid.push(`Frontend code detected (+5 pts)`);
    if (reposWithBE.length > 0) catCEvid.push(`Backend server logic detected (+5 pts)`);
    if (reposWithDB.length > 0) catCEvid.push(`Database integration detected (+5 pts)`);
    if (catCEvid.length === 0) catCEvid.push("No public evidence of backend or database logic (0 pts)");

    const catDEvid: string[] = [];
    if (reposWithCiCd > 0) catDEvid.push(`CI/CD or Docker in ${reposWithCiCd} project(s) (+5 pts)`);
    if (reposWithTests > 0) catDEvid.push(`Automated unit testing in ${reposWithTests} project(s) (+3 pts)`);
    if (reposWithDeploy > 0) catDEvid.push(`Live web deployment (+2 pts)`);
    if (catDEvid.length === 0) catDEvid.push("No automated tests, CI/CD, or container configuration (0 pts)");

    const catEEvid: string[] = [`${meaningfulCount} meaningful project(s) verified (+${scoreE} pts)`];
    const catFEvid: string[] = [`${reposWithReadme}/${validOriginalProjects.length} projects have README documentation (+${scoreF} pts)`];
    const catGEvid: string[] = [`Code updated within ${daysSinceUpdate <= 30 ? "last 30 days" : `${daysSinceUpdate} days`} (+${scoreG} pts)`];
    const catHEvid: string[] = [`${totalStars} total community stars (+${scoreH} pts)`];

    const scoreBreakdown: CategoryScoreBreakdown = {
      bestProjectQuality: { score: scoreA, max: 30, evidence: catAEvid },
      overallProjectQuality: { score: scoreB, max: 20, evidence: catBEvid },
      technicalDepth: { score: scoreC, max: 15, evidence: catCEvid },
      engineeringPractices: { score: scoreD, max: 10, evidence: catDEvid },
      portfolioDepth: { score: scoreE, max: 10, evidence: catEEvid },
      documentation: { score: scoreF, max: 5, evidence: catFEvid },
      maintenanceConsistency: { score: scoreG, max: 5, evidence: catGEvid },
      collaborationOpenSource: { score: scoreH, max: 5, evidence: catHEvid },
    };

    let devLevel = "Beginner Portfolio";
    if (devScore >= 95) devLevel = "Elite Engineering Profile";
    else if (devScore >= 90) devLevel = "Exceptional Developer";
    else if (devScore >= 85) devLevel = "Advanced Developer";
    else if (devScore >= 75) devLevel = "Strong Developer";
    else if (devScore >= 65) devLevel = "Capable Developer";
    else if (devScore >= 50) devLevel = "Good Foundation Developer";
    else if (devScore >= 35) devLevel = "Developing Developer";
    else if (devScore >= 20) devLevel = "Beginner Portfolio";
    else devLevel = "Very Limited Evidence";

    let devStars = "☆☆☆☆☆";
    if (devScore >= 85) devStars = "★★★★★";
    else if (devScore >= 70) devStars = "★★★★☆";
    else if (devScore >= 50) devStars = "★★★☆☆";
    else if (devScore >= 35) devStars = "★★☆☆☆";
    else if (devScore >= 20) devStars = "★☆☆☆☆";

    let evidenceConfidence: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
    let confidenceReason = "Analysis based on available public repositories.";
    if (validOriginalProjects.length >= 3 && reposWithReadme >= 2) {
      evidenceConfidence = "HIGH";
      confidenceReason = "Verified deep evidence across multiple substantial public repositories.";
    } else if (validOriginalProjects.length === 1) {
      evidenceConfidence = "MEDIUM";
      confidenceReason = "Only 1 substantial public project available, but project quality was deeply inspected.";
    } else if (validOriginalProjects.length === 0) {
      evidenceConfidence = "LOW";
      confidenceReason = "Insufficient public evidence. Repositories are mostly forks, minimal, or empty.";
    }

    const transparencyAudit: TransparencyAudit = {
      totalPublicRepos: userData.public_repos || allRepos.length,
      repositoriesInspected: allRepos.length,
      meaningfulProjects: meaningfulCount,
      academicProjects: academicCount,
      assignments: assignmentCount,
      internshipTasks: internshipCount,
      tutorials: tutorialCount,
      practiceRepos: practiceCount,
      forks: forkCount,
      profileConfigRepos: profileConfigCount,
      minimalEmptyRepos: minimalCount + emptyCount,
      disclaimer: "This assessment is based only on publicly accessible GitHub evidence and should not be interpreted as a complete measurement of the developer's abilities.",
    };

    const separateMetrics: SeparateQualityMetrics = {
      bestProjectQuality: bestScore,
      portfolioDepth: portfolioDepthScore,
      engineeringQuality: engPracticesScore,
      technicalBreadth: Math.min(100, (reposWithFE.length > 0 ? 35 : 0) + (reposWithBE.length > 0 ? 35 : 0) + (reposWithDB.length > 0 ? 30 : 0)),
      maintenance: maintenanceScore,
    };

    const scoreStrengths: string[] = [];
    const scoreNeedsImp: string[] = [];

    if (bestProj) scoreStrengths.push(`Best project "${bestProj.name}" quality rated at ${bestScore}/100 (${bestProj.projectQualityBreakdown.qualityTier})`);
    if (reposWithFE.length > 0 && reposWithBE.length > 0) scoreStrengths.push("Verified full-stack implementation evidence (Frontend + Backend)");
    if (daysSinceUpdate <= 30) scoreStrengths.push("Active code commits within the last 30 days");

    if (meaningfulCount <= 1) scoreNeedsImp.push("Only 1 meaningful project discovered (build more portfolio projects)");
    if (reposWithReadme === 0) scoreNeedsImp.push("No public README documentation detected");
    if (reposWithTests === 0) scoreNeedsImp.push("No public automated testing evidence detected");
    if (!userData.blog) scoreNeedsImp.push("No portfolio website linked to profile");

    // Skill Confidence
    const detectedSkillsSet = new Set<string>();
    validOriginalProjects.forEach(r => {
      if (r.language) detectedSkillsSet.add(r.language);
      TECH_RULES.forEach(rule => {
        const isMatched = rule.matchers.some(m => {
          if (m instanceof RegExp) return m.test(`${r.name} ${r.description || ""}`.toLowerCase());
          return `${r.name} ${r.description || ""}`.toLowerCase().includes(m.toLowerCase());
        });
        if (isMatched) detectedSkillsSet.add(rule.name);
      });
    });

    const getConfidence = (hasEvidence: boolean, repoList: ClassifiedRepoInfo[], explicitTag: boolean): SkillConfidenceItem => {
      const supportingRepos = repoList.map(r => r.name);
      if (!hasEvidence && !explicitTag) {
        return {
          score: 0,
          confidence: "INSUFFICIENT EVIDENCE",
          evidence: ["Not enough public evidence detected"],
          reason: "No code implementation or dependency detected in public repositories.",
          supportingRepos: [],
        };
      }
      if (repoList.length >= 2 && explicitTag) {
        return {
          score: Math.min(95, 60 + repoList.length * 8),
          confidence: "HIGH CONFIDENCE",
          evidence: ["Verified source code files", "Multiple project implementations"],
          reason: `Verified in ${repoList.length} repository codebase(s).`,
          supportingRepos,
        };
      }
      return {
        score: 55,
        confidence: "MEDIUM CONFIDENCE",
        evidence: ["Repository structure or framework tag"],
        reason: "Detected from repository structure.",
        supportingRepos,
      };
    };

    const feConf = getConfidence(reposWithFE.length > 0, reposWithFE, detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js"));
    const beConf = getConfidence(reposWithBE.length > 0, reposWithBE, detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Express") || detectedSkillsSet.has("Python") || detectedSkillsSet.has("Go"));
    const dbConf = getConfidence(reposWithDB.length > 0, reposWithDB, detectedSkillsSet.has("MongoDB") || detectedSkillsSet.has("MySQL") || detectedSkillsSet.has("PostgreSQL") || detectedSkillsSet.has("Firebase"));
    const aiConf = getConfidence(detectedSkillsSet.has("TensorFlow"), validOriginalProjects.filter(r => r.name.includes("tensor")), detectedSkillsSet.has("TensorFlow"));
    const devOpsConf = getConfidence(reposWithCiCd > 0, validOriginalProjects.filter(r => r.hasCiCd), detectedSkillsSet.has("Docker") || detectedSkillsSet.has("GitHub Workflows") || detectedSkillsSet.has("Nix / SaltStack"));
    const cloudConf = getConfidence(detectedSkillsSet.has("Firebase") || reposWithDeploy > 0, validOriginalProjects.filter(r => r.hasPages), detectedSkillsSet.has("Firebase"));
    const psConf = getConfidence(validOriginalProjects.length >= 1, validOriginalProjects, validOriginalProjects.length >= 2);
    const docConf = getConfidence(reposWithReadme > 0, validOriginalProjects.filter(r => r.hasReadme), reposWithReadme >= 2);
    const uiUxConf = getConfidence(detectedSkillsSet.has("Tailwind CSS"), validOriginalProjects.filter(r => r.name.includes("tailwind")), detectedSkillsSet.has("Tailwind CSS"));
    const testConf = getConfidence(reposWithTests > 0, validOriginalProjects.filter(r => r.hasTest), reposWithTests > 0);

    const isFullStackVerified = reposWithFE.length > 0 && reposWithBE.length > 0 && (reposWithDB.length > 0 || reposWithBE.length >= 2) && meaningfulCount >= 1;

    // ─────────────────────────────────────────────────────────────
    // EXACT TOP 10 ACHIEVEMENTS BADGE EVALUATION SYSTEM
    // ─────────────────────────────────────────────────────────────

    // 1. Frontend Developer ⚛️ (Requires meaningful FE project)
    const feProjects = validOriginalProjects.filter(r => r.hasFE && r.projectQualityScore >= 30);
    const isFrontendUnlocked = feProjects.length > 0;
    const feBadge: DeveloperBadge = {
      id: "frontend-developer",
      name: "Frontend Developer",
      description: "Build & publish meaningful frontend web applications",
      icon: "⚛️",
      unlocked: isFrontendUnlocked,
      glowColor: "rgba(56,189,248,0.6)",
      evidenceList: isFrontendUnlocked
        ? feProjects.map(r => `• ${r.name}: Frontend UI code verified (${r.projectQualityScore}/100 quality)`)
        : ["No meaningful frontend application project detected."],
      unlockReason: isFrontendUnlocked
        ? "Verified frontend application implementation in your public repositories."
        : "Requires at least one meaningful frontend project (React, Next.js, Vue, or modern JS/TS).",
      suggestion: "Build and publish a standalone frontend web application with interactive components.",
      requirementsChecklist: [
        { text: "Frontend framework / JS/TS codebase detected", satisfied: reposWithFE.length > 0 },
        { text: "Meaningful project quality (Score >= 30)", satisfied: feProjects.length > 0 },
      ],
    };

    // 2. Backend Engineer ⚙️ (Requires meaningful BE server/API)
    const beProjects = validOriginalProjects.filter(r => r.hasBE && r.projectQualityScore >= 30);
    const isBackendUnlocked = beProjects.length > 0;
    const beBadge: DeveloperBadge = {
      id: "backend-engineer",
      name: "Backend Engineer",
      description: "Create robust backend API servers and application logic",
      icon: "⚙️",
      unlocked: isBackendUnlocked,
      glowColor: "rgba(34,197,94,0.6)",
      evidenceList: isBackendUnlocked
        ? beProjects.map(r => `• ${r.name}: Backend server/API code verified (${r.projectQualityScore}/100 quality)`)
        : ["No backend API implementation detected in public repos."],
      unlockReason: isBackendUnlocked
        ? "Meaningful backend/server implementation was detected in your public repositories."
        : "Requires a backend API server (Node/Express, Python/FastAPI/Django, Go, Java, etc.).",
      suggestion: "Build a REST API server connecting request endpoints with business logic.",
      requirementsChecklist: [
        { text: "Backend framework / API server implementation", satisfied: reposWithBE.length > 0 },
        { text: "Meaningful project quality (Score >= 30)", satisfied: beProjects.length > 0 },
      ],
    };

    // 3. Full-Stack Builder 🚀 (Requires FE + BE in a single project)
    const fullStackProjects = validOriginalProjects.filter(r => r.hasFE && r.hasBE && r.projectQualityScore >= 35);
    const isFullStackUnlocked = fullStackProjects.length > 0;
    const fullStackBadge: DeveloperBadge = {
      id: "full-stack-builder",
      name: "Full-Stack Builder",
      description: "Build complete end-to-end applications connecting frontend & backend",
      icon: "🚀",
      unlocked: isFullStackUnlocked,
      glowColor: "rgba(168,85,247,0.7)",
      evidenceList: isFullStackUnlocked
        ? fullStackProjects.map(r => `• ${r.name}: Integrated FE + BE codebase verified (${r.projectQualityScore}/100 quality)`)
        : ["No single project combines both frontend and backend logic."],
      unlockReason: isFullStackUnlocked
        ? "Meaningful full-stack project combining frontend UI and backend API detected."
        : "Requires at least one single meaningful project containing BOTH frontend and backend.",
      suggestion: "Connect your frontend application to your backend API server in a single project repository.",
      requirementsChecklist: [
        { text: "Frontend project codebase detected", satisfied: reposWithFE.length > 0 },
        { text: "Backend project codebase detected", satisfied: reposWithBE.length > 0 },
        { text: "Single repository combines FE + BE", satisfied: isFullStackUnlocked },
      ],
    };

    // 4. Database Architect 🗄️ (Requires DB integration in real app)
    const dbProjects = validOriginalProjects.filter(r => r.hasDB && r.projectQualityScore >= 25);
    const isDbUnlocked = dbProjects.length > 0;
    const dbBadge: DeveloperBadge = {
      id: "database-architect",
      name: "Database Architect",
      description: "Integrate database schemas and data persistence layers",
      icon: "🗄️",
      unlocked: isDbUnlocked,
      glowColor: "rgba(20,184,166,0.6)",
      evidenceList: isDbUnlocked
        ? dbProjects.map(r => `• ${r.name}: Database persistence verified (${r.projectQualityScore}/100 quality)`)
        : ["No database schemas or client queries detected in public codebases."],
      unlockReason: isDbUnlocked
        ? "Database persistence layers (MongoDB, PostgreSQL, MySQL, Firebase, Prisma, etc.) verified."
        : "Requires database integration (MongoDB, Postgres, MySQL, Firebase/Firestore, Prisma, etc.).",
      suggestion: "Integrate a database persistence layer to store and query application data.",
      requirementsChecklist: [
        { text: "Database ORM / driver / query integration", satisfied: isDbUnlocked },
        { text: "Meaningful application project", satisfied: dbProjects.length > 0 },
      ],
    };

    // 5. AI / ML Builder 🧠 (Requires real ML/AI API/Model implementation)
    const aiProjects = validOriginalProjects.filter(r => (r.name.toLowerCase().includes("tensor") || r.name.toLowerCase().includes("ai") || r.name.toLowerCase().includes("ml") || r.topics.includes("ai")) && r.projectQualityScore >= 30);
    const isAiUnlocked = aiProjects.length > 0 || detectedSkillsSet.has("TensorFlow");
    const aiBadge: DeveloperBadge = {
      id: "ai-ml-builder",
      name: "AI / ML Builder",
      description: "Implement Machine Learning models, Computer Vision, or AI integrations",
      icon: "🧠",
      unlocked: isAiUnlocked,
      glowColor: "rgba(236,72,153,0.6)",
      evidenceList: isAiUnlocked
        ? aiProjects.map(r => `• ${r.name}: AI/ML implementation verified (${r.projectQualityScore}/100 quality)`)
        : ["No AI/ML model training or API implementation detected in codebase."],
      unlockReason: isAiUnlocked
        ? "Verified AI/ML libraries or API integrations in your project repository."
        : "Requires implementing Machine Learning models or AI API integrations in a real app.",
      suggestion: "Build a project using PyTorch, TensorFlow, Scikit-learn, or OpenAI/AI API integrations.",
      requirementsChecklist: [
        { text: "AI/ML codebase or API integration", satisfied: isAiUnlocked },
        { text: "Non-trivial project implementation", satisfied: aiProjects.length > 0 },
      ],
    };

    // 6. API Architect 🔗 (Requires REST/GraphQL API endpoints creation)
    const apiProjects = validOriginalProjects.filter(r => (r.hasBE || r.name.toLowerCase().includes("api")) && r.projectQualityScore >= 30);
    const isApiUnlocked = apiProjects.length > 0;
    const apiBadge: DeveloperBadge = {
      id: "api-architect",
      name: "API Architect",
      description: "Design & implement RESTful or GraphQL backend API services",
      icon: "🔗",
      unlocked: isApiUnlocked,
      glowColor: "rgba(99,102,241,0.6)",
      evidenceList: isApiUnlocked
        ? apiProjects.map(r => `• ${r.name}: REST API routes & endpoints verified (${r.projectQualityScore}/100 quality)`)
        : ["No REST/GraphQL backend route definitions found in public repos."],
      unlockReason: isApiUnlocked
        ? "RESTful/GraphQL backend API routes and service architecture verified."
        : "Requires designing and publishing backend API routes/endpoints.",
      suggestion: "Create structured REST API endpoints (GET, POST, PUT, DELETE) in a backend project.",
      requirementsChecklist: [
        { text: "Backend REST/GraphQL route definitions", satisfied: isApiUnlocked },
        { text: "Meaningful API service architecture", satisfied: apiProjects.length > 0 },
      ],
    };

    // 7. Deployment Ready ☁️ (Requires Vercel/Netlify/Pages or Docker/CI-CD)
    const deployProjects = validOriginalProjects.filter(r => r.hasPages || r.hasCiCd);
    const isDeployUnlocked = deployProjects.length > 0;
    const deployBadge: DeveloperBadge = {
      id: "deployment-ready",
      name: "Deployment Ready",
      description: "Deploy live applications or configure cloud deployment pipelines",
      icon: "☁️",
      unlocked: isDeployUnlocked,
      glowColor: "rgba(14,165,233,0.6)",
      evidenceList: isDeployUnlocked
        ? deployProjects.map(r => `• ${r.name}: ${r.hasPages ? "Live web URL verified" : "CI/CD & Docker config verified"}`)
        : ["No live web URL, Vercel/Netlify links, or Docker/CI-CD setup found."],
      unlockReason: isDeployUnlocked
        ? "Live application URL deployment or automated CI/CD container configuration verified."
        : "Requires deploying a web app live (Vercel/Netlify/Render) or adding Docker/CI-CD.",
      suggestion: "Deploy your project live to Vercel, Netlify, or GitHub Pages and add the URL to your repo header.",
      requirementsChecklist: [
        { text: "Live web application homepage URL", satisfied: reposWithDeploy > 0 },
        { text: "Docker / GitHub Actions pipeline", satisfied: reposWithCiCd > 0 },
      ],
    };

    // 8. Documentation Pro 📚 (Requires multiple repos with strong README)
    const readmeProjects = validOriginalProjects.filter(r => r.hasReadme);
    const isDocUnlocked = readmeProjects.length >= 2;
    const docBadge: DeveloperBadge = {
      id: "documentation-pro",
      name: "Documentation Pro",
      description: "Maintain comprehensive README documentation across repositories",
      icon: "📚",
      unlocked: isDocUnlocked,
      glowColor: "rgba(16,185,129,0.6)",
      evidenceList: isDocUnlocked
        ? readmeProjects.map(r => `• ${r.name}: Complete README documentation verified`)
        : [`Only ${readmeProjects.length} repository has detailed README documentation.`],
      unlockReason: isDocUnlocked
        ? "Comprehensive README documentation verified across multiple repositories."
        : "Requires detailed README documentation (setup, tech stack, screenshots) across at least 2 projects.",
      suggestion: "Add clear setup steps, tech stack details, and feature descriptions to your project READMEs.",
      requirementsChecklist: [
        { text: "First repository README documentation", satisfied: readmeProjects.length >= 1 },
        { text: "Second repository README documentation", satisfied: readmeProjects.length >= 2 },
      ],
    };

    // 9. Open Source Contributor 🌐 (Requires real community stars/forks on original repos)
    const isCollabUnlocked = totalStars >= 25 || (userData.public_repos > 5 && validOriginalProjects.length >= 3);
    const collabBadge: DeveloperBadge = {
      id: "open-source-contributor",
      name: "Open Source Contributor",
      description: "Publish open source repositories with verified community recognition",
      icon: "🌐",
      unlocked: isCollabUnlocked,
      glowColor: "rgba(245,158,11,0.6)",
      evidenceList: isCollabUnlocked
        ? [`• ${totalStars} total community stars across original repositories`, `• ${validOriginalProjects.length} published original repositories`]
        : ["No public collaboration or community star recognition yet."],
      unlockReason: isCollabUnlocked
        ? "Verified open source publications with community recognition."
        : "Requires publishing meaningful original repositories with community stars or PR contributions.",
      suggestion: "Share your original projects on developer communities to earn stargazers and contributors.",
      requirementsChecklist: [
        { text: "Published original open source projects", satisfied: validOriginalProjects.length >= 2 },
        { text: "Community stargazers or PR contributions", satisfied: totalStars >= 25 },
      ],
    };

    // 10. Elite Builder 👑 (HARDEST: Dev Score >= 90 AND Best Proj >= 85 AND >= 3 badges)
    const preUnlockedBadges = [feBadge, beBadge, fullStackBadge, dbBadge, aiBadge, apiBadge, deployBadge, docBadge, collabBadge].filter(b => b.unlocked).length;
    const isEliteUnlocked = devScore >= 90 && bestScore >= 85 && preUnlockedBadges >= 3;
    const eliteBadge: DeveloperBadge = {
      id: "elite-builder",
      name: "Elite Builder",
      description: "Master level developer profile demonstrating top-tier software engineering",
      icon: "👑",
      unlocked: isEliteUnlocked,
      glowColor: "rgba(250,204,21,0.8)",
      evidenceList: isEliteUnlocked
        ? [
            `• Developer Score: ${devScore}/100 (Required: >= 90)`,
            `• Best Project Quality: ${bestScore}/100 (Required: >= 85)`,
            `• Unlocked Badges: ${preUnlockedBadges} (Required: >= 3)`,
          ]
        : [
            `• Current Developer Score: ${devScore}/100 (Required: >= 90)`,
            `• Best Project Quality: ${bestScore}/100 (Required: >= 85)`,
            `• Unlocked Badges: ${preUnlockedBadges}/10 (Required: >= 3)`,
          ],
      unlockReason: isEliteUnlocked
        ? "Elite engineering portfolio status achieved with top-tier project quality and score >= 90."
        : "Requires Developer Score >= 90, Flagship Project Quality >= 85, and at least 3 other unlocked badges.",
      suggestion: "Build a flagship production-level project with unit tests, CI/CD, database, and live deployment to reach Elite status.",
      requirementsChecklist: [
        { text: "Developer Score >= 90", satisfied: devScore >= 90 },
        { text: "Flagship Project Quality >= 85", satisfied: bestScore >= 85 },
        { text: "At least 3 other achievements unlocked", satisfied: preUnlockedBadges >= 3 },
      ],
    };

    const badges: DeveloperBadge[] = [
      feBadge,
      beBadge,
      fullStackBadge,
      dbBadge,
      aiBadge,
      apiBadge,
      deployBadge,
      docBadge,
      collabBadge,
      eliteBadge,
    ];

    const techBreakdown: Record<string, number> = {};
    validOriginalProjects.forEach(r => {
      if (r.language) techBreakdown[r.language] = (techBreakdown[r.language] || 0) + 1;
    });

    const mostUsedLanguages: { language: string; percentage: number; count: number }[] = Object.entries(techBreakdown)
      .map(([language, count]) => ({
        language,
        count: Number(count),
        percentage: Math.round((Number(count) / (validOriginalProjects.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const sortedBestRepos = [...validOriginalProjects].sort((a, b) => b.projectQualityScore - a.projectQualityScore);

    const growth: ProjectGrowthMetrics = {
      reposCreatedCount: allRepos.length,
      technologiesLearnedCount: detectedSkillsSet.size,
      activityTrend: daysSinceUpdate <= 30 ? "Active Development 📈" : "Steady Profile 🏗️",
      mostProductiveMonth: validOriginalProjects[0]?.updatedAt || "Recent Months",
      latestProject: validOriginalProjects[0] ? { name: validOriginalProjects[0].name, url: validOriginalProjects[0].url, date: validOriginalProjects[0].updatedAt } : null,
      mostSuccessfulProject: sortedBestRepos[0] ? { name: sortedBestRepos[0].name, url: sortedBestRepos[0].url, stars: sortedBestRepos[0].stars } : null,
    };

    const totalXP = devScore * 10;

    const developerMetrics: DeveloperMetrics = {
      score: devScore,
      evidenceConfidence,
      confidenceReason,
      separateMetrics,
      level: devLevel,
      levelNum: Math.max(1, Math.floor(devScore / 10) + 1),
      xpCurrent: Math.round(totalXP % 100),
      xpMax: 100,
      xpPercentage: Math.min(100, Math.round(((totalXP % 100) / 100) * 100)),
      nextLevelRequirements: ["+1 Substantial Project with README & Tests"],
      nextRewardBadge: "Master Engineer Badge",
      stars: devStars,
      rankPercentile: null,
      category: isFullStackVerified ? "Full Stack Engineer" : "Software Developer",
      scoreBreakdown,
      transparencyAudit,
      scoreExplanation: {
        strengths: scoreStrengths,
        needsImprovement: scoreNeedsImp,
      },
      skillsBreakdown: {
        frontend: feConf.score,
        backend: beConf.score,
        database: dbConf.score,
        aiMl: aiConf.score,
        devOps: devOpsConf.score,
        cloud: cloudConf.score,
        problemSolving: psConf.score,
        documentation: docConf.score,
        uiUx: uiUxConf.score,
        testing: testConf.score,
      },
      skillsConfidence: {
        frontend: feConf,
        backend: beConf,
        database: dbConf,
        aiMl: aiConf,
        devOps: devOpsConf,
        cloud: cloudConf,
        problemSolving: psConf,
        documentation: docConf,
        uiUx: uiUxConf,
        testing: testConf,
      },
      badges,
    };

    const startupLevel = isFullStackVerified ? "Strong" : meaningfulCount >= 1 ? "Moderate" : "Developing";
    const enterpriseLevel = reposWithCiCd > 0 && reposWithTests > 0 ? "Strong" : reposWithCiCd > 0 ? "Moderate" : "Needs Evidence";
    const freelancerLevel = reposWithFE.length > 0 && userData.blog ? "Strong" : reposWithFE.length > 0 ? "Moderate" : "Developing";

    const developerPersonality: DeveloperPersonality = {
      archetype: isFullStackVerified ? "Full Stack Creator" : reposWithBE.length > 0 ? "Backend Systems Engineer" : reposWithFE.length > 0 ? "Frontend Developer" : "Software Developer",
      title: isFullStackVerified ? "Full Stack Engineer" : "Software Developer",
      bestCareerPath: isFullStackVerified ? "Full Stack Software Engineering" : "Software Development",
      readinessScores: {
        startupReadiness: startupLevel === "Strong" ? 80 : startupLevel === "Moderate" ? 55 : 30,
        enterpriseReadiness: enterpriseLevel === "Strong" ? 85 : enterpriseLevel === "Moderate" ? 50 : 25,
        freelancerPotential: freelancerLevel === "Strong" ? 85 : freelancerLevel === "Moderate" ? 55 : 30,
        leadershipPotential: totalStars > 50 ? 70 : 40,
      },
      readinessLevels: {
        startupReadiness: startupLevel,
        enterpriseReadiness: enterpriseLevel,
        freelancerPotential: freelancerLevel,
        leadershipPotential: "Developing",
      },
      developerStyleTraits: [
        meaningfulCount >= 1
          ? `Best project "${bestProj?.name || ''}" rated at ${bestScore}/100 quality.`
          : "Currently building initial portfolio projects.",
      ],
    };

    const actionPlan: ActionPlanSection = {
      quickWins: [
        "Add short descriptions and topics to all public repositories.",
        "Add your portfolio or LinkedIn link to your GitHub profile bio.",
      ],
      next7Days: [
        "Create a detailed README.md for your primary repository with screenshots and setup steps.",
        "Deploy your web project to Vercel/Netlify and link the live URL in the repo header.",
      ],
      next30Days: [
        "Build a full stack application connecting a frontend framework, REST API server, and database.",
        "Add basic automated unit tests or GitHub Actions workflow to your repository.",
      ],
      beforeApplying: [
        "Ensure all project repositories have clean code organization, zero broken links, and 100% complete README documentation.",
        "Pin your 3 strongest projects to your main GitHub profile overview.",
      ],
    };

    const result: GitHubAnalysisResult = {
      username: userData.login,
      name: userData.name || null,
      avatarUrl: userData.avatar_url,
      bio: userData.bio || null,
      followers: userData.followers || 0,
      following: userData.following || 0,
      publicReposCount: userData.public_repos || allRepos.length,
      createdAt: userData.created_at ? new Date(userData.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "",
      portfolioUrl: userData.blog ? (userData.blog.startsWith("http") ? userData.blog : `https://${userData.blog}`) : null,
      detectedSkills: Array.from(detectedSkillsSet),
      mostUsedLanguages,
      technologyBreakdown: techBreakdown,
      bestProjects: sortedBestRepos.slice(0, 3),
      developerMetrics,
      developerPersonality,
      developerJourney: {
        timeline: [
          {
            title: "Joined GitHub",
            subtitle: `Created @${userData.login} account`,
            date: userData.created_at ? new Date(userData.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Start",
            icon: "🎉",
            badgeText: "Account Created",
          },
          {
            title: `Current Band: ${devLevel}`,
            subtitle: `Analyzed ${validOriginalProjects.length} original project(s)`,
            date: "Present",
            icon: "🏆",
            badgeText: "Current Band",
          },
        ],
        growth,
      },
      recruiterPerspective: {
        recruiterStrengths: scoreStrengths.length > 0 ? scoreStrengths : ["Published code on GitHub"],
        areasToImprove: scoreNeedsImp.length > 0 ? scoreNeedsImp : ["Add README descriptions to all repositories"],
        overallImpression: `Verified developer evidence. Best project quality score: ${bestScore}/100.`,
        readinessStatus: isFullStackVerified ? "INTERNSHIP READY" : "DEVELOPING PORTFOLIO",
      },
      actionPlan,
      healthReport: {
        strengths: scoreStrengths.length > 0 ? scoreStrengths : ["Public GitHub account established"],
        improvements: Array.from(new Set([...scoreNeedsImp])),
        score: devScore,
        healthLevelText: devLevel,
      },
      activityInsights: {
        lastUpdatedRepo: validOriginalProjects[0]?.name || null,
        mostActiveLanguage: mostUsedLanguages[0]?.language || null,
        recentActivityStatus: daysSinceUpdate <= 30 ? `Actively updated ${daysSinceUpdate === 0 ? "Today" : `${daysSinceUpdate} days ago`}` : "Limited recent activity",
        isInactive: daysSinceUpdate > 90,
      },
      aiRecommendations: [
        reposWithBE.length === 0 ? "Build a Node.js/Python backend REST API server." : "Add database persistence using MongoDB or PostgreSQL.",
        !reposWithDeploy ? "Deploy web applications live to Vercel/Netlify." : "Write automated unit tests using Jest/Vitest.",
        "Include architecture diagrams and API docs in repository READMEs.",
        "Pin your top 3 best projects on your GitHub profile overview.",
      ],
      cachedAt: new Date().toISOString(),
    };

    cache.set(username, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GitHub Intelligence V6 API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze GitHub profile" }, { status: 500 });
  }
}
