import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getStoredSections, setStoredSections } from "@/lib/sections-store";

export const dynamic = "force-dynamic";

let quotaExhaustedUntil = 0;
const sectionsCache = new Map<string, { data: any[]; timestamp: number }>();
const SECTIONS_CACHE_TTL = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const subjectId = searchParams.get("subjectId");

    const cacheKey = `${departmentId || "all"}_${subjectId || "all"}`;
    const now = Date.now();
    const cached = sectionsCache.get(cacheKey);
    if (cached && (now - cached.timestamp < SECTIONS_CACHE_TTL)) {
      return NextResponse.json({ success: true, sections: cached.data });
    }

    let allSections: any[] = [];

    // 1. Attempt to fetch fresh source of truth from Firestore if available
    const shouldTryFirestore = adminDb && Date.now() > quotaExhaustedUntil;

    if (shouldTryFirestore && adminDb) {
      try {
        let secQuery: FirebaseFirestore.Query = adminDb.collection("subject_sections");
        const hasFilter = Boolean(departmentId || subjectId);

        if (departmentId) {
          secQuery = secQuery.where("departmentId", "==", departmentId);
        }
        if (subjectId) {
          secQuery = secQuery.where("subjectId", "==", subjectId);
        }

        const secSnapshot = await secQuery.get();
        const freshList: any[] = [];
        const seenKeys = new Set<string>();

        secSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          const key = `${data.departmentId}_${data.semesterId}_${data.subjectId}_${data.sectionType}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            freshList.push({
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
            });
          }
        });

        allSections = freshList;
        // Only overwrite full local persistent store when an unfiltered sync was requested
        if (!hasFilter) {
          setStoredSections(freshList);
        }
      } catch (dbErr: any) {
        if (dbErr?.message?.includes("RESOURCE_EXHAUSTED") || dbErr?.code === 8) {
          quotaExhaustedUntil = Date.now() + 5 * 60 * 1000;
          console.warn("[Sections API] Firestore daily quota exhausted; active circuit breaker for 5 mins.");
        } else {
          console.warn("[Sections API] Firestore sync warning:", dbErr?.message || dbErr);
        }
        // Fallback to local stored sections only when Firestore read fails
        allSections = getStoredSections();
      }
    } else {
      allSections = getStoredSections();
    }

    // 2. Ensure filter by departmentId and subjectId if requested (handles fallback or extra safety)
    let result = allSections;
    if (departmentId) {
      result = result.filter(s => s.departmentId === departmentId);
    }
    if (subjectId) {
      result = result.filter(s => s.subjectId === subjectId);
    }

    result.sort((a, b) => (a.subjectName || "").localeCompare(b.subjectName || ""));
    sectionsCache.set(cacheKey, { data: result, timestamp: now });
    return NextResponse.json(
      { success: true, sections: result },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
        }
      }
    );
  } catch (error: any) {
    console.error("Error in /api/sections GET:", error);
    const fallback = getStoredSections();
    return NextResponse.json(
      { success: true, sections: fallback },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300"
        }
      }
    );
  }
}
