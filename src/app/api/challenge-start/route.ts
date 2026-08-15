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

/**
 * Build the public Top 3 leaderboard + compute user rank from challenge_results.
 * Scoped to the EXACT challengeId (= gameId + admin session key).
 */
async function buildLeaderboard(challengeId: string, currentUid: string): Promise<{
  leaderboard: any[];
  userRank: number | null;
}> {
  const leaderboard: any[] = [];
  let userRank: number | null = null;

  if (!adminDb) return { leaderboard, userRank };

  try {
    const allResultsSnap = await adminDb.collection('challenge_results')
      .where('challengeId', '==', challengeId)
      .where('isOfficial', '==', true)
      .get();

    const userBestMap = new Map<string, any>();
    allResultsSnap.forEach((docSnap: any) => {
      const d = docSnap.data();
      const entry = {
        userId: d.userId,
        displayName: d.displayName || 'Anonymous',
        paperinoAvatar: d.paperinoAvatar || '',
        score: d.score || 0,
        durationMs: d.durationMs || 0,
        completedAt: d.completedAt ? (d.completedAt.toDate ? d.completedAt.toDate().getTime() : d.completedAt) : 0
      };
      if (!userBestMap.has(d.userId)) {
        userBestMap.set(d.userId, entry);
      } else {
        const existing = userBestMap.get(d.userId);
        if (entry.score > existing.score || (entry.score === existing.score && entry.durationMs < existing.durationMs)) {
          userBestMap.set(d.userId, entry);
        }
      }
    });

    const allEntries = Array.from(userBestMap.values());

    allEntries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
      return a.completedAt - b.completedAt;
    });

    allEntries.forEach((entry, idx) => {
      const rank = idx + 1;
      if (entry.userId === currentUid) {
        userRank = rank;
      }
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
    console.warn("[buildLeaderboard] ranking query failed:", err.message);
  }

  return { leaderboard, userRank };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: Auth header missing' }, { status: 401 });
    }

    // Parse body immediately (no await needed before auth)
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

    // === PARALLEL BATCH 1: Auth + Config fetch at the same time ===
    const [authUser, configSnap] = await Promise.all([
      verifyServerAuth(authHeader).catch((e: any) => {
        console.error("[challenge-start] Token verification error:", e);
        return null;
      }),
      adminDb
        ? adminDb.collection("settings").doc("weeklyChallenges").get().catch(() => null)
        : Promise.resolve(null)
    ]);

    if (!authUser || !authUser.uid) {
      return NextResponse.json({ error: 'Unauthorized: User authentication required' }, { status: 401 });
    }

    const { uid } = authUser;

    // Process config
    let isOfficial = true;
    let isAdminBypass = false;
    let challengeId = `${gameId}-${challengeDate}`; // Default fallback

    if (configSnap && configSnap.exists) {
      const cfg = configSnap.data() || {};
      const isUserAdmin = authUser.email?.toLowerCase() === "mohamedsajid.sa@gmail.com" || authUser.role === "admin" || (authUser as any).admin === true;
      isAdminBypass = Boolean(isUserAdmin && cfg.adminTestMode === true);

      // ChallengeId priority: challengeSessionId > currentChallengeId > currentWeek > date fallback
      if (cfg.challengeSessionId) {
        challengeId = `${gameId}-${cfg.challengeSessionId}`;
      } else if (cfg.currentChallengeId) {
        challengeId = `${gameId}-${cfg.currentChallengeId}`;
      } else if (cfg.currentWeek) {
        challengeId = `${gameId}-${cfg.currentWeek}`;
      }

      if (cfg.enabled === false && !isAdminBypass) {
        return NextResponse.json({ error: 'Weekly challenges are currently disabled' }, { status: 403 });
      }
      if (cfg.maintenanceMode === true && !isAdminBypass) {
        return NextResponse.json({ error: 'Weekly challenges are currently under maintenance' }, { status: 403 });
      }
      if (cfg.activeGames && Array.isArray(cfg.activeGames) && cfg.activeGames.length > 0 && !cfg.activeGames.includes(gameId) && !isAdminBypass) {
        return NextResponse.json({ error: 'This game is currently disabled by admin' }, { status: 403 });
      }
      if (cfg.availableDays && Array.isArray(cfg.availableDays) && cfg.availableDays.length > 0 && !cfg.availableDays.includes(now.getDay()) && !isAdminBypass) {
        return NextResponse.json({ error: 'Weekly challenges are not available today' }, { status: 403 });
      }
    }

    // === Check existing result for 1-attempt enforcement ===
    let sessionId: string = crypto.randomUUID();
    const deterministicResultDocId = `${challengeId}-${uid}-res`;

    if (isAdminBypass) {
      isOfficial = false;
    } else if (adminDb) {
      try {
        // Enforce ONE ATTEMPT per challengeId + userId
        // Step 1: Check deterministic doc directly (fastest, requires zero query index)
        const directDoc = await adminDb.collection("challenge_results").doc(deterministicResultDocId).get();
        let prevResult: any = directDoc.exists ? directDoc.data() : null;

        // Step 2: Fallback query if direct doc wasn't found (for legacy documents)
        if (!prevResult) {
          const existingResults = await adminDb.collection("challenge_results")
            .where("userId", "==", uid)
            .where("challengeId", "==", challengeId)
            .where("isOfficial", "==", true)
            .limit(1)
            .get();

          if (!existingResults.empty) {
            prevResult = existingResults.docs[0].data();
          }
        }

        // Step 3: Check completed session docs as secondary guard
        if (!prevResult) {
          const existingSession = await adminDb.collection("challenge_sessions")
            .where("userId", "==", uid)
            .where("challengeId", "==", challengeId)
            .where("status", "==", "completed")
            .limit(1)
            .get();

          if (!existingSession.empty) {
            const sData = existingSession.docs[0].data();
            prevResult = {
              score: sData.score || 50,
              durationMs: sData.durationMs || 0
            };
          }
        }

        if (prevResult) {
          const userScore = prevResult.score || 0;
          const userDuration = prevResult.durationMs || 0;

          // Build leaderboard scoped to this exact challengeId
          const { leaderboard, userRank } = await buildLeaderboard(challengeId, uid);

          return NextResponse.json({ 
            error: "You've already completed today's official challenge.", 
            completed: true,
            wasAlreadyCompleted: true,
            score: userScore,
            durationMs: userDuration,
            rank: userRank || 1,
            leaderboard,
            challengeId: challengeId
          }, { status: 409 });
        }
      } catch (err) {
        console.warn("[challenge-start] Attempt check warning:", err);
      }
    }

    // Write session to Firestore
    if (adminDb) {
      const sessionData = {
        userId: uid,
        gameId,
        challengeDate,
        challengeId,
        weekId,
        startedAt: admin.firestore.Timestamp.now(),
        status: 'in_progress',
        isOfficial,
        createdAt: admin.firestore.Timestamp.now()
      };
      await adminDb.collection("challenge_sessions").doc(sessionId).set(sessionData).catch((dbErr: any) => {
        console.error("[challenge-start] session write failed:", dbErr.message);
      });
    } else {
      console.warn("[challenge-start] adminDb not initialized, using local simulation mode");
      sessionId = `local-fallback-${crypto.randomBytes(8).toString('hex')}`;
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
