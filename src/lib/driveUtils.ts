/**
 * driveUtils.ts
 *
 * Centralised helpers for building Google Drive URLs.
 * All download links in Paperino should go through /api/download?fileId=xxx
 * so that users never see Google Drive pages or folder URLs.
 */

import { auth } from "@/lib/firebase";

/**
 * Returns the Paperino backend proxy download URL for a given Drive file ID.
 * The proxy streams the file through our own server so users never touch Drive.
 */
export function getProxyDownloadUrl(fileId: string, matId?: string, matName?: string): string {
  let url = `/api/download?fileId=${encodeURIComponent(fileId)}`;
  if (matId) url += `&matId=${encodeURIComponent(matId)}`;
  if (matName) url += `&matName=${encodeURIComponent(matName)}`;
  return url;
}

/**
 * Backward-compatible helper — returns the best available download URL.
 * New documents have fileId; legacy documents may only have fileUrl (webViewLink).
 * Falls back to fileUrl only if fileId is missing.
 */
export function getDownloadHref(mat: {
  id?: string;
  title?: string;
  fileName?: string;
  fileId?: string | null;
  fileUrl?: string | null;
}): string {
  if (mat.fileId) return getProxyDownloadUrl(mat.fileId, mat.id, mat.title || mat.fileName);
  if (mat.fileUrl) return mat.fileUrl; // legacy fallback
  return "#";
}

/**
 * JavaScript helper to trigger a secure file download:
 * - Obtains the user's active Firebase ID token
 * - Attaches it as an Authorization Bearer header
 * - Streams the file directly and triggers browser download
 */
export async function triggerSecureDownload(
  mat: {
    id?: string;
    title?: string;
    fileName?: string;
    fileId?: string | null;
    fileUrl?: string | null;
  },
  showToast?: (msg: string, type: "success" | "error" | "info" | "warning") => void
): Promise<void> {
  if (!mat.fileId) {
    if (mat.fileUrl) {
      window.open(mat.fileUrl, "_blank");
      return;
    }
    showToast?.("No file available for download", "error");
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      showToast?.("Please log in to download materials", "error");
      return;
    }

    const token = await user.getIdToken();
    const downloadUrl = `/api/download?fileId=${encodeURIComponent(mat.fileId)}&matId=${encodeURIComponent(mat.id || "")}&matName=${encodeURIComponent(mat.title || mat.fileName || "material")}`;

    showToast?.("Preparing secure download...", "info");

    const res = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Download failed: Status ${res.status}`);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const tempLink = document.createElement("a");
    tempLink.href = blobUrl;
    tempLink.setAttribute("download", mat.title || mat.fileName || "material");
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    window.URL.revokeObjectURL(blobUrl);

    showToast?.("Download started successfully", "success");
  } catch (err: any) {
    console.error("Secure download failed:", err);
    showToast?.(err.message || "Failed to trigger download", "error");
  }
}

/**
 * Returns a Drive file preview embed URL (for iframes, no Drive branding on embed).
 * NOT exposed to end users — for internal admin use only.
 */
export function getDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
