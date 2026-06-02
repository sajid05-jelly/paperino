import { auth } from "./firebase";

interface DriveUploadResult {
  fileId: string;
  webViewLink?: string;
  webContentLink?: string;
}

export async function uploadToDriveDirect(
  file: File,
  semester: string,
  subject: string
): Promise<DriveUploadResult> {
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
    name: `btech_sem${semester}_${subject}_${file.name}`,
    parents: [folderId],
  };

  const boundary = "paperino_upload_boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  
  // Read file as ArrayBuffer and construct a Blob
  const arrayBuffer = await file.arrayBuffer();
  
  const multipartBody = new Blob([
    delimiter,
    metadataPart,
    delimiter,
    `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
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

  // 4. Set the permissions to 'anyone with the link can view' (reader)
  const permissionRes = await fetch(
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
  );

  if (!permissionRes.ok) {
    console.warn("Failed to set public sharing permissions on uploaded file. Proceeding anyway.");
  }

  return {
    fileId,
    webViewLink: result.webViewLink,
    webContentLink: result.webContentLink,
  };
}
