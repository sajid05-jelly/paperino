import { NextRequest, NextResponse } from "next/server";
import { githubApiClient } from "@/lib/githubApiClient";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES (Evidence Engine V8.2 - Final Accuracy Rebuild)
// ─────────────────────────────────────────────────────────────

export interface ProjectQualityBreakdown {
  implementationDepth: number; // /30
  architecture: number; // /15
  featureComplexity: number; // /15
  completeness: number; // /15
  engineeringPractices: number; // /10
  documentation: number; // /5
  testing: number; // /5
  deploymentUsability: number; // /5
  totalScore: number; // /100 (Repository Quality Score - RQS)
  qualityTier:
    | "Empty/Config/Noise (0-14)"
    | "Basic Practice (15-29)"
    | "Small/Learning Project (30-44)"
    | "Valid Project (45-59)"
    | "Substantial Project (60-74)"
    | "Strong Engineering Project (75-89)"
    | "Exceptional Project (90-100)";
}

export type RepoCategoryType =
  | "SUBSTANTIAL_PROJECT"
  | "VALID_SMALL_PROJECT"
  | "ACADEMIC_PROJECT"
  | "ASSIGNMENT_LAB"
  | "TUTORIAL_PRACTICE"
  | "CONFIG_PROFILE"
  | "EMPTY_MINIMAL"
  | "FORK"
  | "NOT_DEEP_AUDITED"
  | "UNKNOWN_INSUFFICIENT_EVIDENCE";

export type ProjectClassificationType =
  | "Web Application"
  | "Backend/API"
  | "Full-Stack Application"
  | "Library/Package"
  | "CLI Tool"
  | "SDK"
  | "Mobile/Desktop Application"
  | "Infrastructure/DevTool"
  | "Other";

export interface TechnicalEvidenceSignal {
  signal: string;
  points: number;
  evidenceFiles: string[];
  evidenceReason: string;
}

export interface ClassifiedRepoAuditDetails {
  categoryScores: {
    implementationDepth: { score: number; max: number; evidence: string[] };
    architecture: { score: number; max: number; evidence: string[] };
    featureComplexity: { score: number; max: number; evidence: string[] };
    completeness: { score: number; max: number; evidence: string[] };
    engineeringPractices: { score: number; max: number; evidence: string[] };
    documentation: { score: number; max: number; evidence: string[] };
    testing: { score: number; max: number; evidence: string[] };
    deploymentUsability: { score: number; max: number; evidence: string[] };
  };
  technicalSignals?: TechnicalEvidenceSignal[];
  filesInspected: string[];
  evidenceMissing: string[];
  analysisConfidence: "HIGH" | "MEDIUM" | "LOW";
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
  projectType: ProjectClassificationType;
  repoCategory: RepoCategoryType;
  isSubstantial: boolean;
  isMeaningful: boolean; // RQS >= 50
  rqs: number; // Repository Quality Score (0-100)
  projectQualityBreakdown: ProjectQualityBreakdown;
  auditDetails: ClassifiedRepoAuditDetails;
  evidenceList: string[];
  rejectionReason?: string;
  selectionReason: string;
  hasFE: boolean;
  hasBE: boolean;
  hasDB: boolean;
  hasTest: boolean;
  hasCiCd: boolean;
  hasPages: boolean;
  hasReadme: boolean;
  hasAiMl: boolean;
  hasCloud: boolean;
  hasUiUx: boolean;
  hasProblemSolving: boolean;
  aiMlEvidenceFiles?: string[];
  cloudEvidenceFiles?: string[];
  uiUxEvidenceFiles?: string[];
  problemSolvingEvidenceFiles?: string[];
  auditState?: "DEEP_AUDITED" | "NOT_DEEP_AUDITED" | "EXCLUDED_WITH_EVIDENCE";
}

export interface SkillConfidenceItem {
  score: number;
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
  bestProjectQuality: CategoryScoreItem; // /30
  overallProjectQuality: CategoryScoreItem; // /20
  technicalDepth: CategoryScoreItem; // /15
  portfolioDepth: CategoryScoreItem; // /10
  engineeringPractices: CategoryScoreItem; // /10
  documentation: CategoryScoreItem; // /5
  maintenanceConsistency: CategoryScoreItem; // /5
  collaborationOpenSource: CategoryScoreItem; // /5
  // Legacy aliases for backward compatibility
  otherVerifiedProjects?: CategoryScoreItem;
  engineeringDepth?: CategoryScoreItem;
  testingCI?: CategoryScoreItem;
  projectDiversity?: CategoryScoreItem;
  maintenance?: CategoryScoreItem;
}

export interface TransparencyAudit {
  totalPublicRepos: number;
  metadataReposFetched: number;
  candidateReposFound: number;
  deepAuditedRepos: number;
  verifiedRepos: number;
  substantialRepos: number;
  strongRepos: number;
  evidenceExcludedRepos: number;
  notDeepAuditedRepos: number;
  excludedRepos: number;
  repositoriesInspected: number;
  substantialProjectsCount: number;
  meaningfulProjectsCount: number;
  academicProjectsCount: number;
  assignmentsCount: number;
  tutorialsCount: number;
  forksCount: number;
  configProfileCount: number;
  minimalEmptyCount: number;
  verifiedProjectsList: {
    name: string;
    rqs: number;
    category: string;
    isSubstantial: boolean;
    auditDetails: ClassifiedRepoAuditDetails;
  }[];
  excludedProjectsList: { name: string; category: string; reason: string }[];
  notAuditedProjectsList: { name: string; reason: string }[];
  disclaimer: string;
  analysisCoverage: string;
  deepAnalysisInfo: string;
}

export interface SeparateQualityMetrics {
  bestProjectQuality: number;
  portfolioDepth: number;
  engineeringQuality: number;
  technicalBreadth: number;
  maintenance: number;
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
  score: number;
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
  skillsBreakdown: Record<string, number>;
  skillsConfidence: Record<string, SkillConfidenceItem>;
  badges: DeveloperBadge[];
  analysisVersion: string;
  analyzedAt: string;
  analysisComplete: boolean;
  authenticated: boolean;
  deepAnalyzedRepoCount: number;
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
  developerPersonality: any;
  developerJourney: any;
  recruiterPerspective: any;
  actionPlan: any;
  healthReport: any;
  activityInsights: any;
  aiRecommendations: string[];
  cachedAt: string;
  engineVersion: string;
  analysisComplete: boolean;
  authenticated: boolean;
  analysisConfidence: "HIGH" | "MEDIUM" | "LOW";
  isPartialAnalysis?: boolean;
  partialAnalysisWarning?: string;
}

const ANALYSIS_ENGINE_VERSION = "DISCOVERY_ENGINE_V6";
const cache = new Map<string, { data: GitHubAnalysisResult; timestamp: number; version: string; authenticated: boolean }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6-Hour Cache TTL

export async function GET(req: NextRequest) {
  let apiRequestsUsed = 0;
  const isAuthenticatedToken = Boolean(process.env.GITHUB_TOKEN);

  try {
    const { searchParams } = new URL(req.url);
    let username = searchParams.get("username")?.trim().replace(/^@/, "");
    const forceFresh = searchParams.get("fresh") === "true" || searchParams.get("refresh") === "true";

    if (!username) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    if (username.includes("github.com/")) {
      const parts = username.split("github.com/")[1].split("/").filter(Boolean);
      username = parts[0] || username;
    }

    username = username.toLowerCase();
    const cacheKey = `github-intelligence:v6:${username}`;

    const now = Date.now();
    // ── STEP 5: CACHE CONTAMINATION PREVENTION (v8.1 Versioning + Strict Check) ──
    if (!forceFresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (
        cached.version === ANALYSIS_ENGINE_VERSION &&
        cached.authenticated === isAuthenticatedToken &&
        cached.data.analysisComplete === true &&
        cached.data.analysisConfidence !== "LOW" &&
        (now - cached.timestamp < CACHE_TTL_MS)
      ) {
        console.log(`[GitHub Intelligence Server Log] User: @${username} | Authenticated: ${isAuthenticatedToken} | Rate limit: N/A | Remaining: N/A | API Requests Used: 0 | Cache hit: true`);
        return NextResponse.json({ ...cached.data, fromCache: true });
      }
    }

    // ── STEP 1: FETCH REAL REPOSITORY EVIDENCE VIA CENTRALIZED CLIENT ──
    apiRequestsUsed++;
    const userFetch = await githubApiClient<any>(`/users/${encodeURIComponent(username)}`);

    if (userFetch.isRateLimited || userFetch.status === 403) {
      console.warn(`[GitHub Intelligence Server Log] User: @${username} | Authenticated: ${isAuthenticatedToken} | API Requests Used: ${apiRequestsUsed} | RATE LIMITED`);
      return NextResponse.json({
        error: "Unable to complete evidence-based analysis due to API rate limits. Please try again later.",
        analysisConfidence: "LOW",
        analysisComplete: false,
      }, { status: 403 });
    }

    if (userFetch.status === 404 || !userFetch.data) {
      return NextResponse.json({ error: `GitHub user "@${username}" not found. Please check the username.` }, { status: 404 });
    }

    const userData = userFetch.data;
    const totalPublicReposCount = userData.public_repos || 0;

    // ── STEP 1: PAGINATED REPOSITORY DISCOVERY ──
    let allRepos: any[] = [];
    let page = 1;
    let isPartialAnalysis = false;
    let partialAnalysisWarning = "";
    const maxPagesToFetch = isAuthenticatedToken ? 15 : 5; // Up to 1500 repos for authenticated API requests
    const targetPages = totalPublicReposCount > 0 ? Math.ceil(totalPublicReposCount / 100) : 1;

    while (page <= Math.min(targetPages, maxPagesToFetch)) {
      apiRequestsUsed++;
      const reposFetch = await githubApiClient<any[]>(`/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100&page=${page}`);
      
      if (reposFetch.isRateLimited || reposFetch.status === 403) {
        isPartialAnalysis = true;
        partialAnalysisWarning = "Repository coverage was incomplete due to API rate limits. This score may underestimate the developer.";
        console.warn(`[DISCOVERY] User: @${username} | Rate limited on page ${page}. Continuing with ${allRepos.length} repos.`);
        break;
      }

      if (reposFetch.data && Array.isArray(reposFetch.data) && reposFetch.data.length > 0) {
        allRepos = allRepos.concat(reposFetch.data);
        if (reposFetch.data.length < 100) break;
        page++;
      } else {
        break;
      }
    }

    if (allRepos.length < totalPublicReposCount && !isPartialAnalysis) {
      isPartialAnalysis = true;
      partialAnalysisWarning = `Scanned ${allRepos.length} of ${totalPublicReposCount} repositories. This score may underestimate the developer.`;
    }

    if (allRepos.length === 0 && totalPublicReposCount > 0) {
      return NextResponse.json({
        error: "Analysis incomplete — repository contents could not be fully verified.",
        analysisConfidence: "LOW",
        analysisComplete: false,
        isPartialAnalysis: true,
        partialAnalysisWarning: "Repository coverage was incomplete. This score may underestimate the developer.",
      }, { status: 500 });
    }

    // ── STEP 2: EVIDENCE-BASED HARD EXCLUSIONS ──
    // Only exclude repos confidently proven to be forks without original work, profile README, empty, or archived.
    const isHardExcludedWithEvidence = (repo: any) => {
      const name = repo.name.toLowerCase();
      if (repo.fork) return { excluded: true, reason: "Forked repository without verified original changes" };
      if (repo.archived) return { excluded: true, reason: "Archived repository" };
      if (name === username.toLowerCase()) return { excluded: true, reason: "GitHub profile README / config repository" };
      if (name.includes("dotfiles") || name === ".github") return { excluded: true, reason: "Configuration / dotfiles repository" };
      if ((repo.size || 0) < 5) return { excluded: true, reason: "Empty or minimal repository (<5 KB)" };
      return { excluded: false, reason: "" };
    };

    const evidenceExcludedRepos: any[] = [];
    const candidatePool: any[] = [];

    for (const r of allRepos) {
      const check = isHardExcludedWithEvidence(r);
      if (check.excluded) {
        evidenceExcludedRepos.push({ repo: r, reason: check.reason });
      } else {
        candidatePool.push(r);
      }
    }

    // ── STEP 3: DYNAMIC PROFILE SAMPLING BUDGET ──
    // <= 30 repos: up to 20 candidates; 31-100: up to 20; 101-500: up to 30; >500: up to 40 candidates.
    let deepCandidateBudget = 20;
    if (totalPublicReposCount > 500) deepCandidateBudget = 40;
    else if (totalPublicReposCount > 100) deepCandidateBudget = 30;
    else deepCandidateBudget = Math.min(20, candidatePool.length);

    // ── STEP 4: MULTI-BUCKET CANDIDATE DISCOVERY ──
    // Candidate selection combines positive signals from 9 independent buckets:
    const selectedCandidateNames = new Set<string>();
    const deepCandidateList: any[] = [];

    const addCandidate = (repo: any) => {
      if (repo && !selectedCandidateNames.has(repo.name) && deepCandidateList.length < deepCandidateBudget) {
        selectedCandidateNames.add(repo.name);
        deepCandidateList.push(repo);
      }
    };

    // Helper score for ranking candidates within buckets
    const getCandidateScore = (r: any) => {
      const name = r.name.toLowerCase();
      const desc = (r.description || "").toLowerCase();
      const topics = (r.topics || []).map((t: string) => t.toLowerCase()).join(" ");
      const corpus = `${name} ${desc} ${topics}`;
      const sizeKB = r.size || 0;
      const lang = r.language || "";
      let score = sizeKB + (lang ? 500 : 0) + (desc.length >= 10 ? 200 : 0);
      if (corpus.includes("api") || corpus.includes("server") || corpus.includes("backend")) score += 400;
      if (corpus.includes("db") || corpus.includes("database") || corpus.includes("mongo") || corpus.includes("sql") || corpus.includes("postgres")) score += 400;
      if (corpus.includes("react") || corpus.includes("next") || corpus.includes("vue") || corpus.includes("app")) score += 300;
      if (corpus.includes("docker") || corpus.includes("cli") || corpus.includes("lib")) score += 200;
      score += Math.min(300, (r.stargazers_count || 0) * 2); // Weak tie-breaker only
      return score;
    };

    const sortedPool = [...candidatePool].sort((a, b) => getCandidateScore(b) - getCandidateScore(a));

    // Bucket A: Footprint (largest clean repos)
    sortedPool.slice(0, 10).forEach(addCandidate);

    // Bucket B: Backend & Service repos
    sortedPool.filter(r => {
      const c = `${r.name} ${r.description || ""} ${(r.topics || []).join(" ")}`.toLowerCase();
      return c.includes("api") || c.includes("server") || c.includes("backend") || c.includes("service");
    }).slice(0, 8).forEach(addCandidate);

    // Bucket C: Database persistence repos
    sortedPool.filter(r => {
      const c = `${r.name} ${r.description || ""} ${(r.topics || []).join(" ")}`.toLowerCase();
      return c.includes("db") || c.includes("database") || c.includes("mongo") || c.includes("sql") || c.includes("postgres") || c.includes("prisma");
    }).slice(0, 8).forEach(addCandidate);

    // Bucket D: Frontend / App repos
    sortedPool.filter(r => {
      const c = `${r.name} ${r.description || ""} ${(r.topics || []).join(" ")}`.toLowerCase();
      return c.includes("react") || c.includes("next") || c.includes("vue") || c.includes("angular") || c.includes("frontend") || c.includes("ui");
    }).slice(0, 8).forEach(addCandidate);

    // Bucket E: Tooling / CLI / Package repos
    sortedPool.filter(r => {
      const c = `${r.name} ${r.description || ""} ${(r.topics || []).join(" ")}`.toLowerCase();
      return c.includes("cli") || c.includes("tool") || c.includes("lib") || c.includes("package") || c.includes("docker") || c.includes("action");
    }).slice(0, 8).forEach(addCandidate);

    // Bucket F: Round-robin across primary languages
    const langGroups: Record<string, any[]> = {};
    for (const r of sortedPool) {
      const lang = r.language || "Other";
      if (!langGroups[lang]) langGroups[lang] = [];
      langGroups[lang].push(r);
    }
    let roundAdded = true;
    while (deepCandidateList.length < deepCandidateBudget && roundAdded) {
      roundAdded = false;
      for (const lang of Object.keys(langGroups)) {
        if (deepCandidateList.length >= deepCandidateBudget) break;
        if (langGroups[lang].length > 0) {
          const item = langGroups[lang].shift();
          if (!selectedCandidateNames.has(item.name)) {
            addCandidate(item);
            roundAdded = true;
          }
        }
      }
    }

    // Bucket G: Fill remaining candidates up to deepCandidateBudget from sortedPool
    for (const r of sortedPool) {
      if (deepCandidateList.length >= deepCandidateBudget) break;
      addCandidate(r);
    }

    const deepInspectedNames = new Set(deepCandidateList.map(r => r.name));

    // DISCOVERY DEBUG LOG
    console.log(`[DISCOVERY] Total public repos: ${totalPublicReposCount} | Metadata fetched: ${allRepos.length} | Hard excluded: ${evidenceExcludedRepos.length} | Candidate pool size: ${candidatePool.length} | Selected candidates for deep audit: ${deepCandidateList.length}`);

    let deepAnalyzedRepoCount = 0;
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
        const hasDescription = description.length >= 8;
        const stars = repo.stargazers_count || 0;
        const forksCount = repo.forks_count || 0;
        const hasPages = Boolean(repo.has_pages || repo.homepage);
        const topics = repo.topics || [];
        const language = repo.language || null;
        const corpus = `${repo.name} ${description} ${topics.join(" ")}`.toLowerCase();

        let treeFetched = false;
        let fileList: string[] = [];

        // Deep tree inspection via GitHub API for candidate repositories
        if (deepInspectedNames.has(repo.name) && !isFork && sizeKB > 15) {
          apiRequestsUsed++;
          const treeFetch = await githubApiClient<any>(`/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/git/trees/${repo.default_branch || "main"}?recursive=1`);
          if (treeFetch.data && Array.isArray(treeFetch.data.tree)) {
            fileList = treeFetch.data.tree.map((f: any) => f.path.toLowerCase());
            treeFetched = true;
            deepAnalyzedRepoCount++;
          }
        }

        // Code Structure & Manifest Triggers across root and nested paths (client, server, frontend, backend, apps, packages)
        const manifestDetected = treeFetched
          ? fileList.some(f => f === "package.json" || f.endsWith("/package.json") || f === "requirements.txt" || f.endsWith("/requirements.txt") || f === "pyproject.toml" || f.endsWith("/pyproject.toml") || f === "pom.xml" || f.endsWith("/pom.xml") || f === "build.gradle" || f.endsWith("/build.gradle") || f === "cargo.toml" || f.endsWith("/cargo.toml") || f === "go.mod" || f.endsWith("/go.mod"))
          : Boolean(language);

        const srcDetected = treeFetched
          ? fileList.some(f => 
              f.includes("/src/") || f.startsWith("src/") ||
              f.includes("/app/") || f.startsWith("app/") ||
              f.includes("/pages/") || f.startsWith("pages/") ||
              f.includes("/components/") || f.startsWith("components/") ||
              f.includes("/server/") || f.startsWith("server/") ||
              f.includes("/backend/") || f.startsWith("backend/") ||
              f.includes("/frontend/") || f.startsWith("frontend/") ||
              f.includes("/client/") || f.startsWith("client/") ||
              f.includes("/api/") || f.startsWith("api/") ||
              f.includes("/routes/") || f.startsWith("routes/") ||
              f.includes("/controllers/") || f.startsWith("controllers/") ||
              f.includes("/models/") || f.startsWith("models/") ||
              f.includes("/database/") || f.startsWith("database/") ||
              f.includes("/lib/") || f.startsWith("lib/") ||
              f.includes("/utils/") || f.startsWith("utils/") ||
              f.includes("/hooks/") || f.startsWith("hooks/") ||
              f.includes("/services/") || f.startsWith("services/")
            )
          : Boolean(sizeKB > 30);

        const hasPackageJson = treeFetched
          ? fileList.some(f => f === "package.json" || f.endsWith("/package.json"))
          : corpus.includes("package.json") || language === "JavaScript" || language === "TypeScript";

        const hasRequirements = treeFetched
          ? fileList.some(f => f === "requirements.txt" || f.endsWith("/requirements.txt") || f === "pyproject.toml" || f.endsWith("/pyproject.toml") || f === "pom.xml" || f.endsWith("/pom.xml") || f === "build.gradle" || f.endsWith("/build.gradle") || f === "cargo.toml" || f.endsWith("/cargo.toml") || f === "go.mod" || f.endsWith("/go.mod"))
          : corpus.includes("requirements") || corpus.includes("pipfile") || language === "Python" || language === "Go" || language === "Java" || language === "Rust";

        const dockerDetected = treeFetched
          ? fileList.some(f => f.includes("dockerfile") || f.includes("docker-compose"))
          : corpus.includes("docker");

        const ciDetected = treeFetched
          ? fileList.some(f => f.includes(".github/workflows/"))
          : corpus.includes("workflow") || corpus.includes("ci/cd") || corpus.includes("github-actions");

        const testsDetected = treeFetched
          ? fileList.some(f => f.includes("/test/") || f.includes("/tests/") || f.startsWith("test/") || f.startsWith("tests/") || f.includes("__tests__") || f.includes(".test.") || f.includes(".spec."))
          : corpus.includes("test") || corpus.includes("spec");

        const sourceFileCount = treeFetched
          ? fileList.filter(f => 
              f.includes("/src/") || f.startsWith("src/") ||
              f.includes("/app/") || f.startsWith("app/") ||
              f.includes("/pages/") || f.startsWith("pages/") ||
              f.includes("/components/") || f.startsWith("components/") ||
              f.includes("/server/") || f.startsWith("server/") ||
              f.includes("/backend/") || f.startsWith("backend/") ||
              f.includes("/frontend/") || f.startsWith("frontend/") ||
              f.includes("/client/") || f.startsWith("client/") ||
              f.includes("/api/") || f.startsWith("api/") ||
              f.includes("/lib/") || f.startsWith("lib/") ||
              f.includes("/services/") || f.startsWith("services/")
            ).length
          : Math.round(sizeKB / 20);

        const backendDetected = hasRequirements || corpus.includes("node") || corpus.includes("express") || corpus.includes("api") || corpus.includes("backend") || language === "Python" || language === "Go" || language === "Java" || language === "Rust" || (treeFetched && fileList.some(f => f.includes("/api/") || f.includes("/server/") || f.includes("/backend/") || f.includes("/controllers/") || f.includes("/routes/")));
        const databaseDetected = corpus.includes("mongo") || corpus.includes("sql") || corpus.includes("postgres") || corpus.includes("firebase") || corpus.includes("db") || (treeFetched && fileList.some(f => f.includes("schema") || f.includes("prisma") || f.includes("migration") || f.includes("/models/") || f.includes("/database/")));

        // Codebase Capability Signals
        const hasReadme = treeFetched
          ? fileList.some(f => f === "readme.md" || f === "readme" || f === "readme.rst" || f === "readme.txt")
          : Boolean(hasDescription || sizeKB >= 5);

        // Keyword triggers for low-value / academic repositories
        const isTaskKeyword = corpus.includes("bharatintern") || corpus.includes("codesoft") || corpus.includes("prodigy") || corpus.includes("internship") || corpus.includes("task-1") || corpus.includes("task1") || corpus.includes("task-2") || corpus.includes("task2") || corpus.includes("web-development-task");
        const isAssignmentKeyword = corpus.includes("assignment") || corpus.includes("homework") || corpus.includes("lab") || corpus.includes("dsa") || corpus.includes("leetcode");
        const isTutorialKeyword = corpus.includes("tutorial") || corpus.includes("course") || corpus.includes("awesome") || corpus.includes("sample");
        const isPracticeKeyword = corpus.includes("practice") || corpus.includes("exercise") || corpus.includes("test-repo") || corpus.includes("demo");
        const isAcademicKeyword = corpus.includes("academic") || corpus.includes("college") || corpus.includes("sem-") || corpus.includes("university");

        // Filter out vendor, build, generated, lock, and asset files
        const excludedPatterns = [
          "node_modules/", "dist/", "build/", ".next/", "coverage/", "vendor/", ".git/",
          "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".DS_Store"
        ];
        const isExcludedFile = (p: string) => excludedPatterns.some(pat => p.includes(pat));
        const filteredFileList = treeFetched ? fileList.filter(f => !isExcludedFile(f)) : [];

        // ── STRICT TECHNICAL SIGNAL & EVIDENCE EXTRACTION ──
        const technicalSignals: TechnicalEvidenceSignal[] = [];

        // 1. DATABASE PERSISTENCE SIGNAL
        // Requires actual executable source code files performing database connection/query/model operations.
        // Documentation, migration guides, READMEs, examples, or config files MUST NOT award DB points.
        const dbEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => {
              const isNonSource = f.endsWith(".md") || f.endsWith(".markdown") || f.endsWith(".json") || f.endsWith(".yaml") || f.endsWith(".yml") || f.includes("/docs/") || f.includes("/documentation/") || f.includes("/examples/");
              if (isNonSource) return false;

              return (
                f.includes("schema.prisma") || f.includes("schema.sql") ||
                f.includes("/models/") || f.includes("/database/") || f.includes("/db/") ||
                f.endsWith("/db.ts") || f.endsWith("/db.js") || f.endsWith("/database.ts") || f.endsWith("/database.js") ||
                f.endsWith(".sql") || f.includes("prisma/client") || f.includes("mongoose") || f.includes("typeorm") || f.includes("sequelize")
              );
            })
          : [];
        const hasDB = treeFetched && dbEvidenceFiles.length > 0;
        if (hasDB) {
          technicalSignals.push({
            signal: "databasePersistence",
            points: 3,
            evidenceFiles: dbEvidenceFiles.slice(0, 5),
            evidenceReason: "Executable source code performs database persistence operations.",
          });
        }

        // 2. AUTHENTICATION & AUTHORIZATION SIGNAL
        // Requires executable implementation of an actual auth/security flow (login, token validation, auth middleware, permission checks).
        // URL formatting/strip helpers (e.g. strip-url-auth.ts) MUST NOT award Auth points.
        const authEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => {
              const isNonSource = f.endsWith(".md") || f.endsWith(".markdown") || f.includes("/docs/") || f.includes("/documentation/") || f.includes("/examples/");
              if (isNonSource) return false;

              // Explicitly exclude URL strip/format/parsing helpers
              if (f.includes("strip-url-auth") || f.includes("format-auth") || f.includes("parse-auth-header-only")) return false;

              return (
                f.includes("auth.ts") || f.includes("auth.js") || f.includes("passport") ||
                f.includes("jwt") || f.includes("session") || f.includes("middleware/auth") ||
                f.includes("/auth/") || f.includes("login") || f.includes("permission") || f.includes("role")
              );
            })
          : [];
        const hasAuth = treeFetched && authEvidenceFiles.length > 0;
        if (hasAuth) {
          technicalSignals.push({
            signal: "authenticationAuthorization",
            points: 2,
            evidenceFiles: authEvidenceFiles.slice(0, 5),
            evidenceReason: "Executable source code contains authentication & authorization flow.",
          });
        }

        // 3. FRONTEND / BACKEND LAYER IDENTIFICATION & SEPARATION
        const feEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => 
              f.includes("/components/") || f.includes("/pages/") || f.includes("/views/") ||
              f.includes("/frontend/") || f.includes("/client/") || f.endsWith("index.html") || f.endsWith(".vue") || f.endsWith(".jsx") || f.endsWith(".tsx")
            )
          : [];

        const beEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => 
              f.includes("/controllers/") || f.includes("/routes/") || f.includes("/server/") ||
              f.includes("/backend/") || (f.includes("/api/") && !f.includes("index.html"))
            )
          : [];

        const hasFE = feEvidenceFiles.length > 0;
        const hasBE = beEvidenceFiles.length > 0;
        const hasFEBESep = hasFE && hasBE;

        if (hasFEBESep) {
          technicalSignals.push({
            signal: "fullstackSeparation",
            points: 3,
            evidenceFiles: [...feEvidenceFiles.slice(0, 3), ...beEvidenceFiles.slice(0, 3)],
            evidenceReason: "Independently implemented frontend UI and backend server/API layers exist.",
          });
        }

        // 4. PROJECT TYPE CLASSIFICATION
        let projectType: ProjectClassificationType = "Other";
        if (hasFE && hasBE) projectType = "Full-Stack Application";
        else if (hasBE && !hasFE) projectType = "Backend/API";
        else if (hasFE && !hasBE) projectType = "Web Application";
        else if (treeFetched && filteredFileList.some(f => f.includes("cli") || f.includes("bin/") || f.endsWith("cli.js") || f.endsWith("cli.ts"))) projectType = "CLI Tool";
        else if (treeFetched && corpus.includes("sdk")) projectType = "SDK";
        else if (treeFetched && (filteredFileList.some(f => f.endsWith("index.d.ts") || f.endsWith("package.json")) || corpus.includes("library") || corpus.includes("package"))) projectType = "Library/Package";
        else if (treeFetched && (fileList.some(f => f.includes(".github/workflows")) || dockerDetected)) projectType = "Infrastructure/DevTool";

        // 5. TESTING FILES & CONFIGURATION SIGNAL
        const testEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => 
              f.includes("/test/") || f.includes("/tests/") || f.includes("__tests__") ||
              f.includes(".test.") || f.includes(".spec.")
            )
          : [];
        const hasTest = testEvidenceFiles.length > 0;

        // 6. CI WORKFLOW SIGNAL
        const ciEvidenceFiles = treeFetched ? fileList.filter(f => f.includes(".github/workflows/")) : [];
        const hasCiCd = ciEvidenceFiles.length > 0;

        // 7. DEPLOYMENT PIPELINE SIGNAL (Distinct from CI test/lint)
        const deployEvidenceFiles = treeFetched
          ? fileList.filter(f => 
              f.includes("deploy.yml") || f.includes("release.yml") || f.includes("publish.yml") ||
              f.includes("vercel") || f.includes("netlify") || f.includes("docker-compose")
            )
          : [];
        const hasDeploymentPipeline = deployEvidenceFiles.length > 0 || hasPages;

        // 8. AI / ML EVIDENCE EXTRACTION (Distinguish actual ML model pipeline vs OpenAI API wrapper)
        const mlModelFiles = treeFetched
          ? filteredFileList.filter(f => 
              f.includes("torch") || f.includes("tensorflow") || f.includes("sklearn") || f.includes("scikit") ||
              f.includes("transformers") || f.includes("keras") || f.includes("dataset") ||
              f.endsWith(".ipynb") || f.includes("/ml/") || f.includes("/models/") || f.includes("train.py") || f.includes("predict.py") || f.includes("inference.py")
            )
          : [];
        const externalAiApiFiles = treeFetched
          ? filteredFileList.filter(f => f.includes("openai") || f.includes("langchain") || f.includes("anthropic") || f.includes("cohere"))
          : [];

        const hasActualMlModel = mlModelFiles.length > 0 || corpus.includes("machine-learning") || corpus.includes("deep-learning") || corpus.includes("pytorch") || corpus.includes("tensorflow") || corpus.includes("scikit-learn");
        const hasExternalAiApi = externalAiApiFiles.length > 0 || corpus.includes("openai") || corpus.includes("chatgpt");

        const hasAiMl = hasActualMlModel; // Requires actual ML model code / dataset pipeline
        const aiMlEvidenceFiles = hasActualMlModel ? mlModelFiles : externalAiApiFiles;

        // 9. CLOUD INFRASTRUCTURE EVIDENCE EXTRACTION
        const cloudEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => 
              f.includes("vercel.json") || f.includes("netlify.toml") || f.includes("aws") || f.includes("serverless") ||
              f.includes("terraform") || f.includes("cloudfront") || f.includes("s3") || f.includes("firebase.json") ||
              f.includes("fly.toml") || f.includes("render.yaml") || f.includes("cloudflare")
            )
          : [];
        const hasCloud = cloudEvidenceFiles.length > 0 || hasPages || corpus.includes("vercel") || corpus.includes("aws") || corpus.includes("cloud");

        // 10. UI / UX DESIGN EVIDENCE EXTRACTION
        const uiUxEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => 
              f.endsWith(".css") || f.endsWith(".scss") || f.endsWith(".sass") || f.endsWith(".less") ||
              f.includes("tailwind") || f.includes("styled") || f.includes("theme") || f.includes("component") ||
              f.includes("layout") || f.includes("css") || f.endsWith(".svg")
            )
          : [];
        const hasUiUx = uiUxEvidenceFiles.length > 0 || corpus.includes("tailwind") || corpus.includes("ui") || corpus.includes("css");

        // Count meaningful source files (.js, .ts, .jsx, .tsx, .py, .go, .java, .c, .cpp, .rs, .php, .rb, .sql, etc.)
        const sourceExtensions = [".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".java", ".c", ".cpp", ".rs", ".php", ".rb", ".sql", ".kt", ".swift", ".cs", ".html", ".vue", ".svelte"];
        const meaningfulSourceFiles = filteredFileList.filter(f => sourceExtensions.some(ext => f.endsWith(ext)));
        const meaningfulSourceFileCount = treeFetched ? meaningfulSourceFiles.length : Math.round(sizeKB / 20);

        // 11. PROBLEM SOLVING / ALGORITHM EVIDENCE EXTRACTION
        const problemSolvingEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => 
              f.includes("algorithm") || f.includes("parser") || f.includes("compiler") || f.includes("ast") ||
              f.includes("tree") || f.includes("graph") || f.includes("search") || f.includes("sort") ||
              f.includes("solver") || f.includes("calculator") || f.includes("engine") || f.includes("utility") || f.includes("util")
            )
          : [];
        const hasProblemSolving = problemSolvingEvidenceFiles.length > 0 || (meaningfulSourceFileCount >= 10);

        // 1. PROGRESSIVE IMPLEMENTATION DEPTH (0-30)
        let fileCountPoints = 0;
        if (meaningfulSourceFileCount >= 100) fileCountPoints = 8;
        else if (meaningfulSourceFileCount >= 41) fileCountPoints = 7;
        else if (meaningfulSourceFileCount >= 16) fileCountPoints = 5;
        else if (meaningfulSourceFileCount >= 6) fileCountPoints = 3;
        else if (meaningfulSourceFileCount >= 1) fileCountPoints = 1;

        let footprintPoints = 0;
        if (sizeKB > 2000) footprintPoints = 8;
        else if (sizeKB >= 500) footprintPoints = 7;
        else if (sizeKB >= 150) footprintPoints = 5;
        else if (sizeKB >= 50) footprintPoints = 3;
        else if (sizeKB > 0) footprintPoints = 1;

        const controllerModules = beEvidenceFiles.length;
        const serviceModules = filteredFileList.filter(f => f.includes("/services/") || f.includes("/lib/") || f.includes("/utils/") || f.includes("/hooks/")).length;
        const modelModules = dbEvidenceFiles.length;
        const uiModules = feEvidenceFiles.length;
        
        let businessLogicPoints = 0;
        if (treeFetched) {
          if (controllerModules > 0) businessLogicPoints += 2;
          if (serviceModules > 0) businessLogicPoints += 2;
          if (modelModules > 0) businessLogicPoints += 2;
          if (uiModules > 0) businessLogicPoints += 2;
        }

        let diversityPoints = 0;
        if (treeFetched) {
          const totalModules = controllerModules + serviceModules + modelModules + uiModules;
          if (totalModules >= 15) diversityPoints = 6;
          else if (totalModules >= 8) diversityPoints = 4;
          else if (totalModules >= 3) diversityPoints = 2;
          else if (totalModules >= 1) diversityPoints = 1;
        }

        let implementationDepth = treeFetched
          ? (fileCountPoints + footprintPoints + businessLogicPoints + diversityPoints)
          : 0;

        // 2. NON-BINARY ARCHITECTURE (0-15) — Adapted to projectType
        let archPoints = 0;
        const hasOrgStructure = treeFetched && (srcDetected || filteredFileList.some(f => f.includes("/")));
        const hasModuleSep = treeFetched && (uiModules > 0 || serviceModules > 0);
        const hasServiceDataLayer = treeFetched && (serviceModules > 0 || modelModules > 0);
        const hasReusableArch = treeFetched && (serviceModules >= 2 || uiModules >= 5 || projectType === "Library/Package");
        const hasClearDomainBoundaries = treeFetched && (controllerModules > 0 || modelModules > 0 || projectType === "Library/Package");

        if (hasOrgStructure) archPoints += 3;
        if (hasModuleSep) archPoints += 3;

        if (projectType === "Library/Package" || projectType === "SDK" || projectType === "CLI Tool") {
          // Evaluate public API organization & modular internal separation instead of penalizing lack of FE/BE split
          if (treeFetched && filteredFileList.some(f => f.endsWith("index.ts") || f.endsWith("index.js") || f.endsWith("exports.ts"))) archPoints += 3;
          if (hasServiceDataLayer) archPoints += 2;
          if (hasReusableArch) archPoints += 2;
          if (hasClearDomainBoundaries) archPoints += 2;
        } else {
          if (hasFEBESep) archPoints += 3;
          if (hasServiceDataLayer) archPoints += 2;
          if (hasReusableArch) archPoints += 2;
          if (hasClearDomainBoundaries) archPoints += 2;
        }
        let architecture = treeFetched ? Math.min(15, archPoints) : 0;

        // 3. DISTINCT EVIDENCE COMPLEXITY (0-15) — Requiring source evidence files
        let compPoints = 0;
        if (hasBE) compPoints += 3; // Verified API/backend logic = 3
        if (hasDB) compPoints += 3; // Verified database persistence = 3
        if (hasAuth) compPoints += 2; // Verified auth = 2

        const hasStateDataFlow = treeFetched && (uiModules >= 3 && serviceModules >= 1);
        if (hasStateDataFlow) compPoints += 2;

        const externalApiFiles = treeFetched ? filteredFileList.filter(f => f.includes("fetch") || f.includes("axios") || f.includes("http")) : [];
        if (externalApiFiles.length > 0) compPoints += 1;

        const validationFiles = treeFetched ? filteredFileList.filter(f => f.includes("zod") || f.includes("joi") || f.includes("validator") || f.includes("middleware")) : [];
        if (validationFiles.length > 0) compPoints += 1;

        const hasAdvancedFramework = treeFetched && (corpus.includes("next") || corpus.includes("nest") || corpus.includes("astro") || corpus.includes("fastapi"));
        if (hasAdvancedFramework) compPoints += 1;

        const asyncRealtimeFiles = treeFetched ? filteredFileList.filter(f => f.includes("socket") || f.includes("websocket") || f.includes("stream") || f.includes("cron")) : [];
        if (asyncRealtimeFiles.length > 0) compPoints += 1;

        if (dockerDetected || hasCiCd || hasTest) compPoints += 1;

        let featureComplexity = treeFetched ? Math.min(15, compPoints) : 0;

        // 4. PROGRESSIVE COMPLETENESS (0-15)
        let completenessPoints = 0;
        if (srcDetected || meaningfulSourceFileCount >= 3) completenessPoints += 3;
        if (manifestDetected) completenessPoints += 2;
        if (hasReadme) completenessPoints += 2;
        if (hasDescription) completenessPoints += 2;
        if (treeFetched && filteredFileList.some(f => f.includes(".env") || f.includes("config") || f.includes("settings"))) completenessPoints += 2;
        if (hasPages || hasCiCd) completenessPoints += 2;
        if (treeFetched && meaningfulSourceFileCount >= 10 && manifestDetected) completenessPoints += 2;
        let completeness = Math.min(15, completenessPoints);

        // 5. ENGINEERING PRACTICES (0-10)
        let engPractices = 0;
        if (hasCiCd) engPractices += 6;
        if (dockerDetected) engPractices += 4;
        engPractices = Math.min(10, engPractices);

        // 6. DOCUMENTATION (0-5)
        let docScore = hasDescription && sizeKB > 20 ? 5 : hasDescription ? 3 : 1;

        // 7. TESTING (0-5)
        let testingScore = hasTest ? 5 : 0;

        // 8. DEPLOYMENT (0-5) — Differentiating CI test/lint from actual deployment pipeline/live URL
        let deployCi = 0;
        if (hasPages) deployCi += 3;
        if (hasDeploymentPipeline) deployCi += 2;
        deployCi = Math.min(5, deployCi);

        // Specific category caps for noise/assignment/forks
        if (isFork) {
          implementationDepth = 0;
          architecture = 0;
          featureComplexity = 0;
          completeness = 0;
          engPractices = 0;
          testingScore = 0;
          deployCi = 0;
        } else if (isProfileRepo || sizeKB < 10) {
          implementationDepth = Math.min(2, implementationDepth);
          architecture = 0;
          featureComplexity = 0;
          completeness = Math.min(3, completeness);
          engPractices = 0;
          testingScore = 0;
          deployCi = 0;
        } else if (isTaskKeyword || isAssignmentKeyword || isTutorialKeyword || isPracticeKeyword) {
          implementationDepth = Math.min(10, implementationDepth);
          architecture = Math.min(8, architecture);
          featureComplexity = Math.min(6, featureComplexity);
          completeness = Math.min(6, completeness);
          engPractices = 0;
          testingScore = 0;
          deployCi = 0;
        }

        // ── STRICT IMPLEMENTATION & QUALITY GATES ──
        let rawRQS = implementationDepth + architecture + featureComplexity + completeness + engPractices + docScore + testingScore + deployCi;

        if (implementationDepth < 8) {
          rawRQS = Math.min(55, rawRQS);
        }

        if (isTaskKeyword || isAssignmentKeyword || isTutorialKeyword || isPracticeKeyword) {
          rawRQS = Math.min(34, rawRQS);
        } else if (isProfileRepo || sizeKB < 10) {
          rawRQS = Math.min(15, rawRQS);
        } else if (isFork) {
          rawRQS = Math.min(10, rawRQS);
        }

        const rqs = Math.min(100, Math.max(0, rawRQS));

        // ── PROJECT CLASSIFICATION & QUALITY GATES ──
        let repoCategory: RepoCategoryType = "TUTORIAL_PRACTICE";
        let isSubstantial = false;
        let isMeaningful = false; // Verified Project requiring RQS >= 50
        const evidenceList: string[] = [];

        const strongSignalsCount = (hasBE ? 1 : 0) + (hasDB ? 1 : 0) + (hasFE ? 1 : 0) + (testsDetected ? 1 : 0) + (ciDetected || dockerDetected ? 1 : 0);

        if (isFork) {
          repoCategory = "FORK";
          forkCount++;
          evidenceList.push("Forked repository without verified original changes (Excluded)");
        } else if (isProfileRepo) {
          repoCategory = "CONFIG_PROFILE";
          configProfileCount++;
          evidenceList.push("GitHub profile README / configuration repository (Excluded)");
        } else if (sizeKB === 0 || sizeKB < 10) {
          repoCategory = "EMPTY_MINIMAL";
          minimalEmptyCount++;
          evidenceList.push("Minimal or empty repository with no substantial codebase (Excluded)");
        } else if (isTaskKeyword || isAssignmentKeyword) {
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
          if (rqs >= 40 && implementationDepth >= 8) {
            isMeaningful = true;
            evidenceList.push(`Academic sem project with verified codebase (RQS: ${rqs}/100)`);
          } else {
            evidenceList.push("Basic academic submission without substantial application implementation");
          }
        } else {
          if (rqs >= 55 && implementationDepth >= 14 && strongSignalsCount >= 2) {
            repoCategory = "SUBSTANTIAL_PROJECT";
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
          } else if (rqs >= 40 && implementationDepth >= 8) {
            repoCategory = "VALID_SMALL_PROJECT";
            isMeaningful = true;
            meaningfulCount++;
            evidenceList.push(`✓ Verified valid application implementation (RQS: ${rqs}/100)`);
            if (hasFE) evidenceList.push("✓ Frontend UI component codebase detected");
            if (hasBE) evidenceList.push("✓ Backend service / API implementation detected");
          } else {
            repoCategory = "TUTORIAL_PRACTICE";
            tutorialCount++;
            evidenceList.push(`Small practice repository or starter boilerplate (RQS: ${rqs}/100 < 50)`);
          }
        }

        let qualityTier: ProjectQualityBreakdown["qualityTier"] = "Empty/Config/Noise (0-14)";
        if (rqs >= 90) qualityTier = "Exceptional Project (90-100)";
        else if (rqs >= 80) qualityTier = "Strong Engineering Project (75-89)";
        else if (rqs >= 65) qualityTier = "Substantial Project (60-74)";
        else if (rqs >= 50) qualityTier = "Valid Project (45-59)";
        else if (rqs >= 35) qualityTier = "Small/Learning Project (30-44)";
        else if (rqs >= 20) qualityTier = "Basic Practice (15-29)";

        const projectQualityBreakdown: ProjectQualityBreakdown = {
          implementationDepth,
          architecture,
          featureComplexity,
          completeness,
          engineeringPractices: engPractices,
          documentation: docScore,
          testing: testingScore,
          deploymentUsability: deployCi,
          totalScore: rqs,
          qualityTier,
        };

        const filesInspected = treeFetched ? filteredFileList.slice(0, 12) : [];
        const evidenceMissing: string[] = [];
        if (!treeFetched) evidenceMissing.push("Source evidence unavailable (File tree endpoint not inspected)");
        if (!hasTest) evidenceMissing.push("No automated test files detected");
        if (!hasCiCd && !dockerDetected) evidenceMissing.push("No deployment/CI-CD configuration detected");
        if (!hasDB) evidenceMissing.push("No database persistence layer detected");
        if (!hasFE && !hasBE) evidenceMissing.push("No full-stack UI/API framework structure detected");

        const auditDetails: ClassifiedRepoAuditDetails = {
          categoryScores: {
            implementationDepth: {
              score: implementationDepth,
              max: 30,
              evidence: treeFetched
                ? [
                    `✓ ${meaningfulSourceFileCount} meaningful source files (+${fileCountPoints}/8 pts)`,
                    `✓ Filtered codebase footprint ${Math.round(sizeKB)} KB (+${footprintPoints}/8 pts)`,
                    `✓ ${businessLogicPoints > 0 ? (controllerModules + serviceModules + modelModules + uiModules) : 0} business logic modules verified (+${businessLogicPoints}/8 pts)`,
                    `✓ Module diversity depth (+${diversityPoints}/6 pts)`
                  ]
                : ["Source evidence unavailable — 0 pts awarded"],
            },
            architecture: {
              score: architecture,
              max: 15,
              evidence: [
                hasOrgStructure ? "✓ Basic organized directory structure (+3 pts)" : "✗ No organized structure (+0 pts)",
                hasModuleSep ? "✓ Component/module separation (+3 pts)" : "✗ No module separation (+0 pts)",
                projectType === "Library/Package" || projectType === "SDK"
                  ? (filteredFileList.some(f => f.endsWith("index.ts") || f.endsWith("index.js")) ? "✓ Public API index export (+3 pts)" : "✗ No public API export (+0 pts)")
                  : (hasFEBESep ? "✓ Frontend/backend separation (+3 pts)" : "✗ No FE/BE separation (+0 pts)"),
                hasServiceDataLayer ? "✓ Service/data layer separation (+2 pts)" : "✗ No service/data layer (+0 pts)",
                hasReusableArch ? "✓ Reusable architecture modules (+2 pts)" : "✗ No reusable modules (+0 pts)",
                hasClearDomainBoundaries ? "✓ Clear domain boundaries (+2 pts)" : "✗ No clear domain boundaries (+0 pts)",
              ],
            },
            featureComplexity: {
              score: featureComplexity,
              max: 15,
              evidence: [
                hasBE ? `✓ Verified API/backend logic (+3 pts) [${beEvidenceFiles[0] || 'verified'}]` : "✗ No backend logic (+0 pts)",
                hasDB ? `✓ Verified database persistence (+3 pts) [${dbEvidenceFiles[0] || 'verified'}]` : "✗ No database persistence (+0 pts)",
                hasAuth ? `✓ Authentication/authorization (+2 pts) [${authEvidenceFiles[0] || 'verified'}]` : "✗ No authentication (+0 pts)",
                hasStateDataFlow ? "✓ Complex state/data flow (+2 pts)" : "✗ Simple data flow (+0 pts)",
                externalApiFiles.length > 0 ? "✓ External API integration (+1 pt)" : "✗ No external API integration (+0 pts)",
                validationFiles.length > 0 ? "✓ Validation/error handling (+1 pt)" : "✗ No validation logic (+0 pts)",
                hasAdvancedFramework ? "✓ Advanced framework capability (+1 pt)" : "✗ Basic framework (+0 pts)",
                asyncRealtimeFiles.length > 0 ? "✓ Async/realtime functionality (+1 pt)" : "✗ Synchronous logic (+0 pts)",
                dockerDetected || hasCiCd || hasTest ? "✓ Non-trivial engineering (+1 pt)" : "✗ Standard setup (+0 pts)",
              ],
            },
            completeness: {
              score: completeness,
              max: 15,
              evidence: [
                srcDetected || meaningfulSourceFileCount >= 3 ? "✓ Working application structure (+3 pts)" : "✗ Minimal structure (+0 pts)",
                manifestDetected ? "✓ Configuration completeness (+2 pts)" : "✗ Missing manifest (+0 pts)",
                hasReadme ? "✓ README setup instructions (+2 pts)" : "✗ Missing README (+0 pts)",
                hasDescription ? "✓ Repository overview description (+2 pts)" : "✗ Short description (+0 pts)",
                treeFetched && filteredFileList.some(f => f.includes(".env") || f.includes("config") || f.includes("settings")) ? "✓ Environment config (+2 pts)" : "✗ No env config (+0 pts)",
                hasPages || hasCiCd ? "✓ Usable entry point/deployment (+2 pts)" : "✗ No deployment entry (+0 pts)",
              ],
            },
            engineeringPractices: {
              score: engPractices,
              max: 10,
              evidence: [
                hasCiCd ? `✓ GitHub Actions CI workflow (+6 pts) [${ciEvidenceFiles[0] || 'workflow'}]` : "✗ No CI workflow (+0 pts)",
                dockerDetected ? "✓ Docker container config (+4 pts)" : "✗ No Docker config (+0 pts)",
              ],
            },
            documentation: {
              score: docScore,
              max: 5,
              evidence: [
                hasDescription && sizeKB > 20 ? "✓ Detailed documentation (+5 pts)" : hasDescription ? "✓ Basic description (+3 pts)" : "✗ Minimal documentation (+1 pt)",
              ],
            },
            testing: {
              score: testingScore,
              max: 5,
              evidence: [
                hasTest ? `✓ Automated unit test files detected (+5 pts) [${testEvidenceFiles[0] || 'test'}]` : "✗ No automated test files detected (+0 pts)",
              ],
            },
            deploymentUsability: {
              score: deployCi,
              max: 5,
              evidence: [
                hasPages ? "✓ GitHub Pages live URL (+3 pts)" : "✗ No live URL (+0 pts)",
                hasDeploymentPipeline ? `✓ Deployment pipeline verified (+2 pts) [${deployEvidenceFiles[0] || 'deploy'}]` : "✗ No deployment pipeline (+0 pts)",
              ],
            },
          },
          technicalSignals,
          filesInspected,
          evidenceMissing,
          analysisConfidence: treeFetched ? "HIGH" : "LOW",
        };

        // DEV-ONLY RQS AUDIT LOG
        console.log("PAPERINO_RQS_AUDIT", {
          repository: repo.name,
          projectType,
          classification: repoCategory,
          rqs,
          technicalSignals,
          categoryScores: {
            implementationDepth: `${implementationDepth}/30`,
            architecture: `${architecture}/15`,
            featureComplexity: `${featureComplexity}/15`,
            completeness: `${completeness}/15`,
            engineeringPractices: `${engPractices}/10`,
            documentation: `${docScore}/5`,
            testing: `${testingScore}/5`,
            deploymentUsability: `${deployCi}/5`,
          },
          evidence: evidenceList,
          filesInspected,
          missingEvidence: evidenceMissing,
          analysisConfidence: auditDetails.analysisConfidence,
        });

        // Determine explicit auditState for 3-State Model
        const isHardExcluded = evidenceExcludedRepos.some(e => e.repo.name === repo.name);
        const auditState: ClassifiedRepoInfo["auditState"] = isHardExcluded
          ? "EXCLUDED_WITH_EVIDENCE"
          : treeFetched
          ? "DEEP_AUDITED"
          : "NOT_DEEP_AUDITED";

        if (auditState === "NOT_DEEP_AUDITED") {
          repoCategory = "NOT_DEEP_AUDITED";
          evidenceList.unshift("Not selected for deep audit within sampling candidate budget");
        }

        const selectionReason = isSubstantial
          ? `Verified substantial project with RQS ${rqs}/100`
          : isMeaningful
          ? `Verified valid project with RQS ${rqs}/100`
          : auditState === "NOT_DEEP_AUDITED"
          ? "Not deep audited within candidate sampling budget"
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
          projectType,
          repoCategory,
          isSubstantial,
          isMeaningful,
          rqs,
          projectQualityBreakdown,
          auditDetails,
          evidenceList,
          selectionReason,
          hasFE,
          hasBE,
          hasDB,
          hasTest,
          hasCiCd,
          hasPages,
          hasReadme,
          hasAiMl,
          hasCloud,
          hasUiUx,
          hasProblemSolving,
          aiMlEvidenceFiles,
          cloudEvidenceFiles,
          uiUxEvidenceFiles,
          problemSolvingEvidenceFiles,
          auditState,
        };
      })
    );

    // ── STEP 5: 3-STATE REPOSITORY PARTITIONING & TRANSPARENCY AUDIT ──
    // State A: Deeply inspected candidate repos (tree fetched & verified RQS >= 50)
    const deepAuditedRepos = classifiedRepos.filter(r => r.auditState === "DEEP_AUDITED");
    // State B: Repos NOT deeply inspected — includes both:
    //   - Repos outside deep audit sampling budget (NOT_DEEP_AUDITED)
    //   - Metadata-excluded repos (forks, archived, empty, dotfiles) that were NEVER deeply inspected (EXCLUDED_WITH_EVIDENCE)
    const notDeepAuditedRepos = classifiedRepos.filter(r => r.auditState === "NOT_DEEP_AUDITED" || r.auditState === "EXCLUDED_WITH_EVIDENCE");
    // State C: ONLY repos that were actually deeply inspected (tree fetched) but failed quality gates (RQS < 50)
    const evidenceExcludedAfterInspection = deepAuditedRepos.filter(r => !r.isMeaningful);

    const substantialProjects = deepAuditedRepos.filter(r => r.isSubstantial).sort((a, b) => b.rqs - a.rqs);
    const verifiedProjects = deepAuditedRepos.filter(r => r.isMeaningful).sort((a, b) => b.rqs - a.rqs);
    const strongReposList = deepAuditedRepos.filter(r => r.rqs >= 75);

    const verifiedProjectsList = verifiedProjects.map(r => ({
      name: r.name,
      rqs: r.rqs,
      category: r.repoCategory.replace(/_/g, " "),
      isSubstantial: r.isSubstantial,
      auditDetails: r.auditDetails,
    }));

    const excludedProjectsList = evidenceExcludedAfterInspection.map(r => ({
      name: r.name,
      category: r.repoCategory.replace(/_/g, " "),
      reason: r.evidenceList[0] || "Did not meet verified RQS threshold (<50)",
    }));

    const notAuditedProjectsList = notDeepAuditedRepos.map(r => ({
      name: r.name,
      reason: r.auditState === "EXCLUDED_WITH_EVIDENCE"
        ? r.evidenceList[0] || "Metadata exclusion (fork/archived/empty/config)"
        : "Not selected for deep audit within sampling candidate budget",
    }));

    // ── STEP 6: AUTHORITATIVE EVIDENCE-BASED 100-POINT SCORE CALCULATION ──
    const proj1 = verifiedProjects[0] || null;
    const bestRQS = proj1 ? proj1.rqs : 0;

    // 1. BEST PROJECT QUALITY — 30 Points Max
    const bestProjectQualityScore = Math.round((bestRQS / 100) * 30);

    // 2. OVERALL PROJECTS — 20 Points Max
    const verifiedCountScore = Math.min(12, verifiedProjects.length * 2);
    const substantialCountScore = Math.min(5, Math.round(substantialProjects.length * 1.25));
    const strongProjectScore = strongReposList.length >= 1 ? 3 : 0;
    const overallProjectQualityScore = Math.min(20, verifiedCountScore + substantialCountScore + strongProjectScore);

    // 3. TECHNICAL DEPTH — 15 Points Max (Calculated from inspected technical skills)
    // Gather inspected technical skills
    const feEvidenceRepos = deepAuditedRepos.filter(r => r.hasFE);
    const beEvidenceRepos = deepAuditedRepos.filter(r => r.hasBE);
    const dbEvidenceRepos = deepAuditedRepos.filter(r => r.hasDB);
    const aiMlEvidenceRepos = deepAuditedRepos.filter(r => r.hasAiMl);
    const devOpsEvidenceRepos = deepAuditedRepos.filter(r => r.hasCiCd || (r.auditDetails?.categoryScores?.engineeringPractices?.score || 0) > 0);
    const cloudEvidenceRepos = deepAuditedRepos.filter(r => r.hasCloud || r.hasPages);
    const testingEvidenceRepos = deepAuditedRepos.filter(r => r.hasTest);
    const uiUxEvidenceRepos = deepAuditedRepos.filter(r => r.hasUiUx);
    const problemSolvingEvidenceRepos = deepAuditedRepos.filter(r => r.hasProblemSolving || r.rqs >= 50);
    const docEvidenceRepos = deepAuditedRepos.filter(r => r.hasReadme);

    const activeTechRepos = [
      feEvidenceRepos, beEvidenceRepos, dbEvidenceRepos, aiMlEvidenceRepos,
      devOpsEvidenceRepos, cloudEvidenceRepos, testingEvidenceRepos, uiUxEvidenceRepos, problemSolvingEvidenceRepos
    ];
    const activeSkillCount = activeTechRepos.filter(rList => rList.length > 0).length;
    const reposWithTechEvidenceCount = deepAuditedRepos.filter(r => r.hasFE || r.hasBE || r.hasDB || r.hasTest || r.hasCiCd || r.hasAiMl).length;

    const breadthScore = Math.min(6, activeSkillCount);
    const techSkillScores = [
      feEvidenceRepos.length > 0 ? Math.min(100, feEvidenceRepos.length * 40) : 0,
      beEvidenceRepos.length > 0 ? Math.min(100, beEvidenceRepos.length * 40) : 0,
      dbEvidenceRepos.length > 0 ? Math.min(100, dbEvidenceRepos.length * 45) : 0,
      aiMlEvidenceRepos.length > 0 ? Math.min(100, aiMlEvidenceRepos.length * 50) : 0,
      devOpsEvidenceRepos.length > 0 ? Math.min(100, devOpsEvidenceRepos.length * 45) : 0,
      cloudEvidenceRepos.length > 0 ? Math.min(100, cloudEvidenceRepos.length * 40) : 0,
      testingEvidenceRepos.length > 0 ? Math.min(100, testingEvidenceRepos.length * 50) : 0,
      uiUxEvidenceRepos.length > 0 ? Math.min(100, uiUxEvidenceRepos.length * 35) : 0,
      problemSolvingEvidenceRepos.length > 0 ? Math.min(100, problemSolvingEvidenceRepos.length * 30) : 0,
    ].filter(s => s > 0);

    const techSkillAvg = techSkillScores.length > 0 ? (techSkillScores.reduce((a, b) => a + b, 0) / techSkillScores.length) : 0;
    const strengthScore = Math.min(6, Math.round((techSkillAvg / 100) * 6));
    const deepEvidenceScore = Math.min(3, Math.round(reposWithTechEvidenceCount / 2));

    const technicalDepthScore = verifiedProjects.length > 0 ? Math.min(15, breadthScore + strengthScore + deepEvidenceScore) : 0;

    // 4. PORTFOLIO DEPTH — 10 Points Max
    const verifiedContribution = Math.min(4, verifiedProjects.length * 0.5);
    const substantialContribution = Math.min(3, substantialProjects.length * 0.75);
    const skillDiversityContribution = Math.min(3, activeSkillCount * 0.5);
    const portfolioDepthScore = verifiedProjects.length > 0
      ? Math.min(10, Math.round(verifiedContribution + substantialContribution + skillDiversityContribution))
      : 0;

    // 5. ENGINEERING PRACTICES — 10 Points Max
    const validCiCd = verifiedProjects.some(r => r.hasCiCd);
    const validDocker = verifiedProjects.some(r => r.evidenceList.some(e => e.includes("Docker")));
    const engineeringPracticesScore = verifiedProjects.length > 0 ? ((validCiCd ? 6 : 0) + (validDocker ? 4 : 0)) : 0;

    // 6. DOCUMENTATION — 5 Points Max
    const validReadmeCount = verifiedProjects.filter(r => r.hasReadme).length;
    const documentationScore = verifiedProjects.length > 0
      ? Math.min(5, (validReadmeCount >= 2 ? 3 : validReadmeCount === 1 ? 2 : 0) + (userData.bio ? 2 : 0))
      : 0;

    // 7. MAINTENANCE — 5 Points Max
    const daysSinceUpdate = proj1?.updatedAt
      ? Math.floor((now - new Date(allRepos[0]?.updated_at || now).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const hasReleaseEvidence = deepAuditedRepos.some(r => r.auditDetails?.categoryScores?.deploymentUsability?.score > 0);
    const maintenanceConsistencyScore = verifiedProjects.length > 0
      ? Math.min(5, (daysSinceUpdate <= 30 ? 2 : daysSinceUpdate <= 90 ? 1 : 0) + (hasReleaseEvidence ? 1 : 0) + (validCiCd ? 1 : 0) + (verifiedProjects.length >= 2 ? 1 : 0))
      : 0;

    // 8. COLLABORATION — 5 Points Max
    const totalStars = classifiedRepos.reduce((acc, r) => acc + r.stars, 0);
    const hasMultiContributor = deepAuditedRepos.some(r => r.forks > 0 || r.stars > 0);
    const collaborationOpenSourceScore = verifiedProjects.length > 0
      ? Math.min(5, (hasMultiContributor ? 2 : 1) + (totalStars >= 5 ? 1 : 0) + (verifiedProjects.length >= 2 ? 1 : 0) + (userData.followers >= 10 ? 1 : 0))
      : 0;

    // AUTHORITATIVE SUM (0-100 EXACT SUM)
    let rawProfileScore = bestProjectQualityScore + overallProjectQualityScore + technicalDepthScore + portfolioDepthScore + engineeringPracticesScore + documentationScore + maintenanceConsistencyScore + collaborationOpenSourceScore;

    // MANDATORY DYNAMIC CAPS (For weak or empty profiles)
    if (verifiedProjects.length === 0) {
      rawProfileScore = Math.min(15, rawProfileScore);
    } else if (substantialProjects.length === 0) {
      rawProfileScore = Math.min(65, rawProfileScore);
    }

    const finalDevScore = Math.min(100, Math.max(0, rawProfileScore));


    // ── STEP 13: FINAL SCORE VALIDATION ──
    if (process.env.NODE_ENV !== "production") {
      console.assert(finalDevScore >= 0 && finalDevScore <= 100, `Score out of bounds: ${finalDevScore}`);
    }

    // Category Score Breakdown (Exact Sum = finalDevScore)
    const scoreBreakdown: CategoryScoreBreakdown = {
      bestProjectQuality: {
        score: bestProjectQualityScore,
        max: 30,
        evidence: proj1
          ? [`Best project "${proj1.name}" RQS: ${bestRQS}/100 -> +${bestProjectQualityScore}/30 pts`]
          : ["No verified project found"],
      },
      overallProjectQuality: {
        score: overallProjectQualityScore,
        max: 20,
        evidence: [
          `✓ ${verifiedProjects.length} verified project(s) -> +${verifiedCountScore}/12 pts`,
          `✓ ${substantialProjects.length} substantial project(s) -> +${substantialCountScore}/5 pts`,
          strongProjectScore > 0 ? "✓ Strong project (RQS >= 75) -> +3 pts" : "✗ No strong project (RQS >= 75)",
        ],
      },
      technicalDepth: {
        score: technicalDepthScore,
        max: 15,
        evidence: [
          `✓ ${activeSkillCount} active technical skills -> +${breadthScore}/6 pts`,
          `✓ Skill strength -> +${strengthScore}/6 pts`,
          `✓ ${reposWithTechEvidenceCount} repo(s) with deep evidence -> +${deepEvidenceScore}/3 pts`,
        ],
      },
      portfolioDepth: {
        score: portfolioDepthScore,
        max: 10,
        evidence: [
          `✓ Verified project contribution -> +${verifiedContribution}/4 pts`,
          `✓ Substantial project contribution -> +${substantialContribution}/3 pts`,
          `✓ Technical diversity contribution -> +${skillDiversityContribution}/3 pts`,
        ],
      },
      engineeringPractices: {
        score: engineeringPracticesScore,
        max: 10,
        evidence: [
          validCiCd ? "✓ Verified CI/CD Workflow (+6 pts)" : "✗ No CI/CD workflow",
          validDocker ? "✓ Verified Docker Config (+4 pts)" : "✗ No Docker config",
        ],
      },
      documentation: {
        score: documentationScore,
        max: 5,
        evidence: [`${validReadmeCount} verified project(s) with README (+${documentationScore}/5 pts)`],
      },
      maintenanceConsistency: {
        score: maintenanceConsistencyScore,
        max: 5,
        evidence: [`Last active ${daysSinceUpdate <= 30 ? "within 30 days" : `${daysSinceUpdate} days ago`} (+${maintenanceConsistencyScore}/5 pts)`],
      },
      collaborationOpenSource: {
        score: collaborationOpenSourceScore,
        max: 5,
        evidence: [`Public collaboration and stargazers (+${collaborationOpenSourceScore}/5 pts)`],
      },
      // Legacy backward compatibility mappings
      otherVerifiedProjects: { score: overallProjectQualityScore, max: 20, evidence: [] },
      engineeringDepth: { score: technicalDepthScore, max: 15, evidence: [] },
      testingCI: { score: engineeringPracticesScore, max: 10, evidence: [] },
      projectDiversity: { score: portfolioDepthScore, max: 10, evidence: [] },
      maintenance: { score: maintenanceConsistencyScore, max: 5, evidence: [] },
    };

    // ── STEP 14: DEVELOPER LABELS ──
    let devLevel = "Limited Public Evidence";
    if (finalDevScore >= 90) devLevel = "Exceptional Developer";
    else if (finalDevScore >= 80) devLevel = "Advanced Developer";
    else if (finalDevScore >= 65) devLevel = "Strong Developer";
    else if (finalDevScore >= 50) devLevel = "Capable Developer";
    else if (finalDevScore >= 35) devLevel = "Emerging Developer";
    else if (finalDevScore >= 20) devLevel = "Developing Developer";
    else devLevel = "Limited Public Evidence";

    let devStars = "☆☆☆☆☆";
    if (finalDevScore >= 80) devStars = "★★★★★";
    else if (finalDevScore >= 65) devStars = "★★★★☆";
    else if (finalDevScore >= 50) devStars = "★★★☆☆";
    else if (finalDevScore >= 35) devStars = "★★☆☆☆";
    else if (finalDevScore >= 20) devStars = "★☆☆☆☆";

    // ── STEP 10: EVIDENCE CONFIDENCE (HIGH / MEDIUM / LOW) ──
    let analysisConfidence: "HIGH" | "MEDIUM" | "LOW" = isPartialAnalysis ? "LOW" : "HIGH";
    let confidenceReason = isPartialAnalysis
      ? partialAnalysisWarning
      : "Verified deep source code file tree evidence across candidate repositories.";

    const transparencyAudit: TransparencyAudit = {
      totalPublicRepos: totalPublicReposCount,
      metadataReposFetched: allRepos.length,
      candidateReposFound: candidatePool.length,
      deepAuditedRepos: deepAuditedRepos.length,
      verifiedRepos: verifiedProjects.length,
      substantialRepos: substantialProjects.length,
      strongRepos: strongReposList.length,
      evidenceExcludedRepos: evidenceExcludedAfterInspection.length,
      notDeepAuditedRepos: notDeepAuditedRepos.length,
      excludedRepos: evidenceExcludedAfterInspection.length,
      repositoriesInspected: deepAuditedRepos.length,
      substantialProjectsCount: substantialProjects.length,
      meaningfulProjectsCount: verifiedProjects.length,
      academicProjectsCount: academicCount,
      assignmentsCount: assignmentCount,
      tutorialsCount: tutorialCount,
      forksCount: forkCount,
      configProfileCount,
      minimalEmptyCount,
      verifiedProjectsList,
      excludedProjectsList,
      notAuditedProjectsList,
      disclaimer: "This assessment is based strictly on publicly accessible GitHub code evidence. 'Evidence Excluded' counts only deeply inspected repos that failed quality gates. Repos outside deep audit budget are marked 'Not Deep Audited'.",
      analysisCoverage: `${deepAuditedRepos.length} candidate repositories deep-audited from ${allRepos.length} public repositories scanned`,
      deepAnalysisInfo: `${deepAuditedRepos.length} candidate repositories inspected deeply`,
    };

    // ── STEP 10: SINGLE NORMALIZED EVIDENCE STORE & SKILL MATRIX PIPELINE ──
    const buildSkillConfidence = (
      key: string,
      label: string,
      matchingRepos: ClassifiedRepoInfo[],
      repoPointWeight: number
    ): SkillConfidenceItem => {
      const repoNames = matchingRepos.map(r => r.name);
      const count = matchingRepos.length;

      if (count === 0) {
        return {
          score: 0,
          confidence: "INSUFFICIENT EVIDENCE",
          evidence: ["No executable implementation evidence found in deeply inspected repositories."],
          reason: "No code implementation detected.",
          supportingRepos: [],
        };
      }

      let rawScore = Math.min(100, count * repoPointWeight);
      if (rawScore < 35) rawScore = 35;

      let confidence: SkillConfidenceItem["confidence"] = "LOW CONFIDENCE";
      let reason = "Limited code implementation evidence verified in inspected repositories.";

      if (count >= 2 || (count >= 1 && matchingRepos.some(r => r.isMeaningful))) {
        confidence = "HIGH CONFIDENCE";
        reason = `Verified implementation evidence across ${count} deeply audited repository codebase(s).`;
      } else if (count >= 1) {
        confidence = "MEDIUM CONFIDENCE";
        reason = `Implementation evidence verified in inspected repository "${matchingRepos[0].name}".`;
      }

      const evidence = matchingRepos.map(r => `• ${r.name}: ${label} evidence verified (RQS: ${r.rqs}/100)`);

      return {
        score: Math.min(100, Math.max(15, rawScore)),
        confidence,
        evidence,
        reason,
        supportingRepos: repoNames,
      };
    };

    const skillsConfidence: Record<string, SkillConfidenceItem> = {
      frontend: buildSkillConfidence("frontend", "Frontend UI", feEvidenceRepos, 40),
      backend: buildSkillConfidence("backend", "Backend / API", beEvidenceRepos, 40),
      database: buildSkillConfidence("database", "Database Persistence", dbEvidenceRepos, 45),
      aiMl: buildSkillConfidence("aiMl", "AI / Machine Learning", aiMlEvidenceRepos, 50),
      devOps: buildSkillConfidence("devOps", "DevOps & CI/CD", devOpsEvidenceRepos, 45),
      cloud: buildSkillConfidence("cloud", "Cloud Infrastructure", cloudEvidenceRepos, 40),
      problemSolving: buildSkillConfidence("problemSolving", "Problem Solving & Architecture", problemSolvingEvidenceRepos, 30),
      documentation: buildSkillConfidence("documentation", "Documentation", docEvidenceRepos, 35),
      uiUx: buildSkillConfidence("uiUx", "UI / UX Design", uiUxEvidenceRepos, 35),
      testing: buildSkillConfidence("testing", "Software Testing", testingEvidenceRepos, 50),
    };

    const skillsBreakdown: Record<string, number> = {
      frontend: skillsConfidence.frontend.confidence === "INSUFFICIENT EVIDENCE" ? 0 : skillsConfidence.frontend.score,
      backend: skillsConfidence.backend.confidence === "INSUFFICIENT EVIDENCE" ? 0 : skillsConfidence.backend.score,
      database: skillsConfidence.database.confidence === "INSUFFICIENT EVIDENCE" ? 0 : skillsConfidence.database.score,
      devOps: skillsConfidence.devOps.confidence === "INSUFFICIENT EVIDENCE" ? 0 : skillsConfidence.devOps.score,
      testing: skillsConfidence.testing.confidence === "INSUFFICIENT EVIDENCE" ? 0 : skillsConfidence.testing.score,
      documentation: skillsConfidence.documentation.confidence === "INSUFFICIENT EVIDENCE" ? 0 : skillsConfidence.documentation.score,
    };

    const activeSkillsCount = Object.values(skillsConfidence).filter(s => s.confidence !== "INSUFFICIENT EVIDENCE").length;

    const validTest = testingEvidenceRepos.length > 0;
    const validFE = feEvidenceRepos.length > 0;
    const validBE = beEvidenceRepos.length > 0;
    const validDB = dbEvidenceRepos.length > 0;
    const validPages = cloudEvidenceRepos.some(r => r.hasPages);

    const separateMetrics: SeparateQualityMetrics = {
      bestProjectQuality: bestRQS,
      portfolioDepth: verifiedProjects.length > 0 ? Math.max(20, portfolioDepthScore) : 0,
      engineeringQuality: Math.round(((engineeringPracticesScore + (validTest ? 5 : 0)) / 15) * 100),
      technicalBreadth: verifiedProjects.length > 0 ? Math.min(100, Math.round((activeSkillsCount / 10) * 100)) : 0,
      maintenance: Math.round((maintenanceConsistencyScore / 5) * 100),
    };

    const scoreStrengths: string[] = [];
    const scoreNeedsImp: string[] = [];

    if (proj1 && proj1.isMeaningful) scoreStrengths.push(`Flagship project "${proj1.name}" verified with RQS ${bestRQS}/100 (${proj1.projectQualityBreakdown.qualityTier})`);
    if (validFE && validBE) scoreStrengths.push("Verified full-stack implementation evidence (Frontend UI + Backend Service)");
    if (validCiCd || validTest) scoreStrengths.push("Verified engineering practices (Automated Testing / CI-CD / Docker)");

    if (verifiedProjects.length === 0) scoreNeedsImp.push("No verified substantial or valid software projects found");
    else if (substantialProjects.length === 0) scoreNeedsImp.push("No flagship project with RQS >= 65 discovered");
    if (!validTest) scoreNeedsImp.push("No automated unit testing suite detected in public repositories");

    // ── STEP 12: ACHIEVEMENTS SYSTEM (Must match Skill Matrix & Evidence) ──
    const feBadge: DeveloperBadge = {
      id: "frontend-developer",
      name: "Frontend Developer",
      description: "Build & publish valid frontend web applications",
      icon: "⚛️",
      unlocked: skillsConfidence.frontend.confidence !== "INSUFFICIENT EVIDENCE" && feEvidenceRepos.length > 0,
      glowColor: "rgba(56,189,248,0.6)",
      evidenceList: feEvidenceRepos.length > 0
        ? feEvidenceRepos.map(r => `• ${r.name}: Verified frontend UI code (RQS: ${r.rqs}/100)`)
        : ["No verified frontend application project detected."],
      unlockReason: feEvidenceRepos.length > 0
        ? "Verified frontend application implementation in public repositories."
        : "Requires at least one verified frontend project.",
      requirementsChecklist: [
        { text: "Frontend framework / JS/TS codebase detected", satisfied: validFE },
        { text: "Verified frontend evidence (Confidence != Insufficient)", satisfied: skillsConfidence.frontend.confidence !== "INSUFFICIENT EVIDENCE" },
      ],
    };

    const beBadge: DeveloperBadge = {
      id: "backend-engineer",
      name: "Backend Engineer",
      description: "Create robust backend API servers and application logic",
      icon: "⚙️",
      unlocked: skillsConfidence.backend.confidence !== "INSUFFICIENT EVIDENCE" && beEvidenceRepos.length > 0,
      glowColor: "rgba(34,197,94,0.6)",
      evidenceList: beEvidenceRepos.length > 0
        ? beEvidenceRepos.map(r => `• ${r.name}: Verified backend server/API code (RQS: ${r.rqs}/100)`)
        : ["No backend API implementation detected in public repos."],
      unlockReason: beEvidenceRepos.length > 0
        ? "Valid backend/server implementation verified."
        : "Requires a backend API server (Node, Python, Go, Java, etc.).",
      requirementsChecklist: [
        { text: "Backend framework / API server implementation", satisfied: validBE },
        { text: "Verified backend evidence (Confidence != Insufficient)", satisfied: skillsConfidence.backend.confidence !== "INSUFFICIENT EVIDENCE" },
      ],
    };

    const fullStackProjects = verifiedProjects.filter(r => r.hasFE && r.hasBE);
    const fullStackBadge: DeveloperBadge = {
      id: "full-stack-builder",
      name: "Full-Stack Builder",
      description: "Build complete end-to-end applications connecting frontend & backend",
      icon: "🚀",
      unlocked: skillsConfidence.frontend.confidence !== "INSUFFICIENT EVIDENCE" && skillsConfidence.backend.confidence !== "INSUFFICIENT EVIDENCE" && (fullStackProjects.length > 0 || (feEvidenceRepos.length > 0 && beEvidenceRepos.length > 0)),
      glowColor: "rgba(168,85,247,0.7)",
      evidenceList: feEvidenceRepos.length > 0 && beEvidenceRepos.length > 0
        ? [`• Verified Frontend repositories (${feEvidenceRepos.length}) + Backend repositories (${beEvidenceRepos.length})`]
        : ["No integrated frontend and backend evidence."],
      unlockReason: feEvidenceRepos.length > 0 && beEvidenceRepos.length > 0
        ? "Verified full-stack capability combining frontend UI and backend API detected."
        : "Requires evidence of BOTH frontend and backend implementations.",
      requirementsChecklist: [
        { text: "Frontend evidence verified", satisfied: skillsConfidence.frontend.confidence !== "INSUFFICIENT EVIDENCE" },
        { text: "Backend evidence verified", satisfied: skillsConfidence.backend.confidence !== "INSUFFICIENT EVIDENCE" },
      ],
    };

    const dbBadge: DeveloperBadge = {
      id: "database-architect",
      name: "Database Architect",
      description: "Integrate database schemas and data persistence layers",
      icon: "🗄️",
      unlocked: skillsConfidence.database.confidence !== "INSUFFICIENT EVIDENCE" && dbEvidenceRepos.length > 0,
      glowColor: "rgba(20,184,166,0.6)",
      evidenceList: dbEvidenceRepos.length > 0
        ? dbEvidenceRepos.map(r => `• ${r.name}: Verified database schema/persistence (RQS: ${r.rqs}/100)`)
        : ["No database schema or ORM models detected."],
      unlockReason: dbEvidenceRepos.length > 0
        ? "Verified database persistence integration."
        : "Requires integrating a database (MongoDB, PostgreSQL, Prisma, SQL, etc.).",
      requirementsChecklist: [
        { text: "Database persistence layer verified", satisfied: validDB },
        { text: "Database skill confidence verified", satisfied: skillsConfidence.database.confidence !== "INSUFFICIENT EVIDENCE" },
      ],
    };

    const aiBadge: DeveloperBadge = {
      id: "ai-ml-builder",
      name: "AI/ML Builder",
      description: "Develop machine learning models or AI application integrations",
      icon: "🤖",
      unlocked: skillsConfidence.aiMl.confidence !== "INSUFFICIENT EVIDENCE" && aiMlEvidenceRepos.length > 0,
      glowColor: "rgba(236,72,153,0.6)",
      evidenceList: aiMlEvidenceRepos.length > 0
        ? aiMlEvidenceRepos.map(r => `• ${r.name}: AI/ML implementation verified (RQS: ${r.rqs}/100)`)
        : ["No PyTorch, TensorFlow, or AI SDK code detected."],
      unlockReason: aiMlEvidenceRepos.length > 0
        ? "Verified AI/ML implementation codebase detected."
        : "Requires building an AI/ML model or API integration.",
      requirementsChecklist: [
        { text: "AI/ML codebase or model files", satisfied: aiMlEvidenceRepos.length > 0 },
        { text: "AI/ML skill confidence verified", satisfied: skillsConfidence.aiMl.confidence !== "INSUFFICIENT EVIDENCE" },
      ],
    };

    const apiBadge: DeveloperBadge = {
      id: "api-architect",
      name: "API Architect",
      description: "Design structured backend API endpoints and microservices",
      icon: "🔗",
      unlocked: skillsConfidence.backend.confidence !== "INSUFFICIENT EVIDENCE" && beEvidenceRepos.length > 0,
      glowColor: "rgba(99,102,241,0.6)",
      evidenceList: beEvidenceRepos.length > 0
        ? beEvidenceRepos.map(r => `• ${r.name}: REST/GraphQL API routes verified (RQS: ${r.rqs}/100)`)
        : ["No REST/GraphQL backend route definitions found."],
      unlockReason: beEvidenceRepos.length > 0
        ? "RESTful/GraphQL backend API routes verified."
        : "Requires designing and publishing backend API routes/endpoints.",
      requirementsChecklist: [
        { text: "Backend REST/GraphQL route definitions", satisfied: validBE },
        { text: "Backend skill confidence verified", satisfied: skillsConfidence.backend.confidence !== "INSUFFICIENT EVIDENCE" },
      ],
    };

    const deployBadge: DeveloperBadge = {
      id: "deployment-ready",
      name: "Deployment Ready",
      description: "Deploy live applications or configure cloud deployment pipelines",
      icon: "☁️",
      unlocked: (skillsConfidence.devOps.confidence !== "INSUFFICIENT EVIDENCE" || skillsConfidence.cloud.confidence !== "INSUFFICIENT EVIDENCE") && (devOpsEvidenceRepos.length > 0 || cloudEvidenceRepos.length > 0),
      glowColor: "rgba(14,165,233,0.6)",
      evidenceList: cloudEvidenceRepos.length > 0 || devOpsEvidenceRepos.length > 0
        ? [...cloudEvidenceRepos, ...devOpsEvidenceRepos].slice(0, 3).map(r => `• ${r.name}: Deployment / CI/CD pipeline verified`)
        : ["No live web URL or Docker/CI-CD setup found."],
      unlockReason: cloudEvidenceRepos.length > 0 || devOpsEvidenceRepos.length > 0
        ? "Live application URL deployment or automated CI/CD container configuration verified."
        : "Requires deploying a web app live or adding Docker/CI-CD.",
      requirementsChecklist: [
        { text: "Live web application or deployment config", satisfied: cloudEvidenceRepos.length > 0 || validPages },
        { text: "Docker / GitHub Actions pipeline", satisfied: devOpsEvidenceRepos.length > 0 || validCiCd },
      ],
    };

    const docBadge: DeveloperBadge = {
      id: "documentation-pro",
      name: "Documentation Pro",
      description: "Maintain comprehensive README documentation across repositories",
      icon: "📚",
      unlocked: skillsConfidence.documentation.confidence !== "INSUFFICIENT EVIDENCE" && docEvidenceRepos.length >= 1,
      glowColor: "rgba(16,185,129,0.6)",
      evidenceList: docEvidenceRepos.length > 0
        ? docEvidenceRepos.slice(0, 3).map(r => `• ${r.name}: Complete README documentation verified`)
        : ["No repository with detailed README documentation found."],
      unlockReason: docEvidenceRepos.length > 0
        ? "Comprehensive README documentation verified across repository codebases."
        : "Requires detailed README documentation.",
      requirementsChecklist: [
        { text: "Repository README documentation", satisfied: docEvidenceRepos.length >= 1 },
        { text: "Documentation skill confidence verified", satisfied: skillsConfidence.documentation.confidence !== "INSUFFICIENT EVIDENCE" },
      ],
    };

    const collabBadge: DeveloperBadge = {
      id: "open-source-contributor",
      name: "Open Source Contributor",
      description: "Publish open source repositories with verified community recognition",
      icon: "🌐",
      unlocked: (totalStars >= 10 || allRepos.length >= 5) && (deepAuditedRepos.length >= 2),
      glowColor: "rgba(245,158,11,0.6)",
      evidenceList: [
        `• ${totalStars} total community stars across public repositories`,
        `• ${deepAuditedRepos.length} inspected open source repository codebases`
      ],
      unlockReason: "Verified open source publications with community recognition.",
      requirementsChecklist: [
        { text: "Published original open source projects", satisfied: deepAuditedRepos.length >= 2 },
        { text: "Community stargazers or public repositories", satisfied: totalStars >= 5 || allRepos.length >= 3 },
      ],
    };

    const preUnlocked = [feBadge, beBadge, fullStackBadge, dbBadge, aiBadge, apiBadge, deployBadge, docBadge, collabBadge].filter(b => b.unlocked).length;
    const eliteBadge: DeveloperBadge = {
      id: "elite-builder",
      name: "Elite Builder",
      description: "Master level developer profile demonstrating top-tier software engineering",
      icon: "👑",
      unlocked: finalDevScore >= 85 && bestRQS >= 75 && preUnlocked >= 3,
      glowColor: "rgba(250,204,21,0.8)",
      evidenceList: finalDevScore >= 85
        ? [`• Developer Score: ${finalDevScore}/100 (Required: >= 85)`, `• Best Project RQS: ${bestRQS}/100 (Required: >= 75)`]
        : [`• Current Developer Score: ${finalDevScore}/100 (Required: >= 85)`, `• Best Project RQS: ${bestRQS}/100 (Required: >= 75)`],
      unlockReason: finalDevScore >= 85
        ? "Elite engineering portfolio status achieved with top-tier project quality and score >= 85."
        : "Requires Developer Score >= 85, Flagship Project RQS >= 75, and at least 3 other unlocked badges.",
      requirementsChecklist: [
        { text: "Developer Score >= 85", satisfied: finalDevScore >= 85 },
        { text: "Flagship Project RQS >= 75", satisfied: bestRQS >= 75 },
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

    // ── STEP 13: CAREER ARCHETYPE SELECTION (Strictly from Skill Matrix) ──
    let careerArchetype = "Software Developer";
    const feScore = skillsConfidence.frontend.score;
    const beScore = skillsConfidence.backend.score;
    const aiScore = skillsConfidence.aiMl.score;
    const devOpsScore = skillsConfidence.devOps.score;
    const cloudScore = skillsConfidence.cloud.score;
    const psScore = skillsConfidence.problemSolving.score;

    if (skillsConfidence.frontend.confidence !== "INSUFFICIENT EVIDENCE" && skillsConfidence.backend.confidence !== "INSUFFICIENT EVIDENCE" && feScore >= 35 && beScore >= 35) {
      careerArchetype = "Full Stack Developer";
    } else if (skillsConfidence.aiMl.confidence !== "INSUFFICIENT EVIDENCE" && aiScore >= 40) {
      careerArchetype = "AI / ML Engineer";
    } else if (skillsConfidence.frontend.confidence !== "INSUFFICIENT EVIDENCE" && feScore >= beScore && feScore >= 35) {
      careerArchetype = "Frontend Developer";
    } else if (skillsConfidence.backend.confidence !== "INSUFFICIENT EVIDENCE" && beScore >= feScore && beScore >= 35) {
      careerArchetype = "Backend Engineer";
    } else if ((skillsConfidence.devOps.confidence !== "INSUFFICIENT EVIDENCE" || skillsConfidence.cloud.confidence !== "INSUFFICIENT EVIDENCE") && (devOpsScore >= 40 || cloudScore >= 40)) {
      careerArchetype = "DevOps & Cloud Engineer";
    } else if (skillsConfidence.problemSolving.confidence !== "INSUFFICIENT EVIDENCE" && psScore >= 50) {
      careerArchetype = "Systems / Software Engineer";
    } else {
      careerArchetype = "Software Developer";
    }

    // ── STEP 14: PROGRAMMATIC INVARIANT VALIDATION & DEBUG CONSOLE LOGGING ──
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n=== GITHUB INTELLIGENCE SCORE BREAKDOWN (@${username}) ===`);
      console.table({
        bestProjectQuality: `${bestProjectQualityScore} / 30`,
        overallProjectQuality: `${overallProjectQualityScore} / 20`,
        technicalDepth: `${technicalDepthScore} / 15`,
        portfolioDepth: `${portfolioDepthScore} / 10`,
        engineeringPractices: `${engineeringPracticesScore} / 10`,
        documentation: `${documentationScore} / 5`,
        maintenanceConsistency: `${maintenanceConsistencyScore} / 5`,
        collaborationOpenSource: `${collaborationOpenSourceScore} / 5`,
        FINAL_AUTHORITATIVE_SCORE: `${finalDevScore} / 100`,
      });

      // Assertions Check
      if (verifiedProjects.length > 0 && overallProjectQualityScore === 0) console.warn("[INVARIANT_VIOLATION] Verified projects > 0 but Overall Projects is 0!");
      if (substantialProjects.length > 0 && portfolioDepthScore === 0) console.warn("[INVARIANT_VIOLATION] Substantial projects > 0 but Portfolio Depth is 0!");
      if (activeSkillCount >= 3 && technicalDepthScore === 0) console.warn("[INVARIANT_VIOLATION] 3+ active technical skills but Technical Depth is 0!");
    }

    const techBreakdown: Record<string, number> = {};
    classifiedRepos.filter(r => r.isMeaningful).forEach(r => {
      if (r.language) techBreakdown[r.language] = (techBreakdown[r.language] || 0) + 1;
    });

    const mostUsedLanguages: { language: string; percentage: number; count: number }[] = Object.entries(techBreakdown)
      .map(([language, count]) => ({
        language,
        count: Number(count),
        percentage: Math.round((Number(count) / (meaningfulCount || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const sortedBestRepos = [...classifiedRepos].sort((a, b) => b.rqs - a.rqs);

    const growth = {
      reposCreatedCount: allRepos.length,
      technologiesLearnedCount: Object.keys(techBreakdown).length,
      activityTrend: daysSinceUpdate <= 30 ? "Active Development 📈" : "Steady Profile 🏗️",
      mostProductiveMonth: proj1?.updatedAt || "Recent Months",
      latestProject: sortedBestRepos[0] ? { name: sortedBestRepos[0].name, url: sortedBestRepos[0].url, date: sortedBestRepos[0].updatedAt } : null,
      mostSuccessfulProject: sortedBestRepos[0] ? { name: sortedBestRepos[0].name, url: sortedBestRepos[0].url, stars: sortedBestRepos[0].stars } : null,
    };

    const totalXP = finalDevScore * 10;

    const developerMetrics: DeveloperMetrics = {
      score: finalDevScore,
      evidenceConfidence: analysisConfidence,
      confidenceReason,
      separateMetrics,
      level: devLevel,
      levelNum: Math.max(1, Math.floor(finalDevScore / 10) + 1),
      xpCurrent: Math.round(totalXP % 100),
      xpMax: 100,
      xpPercentage: Math.min(100, Math.round(((totalXP % 100) / 100) * 100)),
      nextLevelRequirements: ["+1 Substantial Project with RQS >= 60"],
      nextRewardBadge: "Master Engineer Badge",
      stars: devStars,
      rankPercentile: null,
      category: careerArchetype,
      scoreBreakdown,
      transparencyAudit,
      scoreExplanation: {
        strengths: scoreStrengths,
        needsImprovement: scoreNeedsImp,
      },
      skillsBreakdown,
      skillsConfidence,
      badges,
      analysisVersion: ANALYSIS_ENGINE_VERSION,
      analyzedAt: new Date().toISOString(),
      analysisComplete: true,
      authenticated: isAuthenticatedToken,
      deepAnalyzedRepoCount,
    };

    const result: GitHubAnalysisResult = {
      username: userData.login,
      name: userData.name || null,
      avatarUrl: userData.avatar_url,
      bio: userData.bio || null,
      followers: userData.followers || 0,
      following: userData.following || 0,
      publicReposCount: totalPublicReposCount,
      createdAt: userData.created_at ? new Date(userData.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "",
      portfolioUrl: userData.blog ? (userData.blog.startsWith("http") ? userData.blog : `https://${userData.blog}`) : null,
      detectedSkills: Object.keys(techBreakdown),
      mostUsedLanguages,
      technologyBreakdown: techBreakdown,
      bestProjects: sortedBestRepos.slice(0, 3),
      developerMetrics,
      developerPersonality: {
        archetype: validFE && validBE ? "Full Stack Creator" : validBE ? "Backend Systems Engineer" : validFE ? "Frontend Developer" : "Software Developer",
        title: validFE && validBE ? "Full Stack Engineer" : "Software Developer",
        bestCareerPath: validFE && validBE ? "Full Stack Software Engineering" : "Software Development",
        readinessScores: {
          startupReadiness: validFE && validBE ? 80 : 50,
          enterpriseReadiness: validCiCd && validTest ? 85 : 45,
          freelancerPotential: validFE ? 75 : 40,
          leadershipPotential: 50,
        },
        readinessLevels: {
          startupReadiness: validFE && validBE ? "Strong" : "Moderate",
          enterpriseReadiness: validCiCd && validTest ? "Strong" : "Moderate",
          freelancerPotential: validFE ? "Strong" : "Moderate",
          leadershipPotential: "Developing",
        },
        developerStyleTraits: [
          proj1 ? `Best project "${proj1.name}" verified with RQS ${bestRQS}/100.` : "Building portfolio",
        ],
      },
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
            subtitle: `Analyzed ${verifiedProjects.length} verified project(s)`,
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
        readinessStatus: validFE && validBE ? "INTERNSHIP READY" : "DEVELOPING PORTFOLIO",
      },
      actionPlan: {
        quickWins: ["Add short descriptions and topics to all public repositories."],
        next7Days: ["Create a detailed README.md for your primary repository."],
        next30Days: ["Build a full stack application connecting frontend, backend API, and database."],
        beforeApplying: ["Pin your strongest projects to your main GitHub profile overview."],
      },
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
        !verifiedProjects.some(r => r.hasPages) ? "Deploy web applications live to Vercel/Netlify." : "Write automated unit tests using Jest/Vitest.",
      ],
      cachedAt: new Date().toISOString(),
      engineVersion: ANALYSIS_ENGINE_VERSION,
      analysisComplete: true,
      authenticated: isAuthenticatedToken,
      analysisConfidence,
    };

    // ── STEP 19: REQUIRED DEBUG OUTPUT ──
    const topAudited10 = deepAuditedRepos.slice(0, 10).map(r => `${r.name} | RQS:${r.rqs} | ${r.repoCategory}`);
    const top3Final = verifiedProjects.slice(0, 3).map(r => `${r.name} | RQS:${r.rqs}`);
    
    console.log(`\n==================================================`);
    console.log(`[GITHUB INTELLIGENCE REPOSITORY DISCOVERY AUDIT] User: @${username}`);
    console.log(`==================================================`);
    console.log(`TOTAL PUBLIC: ${totalPublicReposCount}`);
    console.log(`METADATA FETCHED: ${allRepos.length}`);
    console.log(`EVIDENCE EXCLUDED (Inspected & Failed): ${evidenceExcludedAfterInspection.length}`);
    console.log(`CANDIDATE POOL SIZE: ${candidatePool.length}`);
    console.log(`DEEP AUDITED: ${deepAuditedRepos.length}`);
    console.log(`NOT DEEP AUDITED: ${notDeepAuditedRepos.length}`);
    console.log(`VERIFIED: ${verifiedProjects.length}`);
    console.log(`SUBSTANTIAL: ${substantialProjects.length}`);
    console.log(`STRONG: ${strongReposList.length}`);
    console.log(`\nTOP 10 AUDITED REPOSITORIES:\n${topAudited10.join("\n")}`);
    console.log(`\nFINAL TOP 3:\n${top3Final.join("\n")}`);
    console.log(`ANALYSIS STATUS: ${isPartialAnalysis ? "PARTIAL" : "COMPLETE"}`);
    console.log(`==================================================\n`);

    cache.set(cacheKey, { data: result, timestamp: now, version: ANALYSIS_ENGINE_VERSION, authenticated: isAuthenticatedToken });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GitHub Intelligence V8.2 Rebuild Error]:", err);
    return NextResponse.json({
      error: "Unable to complete evidence-based analysis. Please retry.",
      analysisConfidence: "LOW",
      analysisComplete: false,
    }, { status: 500 });
  }
}
