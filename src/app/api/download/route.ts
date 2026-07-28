/**
 * /api/download/route.ts
 *
 * Secure download & preview proxy for Paperino study materials.
 * Streams raw binary PDF bytes (Content-Type: application/pdf, Content-Disposition: inline)
 * directly for paperino-native viewer previewing.
 */

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

/** Strict Google Drive file ID pattern */
const VALID_FILE_ID = /^[a-zA-Z0-9_-]{10,60}$/;

function getMimeTypeByFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "pdf": return "application/pdf";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "svg": return "image/svg+xml";
    case "doc": return "application/msword";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "ppt": return "application/vnd.ms-powerpoint";
    case "pptx": return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "xls": return "application/vnd.ms-excel";
    case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "zip": return "application/zip";
    default: return "application/octet-stream";
  }
}

export async function GET(req: NextRequest) {
  let matId = req.nextUrl.searchParams.get("matId");
  let fileId = req.nextUrl.searchParams.get("fileId");
  const isInline = req.nextUrl.searchParams.get("inline") === "true" || req.nextUrl.searchParams.get("preview") === "true";

  console.log("[Download API Stage 1] Incoming preview/download request:", { matId, fileId, isInline });

  // 1. Verify Authentication via Bearer Header (Optional for inline previews of approved materials)
  const authHeader = req.headers.get("Authorization");
  let uid = "";
  let userName = "Student";
  let userEmail = "";
  let isAdmin = false;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      uid = decodedToken.uid;
      userName = decodedToken.name || decodedToken.email?.split("@")[0] || "Student";
      userEmail = decodedToken.email || "";
      
      if (adminDb) {
        const userSnap = await adminDb.collection("users").doc(uid).get();
        if (userSnap.exists && userSnap.data()?.role === "admin") {
          isAdmin = true;
        }
      }
      
      const allowedAdmins = [
        "mohamedsajid.sa@gmail.com",
        "sudharajsekar2005@gmail.com",
        "admin.paperinoirfan27@gmail.com",
        "admin.paperinosam14@gmail.com",
        "gameplayitlifeitis@gmail.com"
      ];
      if (userEmail && allowedAdmins.includes(userEmail.toLowerCase())) {
        isAdmin = true;
      }
    } catch (err: any) {
      console.warn("[Download API Stage 1 Notice] Auth token decoding failed (continuing for public preview if approved):", err.message);
    }
  }

  if (!adminDb) {
    return new Response(JSON.stringify({ error: "Server Configuration Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. Resolve fileId and metadata from Firestore
  let finalFileId = "";
  let matName = "material.pdf";
  let matStatus = "approved";

  if (matId && matId !== "null" && matId !== "undefined") {
    try {
      const matSnap = await adminDb.collection("materials").doc(matId).get();
      if (matSnap.exists) {
        const matData = matSnap.data() || {};
        matStatus = matData.status || "approved";
        
        // Permission check: if material is pending/rejected, only uploader or admin can access
        if (matStatus !== "approved" && matData.uploaderId !== uid && !isAdmin) {
          return new Response(JSON.stringify({ error: "Access Denied", message: "This material is pending review." }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        finalFileId = matData.fileId || "";
        matName = matData.fileName || matData.title || "material.pdf";
      }
    } catch (err: any) {
      console.error("[Download API Stage 2 Error] Error resolving material document:", err);
    }
  }

  if (!finalFileId && fileId && VALID_FILE_ID.test(fileId)) {
    try {
      const snap = await adminDb.collection("materials").where("fileId", "==", fileId).limit(1).get();
      if (!snap.empty) {
        const matData = snap.docs[0].data();
        matStatus = matData.status || "approved";
        if (matStatus !== "approved" && matData.uploaderId !== uid && !isAdmin) {
          return new Response(JSON.stringify({ error: "Access Denied", message: "This material is pending review." }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
        matName = matData.fileName || matData.title || "material.pdf";
      }
    } catch (e) {
      console.warn("[Download API Stage 2 Notice] Material query by fileId skipped:", e);
    }
    finalFileId = fileId;
  }

  if (!finalFileId || !VALID_FILE_ID.test(finalFileId)) {
    console.error("[Download API Stage 2 Error] Invalid or missing fileId:", { matId, fileId, finalFileId });
    return new Response(JSON.stringify({ error: "Invalid or missing file association" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 3. Stream binary file directly from Google Drive Storage
  let fileBuffer: Buffer;
  let mimeType = getMimeTypeByFilename(matName);

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return new Response(JSON.stringify({ error: "Storage credentials not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[Download API Stage 3] Fetching raw binary stream from Google Drive for fileId: ${finalFileId}...`);
    const driveRes = await drive.files.get(
      { fileId: finalFileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    fileBuffer = Buffer.from(driveRes.data as ArrayBuffer);
    const driveMime = (driveRes.headers["content-type"] as string) || "";
    if (driveMime && driveMime !== "application/octet-stream") {
      mimeType = driveMime;
    }
    console.log(`[Download API Stage 3 Complete] Binary stream received. Size: ${fileBuffer.length} bytes, Mime: ${mimeType}`);

  } catch (err: any) {
    console.error("[Download API Stage 3 Error] Drive streaming failed:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch document stream from storage service: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 4. Return raw Response with binary buffer
  const isPdf = mimeType.includes("pdf") || matName.toLowerCase().endsWith(".pdf");
  const finalMime = isPdf ? "application/pdf" : mimeType;
  const dispositionType = isInline ? "inline" : `attachment; filename="${encodeURIComponent(matName)}"`;

  console.log(`[Download API Stage 4 Complete] Returning raw binary Response (${fileBuffer.length} bytes, Content-Type="${finalMime}", Content-Disposition="${dispositionType}")`);

  return new Response(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": finalMime,
      "Content-Length": fileBuffer.length.toString(),
      "Content-Disposition": dispositionType,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
