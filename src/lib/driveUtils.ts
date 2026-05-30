/**
 * driveUtils.ts
 *
 * Centralised helpers for building Google Drive URLs.
 * All download links in Paperino should go through /api/download?fileId=xxx
 * so that users never see Google Drive pages or folder URLs.
 */

/**
 * Returns the Paperino backend proxy download URL for a given Drive file ID.
 * The proxy streams the file through our own server so users never touch Drive.
 */
export function getProxyDownloadUrl(fileId: string): string {
  return `/api/download?fileId=${encodeURIComponent(fileId)}`;
}

/**
 * Backward-compatible helper — returns the best available download URL.
 * New documents have fileId; legacy documents may only have fileUrl (webViewLink).
 * Falls back to fileUrl only if fileId is missing.
 */
export function getDownloadHref(mat: {
  fileId?: string | null;
  fileUrl?: string | null;
}): string {
  if (mat.fileId) return getProxyDownloadUrl(mat.fileId);
  if (mat.fileUrl) return mat.fileUrl; // legacy fallback
  return "#";
}

/**
 * Returns a Drive file preview embed URL (for iframes, no Drive branding on embed).
 * NOT exposed to end users — for internal admin use only.
 */
export function getDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
