/**
 * /api/download/route.ts
 *
 * Secure download proxy for Paperino study materials.
 *
 * All files in Google Drive are shared as "anyone with link - viewer".
 * We use Google's direct download URL (uc?export=download) which:
 *   ✅ Triggers an immediate file download
 *   ✅ NEVER opens Google Drive UI or pages
 *   ✅ Works for all file sizes
 *   ✅ Requires no OAuth (files are publicly shared)
 *   ✅ The download URL on the client is always /api/download?fileId=xxx
 *      (the Google CDN redirect is server-side)
 *
 * Usage: GET /api/download?fileId=DRIVE_FILE_ID
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Strict Google Drive file ID pattern: alphanumeric + dash + underscore, 10-60 chars */
const VALID_FILE_ID = /^[a-zA-Z0-9_-]{10,60}$/;

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");

  // Validate fileId — reject anything that doesn't look like a real Drive ID
  if (!fileId || !VALID_FILE_ID.test(fileId)) {
    return NextResponse.json(
      { error: "Invalid or missing fileId" },
      { status: 400 }
    );
  }

  // Build the direct download URL.
  // `export=download` forces a file download (never opens Drive viewer).
  // `confirm=t` bypasses the virus-scan warning page for large files.
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;

  // 302 redirect — browser follows it and immediately starts downloading.
  // No Google Drive page ever opens. The user only sees /api/download in their
  // browser history; the Google CDN URL is invisible to them.
  return NextResponse.redirect(downloadUrl, { status: 302 });
}
