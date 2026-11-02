import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
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
      fileId,
      departmentId = "btech",
      semesterId = "1",
      subjectId,
      title,
      fileName,
      uploaderId,
      isNewSubjectRequest
    } = body;

    if (!materialId) {
      return NextResponse.json({ error: "materialId is required." }, { status: 400 });
    }

    // 1. Delete file from Google Drive if fileId is present
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
          await drive.files.delete({ fileId });
        }
      } catch (driveErr: any) {
        console.warn("[Reject Material API] Drive deletion skipped:", driveErr?.message);
      }
    }

    // 2. If new subject request, remove pending dynamic_subjects document
    if (isNewSubjectRequest && subjectId) {
      const deptId = String(departmentId || "btech").toLowerCase();
      const semId = String(semesterId || "1");
      const docId = `${deptId}_sem${semId}_${subjectId}`;
      try {
        await adminDb.collection("dynamic_subjects").doc(docId).delete();
      } catch (e) {}
    }

    // 3. Delete material from Firestore materials collection (0 reads, uses delete quota)
    await adminDb.collection("materials").doc(materialId).delete();

    // 4. Notify uploader if present
    if (uploaderId) {
      try {
        await adminDb.collection("notifications").add({
          userId: uploaderId,
          title: "Submission Status Update",
          message: `Your upload '${title || fileName || "Untitled"}' could not be approved at this time.`,
          type: "material_rejected",
          read: false,
          createdAt: FieldValue.serverTimestamp()
        });
      } catch (notifErr) {}
    }

    // 5. Log admin action
    try {
      await adminDb.collection("admin_logs").add({
        adminEmail: verifiedUser.email || "unknown",
        action: "REJECT_AND_DELETE_MATERIAL",
        targetId: materialId,
        details: `Rejected and permanently deleted: ${title || fileName}`,
        timestamp: FieldValue.serverTimestamp()
      });
    } catch (logErr) {}

    return NextResponse.json({
      success: true,
      materialId,
      message: "Material rejected and removed successfully."
    });
  } catch (error: any) {
    console.error("Reject material error:", error);
    return NextResponse.json({ error: error.message || "Failed to reject material." }, { status: 500 });
  }
}
