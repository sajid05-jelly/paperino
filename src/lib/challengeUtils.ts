export const ARENA_GAME_IDS = [
  'bug-hunter',
  'memory-rush',
  'typing-blitz',
  'number-detective',
  'logic-master',
  'code-breaker',
  'circuit-master',
] as const;

export const LEGACY_GAME_IDS = [
  'memory-matrix',
  'impossible-room',
  'word-forge',
  'target-number',
  'memory-heist',
  'the-impostor',
  'paradox',
] as const;

export const GAME_IDS = [
  ...ARENA_GAME_IDS,
  ...LEGACY_GAME_IDS,
] as const;

export type GameId = typeof GAME_IDS[number];

export const GAME_INFO: Record<GameId, { name: string; description: string; icon: string; color: string; badge?: string }> = {
  'bug-hunter': {
    name: 'Bug Hunter',
    description: 'Find and fix syntax, logic, and runtime code bugs',
    icon: 'Bug',
    color: 'text-rose-400',
    badge: 'Code Debugging',
  },
  'memory-rush': {
    name: 'Memory Rush',
    description: 'Match hidden tech stack and concept card pairs against the clock',
    icon: 'Sparkles',
    color: 'text-amber-400',
    badge: 'Visual Memory',
  },
  'typing-blitz': {
    name: 'Typing Blitz',
    description: 'Test your programming typing speed, rhythm, and accuracy',
    icon: 'Keyboard',
    color: 'text-cyan-400',
    badge: 'Speed & Accuracy',
  },
  'number-detective': {
    name: 'Number Detective',
    description: 'Crack algorithmic number sequences, patterns, and series',
    icon: 'Search',
    color: 'text-indigo-400',
    badge: 'Pattern Recognition',
  },
  'logic-master': {
    name: 'Logic Master',
    description: 'Solve visual reasoning, deduction, and algorithmic puzzles',
    icon: 'Brain',
    color: 'text-purple-400',
    badge: 'Spatial & Logic',
  },
  'code-breaker': {
    name: 'Code Breaker',
    description: 'Decode binary, hexadecimal, and programming logic puzzles',
    icon: 'Terminal',
    color: 'text-emerald-400',
    badge: 'Binary & Cryptography',
  },
  'circuit-master': {
    name: 'Circuit Master',
    description: 'Toggle logic gate inputs (AND, OR, NOT, XOR) to reach target outputs',
    icon: 'Cpu',
    color: 'text-fuchsia-400',
    badge: 'Digital Logic',
  },
  'memory-matrix': {
    name: 'Memory Matrix',
    description: 'Remember the pattern',
    icon: 'Grid',
    color: 'text-blue-400',
  },
  'impossible-room': {
    name: 'Impossible Room',
    description: 'Escape if you can',
    icon: 'DoorOpen',
    color: 'text-purple-400',
  },
  'word-forge': {
    name: 'Word Forge',
    description: 'Create words from letters',
    icon: 'Type',
    color: 'text-orange-400',
  },
  'target-number': {
    name: 'Target Number',
    description: 'Reach the target using math',
    icon: 'Target',
    color: 'text-red-400',
  },
  'memory-heist': {
    name: 'Memory Heist',
    description: 'Memorize and recall the scene',
    icon: 'Brain',
    color: 'text-cyan-400',
  },
  'the-impostor': {
    name: 'The Impostor',
    description: 'Find the impostor using clues',
    icon: 'Search',
    color: 'text-yellow-400',
  },
  'paradox': {
    name: 'Paradox',
    description: 'Follow the shifting instructions',
    icon: 'Zap',
    color: 'text-pink-400',
  },
};


export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function getCurrentChallengeWeek(): string {
  const date = new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export function getChallengeDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isChallengeDay(availableDays: number[]): boolean {
  const today = new Date().getDay();
  return availableDays.includes(today);
}

export function getNextChallengeDay(availableDays: number[]): Date {
  const now = new Date();
  const today = now.getDay();

  let daysToAdd = 1;
  while (daysToAdd <= 7) {
    const nextDay = (today + daysToAdd) % 7;
    if (availableDays.includes(nextDay)) {
      break;
    }
    daysToAdd++;
  }

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysToAdd);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function generateSeed(gameId: string, date: string): number {
  const str = `${gameId}-${date}`;
  let h = 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

export function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatDuration(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
