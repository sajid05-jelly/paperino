"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Download, Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { triggerSecureDownload } from "@/lib/driveUtils";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import * as pdfjs from "pdfjs-dist";
import * as mammoth from "mammoth";

// Configure local PDF.js Worker bundled with the application
if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
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

type ViewerType = "pdf" | "docx" | "txt" | "image" | "unsupported";

export default function DocPreviewViewer({ mat, onDownload, className = "" }: DocPreviewViewerProps) {
  const { user } = useAuth();
  const { showToast, dismissToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [viewType, setViewType] = useState<ViewerType>("pdf");
  
  // Content states for different renderers
  const [docxHtml, setDocxHtml] = useState<string>("");
  const [txtContent, setTxtContent] = useState<string>("");
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);

  // PDF.js states
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const title = mat.fileName || mat.title || "Study Material";
  const extension = title.split(".").pop()?.toLowerCase() || "";

  useEffect(() => {
    let isMounted = true;
    let loadedPdf: pdfjs.PDFDocumentProxy | null = null;
    let createdObjectUrl: string | null = null;

    const runUniversalPreviewPipeline = async () => {
      console.log(`[Paperino Universal Preview Engine] Detecting file type for: "${title}" (ext: .${extension})...`);
      setLoading(true);
      setError(null);
      setDocxHtml("");
      setTxtContent("");
      setImageBlobUrl(null);

      // Determine appropriate renderer
      let mode: ViewerType = "unsupported";
      if (extension === "pdf") {
        mode = "pdf";
      } else if (["docx", "doc"].includes(extension)) {
        mode = "docx";
      } else if (["txt", "md", "json", "csv", "log"].includes(extension)) {
        mode = "txt";
      } else if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension)) {
        mode = "image";
      }

      if (isMounted) {
        setViewType(mode);
      }

      try {
        let authHeader = "";
        if (user) {
          try {
            const token = await user.getIdToken();
            authHeader = `Bearer ${token}`;
          } catch (e: any) {
            console.warn("[Paperino Universal Preview] Auth token fetch notice:", e.message);
          }
        }

        // Fetch binary stream from backend API proxy
        const matParam = mat.id ? `matId=${encodeURIComponent(mat.id)}` : "";
        const fileParam = mat.fileId ? `fileId=${encodeURIComponent(mat.fileId)}` : "";
        const identifierQuery = [matParam, fileParam].filter(Boolean).join("&");
        const downloadUrl = `/api/download?${identifierQuery}&inline=true`;

        console.log(`[Paperino Universal Preview] Fetching stream from ${downloadUrl}...`);
        const streamRes = await fetch(downloadUrl, {
          method: "GET",
          headers: authHeader ? { Authorization: authHeader } : {}
        });

        if (!streamRes.ok) {
          const errData = await streamRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || `HTTP ${streamRes.status}: Document stream request failed.`);
        }

        const arrayBuffer = await streamRes.arrayBuffer();
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error("Received empty 0-byte document stream from storage service.");
        }

        console.log(`[Paperino Universal Preview] Binary stream received. Size: ${arrayBuffer.byteLength} bytes. Routing to ${mode.toUpperCase()} renderer...`);

        // 1. DOCX / DOC Renderer via Mammoth HTML Engine
        if (mode === "docx") {
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setDocxHtml(result.value || "<p class='text-gray-400'>No readable text content found in Word document.</p>");
              setLoading(false);
            }
          } catch (docxErr: any) {
            throw new Error(`Failed to parse Word document formatting: ${docxErr.message}`);
          }
          return;
        }

        // 2. TXT / Code / Formatted Text Renderer
        if (mode === "txt") {
          const text = new TextDecoder().decode(arrayBuffer);
          if (isMounted) {
            setTxtContent(text);
            setLoading(false);
          }
          return;
        }

        // 3. Native Image Renderer
        if (mode === "image") {
          const mimeType = extension === "png" ? "image/png" : "image/jpeg";
          const imageBlob = new Blob([arrayBuffer], { type: mimeType });
          createdObjectUrl = URL.createObjectURL(imageBlob);
          if (isMounted) {
            setImageBlobUrl(createdObjectUrl);
            setLoading(false);
          }
          return;
        }

        // 4. PDF.js Canvas Renderer
        if (mode === "pdf") {
          const loadingTask = pdfjs.getDocument({
            data: new Uint8Array(arrayBuffer),
            cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/",
            cMapPacked: true
          });

          loadedPdf = await loadingTask.promise;
          if (isMounted) {
            setPdfDoc(loadedPdf);
            setNumPages(loadedPdf.numPages);
            setLoading(false);
          }
          return;
        }

        // 5. Unsupported file format (e.g. PPTX / XLSX without conversion)
        if (isMounted) {
          setLoading(false);
        }

      } catch (err: any) {
        console.error("[Paperino Universal Preview Error]:", err);
        if (isMounted) {
          setError(err.message || "Preview unavailable for this document.");
          setLoading(false);

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("paperino:permission_error", {
                detail: { message: `Paperino Preview Notice: ${err.message}` }
              })
            );
          }
        }
      }
    };

    runUniversalPreviewPipeline();

    return () => {
      isMounted = false;
      if (loadedPdf && typeof loadedPdf.cleanup === "function") {
        loadedPdf.cleanup();
      }
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [user, mat.id, mat.fileId, extension, title]);

  // Render PDF pages onto HTML5 Canvases when pdfDoc or scale changes
  useEffect(() => {
    if (viewType !== "pdf" || !pdfDoc || !canvasContainerRef.current) return;

    let isMounted = true;
    const container = canvasContainerRef.current;
    container.innerHTML = "";

    const renderAllPages = async () => {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        if (!isMounted) break;
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement("div");
          pageWrapper.className = "flex flex-col items-center mb-8 shadow-2xl rounded-2xl bg-[#120d24] border border-white/10 p-3 relative";
          pageWrapper.style.width = "fit-content";
          pageWrapper.style.height = "auto";

          const pageHeader = document.createElement("div");
          pageHeader.className = "w-full text-xs text-gray-400 font-mono text-center mb-2.5 font-semibold select-none";
          pageHeader.innerText = `Page ${pageNum} of ${pdfDoc.numPages}`;

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          const canvasWidth = Math.floor(viewport.width);
          const canvasHeight = Math.floor(viewport.height);

          canvas.width = canvasWidth;
          canvas.height = canvasHeight;

          canvas.style.width = `${canvasWidth}px`;
          canvas.style.height = `${canvasHeight}px`;
          canvas.className = "rounded-lg shadow-xl bg-white block border border-gray-200/20";

          pageWrapper.appendChild(pageHeader);
          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          };

          await page.render(renderContext).promise;
        } catch (renderErr: any) {
          console.warn(`Page ${pageNum} render notice:`, renderErr.message);
        }
      }
    };

    renderAllPages();

    return () => {
      isMounted = false;
    };
  }, [viewType, pdfDoc, numPages, scale]);

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
      {/* Toolbar for PDF documents */}
      {!loading && !error && viewType === "pdf" && pdfDoc && (
        <div className="flex items-center justify-between px-6 py-3 bg-[#0d0918] border-b border-white/10 flex-shrink-0 z-10">
          <div className="text-xs text-gray-400 font-semibold flex items-center gap-2">
            <FileText size={14} className="text-purple-400" />
            <span>{numPages} Pages Loaded</span>
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

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07050d] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white tracking-wide">Initializing Paperino Preview Engine</p>
            <p className="text-xs text-purple-400 animate-pulse font-mono">Parsing document stream ({extension.toUpperCase()})...</p>
          </div>
        </div>
      )}

      {/* Clean Paperino Fallback / Error State */}
      {!loading && (error || viewType === "unsupported") && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#07050d] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.15)] mb-2">
            <FileText size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Preview unavailable for this document</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              You can download the original file ({extension.toUpperCase()}) directly to view it on your device.
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 mt-2"
          >
            {downloading ? <Loader2 size={16} className="animate-spin text-white" /> : <Download size={16} />}
            <span>Download Document</span>
          </button>
        </div>
      )}

      {/* DOCX HTML Renderer */}
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

      {/* TXT / Code Renderer */}
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

      {/* PDF.js Page Canvases Container */}
      {!loading && !error && viewType === "pdf" && (
        <div 
          ref={canvasContainerRef} 
          className="flex-1 w-full overflow-y-auto p-6 flex flex-col items-center custom-scrollbar bg-[#050308]"
        />
      )}
    </div>
  );
}
