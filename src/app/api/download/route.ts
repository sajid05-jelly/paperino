/**
 * /api/download/route.ts
 *
 * Secure download proxy for Paperino study materials.
 *
 * We verify the Firebase Auth ID Token (Bearer) on the server,
 * enforce rate limits, increment metrics, and stream the file directly
 * from Google Drive using OAuth credentials.
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
  // 1. Verify Authentication via Bearer Header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Access Denied", message: "You found the door... but forgot the key 🔑" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  let uid = "";
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
  } catch (err) {
    console.error("Auth verification failed:", err);
    return NextResponse.json(
      { error: "Access Denied", message: "You found the door... but forgot the key 🔑" },
      { status: 401 }
    );
  }

  const fileId = req.nextUrl.searchParams.get("fileId");
  const matId = req.nextUrl.searchParams.get("matId");
  const matName = req.nextUrl.searchParams.get("matName");

  // Validate fileId — reject anything that doesn't look like a real Drive ID
  if (!fileId || !VALID_FILE_ID.test(fileId)) {
    return NextResponse.json(
      { error: "Invalid or missing fileId" },
      { status: 400 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
  }

  // 2. Rate Limiting (Max 10 requests / minute per user)
  try {
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const now = Date.now();
    const rateLimit = userData.downloadRateLimit || { count: 0, resetTime: 0 };

    if (now > rateLimit.resetTime) {
      rateLimit.count = 1;
      rateLimit.resetTime = now + 60000; // Reset in 60s
    } else {
      rateLimit.count += 1;
    }

    if (rateLimit.count > 10) {
      return NextResponse.json(
        { error: "Rate limit exceeded: Max 10 downloads per minute." },
        { status: 429 }
      );
    }

    await userRef.update({ downloadRateLimit: rateLimit });
  } catch (err) {
    console.error("Rate limit verification error:", err);
    return NextResponse.json({ error: "Internal security authorization check failed" }, { status: 500 });
  }

  // 3. Track and Increment Download Count on Server Side
  if (matId) {
    try {
      // Increment stats collection
      const statsRef = adminDb.collection("platform_stats").doc("materials").collection("downloads").doc(matId);
      await statsRef.set({
        name: matName || matId,
        downloads: admin.firestore.FieldValue.increment(1),
        lastDownloaded: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Increment materials collection document
      const materialRef = adminDb.collection("materials").doc(matId);
      await materialRef.update({
        downloads: admin.firestore.FieldValue.increment(1)
      });
    } catch (err) {
      console.error("Tracking background error:", err);
    }
  }

  // 4. Stream File directly from Google Drive using authenticated OAuth credentials
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      console.error("Download API error: Google Drive OAuth credentials not configured");
      return NextResponse.json({ error: "Google Drive OAuth credentials not configured" }, { status: 500 });
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

    // Fetch the file as stream from Drive
    const driveRes = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "stream" }
    );

    if (!driveRes || driveRes.status !== 200) {
      console.error("Failed to retrieve file from Drive:", driveRes);
      return NextResponse.json({ error: "Failed to retrieve storage file from Drive" }, { status: 500 });
    }

    // Pass the Drive response stream directly back to the client
    const headers = new Headers();
    headers.set("Content-Type", (driveRes.headers["content-type"] as string) || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${matName || 'material'}"`);
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");

    const webStream = Readable.toWeb(driveRes.data as Readable);

    return new NextResponse(webStream as any, {
      status: 200,
      headers
    });
  } catch (err: any) {
    console.error("Streaming file error from Google Drive API:", err);
    return NextResponse.json({ 
      error: "Failed to download file from storage service",
      details: err.message || String(err)
    }, { status: 500 });
  }
}
