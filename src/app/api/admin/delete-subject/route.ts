import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const ALLOWED_ADMINS = [
  "mohamedsajid.sa@gmail.com",
  "sudharajsekar2005@gmail.com",
  "admin.paperinoirfan27@gmail.com",
  "admin.paperinosam14@gmail.com",
  "gameplayitlifeitis@gmail.com",
  "gameplayitlifeis@gmail.com",
  "gameplayitlife@gmail.com",
  "dejasvini28@gmail.com",
  "kaushika13official@gmail.com"
];

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser) {
      return NextResponse.json({ error: "Unauthorized. Authentication required." }, { status: 401 });
    }

    const isAdminUser =
      verifiedUser.role === "admin" ||
      (verifiedUser.email && ALLOWED_ADMINS.includes(verifiedUser.email.toLowerCase()));

    if (!isAdminUser) {
      return NextResponse.json({ error: "Forbidden. Admin privileges required." }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin Database not initialized." }, { status: 500 });
    }

    const body = await req.json();
    const { subjectId, departmentId = "btech", semesterId = "1" } = body;

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId is required." }, { status: 400 });
    }

    const cleanSubjectId = String(subjectId).toLowerCase().trim();
    const deptId = String(departmentId || "btech").toLowerCase().trim();
    const semId = String(semesterId || "1").trim();

    // 1. Delete matching documents from dynamic_subjects
    const constructedDocId = `${deptId}_sem${semId}_${cleanSubjectId}`;
    try {
      await adminDb.collection("dynamic_subjects").doc(constructedDocId).delete();
    } catch (e) {}

    try {
      await adminDb.collection("dynamic_subjects").doc(cleanSubjectId).delete();
    } catch (e) {}

    try {
      const dynSnap = await adminDb.collection("dynamic_subjects")
        .where("subjectId", "==", cleanSubjectId)
        .get();
      if (!dynSnap.empty) {
        const dynBatch = adminDb.batch();
        dynSnap.docs.forEach((d) => dynBatch.delete(d.ref));
        await dynBatch.commit();
      }
    } catch (dynErr) {
      console.warn("Error deleting from dynamic_subjects by query:", dynErr);
    }

    // Also check if there are documents where id == cleanSubjectId or subjectId in upper/original case
    try {
      const dynSnapOriginal = await adminDb.collection("dynamic_subjects")
        .where("subjectId", "==", subjectId)
        .get();
      if (!dynSnapOriginal.empty) {
        const dynBatch = adminDb.batch();
        dynSnapOriginal.docs.forEach((d) => dynBatch.delete(d.ref));
        await dynBatch.commit();
      }
    } catch (e) {}

    // 2. Query and delete all materials associated with this subject
    try {
      const matSnap1 = await adminDb.collection("materials")
        .where("subjectId", "==", cleanSubjectId)
        .get();
      
      const matSnap2 = cleanSubjectId !== subjectId 
        ? await adminDb.collection("materials").where("subjectId", "==", subjectId).get()
        : null;

      const allMatDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
      matSnap1.docs.forEach(d => allMatDocs.set(d.id, d));
      if (matSnap2) {
        matSnap2.docs.forEach(d => allMatDocs.set(d.id, d));
      }

      if (allMatDocs.size > 0) {
        const docList = Array.from(allMatDocs.values());
        // Batch in groups of 400
        for (let i = 0; i < docList.length; i += 400) {
          const chunk = docList.slice(i, i + 400);
          const matBatch = adminDb.batch();
          chunk.forEach(d => matBatch.delete(d.ref));
          await matBatch.commit();
        }
      }
    } catch (matErr) {
      console.warn("Error deleting associated materials for subject:", matErr);
    }

    // 3. Delete any subject_sections config
    try {
      await adminDb.collection("subject_sections").doc(`${deptId}_${semId}_${cleanSubjectId}`).delete();
      await adminDb.collection("subject_sections").doc(cleanSubjectId).delete();
    } catch (e) {}

    // 4. Mark in platform_settings/deleted_subjects so static B.Tech subjects are permanently excluded
    try {
      await adminDb.collection("platform_settings").doc("deleted_subjects").set(
        {
          deletedIds: FieldValue.arrayUnion(cleanSubjectId, subjectId),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } catch (setErr) {
      console.warn("Error marking deleted subject in platform_settings:", setErr);
    }

    // 5. Audit log
    try {
      await adminDb.collection("admin_logs").add({
        adminEmail: verifiedUser.email || "unknown",
        action: "DELETE_TOTAL_SUBJECT",
        targetId: cleanSubjectId,
        details: `Permanently removed subject '${cleanSubjectId}' and all associated materials.`,
        timestamp: FieldValue.serverTimestamp()
      });
    } catch (logErr) {}

    return NextResponse.json({
      success: true,
      subjectId: cleanSubjectId,
      message: `Subject '${cleanSubjectId}' and all its materials have been permanently removed.`
    });
  } catch (error: any) {
    console.error("Delete subject API error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete subject." }, { status: 500 });
  }
}
