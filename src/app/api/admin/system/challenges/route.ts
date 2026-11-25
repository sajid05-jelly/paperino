import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";

export const dynamic = "force-dynamic";

function getIsoWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// GET: Fetch current Weekly Challenges configuration with Admin DB fallback
export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Server database not initialized" }, { status: 500 });
    }

    const docRef = adminDb.collection("settings").doc("weeklyChallenges");
    const snap = await docRef.get();

    if (snap.exists) {
      return NextResponse.json({ success: true, data: snap.data() });
    }

    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        maintenanceMode: false,
        leaderboardEnabled: true,
        openTime: "00:00",
        closeTime: "23:59",
        officialAttempts: 1,
        availableDays: [0, 1, 2, 3, 4, 5, 6],
        activeGames: ["bug-hunter", "memory-rush", "typing-blitz", "number-detective", "logic-master", "code-breaker", "circuit-master"],
        currentWeek: getIsoWeek(),
        adminTestMode: false
      }
    });
  } catch (err: any) {
    console.error("[Weekly Challenges API GET Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save Weekly Challenges configuration (Guaranteed Admin DB write)
export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Server database not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user || (user.role !== "admin" && user.role !== "lead_admin")) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
    }

    const body = await req.json();
    const docRef = adminDb.collection("settings").doc("weeklyChallenges");

    const payload = {
      enabled: body.enabled ?? true,
      maintenanceMode: body.maintenanceMode ?? false,
      leaderboardEnabled: body.leaderboardEnabled ?? true,
      openTime: body.openTime || "00:00",
      closeTime: body.closeTime || "23:59",
      officialAttempts: body.officialAttempts ?? 1,
      availableDays: Array.isArray(body.availableDays) ? body.availableDays : [0, 1, 2, 3, 4, 5, 6],
      activeGames: Array.isArray(body.activeGames) ? body.activeGames : ["bug-hunter", "memory-rush", "typing-blitz", "number-detective", "logic-master", "code-breaker", "circuit-master"],
      currentWeek: getIsoWeek(),
      adminTestMode: false,
      updatedAt: new Date()
    };

    await docRef.set(payload, { merge: true });

    return NextResponse.json({ success: true, message: "Weekly Challenges configuration saved successfully", data: payload });
  } catch (err: any) {
    console.error("[Weekly Challenges API POST Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
