export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: "upload" | "download" | "review" | "other";
  unlockType: "frame" | "companion" | "effect" | "background";
  unlockId: string;
  unlockName: string;
  check: (stats: UserStats) => boolean;
}

export interface UserStats {
  uploadsCount?: number;
  approvedUploads?: number;
  downloadsCount?: number;
  reviewsCount?: number;
  insightsCount?: number;
  careerDnaCompleted?: boolean;
  atsResumeUploaded?: boolean;
  isInTop10?: boolean;
  isInHallOfFame?: boolean;
}

export function getLevelLabel(level: number): string {
  if (level >= 100) return "Legend";
  if (level >= 75) return "Mentor";
  if (level >= 50) return "Scholar";
  if (level >= 25) return "Knowledge Seeker";
  if (level >= 10) return "Paper Explorer";
  return "Paper Rookie";
}

export function xpToLevel(xp: number) {
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = 100;

  while (xp >= xpForNextLevel) {
    level++;
    xpForCurrentLevel = xpForNextLevel;
    xpForNextLevel = xpForCurrentLevel + (level * 100);
  }

  const label = getLevelLabel(level);
  const currentXpInLevel = xp - xpForCurrentLevel;
  const nextLevelXpNeed = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(100, Math.max(0, (currentXpInLevel / nextLevelXpNeed) * 100));

  return {
    level,
    label,
    currentXpInLevel,
    nextLevelXpNeed,
    progressPercent
  };
}

export function getCommunityReputation(stats: UserStats): { score: number; label: string } {
  const approved = stats.approvedUploads || 0;
  const downloads = stats.downloadsCount || 0;
  const reviews = stats.reviewsCount || 0;
  const insights = stats.insightsCount || 0;

  const score = (approved * 20) + (downloads * 2) + (reviews * 10) + (insights * 15);

  let label = "Contributor";
  if (score >= 1500) label = "Legendary Contributor";
  else if (score >= 500) label = "Top Mentor";
  else if (score >= 100) label = "Trusted Contributor";

  return { score, label };
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-upload",
    name: "First Landmark",
    description: "Upload your first study material",
    category: "upload",
    unlockType: "companion",
    unlockId: "paper-duck",
    unlockName: "🦆 Paper Duck",
    check: (s) => (s.uploadsCount || 0) >= 1
  },
  {
    id: "uploads-10",
    name: "Knowledge Contributor",
    description: "Contribute 10 study materials",
    category: "upload",
    unlockType: "frame",
    unlockId: "bronze",
    unlockName: "🥉 Bronze Frame",
    check: (s) => (s.uploadsCount || 0) >= 10
  },
  {
    id: "uploads-25",
    name: "Dedicated Scholar",
    description: "Contribute 25 study materials",
    category: "upload",
    unlockType: "companion",
    unlockId: "floating-book",
    unlockName: "📚 Floating Book",
    check: (s) => (s.uploadsCount || 0) >= 25
  },
  {
    id: "uploads-50",
    name: "Expert Contributor",
    description: "Contribute 50 study materials",
    category: "upload",
    unlockType: "frame",
    unlockId: "gold",
    unlockName: "🥇 Gold Frame",
    check: (s) => (s.uploadsCount || 0) >= 50
  },
  {
    id: "uploads-100",
    name: "Elite Mentor",
    description: "Contribute 100 study materials",
    category: "upload",
    unlockType: "companion",
    unlockId: "electric-orb",
    unlockName: "⚡ Electric Orb",
    check: (s) => (s.uploadsCount || 0) >= 100
  },
  {
    id: "uploads-250",
    name: "Cosmic Librarian",
    description: "Contribute 250 study materials",
    category: "upload",
    unlockType: "frame",
    unlockId: "galaxy",
    unlockName: "🌌 Galaxy Frame",
    check: (s) => (s.uploadsCount || 0) >= 250
  },
  {
    id: "uploads-500",
    name: "Legendary Pioneer",
    description: "Contribute 500 study materials",
    category: "upload",
    unlockType: "frame",
    unlockId: "legendary",
    unlockName: "🏆 Legendary Frame",
    check: (s) => (s.uploadsCount || 0) >= 500
  },
  {
    id: "career-dna-complete",
    name: "Future Prepared",
    description: "Complete your Career DNA onboarding process",
    category: "other",
    unlockType: "frame",
    unlockId: "scholar",
    unlockName: "🎓 Scholar Frame",
    check: (s) => !!s.careerDnaCompleted
  },
  {
    id: "ats-resume-uploaded",
    name: "Career Strategist",
    description: "Upload and analyze your resume via ATS Analyzer",
    category: "other",
    unlockType: "companion",
    unlockId: "purple-crystal",
    unlockName: "💜 Purple Crystal",
    check: (s) => !!s.atsResumeUploaded
  },
  {
    id: "top-10-leaderboard",
    name: "Top Ranked",
    description: "Reach the Top 10 on the global leaderboard",
    category: "other",
    unlockType: "effect",
    unlockId: "galaxy-dust",
    unlockName: "✨ Galaxy Dust Profile Effect",
    check: (s) => !!s.isInTop10
  }
];

export const FRAMES = [
  { id: "none", name: "None", class: "" },
  { id: "classic", name: "Classic", class: "border-gray-500/30" },
  { id: "purple-glow", name: "Purple Glow", class: "border-purple-500 shadow-[0_0_10px_#a855f7]" },
  { id: "neon", name: "Neon", class: "border-cyan-400 shadow-[0_0_10px_#22d3ee]" },
  { id: "scholar", name: "Scholar", class: "border-indigo-500 shadow-[0_0_10px_#6366f1]" },
  { id: "galaxy", name: "Galaxy", class: "border-fuchsia-500 shadow-[0_0_15px_#d946ef]" },
  { id: "fire", name: "Fire", class: "border-orange-500 shadow-[0_0_15px_#f97316]" },
  { id: "ice", name: "Ice", class: "border-sky-400 shadow-[0_0_15px_#38bdf8]" },
  { id: "rainbow", name: "Rainbow", class: "border-transparent bg-clip-border bg-gradient-to-r from-red-500 via-green-500 to-blue-500" },
  { id: "diamond", name: "Diamond", class: "border-slate-100 shadow-[0_0_15px_rgba(255,255,255,0.7)]" },
  { id: "minimal", name: "Minimal", class: "border-white/20" },
  { id: "bronze", name: "Bronze", class: "border-amber-700 shadow-[0_0_8px_rgba(180,83,9,0.5)]" },
  { id: "silver", name: "Silver", class: "border-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.6)]" },
  { id: "gold", name: "Gold", class: "border-yellow-500 shadow-[0_0_15px_#eab308]" },
  { id: "legendary", name: "Legendary Gold Crown", class: "border-yellow-400 shadow-[0_0_20px_#eab308]" }
];

export const COMPANIONS = [
  { id: "none", name: "None", emoji: "" },
  { id: "paper-duck", name: "🦆 Paper Duck", emoji: "🦆" },
  { id: "floating-book", name: "📚 Floating Book", emoji: "📚" },
  { id: "lucky-star", name: "⭐ Lucky Star", emoji: "⭐" },
  { id: "butterfly", name: "🦋 Butterfly", emoji: "🦋" },
  { id: "purple-crystal", name: "💜 Purple Crystal", emoji: "💜" },
  { id: "electric-orb", name: "⚡ Electric Orb", emoji: "⚡" },
  { id: "moon-spirit", name: "🌙 Moon Spirit", emoji: "🌙" },
  { id: "mini-penguin", name: "🐧 Mini Penguin", emoji: "🐧" },
  { id: "graduation-cap", name: "🎓 Graduation Cap", emoji: "🎓" }
];

export const BACKGROUNDS = [
  { id: "default", name: "Default Glow", style: "bg-radial" },
  { id: "library", name: "Old Library", style: "bg-library" },
  { id: "galaxy", name: "Cosmic Galaxy", style: "bg-galaxy" },
  { id: "coding-room", name: "Coding Room", style: "bg-coding" },
  { id: "ai-lab", name: "AI Laboratory", style: "bg-ai" },
  { id: "purple-neon", name: "Purple Neon", style: "bg-neon" },
  { id: "coffee-desk", name: "Coffee Desk", style: "bg-coffee" }
];

export const EFFECTS = [
  { id: "none", name: "None" },
  { id: "purple-glow", name: "Purple Glow" },
  { id: "sparkles", name: "Sparkles" },
  { id: "fireflies", name: "Fireflies" },
  { id: "snow", name: "Snowfall" },
  { id: "galaxy-dust", name: "Galaxy Dust" },
  { id: "code-rain", name: "Matrix Code Rain" }
];
