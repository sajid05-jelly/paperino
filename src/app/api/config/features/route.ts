import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";

export const dynamic = "force-dynamic";

const ALLOWED_ADMINS = [
  "mohamedsajid.sa@gmail.com",
  "sudharajsekar2005@gmail.com",
  "admin.paperinoirfan27@gmail.com",
  "admin.paperinosam14@gmail.com",
  "gameplayitlifeitis@gmail.com",
  "gameplayitlifeis@gmail.com",
  "gameplayitlife@gmail.com",
  "dejasvini28@gmail.com",
  "kaushika13official@gmail.com",
];

export async function GET() {
  try {
    let features: Record<string, any> = {
      careerDnaEnabled: true,
      careerDnaAdminTestMode: false,
      atsEnabled: true,
      atsAdminTestMode: false,
      youtubeStudyEnabled: true,
      maintenanceTitle: "ATS Analyzer Building in Progress",
      maintenanceMessage: "We are fine-tuning our AI Resume Evaluation engine.",
    };

    let stats: Record<string, any> = {
      atsUsage: 0,
    };

    if (adminDb) {
      const [featSnap, statsSnap] = await Promise.allSettled([
        adminDb.collection("platform_config").doc("features").get(),
        adminDb.collection("platform_stats").doc("global").get(),
      ]);

      if (featSnap.status === "fulfilled" && featSnap.value.exists) {
        features = {
          ...features,
          ...featSnap.value.data(),
        };
      }

      if (statsSnap.status === "fulfilled" && statsSnap.value.exists) {
        stats.atsUsage = statsSnap.value.data()?.atsUsage || 0;
      }
    }

    return NextResponse.json(
      {
        success: true,
        features,
        stats,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error: any) {
    console.warn("[API: config/features GET] Notice:", error?.message);
    return NextResponse.json({
      success: true,
      features: {
        careerDnaEnabled: true,
        careerDnaAdminTestMode: false,
        atsEnabled: true,
        atsAdminTestMode: false,
        youtubeStudyEnabled: true,
        maintenanceTitle: "ATS Analyzer Building in Progress",
        maintenanceMessage: "We are fine-tuning our AI Resume Evaluation engine.",
      },
      stats: { atsUsage: 0 },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanEmail = (verifiedUser.email || "").toLowerCase().trim();
    const isAdmin =
      verifiedUser.role === "admin" ||
      verifiedUser.role === "lead_admin" ||
      (cleanEmail && ALLOWED_ADMINS.includes(cleanEmail));

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const body = await req.json();
    const payload: Record<string, any> = {
      ...body,
      lastUpdated: new Date().toISOString(),
      updatedBy: cleanEmail,
    };

    await adminDb.collection("platform_config").doc("features").set(payload, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Features configuration updated successfully",
      features: payload,
    });
  } catch (error: any) {
    console.warn("[API: config/features POST] Error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to update configuration" },
      { status: 500 }
    );
  }
}
