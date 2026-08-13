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

    let gameId = '';
    let challengeDate = '';
    let challengeId = '';
    let weekId = '';
    let isOfficial = false;
    let startedAt = new Date();
    const completedAt = new Date();
    let isLocalFallback = sessionId.startsWith('local-fallback-');

    if (isLocalFallback) {
      // Decode simulated local fallback values
      gameId = body.gameData?.gameId || 'code-breaker';
      const now = new Date();
      challengeDate = now.toISOString().split('T')[0];
      challengeId = `${gameId}-${challengeDate}`;
      weekId = getISOWeekId(now);
      isOfficial = false;
      const clientDuration = body.gameData?.durationMs || 10000;
      startedAt = new Date(completedAt.getTime() - clientDuration);
    } else {
      // 1. Fetch Session Doc from adminDb
      const sessionDocRef = adminDb.collection('challenge_sessions').doc(sessionId);
      let sessionSnap;
      try {
        sessionSnap = await sessionDocRef.get();
      } catch (err: any) {
        console.warn("[challenge-submit] session retrieval failed due to quota limit, resolving via fallback:", err.message);
        isLocalFallback = true;
        gameId = body.gameData?.gameId || 'code-breaker';
        const now = new Date();
        challengeDate = now.toISOString().split('T')[0];
        challengeId = `${gameId}-${challengeDate}`;
        weekId = getISOWeekId(now);
        isOfficial = false;
        const clientDuration = body.gameData?.durationMs || 10000;
        startedAt = new Date(completedAt.getTime() - clientDuration);
      }

      if (!isLocalFallback) {
        if (!sessionSnap || !sessionSnap.exists) {
          return NextResponse.json({ error: 'Challenge session not found' }, { status: 404 });
        }

        const session = sessionSnap.data() || {};

        if (session.userId !== uid) {
          return NextResponse.json({ error: 'Unauthorized session access' }, { status: 403 });
        }

        if (session.status !== 'in_progress') {
          return NextResponse.json({ error: 'Challenge session has already been completed' }, { status: 409 });
        }

        gameId = session.gameId;
        challengeDate = session.challengeDate;
        challengeId = session.challengeId || `${gameId}-${challengeDate}`;
        weekId = session.weekId;
        isOfficial = session.isOfficial;
        startedAt = session.startedAt ? session.startedAt.toDate() : new Date();
      }
    }

    // Atomic double submission guard on result
    if (adminDb && isOfficial) {
      const existingResults = await adminDb.collection("challenge_results")
        .where("userId", "==", uid)
        .where("challengeId", "==", challengeId)
        .where("isOfficial", "==", true)
        .limit(1)
        .get();

      if (!existingResults.empty) {
        return NextResponse.json({ error: 'Challenge already submitted' }, { status: 409 });
      }
    }

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
      const isCorrect = code.length === finalGuess.length && code.every((d, idx) => d === finalGuess[idx]);
      if (isCorrect) {
        const guessCount = attempts.length || 1;
        const durationSeconds = durationMs / 1000;
        const baseScore = 100;
        const timePenalty = Math.min(60, Math.floor(durationSeconds / 2));
        const guessPenalty = Math.min(30, (guessCount - 1) * 5);
        const rawScore = baseScore - timePenalty - guessPenalty;
        score = Math.max(10, Math.min(100, rawScore));
      }
    } else if (gameId === 'memory-matrix') {
      const rounds: string[][] = [];
      const ROUND_CONFIGS = [
        { round: 1, size: 3, targets: 3 },
        { round: 2, size: 4, targets: 4 },
        { round: 3, size: 5, targets: 6 },
        { round: 4, size: 6, targets: 8 },
        { round: 5, size: 7, targets: 10 },
      ];
      for (let r = 0; r < 5; r++) {
        const cfg = ROUND_CONFIGS[r];
        const pattern: string[] = [];
        while (pattern.length < cfg.targets) {
          const rRow = Math.floor(rand() * cfg.size);
          const rCol = Math.floor(rand() * cfg.size);
          const cellStr = `${rRow},${rCol}`;
          if (!pattern.includes(cellStr)) {
            pattern.push(cellStr);
          }
        }
        rounds.push(pattern);
      }

      const userRounds = gameData.rounds || [];
      let accumulatedScore = 0;
      
      userRounds.forEach((ur: any, idx: number) => {
        const expectedPattern = rounds[idx] || [];
        const totalTargets = expectedPattern.length;
        if (totalTargets === 0) return;
        
        const selected = ur.selected || [];
        let correctCount = 0;
        
        selected.forEach((cell: any) => {
          const cellStr = Array.isArray(cell) ? `${cell[0]},${cell[1]}` : String(cell);
          if (expectedPattern.includes(cellStr)) {
            correctCount++;
          }
        });

        // 20 max points per round (20 * correct / totalTargets)
        const roundContribution = (correctCount / totalTargets) * 20;
        accumulatedScore += roundContribution;
      });

      // Clamp score to a maximum of 100
      score = Math.max(0, Math.min(100, Math.round(accumulatedScore)));
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
      const FIXED_CORRECT_ANSWERS = ['RATE', 'COMPUTER', 'DATABASE', 'SYNTAX', 'ALGORITHM', 'COMPILER'];
      const userAnswers = gameData.answers || [];
      const times = gameData.times || []; // actual seconds spent per round
      
      let correctCount = 0;
      let totalTimeSpeedBonusSum = 0;

      FIXED_CORRECT_ANSWERS.forEach((expectedAns, idx) => {
        const userAns = userAnswers[idx];
        if (userAns && userAns.trim().toUpperCase() === expectedAns) {
          correctCount++;
          
          // Speed Bonus calculation per correct round:
          // Maximum round time limit is 30s.
          const roundTimeSpent = times[idx] !== undefined ? Number(times[idx]) : 15;
          // Faster answers get higher bonuses:
          // Very fast (< 5s): +5 bonus
          // Fast (< 10s): +4 bonus
          // Normal (< 18s): +3 bonus
          // Slow (< 25s): +1 bonus
          // Over 25s: +0 bonus
          let speedBonus = 0;
          if (roundTimeSpent < 5) speedBonus = 5;
          else if (roundTimeSpent < 10) speedBonus = 4;
          else if (roundTimeSpent < 18) speedBonus = 3;
          else if (roundTimeSpent < 25) speedBonus = 1;
          
          totalTimeSpeedBonusSum += speedBonus;
        }
      });

      // 6 rounds total.
      // Base Score = (correctCount / 6) * 70 points
      const accuracyScore = (correctCount / 6) * 70;
      
      // Speed Score = speed bonus contribution up to 30 points max
      // Each correct round gives max 5 speed points (6 rounds * 5 = 30 max points)
      const speedScore = totalTimeSpeedBonusSum;

      // Normalise final score out of 100
      score = Math.max(0, Math.min(100, Math.round(accuracyScore + speedScore)));
    }

    // === PARALLEL BATCH 1: Session update + User profile fetch at the same time ===
    let displayName = 'Student';
    let paperinoAvatar = '';

    if (adminDb) {
      const sessionUpdatePromise = !isLocalFallback
        ? adminDb.collection('challenge_sessions').doc(sessionId).update({
            status: 'completed',
            completedAt: admin.firestore.Timestamp.fromDate(completedAt),
            score,
            durationMs
          }).catch((err: any) => {
            console.warn("[challenge-submit] failed to update session:", err.message);
          })
        : Promise.resolve();

      const userProfilePromise = adminDb.collection('users').doc(uid).get().catch((e: any) => {
        console.warn('[challenge-submit] User profile lookup error:', e);
        return null;
      });

      const [, userSnap] = await Promise.all([sessionUpdatePromise, userProfilePromise]);

      if (userSnap && userSnap.exists) {
        const uData = userSnap.data() || {};
        displayName = uData.displayName || 'Student';
        paperinoAvatar = uData.paperinoAvatar || '';
      }
    }

    // === PARALLEL BATCH 2: Result write + Leaderboard query at the same time ===
    const leaderboard: any[] = [];
    let userRank: number | null = null;

    if (adminDb) {
      const resultDocId = `${sessionId}-res`;
      const resultWritePromise = adminDb.collection('challenge_results').doc(resultDocId).set({
        userId: uid,
        displayName,
        paperinoAvatar,
        gameId,
        challengeId,
        challengeDate,
        weekId,
        startedAt: admin.firestore.Timestamp.fromDate(startedAt),
        completedAt: admin.firestore.Timestamp.fromDate(completedAt),
        durationMs,
        score,
        isOfficial: Boolean(isOfficial),
        createdAt: admin.firestore.Timestamp.fromDate(completedAt)
      }).catch((err: any) => {
        console.warn("[challenge-submit] failed to write result doc:", err.message);
      });

      // Query results from challengeId leaderboard: Sorted by score (desc), then durationMs (asc)
      const leaderboardPromise = adminDb.collection('challenge_results')
        .where('challengeId', '==', challengeId)
        .where('isOfficial', '==', true)
        .orderBy('score', 'desc')
        .orderBy('durationMs', 'asc')
        .limit(10)
        .get()
        .catch((err: any) => {
          console.warn("[challenge-submit] leaderboard retrieval failed:", err.message);
          return null;
        });

      const [, topResultsSnap] = await Promise.all([resultWritePromise, leaderboardPromise]);

      if (topResultsSnap) {
        let rankCounter = 1;
        topResultsSnap.forEach((docSnap: any) => {
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

        // Dynamic ranking logic: count how many users completed challengeId with either higher score or equal score with faster durationMs
        if (userRank === null && isOfficial) {
          try {
            const allResultsSnap = await adminDb.collection('challenge_results')
              .where('challengeId', '==', challengeId)
              .where('isOfficial', '==', true)
              .get();
            
            let rankCalculated = 1;
            allResultsSnap.forEach((docSnap: any) => {
              const data = docSnap.data();
              if (data.userId === uid) return; // skip self
              
              if (data.score > score) {
                rankCalculated++;
              } else if (data.score === score && data.durationMs < durationMs) {
                rankCalculated++;
              }
            });
            userRank = rankCalculated;
          } catch (err: any) {
            console.warn("[challenge-submit] rank calculation failed:", err.message);
          }
        }
      }
    }

    if (leaderboard.length === 0) {
      userRank = null;
    }

    return NextResponse.json({
      success: true,
      score,
      durationMs,
      completedAt: completedAt.toISOString(),
      rank: isOfficial ? (userRank || 1) : null,
      leaderboard,
      isOfficial
    });

  } catch (error: any) {
    console.error('[challenge-submit] Uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
