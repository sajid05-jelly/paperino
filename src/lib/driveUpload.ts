import { auth } from "./firebase";

interface DriveUploadResult {
  fileId: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Direct client-to-Google Drive upload helper with server-side public permission enforcement.
 * Ensures contributor and admin uploads use the exact same upload pipeline.
 */
export async function uploadToDriveDirect(
  file: File,
  semester: string,
  subject: string
): Promise<DriveUploadResult> {
  if (typeof window !== "undefined") {
    (window as any).__activeUploads = true;
  }
  try {
    // File Security Validation
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File size exceeds the maximum limit of 20MB.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const allowedExtensions = ["pdf", "docx", "doc", "png", "jpg", "jpeg", "zip", "ppt", "pptx"];
    if (!allowedExtensions.includes(extension)) {
      throw new Error("Unsupported file extension. Allowed types: PDF, Word, PowerPoint, Images, ZIP.");
    }

    const badMimeTypes = [
      "application/x-msdownload",
      "application/javascript",
      "text/html",
      "application/x-sh",
      "application/x-bat"
    ];
    if (badMimeTypes.includes(file.type)) {
      throw new Error("Suspicious file type detected. Executable or script files are strictly blocked.");
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_ ]/g, "_");
    const sanitizedFile = new File([file], sanitizedName, { type: file.type });

    // 1. Get auth token from Firebase Client Auth
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : "";

    // 2. Fetch the temporary Google Drive API access token from our API
    const tokenRes = await fetch("/api/upload", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to retrieve upload permissions");
    }

    const { accessToken, folderId } = await tokenRes.json();

    // 3. Perform Google Drive Multipart upload directly from client
    const metadata = {
      name: `btech_sem${semester}_${subject}_${sanitizedFile.name}`,
      parents: [folderId],
    };

    const boundary = "paperino_upload_boundary";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    
    // Read file as ArrayBuffer and construct a Blob
    const arrayBuffer = await sanitizedFile.arrayBuffer();
    
    const multipartBody = new Blob([
      delimiter,
      metadataPart,
      delimiter,
      `Content-Type: ${sanitizedFile.type || "application/octet-stream"}\r\n\r\n`,
      new Uint8Array(arrayBuffer),
      closeDelimiter
    ], { type: `multipart/related; boundary=${boundary}` });

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        body: multipartBody,
      }
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error("Direct upload to Google Drive failed:", errorText);
      throw new Error("Failed to upload file directly to Google Drive");
    }

    const result = await uploadRes.json();
    const fileId = result.id;

    if (!fileId) {
      throw new Error("Failed to retrieve file ID from Google Drive upload");
    }

    // 4. Set public sharing permissions via server API (guarantees public access without client CORS/scope issues)
    try {
      const permRes = await fetch("/api/upload", {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });

      if (!permRes.ok) {
        console.warn("[driveUpload] Server permissions PATCH returned non-200. Client fallback starting...");
        // Client fallback attempt if server endpoint is busy
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role: "reader",
              type: "anyone",
            }),
          }
        ).catch(() => {});
      }
    } catch (permErr) {
      console.warn("[driveUpload] Exception setting public permission via server API:", permErr);
    }

    return {
      fileId,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
    };
  } finally {
    if (typeof window !== "undefined") {
      (window as any).__activeUploads = false;
    }
  }
}
