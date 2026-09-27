"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Download, Check, Loader2, ZoomIn, ZoomOut, RotateCw, ExternalLink, RefreshCw, Lock, Sparkles, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import Link from "next/link";
import { triggerSecureDownload } from "@/lib/driveUtils";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import * as pdfjs from "pdfjs-dist";
import * as mammoth from "mammoth";

import DOMPurify from "dompurify";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
}

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

type ViewerType = "pdfjs" | "image" | "docx" | "txt" | "unsupported";

export default function DocPreviewViewer({ mat, onDownload, className = "" }: DocPreviewViewerProps) {
  const { showToast, dismissToast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [viewType, setViewType] = useState<ViewerType>("pdfjs");
  const [retryCount, setRetryCount] = useState<number>(0);

  // Content states
  const [docxHtml, setDocxHtml] = useState<string>("");
  const [txtContent, setTxtContent] = useState<string>("");
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);

  // PDF.js rendering states
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const title = mat.fileName || mat.title || "Study Material";
  const extension = title.split(".").pop()?.toLowerCase() || "pdf";

  const fetchDocument = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setDocxHtml("");
    setTxtContent("");
    setImageBlobUrl(null);
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);

    // Re-use fileId directly if we have it and the material is approved to avoid redundant Firestore reads
    let identifierQuery = "";
    if (mat.fileId && (mat as any).status === "approved") {
      identifierQuery = `fileId=${encodeURIComponent(mat.fileId)}`;
    } else {
      const matParam = mat.id ? `matId=${encodeURIComponent(mat.id)}` : "";
      const fileParam = mat.fileId ? `fileId=${encodeURIComponent(mat.fileId)}` : "";
      identifierQuery = [matParam, fileParam].filter(Boolean).join("&");
    }

    let targetUrl = `/api/download?${identifierQuery}&inline=true`;
    if (mat.fileUrl && mat.fileUrl.includes("firebasestorage.googleapis.com")) {
      targetUrl = mat.fileUrl;
    } else if (!identifierQuery && mat.fileUrl && (mat.fileUrl.startsWith("http://") || mat.fileUrl.startsWith("https://"))) {
      targetUrl = mat.fileUrl;
    }

    // ALWAYS send authorization so the backend can accurately verify the user's plan for PDF preview access
    let headers: Record<string, string> = {};
    const userToken = user ? await user.getIdToken() : null;
    if (userToken) {
      headers = { Authorization: `Bearer ${userToken}` };
    }

    // 1. IMAGE PREVIEW
    if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension)) {
      if (isMounted) {
        setViewType("image");
        try {
          const res = await fetch(targetUrl, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setImageBlobUrl(objUrl);
          setLoading(false);
        } catch {
          setError("Unable to load image.");
          setLoading(false);
        }
      }
      return;
    }

    // 2. TXT PREVIEW
    if (extension === "txt") {
      if (isMounted) {
        setViewType("txt");
        try {
          const res = await fetch(targetUrl, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          setTxtContent(text);
          setLoading(false);
        } catch {
          setError("Unable to read text file.");
          setLoading(false);
        }
      }
      return;
    }

    // 3. WORD DOC PREVIEW
    if (["docx", "doc"].includes(extension)) {
      if (isMounted) {
        setViewType("docx");
        try {
          const res = await fetch(targetUrl, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const rawHtml = result.value || "<p class='text-gray-400'>No readable text found in Word document.</p>";
          const cleanHtml = typeof window !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;
          setDocxHtml(cleanHtml);
          setLoading(false);
        } catch {
          setError("Unable to convert Word document formatting.");
          setLoading(false);
        }
      }
      return;
    }

    // 4. PDF PREVIEW VIA PDF.JS
    if (isMounted) {
      setViewType("pdfjs");
      try {
        const res = await fetch(targetUrl, { headers });
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("PDF Preview Restricted. Please upgrade your plan.");
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        const loadingTask = pdfjs.getDocument({
          data,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
          cMapPacked: true,
        });

        const loadedPdf = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setLoading(false);
      } catch (err: any) {
        if (isMounted) {
          console.error("PDF Preview Error:", err);
          setError(err.message || "The preview could not be loaded. Please try again or download the file.");
          setLoading(false);
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [mat, extension, retryCount, user]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || viewType !== "pdfjs") return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch { /* ignore */ }
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = Math.floor(viewport.height);
      canvas.width = Math.floor(viewport.width);
      canvas.style.width = "100%";
      canvas.style.maxWidth = `${Math.floor(viewport.width)}px`;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };

      const renderTask = page.render(renderContext as any);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Error rendering page:", err);
      }
    }
  }, [pdfDoc, currentPage, scale, viewType]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Fullscreen support
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error("Error attempting to enable full-screen mode:", err.message);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    setDownloading(true);
    const success = await triggerSecureDownload(mat, showToast, dismissToast, (l) => setDownloading(l));
    if (success) {
      setDownloaded(true);
      setTimeout(() => {
        setDownloaded(false);
      }, 2500);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col w-full h-full bg-[#050308] overflow-hidden ${className}`}>
      {/* Toolbar for PDF Controls */}
      {!loading && !error && viewType === "pdfjs" && pdfDoc && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d0918] border-b border-white/10 flex-shrink-0 z-10 select-none">
          {/* Pagination Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-xs text-purple-300 font-mono font-semibold flex items-center min-w-[70px] justify-center">
              {currentPage} / {numPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Zoom and Fullscreen Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => setScale(s => Math.min(3.0, s + 0.2))}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setScale(1.2)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer ml-1 mr-2"
              title="Fit to Screen"
            >
              <RotateCw size={14} />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1"></div>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer ml-1"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Loading State Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07050d] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white tracking-wide">Initializing Paperino PDF Reader</p>
            <p className="text-xs text-purple-400 animate-pulse font-mono">Loading document...</p>
          </div>
        </div>
      )}

      {/* Error & Fallback UI */}
      {!loading && (error || viewType === "unsupported") && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#07050d] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.15)] mb-2">
            <FileText size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Unable to preview this PDF</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {error || "The preview could not be loaded. Please try again or download the file."}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setRetryCount(prev => prev + 1)}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs border transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                downloaded
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-white/10 hover:bg-white/20 border-white/10"
              }`}
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin text-white" />
              ) : downloaded ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Download size={14} />
              )}
              <span>{downloading ? "Downloading..." : downloaded ? "Downloaded" : "Download File"}</span>
            </button>
          </div>
        </div>
      )}

      {/* DOCX Renderer */}
      {!loading && !error && viewType === "docx" && docxHtml && (
        <div className="flex-1 w-full overflow-y-auto p-8 custom-scrollbar bg-[#090615]">
          <div className="max-w-3xl mx-auto bg-[#110c22] border border-white/10 p-8 rounded-3xl shadow-2xl text-gray-200 text-sm leading-relaxed space-y-4">
            <div className="text-xs font-bold text-purple-400 border-b border-white/10 pb-3 mb-4 flex items-center justify-between">
              <span>Word Document Reader</span>
              <span className="font-mono text-gray-400">DOCX Preview</span>
            </div>
            <div 
              className="prose prose-invert max-w-none text-gray-200 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-purple-300 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/20 [&_th]:p-2 [&_td]:border [&_td]:border-white/20 [&_td]:p-2"
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          </div>
        </div>
      )}

      {/* TXT Renderer */}
      {!loading && !error && viewType === "txt" && txtContent && (
        <div className="flex-1 w-full overflow-y-auto p-8 custom-scrollbar bg-[#050308]">
          <div className="max-w-4xl mx-auto">
            <pre className="p-6 text-xs sm:text-sm font-mono text-gray-200 bg-[#0e091b] rounded-2xl border border-white/10 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-2xl">
              {txtContent}
            </pre>
          </div>
        </div>
      )}

      {/* Native Image Renderer */}
      {!loading && !error && viewType === "image" && imageBlobUrl && (
        <div className="flex-1 w-full h-full flex items-center justify-center p-6 bg-[#050308]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageBlobUrl}
            alt={title}
            className="max-w-full max-h-full object-contain mx-auto block rounded-2xl shadow-2xl select-none"
          />
        </div>
      )}

      {/* PDF.js Single Page Viewport Canvas Container */}
      {!loading && !error && viewType === "pdfjs" && (
        <div className="flex-1 w-full overflow-y-auto p-6 flex flex-col items-center custom-scrollbar bg-[#050308]">
          <div className="flex flex-col items-center shadow-2xl rounded-2xl bg-[#120d24] border border-white/10 p-3 relative max-w-full transition-all duration-300">
            <div className="relative rounded-lg overflow-hidden bg-white shadow-xl border border-gray-200/20 flex items-center justify-center max-w-full min-h-[400px] min-w-[300px]">
              <canvas
                ref={canvasRef}
                className="block rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
