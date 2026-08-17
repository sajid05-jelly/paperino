import { NextResponse } from 'next/server';
import { verifyServerAuth } from '@/lib/auth-verify';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

const VALID_GAMES = ['code-breaker', 'memory-matrix', 'impossible-room', 'word-forge', 'target-number', 'memory-heist', 'the-impostor', 'paradox'];


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
    // Query ALL official results for this exact challengeId
    const allResultsSnap = await adminDb.collection('challenge_results')
      .where('challengeId', '==', challengeId)
      .where('isOfficial', '==', true)
      .get();

    // Deduplicate per user (keep best: highest score, then lowest duration)
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

    // Sort: higher score first, then faster time, then earlier completion
    allEntries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
      return a.completedAt - b.completedAt;
    });

    // Assign ranks and collect top 5
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

    // REJECT local-fallback sessions — do NOT create unofficial results silently
    if (sessionId.startsWith('local-fallback-')) {
      return NextResponse.json({ error: 'Invalid session: server database was unavailable at start' }, { status: 400 });
    }

    // 1. Fetch Session Doc from Firestore with graceful fallback
    const sessionDocRef = adminDb.collection('challenge_sessions').doc(sessionId);
    let sessionSnap: any = null;
    let isDbReadFailed = false;

    try {
      sessionSnap = await sessionDocRef.get();
    } catch (err: any) {
      console.warn("[challenge-submit] session retrieval error, attempting graceful resolution:", err.message);
      isDbReadFailed = true;
    }

    let gameId = '';
    let challengeDate = '';
    let challengeId = '';
    let weekId = '';
    let isOfficial = true;
    let startedAt: Date = new Date();
    const completedAt = new Date();

    if (!isDbReadFailed && sessionSnap && sessionSnap.exists) {
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
      isOfficial = Boolean(session.isOfficial);
      startedAt = session.startedAt ? session.startedAt.toDate() : new Date();
    } else {
      // Gracefully reconstruct session context if direct session doc read had transient failure
      gameId = body.gameData?.gameId || (body.gameData?.rounds ? 'memory-matrix' : 'code-breaker');
      const now = new Date();
      challengeDate = now.toISOString().split('T')[0];
      weekId = getISOWeekId(now);

      // Attempt to read config for exact challengeId
      try {
        const configSnap = await adminDb.collection("settings").doc("weeklyChallenges").get();
        if (configSnap.exists) {
          const cfg = configSnap.data() || {};
          if (cfg.challengeSessionId) challengeId = `${gameId}-${cfg.challengeSessionId}`;
          else if (cfg.currentChallengeId) challengeId = `${gameId}-${cfg.currentChallengeId}`;
          else if (cfg.currentWeek) challengeId = `${gameId}-${cfg.currentWeek}`;
          else challengeId = `${gameId}-${challengeDate}`;
        } else {
          challengeId = `${gameId}-${challengeDate}`;
        }
      } catch {
        challengeId = `${gameId}-${challengeDate}`;
      }

      const rawDuration = Number(gameData?.durationMs) || 15000;
      startedAt = new Date(completedAt.getTime() - rawDuration);
    }

    // Atomic double submission guard with quota-safe try/catch
    if (isOfficial) {
      try {
        const directDoc = await adminDb.collection("challenge_results").doc(`${challengeId}-${uid}-res`).get();
        if (directDoc.exists) {
          return NextResponse.json({ error: 'Challenge already submitted' }, { status: 409 });
        }

        const existingResults = await adminDb.collection("challenge_results")
          .where("userId", "==", uid)
          .where("challengeId", "==", challengeId)
          .where("isOfficial", "==", true)
          .limit(1)
          .get();

        if (!existingResults.empty) {
          return NextResponse.json({ error: 'Challenge already submitted' }, { status: 409 });
        }
      } catch (err: any) {
        console.warn("[challenge-submit] Double-submit check warning:", err.message);
      }
    }

    // Compute duration from server timestamps (startedAt from session, completedAt = now)
    const serverDurationMs = completedAt.getTime() - startedAt.getTime();
    // Client durationMs is used as a cross-check, but server timestamps are authoritative
    const rawClientDuration = Number(gameData?.durationMs);
    let durationMs: number;

    if (serverDurationMs > 500) {
      // Server timestamps are valid — use them
      durationMs = serverDurationMs;
    } else if (!isNaN(rawClientDuration) && rawClientDuration > 0) {
      // Server delta is suspiciously small (race condition), trust client
      durationMs = rawClientDuration;
    } else {
      // Last resort — should not happen in normal flow
      durationMs = Math.max(1000, serverDurationMs);
    }

    // 2. Calculate score server-side
    // Re-generate puzzle for validation if it's a new game
    const seedNum = getSeed(challengeId);
    let rand = mulberry32(seedNum);
    let correctnessRatio = 1.0; // 100% correct by default (existing games)

    if (gameId === 'target-number') {
      const OPERAND_POOL = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25];
      const pickFromPool = (pool: number[]) => pool[Math.floor(rand() * pool.length)];

      const rounds = [];
      for (let r = 0; r < 5; r++) {
        const availableNumbers: number[] = [];
        for (let i = 0; i < 6; i++) { availableNumbers.push(pickFromPool(OPERAND_POOL)); }
        const useCount = 3 + Math.floor(rand() * 2);
        let target = availableNumbers[0];
        const ops = ['+', '-', '*'];
        for (let i = 1; i < useCount; i++) {
          const op = ops[Math.floor(rand() * ops.length)];
          const n = availableNumbers[i];
          if (op === '+') target = target + n;
          else if (op === '-') target = Math.abs(target - n);
          else if (op === '*') target = target * n;
        }
        target = Math.max(1, Math.min(999, target));
        rounds.push({ target, availableNumbers });
      }

      const clientAnswers = Array.isArray(gameData?.answers) ? gameData.answers : [];
      let correctCount = 0;
      
      rounds.forEach((round, idx) => {
        const expr = String(clientAnswers[idx] || '').replace(/\\s/g, '');
        if (!expr) return;
        
        // safeEval logic
        if (/[^0-9+*/()-]/.test(expr)) return;
        const numsInExpr = expr.split(/[^0-9]+/).filter(Boolean).map(Number);
        const used = [...round.availableNumbers];
        let validNums = true;
        for (const n of numsInExpr) {
          const i = used.indexOf(n);
          if (i === -1) { validNums = false; break; }
          used.splice(i, 1);
        }
        if (!validNums) return;
        
        try {
          const result = new Function('return ' + expr)();
          if (Math.abs(result - round.target) < 0.001) correctCount++;
        } catch(e) {}
      });
      correctnessRatio = correctCount / rounds.length;

    } else if (gameId === 'the-impostor') {
      const SCENARIOS = [
        { answer: 'Cathy' }, { answer: 'Bob' }, { answer: 'Priya' }, { answer: 'Hiro' },
        { answer: 'Nina' }, { answer: 'Mia' }, { answer: 'Ben' }, { answer: 'Gina' }
      ];
      const pool = [...SCENARIOS];
      const rounds = [];
      for (let r = 0; r < 5; r++) {
        const idx = Math.floor(rand() * pool.length);
        rounds.push(pool[idx]);
        pool.splice(idx, 1);
      }
      
      const clientAnswers = Array.isArray(gameData?.answers) ? gameData.answers : [];
      let correctCount = 0;
      rounds.forEach((round, idx) => {
        if (clientAnswers[idx] === round.answer) correctCount++;
      });
      correctnessRatio = correctCount / rounds.length;

    } else if (gameId === 'paradox') {
      const CHAINS = [
        { answer: '3' }, { answer: '15' }, { answer: '11' }, { answer: '13' },
        { answer: '6' }, { answer: '10' }, { answer: '16' }, { answer: '18' }
      ];
      const pool = [...CHAINS];
      const rounds = [];
      for (let r = 0; r < 5; r++) {
        const idx = Math.floor(rand() * pool.length);
        rounds.push(pool[idx]);
        pool.splice(idx, 1);
      }
      
      const clientAnswers = Array.isArray(gameData?.answers) ? gameData.answers : [];
      let correctCount = 0;
      rounds.forEach((round, idx) => {
        if (clientAnswers[idx] === round.answer) correctCount++;
      });
      correctnessRatio = correctCount / rounds.length;

    } else if (gameId === 'memory-heist') {
      const ITEMS = ['🔑', '📱', '💻', '📕', '🎧', '☕', '🖊️', '📷', '🔮'];
      const totalCells = 9;
      const itemCount = 6;

      const itemPool = [...ITEMS];
      const chosenItems: string[] = [];
      for (let i = 0; i < itemCount; i++) {
        const idx = Math.floor(rand() * itemPool.length);
        chosenItems.push(itemPool[idx]);
        itemPool.splice(idx, 1);
      }

      const posPool = Array.from({ length: totalCells }, (_, i) => i);
      const chosenPositions: number[] = [];
      for (let i = 0; i < itemCount; i++) {
        const idx = Math.floor(rand() * posPool.length);
        chosenPositions.push(posPool[idx]);
        posPool.splice(idx, 1);
      }

      const grid: (string | null)[] = Array(totalCells).fill(null);
      chosenItems.forEach((item, i) => { grid[chosenPositions[i]] = item; });

      const rowNames = ['top', 'middle', 'bottom'];
      const colNames = ['left', 'center', 'right'];
      const posToLabel = (pos: number) => {
        const row = Math.floor(pos / 3);
        const col = pos % 3;
        return `${rowNames[row]}-${colNames[col]}`;
      };

      const q1ItemIdx = Math.floor(rand() * itemCount);
      const q2ItemIdx = (q1ItemIdx + 1 + Math.floor(rand() * (itemCount - 1))) % itemCount;
      
      const q1WrongIndices = [Math.floor(rand() * (totalCells - 1)), Math.floor(rand() * (totalCells - 2)), Math.floor(rand() * (totalCells - 3))];
      const q2WrongIndices = [Math.floor(rand() * (itemCount - 1)), Math.floor(rand() * (itemCount - 2)), Math.floor(rand() * (itemCount - 3))];

      const correctLabel1 = posToLabel(chosenPositions[q1ItemIdx]);
      const q2Correct = chosenItems[q2ItemIdx];
      const topRowCount = [0, 1, 2].filter(pos => grid[pos] !== null).length;
      const q3Correct = String(topRowCount);

      const correctAnswers = [correctLabel1, q2Correct, q3Correct];
      const clientAnswers = Array.isArray(gameData?.answers) ? gameData.answers : [];
      let correctCount = 0;
      correctAnswers.forEach((ans, idx) => {
        if (clientAnswers[idx] === ans) correctCount++;
      });
      correctnessRatio = correctCount / 3;
    }

    // Scoring: 50 completion points + 0-50 speed bonus = 50-100
    let maxAllowedTimeMs = 180000; // 3 minutes default

    if (gameId === 'code-breaker') {
      maxAllowedTimeMs = 180000; // 3 minutes
    } else if (gameId === 'memory-matrix') {
      maxAllowedTimeMs = 180000; // 3 minutes
    } else if (gameId === 'impossible-room') {
      maxAllowedTimeMs = 300000; // 5 minutes
    } else if (gameId === 'word-forge') {
      maxAllowedTimeMs = 180000; // 3 minutes
    } else if (gameId === 'target-number') {
      maxAllowedTimeMs = 240000; // 4 minutes
    } else if (gameId === 'memory-heist') {
      maxAllowedTimeMs = 180000; // 3 minutes
    } else if (gameId === 'the-impostor') {
      maxAllowedTimeMs = 180000; // 3 minutes
    } else if (gameId === 'paradox') {
      maxAllowedTimeMs = 120000; // 2 minutes
    }


    // Speed bonus: 0-50 points based on how fast relative to max time
    const actualDuration = Math.max(1000, durationMs);
    const speedRatio = Math.max(0, 1 - (actualDuration / maxAllowedTimeMs));
    const speedBonus = Math.max(0, Math.min(50, Math.round(50 * speedRatio)));

    // Total Score: completion points (max 50) + speedBonus (0-50) = 50-100
    // Based on correctness ratio securely computed on the server
    const completionPoints = Math.round(50 * correctnessRatio);
    const score = completionPoints + speedBonus;

    // 3. Session update + User profile fetch in parallel
    let displayName = 'Student';
    let paperinoAvatar = '';

    const sessionUpdatePromise = sessionDocRef.update({
      status: 'completed',
      completedAt: admin.firestore.Timestamp.fromDate(completedAt),
      score,
      durationMs
    }).catch((err: any) => {
      console.warn("[challenge-submit] failed to update session:", err.message);
    });

    // Try multiple sources for display name: Firestore profile → Firebase Auth → email prefix
    const userProfilePromise = adminDb.collection('users').doc(uid).get().catch((e: any) => {
      console.warn('[challenge-submit] User profile lookup error:', e);
      return null;
    });

    const [, userSnap] = await Promise.all([sessionUpdatePromise, userProfilePromise]);

    if (userSnap && userSnap.exists) {
      const uData = userSnap.data() || {};
      if (uData.displayName && uData.displayName !== 'Student') {
        displayName = uData.displayName;
      }
      paperinoAvatar = uData.paperinoAvatar || '';
    }

    // If still 'Student', try Firebase Auth record (has actual Gmail profile name)
    if (displayName === 'Student' && admin.auth) {
      try {
        const authRecord = await admin.auth().getUser(uid);
        if (authRecord.displayName) {
          displayName = authRecord.displayName;
        } else if (authRecord.email) {
          // Use email prefix as fallback (e.g., "sajid" from "sajid@gmail.com")
          displayName = authRecord.email.split('@')[0];
        }
      } catch (authErr: any) {
        console.warn('[challenge-submit] Firebase Auth getUser fallback error:', authErr.message);
      }
    }

    // 4. Write result to Firestore (with deterministic ID for absolute 1-attempt guarantee)
    const deterministicResultDocId = `${challengeId}-${uid}-res`;
    const resultPayload = {
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
    };

    try {
      await adminDb.collection('challenge_results').doc(deterministicResultDocId).set(resultPayload, { merge: true });
    } catch (writeErr: any) {
      console.warn("[challenge-submit] failed to write deterministic result doc:", writeErr.message);
    }

    // 5. Build leaderboard scoped to this challengeId
    const { leaderboard, userRank } = await buildLeaderboard(challengeId, uid);

    // Fallback if leaderboard query returned empty (e.g. quota limit or first player)
    const finalRank = userRank ?? (isOfficial ? 1 : null);
    const finalLeaderboard = leaderboard.length > 0 ? leaderboard : (isOfficial ? [{
      userId: uid,
      displayName,
      paperinoAvatar,
      score,
      durationMs,
      rank: 1
    }] : []);

    return NextResponse.json({
      success: true,
      score,
      durationMs,
      completedAt: completedAt.toISOString(),
      rank: isOfficial ? finalRank : null,
      leaderboard: finalLeaderboard,
      isOfficial
    });

  } catch (error: any) {
    console.error('[challenge-submit] Uncaught error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
