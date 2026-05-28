import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { verifyServerAuth } from "@/lib/auth-verify";

export async function POST(req: NextRequest) {
  try {
    // Authenticate and check permissions
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);
    
    if (!verifiedUser || (verifiedUser.role !== "contributor" && verifiedUser.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized. Insufficient permissions." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const semester = formData.get("semester") as string;
    const subject = formData.get("subject") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!folderId || !clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({ error: "Google Drive OAuth credentials not configured" }, { status: 500 });
    }

    // Authenticate using OAuth 2.0 Client & Refresh Token
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Convert Web File to Node.js Readable stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    // Upload to Drive
    const driveRes = await drive.files.create({
      requestBody: {
        name: `btech_sem${semester}_${subject}_${file.name}`,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: stream,
      },
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = driveRes.data.id;

    if (fileId) {
      // Make it accessible to anyone with the link
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    }

    return NextResponse.json({
      success: true,
      fileId: fileId,
      webViewLink: driveRes.data.webViewLink,
      webContentLink: driveRes.data.webContentLink,
    });
  } catch (error: any) {
    console.error("Drive upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload to Google Drive" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Authenticate and check permissions
    const authHeader = req.headers.get("Authorization");
    const verifiedUser = await verifyServerAuth(authHeader);
    
    if (!verifiedUser || verifiedUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "No fileId provided" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
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

    await drive.files.delete({
      fileId: fileId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Drive delete error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete from Google Drive" }, { status: 500 });
  }
}
