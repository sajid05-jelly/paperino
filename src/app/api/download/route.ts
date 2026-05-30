/**
 * /api/download/route.ts
 *
 * Secure backend proxy that streams Google Drive files directly to the user.
 * Users never see a Google Drive URL or page — the download originates from
 * paperino-eta.vercel.app itself.
 *
 * Usage: GET /api/download?fileId=DRIVE_FILE_ID
 *
 * Security:
 *  - fileId is validated against a strict allowlist pattern
 *  - Uses server-side OAuth credentials (never exposed to browser)
 *  - No authentication required for downloads (materials are public)
 *  - Drive folder URL is never revealed
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Allow up to 60s for large file streaming (Vercel Pro).
// On Hobby plan this is capped at 10s — suitable for PDFs under ~20 MB.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Strict Google Drive file ID pattern: alphanumeric + dash + underscore, 10-60 chars */
const VALID_FILE_ID = /^[a-zA-Z0-9_-]{10,60}$/;

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");

  // --- Validation ---
  if (!fileId || !VALID_FILE_ID.test(fileId)) {
    return NextResponse.json({ error: "Invalid or missing fileId" }, { status: 400 });
  }

  // --- Credentials ---
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // --- Authenticate ---
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // --- Fetch file metadata (name + mimeType) ---
    const metaRes = await drive.files.get({
      fileId,
      fields: "name,mimeType,size",
    });

    const fileName = metaRes.data.name || "download";
    const mimeType = metaRes.data.mimeType || "application/octet-stream";
    const fileSize = metaRes.data.size;

    // --- Stream file bytes ---
    const fileRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // Convert Node.js readable stream → Web ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        (fileRes.data as NodeJS.ReadableStream).on("data", (chunk: Buffer) =>
          controller.enqueue(chunk)
        );
        (fileRes.data as NodeJS.ReadableStream).on("end", () =>
          controller.close()
        );
        (fileRes.data as NodeJS.ReadableStream).on("error", (err: Error) =>
          controller.error(err)
        );
      },
    });

    // --- Build response headers ---
    // Use RFC 5987 encoding for filenames with non-ASCII characters
    const encodedName = encodeURIComponent(fileName).replace(/'/g, "%27");
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedName}`
    );
    headers.set("Content-Type", mimeType);
    if (fileSize) headers.set("Content-Length", fileSize.toString());
    // Prevent browser from caching the signed stream URL
    headers.set("Cache-Control", "private, no-store, no-cache");
    // Security headers — prevent embedding
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(readableStream, { status: 200, headers });
  } catch (err: any) {
    console.error("[download proxy] error:", err?.message || err);

    // Return a user-friendly error — never leak internal Drive details
    if (err?.code === 404 || err?.status === 404) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Download failed. Please try again." },
      { status: 500 }
    );
  }
}
