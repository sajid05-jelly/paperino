import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: "adminDb not initialized" }, { status: 500 });
  }

  try {
    const colRef = adminDb.collection("career_dna");
    const snapshot = await colRef.get();
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
    return NextResponse.json({ docs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
