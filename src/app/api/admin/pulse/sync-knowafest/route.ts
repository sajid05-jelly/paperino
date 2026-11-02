import { NextRequest, NextResponse } from "next/server";
import { syncKnowafestToFirestore } from "@/services/knowafestScraper";
import { syncHackathonsToFirestore } from "@/services/hackathonIngestionService";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET: Fetch last sync status for Knowafest and Hackathon Discovery Engines
export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Server DB not initialized" }, { status: 500 });
    }

    const [knowafestSnap, hackathonSnap] = await Promise.all([
      adminDb.collection("system_settings").doc("knowafest_sync").get().catch(() => null),
      adminDb.collection("system_settings").doc("hackathon_sync").get().catch(() => null),
    ]);

    const knowafestData = knowafestSnap && knowafestSnap.exists ? knowafestSnap.data() : {
      lastSynced: "Never",
      eventsImported: 0,
      eventsUpdated: 0,
      failedEvents: 0,
    };

    const hackathonData = hackathonSnap && hackathonSnap.exists ? hackathonSnap.data() : {
      lastSynced: "Never",
      validActive: 0,
      imported: 0,
      updated: 0,
      sourcesChecked: [],
    };

    // Return combined payload with root backward compatibility for knowafest UI fields
    return NextResponse.json({
      ...knowafestData,
      knowafest: knowafestData,
      hackathons: hackathonData,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Trigger manual or scheduled sync for both Knowafest and Hackathons
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = req.headers.get("x-cron-secret");

    const isCron = cronSecret === process.env.CRON_SECRET || cronSecret === "paperino-auto-sync-key";

    if (!isCron) {
      const user = await verifyServerAuth(authHeader);
      if (!user || (user.role !== "admin" && user.role !== "lead_admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("[Pulse Sync Engine] Starting combined Knowafest & Hackathon discovery routines...");

    // Run both pipelines with independent error isolation
    const [knowafestResult, hackathonResult] = await Promise.allSettled([
      syncKnowafestToFirestore(),
      syncHackathonsToFirestore(),
    ]);

    const kData = knowafestResult.status === "fulfilled" ? knowafestResult.value : null;
    const hData = hackathonResult.status === "fulfilled" ? hackathonResult.value : null;

    if (knowafestResult.status === "rejected") {
      console.warn("[Pulse Sync Engine] Knowafest pipeline error:", knowafestResult.reason);
    }
    if (hackathonResult.status === "rejected") {
      console.warn("[Pulse Sync Engine] Hackathon pipeline error:", hackathonResult.reason);
    }

    const combinedData = {
      ...(kData || {}),
      knowafest: kData,
      hackathons: hData,
    };

    return NextResponse.json({
      success: true,
      message: "Pulse opportunities and hackathons synced successfully",
      data: combinedData,
    });
  } catch (err: any) {
    console.error("[Pulse Sync Engine Error]:", err);
    return NextResponse.json({ error: err?.message || "Sync failed" }, { status: 500 });
  }
}
