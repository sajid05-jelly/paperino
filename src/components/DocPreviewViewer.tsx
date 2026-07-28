"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { triggerSecureDownload } from "@/lib/driveUtils";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const { showToast, dismissToast } = useToast();

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [streamMimeType, setStreamMimeType] = useState<string>("");

  const title = mat.fileName || mat.title || "Study Material";
  const extension = title.split(".").pop()?.toLowerCase() || "";
  const isOfficeFormat = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(extension);

  useEffect(() => {
    let isMounted = true;
    let createdUrl: string | null = null;

    const fetchPaperinoNativeStream = async () => {
      console.log(`[DocPreviewViewer] Stage 1: Initiating native preview stream for "${title}" (id=${mat.id}, fileId=${mat.fileId})...`);
      setLoading(true);
      setError(null);

      if (isOfficeFormat) {
        if (isMounted) {
          console.log(`[DocPreviewViewer] Stage 5: Office document format detected (${extension.toUpperCase()}). Displaying Paperino Download View.`);
          setError(`Office document format (${extension.toUpperCase()}) — preview unavailable.`);
          setLoading(false);
        }
        return;
      }

      try {
        let authHeader = "";
        if (user) {
          try {
            const token = await user.getIdToken();
            authHeader = `Bearer ${token}`;
            console.log(`[DocPreviewViewer] Stage 1 Complete: User authentication verified for ${user.email || user.uid}.`);
          } catch (e) {
            console.warn("[DocPreviewViewer] ID token fetch notice (proceeding with request):", e);
          }
        }

        // Stage 2: Fetch binary stream from API
        const matParam = mat.id ? `matId=${encodeURIComponent(mat.id)}` : "";
        const fileParam = mat.fileId ? `fileId=${encodeURIComponent(mat.fileId)}` : "";
        const identifierQuery = [matParam, fileParam].filter(Boolean).join("&");
        const downloadUrl = `/api/download?${identifierQuery}&inline=true`;

        const requestHeaders: Record<string, string> = {};
        if (authHeader) {
          requestHeaders["Authorization"] = authHeader;
        }

        console.log(`[DocPreviewViewer] Stage 2: Requesting binary stream from ${downloadUrl}...`);
        const streamRes = await fetch(downloadUrl, {
          method: "GET",
          headers: requestHeaders
        });

        if (!streamRes.ok) {
          const errData = await streamRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `HTTP ${streamRes.status}: Document stream request failed.`);
        }

        const mime = streamRes.headers.get("Content-Type") || "application/pdf";
        const contentLength = streamRes.headers.get("Content-Length") || "unknown";
        console.log(`[DocPreviewViewer] Stage 3 Complete: HTTP 200 OK received. Content-Type: "${mime}", Content-Length: ${contentLength} bytes.`);

        if (isMounted) {
          setStreamMimeType(mime);
        }

        // Stage 4: Read ArrayBuffer and wrap in explicit Blob
        console.log(`[DocPreviewViewer] Stage 4: Reading ArrayBuffer from stream response...`);
        const arrayBuffer = await streamRes.arrayBuffer();

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error("Received empty 0-byte ArrayBuffer from storage stream API.");
        }

        const targetMime = (mime && !mime.includes("octet-stream")) ? mime : (extension === "pdf" ? "application/pdf" : mime);
        const pdfBlob = new Blob([arrayBuffer], { type: targetMime });
        console.log(`[DocPreviewViewer] Stage 4 Complete: Blob constructed. Size: ${pdfBlob.size} bytes, Type: "${pdfBlob.type}".`);

        if (isMounted) {
          createdUrl = URL.createObjectURL(pdfBlob);
          setBlobUrl(createdUrl);
          console.log(`[DocPreviewViewer] Stage 5 Complete: Created ObjectURL (${createdUrl}). Rendering iframe...`);
          setLoading(false);
          console.log(`[DocPreviewViewer] Stage 6 Complete: Document preview successfully mounted!`);
        }
      } catch (err: any) {
        console.error("[DocPreviewViewer Error] Preview pipeline failure:", err);
        if (isMounted) {
          const errorMsg = err.message || "Failed to load document stream.";
          setError(errorMsg);
          setLoading(false);

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("paperino:permission_error", {
                detail: { message: `Native Paperino Viewer Error: ${errorMsg}` }
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
  }, [user, mat.id, mat.fileId, extension, title, isOfficeFormat]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    setDownloading(true);
    triggerSecureDownload(mat, showToast, dismissToast, (l) => setDownloading(l));
  };

  const isImageMime = streamMimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(extension);

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
            {downloading ? <Loader2 size={16} className="animate-spin text-white" /> : <Download size={16} />}
            <span>Download Document</span>
          </button>
        </div>
      )}

      {!loading && !error && blobUrl && (
        <div className="relative flex-1 w-full h-full bg-[#050308]">
          {isImageMime ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={blobUrl}
              alt={title}
              className="w-full h-full object-contain mx-auto block p-4 select-none"
            />
          ) : (
            <iframe
              src={blobUrl}
              title={title}
              className="w-full h-full border-none bg-white"
            />
          )}
        </div>
      )}
    </div>
  );
}
