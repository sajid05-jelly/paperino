"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Download, Check, Loader2, ZoomIn, ZoomOut, RotateCw, ExternalLink, RefreshCw } from "lucide-react";
import { triggerSecureDownload } from "@/lib/driveUtils";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import * as pdfjs from "pdfjs-dist";
import * as mammoth from "mammoth";

import DOMPurify from "dompurify";

// Configure PDF.js Worker — serve from public/ to avoid CSP/bundler issues
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
}

// In-memory cache for fetched document buffers during session to prevent re-fetching on modal toggle
const pdfBufferCache = new Map<string, ArrayBuffer>();

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

interface PageSlot {
  pageNum: number;
  width: number;
  height: number;
}

export default function DocPreviewViewer({ mat, onDownload, className = "" }: DocPreviewViewerProps) {
  const { showToast, dismissToast } = useToast();

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
  const [renderedCount, setRenderedCount] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pageSlots, setPageSlots] = useState<PageSlot[]>([]);

  // Page canvas elements registry & render status tracking
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const renderingPagesRef = useRef<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const title = mat.fileName || mat.title || "Study Material";
  const extension = title.split(".").pop()?.toLowerCase() || "pdf";

  // 1. Fetch document binary and initialize PDF.js Document Proxy
  useEffect(() => {
    let isMounted = true;

    const runPreviewPipeline = async () => {
      setLoading(true);
      setError(null);
      setDocxHtml("");
      setTxtContent("");
      setImageBlobUrl(null);
      setPdfDoc(null);
      setNumPages(0);
      setRenderedCount(0);
      setPageSlots([]);
      renderedPagesRef.current.clear();
      renderingPagesRef.current.clear();

      // Resolve endpoint URL
      const matParam = mat.id ? `matId=${encodeURIComponent(mat.id)}` : "";
      const fileParam = mat.fileId ? `fileId=${encodeURIComponent(mat.fileId)}` : "";
      const identifierQuery = [matParam, fileParam].filter(Boolean).join("&");

      let targetUrl = `/api/download?${identifierQuery}&inline=true`;
      if (!matParam && !fileParam && mat.fileUrl && (mat.fileUrl.startsWith("http://") || mat.fileUrl.startsWith("https://"))) {
        targetUrl = mat.fileUrl;
      }

      const cacheKey = `${mat.id}_${mat.fileId}`;

      // Fetch Firebase ID token if user is signed in to authorize pending material preview
      const userToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers: Record<string, string> = userToken ? { Authorization: `Bearer ${userToken}` } : {};

      // 1. IMAGE PREVIEW
      if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension)) {
        if (isMounted) {
          setViewType("image");
          setImageBlobUrl(targetUrl);
          setLoading(false);
        }
        return;
      }

      // 2. TEXT PREVIEW
      if (["txt", "md", "json", "csv", "log"].includes(extension)) {
        try {
          const res = await fetch(targetUrl, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (isMounted) {
            setViewType("txt");
            setTxtContent(text);
            setLoading(false);
          }
        } catch {
          if (isMounted) {
            setError("Unable to load plain text file content.");
            setLoading(false);
          }
        }
        return;
      }

      // 3. WORD DOC PREVIEW VIA MAMMOTH
      if (["docx", "doc"].includes(extension)) {
        try {
          const res = await fetch(targetUrl, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const rawHtml = result.value || "<p class='text-gray-400'>No readable text found in Word document.</p>";
          const cleanHtml = typeof window !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml;
          if (isMounted) {
            setViewType("docx");
            setDocxHtml(cleanHtml);
            setLoading(false);
          }
        } catch {
          if (isMounted) {
            setError("Unable to convert Word document formatting.");
            setLoading(false);
          }
        }
        return;
      }

      // 4. PROGRESSIVE PDF PREVIEW VIA PDF.JS & INTERSECTION OBSERVER
      setViewType("pdfjs");
      try {
        const loadingTask = pdfjs.getDocument({
          url: targetUrl,
          httpHeaders: headers,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
          cMapPacked: true,
        });

        const loadedPdf: any = await loadingTask.promise;

        if (!isMounted) return;

        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);

        // Instant slot creation using Page 1 dimensions (non-blocking)
        const firstPage = await loadedPdf.getPage(1);
        const firstVp = firstPage.getViewport({ scale: 1.0 });
        const defaultW = Math.floor(firstVp.width);
        const defaultH = Math.floor(firstVp.height);

        const initialSlots: PageSlot[] = Array.from({ length: loadedPdf.numPages }, (_, index) => ({
          pageNum: index + 1,
          width: defaultW,
          height: defaultH,
        }));

        setPageSlots(initialSlots);
        setLoading(false);

        // Async update of specific page dimensions in background without blocking initial display
        (async () => {
          for (let i = 2; i <= loadedPdf.numPages; i++) {
            if (!isMounted) break;
            try {
              const pObj = await loadedPdf.getPage(i);
              const vp = pObj.getViewport({ scale: 1.0 });
              const w = Math.floor(vp.width);
              const h = Math.floor(vp.height);
              if (w !== defaultW || h !== defaultH) {
                setPageSlots(prev => prev.map(s => s.pageNum === i ? { ...s, width: w, height: h } : s));
              }
            } catch { /* keep default */ }
          }
        })();
      } catch (pdfErr: any) {
        console.error("[PDF Engine Error]:", pdfErr);
        if (isMounted) {
          setError(pdfErr.message || "Unable to render PDF preview.");
          setLoading(false);
        }
      }
    };

    runPreviewPipeline();

    return () => {
      isMounted = false;
    };
  }, [mat.id, mat.fileId, mat.fileUrl, extension, title, retryCount]);

  const renderTasksRef = useRef<Map<number, any>>(new Map());

  // 2. Individual Page Render Function called progressively on Viewport Intersection
  const renderSinglePage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || renderedPagesRef.current.has(pageNum) || renderingPagesRef.current.has(pageNum)) {
      return;
    }

    renderingPagesRef.current.add(pageNum);

    try {
      const page = await pdfDoc.getPage(pageNum);
      const displayViewport = page.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;
      const renderScale = Math.max(outputScale, 2.0);
      const viewport = page.getViewport({ scale: scale * renderScale });

      const canvas = document.getElementById(`pdf-canvas-page-${mat.id || mat.fileId || 'item'}-${pageNum}`) as HTMLCanvasElement;
      if (!canvas) {
        renderingPagesRef.current.delete(pageNum);
        return;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        renderingPagesRef.current.delete(pageNum);
        return;
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(displayViewport.width)}px`;
      canvas.style.height = "auto";
      canvas.style.maxWidth = "100%";

      // Cancel previous active render task for this page slot if present
      if (renderTasksRef.current.has(pageNum)) {
        try {
          renderTasksRef.current.get(pageNum).cancel();
        } catch { /* ignore */ }
      }

      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      });

      renderTasksRef.current.set(pageNum, renderTask);

      await renderTask.promise;

      renderTasksRef.current.delete(pageNum);
      renderedPagesRef.current.add(pageNum);
      renderingPagesRef.current.delete(pageNum);
      setRenderedCount(renderedPagesRef.current.size);
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.warn(`Page ${pageNum} render notice:`, err.message);
      }
      renderingPagesRef.current.delete(pageNum);
    }
  }, [pdfDoc, scale, mat.id, mat.fileId]);

  // 3. Render all pages sequentially from 1 to N in background queue
  useEffect(() => {
    if (viewType !== "pdfjs" || !pdfDoc || pageSlots.length === 0) return;

    let isCancelled = false;

    const renderAllPagesQueue = async () => {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        if (isCancelled) break;
        if (!renderedPagesRef.current.has(pageNum)) {
          await renderSinglePage(pageNum);
        }
      }
    };

    renderAllPagesQueue();

    return () => {
      isCancelled = true;
    };
  }, [viewType, pdfDoc, pageSlots.length, renderSinglePage]);

  // Re-render visible pages if Zoom scale changes
  useEffect(() => {
    if (viewType !== "pdfjs" || !pdfDoc) return;
    
    // Cancel any active rendering tasks before re-scaling
    renderTasksRef.current.forEach(task => {
      try { task.cancel(); } catch { /* ignore */ }
    });
    renderTasksRef.current.clear();

    renderedPagesRef.current.clear();
    renderingPagesRef.current.clear();
    setRenderedCount(0);
    // Render Page 1 with new scale
    renderSinglePage(1);

    return () => {
      renderTasksRef.current.forEach(task => {
        try { task.cancel(); } catch { /* ignore */ }
      });
      renderTasksRef.current.clear();
    };
  }, [scale, viewType, pdfDoc, renderSinglePage]);

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
    <div className={`relative flex flex-col w-full h-full bg-[#050308] overflow-hidden ${className}`}>
      {/* Toolbar for PDF Controls */}
      {!loading && !error && viewType === "pdfjs" && pdfDoc && (
        <div className="flex items-center justify-between px-6 py-3 bg-[#0d0918] border-b border-white/10 flex-shrink-0 z-10">
          <div className="text-xs text-gray-300 font-semibold flex items-center gap-2">
            <FileText size={14} className="text-purple-400" />
            <span>
              {renderedCount > 0 
                ? `${renderedCount} of ${numPages} Pages Rendered`
                : `Loading page 1 of ${numPages}...`
              }
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-purple-300 font-mono font-bold">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setScale(1.2)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Reset Zoom"
            >
              <RotateCw size={14} />
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
              The preview could not be loaded. Please try again or download the file.
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
              <span>📄 Word Document Reader</span>
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

      {/* PDF.js Lazy/Progressive Viewport Canvas Container */}
      {!loading && !error && viewType === "pdfjs" && (
        <div 
          ref={containerRef}
          className="flex-1 w-full overflow-y-auto p-6 flex flex-col items-center custom-scrollbar bg-[#050308]"
        >
          {pageSlots.map((slot) => {
            const displayW = Math.floor(slot.width * scale);
            const displayH = Math.floor(slot.height * scale);
            const isPageRendered = renderedPagesRef.current.has(slot.pageNum);

            return (
              <div
                key={slot.pageNum}
                id={`pdf-page-slot-${mat.id || mat.fileId || 'item'}-${slot.pageNum}`}
                data-page-num={slot.pageNum}
                className="flex flex-col items-center mb-8 shadow-2xl rounded-2xl bg-[#120d24] border border-white/10 p-3 relative max-w-full"
                style={{ width: "fit-content" }}
              >
                <div className="w-full text-xs text-purple-300 font-mono text-center mb-2.5 font-semibold select-none">
                  Page {slot.pageNum} of {numPages}
                </div>

                <div 
                  className="relative rounded-lg overflow-hidden bg-white shadow-xl border border-gray-200/20 flex items-center justify-center max-w-full"
                  style={{
                    width: `${displayW}px`,
                    maxWidth: "100%",
                  }}
                >
                  <canvas
                    id={`pdf-canvas-page-${mat.id || mat.fileId || 'item'}-${slot.pageNum}`}
                    className="block rounded-lg"
                    style={{
                      width: "100%",
                      height: "auto",
                      maxWidth: "100%",
                    }}
                  />
                  {!isPageRendered && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#120d24]/90 text-purple-300 space-y-2 select-none">
                      <Loader2 size={24} className="animate-spin text-purple-400" />
                      <span className="text-xs font-mono">Loading Page {slot.pageNum}...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

