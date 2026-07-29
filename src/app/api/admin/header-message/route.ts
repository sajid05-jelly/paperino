import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";

export const dynamic = "force-dynamic";

// GET: Fetch current header message
export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }

    const docRef = adminDb.collection("system_settings").doc("header_message");
    const snap = await docRef.get();

    if (snap.exists) {
      return NextResponse.json({ text: snap.data()?.text || "" });
    } else {
      return NextResponse.json({ text: "The Universe of Study Materials" });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save header message (admin only)
export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user || (user.role !== "admin" && user.role !== "lead_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const docRef = adminDb.collection("system_settings").doc("header_message");
    await docRef.set({ text: text.trim(), updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ success: true, message: "Header message updated" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
