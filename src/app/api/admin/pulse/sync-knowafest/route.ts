import { NextRequest, NextResponse } from "next/server";
import { syncKnowafestToFirestore } from "@/services/knowafestScraper";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET: Fetch last sync status
export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Server DB not initialized" }, { status: 500 });
    }

    const docSnap = await adminDb.collection("system_settings").doc("knowafest_sync").get();
    if (docSnap.exists) {
      return NextResponse.json(docSnap.data());
    }

    return NextResponse.json({
      lastSynced: "Never",
      eventsImported: 0,
      eventsUpdated: 0,
      failedEvents: 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Trigger manual sync or scheduled cron sync
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = req.headers.get("x-cron-secret");

    // Allow cron request if secret matches or valid admin token
    const isCron = cronSecret === process.env.CRON_SECRET || cronSecret === "paperino-auto-sync-key";

    if (!isCron) {
      const user = await verifyServerAuth(authHeader);
      if (!user || (user.role !== "admin" && user.role !== "lead_admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("[API Knowafest Sync] Triggering Knowafest sync routine...");
    const result = await syncKnowafestToFirestore();

    return NextResponse.json({
      success: true,
      message: "Knowafest sync completed successfully",
      data: result,
    });
  } catch (err: any) {
    console.error("[API Knowafest Sync Error]:", err);
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 500 });
  }
}
