import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to enable this section." },
        { status: 401 }
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
    const resolvedName = creatorName || verifiedUser.email.split("@")[0] || "User";
    const resolvedEmail = creatorEmail || verifiedUser.email;

    // 1. Create document in subject_sections
    await db.collection("subject_sections").doc(secDocId).set(
      {
        id: secDocId,
        subjectId,
        subjectName: cleanSubjectName,
        subjectCode: cleanCode,
        departmentId,
        departmentName: cleanDeptName,
        semesterId: String(semesterId),
        sectionType,
        createdBy: verifiedUser.uid,
        creatorName: resolvedName,
        creatorEmail: resolvedEmail,
        createdAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

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
      sectionId: secDocId
    });
  } catch (error: any) {
    console.error("Error creating section via API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create section." },
      { status: 500 }
    );
  }
}
