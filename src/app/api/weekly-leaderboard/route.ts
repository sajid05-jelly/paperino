import { NextResponse } from 'next/server';
import { getOverallWeeklyLeaderboard } from '@/lib/challengeLeaderboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leaderboard = await getOverallWeeklyLeaderboard();
    return NextResponse.json({ leaderboard }, { status: 200 });
  } catch (err: any) {
    console.error("[weekly-leaderboard] GET error:", err.message);
    // Return empty leaderboard gracefully instead of 500 error to keep UI functional
    return NextResponse.json({ leaderboard: [] }, { status: 200 });
  }
}
