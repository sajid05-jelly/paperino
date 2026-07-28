"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Loader2, AlertCircle } from "lucide-react";
import { triggerSecureDownload } from "@/lib/driveUtils";
import { useToast } from "@/components/Toast";
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
  const { showToast, dismissToast } = useToast();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const title = mat.fileName || mat.title || "Study Material";
  const extension = title.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(extension);
  const isPdf = extension === "pdf" || (!extension && mat.title?.toLowerCase().includes("pdf"));

  useEffect(() => {
    let isMounted = true;
    let createdUrl: string | null = null;

    const fetchPaperinoNativeStream = async () => {
      setLoading(true);
      setError(null);

      // Office files (DOC, DOCX, PPT, PPTX, XLS, XLSX) cannot be rendered natively in blob object tags
      const officeExtensions = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];
      if (officeExtensions.includes(extension)) {
        if (isMounted) {
          setError("Office document format — preview unavailable.");
          setLoading(false);
        }
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          if (isMounted) {
            setError("Authentication required to preview this document.");
            setLoading(false);
          }
          return;
        }

        const token = await user.getIdToken();

        // 1. Fetch single-use download session token
        const tokenRes = await fetch("/api/download/token", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!tokenRes.ok) {
          const tokenErr = await tokenRes.json().catch(() => ({}));
          throw new Error(tokenErr.message || "Failed to initialize Paperino preview session.");
        }

        const { token: sessionToken } = await tokenRes.json();

        // 2. Stream native binary from Paperino secure backend
        const downloadUrl = `/api/download?matId=${encodeURIComponent(mat.id || "")}&token=${encodeURIComponent(sessionToken)}&inline=true`;
        
        const streamRes = await fetch(downloadUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!streamRes.ok) {
          const errData = await streamRes.json().catch(() => ({}));
          throw new Error(errData.error || "This document cannot be previewed right now.");
        }

        const blob = await streamRes.blob();
        if (isMounted) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("[Paperino Native Viewer Stream Error]:", err);
        if (isMounted) {
          setError(err.message || "Failed to load document stream.");
          setLoading(false);
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("paperino:permission_error", {
                detail: { message: `Native Paperino Viewer Error: ${err.message}` }
              })
            );
          }
        }
      }
    };

    fetchPaperinoNativeStream();

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [mat.id, extension, mat.title]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    setDownloading(true);
    triggerSecureDownload(mat, showToast, dismissToast, (l) => setDownloading(l));
  };

  return (
    <div className={`relative flex flex-col w-full h-full bg-[#050308] overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07050d] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white tracking-wide">Rendering Document</p>
            <p className="text-xs text-gray-500 animate-pulse">Loading Paperino Native Stream...</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#07050d] space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.15)] mb-2">
            <FileText size={38} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">📄 Preview unavailable</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              This document cannot be previewed right now. You can download it directly to view its contents.
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 mt-4"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>Download Document</span>
          </button>
        </div>
      )}

      {!loading && !error && blobUrl && (
        <div className="relative flex-1 w-full h-full bg-[#050308]">
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={blobUrl}
              alt={title}
              className="w-full h-full object-contain mx-auto block p-4 select-none"
            />
          ) : isPdf ? (
            <object
              data={blobUrl}
              type="application/pdf"
              className="w-full h-full border-none"
            >
              <iframe
                src={blobUrl}
                title={title}
                className="w-full h-full border-none"
              />
            </object>
          ) : (
            <iframe
              src={blobUrl}
              title={title}
              className="w-full h-full border-none"
            />
          )}
        </div>
      )}
    </div>
  );
}
