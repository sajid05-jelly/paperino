import { NextRequest, NextResponse } from 'next/server';
import { getOverallWeeklyLeaderboard } from '@/lib/challengeLeaderboard';
import { adminDb } from '@/lib/firebase-admin';
import { verifyServerAuth } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';

const ALLOWED_ADMINS = [
  "mohamedsajid.sa@gmail.com",
  "sudharajsekar2005@gmail.com",
  "admin.paperinoirfan27@gmail.com",
  "admin.paperinosam14@gmail.com",
  "gameplayitlifeitis@gmail.com",
  "gameplayitlifeis@gmail.com",
  "gameplayitlife@gmail.com",
  "dejasvini28@gmail.com",
  "kaushika13official@gmail.com",
];

export async function GET(req: NextRequest) {
  try {
    if (adminDb) {
      try {
        const configSnap = await adminDb.collection("settings").doc("weeklyChallenges").get();
        if (configSnap.exists) {
          const cfg = configSnap.data() || {};
          if (cfg.leaderboardEnabled === false) {
            // Check if requester is admin
            const authHeader = req.headers.get("authorization");
            let isAdmin = false;
            if (authHeader) {
              const user = await verifyServerAuth(authHeader);
              if (user) {
                const cleanEmail = (user.email || "").toLowerCase().trim();
                isAdmin = Boolean(user.role === "admin" || user.role === "lead_admin" || (cleanEmail && ALLOWED_ADMINS.includes(cleanEmail)));
              }
            }

            if (!isAdmin) {
              return NextResponse.json(
                { leaderboard: [], disabled: true, message: "Global leaderboard is currently disabled by administrator." },
                { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
              );
            }
          }
        }
      } catch (e: any) {
        console.warn("[weekly-leaderboard] Config check warning:", e.message);
      }
    }

    const leaderboard = await getOverallWeeklyLeaderboard();
    return NextResponse.json(
      { leaderboard },
      { 
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
        }
      }
    );
  } catch (err: any) {
    console.error("[weekly-leaderboard] GET error:", err.message);
    // Return empty leaderboard gracefully instead of 500 error to keep UI functional
    return NextResponse.json(
      { leaderboard: [] },
      { 
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
        }
      }
    );
  }
}
