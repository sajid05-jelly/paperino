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
        { error: "Unauthorized. Please sign in to create a course." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      departmentId,
      departmentName,
      semesterId,
      name,
      code,
      sections = [],
      isSuggestion = false,
      creatorName,
      creatorEmail
    } = body;

    if (!departmentId || !semesterId || !name?.trim()) {
      return NextResponse.json(
        { error: "Department, semester, and subject name are required." },
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
    const cleanName = name.trim();
    const cleanCode = code ? code.trim() : "";
    const generatedId = cleanCode
      ? cleanCode.toLowerCase().replace(/[^a-z0-9]/g, "")
      : cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const docId = `${departmentId}_sem${semesterId}_${generatedId}`;

    const isAdmin = verifiedUser.role === "admin";
    const status = isAdmin && !isSuggestion ? "approved" : "pending";

    // 1. Create or update dynamic_subjects document
    await db.collection("dynamic_subjects").doc(docId).set(
      {
        subjectId: generatedId,
        name: cleanName,
        code: cleanCode,
        departmentId,
        semesterId: String(semesterId),
        sections: Array.isArray(sections) ? sections : [],
        createdBy: verifiedUser.uid,
        creatorName: creatorName || verifiedUser.email.split("@")[0] || "User",
        creatorEmail: creatorEmail || verifiedUser.email,
        contributorId: verifiedUser.uid,
        contributorName: creatorName || verifiedUser.email.split("@")[0] || "User",
        status,
        createdAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // 2. Create corresponding documents in subject_sections if sections were specified
    if (Array.isArray(sections) && sections.length > 0) {
      const deptDisplay = departmentName || departmentId.toUpperCase();
      const sectionPromises = sections.map((secType: string) => {
        const secDocId = `${departmentId}_sem${semesterId}_${generatedId}_${secType}`;
        return db.collection("subject_sections").doc(secDocId).set(
          {
            id: secDocId,
            subjectId: generatedId,
            subjectName: cleanName,
            subjectCode: cleanCode,
            departmentId,
            departmentName: deptDisplay,
            semesterId: String(semesterId),
            sectionType: secType,
            createdBy: verifiedUser.uid,
            creatorName: creatorName || verifiedUser.email.split("@")[0] || "User",
            creatorEmail: creatorEmail || verifiedUser.email,
            createdAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      });
      await Promise.all(sectionPromises);
    }

    return NextResponse.json({
      success: true,
      subjectId: generatedId,
      docId,
      status
    });
  } catch (error: any) {
    console.error("Error creating course via API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create course." },
      { status: 500 }
    );
  }
}
