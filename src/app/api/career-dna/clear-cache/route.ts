import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: "adminDb not initialized" }, { status: 500 });
  }

  try {
    const batch = adminDb.batch();
    const deletedDocs: string[] = [];

    // 1. Clear unstop_cache
    const colRef = adminDb.collection("unstop_cache");
    const snapshot = await colRef.get();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedDocs.push(`unstop_cache/${doc.id}`);
    });

    // 2. Clear career_dna
    const dnaColRef = adminDb.collection("career_dna");
    const dnaSnapshot = await dnaColRef.get();
    dnaSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      deletedDocs.push(`career_dna/${doc.id}`);
    });
    
    await batch.commit();
    return NextResponse.json({ success: true, deletedDocs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
