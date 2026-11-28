import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { PublicAdsManifest } from "@/lib/adTypes";

export const dynamic = "force-dynamic";

let inMemoryManifestCache: PublicAdsManifest | null = {
  enabled: true,
  analyticsEnabled: true,
  version: 16,
  generatedAt: new Date().toISOString(),
  campaigns: [
    {
      id: "ad_02_home_featured",
      brandName: "PAPERINO",
      placementId: "home_featured",
      mediaType: "image",
      desktopCreativeUrl: "https://res.cloudinary.com/ykdgsee2/image/upload/v1795872958/paperino_ads/ad_image_1795872958240_1577d9e96401_paperino_ads_website_banner_pn.png",
      destinationUrl: "https://www.instagram.com/paperino_hi?hvrq=MXNoZjViNWlvNnZtdA%3D%3D&utm_source=qr",
      accessibleDescription: "Promote with Paperino",
      startAt: "2026-11-28T00:00:00.000Z",
      expiresAt: "2027-01-01T12:00:00.000Z",
      priority: 50,
      targetAudience: {
        userTier: "all",
      },
    },
  ],
};
let lastManifestFetchTime = Date.now();
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
