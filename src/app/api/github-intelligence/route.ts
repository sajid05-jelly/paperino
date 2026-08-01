import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES (Evidence-Based Engine V4)
// ─────────────────────────────────────────────────────────────

export interface GitHubRepoInfo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  url: string;
  hasReadme?: boolean;
  topics?: string[];
  selectionReason?: string;
  repoCategory?: string;
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

export interface SkillConfidenceItem {
  score: number; // 0-100 or 0 if insufficient
  confidence: "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE" | "INSUFFICIENT EVIDENCE";
  evidence: string[];
  reason: string;
}

export interface CategoryScoreItem {
  score: number; // Awarded score
  max: number; // Category max
  evidence: string[]; // Exact evidence list responsible for points
}

export interface CategoryScoreBreakdown {
  projectQuality: CategoryScoreItem; // /25
  documentation: CategoryScoreItem; // /15
  developmentActivity: CategoryScoreItem; // /15
  technicalDepth: CategoryScoreItem; // /15
  portfolioQuality: CategoryScoreItem; // /10
  engineeringPractices: CategoryScoreItem; // /10
  communityImpact: CategoryScoreItem; // /5
  technologyBreadth: CategoryScoreItem; // /5
}

export interface RepoAnalysisAudit {
  totalPublicRepos: number;
  reposActuallyInspected: number;
  originalRepos: number;
  forks: number;
  archivedRepos: number;
  profileConfigRepos: number;
  minimalRepos: number;
  learningTutorialRepos: number;
  assignments: number;
  substantialProjects: number;
  reposWithMeaningfulReadme: number;
  reposWithTests: number;
  reposWithCiCd: number;
  reposWithDeploymentEvidence: number;
  reposWithBackendEvidence: number;
  reposWithDatabaseEvidence: number;
  reposWithFrontendEvidence: number;
}

export interface DeveloperMetrics {
  score: number; // 0 - 100
  level: string;
  levelNum: number;
  xpCurrent: number;
  xpMax: number;
  xpPercentage: number;
  nextLevelRequirements: string[];
  nextRewardBadge: string;
  stars: string;
  rankPercentile: number | null; // null if no real dataset comparison available
  category: string;
  scoreBreakdown: CategoryScoreBreakdown;
  repoAudit: RepoAnalysisAudit;
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
  bestProjects: GitHubRepoInfo[];
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

// Technology rules for detecting from file names, descriptions, topics, language
const TECH_RULES: { name: string; category: "frontend" | "backend" | "database" | "aiMl" | "devOps" | "cloud" | "testing" | "uiUx"; matchers: (string | RegExp)[] }[] = [
  { name: "TypeScript", category: "frontend", matchers: ["typescript", "ts"] },
  { name: "JavaScript", category: "frontend", matchers: ["javascript", "js"] },
  { name: "React", category: "frontend", matchers: ["react", "reactjs", "jsx", "tsx"] },
  { name: "Next.js", category: "frontend", matchers: ["nextjs", "next.js", "next"] },
  { name: "HTML", category: "frontend", matchers: ["html", "html5"] },
  { name: "CSS", category: "frontend", matchers: ["css", "css3"] },
  { name: "Tailwind CSS", category: "uiUx", matchers: ["tailwind", "tailwindcss"] },
  { name: "Bootstrap", category: "uiUx", matchers: ["bootstrap"] },
  { name: "Figma", category: "uiUx", matchers: ["figma"] },
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

    // ── 1. Fetch User Data ──
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

    // ── 2. Fetch Public Repositories (Up to 100) ──
    const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, {
      headers: {
        "User-Agent": "Paperino-CareerDNA-App",
        "Accept": "application/vnd.github.v3+json",
      },
      next: { revalidate: 0 },
    });

    const reposData = reposRes.ok ? await reposRes.json() : [];
    const allRepos: any[] = Array.isArray(reposData) ? reposData : [];

    // ── 3. STRICT REPOSITORY DEEP EVIDENCE CLASSIFICATION ──
    let originalRepos = 0;
    let forks = 0;
    let archivedRepos = 0;
    let profileConfigRepos = 0;
    let minimalRepos = 0;
    let learningTutorialRepos = 0;
    let assignments = 0;
    let substantialProjects = 0;

    let reposWithMeaningfulReadme = 0;
    let reposWithTests = 0;
    let reposWithCiCd = 0;
    let reposWithDeploymentEvidence = 0;
    let reposWithBackendEvidence = 0;
    let reposWithDatabaseEvidence = 0;
    let reposWithFrontendEvidence = 0;

    const analyzedRepos = allRepos.map(repo => {
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

      if (isFork) {
        forks++;
      } else {
        originalRepos++;
        if (hasReadme) reposWithMeaningfulReadme++;
        if (hasTest) reposWithTests++;
        if (hasCiCd) reposWithCiCd++;
        if (hasPages) reposWithDeploymentEvidence++;
        if (hasFE) reposWithFrontendEvidence++;
        if (hasBE) reposWithBackendEvidence++;
        if (hasDB) reposWithDatabaseEvidence++;
      }

      let repoCategory = "NORMAL PROJECT";
      if (isFork) {
        repoCategory = "FORK";
      } else if (isProfileRepo) {
        repoCategory = "PROFILE REPOSITORY";
        profileConfigRepos++;
      } else if (isArchived) {
        repoCategory = "ARCHIVED REPOSITORY";
        archivedRepos++;
      } else if (sizeKB < 15 && !hasDescription && stars < 5) {
        repoCategory = "MINIMAL/EMPTY REPOSITORY";
        minimalRepos++;
      } else if (corpus.includes("assignment") || corpus.includes("homework") || corpus.includes("lab")) {
        repoCategory = "ASSIGNMENT";
        assignments++;
      } else if (corpus.includes("awesome") || corpus.includes("tutorial") || corpus.includes("course") || corpus.includes("sample") || corpus.includes("example") || corpus.includes("practice")) {
        repoCategory = "LEARNING PROJECT";
        learningTutorialRepos++;
      } else if ((stars >= 10 || forksCount >= 5 || hasPages || (sizeKB > 500 && (hasBE || hasFE))) && hasDescription) {
        repoCategory = "SUBSTANTIAL PROJECT";
        substantialProjects++;
      } else {
        repoCategory = "NORMAL PROJECT";
      }

      // Individual Repo Evidence Weight (0 - 100)
      let repoScore = 0;
      if (repoCategory === "SUBSTANTIAL PROJECT") repoScore += 45;
      else if (repoCategory === "NORMAL PROJECT") repoScore += 25;
      else if (repoCategory === "LEARNING PROJECT") repoScore += 10;
      else if (repoCategory === "ASSIGNMENT") repoScore += 5;

      if (hasDescription) repoScore += 15;
      if (hasPages) repoScore += 20;
      if (stars > 0) repoScore += Math.min(15, Math.log10(stars + 1) * 10);
      if (forksCount > 0) repoScore += Math.min(10, Math.log10(forksCount + 1) * 8);

      return {
        ...repo,
        repoCategory,
        repoScore: Math.min(100, Math.round(repoScore)),
        hasDescription,
        hasPages,
        isFork,
        isArchived,
        isProfileRepo,
        hasFE,
        hasBE,
        hasDB,
        hasTest,
        hasCiCd,
        corpus,
      };
    });

    const repoAudit: RepoAnalysisAudit = {
      totalPublicRepos: userData.public_repos || allRepos.length,
      reposActuallyInspected: allRepos.length,
      originalRepos,
      forks,
      archivedRepos,
      profileConfigRepos,
      minimalRepos,
      learningTutorialRepos,
      assignments,
      substantialProjects,
      reposWithMeaningfulReadme,
      reposWithTests,
      reposWithCiCd,
      reposWithDeploymentEvidence,
      reposWithBackendEvidence,
      reposWithDatabaseEvidence,
      reposWithFrontendEvidence,
    };

    // Valid non-fork original projects
    const validProjects = analyzedRepos.filter(
      r => !r.isFork && r.repoCategory !== "PROFILE REPOSITORY" && r.repoCategory !== "MINIMAL/EMPTY REPOSITORY"
    );

    // ── 4. Language & Technology Detection ──
    const languageCounts: Record<string, number> = {};
    const detectedSkillsSet = new Set<string>();
    const techBreakdown: Record<string, number> = {};

    validProjects.forEach(repo => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
        techBreakdown[repo.language] = (techBreakdown[repo.language] || 0) + 1;
        detectedSkillsSet.add(repo.language);
      }

      TECH_RULES.forEach(rule => {
        const isMatched = rule.matchers.some(m => {
          if (m instanceof RegExp) return m.test(repo.corpus);
          return repo.corpus.includes(m.toLowerCase());
        });
        if (isMatched) {
          detectedSkillsSet.add(rule.name);
          techBreakdown[rule.name] = (techBreakdown[rule.name] || 0) + 1;
        }
      });
    });

    if (validProjects.length > 0) {
      detectedSkillsSet.add("Git");
      detectedSkillsSet.add("GitHub");
    }

    const totalLangRepos = Object.values(languageCounts).reduce((a, b) => a + b, 0) || 1;
    const mostUsedLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({
        language,
        count,
        percentage: Math.round((count / totalLangRepos) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ── 5. Select Best Top Projects ──
    const sortedBestRepos = [...validProjects].sort((a, b) => b.repoScore - a.repoScore);

    const bestProjects: GitHubRepoInfo[] = sortedBestRepos.slice(0, 3).map(r => {
      let selectionReason = `Selected as a ${r.repoCategory.toLowerCase()} with verified source code.`;
      if (r.hasPages) {
        selectionReason = "Selected because this repository contains active web implementation with live deployment.";
      } else if (r.stargazers_count > 10) {
        selectionReason = `Selected due to significant community recognition with ${r.stargazers_count} star(s).`;
      } else if (r.hasDescription) {
        selectionReason = "Selected because it provides clear project descriptions and source code setup.";
      }

      return {
        name: r.name,
        description: r.description || null,
        language: r.language || null,
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        updatedAt: r.updated_at ? new Date(r.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recently",
        url: r.html_url,
        hasReadme: true,
        topics: r.topics || [],
        selectionReason,
        repoCategory: r.repoCategory,
      };
    });

    // ── 6. EIGHT WEIGHTED CATEGORIES DEEP EVIDENCE ENGINE (MAX 100 PTS) ──

    // Category A: Project Quality (Max 25 pts)
    const catAEvid: string[] = [];
    let scoreA = 0;
    if (substantialProjects > 0) {
      const pts = Math.min(18, substantialProjects * 6);
      scoreA += pts;
      catAEvid.push(`${substantialProjects} substantial project(s) detected (+${pts} pts)`);
    }
    const normalCount = validProjects.filter(r => r.repoCategory === "NORMAL PROJECT").length;
    if (normalCount > 0) {
      const pts = Math.min(7, normalCount * 2.5);
      scoreA += pts;
      catAEvid.push(`${normalCount} standard original project(s) (+${Math.round(pts)} pts)`);
    }
    if (validProjects.length === 0) {
      catAEvid.push("No substantial or original project repositories found (0 pts)");
    }
    scoreA = Math.min(25, Math.round(scoreA));

    // Category B: Documentation Quality (Max 15 pts)
    const catBEvid: string[] = [];
    let scoreB = 0;
    if (reposWithMeaningfulReadme > 0) {
      const pts = Math.min(10, Math.round((reposWithMeaningfulReadme / (validProjects.length || 1)) * 10));
      scoreB += pts;
      catBEvid.push(`${reposWithMeaningfulReadme}/${validProjects.length} repos have project descriptions (+${pts} pts)`);
    }
    if (userData.bio) {
      scoreB += 3;
      catBEvid.push("Profile bio configured (+3 pts)");
    }
    if (bestProjects.some(p => p.description)) {
      scoreB += 2;
      catBEvid.push("Featured showcase projects documented (+2 pts)");
    }
    if (scoreB === 0) catBEvid.push("No project documentation or bio provided (0 pts)");
    scoreB = Math.min(15, Math.round(scoreB));

    // Category C: Development Activity (Max 15 pts)
    const catCEvid: string[] = [];
    let scoreC = 0;
    const daysSinceUpdate = validProjects[0]?.updated_at
      ? Math.floor((now - new Date(validProjects[0].updated_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceUpdate <= 7) {
      scoreC = 15;
      catCEvid.push("Code updated within last 7 days (+15 pts)");
    } else if (daysSinceUpdate <= 30) {
      scoreC = 11;
      catCEvid.push("Code updated within last 30 days (+11 pts)");
    } else if (daysSinceUpdate <= 90) {
      scoreC = 6;
      catCEvid.push("Code updated within last 90 days (+6 pts)");
    } else if (daysSinceUpdate <= 180) {
      scoreC = 3;
      catCEvid.push("Code updated within last 180 days (+3 pts)");
    } else {
      catCEvid.push("No recent development activity detected (0 pts)");
    }

    // Category D: Technical Depth (Max 15 pts)
    const catDEvid: string[] = [];
    let scoreD = 0;
    const verifiedFE = reposWithFrontendEvidence > 0;
    const verifiedBE = reposWithBackendEvidence > 0;
    const verifiedDB = reposWithDatabaseEvidence > 0;
    const verifiedDevOps = reposWithCiCd > 0;
    const verifiedTesting = reposWithTests > 0;

    if (verifiedFE) { scoreD += 4; catDEvid.push(`Frontend code detected in ${reposWithFrontendEvidence} repo(s) (+4 pts)`); }
    if (verifiedBE) { scoreD += 4; catDEvid.push(`Backend server logic detected in ${reposWithBackendEvidence} repo(s) (+4 pts)`); }
    if (verifiedDB) { scoreD += 3; catDEvid.push(`Database integration detected in ${reposWithDatabaseEvidence} repo(s) (+3 pts)`); }
    if (verifiedDevOps) { scoreD += 3; catDEvid.push(`CI/CD or Docker configuration detected (+3 pts)`); }
    if (verifiedTesting) { scoreD += 1; catDEvid.push(`Automated software test files detected (+1 pt)`); }
    if (scoreD === 0) catDEvid.push("No verified technical depth evidence found (0 pts)");
    scoreD = Math.min(15, Math.round(scoreD));

    // Category E: Portfolio Quality (Max 10 pts)
    const catEEvid: string[] = [];
    let scoreE = 0;
    if (userData.blog) { scoreE += 4; catEEvid.push(`Linked portfolio website: ${userData.blog} (+4 pts)`); }
    if (userData.bio) { scoreE += 3; catEEvid.push("Professional GitHub bio present (+3 pts)"); }
    if (reposWithDeploymentEvidence > 0) { scoreE += 3; catEEvid.push(`${reposWithDeploymentEvidence} live web deployment(s) verified (+3 pts)`); }
    if (scoreE === 0) catEEvid.push("No portfolio website or live deployment links (0 pts)");
    scoreE = Math.min(10, Math.round(scoreE));

    // Category F: Engineering Practices (Max 10 pts)
    const catFEvid: string[] = [];
    let scoreF = 0;
    const descRatio = validProjects.length > 0 ? reposWithMeaningfulReadme / validProjects.length : 0;
    if (verifiedDevOps) { scoreF += 4; catFEvid.push("CI/CD workflows or Docker container setup (+4 pts)"); }
    if (verifiedTesting) { scoreF += 3; catFEvid.push("Automated unit/integration testing (+3 pts)"); }
    if (descRatio >= 0.5 && validProjects.length >= 2) { scoreF += 3; catFEvid.push("Consistent README & documentation practices (+3 pts)"); }
    if (scoreF === 0) catFEvid.push("No automated tests, CI/CD, or deployment configuration (0 pts)");
    scoreF = Math.min(10, Math.round(scoreF));

    // Category G: Community Impact (Max 5 pts)
    const catGEvid: string[] = [];
    let scoreG = 0;
    const totalStars = validProjects.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
    const totalForks = validProjects.reduce((acc, r) => acc + (r.forks_count || 0), 0);

    if (totalStars >= 1000) { scoreG += 3.5; catGEvid.push(`Significant stars: ${totalStars} total (+3.5 pts)`); }
    else if (totalStars >= 50) { scoreG += 2.5; catGEvid.push(`Community stars: ${totalStars} total (+2.5 pts)`); }
    else if (totalStars > 0) { scoreG += 1; catGEvid.push(`Recognized with ${totalStars} star(s) (+1 pt)`); }

    if (totalForks >= 100) { scoreG += 1.5; catGEvid.push(`Extensive forks: ${totalForks} total (+1.5 pts)`); }
    else if (totalForks > 0) { scoreG += 0.5; catGEvid.push(`Community forks: ${totalForks} total (+0.5 pt)`); }

    if (scoreG === 0) catGEvid.push("No community stars or forks on original repos (0 pts)");
    scoreG = Math.min(5, Math.round(scoreG * 10) / 10);

    // Category H: Technology Breadth (Max 5 pts)
    const catHEvid: string[] = [];
    let scoreH = Math.min(5, Math.floor(detectedSkillsSet.size / 2));
    catHEvid.push(`${detectedSkillsSet.size} verified tech stack(s) detected (+${scoreH} pts)`);

    // FINAL CALCULATED EVIDENCE DEVELOPER SCORE
    const scoreBreakdown: CategoryScoreBreakdown = {
      projectQuality: { score: scoreA, max: 25, evidence: catAEvid },
      documentation: { score: scoreB, max: 15, evidence: catBEvid },
      developmentActivity: { score: scoreC, max: 15, evidence: catCEvid },
      technicalDepth: { score: scoreD, max: 15, evidence: catDEvid },
      portfolioQuality: { score: scoreE, max: 10, evidence: catEEvid },
      engineeringPractices: { score: scoreF, max: 10, evidence: catFEvid },
      communityImpact: { score: Math.round(scoreG), max: 5, evidence: catGEvid },
      technologyBreadth: { score: scoreH, max: 5, evidence: catHEvid },
    };

    const devScore = Math.min(100, Math.max(0, Math.round(scoreA + scoreB + scoreC + scoreD + scoreE + scoreF + scoreG + scoreH)));

    // ── PRINT FULL DEEP SCORING AUDIT IN CONSOLE ──
    console.log("==================================================");
    console.log(`GITHUB INTELLIGENCE SCORING AUDIT V4 FOR @${username}`);
    console.log("==================================================");
    console.log(`• Total Public Repos: ${userData.public_repos || allRepos.length}`);
    console.log(`• Repos Actually Inspected: ${allRepos.length}`);
    console.log(`• Original Repos: ${originalRepos} | Forks: ${forks} | Archived: ${archivedRepos}`);
    console.log(`• Substantial Projects: ${substantialProjects} | Minimal: ${minimalRepos} | Tutorials: ${learningTutorialRepos}`);
    console.log(`• Repos w/ README: ${reposWithMeaningfulReadme} | Tests: ${reposWithTests} | CI/CD: ${reposWithCiCd} | Deployments: ${reposWithDeploymentEvidence}`);
    console.log(`• Repos w/ FE: ${reposWithFrontendEvidence} | BE: ${reposWithBackendEvidence} | DB: ${reposWithDatabaseEvidence}`);
    console.log("--------------------------------------------------");
    console.log(`1. Project Quality      : ${scoreA}/25 -> ${catAEvid.join(", ")}`);
    console.log(`2. Documentation        : ${scoreB}/15 -> ${catBEvid.join(", ")}`);
    console.log(`3. Development Activity : ${scoreC}/15 -> ${catCEvid.join(", ")}`);
    console.log(`4. Technical Depth      : ${scoreD}/15 -> ${catDEvid.join(", ")}`);
    console.log(`5. Portfolio Quality    : ${scoreE}/10 -> ${catEEvid.join(", ")}`);
    console.log(`6. Engineering Practices: ${scoreF}/10 -> ${catFEvid.join(", ")}`);
    console.log(`7. Community Impact     : ${scoreG}/5 -> ${catGEvid.join(", ")}`);
    console.log(`8. Technology Breadth   : ${scoreH}/5 -> ${catHEvid.join(", ")}`);
    console.log("--------------------------------------------------");
    console.log(`FINAL EVIDENCE DEVELOPER SCORE: ${devScore}/100`);
    console.log("==================================================");

    // ── 7. CONFIDENCE-BASED SKILL DETECTION ──
    const getConfidence = (hasEvidence: boolean, repoCount: number, explicitTag: boolean): SkillConfidenceItem => {
      if (!hasEvidence && !explicitTag) {
        return {
          score: 0,
          confidence: "INSUFFICIENT EVIDENCE",
          evidence: [],
          reason: "No code implementation or dependency detected in public repositories.",
        };
      }
      if (repoCount >= 2 && explicitTag) {
        return {
          score: Math.min(95, 60 + repoCount * 8),
          confidence: "HIGH CONFIDENCE",
          evidence: ["Explicit codebase files", "Multiple project implementations"],
          reason: "Verified through multiple repository source codes.",
        };
      }
      if (explicitTag || hasEvidence) {
        return {
          score: Math.min(75, 45 + repoCount * 10),
          confidence: "MEDIUM CONFIDENCE",
          evidence: ["Repository language or framework tags"],
          reason: "Detected from repository structure.",
        };
      }
      return {
        score: 35,
        confidence: "LOW CONFIDENCE",
        evidence: ["Basic repository keywords"],
        reason: "Limited evidence found in repository metadata.",
      };
    };

    const feConf = getConfidence(verifiedFE, reposWithFrontendEvidence, detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js"));
    const beConf = getConfidence(verifiedBE, reposWithBackendEvidence, detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Express") || detectedSkillsSet.has("Python") || detectedSkillsSet.has("Go"));
    const dbConf = getConfidence(verifiedDB, reposWithDatabaseEvidence, detectedSkillsSet.has("MongoDB") || detectedSkillsSet.has("MySQL") || detectedSkillsSet.has("PostgreSQL") || detectedSkillsSet.has("Firebase"));
    const aiConf = getConfidence(detectedSkillsSet.has("TensorFlow"), validProjects.filter(r => r.corpus.includes("machine") || r.corpus.includes("tensor")).length, detectedSkillsSet.has("TensorFlow"));
    const devOpsConf = getConfidence(verifiedDevOps, validProjects.filter(r => r.hasCiCd).length, detectedSkillsSet.has("Docker") || detectedSkillsSet.has("GitHub Workflows") || detectedSkillsSet.has("Nix / SaltStack"));
    const cloudConf = getConfidence(detectedSkillsSet.has("Firebase") || reposWithDeploymentEvidence > 0, reposWithDeploymentEvidence, detectedSkillsSet.has("Firebase"));
    const psConf = getConfidence(substantialProjects >= 1, substantialProjects, substantialProjects >= 2);
    const docConf = getConfidence(reposWithMeaningfulReadme > 0, reposWithMeaningfulReadme, descRatio >= 0.5);
    const uiUxConf = getConfidence(detectedSkillsSet.has("Tailwind CSS") || detectedSkillsSet.has("Figma"), validProjects.filter(r => r.corpus.includes("css") || r.corpus.includes("tailwind")).length, detectedSkillsSet.has("Tailwind CSS"));
    const testConf = getConfidence(verifiedTesting, reposWithTests, verifiedTesting);

    // ── 8. STRICT NON-INFLATED CAREER LABELING & READINESS ──
    // "Strong Full Stack Developer" CAN ONLY BE DISPLAYED IF VERIFIED EVIDENCE FOR ALL 5 MAJOR REQUIREMENTS:
    const isFullStackVerified = verifiedFE && verifiedBE && (verifiedDB || reposWithBackendEvidence >= 2) && substantialProjects >= 1;

    let devLevel = "Developing Profile";
    let devCategory = "Software Developer";

    if (devScore >= 90) {
      devLevel = isFullStackVerified ? "Master Full Stack Architect" : "Exceptional Systems Architect";
      devCategory = "Senior Software Architect";
    } else if (devScore >= 70) {
      devLevel = isFullStackVerified ? "Strong Full Stack Developer" : verifiedBE ? "Backend Systems Specialist" : verifiedFE ? "Frontend Specialist" : "Software Engineer";
      devCategory = isFullStackVerified ? "Full Stack Engineer" : "Software Developer";
    } else if (devScore >= 45) {
      devLevel = isFullStackVerified ? "Junior Full Stack Developer" : "Good Foundation Developer";
      devCategory = "Junior Developer";
    } else {
      devLevel = "Developing Profile";
      devCategory = "Building Developer";
    }

    // Star rating mathematically derived from score
    let devStars = "☆☆☆☆☆";
    if (devScore >= 85) devStars = "★★★★★";
    else if (devScore >= 70) devStars = "★★★★☆";
    else if (devScore >= 50) devStars = "★★★☆☆";
    else if (devScore >= 30) devStars = "★★☆☆☆";
    else if (devScore >= 15) devStars = "★☆☆☆☆";

    // Readiness Status
    let readinessStatus = "BUILDING FOUNDATIONS";
    if (isFullStackVerified && reposWithDeploymentEvidence > 0) {
      readinessStatus = "STRONG INTERNSHIP PROFILE";
    } else if (isFullStackVerified) {
      readinessStatus = "INTERNSHIP READY";
    } else if (verifiedFE || verifiedBE) {
      readinessStatus = "INTERNSHIP PREPARATION";
    } else if (validProjects.length >= 1) {
      readinessStatus = "DEVELOPING PORTFOLIO";
    }

    const startupLevel = isFullStackVerified ? "Strong" : validProjects.length >= 1 ? "Moderate" : "Developing";
    const enterpriseLevel = verifiedDevOps && verifiedTesting ? "Strong" : verifiedDevOps ? "Moderate" : "Needs Evidence";
    const freelancerLevel = verifiedFE && userData.blog ? "Strong" : verifiedFE ? "Moderate" : "Developing";

    const developerPersonality: DeveloperPersonality = {
      archetype: isFullStackVerified ? "Full Stack Creator" : verifiedBE ? "Backend Systems Engineer" : verifiedFE ? "Frontend Developer" : "Software Developer",
      title: devCategory,
      bestCareerPath: isFullStackVerified ? "Full Stack Software Engineering" : verifiedBE ? "Backend / Systems Engineering" : "Software Development",
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
        validProjects.length >= 2
          ? "You focus on building practical applications and publishing code to GitHub."
          : "You are currently building your foundational repository portfolio.",
        verifiedBE
          ? "You demonstrate clear backend server logic evidence in your repositories."
          : "Backend REST API implementation is an area to develop.",
      ],
    };

    // ── 9. DEVELOPER JOURNEY ──
    const timeline: DeveloperTimelineMilestone[] = [];
    timeline.push({
      title: "Joined GitHub",
      subtitle: `Created @${userData.login} account`,
      date: userData.created_at ? new Date(userData.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Start",
      icon: "🎉",
      badgeText: "Account Created",
    });

    const oldestRepo = [...validProjects].sort((a, b) => new Date(a.created_at || a.updated_at).getTime() - new Date(b.created_at || b.updated_at).getTime())[0];
    if (oldestRepo) {
      timeline.push({
        title: "First Original Repository",
        subtitle: `Published "${oldestRepo.name}"`,
        date: oldestRepo.created_at ? new Date(oldestRepo.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Early Milestone",
        icon: "🚀",
        badgeText: "First Project",
      });
    }

    timeline.push({
      title: `Current Level: ${devLevel}`,
      subtitle: `Analyzed ${validProjects.length} original project(s) & ${detectedSkillsSet.size} verified tech stack(s)`,
      date: "Present",
      icon: "🏆",
      badgeText: "Current Level",
    });

    const growth: ProjectGrowthMetrics = {
      reposCreatedCount: allRepos.length,
      technologiesLearnedCount: detectedSkillsSet.size,
      activityTrend: daysSinceUpdate <= 30 ? "Active Development 📈" : "Steady Profile 🏗️",
      mostProductiveMonth: validProjects[0]?.updated_at ? new Date(validProjects[0].updated_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Recent Months",
      latestProject: validProjects[0] ? { name: validProjects[0].name, url: validProjects[0].html_url, date: new Date(validProjects[0].updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) } : null,
      mostSuccessfulProject: sortedBestRepos[0] ? { name: sortedBestRepos[0].name, url: sortedBestRepos[0].html_url, stars: sortedBestRepos[0].stargazers_count || 0 } : null,
    };

    // Explanations for Score
    const scoreStrengths: string[] = [];
    const scoreNeedsImp: string[] = [];

    if (substantialProjects > 0) scoreStrengths.push(`${substantialProjects} substantial original project(s) verified`);
    if (detectedSkillsSet.size > 0) scoreStrengths.push(`${detectedSkillsSet.size} verified technology stack(s) detected in codebase`);
    if (daysSinceUpdate <= 30) scoreStrengths.push("Active repository updates within the last 30 days");
    if (verifiedDevOps) scoreStrengths.push("DevOps or configuration automation files detected (Docker/CI/CD)");

    if (!reposWithMeaningfulReadme) scoreNeedsImp.push("Repositories lack detailed README documentation and setup instructions");
    if (!userData.blog) scoreNeedsImp.push("No portfolio website linked to GitHub profile");
    if (!reposWithDeploymentEvidence) scoreNeedsImp.push("No visible live web deployments detected");
    if (!verifiedTesting) scoreNeedsImp.push("No automated software testing frameworks detected");
    if (forks > originalRepos) scoreNeedsImp.push("High proportion of forked repositories compared to original projects");

    // XP System DERIVED STRICTLY FROM FINAL EVIDENCE SCORE
    const totalXP = devScore * 10;
    const levelNum = Math.max(1, Math.floor(devScore / 10) + 1);
    const xpCurrent = Math.round(totalXP % 100);
    const xpMax = 100;
    const xpPercentage = Math.min(100, Math.round((xpCurrent / xpMax) * 100));

    const nextLevelRequirements: string[] = [];
    if (substantialProjects < 3) nextLevelRequirements.push("+1 Substantial Original Project");
    if (!reposWithMeaningfulReadme) nextLevelRequirements.push("+2 README Improvements");
    if (!reposWithDeploymentEvidence) nextLevelRequirements.push("+1 Live Project Deployment");
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
        unlocked: verifiedFE,
        glowColor: "rgba(168,85,247,0.5)",
      },
      {
        id: "backend-engineer",
        name: "Backend Engineer",
        description: "Created robust backend API servers and logic",
        icon: "⚙️",
        unlocked: verifiedBE,
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
        unlocked: verifiedDevOps,
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
        unlocked: totalStars >= 50 || validProjects.length >= 2,
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
        unlocked: reposWithMeaningfulReadme >= 2,
        glowColor: "rgba(16,185,129,0.5)",
      },
    ];

    const developerMetrics: DeveloperMetrics = {
      score: devScore,
      level: devLevel,
      levelNum,
      xpCurrent,
      xpMax,
      xpPercentage,
      nextLevelRequirements,
      nextRewardBadge: "Elite Builder Badge",
      stars: devStars,
      rankPercentile: null, // REMOVED percentile ranking because no dataset exists
      category: devCategory,
      scoreBreakdown,
      repoAudit,
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
      bestProjects,
      developerMetrics,
      developerPersonality,
      developerJourney: { timeline, growth },
      recruiterPerspective: {
        recruiterStrengths: scoreStrengths.length > 0 ? scoreStrengths : ["Published code on GitHub"],
        areasToImprove: scoreNeedsImp.length > 0 ? scoreNeedsImp : ["Add README descriptions to all repositories"],
        overallImpression: isFullStackVerified
          ? "Demonstrates verified full stack implementation capabilities across frontend, backend, and project repositories."
          : "Demonstrates practical coding initiative. Building one complete full stack project with live deployment and tests will significantly strengthen recruiter evaluation.",
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
        lastUpdatedRepo: validProjects[0]?.name || null,
        mostActiveLanguage: mostUsedLanguages[0]?.language || null,
        recentActivityStatus: daysSinceUpdate <= 30 ? `Actively updated ${daysSinceUpdate === 0 ? "Today" : `${daysSinceUpdate} days ago`}` : "Limited recent activity",
        isInactive: daysSinceUpdate > 90,
      },
      aiRecommendations: [
        !verifiedBE ? "Build a Node.js/Python backend REST API server." : "Add database persistence using MongoDB or PostgreSQL.",
        !reposWithDeploymentEvidence ? "Deploy web applications live to Vercel/Netlify." : "Write automated unit tests using Jest/Vitest.",
        "Include architecture diagrams and API docs in repository READMEs.",
        "Pin your top 3 best projects on your GitHub profile overview.",
      ],
      cachedAt: new Date().toISOString(),
    };

    cache.set(username, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GitHub Intelligence V4 API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze GitHub profile" }, { status: 500 });
  }
}
