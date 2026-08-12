import { NextResponse } from 'next/server';
import { verifyServerAuth } from '@/lib/auth-verify';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import crypto from 'crypto';

const VALID_GAMES = ['code-breaker', 'memory-matrix', 'impossible-room', 'word-forge'];

const WORD_LIST = [
  'algorithm', 'binary', 'compiler', 'database', 'encrypt',
  'function', 'gateway', 'hardware', 'integer', 'javascript',
  'kernel', 'library', 'malware', 'network', 'optimize',
  'protocol', 'quantum', 'runtime', 'software', 'terminal',
  'unicode', 'virtual', 'webpack', 'syntax', 'boolean',
  'variable', 'iterate', 'modular', 'parsing', 'graphic',
  'machine', 'digital', 'storage', 'compute', 'encrypt',
  'browser', 'silicon', 'circuit', 'deploy', 'python',
  'tensor', 'neural', 'server', 'docker', 'devops',
  'kotlin', 'github', 'struct', 'lambda', 'cursor'
];

function getISOWeekId(date: Date): string {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${target.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function getSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Auth header missing' }, { status: 401 });
    }

    let authUser;
    try {
      authUser = await verifyServerAuth(authHeader);
    } catch (e: any) {
      console.error("[challenge-start] Token verification error:", e);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    if (!authUser || !authUser.uid) {
      return NextResponse.json({ error: 'Unauthorized: User authentication required' }, { status: 401 });
    }

    const { uid } = authUser;
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const { gameId } = body;

    if (!gameId || !VALID_GAMES.includes(gameId)) {
      return NextResponse.json({ error: 'Invalid gameId parameter' }, { status: 400 });
    }

    const now = new Date();
    const challengeDate = now.toISOString().split('T')[0];
    const weekId = getISOWeekId(now);
    
    // Check config via adminDb if available
    if (adminDb) {
      try {
        const configDoc = await adminDb.collection("settings").doc("weeklyChallenges").get();
        if (configDoc.exists) {
          const cfg = configDoc.data() || {};
          if (cfg.enabled === false) {
            return NextResponse.json({ error: 'Weekly challenges are currently disabled' }, { status: 403 });
          }
          if (cfg.maintenanceMode === true) {
            return NextResponse.json({ error: 'Weekly challenges are currently under maintenance' }, { status: 403 });
          }
          if (cfg.activeGames && Array.isArray(cfg.activeGames) && cfg.activeGames.length > 0 && !cfg.activeGames.includes(gameId)) {
            return NextResponse.json({ error: 'This game is currently disabled by admin' }, { status: 403 });
          }
          if (cfg.availableDays && Array.isArray(cfg.availableDays) && cfg.availableDays.length > 0 && !cfg.availableDays.includes(now.getDay())) {
            return NextResponse.json({ error: 'Weekly challenges are not available today' }, { status: 403 });
          }
        }
      } catch (err) {
        console.warn("[challenge-start] Config check warning:", err);
      }
    }

    // Check official attempts
    let isOfficial = true;
    if (adminDb) {
      try {
        const existingSessions = await adminDb.collection("challenge_sessions")
          .where("userId", "==", uid)
          .where("gameId", "==", gameId)
          .where("challengeDate", "==", challengeDate)
          .where("isOfficial", "==", true)
          .limit(1)
          .get();

        if (!existingSessions.empty) {
          isOfficial = false;
        }
      } catch (err) {
        console.warn("[challenge-start] Attempt check warning:", err);
      }
    }

    const sessionId = crypto.randomUUID();

    const sessionData = {
      userId: uid,
      gameId,
      challengeDate,
      weekId,
      startedAt: admin.firestore.Timestamp.now(),
      status: 'in_progress',
      isOfficial,
      createdAt: admin.firestore.Timestamp.now()
    };

    if (adminDb) {
      await adminDb.collection("challenge_sessions").doc(sessionId).set(sessionData);
    } else {
      console.error("[challenge-start] adminDb not initialized");
      return NextResponse.json({ error: 'Server database connection failed' }, { status: 500 });
    }

    const seedNum = getSeed(`${gameId}-${challengeDate}`);
    const rand = mulberry32(seedNum);

    let puzzleData: any = {};

    if (gameId === 'code-breaker') {
      puzzleData = { numDigits: 4, range: [0, 7] };
    } else if (gameId === 'memory-matrix') {
      const rounds = [];
      for (let r = 0; r < 5; r++) {
        const pattern: string[] = [];
        const numCells = 3 + r;
        while (pattern.length < numCells) {
          const rRow = Math.floor(rand() * 4);
          const rCol = Math.floor(rand() * 4);
          const cellStr = `${rRow},${rCol}`;
          if (!pattern.includes(cellStr)) {
            pattern.push(cellStr);
          }
        }
        rounds.push({ pattern: pattern.map(s => s.split(',').map(Number)) });
      }
      puzzleData = { rounds };
    } else if (gameId === 'impossible-room') {
      const roomElements = [
        { id: 'desk', name: 'Desk' },
        { id: 'painting', name: 'Painting' },
        { id: 'bookshelf', name: 'Bookshelf' },
        { id: 'safe', name: 'Safe' },
        { id: 'rug', name: 'Rug' }
      ];
      puzzleData = { roomElements };
    } else if (gameId === 'word-forge') {
      const rounds = [];
      for (let r = 0; r < 6; r++) {
        const wordIdx = Math.floor(rand() * WORD_LIST.length);
        const word = WORD_LIST[wordIdx];
        const chars = word.split('');
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        rounds.push({ scrambled: chars.join(''), length: word.length });
      }
      puzzleData = { rounds };
    }

    return NextResponse.json({
      sessionId,
      gameId,
      challengeDate,
      weekId,
      isOfficial,
      puzzleData
    });
  } catch (error: any) {
    console.error('challenge-start uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
