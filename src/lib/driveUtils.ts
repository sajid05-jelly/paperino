/**
 * driveUtils.ts
 *
 * Centralised helpers for building Google Drive URLs.
 * All download links in Paperino should go through /api/download?fileId=xxx
 * so that users never see Google Drive pages or folder URLs.
 */

import { auth } from "@/lib/firebase";

/**
 * Robustly extract raw 10-60 character Google Drive File ID from raw strings or full Drive URLs
 */
export function extractDriveFileId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // If it's a Firebase Storage or non-Drive URL, return empty so direct URL preview is used
  if (trimmed.includes("firebasestorage.googleapis.com") || (trimmed.startsWith("http") && !trimmed.includes("drive.google.com"))) {
    return "";
  }

  if (/^[a-zA-Z0-9_-]{10,60}$/.test(trimmed)) {
    return trimmed;
  }

  const matchD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{10,60})/);
  if (matchD && matchD[1]) return matchD[1];

  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,60})/);
  if (matchId && matchId[1]) return matchId[1];

  return "";
}

/**
 * Returns the Paperino backend proxy download URL for a given Drive file ID.
 * The proxy streams the file through our own server so users never touch Drive.
 */
export function getProxyDownloadUrl(fileId: string, matId?: string, matName?: string): string {
  if (matId) return `/api/download?matId=${encodeURIComponent(matId)}`;
  return `/api/download?fileId=${encodeURIComponent(fileId)}`;
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
  if (mat.id) return `/api/download?matId=${encodeURIComponent(mat.id)}`;
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
  showToast?: (msg: string, type: "success" | "error" | "info" | "warning") => string | void,
  dismissToast?: (id: string) => void,
  onLoadingChange?: (loading: boolean) => void
): Promise<boolean> {
  if ((!mat.id && !mat.fileId) || (mat.fileUrl && mat.fileUrl.includes("firebasestorage.googleapis.com"))) {
    if (mat.fileUrl) {
      window.open(mat.fileUrl, "_blank");
      return true;
    }
    showToast?.("No file available for download", "error");
    return false;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      showToast?.("Please sign in to download this material.", "error");
      return false;
    }

    onLoadingChange?.(true);
    if (typeof window !== "undefined") {
      (window as any).__activeDownloads = true;
    }

    const token = await user.getIdToken();

    // 1. Fetch secure temporary download token
    const tokenRes = await fetch("/api/download/token", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.json().catch(() => ({}));
      throw new Error(tokenErr.message || "Failed to establish a secure download session.");
    }

    const { token: downloadToken } = await tokenRes.json();

    // 2. Direct browser download trigger via token URL
    const matParam = mat.id ? `matId=${encodeURIComponent(mat.id)}` : "";
    const fileParam = mat.fileId ? `fileId=${encodeURIComponent(mat.fileId)}` : "";
    const nameParam = (mat.fileName || mat.title) ? `fileName=${encodeURIComponent(mat.fileName || mat.title || "")}` : "";
    const identifierQuery = [matParam, fileParam, nameParam].filter(Boolean).join("&");
    const downloadUrl = `/api/download?${identifierQuery}&token=${encodeURIComponent(downloadToken)}`;

    // Create immediate direct download iframe or link trigger
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", mat.fileName || mat.title || "material.pdf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      if (typeof window !== "undefined") {
        (window as any).__activeDownloads = false;
      }
      onLoadingChange?.(false);
    }, 1000);

    showToast?.("Download started successfully", "success");
    return true;
  } catch (err: any) {
    if (typeof window !== "undefined") {
      (window as any).__activeDownloads = false;
    }
    onLoadingChange?.(false);
    console.error("Secure download failed:", err);
    showToast?.(err.message || "Failed to download material.", "error");
    return false;
  }
}

/**
 * Returns a Drive file preview embed URL (for iframes, no Drive branding on embed).
 * NOT exposed to end users — for internal admin use only.
 */
export function getDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
