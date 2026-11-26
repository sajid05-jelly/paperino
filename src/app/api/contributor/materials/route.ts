import { NextRequest, NextResponse } from "next/server";
import { verifyServerAuth } from "@/lib/auth-verify";
import { adminDb } from "@/lib/firebase-admin";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface MaterialItem {
  id: string;
  semesterId: string;
  subjectId: string;
  departmentId?: string;
  title: string;
  category: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: number;
  status?: string;
  uploaderId?: string;
  uploaderEmail?: string;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);

    if (!verifiedUser || !verifiedUser.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid, email } = verifiedUser;
    const cleanEmail = (email || "").toLowerCase().trim();

    const materialsMap = new Map<string, MaterialItem>();

    // 1. Fetch from Firestore materials collection by uploaderId and uploaderEmail
    if (adminDb) {
      try {
        const queries = [
          adminDb.collection("materials").where("uploaderId", "==", uid).get(),
        ];
        if (cleanEmail) {
          queries.push(adminDb.collection("materials").where("uploaderEmail", "==", cleanEmail).get());
        }

        const results = await Promise.allSettled(queries);
        for (const res of results) {
          if (res.status === "fulfilled" && res.value) {
            res.value.docs.forEach((doc) => {
              const d = doc.data();
              materialsMap.set(doc.id, {
                id: doc.id,
                semesterId: String(d.semesterId || "1"),
                subjectId: String(d.subjectId || "calc"),
                departmentId: String(d.departmentId || "btech"),
                title: d.title || d.fileName || "Uploaded Material",
                category: d.category || "notes",
                fileId: d.fileId || "",
                fileUrl: d.fileUrl || d.driveUrl || "",
                fileName: d.fileName || d.title || "",
                createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : (typeof d.createdAt === "number" ? d.createdAt : Date.now()),
                status: d.status || "approved",
                uploaderId: d.uploaderId || uid,
                uploaderEmail: d.uploaderEmail || cleanEmail,
              });
            });
          }
        }
      } catch (err: any) {
        console.warn("[Contributor Materials API] Firestore fetch warning:", err?.message);
      }
    }

    // 2. Supplement from configured_sections.json backup if available
    try {
      const filePath = path.join(process.cwd(), "src", "data", "configured_sections.json");
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const sections = JSON.parse(content);
        if (Array.isArray(sections)) {
          sections.forEach((s: any) => {
            const isMatch =
              (s.createdBy && s.createdBy === uid) ||
              (s.creatorEmail && s.creatorEmail.toLowerCase().trim() === cleanEmail);

            if (isMatch) {
              const syntheticId = s.id || `sec_${s.departmentId}_${s.semesterId}_${s.subjectId}_${s.sectionType}`;
              if (!materialsMap.has(syntheticId)) {
                materialsMap.set(syntheticId, {
                  id: syntheticId,
                  semesterId: String(s.semesterId || "1"),
                  subjectId: String(s.subjectId || ""),
                  departmentId: String(s.departmentId || "btech"),
                  title: `${s.subjectName || s.subjectId} (${s.sectionType.toUpperCase()})`,
                  category: s.sectionType || "notes",
                  fileName: `${s.subjectId}_${s.sectionType}`,
                  createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now() - 86400000,
                  status: "approved",
                  uploaderId: uid,
                  uploaderEmail: cleanEmail,
                });
              }
            }
          });
        }
      }
    } catch (fsErr: any) {
      console.warn("[Contributor Materials API] Local backup read warning:", fsErr?.message);
    }

    const materials = Array.from(materialsMap.values());
    materials.sort((a, b) => b.createdAt - a.createdAt);

    const approvedCount = materials.filter((m) => m.status === "approved" || !m.status).length;
    const pendingCount = materials.filter((m) => m.status === "pending").length;
    const rejectedCount = materials.filter((m) => m.status === "rejected").length;

    return NextResponse.json({
      success: true,
      materials,
      counts: {
        total: materials.length,
        approved: approvedCount,
        pending: pendingCount,
        rejected: rejectedCount,
      },
      isContributorPlus: approvedCount >= 10,
    });
  } catch (error: any) {
    console.error("Contributor materials error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch materials" }, { status: 500 });
  }
}
