import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin Database is not initialized on the server." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const subjectId = searchParams.get("subjectId");

    // If specific department and subject are requested
    if (departmentId && subjectId) {
      const snap = await adminDb
        .collection("subject_sections")
        .where("departmentId", "==", departmentId)
        .where("subjectId", "==", subjectId)
        .get();

      const sections = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, sections });
    }

    // Otherwise fetch all sections for the admin section management table
    const [secSnapshot, subSnapshot] = await Promise.all([
      adminDb.collection("subject_sections").get(),
      adminDb.collection("dynamic_subjects").get()
    ]);

    const sectionList: any[] = [];
    const seenKeys = new Set<string>();
    const uidsToFetch = new Set<string>();

    secSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const key = `${data.departmentId}_${data.semesterId}_${data.subjectId}_${data.sectionType}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);

        if (data.createdBy && !data.createdBy.includes("@")) {
          uidsToFetch.add(data.createdBy);
        }

        sectionList.push({
          id: docSnap.id,
          subjectId: data.subjectId,
          subjectName: data.subjectName || data.subjectId,
          subjectCode: data.subjectCode || "",
          departmentId: data.departmentId,
          departmentName: data.departmentName || data.departmentId?.toUpperCase() || "",
          semesterId: String(data.semesterId || "1"),
          sectionType: data.sectionType,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          creatorName: data.creatorName,
          creatorEmail: data.creatorEmail
        });
      }
    });

    // Also include dynamic_subjects with sections array
    subSnapshot.forEach(docSnap => {
      const subData = docSnap.data();
      if (Array.isArray(subData.sections)) {
        subData.sections.forEach((secType: string) => {
          const key = `${subData.departmentId}_${subData.semesterId}_${subData.subjectId}_${secType}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);

            if (subData.createdBy && !subData.createdBy.includes("@")) {
              uidsToFetch.add(subData.createdBy);
            }

            sectionList.push({
              id: `${subData.departmentId}_sem${subData.semesterId}_${subData.subjectId}_${secType}`,
              subjectId: subData.subjectId,
              subjectName: subData.name || subData.subjectId,
              subjectCode: subData.code || "",
              departmentId: subData.departmentId,
              departmentName: subData.departmentName || subData.departmentId?.toUpperCase() || "",
              semesterId: String(subData.semesterId || "1"),
              sectionType: secType,
              createdAt: subData.createdAt,
              createdBy: subData.createdBy,
              creatorName: subData.creatorName,
              creatorEmail: subData.creatorEmail
            });
          }
        });
      }
    });

    // Populate user profiles for creator UIDs if needed
    if (uidsToFetch.size > 0) {
      const userProfiles: Record<string, { displayName?: string; email?: string }> = {};
      const fetchPromises = Array.from(uidsToFetch).map(async (uid) => {
        try {
          const uSnap = await adminDb!.collection("users").doc(uid).get();
          if (uSnap.exists) {
            const uData = uSnap.data() || {};
            userProfiles[uid] = {
              displayName: uData.displayName || uData.name,
              email: uData.email
            };
          }
        } catch {
          // ignore individual fetch errors
        }
      });
      await Promise.all(fetchPromises);

      sectionList.forEach(sec => {
        if (sec.createdBy && userProfiles[sec.createdBy]) {
          const prof = userProfiles[sec.createdBy];
          if (!sec.creatorName && prof.displayName) sec.creatorName = prof.displayName;
          if (!sec.creatorEmail && prof.email) sec.creatorEmail = prof.email;
        }
      });
    }

    sectionList.sort((a, b) => (a.subjectName || "").localeCompare(b.subjectName || ""));
    return NextResponse.json({ success: true, sections: sectionList });
  } catch (error: any) {
    console.error("Error in /api/sections GET:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch sections" },
      { status: 500 }
    );
  }
}
