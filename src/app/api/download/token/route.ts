import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { checkMonthlyUsage } from "@/lib/monthly-usage";
import { resolveUserDownloaderName } from "@/lib/watermark";
import { createSignedDownloadToken } from "@/lib/downloadToken";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Verify Authentication via Bearer Header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Access Denied", message: "Missing authorization header" },
      { status: 401 }
    );
  }

  let bodyDisplayName = "";
  let bodyEmail = "";
  try {
    const body = await req.json().catch(() => null);
    if (body?.displayName && typeof body.displayName === "string") {
      bodyDisplayName = body.displayName.trim();
    }
    if (body?.email && typeof body.email === "string") {
      bodyEmail = body.email.trim();
    }
  } catch {}

  const token = authHeader.substring(7);
  let uid = "";
  let email = "student@paperino.app";
  let name = "Paperino User";
  let isAdmin = false;
  let decodedToken: admin.auth.DecodedIdToken | null = null;

  try {
    decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
    if (decodedToken.email) {
      email = decodedToken.email;
    } else if (bodyEmail) {
      email = bodyEmail;
    }
    
    // Resolve user's actual profile name from Google Account / Firestore / Auth / body / email
    name = await resolveUserDownloaderName({
      uid,
      providedName: bodyDisplayName,
      tokenName: decodedToken.name,
      email,
      adminDb
    });
    
    const allowedAdmins = [
      "mohamedsajid.sa@gmail.com",
      "sudharajsekar2005@gmail.com",
      "admin.paperinoirfan27@gmail.com",
      "admin.paperinosam14@gmail.com",
      "gameplayitlifeitis@gmail.com",
      "dejasvini28@gmail.com",
      "kaushika13official@gmail.com"
    ];
    if (allowedAdmins.includes(email.toLowerCase())) {
      isAdmin = true;
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "Access Denied", message: err.message || "Invalid token" },
      { status: 401 }
    );
  }

  // Check Monthly Download Limit for non-admins and non-premium users
  const userPlan = (decodedToken?.plan as any) || undefined;
  const isUnlimitedPlan = userPlan === "premium" || userPlan === "pro";

  if (!isAdmin && !isUnlimitedPlan && uid) {
    const usageCheck = await checkMonthlyUsage(uid, "downloads", userPlan);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: "Download Limit Reached",
          message: usageCheck.error || `Monthly download limit reached (${usageCheck.limit} downloads/month). Upgrade to Plus or Pro for higher limits.`,
          plan: usageCheck.plan,
          limit: usageCheck.limit,
          used: usageCheck.used
        },
        { status: 403 }
      );
    }
  }

  try {
    // Generate tamper-proof cryptographically signed token containing user's exact Gmail identity
    const downloadToken = createSignedDownloadToken({
      uid,
      name,
      email,
      isAdmin,
      plan: userPlan
    });
    
    // Non-blocking fire-and-forget save to Firestore (will not block or fail download if Firestore is slow/over quota)
    if (adminDb) {
      adminDb.collection("download_tokens").doc(downloadToken).set({
        uid,
        email,
        name,
        isAdmin,
        token: downloadToken,
        used: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }).catch((err: any) => {
        console.warn("[Token API] Firestore token backup notice:", err.message);
      });
    }

    return NextResponse.json({ success: true, token: downloadToken });
  } catch (err: any) {
    console.error("[Token API] Failed to generate download token:", err);
    return NextResponse.json({ error: "Failed to generate session token" }, { status: 500 });
  }
}
