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
    if (!adminDb) {
      return NextResponse.json({
        success: true,
        config: {
          maintenance: false,
          title: "System Maintenance Mode",
          message: "We are currently performing critical system upgrades. Please check back soon!",
          estimatedReturn: "A few hours",
          showProgress: true,
          game: "paperCatch",
          youtubeStudy: true,
        },
      });
    }

    const snap = await adminDb.collection("settings").doc("siteConfig").get();
    const data = snap.exists ? snap.data() || {} : {};

    return NextResponse.json({
      success: true,
      config: {
        maintenance: data.maintenance || false,
        title: data.title || "System Maintenance Mode",
        message: data.message || "We are currently performing critical system upgrades. Please check back soon!",
        estimatedReturn: data.estimatedReturn || "A few hours",
        showProgress: data.showProgress ?? true,
        game: data.game || "paperCatch",
        youtubeStudy: data.youtubeStudy !== false,
      },
    });
  } catch (error: any) {
    console.warn("[API: admin/system/config GET] Warning:", error?.message);
    return NextResponse.json({
      success: true,
      config: {
        maintenance: false,
        title: "System Maintenance Mode",
        message: "We are currently performing critical system upgrades. Please check back soon!",
        estimatedReturn: "A few hours",
        showProgress: true,
        game: "paperCatch",
        youtubeStudy: true,
      },
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
    const {
      maintenance,
      title,
      message,
      estimatedReturn,
      showProgress,
      game,
      youtubeStudy,
    } = body;

    const payload: Record<string, any> = {
      maintenance: Boolean(maintenance),
      title: String(title || "System Maintenance Mode").trim(),
      message: String(message || "").trim(),
      estimatedReturn: String(estimatedReturn || "A few hours").trim(),
      showProgress: showProgress ?? true,
      game: String(game || "paperCatch").trim(),
      youtubeStudy: youtubeStudy !== false,
      updatedAt: new Date(),
      updatedBy: cleanEmail,
    };

    await adminDb.collection("settings").doc("siteConfig").set(payload, { merge: true });

    return NextResponse.json({
      success: true,
      message: "System configuration saved successfully",
      config: payload,
    });
  } catch (error: any) {
    console.warn("[API: admin/system/config POST] Error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed to save configuration" },
      { status: 500 }
    );
  }
}
