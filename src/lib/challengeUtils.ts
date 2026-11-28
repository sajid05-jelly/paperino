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
    description: 'Memorize flashing cell tiles and reconstruct the pattern without errors',
    icon: 'Grid',
    color: 'text-blue-400',
    badge: 'Spatial Memory',
  },
  'impossible-room': {
    name: 'Impossible Room',
    description: 'Decode cryptic room clues and riddle constraints before time expires',
    icon: 'DoorOpen',
    color: 'text-purple-400',
    badge: 'Escape Reasoning',
  },
  'word-forge': {
    name: 'Word Forge',
    description: 'Forge technical words and vocabulary from anagram letter combinations',
    icon: 'Type',
    color: 'text-orange-400',
    badge: 'Lexical Speed',
  },
  'target-number': {
    name: 'Target Number',
    description: 'Combine arithmetic operations to hit the exact target number',
    icon: 'Target',
    color: 'text-red-400',
    badge: 'Mental Arithmetic',
  },
  'memory-heist': {
    name: 'Memory Heist',
    description: 'Memorize the security keypad sequence and bypass the high-tech vault',
    icon: 'Brain',
    color: 'text-cyan-400',
    badge: 'Memory Sequence',
  },
  'the-impostor': {
    name: 'The Impostor',
    description: 'Examine suspicious code anomalies and isolate the impostor data item',
    icon: 'Search',
    color: 'text-yellow-400',
    badge: 'Deductive Logic',
  },
  'paradox': {
    name: 'Paradox',
    description: 'Adapt instantly to contradictory rule shifts and rapid-fire visual logic',
    icon: 'Zap',
    color: 'text-pink-400',
    badge: 'Cognitive Agility',
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

export function getKolkataDateParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }
  const dayIndexMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayIndexMap[partMap.weekday] ?? 0;
  const hour = parseInt(partMap.hour, 10) || 0;
  const minute = parseInt(partMap.minute, 10) || 0;
  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const dayOfMonth = partMap.day || '01';
  return {
    day,
    hour,
    minute,
    minutesSinceMidnight: hour * 60 + minute,
    dateString: `${year}-${month}-${dayOfMonth}`,
  };
}

export function getCurrentChallengeWeek(): string {
  const date = new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export function getChallengeDate(date: Date = new Date()): string {
  const { dateString } = getKolkataDateParts(date);
  return dateString;
}

export function isChallengeDay(availableDays: number[], date: Date = new Date()): boolean {
  if (!Array.isArray(availableDays)) return true;
  if (availableDays.length === 0) return false;
  const { day } = getKolkataDateParts(date);
  return availableDays.includes(day);
}

export function isChallengeHour(openTime?: string, closeTime?: string, date: Date = new Date()): boolean {
  if (!openTime || !closeTime) return true;
  const { minutesSinceMidnight } = getKolkataDateParts(date);
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const openMins = (isNaN(oh) ? 0 : oh) * 60 + (isNaN(om) ? 0 : om);
  const closeMins = (isNaN(ch) ? 23 : ch) * 60 + (isNaN(cm) ? 59 : cm);

  if (openMins <= closeMins) {
    return minutesSinceMidnight >= openMins && minutesSinceMidnight <= closeMins;
  }
  // Overnight schedule (e.g. 20:00 to 02:00)
  return minutesSinceMidnight >= openMins || minutesSinceMidnight <= closeMins;
}

export function isChallengeScheduleActive(
  availableDays: number[],
  openTime?: string,
  closeTime?: string,
  date: Date = new Date()
): boolean {
  if (!Array.isArray(availableDays) || availableDays.length === 0) return false;

  const { day, minutesSinceMidnight } = getKolkataDateParts(date);

  const [oh, om] = (openTime || '00:00').split(':').map(Number);
  const [ch, cm] = (closeTime || '23:59').split(':').map(Number);
  const openMins = (isNaN(oh) ? 0 : oh) * 60 + (isNaN(om) ? 0 : om);
  const closeMins = (isNaN(ch) ? 23 : ch) * 60 + (isNaN(cm) ? 59 : cm);

  if (openMins <= closeMins) {
    // Normal same-day schedule
    const dayMatches = availableDays.includes(day);
    const hourMatches = minutesSinceMidnight >= openMins && minutesSinceMidnight <= closeMins;
    return dayMatches && hourMatches;
  } else {
    // Overnight window (e.g. 20:00 to 04:00)
    // Active if:
    // 1) Today is in availableDays AND minutes >= openMins
    // OR
    // 2) Yesterday was in availableDays AND minutes <= closeMins
    const yesterday = (day + 6) % 7;
    const isStartedTonight = availableDays.includes(day) && minutesSinceMidnight >= openMins;
    const isOvernightSpill = availableDays.includes(yesterday) && minutesSinceMidnight <= closeMins;
    return isStartedTonight || isOvernightSpill;
  }
}

export function getNextChallengeDay(availableDays: number[], date: Date = new Date()): Date | null {
  if (!Array.isArray(availableDays) || availableDays.length === 0) return null;
  const { day } = getKolkataDateParts(date);

  let daysToAdd = 1;
  while (daysToAdd <= 7) {
    const nextDay = (day + daysToAdd) % 7;
    if (availableDays.includes(nextDay)) {
      break;
    }
    daysToAdd++;
  }

  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + daysToAdd);
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
