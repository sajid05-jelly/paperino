import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { saveStoredSection } from "@/lib/sections-store";

export const dynamic = "force-dynamic";

const ALLOWED_ADMINS = [
  "mohamedsajid.sa@gmail.com",
  "sudharajsekar2005@gmail.com",
  "admin.paperinoirfan27@gmail.com",
  "admin.paperinosam14@gmail.com",
  "gameplayitlifeitis@gmail.com",
  "dejasvini28@gmail.com",
  "kaushika13official@gmail.com"
];

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication required." },
        { status: 401 }
      );
    }

    const isAdminUser = 
      verifiedUser.role === "admin" || 
      (verifiedUser.email && ALLOWED_ADMINS.includes(verifiedUser.email.toLowerCase()));

    if (!isAdminUser) {
      return NextResponse.json(
        { error: "Forbidden. Section creation is managed via admin material approval." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      departmentId,
      departmentName,
      semesterId,
      subjectId,
      subjectName,
      subjectCode,
      sectionType,
      creatorId,
      createdBy,
      creatorName,
      creatorEmail
    } = body;

    if (!departmentId || !semesterId || !subjectId || !sectionType) {
      return NextResponse.json(
        { error: "Missing required parameters for section creation." },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin Database is not initialized on the server." },
        { status: 500 }
      );
    }

    const db = adminDb;
    const secDocId = `${departmentId}_sem${semesterId}_${subjectId}_${sectionType}`;
    const cleanSubjectName = subjectName?.trim() || subjectId;
    const cleanCode = subjectCode ? subjectCode.trim() : "";
    const cleanDeptName = departmentName || departmentId.toUpperCase();

    // Check if section already exists with primary canonical ID
    const secDocRef = db.collection("subject_sections").doc(secDocId);
    const existingDoc = await secDocRef.get();
    if (existingDoc.exists) {
      return NextResponse.json({
        success: true,
        sectionId: secDocId,
        alreadyExisted: true
      });
    }

    // Check if section already exists with alternate ID format
    const altSecDocId = `${departmentId}_${semesterId}_${subjectId}_${sectionType}`;
    const altDocRef = db.collection("subject_sections").doc(altSecDocId);
    const altDoc = await altDocRef.get();
    if (altDoc.exists) {
      return NextResponse.json({
        success: true,
        sectionId: altSecDocId,
        alreadyExisted: true
      });
    }

    // Original uploader attribution (recorded separately from approving admin)
    const finalCreatorId = creatorId || createdBy || verifiedUser.uid;
    const finalCreatorName = creatorName || verifiedUser.email.split("@")[0] || "Contributor";
    const finalCreatorEmail = creatorEmail || verifiedUser.email;

    // Persist in local storage immediately so it is available even under Firestore read exhaustion
    saveStoredSection({
      id: secDocId,
      subjectId,
      subjectName: cleanSubjectName,
      subjectCode: cleanCode,
      departmentId,
      departmentName: cleanDeptName,
      semesterId: String(semesterId),
      sectionType,
      createdBy: finalCreatorId,
      creatorName: finalCreatorName,
      creatorEmail: finalCreatorEmail,
      approvedByAdminId: verifiedUser.uid,
      approvedByAdminEmail: verifiedUser.email,
      createdAt: new Date().toISOString()
    });

    // 1. Create document in subject_sections
    await secDocRef.set({
      id: secDocId,
      subjectId,
      subjectName: cleanSubjectName,
      subjectCode: cleanCode,
      departmentId,
      departmentName: cleanDeptName,
      semesterId: String(semesterId),
      sectionType,
      createdBy: finalCreatorId,
      creatorName: finalCreatorName,
      creatorEmail: finalCreatorEmail,
      approvedByAdminId: verifiedUser.uid,
      approvedByAdminEmail: verifiedUser.email,
      createdAt: FieldValue.serverTimestamp()
    });

    // 2. Also register in dynamic_subjects doc's sections array (zero-read write)
    const subDocId = `${departmentId}_sem${semesterId}_${subjectId}`;
    const subRef = db.collection("dynamic_subjects").doc(subDocId);
    await subRef.set(
      {
        subjectId,
        name: cleanSubjectName,
        code: cleanCode,
        departmentId,
        semesterId: String(semesterId),
        sections: FieldValue.arrayUnion(sectionType),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      sectionId: secDocId,
      created: true
    });
  } catch (error: any) {
    console.error("Error creating section via API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create section." },
      { status: 500 }
    );
  }
}
