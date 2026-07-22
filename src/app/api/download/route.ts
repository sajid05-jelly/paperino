/**
 * /api/download/route.ts
 *
 * Secure download proxy for Paperino study materials.
 *
 * We verify the Firebase Auth ID Token (Bearer) on the server,
 * and stream the file directly from Google Drive using OAuth credentials.
 * Zero Firestore reads are performed during the download process.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

/** Strict Google Drive file ID pattern: alphanumeric + dash + underscore, 10-60 chars */
const VALID_FILE_ID = /^[a-zA-Z0-9_-]{10,60}$/;

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");
  const matId = req.nextUrl.searchParams.get("matId");
  const matName = req.nextUrl.searchParams.get("matName");

  console.log("[Download API] Request received:", { fileId, matId, matName });

  // 1. Verify Authentication via Bearer Header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("[Download API] Missing or invalid Authorization header");
    return NextResponse.json(
      { error: "Access Denied", message: "Missing authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  let uid = "";
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
    console.log("[Download API] Authentication successful for uid:", uid);
  } catch (err: any) {
    console.error("[Download API] Auth token verification failed:", err);
    return NextResponse.json(
      { error: "Access Denied", message: err.message || "Invalid token" },
      { status: 401 }
    );
  }

  // Validate fileId — reject anything that doesn't look like a real Drive ID
  if (!fileId || !VALID_FILE_ID.test(fileId)) {
    console.error("[Download API] Invalid fileId format received:", fileId);
    return NextResponse.json(
      { error: "Invalid or missing fileId" },
      { status: 400 }
    );
  }

  // 2. Track and Increment Download Count on Server Side (Firestore Writes Only - No Reads)
  if (matId && adminDb) {
    try {
      console.log("[Download API] Registering download stats in Firestore for matId:", matId);
      // Increment stats collection (Firestore Write)
      const statsRef = adminDb.collection("platform_stats").doc("materials").collection("downloads").doc(matId);
      await statsRef.set({
        name: matName || matId,
        downloads: admin.firestore.FieldValue.increment(1),
        lastDownloaded: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Increment materials collection document (Firestore Write)
      const materialRef = adminDb.collection("materials").doc(matId);
      await materialRef.update({
        downloads: admin.firestore.FieldValue.increment(1)
      });
      console.log("[Download API] Firestore download stats incremented successfully");
    } catch (err: any) {
      console.error("[Download API] Firestore tracking error (Ignored to prevent download blockage):", err);
    }
  }

  // 3. Stream File directly from Google Drive using authenticated OAuth credentials (0 Firestore Reads)
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    console.log("[Download API] Google Drive authentication method: OAuth2 Client configuration check...");
    if (!clientId || !clientSecret || !refreshToken) {
      const errorMsg = "Download API error: Google Drive OAuth credentials not configured";
      console.error("[Download API]", errorMsg, { clientId: !!clientId, clientSecret: !!clientSecret, refreshToken: !!refreshToken });
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log("[Download API] Fetching file stream from Google Drive for fileId:", fileId);
    
    // Fetch the file as stream from Drive
    const driveRes = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "stream" }
    );

    console.log("[Download API] Google Drive API response status:", driveRes.status);
    if (!driveRes || driveRes.status !== 200) {
      console.error("[Download API] Failed response from Google Drive:", driveRes);
      return NextResponse.json({ 
        error: "Failed to retrieve storage file from Drive",
        status: driveRes.status,
        headers: driveRes.headers
      }, { status: 500 });
    }

    // Pass the Drive response stream directly back to the client
    const headers = new Headers();
    headers.set("Content-Type", (driveRes.headers["content-type"] as string) || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${matName || 'material'}"`);
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");

    console.log("[Download API] Converting Node stream to Web Stream and starting download response...");
    const webStream = Readable.toWeb(driveRes.data as Readable);

    return new NextResponse(webStream as any, {
      status: 200,
      headers
    });
  } catch (err: any) {
    console.error("[Download API] Critical exception caught during file streaming:", err);
    if (err.stack) {
      console.error(err.stack);
    }
    return NextResponse.json({ 
      error: "Failed to download file from storage service",
      exception: err.message || String(err),
      stack: err.stack
    }, { status: 500 });
  }
}
