import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";

export const dynamic = "force-dynamic";

const ALLOWED_ADMINS = [
  "mohamedsajid.sa@gmail.com",
  "mohamedsajid.sa@gamil.com",
  "sudharajsekar2005@gmail.com",
  "admin.paperinoirfan27@gmail.com",
  "admin.paperinosam14@gmail.com",
  "gameplayitlifeitis@gmail.com",
  "gameplayitlifeis@gmail.com",
  "gameplayitlife@gmail.com",
  "dejasvini28@gmail.com",
  "kaushika13official@gmail.com"
];

async function checkAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const verifiedUser = await verifyServerAuth(authHeader);

  if (!verifiedUser) return null;

  const isAdminUser =
    verifiedUser.role === "admin" ||
    verifiedUser.role === "lead_admin" ||
    (verifiedUser.email && ALLOWED_ADMINS.includes(verifiedUser.email.toLowerCase()));

  if (!isAdminUser) return null;
  return verifiedUser;
}

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkAdmin(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "pending";
    const targetStatus = tab === "rejected" ? "rejected" : "pending";
    const limitNum = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));

    const results: any[] = [];
    const seenIds = new Set<string>();

    // 1. Fetch study materials from 'materials' collection
    try {
      const matSnap = await adminDb
        .collection("materials")
        .where("status", "==", targetStatus)
        .limit(limitNum)
        .get();

      matSnap.forEach((doc) => {
        const data = doc.data();
        seenIds.add(doc.id);
        const createdAt = data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : typeof data.createdAt === "number"
          ? data.createdAt
          : data.createdAt
          ? new Date(data.createdAt).getTime()
          : 0;

        results.push({
          id: doc.id,
          ...data,
          createdAt,
          rejectedAt: data.rejectedAt || undefined,
        });
      });
    } catch (matErr) {
      console.warn("[Admin Reviews API] Error querying materials by status:", matErr);
    }

    // 1b. If tab is 'pending', check for materials missing a status field (unapproved legacy / edge cases)
    if (tab === "pending") {
      try {
        const unassignedSnap = await adminDb
          .collection("materials")
          .where("uploadedBy", "==", "contributor")
          .limit(limitNum)
          .get();

        unassignedSnap.forEach((doc) => {
          if (seenIds.has(doc.id)) return;
          const data = doc.data();
          if (!data.status || data.status === "pending") {
            seenIds.add(doc.id);
            const createdAt = data.createdAt?.toMillis
              ? data.createdAt.toMillis()
              : typeof data.createdAt === "number"
              ? data.createdAt
              : data.createdAt
              ? new Date(data.createdAt).getTime()
              : 0;

            results.push({
              id: doc.id,
              ...data,
              status: "pending",
              createdAt,
            });
          }
        });
      } catch (legacyErr) {
        console.warn("[Admin Reviews API] Error querying unassigned materials:", legacyErr);
      }
    }

    // 2. Fetch pending / rejected courses and subjects from 'dynamic_subjects'
    try {
      const dynSnap = await adminDb
        .collection("dynamic_subjects")
        .where("status", "==", targetStatus)
        .limit(limitNum)
        .get();

      dynSnap.forEach((doc) => {
        if (seenIds.has(doc.id)) return;
        seenIds.add(doc.id);
        const data = doc.data();
        const createdAt = data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : typeof data.createdAt === "number"
          ? data.createdAt
          : data.createdAt
          ? new Date(data.createdAt).getTime()
          : 0;

        results.push({
          id: doc.id,
          title: data.name || data.subjectName || "New Subject Suggestion",
          subjectName: data.name || data.subjectName || "",
          subjectCode: data.code || "",
          departmentId: data.departmentId || "btech",
          semesterId: String(data.semesterId || "1"),
          subjectId: data.subjectId || doc.id,
          category: "notes",
          status: targetStatus,
          isNewSubjectRequest: true,
          newSubjectData: {
            name: data.name || "",
            code: data.code || "",
            departmentId: data.departmentId || "btech",
            semesterId: String(data.semesterId || "1"),
          },
          uploaderId: data.createdBy || data.contributorId || "",
          uploaderName: data.creatorName || data.contributorName || "Contributor",
          uploaderEmail: data.creatorEmail || "",
          createdAt,
          rejectedAt: data.rejectedAt || undefined,
        });
      });
    } catch (dynErr) {
      console.warn("[Admin Reviews API] Error querying dynamic_subjects:", dynErr);
    }

    // 3. Fetch pending / rejected departments from 'departments'
    try {
      const deptSnap = await adminDb
        .collection("departments")
        .where("status", "==", targetStatus)
        .limit(limitNum)
        .get();

      deptSnap.forEach((doc) => {
        if (seenIds.has(doc.id)) return;
        seenIds.add(doc.id);
        const data = doc.data();
        const createdAt = data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : typeof data.createdAt === "number"
          ? data.createdAt
          : data.createdAt
          ? new Date(data.createdAt).getTime()
          : 0;

        results.push({
          id: doc.id,
          title: `Department Suggestion: ${data.name || doc.id}`,
          subjectName: data.name || doc.id,
          subjectCode: data.code || "",
          departmentId: doc.id,
          semesterId: "1",
          subjectId: doc.id,
          category: "notes",
          status: targetStatus,
          isNewSubjectRequest: true,
          newSubjectData: {
            name: data.name || doc.id,
            code: data.code || "",
            departmentId: doc.id,
            semesterId: "1",
          },
          uploaderId: data.createdBy || "",
          uploaderName: data.creatorName || "Contributor",
          uploaderEmail: data.creatorEmail || "",
          createdAt,
          rejectedAt: data.rejectedAt || undefined,
        });
      });
    } catch (deptErr) {
      console.warn("[Admin Reviews API] Error querying departments:", deptErr);
    }

    // 4. Sort newest first
    results.sort((a, b) => {
      const timeA = tab === "rejected" ? (a.rejectedAt || a.createdAt || 0) : (a.createdAt || 0);
      const timeB = tab === "rejected" ? (b.rejectedAt || b.createdAt || 0) : (b.createdAt || 0);
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      materials: results,
      count: results.length,
    });
  } catch (error: any) {
    console.error("[Admin Reviews API Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch reviews" }, { status: 500 });
  }
}
