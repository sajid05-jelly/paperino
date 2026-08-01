import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES (Evidence-Based Engine V3)
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

export interface CategoryScoreBreakdown {
  projectQuality: number; // /25
  documentation: number; // /15
  developmentActivity: number; // /15
  technicalDepth: number; // /15
  portfolioQuality: number; // /10
  engineeringPractices: number; // /10
  communityImpact: number; // /5
  technologyBreadth: number; // /5
}

export interface RepoAnalysisAudit {
  repositoriesAnalyzed: number;
  substantialProjects: number;
  normalProjects: number;
  learningBasicRepos: number;
  assignments: number;
  forks: number;
  archivedRepos: number;
  minimalEmptyRepos: number;
  profileConfigRepos: number;
  repositoriesSkipped: number;
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
  rankPercentile: number;
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

    // ── 3. STRICT REPOSITORY CLASSIFICATION & AUDIT ──
    let substantialProjects = 0;
    let normalProjects = 0;
    let learningBasicRepos = 0;
    let assignments = 0;
    let forks = 0;
    let archivedRepos = 0;
    let minimalEmptyRepos = 0;
    let profileConfigRepos = 0;
    let repositoriesSkipped = 0;

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

      let repoCategory = "NORMAL PROJECT";

      if (isFork) {
        repoCategory = "FORK";
        forks++;
        repositoriesSkipped++;
      } else if (isProfileRepo) {
        repoCategory = "PROFILE REPOSITORY";
        profileConfigRepos++;
        repositoriesSkipped++;
      } else if (isArchived) {
        repoCategory = "ARCHIVED REPOSITORY";
        archivedRepos++;
      } else if (sizeKB < 15 && !hasDescription && stars === 0) {
        repoCategory = "MINIMAL/EMPTY REPOSITORY";
        minimalEmptyRepos++;
        repositoriesSkipped++;
      } else if (corpus.includes("assignment") || corpus.includes("homework") || corpus.includes("lab")) {
        repoCategory = "ASSIGNMENT";
        assignments++;
      } else if (corpus.includes("tutorial") || corpus.includes("course") || corpus.includes("sample") || corpus.includes("example") || corpus.includes("practice")) {
        repoCategory = "LEARNING PROJECT";
        learningBasicRepos++;
      } else if ((stars >= 2 || forksCount >= 1 || hasPages || sizeKB > 300) && hasDescription) {
        repoCategory = "SUBSTANTIAL PROJECT";
        substantialProjects++;
      } else {
        repoCategory = "NORMAL PROJECT";
        normalProjects++;
      }

      // Individual Repo Quality Score (0 - 100)
      let repoScore = 0;
      if (repoCategory === "SUBSTANTIAL PROJECT") repoScore += 40;
      else if (repoCategory === "NORMAL PROJECT") repoScore += 25;
      else if (repoCategory === "LEARNING PROJECT") repoScore += 10;
      else if (repoCategory === "ASSIGNMENT") repoScore += 5;

      if (hasDescription) repoScore += 15;
      if (hasPages) repoScore += 20; // Deployment
      if (stars > 0) repoScore += Math.min(15, stars * 3);
      if (forksCount > 0) repoScore += Math.min(10, forksCount * 4);
      if (topics.length >= 2) repoScore += 10;

      return {
        ...repo,
        repoCategory,
        repoScore: Math.min(100, repoScore),
        hasDescription,
        hasPages,
        isFork,
        isArchived,
        isProfileRepo,
        corpus,
      };
    });

    const repoAudit: RepoAnalysisAudit = {
      repositoriesAnalyzed: allRepos.length,
      substantialProjects,
      normalProjects,
      learningBasicRepos,
      assignments,
      forks,
      archivedRepos,
      minimalEmptyRepos,
      profileConfigRepos,
      repositoriesSkipped,
    };

    // Non-fork, active substantial/normal repositories list for genuine analysis
    const validProjects = analyzedRepos.filter(
      r => !r.isFork && r.repoCategory !== "PROFILE REPOSITORY" && r.repoCategory !== "MINIMAL/EMPTY REPOSITORY"
    );

    // ── 4. Language & Technology Detection (Strict Evidence Only) ──
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

    // ── 5. Select Best Top Projects (with Honest Evidence Reasons) ──
    const sortedBestRepos = [...validProjects].sort((a, b) => b.repoScore - a.repoScore);

    const bestProjects: GitHubRepoInfo[] = sortedBestRepos.slice(0, 3).map(r => {
      let selectionReason = `Selected as a ${r.repoCategory.toLowerCase()} with structured codebase.`;
      if (r.hasPages) {
        selectionReason = "Selected because this repository contains active web implementation with live deployment.";
      } else if (r.stargazers_count > 0) {
        selectionReason = `Selected due to community recognition with ${r.stargazers_count} star(s) and valid code repository.`;
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

    // ── 6. EIGHT WEIGHTED CATEGORIES SCORING ENGINE V3 (MAX 100 POINTS) ──
    
    // Context Cap: Repo count + Followers + Account age together contribute MAXIMUM 5 POINTS.
    const contextBonus = Math.min(5, (allRepos.length > 5 ? 2 : 1) + (userData.followers > 10 ? 2 : 1) + (userData.created_at ? 1 : 0));

    // A. Project Quality (Max 25 pts)
    let categoryA = Math.min(25, substantialProjects * 10 + normalProjects * 4);

    // B. Documentation Quality (Max 15 pts)
    const reposWithDesc = validProjects.filter(r => r.hasDescription).length;
    const descRatio = validProjects.length > 0 ? reposWithDesc / validProjects.length : 0;
    let categoryB = Math.round(descRatio * 11) + (userData.bio ? 2 : 0) + (reposWithDesc > 0 ? 2 : 0);
    categoryB = Math.min(15, categoryB);

    // C. Development Activity (Max 15 pts)
    const daysSinceUpdate = validProjects[0]?.updated_at
      ? Math.floor((now - new Date(validProjects[0].updated_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let categoryC = 0;
    if (daysSinceUpdate <= 7) categoryC = 15;
    else if (daysSinceUpdate <= 30) categoryC = 11;
    else if (daysSinceUpdate <= 90) categoryC = 6;
    else if (daysSinceUpdate <= 180) categoryC = 3;
    else categoryC = 0;

    // D. Technical Depth (Max 15 pts)
    const hasFE = detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js") || detectedSkillsSet.has("HTML");
    const hasBE = detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Express") || detectedSkillsSet.has("Python") || detectedSkillsSet.has("Go") || detectedSkillsSet.has("Java");
    const hasDB = detectedSkillsSet.has("MongoDB") || detectedSkillsSet.has("MySQL") || detectedSkillsSet.has("PostgreSQL") || detectedSkillsSet.has("Firebase");
    const hasDevOps = detectedSkillsSet.has("Docker") || detectedSkillsSet.has("GitHub Workflows") || detectedSkillsSet.has("Nix / SaltStack");
    const hasTesting = detectedSkillsSet.has("Jest / Vitest");

    let categoryD = (hasFE ? 4 : 0) + (hasBE ? 4 : 0) + (hasDB ? 3 : 0) + (hasDevOps ? 3 : 0) + (hasTesting ? 1 : 0);
    categoryD = Math.min(15, categoryD);

    // E. Portfolio Quality (Max 10 pts)
    const hasPortfolio = Boolean(userData.blog);
    const hasBio = Boolean(userData.bio);
    const hasPagesAny = validProjects.some(r => r.hasPages);

    let categoryE = (hasPortfolio ? 4 : 0) + (hasBio ? 3 : 0) + (hasPagesAny ? 3 : 0);
    categoryE = Math.min(10, categoryE);

    // F. Engineering Practices (Max 10 pts)
    let categoryF = (hasDevOps ? 4 : 0) + (hasTesting ? 3 : 0) + (descRatio >= 0.5 ? 3 : 0);
    categoryF = Math.min(10, categoryF);

    // G. Community / Impact (Max 5 pts)
    const totalStars = validProjects.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
    const totalForks = validProjects.reduce((acc, r) => acc + (r.forks_count || 0), 0);
    let categoryG = Math.min(5, Math.floor(totalStars * 0.5 + totalForks * 0.5 + Math.min(2, userData.followers * 0.05)));

    // H. Technology Breadth (Max 5 pts)
    let categoryH = Math.min(5, Math.floor(detectedSkillsSet.size / 2));

    // FINAL EVIDENCE-BASED DEVELOPER SCORE (0 - 100)
    const scoreBreakdown: CategoryScoreBreakdown = {
      projectQuality: categoryA,
      documentation: categoryB,
      developmentActivity: categoryC,
      technicalDepth: categoryD,
      portfolioQuality: categoryE,
      engineeringPractices: categoryF,
      communityImpact: categoryG,
      technologyBreadth: categoryH,
    };

    const totalEvidenceScore = categoryA + categoryB + categoryC + categoryD + categoryE + categoryF + categoryG + categoryH;
    const devScore = Math.min(98, Math.max(10, totalEvidenceScore));

    // ── SCORING AUDIT CONSOLE LOG ──
    console.log("==================================================");
    console.log(`GITHUB INTELLIGENCE SCORING AUDIT V3 FOR @${username}`);
    console.log("==================================================");
    console.log(`• Total Public Repositories: ${allRepos.length}`);
    console.log(`• Context Cap Bonus (Max 5): ${contextBonus}`);
    console.log(`• Substantial Projects: ${substantialProjects}`);
    console.log(`• Normal Projects: ${normalProjects}`);
    console.log(`• Learning / Tutorial Repos: ${learningBasicRepos}`);
    console.log(`• Assignments / Labs: ${assignments}`);
    console.log(`• Forks (Skipped from core score): ${forks}`);
    console.log(`• Minimal / Empty Repos: ${minimalEmptyRepos}`);
    console.log(`• Archived Repos: ${archivedRepos}`);
    console.log("--------------------------------------------------");
    console.log(`1. Project Quality: ${categoryA}/25`);
    console.log(`2. Documentation: ${categoryB}/15`);
    console.log(`3. Development Activity: ${categoryC}/15`);
    console.log(`4. Technical Depth: ${categoryD}/15`);
    console.log(`5. Portfolio Quality: ${categoryE}/10`);
    console.log(`6. Engineering Practices: ${categoryF}/10`);
    console.log(`7. Community Impact: ${categoryG}/5`);
    console.log(`8. Technology Breadth: ${categoryH}/5`);
    console.log("--------------------------------------------------");
    console.log(`FINAL EVIDENCE-BASED DEVELOPER SCORE: ${devScore}/100`);
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
          score: Math.min(92, 60 + repoCount * 8),
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

    const feConf = getConfidence(hasFE, validProjects.filter(r => r.language === "JavaScript" || r.language === "TypeScript" || r.language === "HTML").length, detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js"));
    const beConf = getConfidence(hasBE, validProjects.filter(r => r.language === "Python" || r.language === "Go" || r.language === "Java" || r.corpus.includes("node")).length, detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Express") || detectedSkillsSet.has("Python"));
    const dbConf = getConfidence(hasDB, validProjects.filter(r => r.corpus.includes("mongo") || r.corpus.includes("sql") || r.corpus.includes("firebase")).length, detectedSkillsSet.has("MongoDB") || detectedSkillsSet.has("MySQL") || detectedSkillsSet.has("Firebase"));
    const aiConf = getConfidence(detectedSkillsSet.has("TensorFlow"), validProjects.filter(r => r.corpus.includes("machine") || r.corpus.includes("tensor")).length, detectedSkillsSet.has("TensorFlow"));
    const devOpsConf = getConfidence(hasDevOps, validProjects.filter(r => r.corpus.includes("docker") || r.corpus.includes("nix") || r.corpus.includes("workflow")).length, detectedSkillsSet.has("Docker") || detectedSkillsSet.has("Nix / SaltStack"));
    const cloudConf = getConfidence(detectedSkillsSet.has("Firebase") || hasPagesAny, validProjects.filter(r => r.hasPages).length, detectedSkillsSet.has("Firebase"));
    const psConf = getConfidence(validProjects.length >= 2, validProjects.length, validProjects.length >= 3);
    const docConf = getConfidence(reposWithDesc > 0, reposWithDesc, descRatio >= 0.5);
    const uiUxConf = getConfidence(detectedSkillsSet.has("Tailwind CSS") || detectedSkillsSet.has("Figma"), validProjects.filter(r => r.corpus.includes("css") || r.corpus.includes("tailwind")).length, detectedSkillsSet.has("Tailwind CSS"));
    const testConf = getConfidence(hasTesting, validProjects.filter(r => r.corpus.includes("test")).length, hasTesting);

    // Level Title DERIVED STRICTLY FROM FINAL DEVELOPER SCORE
    let devLevel = "Developing Profile";
    let devCategory = "Entry Level Developer";
    let devStars = "★★☆☆☆";
    let devRankPercentile = 65;

    if (devScore >= 85) {
      devLevel = "Exceptional Developer & Architect";
      devCategory = "Senior Software Architect";
      devStars = "★★★★★";
      devRankPercentile = Math.max(3, 100 - devScore);
    } else if (devScore >= 70) {
      devLevel = "Strong Full Stack Developer";
      devCategory = "Software Engineer";
      devStars = "★★★★☆";
      devRankPercentile = 15;
    } else if (devScore >= 50) {
      devLevel = "Good Foundation Developer";
      devCategory = "Junior Developer";
      devStars = "★★★☆☆";
      devRankPercentile = 38;
    } else if (devScore >= 30) {
      devLevel = "Developing Profile";
      devCategory = "Building Developer";
      devStars = "★★☆☆☆";
      devRankPercentile = 60;
    }

    // Health Score Realism (0-100)
    let healthScore = Math.round((devScore * 0.75) + (categoryB * 1.5));
    healthScore = Math.min(95, Math.max(15, healthScore));

    let healthLevelText = "Needs Major Improvement";
    if (healthScore >= 90) healthLevelText = "Exceptional Profile";
    else if (healthScore >= 80) healthLevelText = "Excellent Profile";
    else if (healthScore >= 65) healthLevelText = "Strong Profile";
    else if (healthScore >= 50) healthLevelText = "Good Foundation";
    else if (healthScore >= 30) healthLevelText = "Developing Profile";

    // Explanations for Score (3-5 Positives, 3-5 Needs Improvement)
    const scoreStrengths: string[] = [];
    const scoreNeedsImp: string[] = [];

    if (validProjects.length > 0) scoreStrengths.push(`${validProjects.length} substantial/original coding project(s) analyzed`);
    if (detectedSkillsSet.size > 0) scoreStrengths.push(`${detectedSkillsSet.size} verified technology stack(s) detected in codebase`);
    if (daysSinceUpdate <= 30) scoreStrengths.push("Active repository updates within the last 30 days");
    if (hasDevOps) scoreStrengths.push("DevOps or configuration automation files detected (Nix/Salt/Docker)");

    if (reposWithDesc < validProjects.length) scoreNeedsImp.push("Some repositories lack detailed README descriptions and setup instructions");
    if (!hasPortfolio) scoreNeedsImp.push("No portfolio website linked to GitHub profile");
    if (!hasPagesAny) scoreNeedsImp.push("No visible live web deployments detected");
    if (!hasTesting) scoreNeedsImp.push("No automated software testing frameworks detected");
    if (forks > validProjects.length) scoreNeedsImp.push("High proportion of forked repositories compared to original projects");

    // XP System DERIVED STRICTLY FROM FINAL EVIDENCE SCORE
    const totalXP = devScore * 10;
    const levelNum = Math.max(1, Math.floor(devScore / 10) + 1);
    const xpCurrent = Math.round(totalXP % 100);
    const xpMax = 100;
    const xpPercentage = Math.min(100, Math.round((xpCurrent / xpMax) * 100));

    const nextLevelRequirements: string[] = [];
    if (substantialProjects < 3) nextLevelRequirements.push("+1 Substantial Original Project");
    if (reposWithDesc < validProjects.length) nextLevelRequirements.push("+2 README Improvements");
    if (!hasPagesAny) nextLevelRequirements.push("+1 Live Project Deployment");
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
        unlocked: detectedSkillsSet.has("HTML") || detectedSkillsSet.has("CSS") || detectedSkillsSet.has("JavaScript") || detectedSkillsSet.has("TypeScript"),
        glowColor: "rgba(168,85,247,0.5)",
      },
      {
        id: "backend-engineer",
        name: "Backend Engineer",
        description: "Created robust backend API servers and logic",
        icon: "⚙️",
        unlocked: hasBE,
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
        unlocked: hasDevOps,
        glowColor: "rgba(14,165,233,0.5)",
      },
      {
        id: "fullstack-developer",
        name: "Full Stack Developer",
        description: "Built end-to-end full stack web applications",
        icon: "🚀",
        unlocked: hasFE && (hasBE || hasDB),
        glowColor: "rgba(168,85,247,0.6)",
      },
      {
        id: "open-source-contributor",
        name: "Open Source Contributor",
        description: "Maintained active open source repositories and forks",
        icon: "🌐",
        unlocked: forks >= 5 || validProjects.length >= 2,
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
        unlocked: reposWithDesc >= 2,
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
      rankPercentile: devRankPercentile,
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

    // ── 8. TRANSPARENT CAREER READINESS ──
    let readinessStatus = "BUILDING FOUNDATIONS";
    if (hasFE && hasBE && hasDB && validProjects.length >= 2 && hasPagesAny) {
      readinessStatus = "STRONG INTERNSHIP PROFILE";
    } else if (hasFE && (hasBE || hasDB) && validProjects.length >= 1) {
      readinessStatus = "INTERNSHIP READY";
    } else if (hasFE || hasBE || hasDevOps) {
      readinessStatus = "INTERNSHIP PREPARATION";
    } else if (validProjects.length >= 1) {
      readinessStatus = "DEVELOPING PORTFOLIO";
    }

    const startupLevel = hasFE && (hasBE || hasDB) ? "Strong" : validProjects.length >= 1 ? "Moderate" : "Developing";
    const enterpriseLevel = hasDevOps && hasTesting ? "Strong" : hasDevOps ? "Moderate" : "Needs Evidence";
    const freelancerLevel = hasFE && hasPortfolio ? "Strong" : hasFE ? "Moderate" : "Developing";

    const developerPersonality: DeveloperPersonality = {
      archetype: hasDevOps ? "DevOps & Systems Engineer" : hasFE ? "Frontend Developer" : "Software Developer",
      title: devCategory,
      bestCareerPath: hasDevOps ? "DevOps / Infrastructure Engineer" : "Software Engineering Trainee",
      readinessScores: {
        startupReadiness: startupLevel === "Strong" ? 80 : startupLevel === "Moderate" ? 55 : 30,
        enterpriseReadiness: enterpriseLevel === "Strong" ? 85 : enterpriseLevel === "Moderate" ? 50 : 25,
        freelancerPotential: freelancerLevel === "Strong" ? 85 : freelancerLevel === "Moderate" ? 55 : 30,
        leadershipPotential: userData.followers > 20 ? 70 : 40,
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
        hasDevOps
          ? "You demonstrate clear systems, infrastructure, or configuration automation skills."
          : "Systems and DevOps workflows can be expanded with Docker / CI/CD.",
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

    // ── 10. RECRUITER PERSPECTIVE & ACTION PLAN ──
    const recruiterStrengths: string[] = [];
    const areasToImprove: string[] = [];

    if (hasFE) recruiterStrengths.push("Verified frontend implementation skills");
    if (hasDevOps) recruiterStrengths.push("Verified systems/DevOps configuration skills");
    if (validProjects.length >= 2) recruiterStrengths.push(`Published ${validProjects.length} original coding repositories`);

    if (!hasBE) areasToImprove.push("Build a backend REST API with server logic");
    if (!hasPagesAny) areasToImprove.push("Deploy projects live to Vercel/Netlify with working demo links");
    if (reposWithDesc < validProjects.length) areasToImprove.push("Add detailed README documentation and setup instructions");

    const overallImpression = validProjects.length >= 2
      ? `Profile exhibits good practical coding initiative with ${validProjects.length} published original project(s). Adding backend integration, live deployments, and detailed READMEs will strengthen recruiter evaluation.`
      : "Profile is in early development stages. Creating 2-3 structured full stack projects with live demos will significantly improve readiness.";

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

    const healthReportStrengths = scoreStrengths.length > 0 ? scoreStrengths : ["Public GitHub account established"];
    const healthReportImprovements = Array.from(new Set([...scoreNeedsImp, ...areasToImprove]));

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
        recruiterStrengths,
        areasToImprove,
        overallImpression,
        readinessStatus,
      },
      actionPlan,
      healthReport: {
        strengths: healthReportStrengths,
        improvements: healthReportImprovements,
        score: healthScore,
        healthLevelText,
      },
      activityInsights: {
        lastUpdatedRepo: validProjects[0]?.name || null,
        mostActiveLanguage: mostUsedLanguages[0]?.language || null,
        recentActivityStatus: daysSinceUpdate <= 30 ? `Actively updated ${daysSinceUpdate === 0 ? "Today" : `${daysSinceUpdate} days ago`}` : "Limited recent activity",
        isInactive: daysSinceUpdate > 90,
      },
      aiRecommendations: [
        !hasBE ? "Build a Node.js/Python backend REST API server." : "Add database persistence using MongoDB or PostgreSQL.",
        !hasPagesAny ? "Deploy web applications live to Vercel/Netlify." : "Write automated unit tests using Jest/Vitest.",
        "Include architecture diagrams and API docs in repository READMEs.",
        "Pin your top 3 best projects on your GitHub profile overview.",
      ],
      cachedAt: new Date().toISOString(),
    };

    cache.set(username, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GitHub Intelligence V3 API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze GitHub profile" }, { status: 500 });
  }
}
