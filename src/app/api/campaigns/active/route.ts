import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { PublicAdsManifest } from "@/lib/adTypes";

export const dynamic = "force-dynamic";

/**
 * Public Active Campaigns Endpoint
 * Serves single pre-sanitized manifest document with Edge CDN caching headers.
 * Consumes exactly 1 Firestore document read per cache miss.
 */
export async function GET() {
  const defaultPayload: PublicAdsManifest = {
    enabled: false,
    version: 1,
    generatedAt: new Date().toISOString(),
    campaigns: [],
  };

  try {
    if (!adminDb) {
      return NextResponse.json(defaultPayload, {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
        },
      });
    }

    const manifestSnap = await adminDb.collection("system_settings").doc("active_ads_manifest").get();

    if (!manifestSnap.exists) {
      return NextResponse.json(defaultPayload, {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
        },
      });
    }

    const data = manifestSnap.data() as PublicAdsManifest;

    // If master kill-switch is disabled, return empty campaigns list
    if (!data.enabled) {
      return NextResponse.json(
        {
          ...data,
          campaigns: [],
        },
        {
          headers: {
            "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Error reading active ads manifest:", err);
    return NextResponse.json(defaultPayload, {
      status: 200, // Return safe default rather than hard erroring student pages
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
      },
    });
  }
}
