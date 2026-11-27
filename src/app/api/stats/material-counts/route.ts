import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (adminDb) {
      const snap = await adminDb.collection("platform_stats").doc("materialCounts").get();
      if (snap.exists) {
        const data = snap.data();
        return NextResponse.json(
          {
            success: true,
            departments: data?.departments || {},
          },
          {
            headers: {
              "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
          }
        );
      }
    }
    return NextResponse.json({ success: true, departments: {} });
  } catch (error: any) {
    console.warn("[API: material-counts] Error fetching material counts:", error?.message);
    return NextResponse.json({ success: false, departments: {} });
  }
}
