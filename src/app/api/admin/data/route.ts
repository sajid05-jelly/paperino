import { NextRequest } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const ALLOWED_ADMIN_EMAILS = [
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

// Helper to verify admin permissions
async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Bearer token missing.");
  }

  const token = authHeader.substring(7);
  if (!adminAuth || !adminDb) {
    throw new Error("Server Error: Firebase Admin SDK not initialized.");
  }

  const decodedToken = await adminAuth.verifyIdToken(token);
  const uid = decodedToken.uid;
  const email = decodedToken.email || "";

  const isWhitelisted = ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase());
  if (isWhitelisted) {
    return { uid, email };
  }

  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const isAdminRole = userDoc.exists && userDoc.data()?.role === "admin";
    if (isAdminRole) {
      return { uid, email };
    }
  } catch (err: any) {
    console.warn("[verifyAdmin] Failed to read user doc:", err?.message || err);
  }

  throw new Error("Forbidden: Access restricted to administrators.");
}

// In-memory cache for subject requests to prevent quota exhaustion and server crashes
let subjectRequestsCache: any[] = [];
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000; // 60s cache

export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const targetCollection = searchParams.get("collection");

    if (targetCollection !== "subject_requests") {
      return new Response(JSON.stringify({ error: "Bad Request", message: "Invalid collection requested." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!adminDb) {
      throw new Error("Database not initialized.");
    }

    const now = Date.now();
    if (subjectRequestsCache.length > 0 && now - lastCacheTime < CACHE_TTL_MS) {
      return new Response(JSON.stringify(subjectRequestsCache), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const snapshot = await adminDb.collection(targetCollection).orderBy("createdAt", "desc").limit(50).get();
      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        const formattedData = { ...data };
        if (data.createdAt && typeof data.createdAt.toMillis === "function") {
          formattedData.createdAt = data.createdAt.toMillis();
        }
        return {
          id: doc.id,
          ...formattedData
        };
      });

      subjectRequestsCache = results;
      lastCacheTime = now;

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (dbErr: any) {
      console.warn("[API Admin Data GET DB Warning - serving cache/empty]:", dbErr?.message || dbErr);
      return new Response(JSON.stringify(subjectRequestsCache), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (error: any) {
    console.error("[API Admin Data GET Error]", error);
    const status = error.message?.includes("Unauthorized") ? 401 : error.message?.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: "Error", message: error.message }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req);

    const body = await req.json().catch(() => ({}));
    const { action, collection: targetCollection, id, updateData } = body;

    if (targetCollection !== "subject_requests") {
      return new Response(JSON.stringify({ error: "Bad Request", message: "Invalid collection." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!id) {
      return new Response(JSON.stringify({ error: "Bad Request", message: "Document ID missing." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!adminDb) {
      throw new Error("Database not initialized.");
    }

    const docRef = adminDb.collection(targetCollection).doc(id);

    if (action === "update") {
      if (!updateData) {
        return new Response(JSON.stringify({ error: "Bad Request", message: "Update data missing." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        await docRef.update(updateData);
      } catch (err: any) {
        console.warn("[API Admin Data POST Update Warning]:", err?.message || err);
      }
      subjectRequestsCache = subjectRequestsCache.map(r => r.id === id ? { ...r, ...updateData } : r);
      return new Response(JSON.stringify({ success: true, message: "Document updated successfully." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } 
    
    if (action === "delete") {
      try {
        await docRef.delete();
      } catch (err: any) {
        console.warn("[API Admin Data POST Delete Warning]:", err?.message || err);
      }
      subjectRequestsCache = subjectRequestsCache.filter(r => r.id !== id);
      return new Response(JSON.stringify({ success: true, message: "Document deleted successfully." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Bad Request", message: "Invalid action." }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[API Admin Data POST Error]", error);
    const status = error.message.includes("Unauthorized") ? 401 : error.message.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: "Error", message: error.message }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
}
