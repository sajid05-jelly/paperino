import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

export interface DeveloperMetrics {
  score: number; // 0 - 100
  level: string; // e.g. "Advanced Full Stack Developer"
  levelNum: number; // e.g. Level 12
  xpCurrent: number; // e.g. 820
  xpMax: number; // e.g. 1000
  xpPercentage: number; // e.g. 82%
  nextLevelRequirements: string[];
  nextRewardBadge: string;
  stars: string; // e.g. "★★★★★"
  rankPercentile: number; // e.g. Top 12%
  category: string; // e.g. "Full Stack Engineer"
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
  badges: DeveloperBadge[];
}

export interface DeveloperPersonality {
  archetype: string; // e.g. "Product Innovator & Full Stack Creator"
  title: string; // e.g. "Builder & Systems Creator"
  bestCareerPath: string; // e.g. "Full Stack Product Engineer / Technical Founder"
  readinessScores: {
    startupReadiness: number; // 0-100
    enterpriseReadiness: number; // 0-100
    freelancerPotential: number; // 0-100
    leadershipPotential: number; // 0-100
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
  activityTrend: string; // e.g. "Accelerating Growth"
  mostProductiveMonth: string; // e.g. "January 2026"
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
  readinessStatus: string; // e.g. "Internship & Junior Developer Ready"
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
  healthReport: {
    strengths: string[];
    improvements: string[];
    score: number; // 0 - 100
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
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Technologies to detect from repos (languages, topics, descriptions, names)
const TECH_RULES: { name: string; matchers: (string | RegExp)[] }[] = [
  { name: "TypeScript", matchers: ["typescript", "ts"] },
  { name: "JavaScript", matchers: ["javascript", "js", "node", "express"] },
  { name: "React", matchers: ["react", "reactjs", "jsx", "tsx"] },
  { name: "Next.js", matchers: ["nextjs", "next.js", "next"] },
  { name: "Node.js", matchers: ["nodejs", "node", "express"] },
  { name: "Express", matchers: ["express", "expressjs"] },
  { name: "HTML", matchers: ["html", "html5"] },
  { name: "CSS", matchers: ["css", "css3"] },
  { name: "Tailwind CSS", matchers: ["tailwind", "tailwindcss"] },
  { name: "Bootstrap", matchers: ["bootstrap"] },
  { name: "Python", matchers: ["python", "py", "django", "flask", "fastapi"] },
  { name: "Java", matchers: ["java", "spring", "springboot"] },
  { name: "C", matchers: [/^c$/i] },
  { name: "C++", matchers: ["c++", "cpp"] },
  { name: "C#", matchers: ["c#", "csharp", "dotnet", ".net"] },
  { name: "Flutter", matchers: ["flutter"] },
  { name: "Dart", matchers: ["dart"] },
  { name: "Firebase", matchers: ["firebase", "firestore"] },
  { name: "MongoDB", matchers: ["mongodb", "mongo", "mongoose"] },
  { name: "MySQL", matchers: ["mysql"] },
  { name: "PostgreSQL", matchers: ["postgresql", "postgres", "psql"] },
  { name: "TensorFlow", matchers: ["tensorflow", "keras", "torch", "pytorch"] },
  { name: "Docker", matchers: ["docker", "dockerfile"] },
  { name: "Git", matchers: ["git"] },
  { name: "GitHub", matchers: ["github"] },
  { name: "OpenCV", matchers: ["opencv"] },
  { name: "Three.js", matchers: ["three.js", "threejs", "three"] },
  { name: "GSAP", matchers: ["gsap"] },
  { name: "Angular", matchers: ["angular", "angularjs"] },
  { name: "Vue", matchers: ["vue", "vuejs"] },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let username = searchParams.get("username")?.trim().replace(/^@/, "");
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!username) {
      return NextResponse.json({ error: "GitHub username is required" }, { status: 400 });
    }

    // Clean username if passed full URL e.g. https://github.com/username
    if (username.includes("github.com/")) {
      const parts = username.split("github.com/")[1].split("/").filter(Boolean);
      username = parts[0] || username;
    }

    username = username.toLowerCase();

    // Check cache unless refresh forced
    const now = Date.now();
    if (!forceRefresh && cache.has(username)) {
      const cached = cache.get(username)!;
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached.data, fromCache: true });
      }
    }

    // 1. Fetch User Profile from GitHub REST API
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
      return NextResponse.json({ error: `GitHub API error (HTTP ${userRes.status}). Please try again shortly.` }, { status: userRes.status });
    }

    const userData = await userRes.json();

    // 2. Fetch Public Repositories (sort by updated, max 100)
    const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, {
      headers: {
        "User-Agent": "Paperino-CareerDNA-App",
        "Accept": "application/vnd.github.v3+json",
      },
      next: { revalidate: 0 },
    });

    const reposData = reposRes.ok ? await reposRes.json() : [];
    const publicRepos: any[] = Array.isArray(reposData) ? reposData.filter(r => !r.fork) : [];

    // 3. Process Technologies & Skills
    const languageCounts: Record<string, number> = {};
    const detectedSkillsSet = new Set<string>();
    const techBreakdown: Record<string, number> = {};

    publicRepos.forEach(repo => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
        techBreakdown[repo.language] = (techBreakdown[repo.language] || 0) + 1;
        detectedSkillsSet.add(repo.language);
      }

      // Check topics, name, description against tech rules
      const corpus = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();

      TECH_RULES.forEach(rule => {
        const isMatched = rule.matchers.some(m => {
          if (m instanceof RegExp) return m.test(corpus);
          return corpus.includes(m.toLowerCase());
        });
        if (isMatched) {
          detectedSkillsSet.add(rule.name);
          techBreakdown[rule.name] = (techBreakdown[rule.name] || 0) + 1;
        }
      });
    });

    // Ensure Git and GitHub are listed if user has repos
    if (publicRepos.length > 0) {
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

    // 4. Identify Best 3 Projects
    // Score criteria: stars * 3 + has_description * 2 + recent_update * 2 + length_of_desc
    const sortedRepos = [...publicRepos].sort((a, b) => {
      const scoreA = (a.stargazers_count || 0) * 3 + (a.description ? 2 : 0) + (a.has_pages ? 2 : 0);
      const scoreB = (b.stargazers_count || 0) * 3 + (b.description ? 2 : 0) + (b.has_pages ? 2 : 0);
      return scoreB - scoreA;
    });

    const bestProjects: GitHubRepoInfo[] = sortedRepos.slice(0, 3).map(r => ({
      name: r.name,
      description: r.description || null,
      language: r.language || null,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      updatedAt: r.updated_at ? new Date(r.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recently",
      url: r.html_url,
      hasReadme: true,
      topics: r.topics || [],
    }));

    // 5. GitHub Health & Activity Report
    const strengths: string[] = [];
    const improvements: string[] = [];
    let healthScore = 60;

    if (publicRepos.length >= 5) {
      strengths.push("Active developer with multiple public repositories");
      healthScore += 10;
    } else if (publicRepos.length > 0) {
      strengths.push("Has published public projects on GitHub");
    }

    if (detectedSkillsSet.size >= 4) {
      strengths.push(`Diverse technology stack (${detectedSkillsSet.size} technologies detected)`);
      healthScore += 10;
    }

    const reposWithDesc = publicRepos.filter(r => !!r.description).length;
    if (publicRepos.length > 0 && reposWithDesc / publicRepos.length >= 0.7) {
      strengths.push("Good project documentation and descriptions");
      healthScore += 10;
    } else {
      improvements.push("Add clear descriptions and README files to your repositories");
    }

    const reposWithStars = publicRepos.filter(r => (r.stargazers_count || 0) > 0).length;
    if (reposWithStars > 0) {
      strengths.push("Projects recognized with community stars");
      healthScore += 10;
    }

    if (userData.blog) {
      strengths.push("Portfolio website linked to GitHub profile");
    } else {
      improvements.push("Add your portfolio website link to your GitHub profile");
    }

    if (publicRepos.length < 3) {
      improvements.push("Create and push 2–3 new portfolio projects to GitHub");
    }

    improvements.push("Pin your top 3 best projects on your GitHub profile overview");
    improvements.push("Deploy your web projects live (e.g. Vercel, Netlify, Render)");

    healthScore = Math.min(95, Math.max(45, healthScore));

    // Activity Insights
    const lastUpdatedRepo = publicRepos[0]?.name || null;
    const mostActiveLanguage = mostUsedLanguages[0]?.language || null;
    const daysSinceLastUpdate = publicRepos[0]?.updated_at
      ? Math.floor((now - new Date(publicRepos[0].updated_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const isInactive = publicRepos.length === 0 || daysSinceLastUpdate > 90;
    const recentActivityStatus = isInactive
      ? "We couldn't find much recent GitHub activity. Building new projects can help strengthen your developer profile."
      : `Actively updated recently (${daysSinceLastUpdate === 0 ? "Today" : `${daysSinceLastUpdate} days ago`})`;

    // AI Personalized Recommendations
    const aiRecommendations: string[] = [];
    if (!detectedSkillsSet.has("Docker")) {
      aiRecommendations.push("Learn Docker and add containerization to your backend projects.");
    }
    if (!detectedSkillsSet.has("Next.js") && detectedSkillsSet.has("React")) {
      aiRecommendations.push("Upgrade your React knowledge to Next.js (App Router & SSR).");
    }
    if (reposWithDesc < publicRepos.length) {
      aiRecommendations.push("Write detailed README documentation with screenshots and live demo links.");
    }
    aiRecommendations.push("Build and deploy a full-stack application connecting frontend, REST API, and DB.");
    aiRecommendations.push("Contribute to open-source projects or contribute to Paperino repositories.");

    // 6. Calculate Algorithmic Developer Metrics & 10 Skill Scores
    const feSkills = ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Vue", "Angular", "Tailwind CSS", "Bootstrap", "Three.js", "GSAP"];
    const beSkills = ["Node.js", "Express", "Python", "Java", "C++", "C#", "C", "Dart"];
    const dbSkills = ["MongoDB", "MySQL", "PostgreSQL", "Firebase"];
    const aiSkills = ["TensorFlow", "OpenCV", "Python"];
    const devOpsSkills = ["Docker", "Git", "GitHub"];
    const cloudSkills = ["Firebase", "Docker"];

    const countMatches = (skills: string[]) => skills.filter(s => detectedSkillsSet.has(s)).length;

    const frontendScore = Math.min(98, Math.max(35, countMatches(feSkills) * 18 + (publicRepos.length > 2 ? 20 : 0)));
    const backendScore = Math.min(95, Math.max(30, countMatches(beSkills) * 22 + (publicRepos.length > 3 ? 15 : 0)));
    const databaseScore = Math.min(95, Math.max(25, countMatches(dbSkills) * 28));
    const aiMlScore = Math.min(95, Math.max(20, countMatches(aiSkills) * 32));
    const devOpsScore = Math.min(95, Math.max(30, countMatches(devOpsSkills) * 25));
    const cloudScore = Math.min(90, Math.max(20, countMatches(cloudSkills) * 35));
    const problemSolvingScore = Math.min(98, Math.max(40, publicRepos.length * 6 + (userData.followers || 0) * 4));
    const docScore = Math.min(95, Math.max(30, Math.round((reposWithDesc / (publicRepos.length || 1)) * 70) + 20));
    const uiUxScore = Math.min(92, Math.max(35, (detectedSkillsSet.has("Tailwind CSS") ? 25 : 0) + (detectedSkillsSet.has("React") ? 25 : 0) + 30));
    const testingScore = Math.min(88, Math.max(25, publicRepos.length > 5 ? 65 : 40));

    // Overall Algorithmic Developer Score (0 - 100)
    const rawDevScore = Math.round(
      (frontendScore + backendScore + databaseScore + devOpsScore + problemSolvingScore + docScore) / 6
    );
    const devScore = Math.min(98, Math.max(52, rawDevScore));

    let devLevel = "Junior Developer";
    let devCategory = "Software Engineer";
    let devStars = "★★★☆☆";
    let devRankPercentile = 28;

    if (devScore >= 90) {
      devLevel = "Master Full Stack Architect";
      devCategory = "Senior Software Architect";
      devStars = "★★★★★";
      devRankPercentile = Math.max(3, Math.floor(100 - devScore));
    } else if (devScore >= 80) {
      devLevel = "Advanced Full Stack Developer";
      devCategory = "Full Stack Engineer";
      devStars = "★★★★★";
      devRankPercentile = Math.max(8, 100 - devScore + 4);
    } else if (devScore >= 70) {
      devLevel = "Proficient Full Stack Engineer";
      devCategory = "Software Developer";
      devStars = "★★★★☆";
      devRankPercentile = Math.max(15, 100 - devScore + 8);
    } else if (devScore >= 60) {
      devLevel = "Intermediate Developer";
      devCategory = "Frontend / Backend Developer";
      devStars = "★★★☆☆";
      devRankPercentile = 35;
    }

    // Calculate Gamified Level & XP System
    const totalXP = publicRepos.length * 120 + detectedSkillsSet.size * 95 + (userData.followers || 0) * 45 + (reposWithDesc * 60);
    const levelNum = Math.max(1, Math.floor(totalXP / 350) + 1);
    const xpCurrent = totalXP % 1000;
    const xpMax = 1000;
    const xpPercentage = Math.min(100, Math.round((xpCurrent / xpMax) * 100));

    const nextLevelRequirements: string[] = [];
    if (publicRepos.length < 5) nextLevelRequirements.push("+1 Public Repository");
    if (reposWithDesc < publicRepos.length) nextLevelRequirements.push("+2 README & Description Improvements");
    if (!userData.blog) nextLevelRequirements.push("+1 Portfolio Link on Profile");
    if (nextLevelRequirements.length === 0) nextLevelRequirements.push("+1 New Stack Project");

    const nextRewardBadge = levelNum >= 15 ? "Grandmaster Architect Badge" : levelNum >= 10 ? "Elite Builder Badge" : "Master Innovator Badge";

    // Badges Gamification Array
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
        unlocked: detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Express") || detectedSkillsSet.has("Python") || detectedSkillsSet.has("Java"),
        glowColor: "rgba(34,197,94,0.5)",
      },
      {
        id: "ai-explorer",
        name: "AI Explorer",
        description: "Integrated Machine Learning / Computer Vision libraries",
        icon: "🧠",
        unlocked: detectedSkillsSet.has("TensorFlow") || detectedSkillsSet.has("OpenCV") || detectedSkillsSet.has("Python"),
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
        unlocked: (detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js")) && (detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("Python") || detectedSkillsSet.has("Firebase") || detectedSkillsSet.has("MongoDB")),
        glowColor: "rgba(168,85,247,0.6)",
      },
      {
        id: "open-source-beginner",
        name: "Open Source Beginner",
        description: "Published public code and collaborated on GitHub",
        icon: "🌐",
        unlocked: publicRepos.length >= 2,
        glowColor: "rgba(99,102,241,0.5)",
      },
      {
        id: "problem-solver",
        name: "Problem Solver",
        description: "Published 5+ repositories with active updates",
        icon: "💡",
        unlocked: publicRepos.length >= 5,
        glowColor: "rgba(234,179,8,0.5)",
      },
      {
        id: "documentation-master",
        name: "Documentation Master",
        description: "Maintained clear descriptions across repositories",
        icon: "📝",
        unlocked: reposWithDesc >= 3,
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
      nextRewardBadge,
      stars: devStars,
      rankPercentile: devRankPercentile,
      category: devCategory,
      skillsBreakdown: {
        frontend: frontendScore,
        backend: backendScore,
        database: databaseScore,
        aiMl: aiMlScore,
        devOps: devOpsScore,
        cloud: cloudScore,
        problemSolving: problemSolvingScore,
        documentation: docScore,
        uiUx: uiUxScore,
        testing: testingScore,
      },
      badges,
    };

    // 7. Calculate AI Developer Personality Profile
    let archetype = "Full Stack Engineer & Builder";
    let personalityTitle = "Product Creator";
    let bestCareerPath = "Full Stack Product Engineer / Technical Founder";

    if (aiMlScore >= 70) {
      archetype = "AI Innovator & Machine Learning Specialist";
      personalityTitle = "AI Explorer & Data Systems Specialist";
      bestCareerPath = "AI/ML Engineer / Applied Data Scientist";
    } else if (frontendScore >= 75 && backendScore >= 75) {
      archetype = "Full Stack Architect & Product Creator";
      personalityTitle = "Full Stack Builder";
      bestCareerPath = "Senior Full Stack Engineer / Startup Tech Lead";
    } else if (frontendScore >= 80) {
      archetype = "Frontend Specialist & UI/UX Innovator";
      personalityTitle = "UI/UX & Web Creator";
      bestCareerPath = "Frontend Engineer / Design Systems Developer";
    } else if (backendScore >= 80) {
      archetype = "Backend Systems Engineer";
      personalityTitle = "Backend Architecture Specialist";
      bestCareerPath = "Backend Software Engineer / Cloud Developer";
    }

    const startupReadiness = Math.min(95, Math.max(50, publicRepos.length * 6 + (detectedSkillsSet.size >= 5 ? 25 : 10)));
    const enterpriseReadiness = Math.min(92, Math.max(45, docScore * 0.5 + devOpsScore * 0.5));
    const freelancerPotential = Math.min(95, Math.max(40, frontendScore * 0.6 + (userData.blog ? 20 : 0)));
    const leadershipPotential = Math.min(90, Math.max(35, (userData.followers || 0) * 8 + publicRepos.length * 4));

    const developerStyleTraits: string[] = [];
    if (publicRepos.length >= 3) {
      developerStyleTraits.push("You enjoy building complete, practical applications rather than purely theoretical code.");
    }
    if (frontendScore >= 70) {
      developerStyleTraits.push("You have a strong natural eye for frontend user interface design and responsive web layout.");
    }
    if (backendScore < 65) {
      developerStyleTraits.push("Backend architecture and REST API design can still be expanded to boost your full stack strength.");
    } else {
      developerStyleTraits.push("You write structured backend logic and server-side data connections with confidence.");
    }
    if (docScore >= 75) {
      developerStyleTraits.push("You value project documentation and write detailed descriptions for your repositories.");
    } else {
      developerStyleTraits.push("Adding screenshots and live demo links to your repository READMEs will significantly boost recruiter interest.");
    }

    const developerPersonality: DeveloperPersonality = {
      archetype,
      title: personalityTitle,
      bestCareerPath,
      readinessScores: {
        startupReadiness,
        enterpriseReadiness,
        freelancerPotential,
        leadershipPotential,
      },
      developerStyleTraits,
    };

    // 8. Calculate Developer Journey Timeline & Project Growth Metrics
    const timeline: DeveloperTimelineMilestone[] = [];

    // Milestone 1: Joined GitHub
    timeline.push({
      title: "Joined GitHub",
      subtitle: `Created @${userData.login} account on GitHub`,
      date: userData.created_at ? new Date(userData.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Start",
      icon: "🎉",
      badgeText: "Account Created",
    });

    // Milestone 2: Created First Repository
    const oldestRepo = [...publicRepos].sort((a, b) => new Date(a.created_at || a.updated_at).getTime() - new Date(b.created_at || b.updated_at).getTime())[0];
    if (oldestRepo) {
      timeline.push({
        title: "Created First Repository",
        subtitle: `Published "${oldestRepo.name}" on GitHub`,
        date: oldestRepo.created_at ? new Date(oldestRepo.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Early Milestone",
        icon: "🚀",
        badgeText: "First Commit",
      });
    }

    // Milestone 3: Web Skills / Core Language
    if (detectedSkillsSet.has("HTML") || detectedSkillsSet.has("CSS") || detectedSkillsSet.has("JavaScript") || detectedSkillsSet.has("TypeScript")) {
      timeline.push({
        title: "Mastered Core Web Technologies",
        subtitle: "Built projects using HTML, CSS, JavaScript & TypeScript",
        date: "Skill Milestone",
        icon: "🎨",
        badgeText: "Web Fundamentals",
      });
    }

    // Milestone 4: Modern Frameworks / React
    if (detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js") || detectedSkillsSet.has("Vue")) {
      timeline.push({
        title: "Started Frontend Frameworks",
        subtitle: "Adopted React / Next.js for building interactive user interfaces",
        date: "Framework Milestone",
        icon: "⚛️",
        badgeText: "Modern Stack",
      });
    }

    // Milestone 5: Full Stack / AI Projects
    if (detectedSkillsSet.has("Python") || detectedSkillsSet.has("Node.js") || detectedSkillsSet.has("TensorFlow")) {
      timeline.push({
        title: "Expanded to Full Stack & Backend",
        subtitle: "Built server-side APIs, database structures & AI models",
        date: "Advanced Milestone",
        icon: "🔥",
        badgeText: "Full Stack & AI",
      });
    }

    // Milestone 6: Current Level
    timeline.push({
      title: `Current Level: ${devLevel}`,
      subtitle: `Active developer with ${publicRepos.length} public repos & ${detectedSkillsSet.size} verified technologies`,
      date: "Present",
      icon: "🏆",
      badgeText: "Current Level",
    });

    // Project Growth Metrics
    const latestRepo = publicRepos[0];
    const bestRepo = sortedRepos[0];

    const growth: ProjectGrowthMetrics = {
      reposCreatedCount: publicRepos.length,
      technologiesLearnedCount: detectedSkillsSet.size,
      activityTrend: daysSinceLastUpdate <= 14 ? "Accelerating High Activity 🔥" : daysSinceLastUpdate <= 60 ? "Consistent Project Growth 📈" : "Steady Developer Foundation 🏗️",
      mostProductiveMonth: latestRepo?.updated_at ? new Date(latestRepo.updated_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Recent Months",
      latestProject: latestRepo ? { name: latestRepo.name, url: latestRepo.html_url, date: new Date(latestRepo.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) } : null,
      mostSuccessfulProject: bestRepo ? { name: bestRepo.name, url: bestRepo.html_url, stars: bestRepo.stargazers_count || 0 } : null,
    };

    const developerJourney: DeveloperJourney = {
      timeline,
      growth,
    };

    // 9. Calculate Recruiter Perspective ("How Recruiters See You")
    const recruiterStrengths: string[] = [];
    const areasToImprove: string[] = [];

    if (detectedSkillsSet.has("React") || detectedSkillsSet.has("Next.js")) {
      recruiterStrengths.push("Strong knowledge of modern frontend frameworks (React / Next.js)");
    }
    if (publicRepos.length >= 4) {
      recruiterStrengths.push(`Active developer portfolio with ${publicRepos.length} published repositories`);
    }
    if (daysSinceLastUpdate <= 30) {
      recruiterStrengths.push("Consistent development activity and recent code updates");
    }
    if (detectedSkillsSet.size >= 5) {
      recruiterStrengths.push(`Versatile technology stack encompassing ${detectedSkillsSet.size} core tools`);
    }

    if (!detectedSkillsSet.has("Docker")) {
      areasToImprove.push("Limited containerization experience (Docker)");
    }
    if (backendScore < 70) {
      areasToImprove.push("Backend API architecture and server-side data models can be expanded");
    }
    if (testingScore < 65) {
      areasToImprove.push("No automated unit testing or integration testing projects detected");
    }
    if (reposWithDesc < publicRepos.length) {
      areasToImprove.push("Some repositories lack detailed README descriptions and live demo URLs");
    }

    const overallImpression = `Looks internship and junior developer ready with solid ${detectedSkillsSet.has("React") ? "React & frontend" : "programming"} foundations. Building one production-grade full-stack project with live deployment and detailed documentation would make this profile stand out even more to recruiters.`;
    const readinessStatus = devScore >= 80 ? "🔥 Highly Ready for Top Tech Internships" : "READY: Ready for Frontend & Full-Stack Internships";

    const recruiterPerspective: RecruiterPerspective = {
      recruiterStrengths: recruiterStrengths.length > 0 ? recruiterStrengths : ["Published code on GitHub", "Demonstrates practical coding initiative"],
      areasToImprove: areasToImprove.length > 0 ? areasToImprove : ["Add README descriptions to all repositories"],
      overallImpression,
      readinessStatus,
    };

    const result: GitHubAnalysisResult = {
      username: userData.login,
      name: userData.name || null,
      avatarUrl: userData.avatar_url,
      bio: userData.bio || null,
      followers: userData.followers || 0,
      following: userData.following || 0,
      publicReposCount: userData.public_repos || publicRepos.length,
      createdAt: userData.created_at ? new Date(userData.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "",
      portfolioUrl: userData.blog ? (userData.blog.startsWith("http") ? userData.blog : `https://${userData.blog}`) : null,
      detectedSkills: Array.from(detectedSkillsSet),
      mostUsedLanguages,
      technologyBreakdown: techBreakdown,
      bestProjects,
      developerMetrics,
      developerPersonality,
      developerJourney,
      recruiterPerspective,
      healthReport: {
        strengths,
        improvements: Array.from(new Set(improvements)),
        score: healthScore,
      },
      activityInsights: {
        lastUpdatedRepo,
        mostActiveLanguage,
        recentActivityStatus,
        isInactive,
      },
      aiRecommendations: aiRecommendations.slice(0, 4),
      cachedAt: new Date().toISOString(),
    };

    // Save to cache
    cache.set(username, { data: result, timestamp: now });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GitHub Intelligence API Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze GitHub profile" }, { status: 500 });
  }
}
