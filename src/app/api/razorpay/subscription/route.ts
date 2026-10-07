import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { verifyServerAuth } from "@/lib/auth-verify";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const auth = await verifyServerAuth(authHeader);
    if (!auth || !auth.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();
    const planName = plan ? plan.toUpperCase() : "";

    if (!['PLUS', 'PRO', 'PREMIUM'].includes(planName)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planMap: Record<string, string | undefined> = {
      PLUS: process.env.RAZORPAY_PLUS_PLAN_ID,
      PRO: process.env.RAZORPAY_PRO_PLAN_ID,
      PREMIUM: process.env.RAZORPAY_PREMIUM_PLAN_ID,
    };

    const planId = planMap[planName];
    if (!planId) {
      return NextResponse.json({ error: "Plan configuration missing on server" }, { status: 500 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
       return NextResponse.json({ error: "Razorpay credentials missing" }, { status: 500 });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const subscription = await instance.subscriptions.create({
      plan_id: planId,
      customer_notify: 0,
      total_count: 120,
      notes: {
        userId: auth.uid,
        plan: planName.toLowerCase(), // keep lowercase for backward compatibility or use whatever is expected
      }
    });

    return NextResponse.json({ 
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error("Razorpay Sub Creation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create subscription" }, { status: 500 });
  }
}
