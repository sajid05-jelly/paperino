import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getStoredSections, saveStoredSection } from "@/lib/sections-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const subjectId = searchParams.get("subjectId");

    // 1. Get currently persisted sections
    let allSections = getStoredSections();

    // 2. Attempt to sync with Firestore if adminDb is available and quota permits
    if (adminDb) {
      try {
        const secSnapshot = await adminDb.collection("subject_sections").get();
        secSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          const cleanSec = {
            id: docSnap.id,
            subjectId: data.subjectId,
            subjectName: data.subjectName || data.subjectId,
            subjectCode: data.subjectCode || "",
            departmentId: data.departmentId,
            departmentName: data.departmentName || (data.departmentId ? data.departmentId.toUpperCase() : ""),
            semesterId: String(data.semesterId || "1"),
            sectionType: data.sectionType,
            createdBy: data.createdBy,
            creatorName: data.creatorName || (data.creatorEmail ? data.creatorEmail.split("@")[0] : undefined),
            creatorEmail: data.creatorEmail,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
          };
          saveStoredSection(cleanSec as any);
        });
        allSections = getStoredSections();
      } catch (dbErr: any) {
        // Quota exceeded or network issue: graceful fallback to stored sections
        console.warn("Firestore sync warning (using persistent store):", dbErr?.message || dbErr);
      }
    }

    // 3. Filter by departmentId and subjectId if requested
    let result = allSections;
    if (departmentId && subjectId) {
      result = allSections.filter(
        s => s.departmentId === departmentId && s.subjectId === subjectId
      );
    }

    result.sort((a, b) => (a.subjectName || "").localeCompare(b.subjectName || ""));
    return NextResponse.json({ success: true, sections: result });
  } catch (error: any) {
    console.error("Error in /api/sections GET:", error);
    // Even if an unexpected error occurs, return stored sections rather than failing
    const fallback = getStoredSections();
    return NextResponse.json({ success: true, sections: fallback });
  }
}
