import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const user = await verifyServerAuth(authHeader);
    if (!user || !user.uid) {
      return NextResponse.json({ success: true, results: [] });
    }

    if (!adminDb) {
      return NextResponse.json({ success: true, results: [] });
    }

    const snap = await adminDb
      .collection("challenge_results")
      .where("userId", "==", user.uid)
      .where("isOfficial", "==", true)
      .limit(20)
      .get();

    const results: any[] = [];
    snap.forEach((doc) => {
      results.push(doc.data());
    });

    return NextResponse.json(
      { success: true, results },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.warn("[API: challenges/user-sessions GET] Notice:", err?.message);
    return NextResponse.json({ success: true, results: [] });
  }
}
