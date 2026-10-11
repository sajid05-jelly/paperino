import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getStoredSections, saveStoredSection } from "@/lib/sections-store";

export const dynamic = "force-dynamic";

let quotaExhaustedUntil = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const subjectId = searchParams.get("subjectId");

    // 1. Get currently persisted sections
    let allSections = getStoredSections();

    // 2. Attempt to sync with Firestore if adminDb is available and circuit breaker is open
    const shouldTryFirestore = adminDb && Date.now() > quotaExhaustedUntil;

    if (shouldTryFirestore && adminDb) {
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
        if (dbErr?.message?.includes("RESOURCE_EXHAUSTED") || dbErr?.code === 8) {
          // Pause Firestore sweeps for 5 minutes to keep responses ultra-fast
          quotaExhaustedUntil = Date.now() + 5 * 60 * 1000;
          console.warn("[Sections API] Firestore daily quota exhausted; active circuit breaker for 5 mins.");
        } else {
          console.warn("[Sections API] Firestore sync warning:", dbErr?.message || dbErr);
        }
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
    const fallback = getStoredSections();
    return NextResponse.json({ success: true, sections: fallback });
  }
}
