/**
 * /api/download/route.ts
 *
 * Secure download & preview proxy for Paperino study materials.
 * Verifies Firebase Auth ID Token, fetches configurations from platform_config/security,
 * enforces rate-limiting, writes log entries, retrieves Drive File ID privately,
 * overlays dynamic PDF watermarks, and streams inline/attachment binary responses.
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

  console.log("[Download API] Request received:", { matId, fileId });

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
    console.error("[Download API] Auth token verification failed:", err);
    return NextResponse.json(
      { error: "Access Denied", message: err.message || "Invalid token" },
      { status: 401 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
  }

  // 1.5 Verify Single-Use Session Token
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
    
    if (tokenData.used) {
      return NextResponse.json({ error: "Access Denied", message: "Download token has already been used" }, { status: 403 });
    }

    if (tokenData.uid !== uid) {
      return NextResponse.json({ error: "Access Denied", message: "Token ownership mismatch" }, { status: 403 });
    }

    const tokenCreatedAt = tokenData.createdAt?.toDate ? tokenData.createdAt.toDate().getTime() : Date.now();
    const tokenAge = Date.now() - tokenCreatedAt;
    if (tokenAge > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Access Denied", message: "Download token has expired" }, { status: 403 });
    }

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
    }
  } catch (err) {
    console.warn("[Download API] Failed to fetch security configurations, using defaults:", err);
  }

  // 3. Resolve fileId and metadata from Firestore
  let finalFileId = "";
  let matName = "material";

  if (matId && matId !== "null" && matId !== "undefined") {
    try {
      const matSnap = await adminDb.collection("materials").doc(matId).get();
      if (matSnap.exists) {
        const matData = matSnap.data() || {};
        if (matData.status !== "approved" && matData.uploaderId !== uid && !isAdmin) {
          return NextResponse.json({ error: "Access Denied", message: "This material is pending review." }, { status: 403 });
        }
        finalFileId = matData.fileId || "";
        matName = matData.fileName || matData.title || "material";
      }
    } catch (err: any) {
      console.error("[Download API] Error resolving material document:", err);
    }
  }

  if (!finalFileId && fileId && VALID_FILE_ID.test(fileId)) {
    try {
      const snap = await adminDb.collection("materials").where("fileId", "==", fileId).limit(1).get();
      if (!snap.empty) {
        const matData = snap.docs[0].data();
        if (matData.status !== "approved" && matData.uploaderId !== uid && !isAdmin) {
          return NextResponse.json({ error: "Access Denied", message: "This material is pending review." }, { status: 403 });
        }
        matName = matData.fileName || matData.title || "material";
      }
    } catch (e) {
      console.warn("[Download API] Material query by fileId skipped:", e);
    }
    finalFileId = fileId;
  }

  if (!finalFileId || !VALID_FILE_ID.test(finalFileId)) {
    console.error("[Download API] Invalid or missing fileId:", { matId, fileId, finalFileId });
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

  const downloadId = randomUUID();
  const shortDownloadId = `DL-${downloadId.substring(0, 8).toUpperCase()}`;
  const shortUid = `USR-${uid.substring(0, 8).toUpperCase()}`;

  // 5. Stream binary file from Google Drive Storage
  let fileBuffer: Buffer;
  let mimeType = getMimeTypeByFilename(matName);

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

    console.log(`[Download API Stage 2] Fetching file stream from Google Drive for fileId: ${finalFileId}...`);
    const driveRes = await drive.files.get(
      { fileId: finalFileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    fileBuffer = Buffer.from(driveRes.data as ArrayBuffer);
    const driveMime = (driveRes.headers["content-type"] as string) || "";
    if (driveMime && driveMime !== "application/octet-stream") {
      mimeType = driveMime;
    }
    console.log(`[Download API Stage 3] Stream received successfully. Size: ${fileBuffer.length} bytes, Mime: ${mimeType}`);

  } catch (err: any) {
    console.error("[Download API Stage 3 Error] Drive streaming failed:", err);
    return NextResponse.json({ error: "Failed to fetch document stream from storage service: " + err.message }, { status: 500 });
  }

  // 6. Dynamic Watermarking for PDFs
  const isPdf = mimeType.includes("pdf") || matName.toLowerCase().endsWith(".pdf");
  if (isPdf && watermarkEnabled) {
    try {
      console.log(`[Download API Stage 4] Overlaying Paperino dynamic watermark on PDF...`);
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
          color: rgb(0.55, 0.35, 0.9),
          opacity: 0.15,
          rotate: degrees(30),
        });
      }

      const modifiedPdfBytes = await pdfDoc.save();
      fileBuffer = Buffer.from(modifiedPdfBytes);
      mimeType = "application/pdf";
      console.log(`[Download API Stage 4] Watermarking complete.`);
    } catch (pdfErr) {
      console.error("[Download API Stage 4 Warning] Failed to overlay watermark. Serving original PDF instead:", pdfErr);
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
      if (/mobile|android|iphone|ipad/i.test(userAgent)) device = "Mobile";

      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "Local/Proxy";

      adminDb.collection("download_logs").doc(downloadId).set({
        uid,
        materialId: matId || finalFileId,
        downloadId,
        downloadTime: admin.firestore.FieldValue.serverTimestamp(),
        browser,
        device,
        ipAddress,
        userAgent
      }).catch(e => console.warn("[Download API Log Warning]:", e));

      if (matId) {
        adminDb.collection("materials").doc(matId).update({
          downloads: admin.firestore.FieldValue.increment(1)
        }).catch(e => console.warn("[Download API Stat Warning]:", e));
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
  responseHeaders.set("Content-Length", fileBuffer.length.toString());
  responseHeaders.set("Content-Disposition", `${dispositionType}; filename="${encodeURIComponent(matName)}"`);
  responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
  responseHeaders.set("Pragma", "no-cache");
  responseHeaders.set("Expires", "0");

  console.log(`[Download API Stage 5] Serving binary response (${fileBuffer.length} bytes, mime=${mimeType}, disposition=${dispositionType})`);

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: responseHeaders
  });
}
