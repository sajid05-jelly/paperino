import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentChallengeWeek } from '@/lib/challengeUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server database connection failed' }, { status: 500 });
    }

    // 1. Determine active week
    const configRef = adminDb.collection('settings').doc('weeklyChallenges');
    const configSnap = await configRef.get();
    let activeWeekId = getCurrentChallengeWeek();
    
    if (configSnap.exists) {
      const data = configSnap.data();
      if (data && data.currentWeek) {
        activeWeekId = data.currentWeek;
      }
    }

    if (!activeWeekId) {
      return NextResponse.json({ leaderboard: [] });
    }

    // 2. Fetch all official results for this week
    const resultsSnap = await adminDb.collection('challenge_results')
      .where('weekId', '==', activeWeekId)
      .where('isOfficial', '==', true)
      .get();

    if (resultsSnap.empty) {
      return NextResponse.json({ leaderboard: [] });
    }

    // 3. Aggregate scores by userId
    const userScores: Record<string, { userId: string; displayName: string; score: number }> = {};

    resultsSnap.docs.forEach((doc: any) => {
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
