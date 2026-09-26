import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import Razorpay from "razorpay";

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

    let event;
    try {
      if (Razorpay.validateWebhookSignature(rawBody, signature, secret)) {
        event = JSON.parse(rawBody);
      } else {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!event || !adminDb) {
      return NextResponse.json({ error: "Invalid event or db missing" }, { status: 400 });
    }

    const eventId = req.headers.get("x-razorpay-event-id");
    if (eventId) {
      const eventRef = adminDb.collection("webhook_events").doc(eventId);
      const eventSnap = await eventRef.get();
      if (eventSnap.exists) {
        return NextResponse.json({ success: true, message: "Already processed" });
      }
      await eventRef.set({ processedAt: Date.now(), event: event.event });
    }

    if (
      event.event === "subscription.charged" ||
      event.event === "subscription.activated" ||
      event.event === "subscription.halted" ||
      event.event === "subscription.cancelled" ||
      event.event === "subscription.completed"
    ) {
      const subscription = event.payload.subscription.entity;
      const userId = subscription.notes?.userId;
      const plan = subscription.notes?.plan;

      if (!userId) {
        return NextResponse.json({ success: true }); 
      }

      const userRef = adminDb.collection("users").doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        return NextResponse.json({ success: true });
      }
      
      const userData = userSnap.data();
      
      if (userData?.razorpaySubscriptionId && userData.razorpaySubscriptionId !== subscription.id) {
          if (event.event !== "subscription.activated") {
              return NextResponse.json({ success: true });
          }
      }

      const updates: any = {
        razorpaySubscriptionId: subscription.id,
        razorpaySubscriptionStatus: subscription.status,
        updatedAt: Date.now()
      };

      if (subscription.current_start) updates.currentPeriodStart = subscription.current_start;
      if (subscription.current_end) updates.currentPeriodEnd = subscription.current_end;

      if (subscription.status === "active" && plan) {
        updates.plan = plan;
      } else if (subscription.status === "cancelled" || subscription.status === "completed" || subscription.status === "halted") {
        updates.plan = "free"; 
      }

      await userRef.update(updates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
