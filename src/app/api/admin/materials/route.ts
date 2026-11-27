import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyServerAuth } from "@/lib/auth-verify";

export const dynamic = "force-dynamic";

const ALLOWED_ADMINS = [
  "mohamedsajid.sa@gmail.com",
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

async function checkAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const verifiedUser = await verifyServerAuth(authHeader);

  if (!verifiedUser) return null;

  const isAdminUser =
    verifiedUser.role === "admin" ||
    verifiedUser.role === "lead_admin" ||
    (verifiedUser.email && ALLOWED_ADMINS.includes(verifiedUser.email.toLowerCase()));

  if (!isAdminUser) return null;
  return verifiedUser;
}

// GET: Fetch all materials safely via Admin SDK bypassing client-side Firestore quotas
export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkAdmin(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const limitNum = Math.min(1000, parseInt(searchParams.get("limit") || "1000", 10));

    const snap = await adminDb.collection("materials").limit(limitNum).get();
    const materials: any[] = [];

    snap.forEach((doc) => {
      const data = doc.data();
      const createdAtMillis = data.createdAt?.toMillis
        ? data.createdAt.toMillis()
        : typeof data.createdAt === "number"
        ? data.createdAt
        : data.createdAt
        ? new Date(data.createdAt).getTime()
        : 0;

      materials.push({
        id: doc.id,
        ...data,
        createdAt: createdAtMillis,
      });
    });

    // Sort newest first
    materials.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({
      success: true,
      materials,
      count: materials.length,
    });
  } catch (error: any) {
    console.error("[Admin Materials API GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch materials" }, { status: 500 });
  }
}

// DELETE: Delete a material by id
export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await checkAdmin(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "Material id is required." }, { status: 400 });
    }

    await adminDb.collection("materials").doc(id).delete();

    return NextResponse.json({
      success: true,
      message: "Material deleted successfully."
    });
  } catch (error: any) {
    console.error("[Admin Materials API DELETE Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete material" }, { status: 500 });
  }
}

// PATCH: Update material metadata
export async function PATCH(req: NextRequest) {
  try {
    const adminUser = await checkAdmin(req);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const body = await req.json();
    const { id, title, category, subjectId } = body;

    if (!id) {
      return NextResponse.json({ error: "Material id is required." }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (title !== undefined) updatePayload.title = String(title).trim();
    if (category !== undefined) updatePayload.category = category;
    if (subjectId !== undefined) updatePayload.subjectId = subjectId;

    await adminDb.collection("materials").doc(id).update(updatePayload);

    return NextResponse.json({
      success: true,
      message: "Material updated successfully."
    });
  } catch (error: any) {
    console.error("[Admin Materials API PATCH Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update material" }, { status: 500 });
  }
}
