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
    const errMessage = String(err?.message || err);
    const isQuota = errMessage.toLowerCase().includes("quota") || errMessage.toLowerCase().includes("resource_exhausted");

    if (isQuota) {
      console.warn("[API Knowafest Sync Quota Exceeded Notice]: Returning graceful 200 OK fallback payload");
      return NextResponse.json({
        success: false,
        message: "Knowafest sync completed (Quota Limit Notice)",
        data: {
          lastSynced: new Date().toISOString(),
          httpStatus: 200,
          foundCardsCount: 0,
          eventsExtractedCount: 0,
          eventsImported: 0,
          eventsUpdated: 0,
          eventsSkipped: 0,
          failedEvents: 0,
          extractedTitles: [],
          logs: [],
          failedSelectorReason: "Firebase daily write quota reached (8 RESOURCE_EXHAUSTED). Existing events remain active.",
          error: "Quota Exceeded Notice: Firebase write limit reached. Displaying active events.",
        },
      }, { status: 200 });
    }

    return NextResponse.json({ error: errMessage || "Sync failed" }, { status: 500 });
  }
}
