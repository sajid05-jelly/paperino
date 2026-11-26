import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SUBJECTS as STATIC_SUBJECTS } from "@/lib/subjects";

export const dynamic = "force-dynamic";

interface MaterialRecord {
  id: string;
  [key: string]: unknown;
}

// Server-side in-memory cache for materials (10-minute TTL)
const materialsApiCache = new Map<string, { materials: MaterialRecord[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = (searchParams.get("departmentId") || searchParams.get("deptId") || "").toLowerCase().trim();
    const rawSemId = searchParams.get("semesterId") || searchParams.get("semId") || "";
    const semId = rawSemId.replace(/^semester-/, "").trim();
    const subjectId = (searchParams.get("subjectId") || "").toLowerCase().trim();
    const slug = (searchParams.get("slug") || "").toLowerCase().trim();
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!semId && !subjectId && !slug) {
      return NextResponse.json(
        { error: "semesterId and subjectId are required" },
        { status: 400 }
      );
    }

    const cacheKey = `${departmentId || "all"}_${semId}_${subjectId || slug}`;
    const now = Date.now();

    if (!forceRefresh) {
      const cached = materialsApiCache.get(cacheKey);
      if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
        return NextResponse.json(
          { success: true, materials: cached.materials, count: cached.materials.length, source: "cache" },
          {
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          }
        );
      }
    }

    if (!adminDb) {
      return NextResponse.json({
        success: true,
        materials: [],
        count: 0,
        warning: "Database initializing"
      });
    }

    // Resolve all candidate subject IDs (e.g. "calc" <-> "calculus-and-linear-algebra")
    const candidateSubjectIds = new Set<string>();
    if (subjectId) candidateSubjectIds.add(subjectId);
    if (slug) candidateSubjectIds.add(slug);

    const semSubs = STATIC_SUBJECTS[semId] || [];
    for (const sub of semSubs) {
      const sSlug = sub.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      if (candidateSubjectIds.has(sub.id.toLowerCase()) || candidateSubjectIds.has(sSlug)) {
        candidateSubjectIds.add(sub.id.toLowerCase());
        candidateSubjectIds.add(sSlug);
      }
    }

    // Query materials with flexible string & numeric semesterId matching
    const materialsRef = adminDb.collection("materials");
    const numericSemId = parseInt(semId, 10);
    const queries: Promise<any>[] = [];

    const idList = Array.from(candidateSubjectIds);
    if (idList.length === 0) {
      // Query by semester only
      queries.push(materialsRef.where("semesterId", "==", semId).get());
      if (!isNaN(numericSemId)) {
        queries.push(materialsRef.where("semesterId", "==", numericSemId).get());
      }
    } else {
      idList.forEach((sId) => {
        queries.push(
          materialsRef
            .where("semesterId", "==", semId)
            .where("subjectId", "==", sId)
            .get()
        );
        if (!isNaN(numericSemId)) {
          queries.push(
            materialsRef
              .where("semesterId", "==", numericSemId)
              .where("subjectId", "==", sId)
              .get()
          );
        }
      });
    }

    const snapshots = await Promise.all(queries);
    const seenIds = new Set<string>();
    const materials: MaterialRecord[] = [];

    const normReqDept = departmentId.replace(/[^a-z0-9]/g, "");

    snapshots.forEach((snap: any) => {
      if (snap && snap.docs) {
        snap.docs.forEach((doc: any) => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          const data = doc.data();

          // Only return approved materials for public route
          const isApproved = data.status === "approved" || (!data.status && !data.rejectedAt);
          if (!isApproved) return;

          // Resilient department filter
          if (normReqDept && normReqDept !== "all" && data.departmentId) {
            const normDocDept = String(data.departmentId).toLowerCase().replace(/[^a-z0-9]/g, "");
            const isBtechGroup = (normReqDept.includes("btech") || normReqDept.includes("be")) && 
                                 (normDocDept.includes("btech") || normDocDept.includes("be") || normDocDept.includes("mtech"));
            if (normDocDept !== normReqDept && !isBtechGroup) {
              return;
            }
          }

          const createdAtMillis = data.createdAt?.toMillis
            ? data.createdAt.toMillis()
            : typeof data.createdAt === "number"
            ? data.createdAt
            : data.createdAt
            ? new Date(data.createdAt).getTime()
            : 0;

          materials.push({
            id: doc.id,
            ...data,
            createdAt: createdAtMillis,
          });
        }
      });
      }
    });

    // Sort newest first
    materials.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

    // Cache the result
    materialsApiCache.set(cacheKey, { materials, timestamp: now });

    return NextResponse.json(
      {
        success: true,
        materials,
        count: materials.length,
        source: "firestore",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch materials";
    console.error("[Materials API Error]:", error);
    return NextResponse.json(
      { success: false, error: errMessage, materials: [] },
      { status: 500 }
    );
  }
}
