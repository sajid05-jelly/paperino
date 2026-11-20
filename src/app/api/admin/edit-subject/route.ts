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
    const { subjectId, name, code, departmentId = "btech", semesterId = "1" } = body;

    if (!subjectId || !name?.trim()) {
      return NextResponse.json({ error: "subjectId and name are required." }, { status: 400 });
    }

    const cleanSubjectId = String(subjectId).toLowerCase().trim();
    const cleanName = String(name).trim();
    const cleanCode = code ? String(code).trim() : "";
    const deptId = String(departmentId || "btech").toLowerCase().trim();
    const semId = String(semesterId || "1").trim();

    const constructedDocId = `${deptId}_sem${semId}_${cleanSubjectId}`;

    // Update in dynamic_subjects
    await adminDb.collection("dynamic_subjects").doc(constructedDocId).set(
      {
        subjectId: cleanSubjectId,
        name: cleanName,
        code: cleanCode,
        departmentId: deptId,
        semesterId: semId,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // Also update any docs matching subjectId in dynamic_subjects
    try {
      const dynSnap = await adminDb.collection("dynamic_subjects")
        .where("subjectId", "==", cleanSubjectId)
        .get();
      if (!dynSnap.empty) {
        const batch = adminDb.batch();
        dynSnap.docs.forEach((d) => {
          batch.update(d.ref, { name: cleanName, code: cleanCode });
        });
        await batch.commit();
      }
    } catch (e) {}

    // Log admin action
    try {
      await adminDb.collection("admin_logs").add({
        adminEmail: verifiedUser.email || "unknown",
        action: "EDIT_SUBJECT",
        targetId: cleanSubjectId,
        details: `Updated subject '${cleanSubjectId}' to Name: '${cleanName}', Code: '${cleanCode}'`,
        timestamp: FieldValue.serverTimestamp()
      });
    } catch (logErr) {}

    return NextResponse.json({
      success: true,
      subjectId: cleanSubjectId,
      name: cleanName,
      code: cleanCode
    });
  } catch (error: any) {
    console.error("Edit subject API error:", error);
    return NextResponse.json({ error: error.message || "Failed to update subject." }, { status: 500 });
  }
}
