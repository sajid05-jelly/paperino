import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature found" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
    }

    let event: any;
    try {
      if (Razorpay.validateWebhookSignature(rawBody, signature, secret)) {
        event = JSON.parse(rawBody);
      } else {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!event) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    // Optional idempotency check (zero-crash if quota hits)
    const eventId = req.headers.get("x-razorpay-event-id");
    if (eventId && adminDb) {
      try {
        const eventRef = adminDb.collection("webhook_events").doc(eventId);
        const eventSnap = await eventRef.get();
        if (eventSnap.exists) {
          return NextResponse.json({ success: true, message: "Already processed" });
        }
        await eventRef.set({ processedAt: Date.now(), event: event.event }, { merge: true });
      } catch (err) {
        console.warn("Webhook idempotency check skipped:", err);
      }
    }

    const eventName = event.event;
    console.log(`[Razorpay Webhook] Received event: ${eventName}`);

    let targetUserId: string | null = null;
    let targetPlan: string = "premium";
    let subId: string = "";
    let subStatus: string = "active";
    let paymentId: string = "";
    let customerEmail: string = "";

    // ── Handle Subscription Events ───────────────────────────────────────────
    if (
      eventName === "subscription.charged" ||
      eventName === "subscription.activated" ||
      eventName === "subscription.authenticated" ||
      eventName === "subscription.halted" ||
      eventName === "subscription.cancelled" ||
      eventName === "subscription.completed"
    ) {
      const subscription = event.payload?.subscription?.entity || {};
      subId = subscription.id || "";
      subStatus = subscription.status || "active";
      targetUserId = subscription.notes?.userId || null;
      targetPlan = (subscription.notes?.plan || "premium").toLowerCase();
      customerEmail = subscription.customer_email || "";

      if (eventName === "subscription.cancelled" || eventName === "subscription.completed" || eventName === "subscription.halted") {
        targetPlan = "free";
        subStatus = eventName.replace("subscription.", "");
      }
    }

    // ── Handle Payment Captured Events (UPI / Card Direct Captures) ──────────
    else if (eventName === "payment.captured" || eventName === "order.paid") {
      const payment = event.payload?.payment?.entity || {};
      paymentId = payment.id || "";
      subId = payment.subscription_id || "";
      subStatus = "active";
      targetUserId = payment.notes?.userId || null;
      customerEmail = payment.email || "";

      // Determine plan from notes, description, or amount
      const notesPlan = payment.notes?.plan;
      const desc = (payment.description || "").toLowerCase();
      const amount = payment.amount; // in paise

      if (notesPlan) {
        targetPlan = notesPlan.toLowerCase();
      } else if (desc.includes("plus") || amount === 4900) {
        targetPlan = "plus";
      } else if (desc.includes("pro") || amount === 7900) {
        targetPlan = "pro";
      } else {
        targetPlan = "premium";
      }
    }

    // If targetUserId is missing but we have customer email, lookup user in Firebase Auth
    if (!targetUserId && customerEmail && adminAuth) {
      try {
        const userRec = await adminAuth.getUserByEmail(customerEmail);
        targetUserId = userRec.uid;
        console.log(`[Razorpay Webhook] Resolved user by email ${customerEmail} -> ${targetUserId}`);
      } catch (lookupErr) {
        console.warn(`[Razorpay Webhook] Could not find user by email ${customerEmail}:`, lookupErr);
      }
    }

    if (!targetUserId) {
      console.warn("[Razorpay Webhook] Could not resolve userId for event, skipping activation.");
      return NextResponse.json({ success: true, message: "No target user resolved" });
    }

    // ── 1. GUARANTEED ACTIVATION VIA CUSTOM CLAIMS FIRST ─────────────────────
    if (adminAuth) {
      try {
        const userRecord = await adminAuth.getUser(targetUserId);
        const currentClaims = userRecord.customClaims || {};
        await adminAuth.setCustomUserClaims(targetUserId, {
          ...currentClaims,
          plan: targetPlan,
          razorpaySubscriptionStatus: subStatus,
          razorpaySubscriptionId: subId || currentClaims.razorpaySubscriptionId || "",
          razorpayPaymentId: paymentId || currentClaims.razorpayPaymentId || "",
          planActivatedAt: Date.now()
        });
        console.log(`[Razorpay Webhook] Successfully updated Custom Claims for ${targetUserId} to plan=${targetPlan}`);
      } catch (claimsErr) {
        console.error("[Razorpay Webhook] Failed to set custom claims:", claimsErr);
      }
    }

    // ── 2. SYNC TO FIRESTORE WITH ZERO-CRASH MERGE ───────────────────────────
    if (adminDb) {
      try {
        const userRef = adminDb.collection("users").doc(targetUserId);
        await userRef.set(
          {
            plan: targetPlan,
            razorpaySubscriptionStatus: subStatus,
            razorpaySubscriptionId: subId || "",
            razorpayPaymentId: paymentId || "",
            updatedAt: Date.now()
          },
          { merge: true }
        );
        console.log(`[Razorpay Webhook] Successfully updated Firestore user doc for ${targetUserId}`);
      } catch (dbErr) {
        console.warn("[Razorpay Webhook] Firestore write warning (quota or network):", dbErr);
      }
    }

    return NextResponse.json({ success: true, user: targetUserId, plan: targetPlan });
  } catch (error: any) {
    console.error("[Razorpay Webhook] Fatal error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
