"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Activity, AlertTriangle, Loader2, Sparkles, BrainCircuit, Target, Repeat, Flame, X, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import AICreditsDisplay from "@/components/AICreditsDisplay";

export default function PYQPredictorPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [subject, setSubject] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [ocrActive, setOcrActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesChange(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesChange = (selectedFiles: File[]) => {
    setError("");
    const validFiles = selectedFiles.filter(f => f.type === "application/pdf");
    
    if (validFiles.length === 0) {
      setError("Please upload PDF files only.");
      return;
    }
    
    if (files.length + validFiles.length > 5) {
      setError("You can only upload a maximum of 5 PDFs at once.");
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const performClientOCR = async (pdfFiles: File[]) => {
    setOcrActive(true);
    let fullText = "";
    
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      const Tesseract = (await import('tesseract.js')).default;
      
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context!, viewport: viewport } as any).promise;
          
          const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
          fullText += `\n\n--- EXAM PAPER ${i + 1} (${file.name}) PAGE ${pageNum} ---\n\n` + text;
        }
      }
    } catch (e: any) {
      console.error("OCR Failed:", e);
      throw new Error("Failed to run OCR on image PDF.");
    } finally {
      setOcrActive(false);
    }
    return fullText;
  };

  const analyzePYQs = async (ocrTextFallback?: string) => {
    if (files.length === 0) {
      setError("Please upload at least one PYQ PDF.");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter the subject name.");
      return;
    }

    if (!ocrTextFallback) {
      setLoading(true);
      setError("");
      setOcrActive(false);
    }

    const formData = new FormData();
    if (ocrTextFallback) {
      formData.append("extractedText", ocrTextFallback);
    } else {
      files.forEach(f => formData.append("files", f));
    }
    formData.append("subject", subject);

    try {
      const firebaseUser = auth.currentUser;
      const idToken = firebaseUser ? await getIdToken(firebaseUser) : null;
      if (!idToken) {
        setError("Please log in to use the PYQ Predictor.");
        setLoading(false);
        return;
      }

      const url = "/api/pyq";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 401) {
        throw new Error("Please log in to use the PYQ Predictor.");
      }
      if (response.status === 429) {
        throw new Error(data.error || "Daily AI limit reached. Come back tomorrow!");
      }
      if (!response.ok) {
        if (data.errorType === "NEEDS_OCR" && !ocrTextFallback) {
          const extracted = await performClientOCR(files);
          if (extracted.trim().length > 10) {
            return await analyzePYQs(extracted);
          } else {
            throw new Error("OCR could not extract readable text from these images.");
          }
        }
        throw new Error(data.error || "Failed to analyze PYQs.");
      }

      setResult(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setOcrActive(false);
    }
  };

  const getHeatmapColor = (score: number) => {
    if (score >= 80) return "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]";
    if (score >= 60) return "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]";
    if (score >= 40) return "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]";
    return "bg-cyan-500 shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]";
  };

  const getHeatmapTextColor = (score: number) => {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-orange-400";
    if (score >= 40) return "text-yellow-400";
    return "text-cyan-400";
  };

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-[#030014]">
      {/* ── Layered Radial Gradient Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(109,40,217,0.35),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_50%,rgba(168,85,247,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_80%,rgba(15,23,42,0.8),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_100%,rgba(109,40,217,0.2),transparent_60%)]" />
      </div>

      {/* ── Floating Glassmorphism Blobs ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-600/10 blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-purple-500/10 blur-[100px] animate-pulse [animation-delay:2s]" />
        <div className="absolute bottom-20 left-1/4 w-72 h-72 rounded-full bg-indigo-600/10 blur-[100px] animate-pulse [animation-delay:4s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-900/5 blur-[150px]" />
      </div>

      {/* ── Aurora Lights ── */}
      <div className="fixed top-0 left-0 right-0 h-[500px] pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-1/2 h-64 bg-gradient-to-b from-violet-500/8 via-purple-500/5 to-transparent blur-[80px] animate-pulse [animation-duration:6s]" />
        <div className="absolute top-10 left-1/3 w-1/3 h-48 bg-gradient-to-b from-fuchsia-500/6 via-indigo-500/4 to-transparent blur-[60px] animate-pulse [animation-delay:3s] [animation-duration:8s]" />
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10">
        {!result ? (
          <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-10 duration-700">
            
            {/* ── Hero Section ── */}
            <div className="text-center mb-14">
              {/* Pulsing AI Orb */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-violet-500/30 blur-[30px] animate-pulse" />
                  <div className="absolute -inset-3 rounded-full bg-violet-600/15 blur-[20px] animate-pulse [animation-delay:1s]" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/30 via-purple-600/20 to-fuchsia-500/30 backdrop-blur-xl border border-violet-400/20 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                    <BrainCircuit size={36} className="text-violet-300" />
                  </div>
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent mb-5 leading-tight tracking-tight">
                🧠 AI Powered Exam Intelligence
              </h1>
              <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
                Predict important units, repeated questions, and high-probability exam topics using previous year papers.
              </p>

              {/* Credits in Glowing Glass Pill */}
              <div className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white/[0.04] backdrop-blur-xl border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                <AICreditsDisplay tool="pyq" />
              </div>
            </div>

            {/* ── Upload Card — Premium AI Research Console ── */}
            <div className={`relative rounded-3xl overflow-hidden transition-all duration-500 ${loading ? 'shadow-[0_0_40px_rgba(139,92,246,0.25)] border-violet-400/40' : ''}`}>
              {/* Kolam-inspired SVG Decoration */}
              <svg className="absolute top-4 right-4 w-32 h-32 opacity-[0.04] pointer-events-none z-0" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60 10L73 35L98 35L78 52L85 78L60 63L35 78L42 52L22 35L47 35Z" stroke="white" strokeWidth="0.5" fill="none" />
                <path d="M60 20L70 40L90 40L74 52L80 72L60 60L40 72L46 52L30 40L50 40Z" stroke="white" strokeWidth="0.5" fill="none" />
                <circle cx="60" cy="60" r="45" stroke="white" strokeWidth="0.3" fill="none" />
                <circle cx="60" cy="60" r="35" stroke="white" strokeWidth="0.3" fill="none" />
                <path d="M60 15L60 105M15 60L105 60" stroke="white" strokeWidth="0.2" />
                <path d="M25 25L95 95M95 25L25 95" stroke="white" strokeWidth="0.2" />
                <circle cx="60" cy="15" r="3" stroke="white" strokeWidth="0.3" fill="none" />
                <circle cx="60" cy="105" r="3" stroke="white" strokeWidth="0.3" fill="none" />
                <circle cx="15" cy="60" r="3" stroke="white" strokeWidth="0.3" fill="none" />
                <circle cx="105" cy="60" r="3" stroke="white" strokeWidth="0.3" fill="none" />
              </svg>

              {/* Card Background */}
              <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-purple-500/[0.04]" />
              
              {/* Animated Glow Blob Inside Card */}
              <div className="absolute -top-20 -left-20 w-72 h-72 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-purple-600/8 blur-[80px] rounded-full pointer-events-none" />

              {/* Card Border */}
              <div className="absolute inset-0 rounded-3xl border border-violet-500/20 pointer-events-none" />
              {loading && <div className="absolute inset-0 rounded-3xl border border-violet-400/40 animate-pulse pointer-events-none" />}

              <div className="relative z-10 p-8 md:p-10">
                {/* Console Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400/30" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-violet-400/60 font-medium ml-2">AI Research Console</span>
                </div>

                {/* Subject Input */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-violet-200/80 mb-3 flex items-center gap-2">
                    <Zap size={14} className="text-violet-400" />
                    Subject Name
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Data Structures, Computer Networks"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-black/40 border border-violet-500/15 rounded-2xl p-4 text-white outline-none focus:border-violet-400/50 focus:shadow-[0_0_25px_rgba(139,92,246,0.15)] transition-all duration-300 backdrop-blur-md placeholder:text-gray-600 hover:border-violet-500/25"
                  />
                </div>

                {/* Upload Zone */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-violet-200/80 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Upload size={14} className="text-violet-400" />
                      Upload PYQs (Max 5 PDFs)
                    </span>
                    <span className="text-xs text-gray-500 bg-white/[0.03] px-2.5 py-1 rounded-full">{files.length}/5 files selected</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-6 md:p-10 text-center transition-all duration-300 cursor-pointer backdrop-blur-sm ${
                      isDragging ? 'border-violet-400/50 bg-violet-500/10 shadow-[inset_0_0_40px_rgba(139,92,246,0.08)]' : 
                      'border-white/[0.08] hover:border-violet-400/30 hover:bg-violet-500/[0.04]'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => {
                        if (e.target.files) handleFilesChange(Array.from(e.target.files));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      accept=".pdf" 
                      multiple
                      className="hidden" 
                    />
                    
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-violet-300 mb-4 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                        <Upload size={28} />
                      </div>
                      <p className="text-gray-200 font-medium mb-1">Drag & Drop your PDFs here</p>
                      <p className="text-gray-500 text-sm">Or click to browse files</p>
                    </div>
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/[0.025] border border-violet-500/10 p-3.5 rounded-xl backdrop-blur-md hover:bg-white/[0.04] transition-all duration-200 group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                              <FileText size={16} className="text-violet-400" />
                            </div>
                            <span className="text-sm text-gray-300 truncate max-w-[200px] sm:max-w-xs">{f.name}</span>
                          </div>
                          <button 
                            onClick={() => removeFile(idx)}
                            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 flex items-center gap-2.5 text-red-400 text-sm bg-red-500/[0.06] border border-red-500/15 rounded-xl px-4 py-3">
                      <AlertTriangle size={16} className="shrink-0" /> {error}
                    </div>
                  )}
                </div>

                {/* Analyze Button */}
                <button 
                  onClick={() => analyzePYQs()}
                  disabled={files.length === 0 || !subject || loading}
                  className="w-full group relative disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(139,92,246,0.45)] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin relative z-10" size={20} />
                      <span className="relative z-10">
                        {ocrActive ? "Extracting text using OCR..." : "AI is cross-referencing papers..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="relative z-10" />
                      <span className="relative z-10">Predict Exam Questions</span>
                    </>
                  )}
                </button>

                {/* Loading state details */}
                {loading && (
                  <div className="mt-6 flex items-center justify-center gap-3 text-violet-300/60 text-xs">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0.15s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0.3s]" />
                    </div>
                    <span>{ocrActive ? "Running optical character recognition on each page..." : "Deep analysis in progress — scanning patterns across papers..."}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════ Results View — Mission Control Dashboard ═══════════════ */
          <div ref={resultsRef} className="w-full max-w-6xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-10 duration-700 pt-8 pb-16">
            
            {/* ── Dashboard Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-5">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-[10px]" />
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 backdrop-blur-xl border border-violet-400/20 flex items-center justify-center">
                      <BrainCircuit size={20} className="text-violet-300" />
                    </div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-violet-100 to-purple-200 bg-clip-text text-transparent">
                    Exam Prediction Analysis
                  </h2>
                </div>
                <p className="text-gray-400 mt-2 ml-[52px]">
                  Subject: <strong className="text-violet-300">{subject}</strong> • Scanned <strong className="text-white">{files.length}</strong> PYQ Papers
                </p>
              </div>
              <button 
                onClick={() => { setResult(null); setFiles([]); setSubject(""); }}
                className="text-gray-400 hover:text-white transition-all duration-200 flex items-center justify-center gap-2 text-sm bg-white/[0.04] backdrop-blur-md px-6 py-3 rounded-full hover:bg-violet-500/10 border border-white/[0.06] hover:border-violet-500/20 hover:shadow-[0_0_15px_rgba(139,92,246,0.1)]"
              >
                <Zap size={14} />
                Analyze New Subject
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* ── Left Column: Heatmap & Topics ── */}
              <div className="lg:col-span-1 space-y-8">
                
                {/* Unit Heatmap */}
                <div className="relative group rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]">
                  <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />
                  <div className="absolute inset-0 rounded-3xl border border-white/[0.06] group-hover:border-violet-500/15 transition-colors duration-300" />
                  <div className="relative z-10 p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Flame size={16} className="text-orange-400" />
                      </div>
                      <span>Unit Weightage Heatmap</span>
                    </h3>
                    <div className="space-y-5">
                      {result.unitWeightage?.sort((a:any,b:any) => b.score - a.score).map((unit: any, i: number) => (
                        <div key={i}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-sm font-medium text-gray-300">{unit.unit}</span>
                            <span className={`text-sm font-bold ${getHeatmapTextColor(unit.score)}`}>
                              {unit.score}%
                            </span>
                          </div>
                          <div className="w-full bg-white/[0.04] h-2.5 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${getHeatmapColor(unit.score)}`} 
                              style={{ width: `${unit.score}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Important Topics */}
                <div className="relative group rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]">
                  <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />
                  <div className="absolute inset-0 rounded-3xl border border-white/[0.06] group-hover:border-violet-500/15 transition-colors duration-300" />
                  <div className="relative z-10 p-6">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Target size={16} className="text-violet-400" />
                      </div>
                      <span>Critical Topics</span>
                    </h3>
                    <div className="space-y-3">
                      {result.importantTopics?.map((topic: any, i: number) => (
                        <div key={i} className="p-4 bg-violet-500/[0.05] border border-violet-500/15 rounded-xl hover:bg-violet-500/[0.08] hover:border-violet-400/25 transition-all duration-200">
                          <h4 className="font-bold text-violet-300 mb-1.5 text-sm">{topic.topic}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">{topic.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Right Column: Questions ── */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Most Important Questions */}
                <div className="relative group rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]">
                  <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />
                  <div className="absolute inset-0 rounded-3xl border border-white/[0.06] group-hover:border-rose-500/15 transition-colors duration-300" />
                  <div className="relative z-10 p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
                      <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <Repeat size={18} className="text-rose-400" />
                      </div>
                      <span>Most Important Questions</span>
                    </h3>
                    <div className="space-y-4">
                      {result.importantQuestions?.sort((a:any,b:any) => b.score - a.score).map((q: any, i: number) => (
                        <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-rose-500/25 hover:bg-rose-500/[0.03] transition-all duration-200 group/item">
                          <div className="flex justify-between items-start gap-4 mb-3">
                            <p className="text-gray-200 font-medium leading-relaxed group-hover/item:text-white transition-colors">{q.questionText}</p>
                            <span className="shrink-0 bg-rose-500/15 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/20 whitespace-nowrap shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                              Score: {q.score}/100
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-rose-400/70 bg-rose-500/[0.04] px-3 py-2 rounded-lg w-fit">
                            <Activity size={14} /> {q.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* High Probability Expected */}
                <div className="relative group rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]">
                  <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />
                  <div className="absolute inset-0 rounded-3xl border border-white/[0.06] group-hover:border-emerald-500/15 transition-colors duration-300" />
                  <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/8 blur-[60px] rounded-full pointer-events-none" />
                  <div className="relative z-10 p-8">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                        <Sparkles size={18} className="text-emerald-400" />
                      </div>
                      <span>Predicted for Next Exam</span>
                    </h3>
                    <div className="space-y-4">
                      {result.predictedQuestions?.sort((a:any,b:any) => b.score - a.score).map((q: any, i: number) => (
                        <div key={i} className="flex gap-4 p-5 bg-emerald-500/[0.04] border border-emerald-500/15 rounded-2xl hover:bg-emerald-500/[0.07] hover:border-emerald-400/25 transition-all duration-200 items-start">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 shadow-[0_0_12px_rgba(16,185,129,0.2)] border border-emerald-500/20">
                            <span className="text-sm font-bold">{i+1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start gap-4 mb-2">
                              <p className="text-gray-200 font-medium leading-relaxed">{q.questionText}</p>
                              <span className="shrink-0 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/15 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                                Score: {q.score}
                              </span>
                            </div>
                            <p className="text-emerald-300/60 text-xs">{q.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
