import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

function getIsoWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export async function GET() {
  try {
    if (!adminDb) {
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
          activeGames: [
            "bug-hunter",
            "memory-rush",
            "typing-blitz",
            "number-detective",
            "logic-master",
            "code-breaker",
            "circuit-master",
          ],
          currentWeek: getIsoWeek(),
          adminTestMode: false,
        },
      });
    }

    const snap = await adminDb.collection("settings").doc("weeklyChallenges").get();

    if (snap.exists) {
      const data = snap.data() || {};
      return NextResponse.json(
        {
          success: true,
          data: {
            enabled: data.enabled ?? true,
            maintenanceMode: data.maintenanceMode ?? false,
            leaderboardEnabled: data.leaderboardEnabled ?? true,
            openTime: data.openTime || "00:00",
            closeTime: data.closeTime || "23:59",
            officialAttempts: data.officialAttempts ?? 1,
            availableDays: Array.isArray(data.availableDays) ? data.availableDays : [0, 1, 2, 3, 4, 5, 6],
            activeGames: Array.isArray(data.activeGames)
              ? data.activeGames
              : [
                  "bug-hunter",
                  "memory-rush",
                  "typing-blitz",
                  "number-detective",
                  "logic-master",
                  "code-breaker",
                  "circuit-master",
                ],
            currentWeek: data.currentWeek || getIsoWeek(),
            adminTestMode: Boolean(data.adminTestMode),
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
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
        activeGames: [
          "bug-hunter",
          "memory-rush",
          "typing-blitz",
          "number-detective",
          "logic-master",
          "code-breaker",
          "circuit-master",
        ],
        currentWeek: getIsoWeek(),
        adminTestMode: false,
      },
    });
  } catch (err: any) {
    console.warn("[API: challenges/config GET] Notice:", err?.message);
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
        activeGames: [
          "bug-hunter",
          "memory-rush",
          "typing-blitz",
          "number-detective",
          "logic-master",
          "code-breaker",
          "circuit-master",
        ],
        currentWeek: getIsoWeek(),
        adminTestMode: false,
      },
    });
  }
}
