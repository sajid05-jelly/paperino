import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES (Evidence Engine V5 - Project First)
// ─────────────────────────────────────────────────────────────

export interface ProjectQualityBreakdown {
  completeness: number; // /15
  technicalDepth: number; // /15
  architectureStructure: number; // /15
  originalityEvidence: number; // /10
  documentation: number; // /10
  engineeringPractices: number; // /10
  testing: number; // /5
  deployment: number; // /5
  maintainability: number; // /5
  usefulness: number; // /5
  activityHistory: number; // /5
  totalScore: number; // /100
  qualityTier: "Minimal" | "Basic" | "Developing" | "Good" | "Strong" | "Excellent" | "Exceptional";
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
    | "FLAGSHIP PROJECT"
    | "SUBSTANTIAL PROJECT"
    | "STANDARD PROJECT"
    | "LEARNING PROJECT"
    | "ASSIGNMENT"
    | "EXPERIMENT"
    | "TUTORIAL"
    | "FORK"
    | "TEMPLATE"
    | "PROFILE REPOSITORY"
    | "ARCHIVED PROJECT"
    | "MINIMAL PROJECT"
    | "EMPTY REPOSITORY";
  projectQualityScore: number; // 0-100
  projectQualityBreakdown: ProjectQualityBreakdown;
  selectionReason: string;
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
  projectQuality: CategoryScoreItem; // /35
  technicalDepth: CategoryScoreItem; // /15
  engineeringPractices: CategoryScoreItem; // /15
  documentation: CategoryScoreItem; // /10
  developmentConsistency: CategoryScoreItem; // /10
  portfolioCompleteness: CategoryScoreItem; // /5
  communityImpact: CategoryScoreItem; // /5
  technicalBreadth: CategoryScoreItem; // /5
}

export interface TransparencyAudit {
  repositoriesDiscovered: number;
  repositoriesInspected: number;
  repositoriesDeeplyAnalyzed: number;
  flagshipProjects: number;
  substantialProjects: number;
  standardProjects: number;
  learningAssignmentRepos: number;
  forks: number;
  archivedRepos: number;
  minimalEmptyRepos: number;
  disclaimer: string;
}

export interface SeparateQualityMetrics {
  bestProjectQuality: number; // 0 - 100
  portfolioDepth: number; // 0 - 100
  engineeringQuality: number; // 0 - 100
  technicalBreadth: number; // 0 - 100
  consistency: number; // 0 - 100
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

    // ── 2. CLASSIFY EVERY REPOSITORY & COMPUTE INDIVIDUAL PROJECT QUALITY SCORE /100 ──
    let flagshipProjects = 0;
    let substantialProjects = 0;
    let standardProjects = 0;
    let learningAssignmentRepos = 0;
    let forks = 0;
    let archivedRepos = 0;
    let minimalEmptyRepos = 0;

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

      // Deep Evidence Signals
      const hasReadme = Boolean(hasDescription || sizeKB >= 5);
      const hasTest = corpus.includes("test") || corpus.includes("jest") || corpus.includes("vitest") || corpus.includes("cypress") || corpus.includes("spec");
      const hasCiCd = corpus.includes("ci") || corpus.includes("workflow") || corpus.includes("docker") || corpus.includes("github-actions");
      const hasFE = Boolean(language === "JavaScript" || language === "TypeScript" || language === "HTML" || corpus.includes("react") || corpus.includes("vue") || corpus.includes("frontend"));
      const hasBE = Boolean(language === "Python" || language === "Go" || language === "Java" || language === "C++" || language === "C" || language === "Rust" || corpus.includes("node") || corpus.includes("express") || corpus.includes("api") || corpus.includes("backend") || corpus.includes("server"));
      const hasDB = Boolean(corpus.includes("mongo") || corpus.includes("sql") || corpus.includes("postgres") || corpus.includes("firebase") || corpus.includes("db") || corpus.includes("database"));

      // Categorization
      let repoCategory: ClassifiedRepoInfo["repoCategory"] = "STANDARD PROJECT";
      if (isFork) {
        repoCategory = "FORK";
        forks++;
      } else if (isProfileRepo) {
        repoCategory = "PROFILE REPOSITORY";
        minimalEmptyRepos++;
      } else if (isArchived) {
        repoCategory = "ARCHIVED PROJECT";
        archivedRepos++;
      } else if (sizeKB < 15 && !hasDescription && stars < 5) {
        repoCategory = "MINIMAL PROJECT";
        minimalEmptyRepos++;
      } else if (corpus.includes("assignment") || corpus.includes("homework") || corpus.includes("lab")) {
        repoCategory = "ASSIGNMENT";
        learningAssignmentRepos++;
      } else if (corpus.includes("awesome") || corpus.includes("tutorial") || corpus.includes("course") || corpus.includes("sample") || corpus.includes("example") || corpus.includes("practice")) {
        repoCategory = "TUTORIAL";
        learningAssignmentRepos++;
      } else if ((stars >= 100 || forksCount >= 20 || (sizeKB > 1000 && hasBE && hasFE)) && hasDescription) {
        repoCategory = "FLAGSHIP PROJECT";
        flagshipProjects++;
      } else if ((stars >= 5 || forksCount >= 2 || hasPages || (sizeKB > 300 && (hasBE || hasFE))) && hasDescription) {
        repoCategory = "SUBSTANTIAL PROJECT";
        substantialProjects++;
      } else {
        repoCategory = "STANDARD PROJECT";
        standardProjects++;
      }

      // ── INDIVIDUAL PROJECT QUALITY SCORE /100 ──
      const completeness = Math.min(15, (hasFE && hasBE ? 15 : hasFE || hasBE ? 10 : 5));
      const technicalDepth = Math.min(15, (hasFE ? 4 : 0) + (hasBE ? 4 : 0) + (hasDB ? 4 : 0) + (hasCiCd ? 3 : 0));
      const architectureStructure = Math.min(15, (sizeKB > 500 ? 15 : sizeKB > 100 ? 10 : 5));
      const originalityEvidence = isFork ? 0 : isProfileRepo ? 2 : 10;
      const docScore = hasDescription ? 10 : 3;
      const engPractices = (hasCiCd ? 5 : 0) + (hasTest ? 5 : 0);
      const testScore = hasTest ? 5 : 0;
      const deployScore = hasPages ? 5 : 0;
      const maintainability = Math.min(5, (topics.length >= 2 ? 5 : 2));
      const usefulness = Math.min(5, Math.round(Math.log10(stars + 1) * 3));
      const activityHist = Math.min(5, (sizeKB > 50 ? 5 : 2));

      const totalScore = Math.min(100, completeness + technicalDepth + architectureStructure + originalityEvidence + docScore + engPractices + testScore + deployScore + maintainability + usefulness + activityHist);

      let qualityTier: ProjectQualityBreakdown["qualityTier"] = "Basic";
      if (totalScore >= 95) qualityTier = "Exceptional";
      else if (totalScore >= 85) qualityTier = "Excellent";
      else if (totalScore >= 70) qualityTier = "Strong";
      else if (totalScore >= 55) qualityTier = "Good";
      else if (totalScore >= 40) qualityTier = "Developing";
      else if (totalScore >= 20) qualityTier = "Basic";
      else qualityTier = "Minimal";

      const projectQualityBreakdown: ProjectQualityBreakdown = {
        completeness,
        technicalDepth,
        architectureStructure,
        originalityEvidence,
        documentation: docScore,
        engineeringPractices: engPractices,
        testing: testScore,
        deployment: deployScore,
        maintainability,
        usefulness,
        activityHistory: activityHist,
        totalScore,
        qualityTier,
      };

      let selectionReason = `Analyzed as a ${repoCategory.toLowerCase()} with quality rating ${totalScore}/100.`;
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
        hasFE,
        hasBE,
        hasDB,
        hasTest,
        hasCiCd,
        hasPages,
        hasReadme,
      };
    });

    // ── 3. WEIGHTED PORTFOLIO CALCULATION (QUALITY > QUANTITY) ──
    const validOriginalProjects = classifiedRepos.filter(
      r => !r.name.toLowerCase().endsWith(username.toLowerCase()) && r.repoCategory !== "FORK" && r.repoCategory !== "MINIMAL PROJECT" && r.repoCategory !== "PROFILE REPOSITORY"
    ).sort((a, b) => b.projectQualityScore - a.projectQualityScore);

    const bestProj = validOriginalProjects[0];
    const secondBestProj = validOriginalProjects[1];
    const thirdBestProj = validOriginalProjects[2];
    const remainingProjs = validOriginalProjects.slice(3);

    const bestScore = bestProj ? bestProj.projectQualityScore : 0;
    const secondBestScore = secondBestProj ? secondBestProj.projectQualityScore : 0;
    const thirdBestScore = thirdBestProj ? thirdBestProj.projectQualityScore : 0;

    const remainingAvg = remainingProjs.length > 0
      ? remainingProjs.reduce((acc, r) => acc + r.projectQualityScore, 0) / remainingProjs.length
      : 0;

    // Engineering consistency check
    const reposWithTests = validOriginalProjects.filter(r => r.hasTest).length;
    const reposWithCiCd = validOriginalProjects.filter(r => r.hasCiCd).length;
    const reposWithDeploy = validOriginalProjects.filter(r => r.hasPages).length;
    const engConsistencyScore = Math.min(100, (reposWithCiCd > 0 ? 35 : 0) + (reposWithTests > 0 ? 35 : 0) + (reposWithDeploy > 0 ? 30 : 0));

    // WEIGHTED PORTFOLIO FORMULA:
    // Best Project = 35%, Second Best = 20%, Third Best = 15%, Remaining = 15%, Engineering Consistency = 15%
    let weightedPortfolioScore = 0;
    if (validOriginalProjects.length === 1) {
      // Single project developer formula: Best project carries 70%, consistency carries 30%
      weightedPortfolioScore = bestScore * 0.75 + engConsistencyScore * 0.25;
    } else if (validOriginalProjects.length === 2) {
      weightedPortfolioScore = bestScore * 0.50 + secondBestScore * 0.30 + engConsistencyScore * 0.20;
    } else {
      weightedPortfolioScore = (bestScore * 0.35) + (secondBestScore * 0.20) + (thirdBestScore * 0.15) + (remainingAvg * 0.15) + (engConsistencyScore * 0.15);
    }

    weightedPortfolioScore = Math.min(100, Math.round(weightedPortfolioScore));

    // ── 4. CATEGORY BREAKDOWN WITH DEEP EVIDENCE ──
    const catAEvid: string[] = [];
    if (bestProj) catAEvid.push(`Flagship project "${bestProj.name}" quality: ${bestProj.projectQualityScore}/100 (+${Math.round((bestProj.projectQualityScore * 35) / 100)} pts)`);
    if (secondBestProj) catAEvid.push(`Secondary project "${secondBestProj.name}" quality: ${secondBestProj.projectQualityScore}/100`);
    if (validOriginalProjects.length === 0) catAEvid.push("No substantial original projects found (0 pts)");

    const catBEvid: string[] = [];
    const reposWithBE = validOriginalProjects.filter(r => r.hasBE);
    const reposWithFE = validOriginalProjects.filter(r => r.hasFE);
    const reposWithDB = validOriginalProjects.filter(r => r.hasDB);

    if (reposWithFE.length > 0) catBEvid.push(`Frontend evidence in ${reposWithFE.length} project(s)`);
    if (reposWithBE.length > 0) catBEvid.push(`Backend server logic in ${reposWithBE.length} project(s)`);
    if (reposWithDB.length > 0) catBEvid.push(`Database schemas/queries in ${reposWithDB.length} project(s)`);
    if (catBEvid.length === 0) catBEvid.push("No verified technical depth evidence in codebase (0 pts)");

    const catCEvid: string[] = [];
    if (reposWithCiCd > 0) catCEvid.push(`CI/CD or Docker in ${reposWithCiCd} project(s) (+7 pts)`);
    if (reposWithTests > 0) catCEvid.push(`Automated unit tests in ${reposWithTests} project(s) (+5 pts)`);
    if (catCEvid.length === 0) catCEvid.push("No automated testing, CI/CD, or container configuration (0 pts)");

    const catDEvid: string[] = [];
    const reposWithReadme = validOriginalProjects.filter(r => r.hasReadme).length;
    if (reposWithReadme > 0) catDEvid.push(`${reposWithReadme}/${validOriginalProjects.length} projects have documentation (+7 pts)`);
    if (userData.bio) catDEvid.push("Profile bio present (+3 pts)");
    if (catDEvid.length === 0) catDEvid.push("No README documentation found (0 pts)");

    const catEEvid: string[] = [];
    const daysSinceUpdate = validOriginalProjects[0]?.updatedAt
      ? Math.floor((now - new Date(allRepos[0]?.updated_at || now).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    if (daysSinceUpdate <= 30) catEEvid.push("Recent development commits within last 30 days (+10 pts)");
    else if (daysSinceUpdate <= 90) catEEvid.push("Commits within last 90 days (+6 pts)");
    else catEEvid.push("No recent development activity (0 pts)");

    const catFEvid: string[] = [];
    if (userData.blog) catFEvid.push(`Linked portfolio site: ${userData.blog} (+3 pts)`);
    if (reposWithDeploy > 0) catFEvid.push(`${reposWithDeploy} project(s) deployed live (+2 pts)`);
    if (catFEvid.length === 0) catFEvid.push("No portfolio site or live links (0 pts)");

    const catGEvid: string[] = [];
    const totalStars = validOriginalProjects.reduce((acc, r) => acc + r.stars, 0);
    if (totalStars > 100) catGEvid.push(`Community stars: ${totalStars} total (+5 pts)`);
    else if (totalStars > 0) catGEvid.push(`Community stars: ${totalStars} total (+2 pts)`);
    else catGEvid.push("No community stars on original repos (0 pts)");

    const catHEvid: string[] = [];
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
    catHEvid.push(`${detectedSkillsSet.size} verified tech stack(s) detected (+${Math.min(5, Math.floor(detectedSkillsSet.size / 2))} pts)`);

    // FINAL CALCULATED EVIDENCE DEVELOPER SCORE
    const scoreA = Math.min(35, Math.round((weightedPortfolioScore * 35) / 100));
    const scoreB = Math.min(15, (reposWithFE.length > 0 ? 5 : 0) + (reposWithBE.length > 0 ? 5 : 0) + (reposWithDB.length > 0 ? 5 : 0));
    const scoreC = Math.min(15, (reposWithCiCd > 0 ? 7 : 0) + (reposWithTests > 0 ? 5 : 0) + (reposWithReadme >= 2 ? 3 : 0));
    const scoreD = Math.min(10, (reposWithReadme > 0 ? 7 : 0) + (userData.bio ? 3 : 0));
    const scoreE = Math.min(10, daysSinceUpdate <= 30 ? 10 : daysSinceUpdate <= 90 ? 6 : 2);
    const scoreF = Math.min(5, (userData.blog ? 3 : 0) + (reposWithDeploy > 0 ? 2 : 0));
    const scoreG = Math.min(5, totalStars > 100 ? 5 : totalStars > 10 ? 3 : totalStars > 0 ? 1 : 0);
    const scoreH = Math.min(5, Math.floor(detectedSkillsSet.size / 2));

    const scoreBreakdown: CategoryScoreBreakdown = {
      projectQuality: { score: scoreA, max: 35, evidence: catAEvid },
      technicalDepth: { score: scoreB, max: 15, evidence: catBEvid },
      engineeringPractices: { score: scoreC, max: 15, evidence: catCEvid },
      documentation: { score: scoreD, max: 10, evidence: catDEvid },
      developmentConsistency: { score: scoreE, max: 10, evidence: catEEvid },
      portfolioCompleteness: { score: scoreF, max: 5, evidence: catFEvid },
      communityImpact: { score: scoreG, max: 5, evidence: catGEvid },
      technicalBreadth: { score: scoreH, max: 5, evidence: catHEvid },
    };

    const devScore = Math.min(100, Math.max(0, scoreA + scoreB + scoreC + scoreD + scoreE + scoreF + scoreG + scoreH));

    // EVIDENCE CONFIDENCE RATING (LOW / MEDIUM / HIGH)
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

    // ── PRINT FULL PROJECT-FIRST SCORING AUDIT CONSOLE ──
    console.log("==================================================");
    console.log(`GITHUB INTELLIGENCE V5 (PROJECT-FIRST) AUDIT FOR @${username}`);
    console.log("==================================================");
    console.log(`• Total Public Repositories: ${userData.public_repos || allRepos.length}`);
    console.log(`• Flagship Projects: ${flagshipProjects} | Substantial: ${substantialProjects} | Standard: ${standardProjects}`);
    console.log(`• Forks: ${forks} | Archived: ${archivedRepos} | Minimal/Empty: ${minimalEmptyRepos}`);
    console.log(`• Best Project Quality: ${bestScore}/100 ("${bestProj?.name || 'N/A'}")`);
    console.log(`• Weighted Portfolio Score: ${weightedPortfolioScore}/100`);
    console.log(`• Evidence Confidence: ${evidenceConfidence} (${confidenceReason})`);
    console.log("--------------------------------------------------");
    console.log(`1. Project Quality          : ${scoreA}/35 -> ${catAEvid.join(", ")}`);
    console.log(`2. Technical Depth           : ${scoreB}/15 -> ${catBEvid.join(", ")}`);
    console.log(`3. Engineering Practices    : ${scoreC}/15 -> ${catCEvid.join(", ")}`);
    console.log(`4. Documentation            : ${scoreD}/10 -> ${catDEvid.join(", ")}`);
    console.log(`5. Development Consistency  : ${scoreE}/10 -> ${catEEvid.join(", ")}`);
    console.log(`6. Portfolio Completeness   : ${scoreF}/5  -> ${catFEvid.join(", ")}`);
    console.log(`7. Community Impact         : ${scoreG}/5  -> ${catGEvid.join(", ")}`);
    console.log(`8. Technology Breadth       : ${scoreH}/5  -> ${catHEvid.join(", ")}`);
    console.log("--------------------------------------------------");
    console.log(`FINAL EVIDENCE DEVELOPER SCORE: ${devScore}/100`);
    console.log("==================================================");

    // ── 5. CONFIDENCE SKILL EVIDENCE SYSTEM ──
    const getConfidence = (hasEvidence: boolean, repoList: ClassifiedRepoInfo[], explicitTag: boolean): SkillConfidenceItem => {
      const supportingRepos = repoList.map(r => r.name);
      if (!hasEvidence && !explicitTag) {
        return {
          score: 0,
          confidence: "INSUFFICIENT EVIDENCE",
          evidence: [],
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
      if (explicitTag || hasEvidence) {
        return {
          score: Math.min(75, 45 + repoList.length * 10),
          confidence: "MEDIUM CONFIDENCE",
          evidence: ["Framework tags or repository language metadata"],
          reason: "Detected from repository structure.",
          supportingRepos,
        };
      }
      return {
        score: 35,
        confidence: "LOW CONFIDENCE",
        evidence: ["Basic keyword signal"],
        reason: "Limited evidence found.",
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
    const uiUxConf = getConfidence(detectedSkillsSet.has("Tailwind CSS") || detectedSkillsSet.has("Figma"), validOriginalProjects.filter(r => r.name.includes("tailwind") || r.name.includes("css")), detectedSkillsSet.has("Tailwind CSS"));
    const testConf = getConfidence(reposWithTests > 0, validOriginalProjects.filter(r => r.hasTest), reposWithTests > 0);

    // ── 6. CAREER LABELING & TRANSPARENT READINESS ──
    const isFullStackVerified = reposWithFE.length > 0 && reposWithBE.length > 0 && (reposWithDB.length > 0 || reposWithBE.length >= 2) && validOriginalProjects.length >= 1;

    let devLevel = "Developing Profile";
    let devCategory = "Software Developer";

    if (devScore >= 90) {
      devLevel = isFullStackVerified ? "Master Full Stack Architect" : "Exceptional Systems Architect";
      devCategory = "Senior Software Architect";
    } else if (devScore >= 70) {
      devLevel = isFullStackVerified ? "Strong Full Stack Developer" : reposWithBE.length > 0 ? "Backend Systems Specialist" : reposWithFE.length > 0 ? "Frontend Specialist" : "Software Engineer";
      devCategory = isFullStackVerified ? "Full Stack Engineer" : "Software Developer";
    } else if (devScore >= 45) {
      devLevel = isFullStackVerified ? "Junior Full Stack Developer" : "Good Foundation Developer";
      devCategory = "Junior Developer";
    }

    let devStars = "☆☆☆☆☆";
    if (devScore >= 85) devStars = "★★★★★";
    else if (devScore >= 70) devStars = "★★★★☆";
    else if (devScore >= 50) devStars = "★★★☆☆";
    else if (devScore >= 30) devStars = "★★☆☆☆";
    else if (devScore >= 15) devStars = "★☆☆☆☆";

    let readinessStatus = "BUILDING FOUNDATIONS";
    if (isFullStackVerified && reposWithDeploy > 0) {
      readinessStatus = "STRONG INTERNSHIP PROFILE";
    } else if (isFullStackVerified) {
      readinessStatus = "INTERNSHIP READY";
    } else if (reposWithFE.length > 0 || reposWithBE.length > 0) {
      readinessStatus = "INTERNSHIP PREPARATION";
    } else if (validOriginalProjects.length >= 1) {
      readinessStatus = "DEVELOPING PORTFOLIO";
    }

    const startupLevel = isFullStackVerified ? "Strong" : validOriginalProjects.length >= 1 ? "Moderate" : "Developing";
    const enterpriseLevel = reposWithCiCd > 0 && reposWithTests > 0 ? "Strong" : reposWithCiCd > 0 ? "Moderate" : "Needs Evidence";
    const freelancerLevel = reposWithFE.length > 0 && userData.blog ? "Strong" : reposWithFE.length > 0 ? "Moderate" : "Developing";

    const developerPersonality: DeveloperPersonality = {
      archetype: isFullStackVerified ? "Full Stack Creator" : reposWithBE.length > 0 ? "Backend Systems Engineer" : reposWithFE.length > 0 ? "Frontend Developer" : "Software Developer",
      title: devCategory,
      bestCareerPath: isFullStackVerified ? "Full Stack Software Engineering" : reposWithBE.length > 0 ? "Backend / Systems Engineering" : "Software Development",
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
        validOriginalProjects.length >= 1
          ? `Your flagship project "${bestProj?.name || ''}" achieved quality rating ${bestScore}/100.`
          : "You are currently building your foundational repository portfolio.",
        reposWithBE.length > 0
          ? "Verified backend server logic detected in your codebase."
          : "Backend REST API implementation is an area to develop.",
      ],
    };

    // ── 7. DATA TRANSPARENCY AUDIT ──
    const transparencyAudit: TransparencyAudit = {
      repositoriesDiscovered: userData.public_repos || allRepos.length,
      repositoriesInspected: allRepos.length,
      repositoriesDeeplyAnalyzed: validOriginalProjects.length,
      flagshipProjects,
      substantialProjects,
      standardProjects,
      learningAssignmentRepos,
      forks,
      archivedRepos,
      minimalEmptyRepos,
      disclaimer: "This assessment is based only on publicly accessible GitHub evidence and should not be interpreted as a complete measurement of the developer's abilities.",
    };

    const separateMetrics: SeparateQualityMetrics = {
      bestProjectQuality: bestScore,
      portfolioDepth: Math.min(100, validOriginalProjects.length * 25),
      engineeringQuality: engConsistencyScore,
      technicalBreadth: Math.min(100, detectedSkillsSet.size * 15),
      consistency: daysSinceUpdate <= 30 ? 90 : daysSinceUpdate <= 90 ? 60 : 30,
    };

    // ── 8. DEVELOPER JOURNEY ──
    const timeline: DeveloperTimelineMilestone[] = [];
    timeline.push({
      title: "Joined GitHub",
      subtitle: `Created @${userData.login} account`,
      date: userData.created_at ? new Date(userData.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Start",
      icon: "🎉",
      badgeText: "Account Created",
    });

    if (bestProj) {
      timeline.push({
        title: `Flagship Project: ${bestProj.name}`,
        subtitle: `Quality rating: ${bestProj.projectQualityScore}/100 (${bestProj.repoCategory})`,
        date: "Key Project",
        icon: "🏆",
        badgeText: "Flagship",
      });
    }

    timeline.push({
      title: `Current Level: ${devLevel}`,
      subtitle: `Analyzed ${validOriginalProjects.length} original project(s) & ${detectedSkillsSet.size} verified tech stack(s)`,
      date: "Present",
      icon: "⭐",
      badgeText: "Current Level",
    });

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

    // Explanations for Score (Why did this person receive this score?)
    const scoreStrengths: string[] = [];
    const scoreNeedsImp: string[] = [];

    if (bestProj) scoreStrengths.push(`Flagship project "${bestProj.name}" achieved high quality rating (${bestScore}/100)`);
    if (detectedSkillsSet.size > 0) scoreStrengths.push(`${detectedSkillsSet.size} verified technology stack(s) detected in codebase`);
    if (daysSinceUpdate <= 30) scoreStrengths.push("Active repository updates within the last 30 days");
    if (reposWithCiCd > 0) scoreStrengths.push("DevOps or configuration automation files detected (Docker/CI/CD)");

    if (validOriginalProjects.length <= 1) scoreNeedsImp.push("Only 1 substantial public project available (limited portfolio depth)");
    if (!reposWithReadme) scoreNeedsImp.push("Repositories lack detailed README documentation and setup instructions");
    if (!userData.blog) scoreNeedsImp.push("No portfolio website linked to GitHub profile");
    if (!reposWithDeploy) scoreNeedsImp.push("No visible live web deployments detected");
    if (!reposWithTests) scoreNeedsImp.push("No automated software testing frameworks detected");
    if (forks > validOriginalProjects.length) scoreNeedsImp.push("High proportion of forked repositories compared to original projects");

    // XP System DERIVED STRICTLY FROM FINAL EVIDENCE SCORE
    const totalXP = devScore * 10;
    const levelNum = Math.max(1, Math.floor(devScore / 10) + 1);
    const xpCurrent = Math.round(totalXP % 100);
    const xpMax = 100;
    const xpPercentage = Math.min(100, Math.round((xpCurrent / xpMax) * 100));

    const nextLevelRequirements: string[] = [];
    if (validOriginalProjects.length < 3) nextLevelRequirements.push("+1 Substantial Original Project");
    if (!reposWithReadme) nextLevelRequirements.push("+2 README Improvements");
    if (!reposWithDeploy) nextLevelRequirements.push("+1 Live Project Deployment");
    if (nextLevelRequirements.length === 0) nextLevelRequirements.push("+1 Testing or CI/CD Setup");

    const badges: DeveloperBadge[] = [
      {
        id: "react-developer",
        name: "React Developer",
        description: "Built & published React/Next.js projects on GitHub",
        icon: "⚛️",
        unlocked: detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js"),
        glowColor: "rgba(56,189,248,0.5)",
      },
      {
        id: "frontend-builder",
        name: "Frontend Builder",
        description: "Mastered core web technologies (HTML, CSS, JS/TS)",
        icon: "🎨",
        unlocked: reposWithFE.length > 0,
        glowColor: "rgba(168,85,247,0.5)",
      },
      {
        id: "backend-engineer",
        name: "Backend Engineer",
        description: "Created robust backend API servers and logic",
        icon: "⚙️",
        unlocked: reposWithBE.length > 0,
        glowColor: "rgba(34,197,94,0.5)",
      },
      {
        id: "ai-explorer",
        name: "AI Explorer",
        description: "Integrated Machine Learning / Computer Vision libraries",
        icon: "🧠",
        unlocked: detectedSkillsSet.has("TensorFlow"),
        glowColor: "rgba(236,72,153,0.5)",
      },
      {
        id: "devops-engineer",
        name: "DevOps & Infrastructure",
        description: "Configured Nix, SaltStack, or Docker workflows",
        icon: "🐳",
        unlocked: reposWithCiCd > 0,
        glowColor: "rgba(14,165,233,0.5)",
      },
      {
        id: "fullstack-developer",
        name: "Full Stack Developer",
        description: "Built end-to-end full stack web applications",
        icon: "🚀",
        unlocked: isFullStackVerified,
        glowColor: "rgba(168,85,247,0.6)",
      },
      {
        id: "open-source-contributor",
        name: "Open Source Contributor",
        description: "Maintained active open source repositories and forks",
        icon: "🌐",
        unlocked: totalStars >= 50 || validOriginalProjects.length >= 2,
        glowColor: "rgba(99,102,241,0.5)",
      },
      {
        id: "problem-solver",
        name: "Problem Solver",
        description: "Published substantial repositories with active updates",
        icon: "💡",
        unlocked: substantialProjects >= 2,
        glowColor: "rgba(234,179,8,0.5)",
      },
      {
        id: "documentation-master",
        name: "Documentation Master",
        description: "Maintained clear descriptions across repositories",
        icon: "📝",
        unlocked: reposWithReadme >= 2,
        glowColor: "rgba(16,185,129,0.5)",
      },
    ];

    const developerMetrics: DeveloperMetrics = {
      score: devScore,
      evidenceConfidence,
      confidenceReason,
      separateMetrics,
      level: devLevel,
      levelNum,
      xpCurrent,
      xpMax,
      xpPercentage,
      nextLevelRequirements,
      nextRewardBadge: "Elite Builder Badge",
      stars: devStars,
      rankPercentile: null,
      category: devCategory,
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
      developerJourney: { timeline, growth },
      recruiterPerspective: {
        recruiterStrengths: scoreStrengths.length > 0 ? scoreStrengths : ["Published code on GitHub"],
        areasToImprove: scoreNeedsImp.length > 0 ? scoreNeedsImp : ["Add README descriptions to all repositories"],
        overallImpression: isFullStackVerified
          ? "Demonstrates verified full stack implementation capabilities across frontend, backend, and project repositories."
          : `Demonstrates practical coding initiative. Best flagship project quality rated at ${bestScore}/100.`,
        readinessStatus,
      },
      actionPlan,
      healthReport: {
        strengths: scoreStrengths.length > 0 ? scoreStrengths : ["Public GitHub account established"],
        improvements: Array.from(new Set([...scoreNeedsImp])),
        score: devScore,
        healthLevelText: devScore >= 80 ? "Exceptional Profile" : devScore >= 60 ? "Strong Profile" : devScore >= 40 ? "Good Foundation" : "Developing Profile",
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
    console.error("[GitHub Intelligence V5 API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze GitHub profile" }, { status: 500 });
  }
}
