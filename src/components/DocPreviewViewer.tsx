"use client";

import { useState, useEffect } from "react";
import { FileText, Download, RefreshCw, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import { getDrivePreviewUrl, triggerSecureDownload } from "@/lib/driveUtils";
import { auth } from "@/lib/firebase";

interface DocPreviewViewerProps {
  mat: {
    id?: string;
    fileId?: string | null;
    fileUrl?: string | null;
    title?: string;
    fileName?: string;
    category?: string;
    semesterId?: string;
  };
  onDownload?: () => void;
  className?: string;
}

export default function DocPreviewViewer({ mat, onDownload, className = "" }: DocPreviewViewerProps) {
  const [viewMode, setViewMode] = useState<"drive" | "gdocs" | "blocked">("drive");
  const [loading, setLoading] = useState(true);
  const [permissionRepaired, setPermissionRepaired] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const fileId = mat.fileId || (() => {
    if (!mat.fileUrl) return null;
    const match = mat.fileUrl.match(/\/d\/([\w-]+)/);
    return match ? match[1] : null;
  })();

  const title = mat.fileName || mat.title || "Study Material";
  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(title);

  // 1. Proactively repair Google Drive public permissions on mount
  useEffect(() => {
    if (!fileId) return;

    let isMounted = true;
    const autoRepairPermissions = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const token = await currentUser.getIdToken();
        const res = await fetch("/api/upload", {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ fileId })
        });

        if (res.ok && isMounted) {
          console.log(`[DocPreviewViewer] Google Drive permission auto-repaired for fileId: ${fileId}`);
          setPermissionRepaired(true);
        } else if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("[DocPreviewViewer] Auto-repair warning:", errData.error);
        }
      } catch (err: any) {
        console.warn("[DocPreviewViewer] Auto-repair exception:", err.message);
        if (isMounted) {
          setPermissionError(err.message || "Failed to verify Drive permissions");
          // Emit developer permission sniffer warning event
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("paperino:permission_error", {
                detail: { message: `Google Drive Preview Warning for ${fileId}: ${err.message}` }
              })
            );
          }
        }
      }
    };

    autoRepairPermissions();

    return () => {
      isMounted = false;
    };
  }, [fileId]);

  // 2. Set timeout to detect if iframe preview stalls or gets blocked
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [viewMode]);

  if (!fileId && !mat.fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3 p-6 text-center">
        <FileText size={40} className="text-purple-400/50" />
        <p className="text-sm font-medium text-white">Preview Unavailable</p>
        <p className="text-xs text-gray-500 max-w-sm">No valid Google Drive file reference found for this material.</p>
      </div>
    );
  }

  const primaryDriveUrl = fileId ? getDrivePreviewUrl(fileId) : mat.fileUrl || "";
  const fallbackGDocsUrl = fileId 
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${fileId}`)}&embedded=true`
    : primaryDriveUrl;

  return (
    <div className={`relative flex flex-col w-full h-full bg-[#050308] ${className}`}>
      {/* Secondary Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300">
            <Sparkles size={12} className="text-purple-400" />
            {viewMode === "drive" ? "Google Drive Engine" : "Backup Viewer Engine"}
          </span>
          {permissionRepaired && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              ✓ Drive Public
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "drive" ? (
            <button
              onClick={() => setViewMode("gdocs")}
              className="text-[11px] hover:text-white transition-colors flex items-center gap-1 underline text-gray-400"
              title="Switch to Google Docs viewer fallback"
            >
              <RefreshCw size={11} /> Switch Engine
            </button>
          ) : (
            <button
              onClick={() => setViewMode("drive")}
              className="text-[11px] hover:text-white transition-colors flex items-center gap-1 underline text-purple-400"
            >
              <RefreshCw size={11} /> Use Primary Engine
            </button>
          )}

          {fileId && (
            <a
              href={`https://drive.google.com/file/d/${fileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] hover:text-white transition-colors flex items-center gap-1 text-gray-400"
              title="Open directly on Google Drive"
            >
              <ExternalLink size={11} /> Drive Link
            </a>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="relative flex-1 w-full h-full min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#050308]/90 backdrop-blur-sm space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
            <p className="text-xs text-gray-400 font-medium animate-pulse">Initializing PDF Stream...</p>
          </div>
        )}

        {isImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={primaryDriveUrl}
            alt={title}
            className="w-full h-full object-contain mx-auto block p-4"
            onLoad={() => setLoading(false)}
          />
        ) : (
          <iframe
            key={viewMode}
            src={viewMode === "drive" ? primaryDriveUrl : fallbackGDocsUrl}
            title={title}
            className="w-full h-full border-none"
            allow="autoplay"
            onLoad={() => setLoading(false)}
          />
        )}
      </div>
    </div>
  );
}
