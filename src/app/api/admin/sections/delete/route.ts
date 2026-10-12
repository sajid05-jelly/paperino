import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { removeStoredSection } from "@/lib/sections-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser || verifiedUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const body = await req.json();
    const { sectionId, departmentId, semesterId, subjectId, sectionType } = body;

    if (!sectionType || (!sectionId && (!subjectId || !semesterId))) {
      return NextResponse.json({ error: "Missing required parameters for section deletion." }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin database not initialized on server." }, { status: 500 });
    }

    // Initialize Google Drive client if credentials are configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    let drive: any = null;
    if (clientId && clientSecret && refreshToken) {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground"
      );
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      drive = google.drive({ version: "v3", auth: oauth2Client });
    }

    // 1. Query all materials matching this section exclusively
    let materialsQuery = adminDb.collection("materials")
      .where("semesterId", "==", String(semesterId))
      .where("category", "==", String(sectionType));

    if (subjectId) {
      materialsQuery = materialsQuery.where("subjectId", "==", String(subjectId));
    }

    const materialsSnap = await materialsQuery.get();
    const deletedMaterialIds: string[] = [];
    const deletedFileIds: string[] = [];
    const driveErrors: string[] = [];

    // Process exclusively matching materials
    for (const docSnap of materialsSnap.docs) {
      const matData = docSnap.data();
      const fileId = matData.fileId;

      if (fileId && typeof fileId === "string") {
        // Verify no other materials outside this set use the same fileId
        const otherWithSameFile = await adminDb.collection("materials")
          .where("fileId", "==", fileId)
          .limit(2)
          .get();

        const belongsExclusively = otherWithSameFile.docs.every(d =>
          materialsSnap.docs.some(m => m.id === d.id)
        );

        if (belongsExclusively && drive) {
          try {
            await drive.files.delete({ fileId });
            deletedFileIds.push(fileId);
          } catch (driveErr: any) {
            console.error(`Failed to delete Drive file ${fileId}:`, driveErr);
            if (driveErr?.status !== 404 && driveErr?.code !== 404) {
              driveErrors.push(`Drive file ${fileId} removal failed: ${driveErr.message || "Unknown error"}`);
            }
          }
        }
      }

      // Check and delete any subcollections under this material document
      const subcollections = await docSnap.ref.listCollections();
      for (const subcol of subcollections) {
        const subcolDocs = await subcol.get();
        for (const subDoc of subcolDocs.docs) {
          await subDoc.ref.delete();
        }
      }

      // Delete the material doc itself
      await docSnap.ref.delete();
      deletedMaterialIds.push(docSnap.id);
    }

    // Remove from local persistent store immediately
    removeStoredSection(sectionId, departmentId, semesterId, subjectId, sectionType);

    // 2. Delete the section document from subject_sections (delete all possible ID variations)
    const docIdsToDelete = new Set<string>();
    if (sectionId) docIdsToDelete.add(sectionId);
    if (departmentId && semesterId && subjectId && sectionType) {
      docIdsToDelete.add(`${departmentId}_sem${semesterId}_${subjectId}_${sectionType}`);
      docIdsToDelete.add(`${departmentId}_${semesterId}_${subjectId}_${sectionType}`);
    }

    for (const dId of docIdsToDelete) {
      try {
        await adminDb.collection("subject_sections").doc(dId).delete();
      } catch (delErr) {
        console.warn(`Could not delete doc ${dId} from subject_sections:`, delErr);
      }
    }

    // 3. Remove section from dynamic_subjects doc's sections array (zero-read write)
    if (departmentId && semesterId && subjectId) {
      const subDocId = `${departmentId}_sem${semesterId}_${subjectId}`;
      try {
        await adminDb.collection("dynamic_subjects").doc(subDocId).set(
          {
            sections: FieldValue.arrayRemove(sectionType)
          },
          { merge: true }
        );
      } catch (arrErr) {
        console.warn("Could not remove section from dynamic_subjects array:", arrErr);
      }
    }

    if (driveErrors.length > 0) {
      return NextResponse.json({
        success: false,
        warning: "Section and materials deleted, but some Google Drive files could not be purged.",
        deletedMaterialsCount: deletedMaterialIds.length,
        deletedFilesCount: deletedFileIds.length,
        errors: driveErrors
      }, { status: 207 });
    }

    return NextResponse.json({
      success: true,
      deletedMaterialsCount: deletedMaterialIds.length,
      deletedFilesCount: deletedFileIds.length
    });
  } catch (error: any) {
    console.error("Admin section deletion error:", error);
    return NextResponse.json({
      error: error.message || "Failed to permanently delete section"
    }, { status: 500 });
  }
}
