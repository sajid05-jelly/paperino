/**
 * /api/download/route.ts
 *
 * Secure download proxy for Paperino study materials.
 * Verifies Firebase Auth ID Token, fetches configurations from platform_config/security,
 * enforces download rate-limiting, writes log entries to download_logs,
 * retrieves Drive File ID privately, and overlays dynamic PDF watermarks.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { PDFDocument, rgb, degrees } from "pdf-lib";

export const dynamic = "force-dynamic";

/** Strict Google Drive file ID pattern: alphanumeric + dash + underscore, 10-60 chars */
const VALID_FILE_ID = /^[a-zA-Z0-9_-]{10,60}$/;

export async function GET(req: NextRequest) {
  let matId = req.nextUrl.searchParams.get("matId");
  let fileId = req.nextUrl.searchParams.get("fileId"); // Legacy fallback

  console.log("[Download API] Secure request received:", { matId, fileId });

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
  let userName = "Student";
  let userEmail = "";
  let isAdmin = false;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    uid = decodedToken.uid;
    userName = decodedToken.name || decodedToken.email?.split("@")[0] || "Student";
    userEmail = decodedToken.email || "";
    
    // Check admin database flag
    if (adminDb) {
      const userSnap = await adminDb.collection("users").doc(uid).get();
      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true;
      }
    }
    
    // Developer fallback email lists
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
    console.error("[Download API] Auth token verification failed:", err);
    return NextResponse.json(
      { error: "Access Denied", message: err.message || "Invalid token" },
      { status: 401 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
  }

  // 1.5 Verify Single-Use Download Token
  const dToken = req.nextUrl.searchParams.get("token");
  if (!dToken) {
    return NextResponse.json({ error: "Access Denied", message: "Missing download session token" }, { status: 403 });
  }

  try {
    const tokenSnap = await adminDb.collection("download_tokens").doc(dToken).get();
    if (!tokenSnap.exists) {
      return NextResponse.json({ error: "Access Denied", message: "Invalid or expired download token" }, { status: 403 });
    }

    const tokenData = tokenSnap.data() || {};
    
    // Check if used
    if (tokenData.used) {
      return NextResponse.json({ error: "Access Denied", message: "Download token has already been used" }, { status: 403 });
    }

    // Check uid ownership
    if (tokenData.uid !== uid) {
      return NextResponse.json({ error: "Access Denied", message: "Token ownership mismatch" }, { status: 403 });
    }

    // Check expiry (e.g. 5 minutes)
    const tokenCreatedAt = tokenData.createdAt?.toDate ? tokenData.createdAt.toDate().getTime() : Date.now();
    const tokenAge = Date.now() - tokenCreatedAt;
    if (tokenAge > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Access Denied", message: "Download token has expired" }, { status: 403 });
    }

    // Mark as used immediately to prevent replay attacks
    await adminDb.collection("download_tokens").doc(dToken).update({ used: true });
  } catch (tokenErr: any) {
    console.error("[Download API] Token validation exception:", tokenErr);
    return NextResponse.json({ error: "Failed to validate download token session" }, { status: 403 });
  }

  // 2. Fetch Security Configurations from Firestore
  let watermarkEnabled = true;
  let downloadLogging = true;
  let downloadRateLimit = 50;

  try {
    const configSnap = await adminDb.collection("platform_config").doc("security").get();
    if (configSnap.exists) {
      const configData = configSnap.data();
      if (configData) {
        watermarkEnabled = configData.watermarkEnabled !== false;
        downloadLogging = configData.downloadLogging !== false;
        downloadRateLimit = typeof configData.downloadRateLimit === "number" ? configData.downloadRateLimit : 50;
      }
    } else {
      // Create default config if it doesn't exist
      await adminDb.collection("platform_config").doc("security").set({
        watermarkEnabled: true,
        downloadLogging: true,
        downloadRateLimit: 50,
        downloadTokenExpiry: 300,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (err) {
    console.warn("[Download API] Failed to fetch security configurations, using defaults:", err);
  }

  // 3. Resolve fileId and metadata privately from Firestore
  let finalFileId = "";
  let matName = "material";
  let mimeType = "application/octet-stream";

  if (matId) {
    try {
      const matSnap = await adminDb.collection("materials").doc(matId).get();
      if (!matSnap.exists) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }
      const matData = matSnap.data() || {};
      
      // Permission check: if material is not approved, only uploader or admin can download
      if (matData.status !== "approved" && matData.uploaderId !== uid && !isAdmin) {
        return NextResponse.json({ error: "Access Denied", message: "This material is pending review." }, { status: 403 });
      }

      finalFileId = matData.fileId || "";
      matName = matData.fileName || matData.title || "material";
    } catch (err: any) {
      console.error("[Download API] Error resolving material document:", err);
      return NextResponse.json({ error: "Failed to resolve material details" }, { status: 500 });
    }
  } else if (fileId && VALID_FILE_ID.test(fileId)) {
    // Legacy fallback
    finalFileId = fileId;
  }

  if (!finalFileId || !VALID_FILE_ID.test(finalFileId)) {
    return NextResponse.json({ error: "Invalid or missing file association" }, { status: 400 });
  }

  // 4. Rate Limiting Enforcer (Admins are exempt)
  if (!isAdmin && downloadRateLimit > 0) {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const logsQuery = await adminDb
        .collection("download_logs")
        .where("uid", "==", uid)
        .where("downloadTime", ">=", oneHourAgo)
        .get();

      if (logsQuery.size >= downloadRateLimit) {
        return NextResponse.json(
          { error: "Rate Limit Exceeded", message: "You have reached your download limit. Please try again later." },
          { status: 429 }
        );
      }
    } catch (err) {
      console.error("[Download API] Rate limiting check error:", err);
    }
  }

  // Generate unique download credentials
  const downloadId = randomUUID();
  const shortDownloadId = `DL-${downloadId.substring(0, 8).toUpperCase()}`;
  const shortUid = `USR-${uid.substring(0, 8).toUpperCase()}`;

  // 5. Stream from Google Drive
  let fileBuffer: Buffer;
  let fileHeaders: any;

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({ error: "Storage credentials not configured" }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    
    // Fetch file stream/data
    const driveRes = await drive.files.get(
      { fileId: finalFileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    if (!driveRes || driveRes.status !== 200) {
      return NextResponse.json({ error: "Failed to stream file payload from Drive" }, { status: 500 });
    }

    fileBuffer = Buffer.from(driveRes.data as ArrayBuffer);
    fileHeaders = driveRes.headers;
    mimeType = (fileHeaders["content-type"] as string) || mimeType;

  } catch (err: any) {
    console.error("[Download API] Drive streaming error:", err);
    return NextResponse.json({ error: "Failed to download file from storage service" }, { status: 500 });
  }

  // 6. Dynamic Watermarking for PDFs
  const isPdf = mimeType.includes("pdf") || matName.toLowerCase().endsWith(".pdf");
  if (isPdf && watermarkEnabled) {
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont("Helvetica");

      const watermarkText = `Paperino | Downloaded by ${userName} | User ID: ${shortUid} | Download ID: ${shortDownloadId} | ${new Date().toLocaleString("en-IN")}`;

      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(watermarkText, {
          x: width * 0.1,
          y: height * 0.15,
          size: Math.max(8, Math.min(11, width / 45)),
          font: font,
          color: rgb(0.55, 0.35, 0.9), // Purple branding
          opacity: 0.15,
          rotate: degrees(30),
        });
      }

      const modifiedPdfBytes = await pdfDoc.save();
      fileBuffer = Buffer.from(modifiedPdfBytes);
      mimeType = "application/pdf";
    } catch (pdfErr) {
      console.error("[Download API] Failed to overlay watermark. Serving original PDF instead.", pdfErr);
    }
  }

  // 7. Write to Audit Logs (Async, non-blocking)
  if (downloadLogging) {
    try {
      const userAgent = req.headers.get("user-agent") || "";
      let browser = "Unknown Browser";
      if (userAgent.includes("Chrome")) browser = "Chrome";
      else if (userAgent.includes("Safari")) browser = "Safari";
      else if (userAgent.includes("Firefox")) browser = "Firefox";
      else if (userAgent.includes("Edg")) browser = "Edge";

      let device = "Desktop";
      if (/mobile|android|iphone|ipad/i.test(userAgent)) {
        device = "Mobile";
      }

      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "Local/Proxy";

      await adminDb.collection("download_logs").doc(downloadId).set({
        uid,
        materialId: matId || "legacy_file",
        downloadId,
        downloadTime: admin.firestore.FieldValue.serverTimestamp(),
        browser,
        device,
        ipAddress,
        userAgent
      });

      // Increment totals
      if (matId) {
        const statsRef = adminDb.collection("platform_stats").doc("materials").collection("downloads").doc(matId);
        await statsRef.set({
          name: matName || matId,
          downloads: admin.firestore.FieldValue.increment(1),
          lastDownloaded: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const materialRef = adminDb.collection("materials").doc(matId);
        await materialRef.update({
          downloads: admin.firestore.FieldValue.increment(1)
        });
      }
    } catch (logErr) {
      console.error("[Download API] Failed to write download audit logs:", logErr);
    }
  }

  // Stream output response
  const isInline = req.nextUrl.searchParams.get("inline") === "true" || req.nextUrl.searchParams.get("preview") === "true";
  const dispositionType = isInline ? "inline" : "attachment";

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", mimeType);
  responseHeaders.set("Content-Disposition", `${dispositionType}; filename="${matName}"`);
  responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
  responseHeaders.set("Pragma", "no-cache");
  responseHeaders.set("Expires", "0");

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: responseHeaders
  });
}
