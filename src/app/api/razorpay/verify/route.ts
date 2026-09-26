import { NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

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

    if (!adminDb) {
      return NextResponse.json({ error: "DB configuration missing" }, { status: 500 });
    }

    const userRef = adminDb.collection("users").doc(auth.uid);
    await userRef.update({
      plan: plan,
      razorpaySubscriptionId: razorpay_subscription_id,
      razorpaySubscriptionStatus: "active",
      updatedAt: Date.now()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Razorpay verify error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
