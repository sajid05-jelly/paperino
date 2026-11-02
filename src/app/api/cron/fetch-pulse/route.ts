import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { syncHackathonsToFirestore } from "@/services/hackathonIngestionService";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function cleanExpiredUserNotifications() {
  if (!adminDb) return;
  try {
    const expiredCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const snap = await adminDb
      .collection("notifications")
      .where("createdAt", "<", expiredCutoff)
      .limit(30)
      .get();

    for (const d of snap.docs) {
      await d.ref.delete();
    }
  } catch (err: any) {
    console.warn("[Cron Fetch-Pulse] Expired notifications cleanup notice:", err?.message || err);
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = adminDb;
  if (!db) {
    return NextResponse.json({ error: 'Firebase Admin DB not initialized' }, { status: 500 });
  }

  // 1. Run physical cleanup for expired normal user notifications
  await cleanExpiredUserNotifications();

  // 2. Run multi-source hackathon discovery and ingestion pipeline
  try {
    console.log("[Cron Fetch-Pulse] Running Multi-Source Hackathon Discovery Engine...");
    const hackathonSyncResult = await syncHackathonsToFirestore();
    console.log(`[Cron Fetch-Pulse] Hackathons sync complete: ${hackathonSyncResult.validActive} active, ${hackathonSyncResult.imported} imported, ${hackathonSyncResult.updated} updated.`);

    return NextResponse.json({
      success: true,
      hackathons: hackathonSyncResult,
    });
  } catch (error: any) {
    console.error("Cron fetch-pulse error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
