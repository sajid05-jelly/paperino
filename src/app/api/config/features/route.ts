import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let features: Record<string, any> = {
      careerDnaEnabled: true,
      atsEnabled: true,
      youtubeStudyEnabled: true,
    };

    if (adminDb) {
      const snap = await adminDb.collection("platform_config").doc("features").get();
      if (snap.exists) {
        features = {
          ...features,
          ...snap.data(),
        };
      }
    }

    return NextResponse.json(
      {
        success: true,
        features,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.warn("[API: config/features] Notice:", error?.message);
    return NextResponse.json({
      success: true,
      features: {
        careerDnaEnabled: true,
        atsEnabled: true,
        youtubeStudyEnabled: true,
      },
    });
  }
}
