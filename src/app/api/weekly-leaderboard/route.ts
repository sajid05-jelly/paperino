import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentChallengeWeek } from '@/lib/challengeUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database connection failed' }, { status: 500 });
    }

    // 1. Determine active cycle suffix
    const configRef = adminDb.collection('settings').doc('weeklyChallenges');
    const configSnap = await configRef.get();
    
    let cycleSuffix = getCurrentChallengeWeek(); // fallback
    const activeGames = ['code-breaker', 'memory-matrix', 'impossible-room', 'word-forge', 'target-number', 'memory-heist', 'the-impostor', 'paradox'];
    
    if (configSnap.exists) {
      const cfg = configSnap.data() || {};
      
      if (cfg.challengeSessionId) cycleSuffix = cfg.challengeSessionId;
      else if (cfg.currentChallengeId) cycleSuffix = cfg.currentChallengeId;
      else if (cfg.currentWeek) cycleSuffix = cfg.currentWeek;
    }

    if (!cycleSuffix) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Build exactly the list of challengeIds for the CURRENT cycle
    const currentChallengeIds = activeGames.map(gameId => `${gameId}-${cycleSuffix}`);

    // Firestore 'in' query is limited to 10 items. Chunk the array.
    const chunkArray = (arr: string[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    };

    const idChunks = chunkArray(currentChallengeIds, 10);
    const resultsDocs: any[] = [];

    for (const chunk of idChunks) {
      if (chunk.length === 0) continue;
      const snap = await adminDb.collection('challenge_results')
        .where('challengeId', 'in', chunk)
        .where('isOfficial', '==', true)
        .get();
      
      snap.docs.forEach((d: any) => resultsDocs.push(d));
    }

    if (resultsDocs.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // 3. Aggregate scores by userId
    const userScores: Record<string, { userId: string; displayName: string; score: number }> = {};

    resultsDocs.forEach((doc: any) => {
      const data = doc.data();
      const uid = data.userId;
      if (!uid) return;

      if (!userScores[uid]) {
        userScores[uid] = {
          userId: uid,
          displayName: data.displayName || 'Student',
          score: 0
        };
      }
      userScores[uid].score += (data.score || 0);
      
      // Update displayName if we find a better one
      if (data.displayName && data.displayName !== 'Student') {
        userScores[uid].displayName = data.displayName;
      }
    });

    // 4. Sort and take top 5
    const leaderboard = Object.values(userScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    return NextResponse.json({ leaderboard });
  } catch (err: any) {
    console.error("[weekly-leaderboard] error:", err.message);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
