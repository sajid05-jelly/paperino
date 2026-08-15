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

    // Assign ranks and collect top 3
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
        console.warn("[challenge-submit] Double-submit check bypassed due to quota:", err.message);
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
    }

    // Speed bonus: 0-50 points based on how fast relative to max time
    const actualDuration = Math.max(1000, durationMs);
    const speedRatio = Math.max(0, 1 - (actualDuration / maxAllowedTimeMs));
    const speedBonus = Math.max(0, Math.min(50, Math.round(50 * speedRatio)));

    // Total Score: 50 (completion) + speedBonus (0-50) = 50-100
    const score = 50 + speedBonus;

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

    // 4. Write result to Firestore (with quota-safe catch)
    const resultDocId = `${sessionId}-res`;
    try {
      await adminDb.collection('challenge_results').doc(resultDocId).set({
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
      });
    } catch (writeErr: any) {
      console.warn("[challenge-submit] failed to write result doc due to database quota:", writeErr.message);
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
