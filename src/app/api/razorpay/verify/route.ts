import { NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const auth = await verifyServerAuth(authHeader);
    if (!auth || !auth.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      plan
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !plan) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Missing secret key configuration" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_payment_id + "|" + razorpay_subscription_id)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const cleanPlan = plan.toLowerCase();

    // ── 1. GUARANTEED ACTIVATION VIA CUSTOM CLAIMS FIRST ─────────────────────
    // Custom claims are cryptographically signed into Firebase ID token and
    // do NOT depend on Firestore quota, network, or security rules.
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUser(auth.uid);
        const currentClaims = userRecord.customClaims || {};
        await adminAuth.setCustomUserClaims(auth.uid, {
          ...currentClaims,
          plan: cleanPlan,
          razorpaySubscriptionId: razorpay_subscription_id,
          razorpaySubscriptionStatus: "active",
          razorpayPaymentId: razorpay_payment_id,
          planActivatedAt: Date.now()
        });
        console.log(`[Razorpay Verify] Successfully applied custom claims for user ${auth.uid} to plan ${cleanPlan}`);
      } catch (claimsErr) {
        console.error("[Razorpay Verify] Failed to set custom claims:", claimsErr);
      }
    }

    // ── 2. SYNC TO FIRESTORE USER DOCUMENT ───────────────────────────────────
    if (adminDb) {
      try {
        const userRef = adminDb.collection("users").doc(auth.uid);
        await userRef.set(
          {
            plan: cleanPlan,
            razorpaySubscriptionId: razorpay_subscription_id,
            razorpaySubscriptionStatus: "active",
            razorpayPaymentId: razorpay_payment_id,
            updatedAt: Date.now()
          },
          { merge: true }
        );
        console.log(`[Razorpay Verify] Successfully synced Firestore user doc for ${auth.uid}`);
      } catch (dbError: any) {
        console.warn("[Razorpay Verify] Firestore write warning (quota or network):", dbError?.message || dbError);
      }
    }

    return NextResponse.json({ success: true, plan: cleanPlan });
  } catch (error: any) {
    console.error("Razorpay verify error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
