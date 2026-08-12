import { NextResponse } from 'next/server';
import { verifyServerAuth } from '@/lib/auth-verify';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

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
      return NextResponse.json({ error: 'Unauthorized: Auth token required' }, { status: 401 });
    }

    let authUser;
    try {
      authUser = await verifyServerAuth(authHeader);
    } catch (e: any) {
      console.error('[challenge-submit] Auth error:', e);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    if (!authUser || !authUser.uid) {
      return NextResponse.json({ error: 'Unauthorized: User authentication failed' }, { status: 401 });
    }

    const { uid } = authUser;
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const { sessionId, gameData } = body;

    if (!sessionId || !gameData) {
      return NextResponse.json({ error: 'Missing required parameters: sessionId or gameData' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Server database connection failed' }, { status: 500 });
    }

    // 1. Fetch Session Doc from adminDb
    const sessionDocRef = adminDb.collection('challenge_sessions').doc(sessionId);
    const sessionSnap = await sessionDocRef.get();

    if (!sessionSnap.exists) {
      return NextResponse.json({ error: 'Challenge session not found' }, { status: 404 });
    }

    const session = sessionSnap.data() || {};

    if (session.userId !== uid) {
      return NextResponse.json({ error: 'Unauthorized session access' }, { status: 403 });
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json({ error: 'Challenge session has already been completed' }, { status: 409 });
    }

    const { gameId, challengeDate, weekId, isOfficial } = session;
    const startedAt = session.startedAt ? session.startedAt.toDate() : new Date();
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // 2. Validate submission & calculate score server-side
    const seedNum = getSeed(`${gameId}-${challengeDate}`);
    const rand = mulberry32(seedNum);

    let score = 0;

    if (gameId === 'code-breaker') {
      const code: number[] = [];
      const digits = [0, 1, 2, 3, 4, 5, 6, 7];
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(rand() * digits.length);
        code.push(digits[idx]);
        digits.splice(idx, 1);
      }
      
      const { attempts = [], finalGuess = [] } = gameData;
      const isCorrect = code.join('') === finalGuess.join('');
      if (isCorrect) {
        const attemptsUsed = attempts.length || 1;
        const maxAttempts = 10;
        const speedBonus = Math.max(0, Math.floor((120000 - durationMs) / 1000));
        score = Math.max(0, (maxAttempts - attemptsUsed) * 100 + speedBonus);
      }
    } else if (gameId === 'memory-matrix') {
      const rounds: string[][] = [];
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
        rounds.push(pattern);
      }

      const userRounds = gameData.rounds || [];
      let totalCorrect = 0;
      userRounds.forEach((ur: any, idx: number) => {
        const expectedPattern = rounds[idx] || [];
        const selected = ur.selected || [];
        selected.forEach((cell: number[]) => {
          const cellStr = `${cell[0]},${cell[1]}`;
          if (expectedPattern.includes(cellStr)) {
            totalCorrect++;
          }
        });
      });
      score = totalCorrect * 10;
    } else if (gameId === 'impossible-room') {
      const clues: string[] = [];
      for (let i = 0; i < 5; i++) {
        clues.push(`clue-${Math.floor(rand() * 1000)}`);
      }
      const lockCode = Array.from({length: 4}, () => Math.floor(rand() * 10)).join('');
      
      const { cluesFound = [], lockCode: userLockCode = '' } = gameData;
      let validClues = 0;
      cluesFound.forEach((c: string) => {
        if (clues.includes(c)) validClues++;
      });
      score = validClues * 200 + (userLockCode === lockCode ? 500 : 0);
    } else if (gameId === 'word-forge') {
      const correctAnswers: string[] = [];
      for (let r = 0; r < 6; r++) {
        const wordIdx = Math.floor(rand() * WORD_LIST.length);
        correctAnswers.push(WORD_LIST[wordIdx]);
      }
      
      const userAnswers = gameData.answers || [];
      let correct = 0;
      userAnswers.forEach((ans: string, idx: number) => {
        if (ans && correctAnswers[idx] && ans.trim().toLowerCase() === correctAnswers[idx].toLowerCase()) {
          correct++;
        }
      });
      score = correct * 150;
    }

    // 3. Mark session as completed
    await sessionDocRef.update({
      status: 'completed',
      completedAt: admin.firestore.Timestamp.fromDate(completedAt),
      score,
      durationMs
    });

    // 4. Fetch user profile for avatar/displayName
    let displayName = 'Student';
    let paperinoAvatar = '';
    
    try {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      if (userSnap.exists) {
        const uData = userSnap.data() || {};
        displayName = uData.displayName || 'Student';
        paperinoAvatar = uData.paperinoAvatar || '';
      }
    } catch (e) {
      console.warn('[challenge-submit] User profile lookup error:', e);
    }

    // 5. Create result document
    const resultDocId = `${sessionId}-res`;
    await adminDb.collection('challenge_results').doc(resultDocId).set({
      userId: uid,
      displayName,
      paperinoAvatar,
      gameId,
      challengeDate,
      weekId,
      startedAt: admin.firestore.Timestamp.fromDate(startedAt),
      completedAt: admin.firestore.Timestamp.fromDate(completedAt),
      durationMs,
      score,
      isOfficial: Boolean(isOfficial),
      createdAt: admin.firestore.Timestamp.fromDate(completedAt)
    });

    // 6. Query Top 10 Leaderboard via adminDb
    const topResultsSnap = await adminDb.collection('challenge_results')
      .where('gameId', '==', gameId)
      .where('weekId', '==', weekId)
      .where('isOfficial', '==', true)
      .orderBy('score', 'desc')
      .orderBy('durationMs', 'asc')
      .limit(10)
      .get();

    const leaderboard: any[] = [];
    let rankCounter = 1;
    let userRank = null;

    topResultsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.userId === uid) {
        userRank = rankCounter;
      }
      leaderboard.push({
        userId: data.userId,
        displayName: data.displayName || 'Anonymous',
        paperinoAvatar: data.paperinoAvatar || '',
        score: data.score || 0,
        durationMs: data.durationMs || 0,
        rank: rankCounter++
      });
    });

    // Calculate user rank if outside top 10
    if (userRank === null && isOfficial) {
      const higherScoresSnap = await adminDb.collection('challenge_results')
        .where('gameId', '==', gameId)
        .where('weekId', '==', weekId)
        .where('isOfficial', '==', true)
        .where('score', '>', score)
        .get();
      userRank = higherScoresSnap.size + 1;
    }

    return NextResponse.json({
      success: true,
      score,
      durationMs,
      completedAt: completedAt.toISOString(),
      rank: userRank || 1,
      leaderboard,
      isOfficial
    });

  } catch (error: any) {
    console.error('[challenge-submit] Uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
