import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";

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

function toProperCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser || !verifiedUser.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid, email } = verifiedUser;
    const cleanEmail = (email || "").toLowerCase().trim();
    const isAdmin =
      verifiedUser.role === "admin" ||
      verifiedUser.role === "lead_admin" ||
      (cleanEmail && ALLOWED_ADMINS.includes(cleanEmail));

    if (!adminDb) {
      return NextResponse.json({
        success: true,
        user: {
          uid,
          email: cleanEmail,
          role: isAdmin ? "admin" : "student",
          plan: isAdmin ? "admin" : "free",
          status: "active",
        },
      });
    }

    const userDocRef = adminDb.collection("users").doc(uid);
    const snap = await userDocRef.get();

    if (!snap.exists) {
      const newUserData = {
        displayName: toProperCase((verifiedUser as any).name || cleanEmail.split("@")[0] || "Student"),
        email: cleanEmail,
        role: isAdmin ? "admin" : "student",
        plan: isAdmin ? "admin" : "free",
        status: "active",
        points: 0,
        uploads: 0,
        seasonPoints: 0,
        seasonUploads: 0,
        lastPulseReadAt: new Date(0),
        createdAt: new Date(),
        lastLogin: new Date(),
      };
      await userDocRef.set(newUserData);
      return NextResponse.json({ success: true, user: newUserData });
    }

    const data = snap.data() || {};
    const updates: Record<string, any> = {};

    // Ensure admin role in Firestore
    if (isAdmin && (data.role !== "admin" || data.plan !== "admin")) {
      updates.role = "admin";
      updates.plan = "admin";
    }

    // Update lastLogin once per day
    const now = new Date();
    const lastLoginDate = data.lastLogin?.toDate
      ? data.lastLogin.toDate()
      : data.lastLogin
      ? new Date(data.lastLogin)
      : new Date(0);
    if (
      lastLoginDate.getDate() !== now.getDate() ||
      lastLoginDate.getMonth() !== now.getMonth() ||
      lastLoginDate.getFullYear() !== now.getFullYear()
    ) {
      updates.lastLogin = now;
    }

    if (Object.keys(updates).length > 0) {
      await userDocRef.set(updates, { merge: true });
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          ...data,
          ...updates,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.warn("[/api/user/profile GET] error:", err?.message);
    return NextResponse.json({ error: err?.message || "Failed to fetch user profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser || !verifiedUser.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ success: true });
    }

    const body = await req.json();
    const userDocRef = adminDb.collection("users").doc(verifiedUser.uid);
    await userDocRef.set(body, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.warn("[/api/user/profile POST] error:", err?.message);
    return NextResponse.json({ error: err?.message || "Failed to update user profile" }, { status: 500 });
  }
}
