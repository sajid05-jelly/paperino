/**
 * driveUtils.ts
 *
 * Centralised helpers for building Google Drive URLs.
 * All download links in Paperino should go through /api/download?fileId=xxx
 * so that users never see Google Drive pages or folder URLs.
 */



/**
 * Robustly extract raw 10-60 character Google Drive File ID from raw strings or full Drive URLs
 */
export function extractDriveFileId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // If it's a Firebase Storage or non-Drive URL, return empty so direct URL preview is used
  if (trimmed.includes("firebasestorage.googleapis.com") || (trimmed.startsWith("http") && !trimmed.includes("drive.google.com") && !trimmed.includes("docs.google.com"))) {
    return "";
  }

  // 1. Raw 10-60 character file ID
  if (/^[a-zA-Z0-9_-]{10,60}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Full Drive URL matching /file/d/{fileId}
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{10,60})/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // 3. Short Drive URL matching /d/{fileId}
  const matchD = trimmed.match(/\/d\/([a-zA-Z0-9_-]{10,60})/);
  if (matchD && matchD[1]) return matchD[1];

  // 4. Drive URL matching ?id={fileId} or &id={fileId}
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,60})/);
  if (matchId && matchId[1]) return matchId[1];

  return "";
}

/**
 * Returns the canonical, mobile-friendly Google Drive view URL.
 * Uses /view?usp=sharing which opens properly across iPhone Safari, iOS Chrome, Android, and desktop.
 * Avoids /preview which displays a blank screen with "Something went wrong. Try again later."
 * on mobile browsers due to third-party cookie restrictions and missing desktop iframe cookies.
 */
export function getDriveViewUrl(fileId: string): string {
  if (!fileId) return "";
  const cleanId = extractDriveFileId(fileId) || fileId;
  return `https://drive.google.com/file/d/${cleanId}/view?usp=sharing`;
}

/**
 * Direct Google Drive export download link for fallback flows
 */
export function getDriveDownloadUrl(fileId: string): string {
  if (!fileId) return "";
  const cleanId = extractDriveFileId(fileId) || fileId;
  return `https://drive.google.com/uc?export=download&id=${cleanId}`;
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
    const { auth } = await import("./firebase");
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

    // Resolve user's actual profile name from Firebase Auth / Google Provider / sessionStorage / email
    let clientDisplayName = user.displayName || "";
    if (!clientDisplayName && user.providerData && user.providerData.length > 0) {
      for (const provider of user.providerData) {
        if (provider.displayName) {
          clientDisplayName = provider.displayName;
          break;
        }
      }
    }
    if (!clientDisplayName && typeof window !== "undefined") {
      try {
        const cachedRaw = sessionStorage.getItem(`paperino_user_profile_${user.uid}`);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const d = cached?.data;
          if (d?.displayName && d.displayName !== "Student" && d.displayName !== "Paperino User") {
            clientDisplayName = d.displayName;
          } else if (d?.username) {
            clientDisplayName = d.username;
          } else if (d?.name) {
            clientDisplayName = d.name;
          }
        }
      } catch {}
    }
    if (!clientDisplayName && user.email) {
      clientDisplayName = user.email.split("@")[0].replace(/[._-]/g, " ").trim();
    }

    // 1. Fetch secure temporary download token with user profile info
    const tokenRes = await fetch("/api/download/token", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        displayName: clientDisplayName || user.displayName || "",
        email: user.email || "",
        uid: user.uid
      })
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.json().catch(() => ({}));
      
      if (tokenRes.status === 403 && tokenErr.limit !== undefined && tokenErr.plan) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("LIMIT_REACHED", {
              detail: { featureName: "Downloads", plan: tokenErr.plan, limit: tokenErr.limit }
            })
          );
        }
        throw new Error("LIMIT_REACHED");
      }

      throw new Error(tokenErr.message || "Failed to establish a secure download session.");
    }

    const { token: downloadToken } = await tokenRes.json();

    // 2. Direct browser download trigger via token URL
    const resolvedFileId = mat.fileId || extractDriveFileId(mat.fileUrl || "");
    const matParam = mat.id ? `matId=${encodeURIComponent(mat.id)}` : "";
    const fileParam = resolvedFileId ? `fileId=${encodeURIComponent(resolvedFileId)}` : "";
    const nameParam = (mat.fileName || mat.title) ? `fileName=${encodeURIComponent(mat.fileName || mat.title || "")}` : "";
    const identifierQuery = [matParam, fileParam, nameParam].filter(Boolean).join("&");
    const downloadUrl = `/api/download?${identifierQuery}&token=${encodeURIComponent(downloadToken)}`;

    // Cross-browser & Mobile download trigger handling:
    // Using target="_blank" and download attribute initiates download without unloading the current page,
    // completely eliminating the black/blank screen issue on mobile (iOS Safari & Chrome Android).
    const isMobile = typeof navigator !== "undefined" && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", mat.fileName || mat.title || "material.pdf");
    if (isMobile) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {}
    }, 500);

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

    if (err.message === "LIMIT_REACHED") return false;

    console.error("Secure download failed:", err);
    showToast?.(err.message || "Failed to download material.", "error");
    return false;
  }
}

/**
 * Returns a Drive file preview URL.
 * Automatically delegates to getDriveViewUrl (/view?usp=sharing) so neither mobile nor desktop
 * users ever get stuck with the blank screen "Something went wrong. Try again later." error from /preview.
 */
export function getDrivePreviewUrl(fileId: string): string {
  return getDriveViewUrl(fileId);
}
