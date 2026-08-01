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
  bestProjectQuality: CategoryScoreItem; // /35
  otherVerifiedProjects: CategoryScoreItem; // /20
  engineeringDepth: CategoryScoreItem; // /15
  engineeringPractices: CategoryScoreItem; // /10
  documentation: CategoryScoreItem; // /5
  testingCI: CategoryScoreItem; // /5
  projectDiversity: CategoryScoreItem; // /5
  maintenance: CategoryScoreItem; // /5
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

const ANALYSIS_ENGINE_VERSION = "DISCOVERY_ENGINE_V5";
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
    const cacheKey = `github-intelligence:v5:${username}`;

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
        const hasReadme = Boolean(hasDescription || sizeKB >= 5);

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
        const dbEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => 
              !f.endsWith(".md") && !f.endsWith(".markdown") && !f.includes("/docs/") && !f.includes("/documentation/") &&
              (f.includes("schema.") || f.includes("prisma") || f.includes("migration") ||
               f.includes("/models/") || f.includes("/database/") || f.includes("/db/") ||
               f.endsWith("db.ts") || f.endsWith("db.js") || f.endsWith(".sql"))
            )
          : [];
        const hasDB = treeFetched && dbEvidenceFiles.length > 0;
        if (hasDB) {
          technicalSignals.push({
            signal: "databasePersistence",
            points: 3,
            evidenceFiles: dbEvidenceFiles.slice(0, 5),
            evidenceReason: "Source code performs database persistence operations.",
          });
        }

        // 2. AUTHENTICATION & AUTHORIZATION SIGNAL
        const authEvidenceFiles = treeFetched
          ? filteredFileList.filter(f => 
              f.includes("auth") || f.includes("jwt") || f.includes("session") ||
              f.includes("passport") || f.includes("login") || f.includes("middleware/auth")
            )
          : [];
        const hasAuth = treeFetched && authEvidenceFiles.length > 0;
        if (hasAuth) {
          technicalSignals.push({
            signal: "authenticationAuthorization",
            points: 2,
            evidenceFiles: authEvidenceFiles.slice(0, 5),
            evidenceReason: "Source code contains authentication & authorization logic.",
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

        // Count meaningful source files (.js, .ts, .jsx, .tsx, .py, .go, .java, .c, .cpp, .rs, .php, .rb, .sql, etc.)
        const sourceExtensions = [".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".java", ".c", ".cpp", ".rs", ".php", ".rb", ".sql", ".kt", ".swift", ".cs", ".html", ".vue", ".svelte"];
        const meaningfulSourceFiles = filteredFileList.filter(f => sourceExtensions.some(ext => f.endsWith(ext)));
        const meaningfulSourceFileCount = treeFetched ? meaningfulSourceFiles.length : Math.round(sizeKB / 20);

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
        if (manifestDetected) completenessPoints += 3;
        if (hasReadme) completenessPoints += 3;
        if (hasDescription) completenessPoints += 2;
        if (treeFetched && filteredFileList.some(f => f.includes(".env") || f.includes("config") || f.includes("settings"))) completenessPoints += 2;
        if (hasPages || hasCiCd) completenessPoints += 2;
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

        if (implementationDepth < 14) {
          rawRQS = Math.min(44, rawRQS);
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
          if (rqs >= 50 && implementationDepth >= 14) {
            isMeaningful = true;
            evidenceList.push(`Academic sem project with verified codebase (RQS: ${rqs}/100)`);
          } else {
            evidenceList.push("Basic academic submission without substantial application implementation");
          }
        } else {
          if (rqs >= 65 && implementationDepth >= 22 && strongSignalsCount >= 2) {
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
          } else if (rqs >= 50 && implementationDepth >= 14) {
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
                manifestDetected ? "✓ Configuration completeness (+3 pts)" : "✗ Missing manifest (+0 pts)",
                hasReadme ? "✓ README setup instructions (+3 pts)" : "✗ Missing README (+0 pts)",
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
          auditState,
        };
      })
    );

    // ── STEP 5: 3-STATE REPOSITORY PARTITIONING & TRANSPARENCY AUDIT ──
    const deepAuditedRepos = classifiedRepos.filter(r => r.auditState === "DEEP_AUDITED");
    const notDeepAuditedRepos = classifiedRepos.filter(r => r.auditState === "NOT_DEEP_AUDITED");
    const hardExcludedRepos = classifiedRepos.filter(r => r.auditState === "EXCLUDED_WITH_EVIDENCE");

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

    const excludedProjectsList = hardExcludedRepos.map(r => ({
      name: r.name,
      category: r.repoCategory.replace(/_/g, " "),
      reason: r.evidenceList[0] || "Excluded with verified metadata evidence",
    }));

    const notAuditedProjectsList = notDeepAuditedRepos.map(r => ({
      name: r.name,
      reason: "Not selected for deep audit within sampling candidate budget",
    }));

    // ── STEP 6: CANONICAL PROFILE SCORE CALCULATION (0-100 EXACT SUM) ──
    // Top 3 verified repositories ONLY directly contribute project-quality points
    const proj1 = verifiedProjects[0] || null;
    const proj2 = verifiedProjects[1] || null;
    const proj3 = verifiedProjects[2] || null;

    const bestRQS = proj1 ? proj1.rqs : 0;
    const secondRQS = proj2 ? proj2.rqs : 0;
    const thirdRQS = proj3 ? proj3.rqs : 0;

    // 1. BEST PROJECT QUALITY — 40 Points Max
    const bestProjectQualityScore = Math.round((bestRQS / 100) * 40);

    // 2. SECOND BEST PROJECT — 15 Points Max
    const secondBestProjectScore = Math.round((secondRQS / 100) * 15);

    // 3. THIRD BEST PROJECT — 10 Points Max
    const thirdBestProjectScore = Math.round((thirdRQS / 100) * 10);

    // 4. ENGINEERING BREADTH — 10 Points Max
    const validFE = verifiedProjects.some(r => r.hasFE);
    const validBE = verifiedProjects.some(r => r.hasBE);
    const validDB = verifiedProjects.some(r => r.hasDB);
    let engineeringBreadthScore = (validFE ? 3 : 0) + (validBE ? 4 : 0) + (validDB ? 3 : 0);

    // 5. ENGINEERING PRACTICES — 10 Points Max
    const validCiCd = verifiedProjects.some(r => r.hasCiCd);
    const validDocker = verifiedProjects.some(r => r.evidenceList.some(e => e.includes("Docker")));
    let engineeringPracticesScore = (validCiCd ? 6 : 0) + (validDocker ? 4 : 0);

    // 6. TESTING / CI / DEPLOYMENT — 5 Points Max
    const validTest = verifiedProjects.some(r => r.hasTest);
    const validPages = verifiedProjects.some(r => r.hasPages);
    let testingCIDeployScore = validTest ? 5 : (validPages ? 3 : 0);

    // 7. DOCUMENTATION — 5 Points Max
    const validReadmeCount = verifiedProjects.filter(r => r.hasReadme).length;
    let documentationScore = Math.min(5, (validReadmeCount >= 2 ? 3 : validReadmeCount === 1 ? 2 : 0) + (userData.bio ? 2 : 0));

    // 8. MAINTENANCE / CONSISTENCY — 5 Points Max (Max 5 points limit)
    const daysSinceUpdate = proj1?.updatedAt
      ? Math.floor((now - new Date(allRepos[0]?.updated_at || now).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    let maintenanceScore = daysSinceUpdate <= 30 ? 5 : daysSinceUpdate <= 90 ? 3 : 1;

    let rawProfileScore = bestProjectQualityScore + secondBestProjectScore + thirdBestProjectScore + engineeringBreadthScore + engineeringPracticesScore + testingCIDeployScore + documentationScore + maintenanceScore;

    // ── STEP 7: MANDATORY SCORE CAPS ──
    const appliedScoreCaps: string[] = [];

    if (verifiedProjects.length === 0) {
      rawProfileScore = Math.min(25, rawProfileScore);
      appliedScoreCaps.push("0 Verified Projects -> Max 25");
    }
    if (substantialProjects.length === 0) {
      rawProfileScore = Math.min(49, rawProfileScore);
      appliedScoreCaps.push("0 Substantial Projects (RQS < 65) -> Max 49");
    } else if (substantialProjects.length === 1 && bestRQS < 80) {
      rawProfileScore = Math.min(69, rawProfileScore);
      appliedScoreCaps.push("Exactly 1 Substantial Project (RQS < 80) -> Max 69");
    }
    if (bestRQS < 80) {
      rawProfileScore = Math.min(79, rawProfileScore);
      appliedScoreCaps.push("No project with RQS >= 80 -> Max 79");
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
        max: 40,
        evidence: proj1
          ? [`Best project "${proj1.name}" RQS: ${bestRQS}/100 -> +${bestProjectQualityScore}/40 pts`]
          : ["No verified project found"],
      },
      otherVerifiedProjects: {
        score: secondBestProjectScore + thirdBestProjectScore,
        max: 25,
        evidence: [
          proj2 ? `2nd Best "${proj2.name}" RQS: ${secondRQS}/100 -> +${secondBestProjectScore}/15 pts` : "No 2nd verified project",
          proj3 ? `3rd Best "${proj3.name}" RQS: ${thirdRQS}/100 -> +${thirdBestProjectScore}/10 pts` : "No 3rd verified project",
        ],
      },
      engineeringDepth: {
        score: engineeringBreadthScore,
        max: 10,
        evidence: [
          validFE ? "✓ Verified Frontend UI (+3 pts)" : "✗ No verified Frontend codebase",
          validBE ? "✓ Verified Backend Service (+4 pts)" : "✗ No verified Backend service",
          validDB ? "✓ Verified Database Persistence (+3 pts)" : "✗ No verified Database integration",
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
        evidence: [`${validReadmeCount} verified projects with README (+${documentationScore}/5 pts)`],
      },
      testingCI: {
        score: testingCIDeployScore,
        max: 5,
        evidence: [validTest ? "✓ Automated Testing suite (+5 pts)" : validPages ? "✓ Live URL (+3 pts)" : "✗ No test/deploy evidence"],
      },
      projectDiversity: {
        score: 0,
        max: 0,
        evidence: ["Merged into Engineering Breadth"],
      },
      maintenance: {
        score: maintenanceScore,
        max: 5,
        evidence: [`Last active ${daysSinceUpdate <= 30 ? "within 30 days" : `${daysSinceUpdate} days ago`} (+${maintenanceScore}/5 pts)`],
      },
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
      evidenceExcludedRepos: hardExcludedRepos.length,
      notDeepAuditedRepos: notDeepAuditedRepos.length,
      excludedRepos: hardExcludedRepos.length,
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
      disclaimer: "This assessment is based strictly on publicly accessible GitHub code evidence. Repositories outside deep audit budget are marked 'Not Deep Audited' rather than excluded.",
      analysisCoverage: `${deepAuditedRepos.length} candidate repositories deep-audited from ${allRepos.length} public repositories scanned`,
      deepAnalysisInfo: `${deepAuditedRepos.length} candidate repositories inspected deeply`,
    };

    const separateMetrics: SeparateQualityMetrics = {
      bestProjectQuality: bestRQS,
      portfolioDepth: Math.min(100, meaningfulCount * 35),
      engineeringQuality: Math.round(((engineeringPracticesScore + testingCIDeployScore) / 15) * 100),
      technicalBreadth: Math.round((engineeringBreadthScore / 10) * 100),
      maintenance: Math.round((maintenanceScore / 5) * 100),
    };

    const scoreStrengths: string[] = [];
    const scoreNeedsImp: string[] = [];

    if (proj1 && proj1.isMeaningful) scoreStrengths.push(`Flagship project "${proj1.name}" verified with RQS ${bestRQS}/100 (${proj1.projectQualityBreakdown.qualityTier})`);
    if (validFE && validBE) scoreStrengths.push("Verified full-stack implementation evidence (Frontend UI + Backend Service)");
    if (validCiCd || validTest) scoreStrengths.push("Verified engineering practices (Automated Testing / CI-CD / Docker)");

    if (verifiedProjects.length === 0) scoreNeedsImp.push("No verified substantial or valid software projects found");
    else if (substantialProjects.length === 0) scoreNeedsImp.push("No flagship project with RQS >= 65 discovered");
    if (!validTest) scoreNeedsImp.push("No automated unit testing suite detected in public repositories");

    const totalStars = classifiedRepos.reduce((acc, r) => acc + r.stars, 0);

    // ── STEP 15: BADGES SYSTEM REQUIRING CODE EVIDENCE ──
    const feProjects = verifiedProjects.filter(r => r.hasFE);
    const feBadge: DeveloperBadge = {
      id: "frontend-developer",
      name: "Frontend Developer",
      description: "Build & publish valid frontend web applications",
      icon: "⚛️",
      unlocked: feProjects.length > 0,
      glowColor: "rgba(56,189,248,0.6)",
      evidenceList: feProjects.length > 0
        ? feProjects.map(r => `• ${r.name}: Verified frontend UI code (RQS: ${r.rqs}/100)`)
        : ["No verified frontend application project detected."],
      unlockReason: feProjects.length > 0
        ? "Verified frontend application implementation in public repositories."
        : "Requires at least one verified frontend project.",
      requirementsChecklist: [
        { text: "Frontend framework / JS/TS codebase detected", satisfied: validFE },
        { text: "Verified project (RQS >= 45)", satisfied: feProjects.length > 0 },
      ],
    };

    const beProjects = verifiedProjects.filter(r => r.hasBE);
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
        ? "Valid backend/server implementation verified."
        : "Requires a backend API server (Node, Python, Go, Java, etc.).",
      requirementsChecklist: [
        { text: "Backend framework / API server implementation", satisfied: validBE },
        { text: "Verified project (RQS >= 45)", satisfied: beProjects.length > 0 },
      ],
    };

    const fullStackProjects = verifiedProjects.filter(r => r.hasFE && r.hasBE);
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
        ? "Verified full-stack project combining frontend UI and backend API detected."
        : "Requires at least one single project containing BOTH frontend and backend.",
      requirementsChecklist: [
        { text: "Frontend codebase detected", satisfied: validFE },
        { text: "Backend codebase detected", satisfied: validBE },
        { text: "Single repository combines FE + BE", satisfied: fullStackProjects.length > 0 },
      ],
    };

    const dbProjects = verifiedProjects.filter(r => r.hasDB);
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
        { text: "Verified project (RQS >= 45)", satisfied: dbProjects.length > 0 },
      ],
    };

    const aiProjects = verifiedProjects.filter(r => (r.name.toLowerCase().includes("tensor") || r.name.toLowerCase().includes("ai") || r.name.toLowerCase().includes("ml") || r.topics.includes("ai")));
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

    const apiProjects = verifiedProjects.filter(r => r.hasBE || r.name.toLowerCase().includes("api"));
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
        { text: "Verified API service architecture", satisfied: apiProjects.length > 0 },
      ],
    };

    const deployProjects = verifiedProjects.filter(r => r.hasPages || r.hasCiCd);
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
        { text: "Live web application homepage URL", satisfied: verifiedProjects.some(r => r.hasPages) },
        { text: "Docker / GitHub Actions pipeline", satisfied: validCiCd },
      ],
    };

    const docBadge: DeveloperBadge = {
      id: "documentation-pro",
      name: "Documentation Pro",
      description: "Maintain comprehensive README documentation across repositories",
      icon: "📚",
      unlocked: validReadmeCount >= 2 && verifiedProjects.length >= 1,
      glowColor: "rgba(16,185,129,0.6)",
      evidenceList: validReadmeCount >= 2
        ? verifiedProjects.filter(r => r.hasReadme).map(r => `• ${r.name}: Complete README documentation verified`)
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
      unlocked: totalStars >= 25 && verifiedProjects.length >= 2,
      glowColor: "rgba(245,158,11,0.6)",
      evidenceList: totalStars >= 25
        ? [`• ${totalStars} total community stars across original repositories`, `• ${verifiedProjects.length} published verified repositories`]
        : ["No public collaboration or community star recognition yet."],
      unlockReason: totalStars >= 25
        ? "Verified open source publications with community recognition."
        : "Requires publishing verified original repositories with community stars.",
      requirementsChecklist: [
        { text: "Published original open source projects", satisfied: verifiedProjects.length >= 2 },
        { text: "Community stargazers or PR contributions", satisfied: totalStars >= 25 },
      ],
    };

    const preUnlocked = [feBadge, beBadge, fullStackBadge, dbBadge, aiBadge, apiBadge, deployBadge, docBadge, collabBadge].filter(b => b.unlocked).length;
    const eliteBadge: DeveloperBadge = {
      id: "elite-builder",
      name: "Elite Builder",
      description: "Master level developer profile demonstrating top-tier software engineering",
      icon: "👑",
      unlocked: finalDevScore >= 90 && bestRQS >= 80 && preUnlocked >= 3,
      glowColor: "rgba(250,204,21,0.8)",
      evidenceList: finalDevScore >= 90
        ? [`• Developer Score: ${finalDevScore}/100 (Required: >= 90)`, `• Best Project RQS: ${bestRQS}/100 (Required: >= 80)`]
        : [`• Current Developer Score: ${finalDevScore}/100 (Required: >= 90)`, `• Best Project RQS: ${bestRQS}/100 (Required: >= 80)`],
      unlockReason: finalDevScore >= 90
        ? "Elite engineering portfolio status achieved with top-tier project quality and score >= 90."
        : "Requires Developer Score >= 90, Flagship Project RQS >= 80, and at least 3 other unlocked badges.",
      requirementsChecklist: [
        { text: "Developer Score >= 90", satisfied: finalDevScore >= 90 },
        { text: "Flagship Project RQS >= 80", satisfied: bestRQS >= 80 },
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
      category: validFE && validBE ? "Full Stack Engineer" : "Software Developer",
      scoreBreakdown,
      transparencyAudit,
      scoreExplanation: {
        strengths: scoreStrengths,
        needsImprovement: scoreNeedsImp,
      },
      skillsBreakdown: {
        frontend: validFE ? 80 : 0,
        backend: validBE ? 80 : 0,
        database: validDB ? 75 : 0,
        devOps: validCiCd ? 70 : 0,
        testing: validTest ? 70 : 0,
        documentation: validReadmeCount > 0 ? 65 : 0,
      },
      skillsConfidence: {},
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
    console.log(`HARD EXCLUDED WITH EVIDENCE: ${hardExcludedRepos.length}`);
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
