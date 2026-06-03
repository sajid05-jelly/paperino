"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Activity, AlertTriangle, Loader2, Sparkles, BrainCircuit, Target, Repeat, Flame, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";

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

  const analyzePYQs = async (isOcrRetry = false) => {
    if (files.length === 0) {
      setError("Please upload at least one PYQ PDF.");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter the subject name.");
      return;
    }

    if (!isOcrRetry) {
      setLoading(true);
      setError("");
      setOcrActive(false);
    }

    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    formData.append("subject", subject);

    try {
      // Get Firebase ID token
      const firebaseUser = auth.currentUser;
      const idToken = firebaseUser ? await getIdToken(firebaseUser) : null;
      if (!idToken) {
        setError("Please log in to use the PYQ Predictor.");
        setLoading(false);
        return;
      }

      const url = isOcrRetry ? "/api/pyq?ocr=true" : "/api/pyq";
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
        if (data.errorType === "NEEDS_OCR" && !isOcrRetry) {
          setOcrActive(true);
          await analyzePYQs(true);
          return;
        }
        throw new Error(data.error || "Failed to analyze PYQs.");
      }

      setResult(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setOcrActive(false);
      setLoading(false);
    }
  };

  const getHeatmapColor = (score: number) => {
    if (score >= 80) return "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"; // Extremely Hot
    if (score >= 60) return "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"; // Hot
    if (score >= 40) return "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"; // Warm
    return "bg-cyan-500 shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]"; // Cool
  };

  const getHeatmapTextColor = (score: number) => {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-orange-400";
    if (score >= 40) return "text-yellow-400";
    return "text-cyan-400";
  };

  return (
    <div className="w-full min-h-screen bg-[#030105] py-8">
      {!result ? (
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-fuchsia-500/20 rounded-full mb-6 shadow-[0_0_30px_rgba(var(--secondary-rgb),0.3)]">
              <BrainCircuit size={40} className="text-fuchsia-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">PYQ AI Predictor</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Upload up to 5 Previous Year Question (PYQ) papers. Gemini AI will cross-reference them to predict the most important units, repeated questions, and expected concepts for your upcoming exam.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(var(--secondary-rgb),0.05)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="mb-8 relative z-10">
              <label className="block text-sm font-medium text-fuchsia-200 mb-3">Subject Name</label>
              <input 
                type="text"
                placeholder="e.g. Data Structures, Computer Networks"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-black/60 border border-fuchsia-500/20 rounded-2xl p-4 text-white outline-none focus:border-fuchsia-500 focus:shadow-[0_0_20px_rgba(var(--secondary-rgb),0.2)] transition-all backdrop-blur-md"
              />
            </div>

            <div className="mb-8 relative z-10">
              <label className="block text-sm font-medium text-fuchsia-200 mb-3 flex items-center justify-between">
                <span>Upload PYQs (Max 5 PDFs)</span>
                <span className="text-xs text-gray-500">{files.length}/5 files selected</span>
              </label>
              <div 
                className={`border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all cursor-pointer backdrop-blur-sm ${
                  isDragging ? 'border-fuchsia-400 bg-fuchsia-500/10 shadow-[inset_0_0_30px_rgba(var(--secondary-rgb),0.1)]' : 
                  'border-white/10 hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5'
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
                    if (fileInputRef.current) fileInputRef.current.value = ''; // reset
                  }}
                  accept=".pdf" 
                  multiple
                  className="hidden" 
                />
                
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mb-4 transition-transform group-hover:scale-110">
                    <Upload size={32} />
                  </div>
                  <p className="text-gray-300 font-medium mb-1">Drag & Drop your PDFs here</p>
                  <p className="text-gray-500 text-sm">Or click to browse files</p>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-xl backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-fuchsia-400" />
                        <span className="text-sm text-gray-300 truncate max-w-[200px] sm:max-w-xs">{f.name}</span>
                      </div>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertTriangle size={16}/> {error}</p>}
            </div>

            <button 
              onClick={() => analyzePYQs()}
              disabled={files.length === 0 || !subject || loading}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(var(--secondary-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--secondary-rgb),0.5)] relative z-10 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              {loading ? (
                <>
                  <Loader2 className="animate-spin relative z-10" size={20} />
                  <span className="relative z-10">
                    {ocrActive ? "Using OCR for scanned PDF..." : "AI is cross-referencing your PYQs..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="relative z-10" />
                  <span className="relative z-10">Predict Exam Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Results View */
        <div ref={resultsRef} className="w-full max-w-6xl mx-auto px-6 animate-in fade-in slide-in-from-bottom-10 duration-700 pt-8 pb-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <BrainCircuit className="text-fuchsia-400" /> Exam Prediction Analysis
              </h2>
              <p className="text-gray-400 mt-2">Subject: <strong className="text-white">{subject}</strong> • Scanned <strong className="text-white">{files.length}</strong> PYQ Papers</p>
            </div>
            <button 
              onClick={() => { setResult(null); setFiles([]); setSubject(""); }}
              className="text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm bg-white/5 px-6 py-3 rounded-full hover:bg-white/10"
            >
              Analyze New Subject
            </button>
          </div>

          {/* Smart Insight Panel */}
          <div className="glass-panel p-6 rounded-3xl mb-8 border-l-4 border-l-fuchsia-500 shadow-[0_0_20px_rgba(var(--secondary-rgb),0.15)] bg-fuchsia-500/5 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-fuchsia-500/20 blur-3xl rounded-full"></div>
            <div className="relative z-10 flex gap-4 items-start">
              <div className="mt-1 p-2 bg-fuchsia-500/20 rounded-xl">
                <Sparkles size={24} className="text-fuchsia-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">AI Final Verdict</h3>
                <p className="text-fuchsia-200/90 leading-relaxed">{result.summaryInsight}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Heatmap & Topics */}
            <div className="lg:col-span-1 space-y-8">
              
              {/* Unit Heatmap */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                  <Flame className="text-orange-400" /> Unit Probability Heatmap
                </h3>
                <div className="space-y-5">
                  {result.unitImportance?.sort((a:any,b:any) => b.probabilityScore - a.probabilityScore).map((unit: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-300">{unit.unit}</span>
                        <span className={`text-sm font-bold ${getHeatmapTextColor(unit.probabilityScore)}`}>
                          {unit.probabilityScore}%
                        </span>
                      </div>
                      <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${getHeatmapColor(unit.probabilityScore)}`} 
                          style={{ width: `${unit.probabilityScore}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Topics */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                  <Target className="text-cyan-400" /> Critical Topics
                </h3>
                <div className="space-y-4">
                  {result.importantTopics?.map((topic: any, i: number) => (
                    <div key={i} className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/10 transition-colors">
                      <h4 className="font-bold text-cyan-300 mb-1">{topic.topic}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">{topic.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Questions */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Repeated Questions */}
              <div className="glass-panel p-8 rounded-3xl border border-white/5">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                  <Repeat className="text-rose-400" /> Most Repeated Questions
                </h3>
                <div className="space-y-4">
                  {result.repeatedQuestions?.map((q: any, i: number) => (
                    <div key={i} className="p-5 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-rose-500/30 transition-all group">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <p className="text-gray-200 font-medium leading-relaxed group-hover:text-white transition-colors">{q.questionText}</p>
                        <span className="shrink-0 bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/30 whitespace-nowrap">
                          {q.frequencyCount} Times
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-rose-400/80 bg-rose-500/5 px-3 py-2 rounded-lg w-fit">
                        <Activity size={14} /> {q.insight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* High Probability Expected */}
              <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full"></div>
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4 relative z-10">
                  <Sparkles className="text-emerald-400" /> Expected in Next Exam
                </h3>
                <div className="space-y-3 relative z-10">
                  {result.highProbabilityQuestions?.map((q: string, i: number) => (
                    <div key={i} className="flex gap-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl items-start">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        <span className="text-xs font-bold">{i+1}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed text-sm md:text-base">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
