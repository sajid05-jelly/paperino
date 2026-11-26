import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";

export const dynamic = "force-dynamic";

interface SerializedTimestamp {
  seconds: number;
  nanoseconds: number;
}

function serializeTimestamp(val: any): SerializedTimestamp | null {
  if (!val) return null;
  if (typeof val === "object") {
    if (typeof val.seconds === "number") {
      return { seconds: val.seconds, nanoseconds: val.nanoseconds || 0 };
    }
    if (typeof val._seconds === "number") {
      return { seconds: val._seconds, nanoseconds: val._nanoseconds || 0 };
    }
  }
  if (typeof val === "number" || typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
    }
  }
  return null;
}

// In-memory 60s cache to minimize Firestore reads and guarantee instant responses
interface CacheEntry {
  timestamp: number;
  data: any[];
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "All";
    const limitNum = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "60", 10)));
    const cacheKey = `${category}_${limitNum}`;

    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, updates: cached.data, cached: true });
    }

    let docs: any[] = [];

    // Query pulse_updates ordered by createdAt desc
    try {
      const snap = await adminDb
        .collection("pulse_updates")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      snap.forEach((doc) => {
        const raw = doc.data();
        const sName = (raw.sourceName || "").toLowerCase();
        const link = (raw.link || "").toLowerCase();

        // Exclude Unstop records
        if (sName.includes("unstop") || link.includes("unstop.com")) return;

        docs.push({
          id: doc.id,
          ...raw,
          createdAt: serializeTimestamp(raw.createdAt) || { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          deadline: serializeTimestamp(raw.deadline),
          eventDate: typeof raw.eventDate === "object" ? serializeTimestamp(raw.eventDate) : raw.eventDate,
        });
      });
    } catch (queryErr: any) {
      console.warn("[Pulse API] Standard query fallback notice:", queryErr?.message);
      // Fallback without orderBy in case of index issues
      const fallbackSnap = await adminDb.collection("pulse_updates").limit(50).get();
      fallbackSnap.forEach((doc) => {
        const raw = doc.data();
        docs.push({
          id: doc.id,
          ...raw,
          createdAt: serializeTimestamp(raw.createdAt) || { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
          deadline: serializeTimestamp(raw.deadline),
          eventDate: typeof raw.eventDate === "object" ? serializeTimestamp(raw.eventDate) : raw.eventDate,
        });
      });
    }

    // Sort pinned to top, then by createdAt desc
    docs.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    const finalResult = docs.slice(0, limitNum);
    cache.set(cacheKey, { timestamp: now, data: finalResult });

    return NextResponse.json({
      success: true,
      updates: finalResult,
      total: finalResult.length,
    });
  } catch (error: any) {
    console.error("[Pulse API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load Pulse updates" },
      { status: 500 }
    );
  }
}

// DELETE: Admin deletion support
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser || (verifiedUser.role !== "admin" && verifiedUser.role !== "lead_admin")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing update ID" }, { status: 400 });
    }

    await adminDb.collection("pulse_updates").doc(id).delete();
    cache.clear(); // Invalidate cache

    return NextResponse.json({ success: true, message: "Pulse update deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
  }
}
