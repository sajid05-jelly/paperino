import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser || !verifiedUser.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid, email } = verifiedUser;

    // 1. Check if user already has active claims
    if (adminAuth) {
      const userRecord = await adminAuth.getUser(uid);
      const claims = userRecord.customClaims || {};
      if (claims.plan && claims.plan !== "free" && claims.razorpaySubscriptionStatus === "active") {
        return NextResponse.json({
          success: true,
          plan: claims.plan,
          status: "already_active"
        });
      }
    }

    // 2. Self-healing check against Razorpay API for recent captured payments
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (key_id && key_secret && email) {
      try {
        const rzp = new Razorpay({ key_id, key_secret });
        const payments = await rzp.payments.all({ count: 25 });
        const userPayments = (payments.items || []).filter(
          (p: any) => p.email?.toLowerCase() === email.toLowerCase() && p.status === "captured"
        );

        if (userPayments.length > 0) {
          // Sort newest first
          userPayments.sort((a: any, b: any) => b.created_at - a.created_at);
          const latestPayment = userPayments[0];

          // Determine plan
          let detectedPlan = "premium";
          const desc = (latestPayment.description || "").toLowerCase();
          const amount = latestPayment.amount; // in paise

          if (latestPayment.notes?.plan) {
            detectedPlan = latestPayment.notes.plan.toLowerCase();
          } else if (desc.includes("plus") || amount === 4900) {
            detectedPlan = "plus";
          } else if (desc.includes("pro") || amount === 7900) {
            detectedPlan = "pro";
          }

          // Auto-heal by applying custom claims and updating Firestore
          if (adminAuth) {
            const userRecord = await adminAuth.getUser(uid);
            const currentClaims = userRecord.customClaims || {};
            await adminAuth.setCustomUserClaims(uid, {
              ...currentClaims,
              plan: detectedPlan,
              razorpaySubscriptionStatus: "active",
              razorpayPaymentId: latestPayment.id,
              autoHealedAt: Date.now()
            });
            console.log(`[Self-Healing] Auto-activated plan ${detectedPlan} for user ${email}`);
          }

          if (adminDb) {
            try {
              await adminDb.collection("users").doc(uid).set(
                {
                  plan: detectedPlan,
                  razorpaySubscriptionStatus: "active",
                  razorpayPaymentId: latestPayment.id,
                  updatedAt: Date.now()
                },
                { merge: true }
              );
            } catch (err) {
              console.warn("[Self-Healing] Firestore sync warning:", err);
            }
          }

          return NextResponse.json({
            success: true,
            plan: detectedPlan,
            status: "auto_healed",
            paymentId: latestPayment.id
          });
        }
      } catch (rzpErr) {
        console.warn("[Self-Healing] Razorpay lookup warning:", rzpErr);
      }
    }

    return NextResponse.json({ success: true, plan: "free", status: "no_payment_found" });
  } catch (error: any) {
    console.error("Plan sync error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync plan" }, { status: 500 });
  }
}
