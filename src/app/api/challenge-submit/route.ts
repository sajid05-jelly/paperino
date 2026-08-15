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
    let isCompletedSuccessfully = false;
    let maxAllowedTimeMs = 300000; // Default 5 minutes

    if (gameId === 'code-breaker') {
      maxAllowedTimeMs = 180000; // 3 minutes (180s)
      const code: number[] = [];
      const digits = [0, 1, 2, 3, 4, 5, 6, 7];
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(rand() * digits.length);
        code.push(digits[idx]);
        digits.splice(idx, 1);
      }
      
      const { attempts = [], finalGuess = [] } = gameData;
      const numCode = code.map(Number);
      const numFinalGuess = (Array.isArray(finalGuess) ? finalGuess : []).map(Number);
      const isCorrect = numCode.length === 4 && 
                        numFinalGuess.length === 4 && 
                        numCode.every((d, idx) => d === numFinalGuess[idx]);
      
      // If code matches generated code OR valid final guess submitted
      if (isCorrect || (Array.isArray(attempts) && attempts.length > 0)) {
        isCompletedSuccessfully = true;
      }
    } else if (gameId === 'memory-matrix') {
      maxAllowedTimeMs = 180000; // 3 minutes (180s)
      const userRounds = gameData.rounds || [];
      // If user played through the 5 memory rounds
      if (Array.isArray(userRounds) && userRounds.length >= 1) {
        isCompletedSuccessfully = true;
      }
    } else if (gameId === 'impossible-room') {
      maxAllowedTimeMs = 300000; // 5 minutes (300s)
      const { cluesFound = [], lockCode: userLockCode = '' } = gameData;
      // Room Safe Escape: entered 4 digits code
      if (typeof userLockCode === 'string' && userLockCode.trim().length === 4) {
        isCompletedSuccessfully = true;
      }
    } else if (gameId === 'word-forge') {
      maxAllowedTimeMs = 180000; // 6 rounds * 30s = 180s
      const userAnswers = gameData.answers || [];
      if (Array.isArray(userAnswers) && userAnswers.length > 0) {
        isCompletedSuccessfully = true;
      }
    }

    if (isCompletedSuccessfully) {
      const completionScore = 50;
      const actualDuration = Math.max(1000, durationMs);
      const timeRatio = Math.max(0, 1 - (actualDuration / maxAllowedTimeMs));
      const timeScore = Math.max(0, Math.min(50, Math.round(50 * timeRatio)));
      score = Math.max(50, Math.min(100, completionScore + timeScore));
    } else {
      score = 0;
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

      // Await write first so the current user's result is included in ranking calculations
      await resultWritePromise;

      // Query all official results for this game's current challengeId to calculate accurate ranks
      try {
        const allResultsSnap = await adminDb.collection('challenge_results')
          .where('challengeId', '==', challengeId)
          .where('isOfficial', '==', true)
          .get();

        const allEntries: any[] = [];
        allResultsSnap.forEach((docSnap: any) => {
          const d = docSnap.data();
          allEntries.push({
            userId: d.userId,
            displayName: d.displayName || 'Anonymous',
            paperinoAvatar: d.paperinoAvatar || '',
            score: d.score || 0,
            durationMs: d.durationMs || 0,
            completedAt: d.completedAt ? (d.completedAt.toDate ? d.completedAt.toDate().getTime() : d.completedAt) : 0
          });
        });

        // Ranking Priority: Higher score first; if equal score, faster durationMs first; if still equal, earlier completion
        allEntries.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          if (a.durationMs !== b.durationMs) {
            return a.durationMs - b.durationMs;
          }
          return a.completedAt - b.completedAt;
        });

        // Assign ranks (1-indexed) and find current user's rank
        allEntries.forEach((entry, idx) => {
          const rank = idx + 1;
          if (entry.userId === uid) {
            userRank = rank;
          }
          // Public leaderboard shows ONLY Top 3
          if (rank <= 3) {
            leaderboard.push({
              userId: entry.userId,
              displayName: entry.displayName,
              paperinoAvatar: entry.paperinoAvatar,
              score: entry.score,
              durationMs: entry.durationMs,
              rank
            });
          }
        });
      } catch (err: any) {
        console.warn("[challenge-submit] ranking query failed:", err.message);
      }
    }

    // Default fallback if no other participants
    if (userRank === null && isOfficial) {
      userRank = 1;
    }

    if (isOfficial && leaderboard.length === 0) {
      leaderboard.push({
        userId: uid,
        displayName: displayName || 'Student',
        paperinoAvatar: paperinoAvatar || '',
        score,
        durationMs,
        rank: 1
      });
    }

    return NextResponse.json({
      success: true,
      score,
      durationMs,
      completedAt: completedAt.toISOString(),
      rank: isOfficial ? userRank : null,
      leaderboard,
      isOfficial
    });

  } catch (error: any) {
    console.error('[challenge-submit] Uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
