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
  const [streamMimeType, setStreamMimeType] = useState<string>("");

  const title = mat.fileName || mat.title || "Study Material";
  const extension = title.split(".").pop()?.toLowerCase() || "";
  
  const isOfficeFormat = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(extension);

  useEffect(() => {
    let isMounted = true;
    let createdUrl: string | null = null;

    // 10-second hard rendering timeout controller
    const abortController = new AbortController();
    const hardTimeoutId = setTimeout(() => {
      if (isMounted && loading) {
        abortController.abort();
        setLoading(false);
        const timeoutErrorMsg = `Preview generation timed out (10s limit) for document: "${title}".`;
        setError(timeoutErrorMsg);
        console.error("[Paperino Native Viewer Stage 5 Failure] ⏱️", timeoutErrorMsg);

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("paperino:permission_error", {
              detail: { message: `Native Paperino Viewer Error: ${timeoutErrorMsg}` }
            })
          );
        }
      }
    }, 10000);

    const fetchPaperinoNativeStream = async () => {
      console.log(`[Paperino Native Viewer Stage 1 [FETCH]] Initiating preview session for: "${title}" (id=${mat.id}, fileId=${mat.fileId})...`);
      setLoading(true);
      setError(null);

      // Office files (DOC, DOCX, PPT, PPTX, XLS, XLSX) cannot be rendered directly via blob object tags without server conversion
      if (isOfficeFormat) {
        if (isMounted) {
          clearTimeout(hardTimeoutId);
          console.log(`[Paperino Native Viewer Stage 5 [RENDERER]] Office format detected (${extension.toUpperCase()}). Showing Paperino Download Card.`);
          setError(`Office document format (${extension.toUpperCase()}) — direct preview unavailable.`);
          setLoading(false);
        }
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          if (isMounted) {
            clearTimeout(hardTimeoutId);
            setError("Authentication required to preview this document.");
            setLoading(false);
          }
          return;
        }

        const token = await user.getIdToken();

        // Stage 1: Fetch single-use session token
        console.log(`[Paperino Native Viewer Stage 1 [FETCH]] Requesting single-use download session token...`);
        const tokenRes = await fetch("/api/download/token", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          signal: abortController.signal
        });

        if (!tokenRes.ok) {
          const tokenErr = await tokenRes.json().catch(() => ({}));
          throw new Error(tokenErr.message || "Failed to initialize Paperino preview session.");
        }

        const { token: sessionToken } = await tokenRes.json();
        console.log(`[Paperino Native Viewer Stage 2 [API]] Session token obtained successfully.`);

        // Stage 2: Build stream URL with fallback between matId & fileId
        const identifierParam = mat.id ? `matId=${encodeURIComponent(mat.id)}` : `fileId=${encodeURIComponent(mat.fileId || "")}`;
        const downloadUrl = `/api/download?${identifierParam}&token=${encodeURIComponent(sessionToken)}&inline=true`;

        console.log(`[Paperino Native Viewer Stage 2 [API]] Fetching binary stream via ${downloadUrl}...`);
        const streamRes = await fetch(downloadUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          signal: abortController.signal
        });

        if (!streamRes.ok) {
          const errData = await streamRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `HTTP ${streamRes.status}: Document stream failed.`);
        }

        const mime = streamRes.headers.get("Content-Type") || "";
        const size = streamRes.headers.get("Content-Length") || "unknown";
        console.log(`[Paperino Native Viewer Stage 3 [STREAM]] Binary stream received. Content-Type: "${mime}", Size: ${size} bytes.`);

        if (isMounted) {
          setStreamMimeType(mime);
        }

        // Stage 4: Create Blob and Object URL
        console.log(`[Paperino Native Viewer Stage 4 [BLOB]] Constructing Blob from arrayBuffer...`);
        const blob = await streamRes.blob();

        if (isMounted) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
          clearTimeout(hardTimeoutId);
          setLoading(false);
          console.log(`[Paperino Native Viewer Stage 5 [RENDERER]] Object URL created (${createdUrl}). Mounting Paperino Native Renderer...`);
          console.log(`[Paperino Native Viewer Stage 6 [SUCCESS]] Document preview rendered successfully!`);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return; // Handled by 10s timeout
        console.error("[Paperino Native Viewer Stage 5 [FAILURE]]:", err);
        if (isMounted) {
          clearTimeout(hardTimeoutId);
          const errorMsg = err.message || "Failed to load document stream.";
          setError(errorMsg);
          setLoading(false);

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("paperino:permission_error", {
                detail: { message: `Native Paperino Viewer Failure: ${errorMsg}` }
              })
            );
          }
        }
      }
    };

    fetchPaperinoNativeStream();

    return () => {
      isMounted = false;
      clearTimeout(hardTimeoutId);
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [mat.id, mat.fileId, extension, title, isOfficeFormat]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    setDownloading(true);
    triggerSecureDownload(mat, showToast, dismissToast, (l) => setDownloading(l));
  };

  const isImageMime = streamMimeType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(extension);
  const isPdfMime = streamMimeType.includes("pdf") || extension === "pdf" || (!extension && title.toLowerCase().includes("pdf"));

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
          {isImageMime ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={blobUrl}
              alt={title}
              className="w-full h-full object-contain mx-auto block p-4 select-none"
            />
          ) : isPdfMime ? (
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
