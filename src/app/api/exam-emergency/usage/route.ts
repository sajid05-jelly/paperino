import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";
import { getCurrentMonthKey } from "@/lib/subscription";

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

// GET: Fetch user's Exam Emergency usage safely with Admin DB
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user || !user.uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ success: true, count: 0, currentMonth: getCurrentMonthKey() });
    }

    const userDoc = await adminDb.collection("users").doc(user.uid).get();
    const data = userDoc.exists ? userDoc.data() || {} : {};
    const currentMonth = getCurrentMonthKey();
    const lastResetMonth = data.emergencyLastResetMonth || "";
    let count = Number(data.emergencyMonthlyUsageCount) || 0;

    // Reset if new month
    if (lastResetMonth !== currentMonth) {
      count = 0;
      await adminDb.collection("users").doc(user.uid).set(
        {
          emergencyMonthlyUsageCount: 0,
          emergencyLastResetMonth: currentMonth,
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      count,
      currentMonth,
    });
  } catch (err: any) {
    console.warn("[exam-emergency/usage GET] error:", err?.message);
    return NextResponse.json({ success: true, count: 0, currentMonth: getCurrentMonthKey() });
  }
}

// POST: Safely activate emergency mode & increment usage count with Admin DB
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user || !user.uid) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cleanEmail = (user.email || "").toLowerCase().trim();
    const isAdmin =
      user.role === "admin" ||
      user.role === "lead_admin" ||
      (cleanEmail && ALLOWED_ADMINS.includes(cleanEmail));

    if (!adminDb) {
      return NextResponse.json({ success: true });
    }

    const userDocRef = adminDb.collection("users").doc(user.uid);
    const snap = await userDocRef.get();
    const data = snap.exists ? snap.data() || {} : {};
    const currentMonth = getCurrentMonthKey();
    const lastResetMonth = data.emergencyLastResetMonth || "";
    let count = lastResetMonth === currentMonth ? (Number(data.emergencyMonthlyUsageCount) || 0) : 0;

    // Admins always bypass limits without restriction
    if (isAdmin) {
      await userDocRef.set(
        {
          emergencyMonthlyUsageCount: count + 1,
          emergencyLastResetMonth: currentMonth,
        },
        { merge: true }
      );
      return NextResponse.json({ success: true, count: count + 1 });
    }

    const plan = data.plan || (user as any).plan || "free";
    const monthlyLimit = plan === "premium" ? Infinity : plan === "pro" ? 11 : 0;

    if (count >= monthlyLimit && monthlyLimit !== Infinity) {
      return NextResponse.json(
        {
          success: false,
          error: `You have reached your monthly limit of ${monthlyLimit} Emergency Mode uses.`,
        },
        { status: 403 }
      );
    }

    await userDocRef.set(
      {
        emergencyMonthlyUsageCount: count + 1,
        emergencyLastResetMonth: currentMonth,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, count: count + 1 });
  } catch (err: any) {
    console.error("[exam-emergency/usage POST] error:", err?.message);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
