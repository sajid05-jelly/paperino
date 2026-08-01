import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES (Evidence Engine V6 - Strict Quality First)
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

export interface DeveloperBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  glowColor: string;
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
      } else if (corpus.includes("internship") || corpus.includes("task-1") || corpus.includes("task1") || corpus.includes("task-2")) {
        repoCategory = "INTERNSHIP_TASK";
        internshipCount++;
      } else if (corpus.includes("assignment") || corpus.includes("homework") || corpus.includes("lab")) {
        repoCategory = "ASSIGNMENT";
        assignmentCount++;
      } else if (corpus.includes("tutorial") || corpus.includes("course") || corpus.includes("awesome") || corpus.includes("sample")) {
        repoCategory = "TUTORIAL";
        tutorialCount++;
      } else if (corpus.includes("practice") || corpus.includes("exercise") || corpus.includes("test-repo")) {
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
      if (sizeKB < 15 && daysSinceUpdate <= 7) maintenanceScore = 30; // Single trivial commit yesterday is NOT highly maintained

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

    // Valid Original Projects (Excluding Forks, Empty, Profile Configs)
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

    // Portfolio Depth (How many MEANINGFUL projects exist?)
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
    // BEST PROJECT QUALITY             30%
    // OVERALL PROJECT QUALITY          20%
    // TECHNICAL DEPTH                  15%
    // ENGINEERING PRACTICES            10%
    // PORTFOLIO DEPTH                  10%
    // DOCUMENTATION                     5%
    // MAINTENANCE & CONSISTENCY         5%
    // COLLABORATION / OPEN SOURCE       5%
    const scoreA = Math.min(30, Math.round((bestScore * 30) / 100));
    const scoreB = Math.min(20, Math.round((overallAvgScore * 20) / 100));
    const scoreC = Math.min(15, Math.round((techDepthScore * 15) / 100));
    const scoreD = Math.min(10, Math.round((engPracticesScore * 10) / 100));
    const scoreE = Math.min(10, Math.round((portfolioDepthScore * 10) / 100));
    const scoreF = Math.min(5, Math.round((docScore * 5) / 100));
    const scoreG = Math.min(5, Math.round((maintenanceScore * 5) / 100));
    const scoreH = Math.min(5, Math.round((collabScore * 5) / 100));

    let devScore = Math.min(100, Math.max(0, scoreA + scoreB + scoreC + scoreD + scoreE + scoreF + scoreG + scoreH));

    // REQUIREMENTS FOR 90+ ENFORCEMENT:
    // A profile must NOT receive 90+ simply because it has repos/followers/stars/age.
    // Must demonstrate: at least one flagship/strong project (bestScore >= 75), FE+BE+DB evidence, CI/CD or testing, and >= 2 meaningful projects.
    if (devScore >= 90) {
      const has90PlusEvidence = bestScore >= 75 && (reposWithFE.length > 0 && reposWithBE.length > 0) && (reposWithCiCd > 0 || reposWithTests > 0) && meaningfulCount >= 2;
      if (!has90PlusEvidence) {
        devScore = Math.min(88, devScore); // Cap at 88 if strict 90+ evidence is missing
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

    // ── 4. STRICT SCORE BANDS ──
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

    // Evidence Confidence
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

    // PRINT FULL AUDIT LOG TO DEVELOPER CONSOLE
    console.log("==================================================");
    console.log(`GITHUB INTELLIGENCE SCORING AUDIT V6 FOR @${username}`);
    console.log("==================================================");
    console.log(`• Total Public Repositories: ${userData.public_repos || allRepos.length}`);
    console.log(`• Meaningful Projects: ${meaningfulCount} | Academic: ${academicCount} | Assignments: ${assignmentCount}`);
    console.log(`• Tutorials: ${tutorialCount} | Practice: ${practiceCount} | Forks: ${forkCount} | Empty/Minimal: ${minimalCount + emptyCount}`);
    console.log(`• Best Project Quality: ${bestScore}/100 ("${bestProj?.name || 'N/A'}")`);
    console.log(`• Overall Average Quality: ${Math.round(overallAvgScore)}/100`);
    console.log(`• Evidence Confidence: ${evidenceConfidence}`);
    console.log("--------------------------------------------------");
    console.log(`1. Best Project Quality     : ${scoreA}/30 -> ${catAEvid.join(", ")}`);
    console.log(`2. Overall Project Quality  : ${scoreB}/20 -> ${catBEvid.join(", ")}`);
    console.log(`3. Technical Depth          : ${scoreC}/15 -> ${catCEvid.join(", ")}`);
    console.log(`4. Engineering Practices   : ${scoreD}/10 -> ${catDEvid.join(", ")}`);
    console.log(`5. Portfolio Depth         : ${scoreE}/10 -> ${catEEvid.join(", ")}`);
    console.log(`6. Documentation            : ${scoreF}/5  -> ${catFEvid.join(", ")}`);
    console.log(`7. Maintenance & Consistency: ${scoreG}/5  -> ${catGEvid.join(", ")}`);
    console.log(`8. Collaboration / OpenSource: ${scoreH}/5  -> ${catHEvid.join(", ")}`);
    console.log("--------------------------------------------------");
    console.log(`FINAL DEVELOPER SCORE: ${devScore}/100 (${devLevel})`);
    console.log("==================================================");

    // ── 5. TRANSPARENCY AUDIT & SEPARATE METRICS ──
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

    // Explanations (Why you received this score)
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
    const levelNum = Math.max(1, Math.floor(devScore / 10) + 1);

    const developerMetrics: DeveloperMetrics = {
      score: devScore,
      evidenceConfidence,
      confidenceReason,
      separateMetrics,
      level: devLevel,
      levelNum,
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
      badges: [
        {
          id: "react-dev",
          name: "React Developer",
          description: "Published React/Next.js projects",
          icon: "⚛️",
          unlocked: detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js"),
          glowColor: "rgba(56,189,248,0.5)",
        },
        {
          id: "backend-dev",
          name: "Backend Engineer",
          description: "Created backend API servers",
          icon: "⚙️",
          unlocked: reposWithBE.length > 0,
          glowColor: "rgba(34,197,94,0.5)",
        },
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
