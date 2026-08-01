import { NextRequest, NextResponse } from "next/server";
import { githubApiClient } from "@/lib/githubApiClient";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES (Evidence Engine V8 - Complete Rebuild)
// ─────────────────────────────────────────────────────────────

export interface ProjectQualityBreakdown {
  implementationDepth: number; // /25
  architecture: number; // /15
  featureComplexity: number; // /15
  engineeringPractices: number; // /15
  testing: number; // /10
  documentation: number; // /8
  deploymentCi: number; // /7
  maintainability: number; // /5
  totalScore: number; // /100 (Repository Quality Score - RQS)
  qualityTier:
    | "Minimal/Weak (<25)"
    | "Academic/Practice (25-44)"
    | "Meaningful Project (45-69)"
    | "Flagship/Substantial (70+)";
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
    | "MEANINGFUL_PROJECT"
    | "ACADEMIC_PROJECT"
    | "ASSIGNMENT_LAB"
    | "TUTORIAL_PRACTICE"
    | "CONFIG_PROFILE"
    | "MINIMAL_EMPTY"
    | "FORK";
  isSubstantial: boolean;
  isMeaningful: boolean;
  rqs: number; // Repository Quality Score (0-100)
  projectQualityBreakdown: ProjectQualityBreakdown;
  evidenceList: string[]; // Why counted or not counted
  rejectionReason?: string;
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
  bestProjectQuality: CategoryScoreItem; // /30 (Flagship Project Quality)
  overallProjectQuality: CategoryScoreItem; // /15 (Portfolio Quality)
  technicalDepth: CategoryScoreItem; // /15 (Technical Depth)
  engineeringPractices: CategoryScoreItem; // /15 (Engineering Practices)
  codebaseMaturity: CategoryScoreItem; // /10 (Codebase Maturity)
  documentation: CategoryScoreItem; // /5 (Documentation)
  maintenanceConsistency: CategoryScoreItem; // /5 (Activity & Maintenance)
  collaborationOpenSource: CategoryScoreItem; // /5 (Open Source / Collaboration)
}

export interface TransparencyAudit {
  totalPublicRepos: number;
  repositoriesInspected: number;
  substantialProjectsCount: number;
  meaningfulProjectsCount: number;
  academicProjectsCount: number;
  assignmentsCount: number;
  tutorialsCount: number;
  forksCount: number;
  configProfileCount: number;
  minimalEmptyCount: number;
  verifiedProjectsList: { name: string; rqs: number; category: string; isSubstantial: boolean }[];
  excludedProjectsList: { name: string; category: string; reason: string }[];
  disclaimer: string;
}

export interface SeparateQualityMetrics {
  bestProjectQuality: number; // 0 - 100
  portfolioDepth: number; // 0 - 100
  engineeringQuality: number; // 0 - 100
  technicalBreadth: number; // 0 - 100
  maintenance: number; // 0 - 100
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
  analysisVersion: string;
  analyzedAt: string;
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

const ANALYSIS_ENGINE_VERSION = "EVIDENCE_ENGINE_V8_AUTHENTICATED";
const cache = new Map<string, { data: GitHubAnalysisResult; timestamp: number; version: string }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6-Hour Cache TTL

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
  let apiRequestsUsed = 0;
  try {
    const { searchParams } = new URL(req.url);
    let username = searchParams.get("username")?.trim().replace(/^@/, "");

    if (!username) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    if (username.includes("github.com/")) {
      const parts = username.split("github.com/")[1].split("/").filter(Boolean);
      username = parts[0] || username;
    }

    username = username.toLowerCase();

    const now = Date.now();
    // ── 6. CACHING ENGINE (6-HOUR TTL) ──
    if (cache.has(username)) {
      const cached = cache.get(username)!;
      if (cached.version === ANALYSIS_ENGINE_VERSION && (now - cached.timestamp < CACHE_TTL_MS)) {
        console.log(`[GitHub Intelligence Server Log] User: @${username} | Authenticated: ${Boolean(process.env.GITHUB_TOKEN)} | Rate limit: N/A | Remaining: N/A | API Requests Used: 0 | Cache hit: true`);
        return NextResponse.json({ ...cached.data, fromCache: true });
      }
    }

    // ── 1. FETCH GITHUB USER PROFILE VIA CENTRALIZED CLIENT ──
    apiRequestsUsed++;
    const userFetch = await githubApiClient<any>(`/users/${encodeURIComponent(username)}`);

    if (userFetch.isRateLimited) {
      console.warn(`[GitHub Intelligence Server Log] User: @${username} | Authenticated: ${Boolean(process.env.GITHUB_TOKEN)} | Rate limit: ${userFetch.rateLimitLimit} | Remaining: ${userFetch.rateLimitRemaining} | API Requests Used: ${apiRequestsUsed} | Cache hit: false | RATE LIMITED`);
      return NextResponse.json({ error: userFetch.error }, { status: 403 });
    }

    if (userFetch.status === 404 || !userFetch.data) {
      return NextResponse.json({ error: `GitHub user "@${username}" not found. Please check the username.` }, { status: 404 });
    }

    const userData = userFetch.data;

    // ── 2. FETCH REPOSITORIES (UP TO 100) VIA CENTRALIZED CLIENT ──
    apiRequestsUsed++;
    const reposFetch = await githubApiClient<any[]>(`/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`);

    if (reposFetch.isRateLimited) {
      return NextResponse.json({ error: reposFetch.error }, { status: 403 });
    }

    const allRepos: any[] = Array.isArray(reposFetch.data) ? reposFetch.data : [];

    // Prioritize lightweight pre-filtering
    let candidateRepos = allRepos.filter(r => !r.fork && r.size > 0);
    candidateRepos.sort((a, b) => (b.size + (b.stargazers_count || 0) * 100) - (a.size + (a.stargazers_count || 0) * 100));

    // Deep inspect top 5 candidate repos only if rate limit remaining requests > 10
    const shouldDeepInspect = reposFetch.rateLimitRemaining > 10;
    const deepInspectedNames = shouldDeepInspect ? new Set(candidateRepos.slice(0, 5).map(r => r.name)) : new Set<string>();

    let substantialCount = 0;
    let meaningfulCount = 0;
    let academicCount = 0;
    let assignmentCount = 0;
    let tutorialCount = 0;
    let forkCount = 0;
    let configProfileCount = 0;
    let minimalEmptyCount = 0;

    const classifiedRepos: ClassifiedRepoInfo[] = await Promise.all(
      allRepos.map(async repo => {
        const isFork = Boolean(repo.fork);
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

        let hasDeepFiles = false;
        let fileList: string[] = [];

        // Single recursive tree endpoint for candidate repos
        if (deepInspectedNames.has(repo.name) && !isFork && sizeKB > 30) {
          apiRequestsUsed++;
          const treeFetch = await githubApiClient<any>(`/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/git/trees/${repo.default_branch || "main"}?recursive=1`);
          if (treeFetch.data && Array.isArray(treeFetch.data.tree)) {
            fileList = treeFetch.data.tree.map((f: any) => f.path.toLowerCase());
            hasDeepFiles = true;
          }
        }

        // File-level evidence triggers
        const hasPackageJson = hasDeepFiles
          ? fileList.some(f => f === "package.json" || f.endsWith("/package.json"))
          : corpus.includes("package.json") || language === "JavaScript" || language === "TypeScript";

        const hasRequirements = hasDeepFiles
          ? fileList.some(f => f === "requirements.txt" || f === "pyproject.toml" || f === "pom.xml" || f === "build.gradle" || f === "cargo.toml" || f === "go.mod")
          : corpus.includes("requirements") || corpus.includes("pipfile") || language === "Python" || language === "Go" || language === "Java" || language === "Rust";

        const hasDockerfile = hasDeepFiles
          ? fileList.some(f => f.includes("dockerfile") || f.includes("docker-compose"))
          : corpus.includes("docker");

        const hasCiWorkflow = hasDeepFiles
          ? fileList.some(f => f.includes(".github/workflows/"))
          : corpus.includes("workflow") || corpus.includes("ci/cd") || corpus.includes("github-actions");

        const hasTestsDir = hasDeepFiles
          ? fileList.some(f => f.includes("test/") || f.includes("tests/") || f.includes("__tests__") || f.includes(".test.") || f.includes(".spec."))
          : corpus.includes("test") || corpus.includes("spec");

        const srcFileCount = hasDeepFiles
          ? fileList.filter(f => f.startsWith("src/") || f.startsWith("app/") || f.startsWith("pages/") || f.startsWith("components/") || f.startsWith("server/") || f.startsWith("api/") || f.startsWith("lib/")).length
          : Math.round(sizeKB / 25);

        // Codebase Capability Signals
        const hasReadme = Boolean(hasDescription || sizeKB >= 5);
        const hasTest = hasTestsDir || corpus.includes("test") || corpus.includes("jest") || corpus.includes("vitest") || corpus.includes("cypress") || corpus.includes("pytest");
        const hasCiCd = hasCiWorkflow || hasDockerfile || corpus.includes("ci") || corpus.includes("workflow") || corpus.includes("docker") || corpus.includes("github-actions");
        const hasFE = hasPackageJson || language === "JavaScript" || language === "TypeScript" || language === "HTML" || corpus.includes("react") || corpus.includes("vue") || corpus.includes("next");
        const hasBE = hasRequirements || language === "Python" || language === "Go" || language === "Java" || language === "Rust" || corpus.includes("node") || corpus.includes("express") || corpus.includes("api") || corpus.includes("backend");
        const hasDB = corpus.includes("mongo") || corpus.includes("sql") || corpus.includes("postgres") || corpus.includes("firebase") || corpus.includes("db");

        // Keyword triggers for low-value / academic repositories
        const isTaskKeyword = corpus.includes("bharatintern") || corpus.includes("codesoft") || corpus.includes("prodigy") || corpus.includes("internship") || corpus.includes("task-1") || corpus.includes("task1") || corpus.includes("task-2") || corpus.includes("task2") || corpus.includes("web-development-task");
        const isAssignmentKeyword = corpus.includes("assignment") || corpus.includes("homework") || corpus.includes("lab") || corpus.includes("dsa") || corpus.includes("leetcode");
        const isTutorialKeyword = corpus.includes("tutorial") || corpus.includes("course") || corpus.includes("awesome") || corpus.includes("sample");
        const isPracticeKeyword = corpus.includes("practice") || corpus.includes("exercise") || corpus.includes("test-repo") || corpus.includes("demo");
        const isAcademicKeyword = corpus.includes("academic") || corpus.includes("college") || corpus.includes("sem-") || corpus.includes("university");

        // ── CALCULATE REPOSITORY QUALITY SCORE (RQS) /100 ──
        let implementationDepth = 0;
        if (hasDeepFiles) {
          if (srcFileCount >= 20 || sizeKB > 1500) implementationDepth = 25;
          else if (srcFileCount >= 8 || sizeKB > 400) implementationDepth = 18;
          else if (srcFileCount >= 3 || sizeKB > 100) implementationDepth = 12;
          else implementationDepth = 5;
        } else {
          if (sizeKB > 1000 && (hasFE || hasBE)) implementationDepth = 22;
          else if (sizeKB > 300 && (hasFE || hasBE)) implementationDepth = 15;
          else if (sizeKB > 80) implementationDepth = 10;
          else implementationDepth = 4;
        }

        let architecture = (hasFE && hasBE ? 15 : (hasFE || hasBE) ? 10 : 4);
        let featureComplexity = (hasDB ? 7 : 0) + (hasFE ? 4 : 0) + (hasBE ? 4 : 0);
        let engPractices = (hasCiCd ? 8 : 0) + (hasTest ? 7 : 0);
        let testing = hasTest ? 10 : 0;
        let docScore = hasDescription && sizeKB > 20 ? 8 : hasDescription ? 4 : 2;
        let deployCi = (hasPages ? 4 : 0) + (hasCiCd ? 3 : 0);
        let maintainability = sizeKB > 50 ? 5 : 2;

        if (isFork || isProfileRepo || sizeKB < 15 || isTaskKeyword || isAssignmentKeyword || isTutorialKeyword || isPracticeKeyword) {
          implementationDepth = Math.min(6, implementationDepth);
          architecture = Math.min(5, architecture);
          featureComplexity = Math.min(4, featureComplexity);
          engPractices = 0;
          testing = 0;
          deployCi = Math.min(2, deployCi);
        }

        const rqs = Math.min(100, implementationDepth + architecture + featureComplexity + engPractices + testing + docScore + deployCi + maintainability);

        // Classification
        let repoCategory: ClassifiedRepoInfo["repoCategory"] = "TUTORIAL_PRACTICE";
        let isSubstantial = false;
        let isMeaningful = false;
        const evidenceList: string[] = [];

        if (isFork) {
          repoCategory = "FORK";
          forkCount++;
          evidenceList.push("Forked repository owned by external developer (Excluded)");
        } else if (isProfileRepo) {
          repoCategory = "CONFIG_PROFILE";
          configProfileCount++;
          evidenceList.push("GitHub profile README / configuration repository (Excluded)");
        } else if (sizeKB === 0 || (sizeKB < 15 && !hasDescription && stars === 0)) {
          repoCategory = "MINIMAL_EMPTY";
          minimalEmptyCount++;
          evidenceList.push("Minimal or empty repository with no substantial codebase (Excluded)");
        } else if (isTaskKeyword) {
          repoCategory = "ASSIGNMENT_LAB";
          assignmentCount++;
          evidenceList.push("Internship task / basic assignment clone repository (Excluded)");
        } else if (isAssignmentKeyword) {
          repoCategory = "ASSIGNMENT_LAB";
          assignmentCount++;
          evidenceList.push("Lab exercise / assignment / DSA problem repository (Excluded)");
        } else if (isTutorialKeyword || isPracticeKeyword) {
          repoCategory = "TUTORIAL_PRACTICE";
          tutorialCount++;
          evidenceList.push("Tutorial clone or practice exercise repository (Excluded)");
        } else if (isAcademicKeyword) {
          repoCategory = "ACADEMIC_PROJECT";
          academicCount++;
          if (rqs >= 45) {
            isMeaningful = true;
            evidenceList.push(`Academic sem project with verified codebase (RQS: ${rqs}/100)`);
          } else {
            evidenceList.push("Basic academic submission without substantial application implementation");
          }
        } else {
          if (rqs >= 70 && sizeKB >= 300 && (hasFE || hasBE) && hasDescription) {
            repoCategory = "FLAGSHIP_PROJECT";
            isSubstantial = true;
            isMeaningful = true;
            substantialCount++;
            meaningfulCount++;
            evidenceList.push(`✓ Substantial flagship architecture verified (RQS: ${rqs}/100)`);
            if (hasFE) evidenceList.push("✓ Frontend UI architecture detected");
            if (hasBE) evidenceList.push("✓ Backend server / API implementation detected");
            if (hasDB) evidenceList.push("✓ Database integration detected");
            if (hasCiCd) evidenceList.push("✓ CI/CD workflow / Docker configuration detected");
            if (hasTest) evidenceList.push("✓ Automated testing suite verified");
            if (srcFileCount > 0) evidenceList.push(`✓ ${srcFileCount} application source files verified`);
          } else if (rqs >= 45 && sizeKB >= 80 && (hasFE || hasBE) && hasDescription) {
            repoCategory = "MEANINGFUL_PROJECT";
            isMeaningful = true;
            meaningfulCount++;
            evidenceList.push(`✓ Verified meaningful application implementation (RQS: ${rqs}/100)`);
            if (hasFE) evidenceList.push("✓ Frontend UI component codebase detected");
            if (hasBE) evidenceList.push("✓ Backend service / API implementation detected");
          } else {
            repoCategory = "TUTORIAL_PRACTICE";
            tutorialCount++;
            evidenceList.push("Small practice repository or starter boilerplate (RQS < 45)");
          }
        }

        let qualityTier: ProjectQualityBreakdown["qualityTier"] = "Minimal/Weak (<25)";
        if (rqs >= 70) qualityTier = "Flagship/Substantial (70+)";
        else if (rqs >= 45) qualityTier = "Meaningful Project (45-69)";
        else if (rqs >= 25) qualityTier = "Academic/Practice (25-44)";

        const projectQualityBreakdown: ProjectQualityBreakdown = {
          implementationDepth,
          architecture,
          featureComplexity,
          engineeringPractices: engPractices,
          testing,
          documentation: docScore,
          deploymentCi: deployCi,
          maintainability,
          totalScore: rqs,
          qualityTier,
        };

        const daysSinceUpdate = repo.updated_at
          ? Math.floor((now - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        const selectionReason = isSubstantial
          ? `Verified flagship project with RQS ${rqs}/100`
          : isMeaningful
          ? `Verified meaningful project with RQS ${rqs}/100`
          : `Excluded from score calculations (${evidenceList[0]})`;

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
          isSubstantial,
          isMeaningful,
          rqs,
          projectQualityBreakdown,
          evidenceList,
          selectionReason,
          hasFE,
          hasBE,
          hasDB,
          hasTest,
          hasCiCd,
          hasPages,
          hasReadme,
        };
      })
    );

    // ── 3. SORT & FILTER REPOSITORIES BY VERIFIED RQS ──
    const substantialProjects = classifiedRepos.filter(r => r.isSubstantial).sort((a, b) => b.rqs - a.rqs);
    const meaningfulProjects = classifiedRepos.filter(r => r.isMeaningful).sort((a, b) => b.rqs - a.rqs);

    const verifiedProjectsList = meaningfulProjects.map(r => ({
      name: r.name,
      rqs: r.rqs,
      category: r.repoCategory.replace(/_/g, " "),
      isSubstantial: r.isSubstantial,
    }));

    const excludedProjectsList = classifiedRepos.filter(r => !r.isMeaningful).map(r => ({
      name: r.name,
      category: r.repoCategory.replace(/_/g, " "),
      reason: r.evidenceList[0] || "Did not meet substantial RQS threshold (<45)",
    }));

    // ── 4. DEVELOPER SCORE (0-100 POINTS) EXACT CATEGORIES ──
    const bestProj = meaningfulProjects[0] || classifiedRepos.sort((a, b) => b.rqs - a.rqs)[0];
    const bestRQS = bestProj ? bestProj.rqs : 0;

    // 1. Flagship Project Quality (30 Points Max)
    let flagshipPts = 0;
    if (bestRQS >= 85) flagshipPts = 30;
    else if (bestRQS >= 70) flagshipPts = 26 + Math.round(((bestRQS - 70) / 15) * 3); // 26-29
    else if (bestRQS >= 50) flagshipPts = 21 + Math.round(((bestRQS - 50) / 20) * 4); // 21-25
    else if (bestRQS >= 30) flagshipPts = 14 + Math.round(((bestRQS - 30) / 20) * 6); // 14-20
    else if (bestRQS >= 15) flagshipPts = 5 + Math.round(((bestRQS - 15) / 15) * 8); // 5-13
    else flagshipPts = Math.min(4, Math.round(bestRQS / 4));

    // 2. Portfolio Quality (15 Points Max)
    let portfolioPts = 0;
    if (substantialProjects.length >= 2) portfolioPts = 15;
    else if (substantialProjects.length === 1 && meaningfulProjects.length >= 2) portfolioPts = 12;
    else if (substantialProjects.length === 1) portfolioPts = 10;
    else if (meaningfulProjects.length >= 2) portfolioPts = 8;
    else if (meaningfulProjects.length === 1) portfolioPts = 5;
    else portfolioPts = Math.min(3, Math.round(classifiedRepos.length > 0 ? 1 : 0));

    // 3. Technical Depth (15 Points Max)
    const validFE = meaningfulProjects.some(r => r.hasFE);
    const validBE = meaningfulProjects.some(r => r.hasBE);
    const validDB = meaningfulProjects.some(r => r.hasDB);
    let techDepthPts = (validFE ? 5 : 0) + (validBE ? 5 : 0) + (validDB ? 5 : 0);

    // 4. Engineering Practices (15 Points Max)
    const validCiCd = meaningfulProjects.some(r => r.hasCiCd);
    const validTest = meaningfulProjects.some(r => r.hasTest);
    let engPracticesPts = (validCiCd ? 8 : 0) + (validTest ? 7 : 0);

    // 5. Codebase Maturity (10 Points Max)
    let codebaseMaturityPts = 0;
    if (bestRQS >= 70) codebaseMaturityPts = 10;
    else if (bestRQS >= 45) codebaseMaturityPts = 6;
    else if (bestRQS >= 25) codebaseMaturityPts = 3;
    else codebaseMaturityPts = 1;

    // 6. Documentation (5 Points Max)
    const validReadmeCount = meaningfulProjects.filter(r => r.hasReadme).length;
    let docPts = Math.min(5, (validReadmeCount >= 2 ? 3 : validReadmeCount === 1 ? 2 : 0) + (userData.bio ? 2 : 0));

    // 7. Activity & Maintenance (5 Points Max)
    const daysSinceUpdate = bestProj?.updatedAt
      ? Math.floor((now - new Date(allRepos[0]?.updated_at || now).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    let maintenancePts = daysSinceUpdate <= 30 ? 5 : daysSinceUpdate <= 90 ? 3 : 1;

    // 8. Open Source / Collaboration (5 Points Max)
    const totalStars = classifiedRepos.reduce((acc, r) => acc + r.stars, 0);
    let openSourcePts = totalStars >= 100 ? 5 : totalStars >= 20 ? 3 : totalStars > 0 ? 2 : 1;

    let rawScore = flagshipPts + portfolioPts + techDepthPts + engPracticesPts + codebaseMaturityPts + docPts + maintenancePts + openSourcePts;

    // ── 5. STRICT CRITICAL SCORE HARD CAPS (ANTI-GAMING) ──
    if (meaningfulProjects.length === 0) {
      rawScore = Math.min(25, rawScore);
    }
    if (meaningfulProjects.length === 0 && classifiedRepos.every(r => r.repoCategory === "CONFIG_PROFILE" || r.repoCategory === "MINIMAL_EMPTY" || r.repoCategory === "FORK")) {
      rawScore = Math.min(15, rawScore);
    }
    if (meaningfulProjects.length === 0 && classifiedRepos.some(r => r.repoCategory === "TUTORIAL_PRACTICE" || r.repoCategory === "ASSIGNMENT_LAB")) {
      rawScore = Math.min(35, rawScore);
    }
    if (bestRQS < 45) {
      rawScore = Math.min(40, rawScore);
    }
    if (bestRQS < 70) {
      rawScore = Math.min(69, rawScore);
    }
    if (rawScore >= 80 && (bestRQS < 70 || engPracticesPts < 7)) {
      rawScore = Math.min(79, rawScore);
    }
    if (rawScore >= 90 && (substantialProjects.length < 2 || bestRQS < 85 || engPracticesPts < 12)) {
      rawScore = Math.min(89, rawScore);
    }
    if (rawScore >= 95 && (substantialProjects.length < 3 || bestRQS < 90)) {
      rawScore = Math.min(94, rawScore);
    }

    const finalDevScore = Math.min(100, Math.max(0, rawScore));

    // Category Evidences
    const scoreBreakdown: CategoryScoreBreakdown = {
      bestProjectQuality: {
        score: flagshipPts,
        max: 30,
        evidence: bestProj && bestProj.isMeaningful
          ? [`Flagship project "${bestProj.name}" quality RQS: ${bestRQS}/100 (+${flagshipPts} pts)`]
          : ["No verified flagship project found with RQS >= 70"],
      },
      overallProjectQuality: {
        score: portfolioPts,
        max: 15,
        evidence: [`${substantialProjects.length} substantial & ${meaningfulProjects.length} meaningful projects verified (+${portfolioPts} pts)`],
      },
      technicalDepth: {
        score: techDepthPts,
        max: 15,
        evidence: [
          validFE ? "✓ Verified Frontend implementation (+5 pts)" : "✗ No verified Frontend codebase",
          validBE ? "✓ Verified Backend API implementation (+5 pts)" : "✗ No verified Backend service",
          validDB ? "✓ Verified Database persistence (+5 pts)" : "✗ No verified Database integration",
        ],
      },
      engineeringPractices: {
        score: engPracticesPts,
        max: 15,
        evidence: [
          validCiCd ? "✓ Verified CI/CD workflows / Docker (+8 pts)" : "✗ No CI/CD or Docker verified",
          validTest ? "✓ Verified Automated Testing suite (+7 pts)" : "✗ No automated unit tests verified",
        ],
      },
      codebaseMaturity: {
        score: codebaseMaturityPts,
        max: 10,
        evidence: [`Codebase architecture maturity rated based on RQS ${bestRQS}/100 (+${codebaseMaturityPts} pts)`],
      },
      documentation: {
        score: docPts,
        max: 5,
        evidence: [`${validReadmeCount} verified meaningful projects with README (+${docPts} pts)`],
      },
      maintenanceConsistency: {
        score: maintenancePts,
        max: 5,
        evidence: [`Updated within ${daysSinceUpdate <= 30 ? "30 days" : `${daysSinceUpdate} days`} (+${maintenancePts} pts)`],
      },
      collaborationOpenSource: {
        score: openSourcePts,
        max: 5,
        evidence: [`${totalStars} stargazers across public repositories (+${openSourcePts} pts)`],
      },
    };

    let devLevel = "Beginner Portfolio";
    if (finalDevScore >= 95) devLevel = "Elite Engineering Profile";
    else if (finalDevScore >= 90) devLevel = "Exceptional Developer";
    else if (finalDevScore >= 80) devLevel = "Advanced Developer";
    else if (finalDevScore >= 70) devLevel = "Strong Developer";
    else if (finalDevScore >= 55) devLevel = "Capable Developer";
    else if (finalDevScore >= 40) devLevel = "Good Foundation Developer";
    else if (finalDevScore >= 25) devLevel = "Developing Developer";
    else devLevel = "Beginner Portfolio";

    let devStars = "☆☆☆☆☆";
    if (finalDevScore >= 80) devStars = "★★★★★";
    else if (finalDevScore >= 70) devStars = "★★★★☆";
    else if (finalDevScore >= 50) devStars = "★★★☆☆";
    else if (finalDevScore >= 30) devStars = "★★☆☆☆";
    else if (finalDevScore >= 15) devStars = "★☆☆☆☆";

    let evidenceConfidence: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
    let confidenceReason = "Analysis based on public GitHub repository inspection.";
    if (substantialProjects.length >= 1 && shouldDeepInspect) {
      evidenceConfidence = "HIGH";
      confidenceReason = "Verified deep source code file tree evidence across top public repositories.";
    } else if (meaningfulProjects.length >= 1) {
      evidenceConfidence = "MEDIUM";
      confidenceReason = "Verified public repository metadata and primary language structures.";
    } else {
      evidenceConfidence = "LOW";
      confidenceReason = "Limited Evidence — Repositories are mostly forks, assignments, minimal, or empty.";
    }

    const transparencyAudit: TransparencyAudit = {
      totalPublicRepos: userData.public_repos || allRepos.length,
      repositoriesInspected: allRepos.length,
      substantialProjectsCount: substantialCount,
      meaningfulProjectsCount: meaningfulCount,
      academicProjectsCount: academicCount,
      assignmentsCount: assignmentCount,
      tutorialsCount: tutorialCount,
      forksCount: forkCount,
      configProfileCount,
      minimalEmptyCount,
      verifiedProjectsList,
      excludedProjectsList,
      disclaimer: "This assessment is based only on publicly accessible GitHub evidence and should not be interpreted as a complete measurement of the developer's abilities.",
    };

    const separateMetrics: SeparateQualityMetrics = {
      bestProjectQuality: bestRQS,
      portfolioDepth: Math.min(100, meaningfulCount * 35),
      engineeringQuality: Math.round((engPracticesPts / 15) * 100),
      technicalBreadth: Math.round((techDepthPts / 15) * 100),
      maintenance: Math.round((maintenancePts / 5) * 100),
    };

    const scoreStrengths: string[] = [];
    const scoreNeedsImp: string[] = [];

    if (bestProj && bestProj.isMeaningful) scoreStrengths.push(`Flagship project "${bestProj.name}" verified with RQS ${bestRQS}/100 (${bestProj.projectQualityBreakdown.qualityTier})`);
    if (validFE && validBE) scoreStrengths.push("Verified full-stack implementation evidence (Frontend UI + Backend Service)");
    if (validCiCd || validTest) scoreStrengths.push("Verified engineering practices (Automated Testing / CI-CD / Docker)");

    if (meaningfulProjects.length === 0) scoreNeedsImp.push("No verified substantial or meaningful software projects found");
    else if (substantialProjects.length === 0) scoreNeedsImp.push("No flagship project with RQS >= 70 discovered");
    if (!validTest) scoreNeedsImp.push("No automated unit testing suite detected in public repositories");

    // Skill Confidence
    const detectedSkillsSet = new Set<string>();
    meaningfulProjects.forEach(r => {
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
          reason: "No code implementation detected in public repositories.",
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

    const feConf = getConfidence(validFE, meaningfulProjects.filter(r => r.hasFE), detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js"));
    const beConf = getConfidence(validBE, meaningfulProjects.filter(r => r.hasBE), detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Express") || detectedSkillsSet.has("Python") || detectedSkillsSet.has("Go"));
    const dbConf = getConfidence(validDB, meaningfulProjects.filter(r => r.hasDB), detectedSkillsSet.has("MongoDB") || detectedSkillsSet.has("MySQL") || detectedSkillsSet.has("PostgreSQL") || detectedSkillsSet.has("Firebase"));
    const aiConf = getConfidence(detectedSkillsSet.has("TensorFlow"), meaningfulProjects.filter(r => r.name.includes("tensor")), detectedSkillsSet.has("TensorFlow"));
    const devOpsConf = getConfidence(validCiCd, meaningfulProjects.filter(r => r.hasCiCd), detectedSkillsSet.has("Docker") || detectedSkillsSet.has("GitHub Workflows") || detectedSkillsSet.has("Nix / SaltStack"));
    const cloudConf = getConfidence(detectedSkillsSet.has("Firebase") || meaningfulProjects.some(r => r.hasPages), meaningfulProjects.filter(r => r.hasPages), detectedSkillsSet.has("Firebase"));
    const psConf = getConfidence(meaningfulProjects.length >= 1, meaningfulProjects, meaningfulProjects.length >= 2);
    const docConf = getConfidence(validReadmeCount > 0, meaningfulProjects.filter(r => r.hasReadme), validReadmeCount >= 2);
    const uiUxConf = getConfidence(detectedSkillsSet.has("Tailwind CSS"), meaningfulProjects.filter(r => r.name.includes("tailwind")), detectedSkillsSet.has("Tailwind CSS"));
    const testConf = getConfidence(validTest, meaningfulProjects.filter(r => r.hasTest), validTest);

    const isFullStackVerified = validFE && validBE && (validDB || meaningfulProjects.length >= 2);

    // Badges System
    const feProjects = meaningfulProjects.filter(r => r.hasFE);
    const feBadge: DeveloperBadge = {
      id: "frontend-developer",
      name: "Frontend Developer",
      description: "Build & publish meaningful frontend web applications",
      icon: "⚛️",
      unlocked: feProjects.length > 0,
      glowColor: "rgba(56,189,248,0.6)",
      evidenceList: feProjects.length > 0
        ? feProjects.map(r => `• ${r.name}: Verified frontend UI code (RQS: ${r.rqs}/100)`)
        : ["No verified meaningful frontend application project detected."],
      unlockReason: feProjects.length > 0
        ? "Verified frontend application implementation in public repositories."
        : "Requires at least one meaningful frontend project.",
      requirementsChecklist: [
        { text: "Frontend framework / JS/TS codebase detected", satisfied: validFE },
        { text: "Verified meaningful project", satisfied: feProjects.length > 0 },
      ],
    };

    const beProjects = meaningfulProjects.filter(r => r.hasBE);
    const beBadge: DeveloperBadge = {
      id: "backend-engineer",
      name: "Backend Engineer",
      description: "Create robust backend API servers and application logic",
      icon: "⚙️",
      unlocked: beProjects.length > 0,
      glowColor: "rgba(34,197,94,0.6)",
      evidenceList: beProjects.length > 0
        ? beProjects.map(r => `• ${r.name}: Verified backend server/API code (RQS: ${r.rqs}/100)`)
        : ["No backend API implementation detected in public repos."],
      unlockReason: beProjects.length > 0
        ? "Meaningful backend/server implementation verified."
        : "Requires a backend API server (Node, Python, Go, Java, etc.).",
      requirementsChecklist: [
        { text: "Backend framework / API server implementation", satisfied: validBE },
        { text: "Verified meaningful project", satisfied: beProjects.length > 0 },
      ],
    };

    const fullStackProjects = meaningfulProjects.filter(r => r.hasFE && r.hasBE);
    const fullStackBadge: DeveloperBadge = {
      id: "full-stack-builder",
      name: "Full-Stack Builder",
      description: "Build complete end-to-end applications connecting frontend & backend",
      icon: "🚀",
      unlocked: fullStackProjects.length > 0,
      glowColor: "rgba(168,85,247,0.7)",
      evidenceList: fullStackProjects.length > 0
        ? fullStackProjects.map(r => `• ${r.name}: Integrated FE + BE codebase verified (RQS: ${r.rqs}/100)`)
        : ["No single project combines both frontend and backend logic."],
      unlockReason: fullStackProjects.length > 0
        ? "Meaningful full-stack project combining frontend UI and backend API detected."
        : "Requires at least one single project containing BOTH frontend and backend.",
      requirementsChecklist: [
        { text: "Frontend codebase detected", satisfied: validFE },
        { text: "Backend codebase detected", satisfied: validBE },
        { text: "Single repository combines FE + BE", satisfied: fullStackProjects.length > 0 },
      ],
    };

    const dbProjects = meaningfulProjects.filter(r => r.hasDB);
    const dbBadge: DeveloperBadge = {
      id: "database-architect",
      name: "Database Architect",
      description: "Integrate database schemas and data persistence layers",
      icon: "🗄️",
      unlocked: dbProjects.length > 0,
      glowColor: "rgba(20,184,166,0.6)",
      evidenceList: dbProjects.length > 0
        ? dbProjects.map(r => `• ${r.name}: Database persistence verified (RQS: ${r.rqs}/100)`)
        : ["No database schemas or client queries detected in public codebases."],
      unlockReason: dbProjects.length > 0
        ? "Database persistence layers (MongoDB, PostgreSQL, MySQL, Firebase, etc.) verified."
        : "Requires database integration.",
      requirementsChecklist: [
        { text: "Database ORM / driver / query integration", satisfied: dbProjects.length > 0 },
        { text: "Meaningful application project", satisfied: dbProjects.length > 0 },
      ],
    };

    const aiProjects = meaningfulProjects.filter(r => (r.name.toLowerCase().includes("tensor") || r.name.toLowerCase().includes("ai") || r.name.toLowerCase().includes("ml") || r.topics.includes("ai")));
    const aiBadge: DeveloperBadge = {
      id: "ai-ml-builder",
      name: "AI / ML Builder",
      description: "Implement Machine Learning models, Computer Vision, or AI integrations",
      icon: "🧠",
      unlocked: aiProjects.length > 0,
      glowColor: "rgba(236,72,153,0.6)",
      evidenceList: aiProjects.length > 0
        ? aiProjects.map(r => `• ${r.name}: AI/ML implementation verified (RQS: ${r.rqs}/100)`)
        : ["No AI/ML model training or API implementation detected."],
      unlockReason: aiProjects.length > 0
        ? "Verified AI/ML libraries or API integrations in your project repository."
        : "Requires implementing Machine Learning models or AI integrations.",
      requirementsChecklist: [
        { text: "AI/ML codebase or API integration", satisfied: aiProjects.length > 0 },
        { text: "Non-trivial project implementation", satisfied: aiProjects.length > 0 },
      ],
    };

    const apiProjects = meaningfulProjects.filter(r => r.hasBE || r.name.toLowerCase().includes("api"));
    const apiBadge: DeveloperBadge = {
      id: "api-architect",
      name: "API Architect",
      description: "Design & implement RESTful or GraphQL backend API services",
      icon: "🔗",
      unlocked: apiProjects.length > 0,
      glowColor: "rgba(99,102,241,0.6)",
      evidenceList: apiProjects.length > 0
        ? apiProjects.map(r => `• ${r.name}: REST API routes & endpoints verified (RQS: ${r.rqs}/100)`)
        : ["No REST/GraphQL backend route definitions found."],
      unlockReason: apiProjects.length > 0
        ? "RESTful/GraphQL backend API routes verified."
        : "Requires designing and publishing backend API routes/endpoints.",
      requirementsChecklist: [
        { text: "Backend REST/GraphQL route definitions", satisfied: apiProjects.length > 0 },
        { text: "Meaningful API service architecture", satisfied: apiProjects.length > 0 },
      ],
    };

    const deployProjects = meaningfulProjects.filter(r => r.hasPages || r.hasCiCd);
    const deployBadge: DeveloperBadge = {
      id: "deployment-ready",
      name: "Deployment Ready",
      description: "Deploy live applications or configure cloud deployment pipelines",
      icon: "☁️",
      unlocked: deployProjects.length > 0,
      glowColor: "rgba(14,165,233,0.6)",
      evidenceList: deployProjects.length > 0
        ? deployProjects.map(r => `• ${r.name}: ${r.hasPages ? "Live web URL verified" : "CI/CD & Docker config verified"}`)
        : ["No live web URL or Docker/CI-CD setup found."],
      unlockReason: deployProjects.length > 0
        ? "Live application URL deployment or automated CI/CD container configuration verified."
        : "Requires deploying a web app live or adding Docker/CI-CD.",
      requirementsChecklist: [
        { text: "Live web application homepage URL", satisfied: meaningfulProjects.some(r => r.hasPages) },
        { text: "Docker / GitHub Actions pipeline", satisfied: validCiCd },
      ],
    };

    const docBadge: DeveloperBadge = {
      id: "documentation-pro",
      name: "Documentation Pro",
      description: "Maintain comprehensive README documentation across repositories",
      icon: "📚",
      unlocked: validReadmeCount >= 2 && meaningfulProjects.length >= 1,
      glowColor: "rgba(16,185,129,0.6)",
      evidenceList: validReadmeCount >= 2
        ? meaningfulProjects.filter(r => r.hasReadme).map(r => `• ${r.name}: Complete README documentation verified`)
        : [`Only ${validReadmeCount} repository has detailed README documentation.`],
      unlockReason: validReadmeCount >= 2
        ? "Comprehensive README documentation verified across multiple repositories."
        : "Requires detailed README documentation across at least 2 projects.",
      requirementsChecklist: [
        { text: "First repository README documentation", satisfied: validReadmeCount >= 1 },
        { text: "Second repository README documentation", satisfied: validReadmeCount >= 2 },
      ],
    };

    const collabBadge: DeveloperBadge = {
      id: "open-source-contributor",
      name: "Open Source Contributor",
      description: "Publish open source repositories with verified community recognition",
      icon: "🌐",
      unlocked: totalStars >= 25 && meaningfulProjects.length >= 2,
      glowColor: "rgba(245,158,11,0.6)",
      evidenceList: totalStars >= 25
        ? [`• ${totalStars} total community stars across original repositories`, `• ${meaningfulProjects.length} published meaningful repositories`]
        : ["No public collaboration or community star recognition yet."],
      unlockReason: totalStars >= 25
        ? "Verified open source publications with community recognition."
        : "Requires publishing meaningful original repositories with community stars.",
      requirementsChecklist: [
        { text: "Published original open source projects", satisfied: meaningfulProjects.length >= 2 },
        { text: "Community stargazers or PR contributions", satisfied: totalStars >= 25 },
      ],
    };

    const preUnlocked = [feBadge, beBadge, fullStackBadge, dbBadge, aiBadge, apiBadge, deployBadge, docBadge, collabBadge].filter(b => b.unlocked).length;
    const eliteBadge: DeveloperBadge = {
      id: "elite-builder",
      name: "Elite Builder",
      description: "Master level developer profile demonstrating top-tier software engineering",
      icon: "👑",
      unlocked: finalDevScore >= 90 && bestRQS >= 85 && preUnlocked >= 3,
      glowColor: "rgba(250,204,21,0.8)",
      evidenceList: finalDevScore >= 90
        ? [`• Developer Score: ${finalDevScore}/100 (Required: >= 90)`, `• Best Project RQS: ${bestRQS}/100 (Required: >= 85)`]
        : [`• Current Developer Score: ${finalDevScore}/100 (Required: >= 90)`, `• Best Project RQS: ${bestRQS}/100 (Required: >= 85)`],
      unlockReason: finalDevScore >= 90
        ? "Elite engineering portfolio status achieved with top-tier project quality and score >= 90."
        : "Requires Developer Score >= 90, Flagship Project RQS >= 85, and at least 3 other unlocked badges.",
      requirementsChecklist: [
        { text: "Developer Score >= 90", satisfied: finalDevScore >= 90 },
        { text: "Flagship Project RQS >= 85", satisfied: bestRQS >= 85 },
        { text: "At least 3 other achievements unlocked", satisfied: preUnlocked >= 3 },
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
    classifiedRepos.filter(r => r.isMeaningful).forEach(r => {
      if (r.language) techBreakdown[r.language] = (techBreakdown[r.language] || 0) + 1;
    });

    const mostUsedLanguages: { language: string; percentage: number; count: number }[] = Object.entries(techBreakdown)
      .map(([language, count]) => ({
        language,
        count: Number(count),
        percentage: Math.round((Number(count) / (meaningfulProjects.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const sortedBestRepos = [...classifiedRepos].sort((a, b) => b.rqs - a.rqs);

    const growth: ProjectGrowthMetrics = {
      reposCreatedCount: allRepos.length,
      technologiesLearnedCount: detectedSkillsSet.size,
      activityTrend: daysSinceUpdate <= 30 ? "Active Development 📈" : "Steady Profile 🏗️",
      mostProductiveMonth: bestProj?.updatedAt || "Recent Months",
      latestProject: sortedBestRepos[0] ? { name: sortedBestRepos[0].name, url: sortedBestRepos[0].url, date: sortedBestRepos[0].updatedAt } : null,
      mostSuccessfulProject: sortedBestRepos[0] ? { name: sortedBestRepos[0].name, url: sortedBestRepos[0].url, stars: sortedBestRepos[0].stars } : null,
    };

    const totalXP = finalDevScore * 10;

    const developerMetrics: DeveloperMetrics = {
      score: finalDevScore,
      evidenceConfidence,
      confidenceReason,
      separateMetrics,
      level: devLevel,
      levelNum: Math.max(1, Math.floor(finalDevScore / 10) + 1),
      xpCurrent: Math.round(totalXP % 100),
      xpMax: 100,
      xpPercentage: Math.min(100, Math.round(((totalXP % 100) / 100) * 100)),
      nextLevelRequirements: ["+1 Substantial Project with RQS >= 70"],
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
      analysisVersion: ANALYSIS_ENGINE_VERSION,
      analyzedAt: new Date().toISOString(),
    };

    const startupLevel = isFullStackVerified ? "Strong" : meaningfulProjects.length >= 1 ? "Moderate" : "Developing";
    const enterpriseLevel = validCiCd && validTest ? "Strong" : validCiCd ? "Moderate" : "Needs Evidence";
    const freelancerLevel = validFE && userData.blog ? "Strong" : validFE ? "Moderate" : "Developing";

    const developerPersonality: DeveloperPersonality = {
      archetype: isFullStackVerified ? "Full Stack Creator" : validBE ? "Backend Systems Engineer" : validFE ? "Frontend Developer" : "Software Developer",
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
        meaningfulProjects.length >= 1
          ? `Best project "${bestProj?.name || ''}" verified with RQS ${bestRQS}/100.`
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
            subtitle: `Analyzed ${meaningfulProjects.length} verified project(s)`,
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
        overallImpression: `Verified developer evidence. Best project quality score: ${bestRQS}/100.`,
        readinessStatus: isFullStackVerified ? "INTERNSHIP READY" : "DEVELOPING PORTFOLIO",
      },
      actionPlan,
      healthReport: {
        strengths: scoreStrengths.length > 0 ? scoreStrengths : ["Public GitHub account established"],
        improvements: Array.from(new Set([...scoreNeedsImp])),
        score: finalDevScore,
        healthLevelText: devLevel,
      },
      activityInsights: {
        lastUpdatedRepo: sortedBestRepos[0]?.name || null,
        mostActiveLanguage: mostUsedLanguages[0]?.language || null,
        recentActivityStatus: daysSinceUpdate <= 30 ? `Actively updated ${daysSinceUpdate === 0 ? "Today" : `${daysSinceUpdate} days ago`}` : "Limited recent activity",
        isInactive: daysSinceUpdate > 90,
      },
      aiRecommendations: [
        !validBE ? "Build a Node.js/Python backend REST API server." : "Add database persistence using MongoDB or PostgreSQL.",
        !meaningfulProjects.some(r => r.hasPages) ? "Deploy web applications live to Vercel/Netlify." : "Write automated unit tests using Jest/Vitest.",
        "Include architecture diagrams and API docs in repository READMEs.",
        "Pin your top 3 best projects on your GitHub profile overview.",
      ],
      cachedAt: new Date().toISOString(),
    };

    // ── 11. SERVER LOGS ──
    console.log(`[GitHub Intelligence Server Log] User: @${username} | Authenticated: ${Boolean(process.env.GITHUB_TOKEN)} | Rate limit: ${userFetch.rateLimitLimit} | Remaining: ${userFetch.rateLimitRemaining} | API Requests Used: ${apiRequestsUsed} | Cache hit: false`);

    cache.set(username, { data: result, timestamp: now, version: ANALYSIS_ENGINE_VERSION });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GitHub Intelligence V8 Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze GitHub profile" }, { status: 500 });
  }
}
