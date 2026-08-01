import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES (V2 Evidence-Based Engine)
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

export interface DeveloperMetrics {
  score: number; // 0 - 100
  level: string; // e.g. "Developing Developer / Strong Developer"
  levelNum: number; // Level 1 - 20
  xpCurrent: number;
  xpMax: number;
  xpPercentage: number;
  nextLevelRequirements: string[];
  nextRewardBadge: string;
  stars: string;
  rankPercentile: number;
  category: string;
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
    startupReadiness: number; // 0-100 (Evidence-based)
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
  { name: "Java", category: "backend", matchers: ["java", "spring", "springboot"] },
  { name: "C++", category: "backend", matchers: ["c++", "cpp"] },
  { name: "C#", category: "backend", matchers: ["c#", "csharp", "dotnet", ".net"] },
  { name: "Dart", category: "backend", matchers: ["dart"] },
  { name: "Flutter", category: "frontend", matchers: ["flutter"] },
  { name: "Firebase", category: "cloud", matchers: ["firebase", "firestore"] },
  { name: "MongoDB", category: "database", matchers: ["mongodb", "mongo", "mongoose"] },
  { name: "MySQL", category: "database", matchers: ["mysql"] },
  { name: "PostgreSQL", category: "database", matchers: ["postgresql", "postgres", "psql"] },
  { name: "TensorFlow", category: "aiMl", matchers: ["tensorflow", "keras", "torch", "pytorch", "scikit-learn"] },
  { name: "OpenCV", category: "aiMl", matchers: ["opencv"] },
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
    const nonForkRepos = allRepos.filter(r => !r.fork);

    // ── 3. Classify & Analyze Repositories ──
    const analyzedRepos = nonForkRepos.map(repo => {
      const isProfileRepo = repo.name.toLowerCase() === username.toLowerCase();
      const hasDescription = Boolean(repo.description && repo.description.trim().length >= 10);
      const isTiny = (repo.size || 0) < 15; // < 15KB is tiny assignment/empty
      const stars = repo.stargazers_count || 0;
      const forks = repo.forks_count || 0;
      const hasPages = Boolean(repo.has_pages || repo.homepage);
      const topics = repo.topics || [];
      const language = repo.language || null;
      const corpus = `${repo.name} ${repo.description || ""} ${topics.join(" ")}`.toLowerCase();

      // Category Classification
      let repoCategory = "STANDARD PROJECT";
      if (isProfileRepo) {
        repoCategory = "PROFILE REPOSITORY";
      } else if (isTiny && !hasDescription) {
        repoCategory = "MINIMAL/EMPTY REPOSITORY";
      } else if (corpus.includes("assignment") || corpus.includes("lab") || corpus.includes("homework")) {
        repoCategory = "ASSIGNMENT";
      } else if (corpus.includes("tutorial") || corpus.includes("course") || corpus.includes("practice")) {
        repoCategory = "LEARNING PROJECT";
      } else if (stars >= 2 || hasPages || (repo.size || 0) > 300) {
        repoCategory = "SUBSTANTIAL PROJECT";
      }

      // Individual Repo Quality Score (0 - 100)
      let repoScore = 0;
      if (repoCategory === "SUBSTANTIAL PROJECT") repoScore += 35;
      else if (repoCategory === "STANDARD PROJECT") repoScore += 20;
      else if (repoCategory === "LEARNING PROJECT") repoScore += 10;
      else if (repoCategory === "ASSIGNMENT") repoScore += 5;

      if (hasDescription) repoScore += 15;
      if (hasPages) repoScore += 15; // Deployment
      if (stars > 0) repoScore += Math.min(15, stars * 3);
      if (forks > 0) repoScore += Math.min(10, forks * 4);
      if (topics.length >= 2) repoScore += 10;

      return {
        ...repo,
        repoCategory,
        repoScore: Math.min(100, repoScore),
        hasDescription,
        hasPages,
        isProfileRepo,
        corpus,
      };
    });

    // Substantial repos list (excluding profile/empty repos)
    const validProjects = analyzedRepos.filter(r => r.repoCategory !== "PROFILE REPOSITORY" && r.repoCategory !== "MINIMAL/EMPTY REPOSITORY");

    // ── 4. Language & Technology Detection ──
    const languageCounts: Record<string, number> = {};
    const detectedSkillsSet = new Set<string>();
    const techBreakdown: Record<string, number> = {};

    analyzedRepos.forEach(repo => {
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

    if (analyzedRepos.length > 0) {
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

    // ── 5. Select Best Top Projects (with Honest Selection Reasons) ──
    const sortedBestRepos = [...analyzedRepos].sort((a, b) => b.repoScore - a.repoScore);

    const bestProjects: GitHubRepoInfo[] = sortedBestRepos.slice(0, 3).map(r => {
      let selectionReason = `Selected as a ${r.repoCategory.toLowerCase()} with structured codebase.`;
      if (r.hasPages) {
        selectionReason = "Selected because this repository contains active web implementation with live deployment.";
      } else if (r.stargazers_count > 0) {
        selectionReason = `Selected due to community recognition with ${r.stargazers_count} star(s) and valid project structure.`;
      } else if (r.hasDescription) {
        selectionReason = "Selected because it provides clear project descriptions and source code setup.";
      } else if (r.isProfileRepo) {
        selectionReason = "Selected as the GitHub Profile configuration repository.";
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

    // ── 6. EIGHT WEIGHTED CATEGORIES SCORING ENGINE V2 (MAX 100 POINTS) ──
    
    // A. Project Quality (Max 25 pts)
    const substantialCount = analyzedRepos.filter(r => r.repoCategory === "SUBSTANTIAL PROJECT").length;
    const standardCount = analyzedRepos.filter(r => r.repoCategory === "STANDARD PROJECT").length;
    let categoryA = Math.min(25, substantialCount * 10 + standardCount * 4);

    // B. Documentation Quality (Max 15 pts)
    const reposWithDesc = analyzedRepos.filter(r => r.hasDescription).length;
    const descRatio = analyzedRepos.length > 0 ? reposWithDesc / analyzedRepos.length : 0;
    let categoryB = Math.round(descRatio * 10) + (userData.bio ? 3 : 0) + (reposWithDesc > 0 ? 2 : 0);
    categoryB = Math.min(15, categoryB);

    // C. Development Activity (Max 15 pts)
    const daysSinceUpdate = analyzedRepos[0]?.updated_at
      ? Math.floor((now - new Date(analyzedRepos[0].updated_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let categoryC = 0;
    if (daysSinceUpdate <= 7) categoryC = 15;
    else if (daysSinceUpdate <= 30) categoryC = 11;
    else if (daysSinceUpdate <= 90) categoryC = 6;
    else if (daysSinceUpdate <= 180) categoryC = 3;
    else categoryC = 0;

    // D. Technical Depth (Max 15 pts)
    const hasFE = detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js") || detectedSkillsSet.has("HTML");
    const hasBE = detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Express") || detectedSkillsSet.has("Python") || detectedSkillsSet.has("Java");
    const hasDB = detectedSkillsSet.has("MongoDB") || detectedSkillsSet.has("MySQL") || detectedSkillsSet.has("PostgreSQL") || detectedSkillsSet.has("Firebase");
    const hasDevOps = detectedSkillsSet.has("Docker") || detectedSkillsSet.has("GitHub Workflows");
    const hasTesting = detectedSkillsSet.has("Jest / Vitest");

    let categoryD = (hasFE ? 4 : 0) + (hasBE ? 4 : 0) + (hasDB ? 4 : 0) + (hasDevOps ? 2 : 0) + (hasTesting ? 1 : 0);
    categoryD = Math.min(15, categoryD);

    // E. Portfolio Quality (Max 10 pts)
    const hasPortfolio = Boolean(userData.blog);
    const hasBio = Boolean(userData.bio);
    const hasPagesAny = analyzedRepos.some(r => r.hasPages);

    let categoryE = (hasPortfolio ? 4 : 0) + (hasBio ? 3 : 0) + (hasPagesAny ? 3 : 0);
    categoryE = Math.min(10, categoryE);

    // F. Engineering Practices (Max 10 pts)
    let categoryF = (hasDevOps ? 4 : 0) + (hasTesting ? 3 : 0) + (descRatio >= 0.5 ? 3 : 0);
    categoryF = Math.min(10, categoryF);

    // G. Community / Impact (Max 5 pts)
    const totalStars = analyzedRepos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
    const totalForks = analyzedRepos.reduce((acc, r) => acc + (r.forks_count || 0), 0);
    let categoryG = Math.min(5, totalStars * 1 + totalForks * 1.5 + Math.min(2, (userData.followers || 0) * 0.5));

    // H. Technology Breadth (Max 5 pts)
    let categoryH = Math.min(5, Math.floor(detectedSkillsSet.size / 2));

    // FINAL CALCULATED DEVELOPER SCORE V2
    const totalV2Score = Math.round(categoryA + categoryB + categoryC + categoryD + categoryE + categoryF + categoryG + categoryH);
    const devScore = Math.min(98, Math.max(12, totalV2Score));

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

    const feConf = getConfidence(hasFE, analyzedRepos.filter(r => r.language === "JavaScript" || r.language === "TypeScript" || r.language === "HTML").length, detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js"));
    const beConf = getConfidence(hasBE, analyzedRepos.filter(r => r.language === "Python" || r.language === "Java" || r.corpus.includes("node")).length, detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Express"));
    const dbConf = getConfidence(hasDB, analyzedRepos.filter(r => r.corpus.includes("mongo") || r.corpus.includes("sql") || r.corpus.includes("firebase")).length, detectedSkillsSet.has("MongoDB") || detectedSkillsSet.has("MySQL") || detectedSkillsSet.has("Firebase"));
    const aiConf = getConfidence(detectedSkillsSet.has("TensorFlow") || detectedSkillsSet.has("OpenCV"), analyzedRepos.filter(r => r.corpus.includes("machine") || r.corpus.includes("tensor")).length, detectedSkillsSet.has("TensorFlow"));
    const devOpsConf = getConfidence(hasDevOps, analyzedRepos.filter(r => r.corpus.includes("docker") || r.corpus.includes("workflow")).length, detectedSkillsSet.has("Docker"));
    const cloudConf = getConfidence(detectedSkillsSet.has("Firebase") || hasPagesAny, analyzedRepos.filter(r => r.hasPages).length, detectedSkillsSet.has("Firebase"));
    const psConf = getConfidence(validProjects.length >= 2, validProjects.length, validProjects.length >= 3);
    const docConf = getConfidence(reposWithDesc > 0, reposWithDesc, descRatio >= 0.5);
    const uiUxConf = getConfidence(detectedSkillsSet.has("Tailwind CSS") || detectedSkillsSet.has("Figma"), analyzedRepos.filter(r => r.corpus.includes("css") || r.corpus.includes("tailwind")).length, detectedSkillsSet.has("Tailwind CSS"));
    const testConf = getConfidence(hasTesting, analyzedRepos.filter(r => r.corpus.includes("test")).length, hasTesting);

    // Level Title based on Evidence-Based V2 Score
    let devLevel = "Developing Developer";
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
    let healthScore = Math.round((devScore * 0.7) + (categoryB * 2));
    healthScore = Math.min(95, Math.max(15, healthScore));

    let healthLevelText = "Needs Major Improvement";
    if (healthScore >= 90) healthLevelText = "Exceptional Profile";
    else if (healthScore >= 80) healthLevelText = "Excellent Profile";
    else if (healthScore >= 65) healthLevelText = "Strong Profile";
    else if (healthScore >= 50) healthLevelText = "Good Foundation";
    else if (healthScore >= 30) healthLevelText = "Developing Profile";

    // Explanations for Score
    const scoreStrengths: string[] = [];
    const scoreNeedsImp: string[] = [];

    if (validProjects.length > 0) scoreStrengths.push(`${validProjects.length} public coding project(s) analyzed`);
    if (detectedSkillsSet.size > 0) scoreStrengths.push(`${detectedSkillsSet.size} verified technology stack(s) detected`);
    if (daysSinceUpdate <= 30) scoreStrengths.push("Active repository updates within the last 30 days");

    if (reposWithDesc < analyzedRepos.length) scoreNeedsImp.push("Repository descriptions & README documentation can be improved");
    if (!hasPortfolio) scoreNeedsImp.push("No portfolio website linked to GitHub profile");
    if (!hasPagesAny) scoreNeedsImp.push("No visible live web deployments detected");
    if (!hasTesting) scoreNeedsImp.push("No automated software testing frameworks detected");
    if (!hasDevOps) scoreNeedsImp.push("No Docker or CI/CD workflow configuration found");

    // XP System
    const totalXP = validProjects.length * 100 + detectedSkillsSet.size * 50 + reposWithDesc * 40;
    const levelNum = Math.max(1, Math.floor(totalXP / 250) + 1);
    const xpCurrent = totalXP % 1000;
    const xpMax = 1000;
    const xpPercentage = Math.min(100, Math.round((xpCurrent / xpMax) * 100));

    const nextLevelRequirements: string[] = [];
    if (validProjects.length < 3) nextLevelRequirements.push("+1 Substantial Project");
    if (reposWithDesc < analyzedRepos.length) nextLevelRequirements.push("+2 README Improvements");
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
        unlocked: detectedSkillsSet.has("TensorFlow") || detectedSkillsSet.has("OpenCV"),
        glowColor: "rgba(236,72,153,0.5)",
      },
      {
        id: "firebase-expert",
        name: "Firebase Expert",
        description: "Deployed cloud databases and real-time backend services",
        icon: "🔥",
        unlocked: detectedSkillsSet.has("Firebase"),
        glowColor: "rgba(245,158,11,0.5)",
      },
      {
        id: "docker-explorer",
        name: "Docker Explorer",
        description: "Containerized application workflows with Docker",
        icon: "🐳",
        unlocked: detectedSkillsSet.has("Docker"),
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
        id: "open-source-beginner",
        name: "Open Source Beginner",
        description: "Published public code and collaborated on GitHub",
        icon: "🌐",
        unlocked: validProjects.length >= 2,
        glowColor: "rgba(99,102,241,0.5)",
      },
      {
        id: "problem-solver",
        name: "Problem Solver",
        description: "Published 3+ substantial repositories with active updates",
        icon: "💡",
        unlocked: validProjects.length >= 3,
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

    // ── 8. AI PERSONALITY & CAREER READINESS (TRANSPARENT STATUS) ──
    let readinessStatus = "BUILDING FOUNDATIONS";
    if (hasFE && hasBE && hasDB && validProjects.length >= 2 && hasPagesAny) {
      readinessStatus = "STRONG INTERNSHIP PROFILE";
    } else if (hasFE && (hasBE || hasDB) && validProjects.length >= 1) {
      readinessStatus = "INTERNSHIP READY";
    } else if (hasFE || hasBE) {
      readinessStatus = "INTERNSHIP PREPARATION";
    } else if (validProjects.length >= 1) {
      readinessStatus = "DEVELOPING PORTFOLIO";
    }

    const startupLevel = hasFE && (hasBE || hasDB) ? "Strong" : validProjects.length >= 1 ? "Moderate" : "Developing";
    const enterpriseLevel = hasDevOps && hasTesting ? "Strong" : hasBE ? "Moderate" : "Needs Evidence";
    const freelancerLevel = hasFE && hasPortfolio ? "Strong" : hasFE ? "Moderate" : "Developing";

    const developerPersonality: DeveloperPersonality = {
      archetype: hasFE && hasBE ? "Full Stack Creator" : hasFE ? "Frontend Developer" : "Software Trainee",
      title: devCategory,
      bestCareerPath: hasFE ? "Frontend / Full Stack Engineering" : "Software Engineering Trainee",
      readinessScores: {
        startupReadiness: startupLevel === "Strong" ? 80 : startupLevel === "Moderate" ? 55 : 30,
        enterpriseReadiness: enterpriseLevel === "Strong" ? 85 : enterpriseLevel === "Moderate" ? 50 : 25,
        freelancerPotential: freelancerLevel === "Strong" ? 85 : freelancerLevel === "Moderate" ? 55 : 30,
        leadershipPotential: (userData.followers || 0) > 10 ? 70 : 40,
      },
      readinessLevels: {
        startupReadiness: startupLevel,
        enterpriseReadiness: enterpriseLevel,
        freelancerPotential: freelancerLevel,
        leadershipPotential: "Developing",
      },
      developerStyleTraits: [
        validProjects.length >= 2
          ? "You focus on building practical applications and publishing your code to GitHub."
          : "You are currently building your foundational repository portfolio.",
        hasFE
          ? "You demonstrate clear frontend web development skills."
          : "Frontend web skills can be expanded with interactive UI projects.",
        hasBE
          ? "You have backend server logic evidence in your codebase."
          : "Backend API implementation is an area to develop with Node.js/Python.",
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

    const oldestRepo = [...analyzedRepos].sort((a, b) => new Date(a.created_at || a.updated_at).getTime() - new Date(b.created_at || b.updated_at).getTime())[0];
    if (oldestRepo) {
      timeline.push({
        title: "First Repository",
        subtitle: `Published "${oldestRepo.name}"`,
        date: oldestRepo.created_at ? new Date(oldestRepo.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Early Milestone",
        icon: "🚀",
        badgeText: "First Project",
      });
    }

    timeline.push({
      title: `Current Level: ${devLevel}`,
      subtitle: `Analyzed ${validProjects.length} substantial project(s) & ${detectedSkillsSet.size} verified tech stack(s)`,
      date: "Present",
      icon: "🏆",
      badgeText: "Current Level",
    });

    const growth: ProjectGrowthMetrics = {
      reposCreatedCount: userData.public_repos || analyzedRepos.length,
      technologiesLearnedCount: detectedSkillsSet.size,
      activityTrend: daysSinceUpdate <= 30 ? "Active Development 📈" : "Steady Profile 🏗️",
      mostProductiveMonth: analyzedRepos[0]?.updated_at ? new Date(analyzedRepos[0].updated_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Recent Months",
      latestProject: analyzedRepos[0] ? { name: analyzedRepos[0].name, url: analyzedRepos[0].html_url, date: new Date(analyzedRepos[0].updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) } : null,
      mostSuccessfulProject: sortedBestRepos[0] ? { name: sortedBestRepos[0].name, url: sortedBestRepos[0].html_url, stars: sortedBestRepos[0].stargazers_count || 0 } : null,
    };

    // ── 10. RECRUITER PERSPECTIVE & ACTION PLAN ──
    const recruiterStrengths: string[] = [];
    const areasToImprove: string[] = [];

    if (hasFE) recruiterStrengths.push("Verified frontend implementation skills");
    if (validProjects.length >= 2) recruiterStrengths.push(`Published ${validProjects.length} public coding repositories`);
    if (daysSinceUpdate <= 30) recruiterStrengths.push("Active GitHub updates within the last 30 days");

    if (!hasBE) areasToImprove.push("Build a backend REST API with server logic");
    if (!hasPagesAny) areasToImprove.push("Deploy projects live to Vercel/Netlify with working demo links");
    if (reposWithDesc < analyzedRepos.length) areasToImprove.push("Add detailed README documentation and setup instructions");

    const overallImpression = validProjects.length >= 2
      ? `Profile exhibits good practical coding initiative with ${validProjects.length} published project(s). Adding backend integration, live deployments, and detailed READMEs will strengthen recruiter evaluation.`
      : "Profile is in early development stages. Creating 2-3 structured full stack projects with live demos will significantly improve readiness.";

    const actionPlan: ActionPlanSection = {
      quickWins: [
        "Add short descriptions and topics to all public repositories.",
        "Add your portfolio or LinkedIn link to your GitHub profile bio.",
      ],
      next7Days: [
        "Create a detailed README.md for your primary repository with screenshots and setup steps.",
        "Deploy your frontend project to Vercel/Netlify and link the live URL in the repo header.",
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
      publicReposCount: userData.public_repos || analyzedRepos.length,
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
        lastUpdatedRepo: analyzedRepos[0]?.name || null,
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
    console.error("[GitHub Intelligence V2 API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze GitHub profile" }, { status: 500 });
  }
}
