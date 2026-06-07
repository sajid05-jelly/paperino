import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, name } = body;

    if (!action || !id || !adminDb) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (action === "visit_subject") {
      const subjectRef = adminDb.collection("platform_stats").doc("subjects").collection("visits").doc(id);
      await subjectRef.set({
        name: name || id,
        visits: admin.firestore.FieldValue.increment(1),
        lastVisited: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } else if (action === "download_material") {
      const materialRef = adminDb.collection("platform_stats").doc("materials").collection("downloads").doc(id);
      await materialRef.set({
        name: name || id,
        downloads: admin.firestore.FieldValue.increment(1),
        lastDownloaded: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in tracking route:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
