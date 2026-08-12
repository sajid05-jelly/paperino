import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { randomUUID } from "crypto";

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

  const token = authHeader.substring(7);
  let uid = "";
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
  } catch (err: any) {
    return NextResponse.json(
      { error: "Access Denied", message: err.message || "Invalid token" },
      { status: 401 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
  }

  try {
    const downloadToken = randomUUID();
    
    // Save to Firestore with 5 min validity period (with 2s fallback timeout to avoid hanging on quota limits)
    const tokenSaveTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
    await Promise.race([
      adminDb.collection("download_tokens").doc(downloadToken).set({
        uid,
        token: downloadToken,
        used: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }),
      tokenSaveTimeout,
    ]);

    return NextResponse.json({ success: true, token: downloadToken });
  } catch (err: any) {
    console.error("[Token API] Failed to generate download token:", err);
    return NextResponse.json({ error: "Failed to generate session token" }, { status: 500 });
  }
}
