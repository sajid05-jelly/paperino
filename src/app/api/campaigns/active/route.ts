import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { PublicAdsManifest } from "@/lib/adTypes";

export const dynamic = "force-dynamic";

let inMemoryManifestCache: PublicAdsManifest | null = null;
let lastManifestFetchTime = 0;
const MANIFEST_CACHE_TTL_MS = 60 * 1000; // 60s in-memory TTL to avoid exhausting Firestore quota

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

  const now = Date.now();
  if (inMemoryManifestCache && now - lastManifestFetchTime < MANIFEST_CACHE_TTL_MS) {
    return NextResponse.json(inMemoryManifestCache, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
      },
    });
  }

  try {
    if (!adminDb) {
      if (inMemoryManifestCache) {
        return NextResponse.json(inMemoryManifestCache, {
          headers: {
            "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
          },
        });
      }
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
    const finalPayload = data.enabled ? data : { ...data, campaigns: [] };

    inMemoryManifestCache = finalPayload;
    lastManifestFetchTime = Date.now();

    return NextResponse.json(finalPayload, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
      },
    });
  } catch (err) {
    console.warn("Firestore read error on active ads manifest, serving resilient cache:", err);
    if (inMemoryManifestCache) {
      return NextResponse.json(inMemoryManifestCache, {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
        },
      });
    }
    return NextResponse.json(defaultPayload, {
      status: 200, // Return safe default rather than hard erroring student pages
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, must-revalidate",
      },
    });
  }
}
