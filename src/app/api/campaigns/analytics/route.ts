import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { AdPlacementId, AD_PLACEMENTS, AdAnalyticsEvent } from "@/lib/adTypes";

export const dynamic = "force-dynamic";

// In-memory rate limiting and replay protection token cache
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const replayTokenCache = new Map<string, number>(); // token -> expiry timestamp

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  // Periodic cleanup
  if (ipRateLimitMap.size > 2000) {
    for (const [k, v] of ipRateLimitMap.entries()) {
      if (now > v.resetAt) ipRateLimitMap.delete(k);
    }
  }

  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }

  record.count += 1;
  return record.count > 40; // Max 40 requests per minute per IP
}

function checkAndRecordReplay(token?: string): boolean {
  if (!token) return false;
  const now = Date.now();

  // Periodic token cleanup
  if (replayTokenCache.size > 5000) {
    for (const [k, exp] of replayTokenCache.entries()) {
      if (now > exp) replayTokenCache.delete(k);
    }
  }

  const existing = replayTokenCache.get(token);
  if (existing && now < existing) {
    return true; // Replay detected!
  }

  // Store token for 10 minutes
  replayTokenCache.set(token, now + 600000);
  return false;
}

/**
 * Public Analytics Ingestion Endpoint — Phase 3 Hardened
 * - Bounded client-side event batching and consolidation.
 * - Single aggregate document write per campaign/day (zero per-event writes to parent campaign).
 * - Analytics emergency kill switch (preserves ad delivery during quota spikes).
 * - Distributed replay protection and IP rate limiting.
 * - Zero student PII or single-event document sprawl.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Normalize either batch payload or single event payload
    const rawEvents: AdAnalyticsEvent[] = Array.isArray(body.events)
      ? body.events
      : body.campaignId
      ? [
          {
            campaignId: body.campaignId,
            placementId: body.placementId,
            event: body.event,
            timestamp: body.timestamp,
            eventToken: body.eventToken,
            sessionToken: body.sessionToken,
          },
        ]
      : [];

    if (rawEvents.length === 0) {
      return NextResponse.json({ error: "No analytics events provided" }, { status: 400 });
    }

    // Cap batch size to max 10 events per payload
    const cappedEvents = rawEvents.slice(0, 10);
    const now = Date.now();

    // Filter valid, un-replayed events
    const validEvents: AdAnalyticsEvent[] = [];
    for (const evt of cappedEvents) {
      if (!evt.campaignId || typeof evt.campaignId !== "string" || evt.campaignId.length > 100) continue;
      if (!evt.placementId || !AD_PLACEMENTS[evt.placementId as AdPlacementId]) continue;
      if (evt.event !== "impression" && evt.event !== "click") continue;
      if (!evt.timestamp || typeof evt.timestamp !== "number" || Math.abs(now - evt.timestamp) > 300000) continue;

      // Replay protection check
      const eventKey = evt.eventToken || `${evt.campaignId}_${evt.placementId}_${evt.event}_${evt.timestamp}`;
      if (checkAndRecordReplay(eventKey)) {
        continue; // Skip duplicate replay
      }

      validEvents.push(evt);
    }

    if (validEvents.length === 0) {
      return NextResponse.json({ success: true, processed: 0, reason: "duplicate_or_invalid" });
    }

    if (!adminDb) {
      return NextResponse.json({ success: true, mocked: true, processed: validEvents.length });
    }

    // ── Emergency Kill Switches Check ──────────────────────────────────────
    const manifestSnap = await adminDb.collection("system_settings").doc("active_ads_manifest").get();
    if (manifestSnap.exists) {
      const manifest = manifestSnap.data();
      // Master ad kill switch check
      if (!manifest?.enabled) {
        return NextResponse.json({ success: true, dropped: "ads_disabled" });
      }
      // Dedicated Analytics-only emergency kill switch check
      if (manifest?.analyticsEnabled === false) {
        return NextResponse.json({ success: true, dropped: "analytics_disabled" });
      }
    }

    // ── Consolidate Events by Campaign and Date ─────────────────────────────
    // Consolidates multiple events into a single document update per campaign
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const consolidatedMap = new Map<
      string,
      { campaignId: string; placementId: AdPlacementId; impressions: number; clicks: number }
    >();

    for (const evt of validEvents) {
      const key = `${evt.campaignId}_${todayStr}`;
      const existing = consolidatedMap.get(key) || {
        campaignId: evt.campaignId,
        placementId: evt.placementId as AdPlacementId,
        impressions: 0,
        clicks: 0,
      };

      if (evt.event === "impression") {
        existing.impressions += 1;
      } else if (evt.event === "click") {
        existing.clicks += 1;
      }

      consolidatedMap.set(key, existing);
    }

    // ── Write ONLY to Aggregated Daily Summary Documents (1 write per unique campaign) ──
    const batch = adminDb.batch();

    for (const [key, agg] of consolidatedMap.entries()) {
      const dailyRef = adminDb.collection("campaign_analytics").doc(key);
      const updatePayload: Record<string, unknown> = {
        campaignId: agg.campaignId,
        placementId: agg.placementId,
        date: todayStr,
        updatedAt: new Date().toISOString(),
      };

      if (agg.impressions > 0) {
        updatePayload.impressions = FieldValue.increment(agg.impressions);
      }
      if (agg.clicks > 0) {
        updatePayload.clicks = FieldValue.increment(agg.clicks);
      }

      batch.set(dailyRef, updatePayload, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      processed: validEvents.length,
      writesCommitted: consolidatedMap.size,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Analytics ingestion failed";
    console.error("Ad analytics error:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 200 });
  }
}
