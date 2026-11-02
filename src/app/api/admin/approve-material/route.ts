import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { saveStoredSection } from "@/lib/sections-store";
import { google } from "googleapis";

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
    const {
      materialId,
      departmentId = "btech",
      semesterId = "1",
      subjectId,
      subjectName,
      subjectCode = "",
      category,
      title,
      fileName,
      fileId,
      uploaderId,
      uploaderName,
      uploaderEmail,
      isNewSubjectRequest,
      newSubjectData
    } = body;

    if (!materialId || !subjectId || !category) {
      return NextResponse.json({ error: "Missing required material fields (materialId, subjectId, category)." }, { status: 400 });
    }

    const deptId = String(departmentId || "btech").toLowerCase();
    const semId = String(semesterId || "1");
    const subId = String(subjectId);
    const sectionType = String(category);
    const cleanSubName = (subjectName || newSubjectData?.name || title || subId).trim();
    const cleanSubCode = (subjectCode || newSubjectData?.code || "").trim();
    const creatorName = uploaderName || "Contributor";
    const creatorEmail = uploaderEmail || "";

    // 1. Ensure Google Drive public view permission if fileId is present
    if (fileId) {
      try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (clientId && clientSecret && refreshToken) {
          const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            "https://developers.google.com/oauthplayground"
          );
          oauth2Client.setCredentials({ refresh_token: refreshToken });
          const drive = google.drive({ version: "v3", auth: oauth2Client });
          await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: "reader", type: "anyone" }
          });
        }
      } catch (driveErr: any) {
        console.warn("[Approve Material API] Drive permission patch skipped:", driveErr?.message);
      }
    }

    // 2. If new subject request, establish in dynamic_subjects (0 reads)
    const subDocId = `${deptId}_sem${semId}_${subId}`;
    if (isNewSubjectRequest) {
      await adminDb.collection("dynamic_subjects").doc(subDocId).set({
        subjectId: subId,
        name: cleanSubName,
        code: cleanSubCode,
        departmentId: deptId,
        semesterId: semId,
        status: "approved",
        createdBy: uploaderId || "contributor",
        contributorId: uploaderId || null,
        contributorName: creatorName || null,
        createdAt: FieldValue.serverTimestamp(),
        sections: FieldValue.arrayUnion(sectionType)
      }, { merge: true });
    }

    // 3. Register section in subject_sections (0 reads)
    const secDocId = `${deptId}_sem${semId}_${subId}_${sectionType}`;
    await adminDb.collection("subject_sections").doc(secDocId).set({
      id: secDocId,
      subjectId: subId,
      subjectName: cleanSubName,
      subjectCode: cleanSubCode,
      departmentId: deptId,
      departmentName: deptId.toUpperCase(),
      semesterId: semId,
      sectionType: sectionType as any,
      createdBy: uploaderId || verifiedUser.uid,
      creatorName: creatorName,
      creatorEmail: creatorEmail,
      approvedByAdminId: verifiedUser.uid,
      approvedByAdminEmail: verifiedUser.email,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Also link section in dynamic_subjects (0 reads)
    await adminDb.collection("dynamic_subjects").doc(subDocId).set({
      subjectId: subId,
      name: cleanSubName,
      code: cleanSubCode,
      departmentId: deptId,
      semesterId: semId,
      sections: FieldValue.arrayUnion(sectionType),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Local in-memory/file fallback cache
    saveStoredSection({
      id: secDocId,
      subjectId: subId,
      subjectName: cleanSubName,
      subjectCode: cleanSubCode,
      departmentId: deptId,
      departmentName: deptId.toUpperCase(),
      semesterId: semId,
      sectionType: sectionType as any,
      createdBy: uploaderId || verifiedUser.uid,
      creatorName: creatorName,
      creatorEmail: creatorEmail,
      approvedByAdminId: verifiedUser.uid,
      approvedByAdminEmail: verifiedUser.email,
      createdAt: new Date().toISOString()
    });

    // 4. Update material status to approved (0 reads)
    await adminDb.collection("materials").doc(materialId).set({
      status: "approved",
      approvedAt: Date.now(),
      approvedBy: verifiedUser.email || verifiedUser.uid
    }, { merge: true });

    // 5. Update uploader stats (0 reads)
    if (uploaderId && !ALLOWED_ADMINS.includes(creatorEmail.toLowerCase())) {
      try {
        await adminDb.collection("users").doc(uploaderId).set({
          uploads: FieldValue.increment(1),
          approvedUploads: FieldValue.increment(1),
          points: FieldValue.increment(10),
          contributionPoints: FieldValue.increment(10)
        }, { merge: true });

        // Add approval notification
        await adminDb.collection("notifications").add({
          userId: uploaderId,
          title: "Material Approved! ✅",
          message: `Your material '${title || fileName || "Untitled"}' has been approved and is now live.`,
          type: "material_approved",
          read: false,
          createdAt: FieldValue.serverTimestamp()
        });
      } catch (userErr: any) {
        console.warn("[Approve Material API] Uploader reward skipped:", userErr?.message);
      }
    }

    // 6. Log admin action (0 reads)
    try {
      await adminDb.collection("admin_logs").add({
        adminEmail: verifiedUser.email || "unknown",
        action: "APPROVE_MATERIAL",
        targetId: materialId,
        details: `Approved material: ${title || fileName}`,
        timestamp: FieldValue.serverTimestamp()
      });
    } catch (logErr) {}

    return NextResponse.json({
      success: true,
      materialId,
      sectionId: secDocId,
      message: "Material approved and published successfully."
    });
  } catch (error: any) {
    console.error("Approve material error:", error);
    return NextResponse.json({ error: error.message || "Failed to approve material." }, { status: 500 });
  }
}
