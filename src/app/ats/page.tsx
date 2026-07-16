"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Activity, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2, Sparkles, AlertCircle, Info, Bot } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AICreditsDisplay from "@/components/AICreditsDisplay";

export default function ATSAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string>("Frontend Developer");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeIssue, setActiveIssue] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // ATS Config State
  const [atsEnabled, setAtsEnabled] = useState<boolean | null>(null);
  const [maintenanceTitle, setMaintenanceTitle] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Cache for extracted text to prevent re-uploading the same PDF
  const extractedTextCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFileUrl(null);
    }
  }, [file]);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  // Fetch Global Config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "platform_config", "features"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data.atsEnabled !== undefined) setAtsEnabled(data.atsEnabled);
          if (data.maintenanceTitle) setMaintenanceTitle(data.maintenanceTitle);
          if (data.maintenanceMessage) setMaintenanceMessage(data.maintenanceMessage);
        } else {
          setAtsEnabled(true);
        }
      } catch (err) {
        console.error("Failed to load ATS config:", err);
        setAtsEnabled(true); // Fallback to enabled if DB fails
      }
    };
    fetchConfig();
  }, []);

  const loadingSteps = [
    "Uploading & Extracting Text...",
    "Calculating ATS Score...",
    "Matching Keywords...",
    "Analyzing Skills...",
    "Generating Suggestions...",
    "Finalizing Results...",
  ];

  const roles = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Analyst",
    "AI/ML Engineer",
    "Java Developer",
    "Python Developer"
  ];

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile: File | undefined) => {
    setError("");
    if (!selectedFile) return;

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File exceeds the 5 MB limit. Please compress your resume.");
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setActiveIssue(null);
  };

  const analyzeResume = async () => {
    if (!file) {
      setError("Please upload a resume first.");
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setError("");

    try {
      // Get Firebase ID token
      const firebaseUser = auth.currentUser;
      const idToken = firebaseUser ? await getIdToken(firebaseUser) : null;
      if (!idToken) {
        throw new Error("Please log in to use the ATS Analyzer.");
      }

      let textToAnalyze = "";
      const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;

      // STEP 1: EXTRACT (or use cache)
      if (extractedTextCache.current.has(cacheKey)) {
        textToAnalyze = extractedTextCache.current.get(cacheKey)!;
        setLoadingStep(1); // Jump straight to analyzing
      } else {
        const formData = new FormData();
        formData.append("file", file);

        const extractRes = await fetch("/api/ats", {
          method: "POST",
          headers: { "Authorization": `Bearer ${idToken}` }, // No content-type, let browser set boundary
          body: formData,
        });

        const rawExtractText = await extractRes.text();
        let extractData;
        try {
          extractData = JSON.parse(rawExtractText);
        } catch (e) {
          throw new Error(`Server Error (${extractRes.status}): Vercel function timed out or crashed. Please try a simpler PDF. Original error: ${rawExtractText.substring(0, 60)}...`);
        }

        if (!extractRes.ok) {
          throw new Error(extractData.error || "Failed to extract text from resume.");
        }
        
        textToAnalyze = extractData.text;
        extractedTextCache.current.set(cacheKey, textToAnalyze);
        setLoadingStep(1); // Move to analyze step
      }

      // STEP 2: ANALYZE WITH UNIFIED REQUEST
      setLoadingStep(1); // Generating Unified Analysis
      const res = await fetch("/api/ats", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: textToAnalyze, role }),
      });

      const rawText = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch(e) {
        throw new Error(`Server returned invalid JSON: ${rawText.substring(0, 50)}`);
      }

      if (!res.ok) {
        throw new Error(parsed.error || "Failed to analyze resume. Please try again.");
      }

      setLoadingStep(2); // Finalizing Results
      setResult(parsed);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setLoading(false);
      setLoadingStep(0);
    }
  };

  if (atsEnabled === null) {
    return (
      <div className="min-h-screen pt-24 bg-[#030108] text-white flex justify-center items-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin relative z-10"></div>
      </div>
    );
  }

  if (atsEnabled === false) {
    return (
      <div className="min-h-screen pt-24 pb-20 bg-[#030108] text-white selection:bg-fuchsia-500/30 overflow-hidden relative flex flex-col items-center justify-center">
        {/* Background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-600/15 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/15 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        <div className="backdrop-blur-2xl bg-white/[0.01] max-w-2xl w-full mx-auto p-12 rounded-3xl border border-amber-500/20 shadow-[0_0_60px_rgba(245,158,11,0.05)] text-center relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="w-24 h-24 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-8 border border-amber-500/20 shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]">
             <Bot className="text-amber-400 w-12 h-12" />
          </div>
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-6 tracking-tight">
            {maintenanceTitle || "🚧 ATS Analyzer Building in Progress"}
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-xl mx-auto mb-10">
            {maintenanceMessage || "We are currently improving our ATS Engine to provide more accurate recruiter insights, keyword matching, and resume recommendations. Please check back later."}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium">
             <Activity size={16} className="animate-pulse" /> Maintenance Mode Active
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreStroke = (score: number) => {
    if (score >= 80) return "stroke-emerald-400";
    if (score >= 60) return "stroke-orange-400";
    return "stroke-red-400";
  };

  const getSeverityColor = (priority: string) => {
    if (priority === "Critical") return "bg-red-500/10 border-red-500/30 text-red-400";
    if (priority === "Important") return "bg-orange-500/10 border-orange-500/30 text-orange-400";
    return "bg-blue-500/10 border-blue-500/30 text-blue-400";
  };

  const getSeverityIcon = (priority: string) => {
    if (priority === "Critical") return <XCircle size={20} className="text-red-400" />;
    if (priority === "Important") return <AlertTriangle size={20} className="text-orange-400" />;
    return <Info size={20} className="text-blue-400" />;
  };

  return (
    <div className="w-full min-h-screen bg-[#030108] text-white py-8 relative overflow-hidden selection:bg-violet-500/30">
      
      {/* --- CINEMATIC AMBIENT BACKGROUND --- */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0"></div>
      
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(109,40,217,0.2)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[120px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(6,182,212,0.15)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[140px] animate-[pulse_10s_ease-in-out_infinite_reverse] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[50%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(168,85,247,0.12)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[100px] translate-x-[-50%] animate-[pulse_12s_ease-in-out_infinite] pointer-events-none z-0"></div>

      {/* Aurora Light Streaks */}
      <div className="absolute top-10 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent blur-[2px] pointer-events-none z-0"></div>
      <div className="absolute top-40 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent blur-[1px] pointer-events-none z-0"></div>

      {/* Floating Particles */}
      <div className="absolute top-24 left-[12%] w-1.5 h-1.5 rounded-full bg-violet-400/40 blur-[1px] animate-ping pointer-events-none z-0"></div>
      <div className="absolute top-80 right-[20%] w-1 h-1 rounded-full bg-fuchsia-400/50 pointer-events-none z-0"></div>
      <div className="absolute bottom-48 left-[35%] w-2 h-2 rounded-full bg-cyan-400/30 blur-[2px] pointer-events-none z-0"></div>

      {/* Neural Web SVG Overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 200 L200 400 L300 250 L400 500 L600 300 L700 600 L850 450" fill="none" stroke="white" strokeWidth="1" />
        <path d="M150 150 L250 350 L350 200 L550 400 L650 250 L800 550" fill="none" stroke="white" strokeWidth="1" />
        <circle cx="100" cy="200" r="3" fill="white" />
        <circle cx="200" cy="400" r="3" fill="white" />
        <circle cx="300" cy="250" r="3" fill="white" />
        <circle cx="400" cy="500" r="3" fill="white" />
        <circle cx="600" cy="300" r="3" fill="white" />
        <circle cx="700" cy="600" r="3" fill="white" />
        <circle cx="850" cy="450" r="3" fill="white" />
      </svg>

      {!result ? (
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 animate-in fade-in slide-in-from-bottom-10 duration-700 relative z-10">
          
          {/* HERO SECTION */}
          <div className="text-center mb-12 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.25)_0%,transparent_60%)] -z-10 pointer-events-none"></div>
            
            {/* Animated AI Energy Rings */}
            <div className="relative inline-flex items-center justify-center p-6 bg-violet-500/10 rounded-full mb-6 border border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.2)] group overflow-hidden">
              <div className="absolute inset-0 border border-t-violet-400 border-r-cyan-400 border-b-fuchsia-400 border-l-transparent rounded-full animate-spin duration-3000 pointer-events-none"></div>
              <Sparkles size={40} className="text-violet-400 relative z-10 animate-pulse" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400 tracking-tight mb-4">
              AI Resume Reviewer
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
              Upload your resume and select a target role. Groq Llama 3.3 70B will deeply analyze your structure, keywords, and impact, providing highly specific suggestions to boost your ATS compatibility.
            </p>
            <div className="inline-block backdrop-blur-md bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-3">
              <AICreditsDisplay tool="ats" />
            </div>
          </div>

          {/* UPLOAD CARD */}
          <div className="backdrop-blur-3xl bg-black/45 border border-violet-500/20 p-8 rounded-3xl relative overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.08)] hover:shadow-[0_0_60px_rgba(139,92,246,0.15)] transition-all duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="mb-8 relative z-10">
              <label className="block text-sm font-semibold text-violet-200 mb-3 tracking-wide uppercase">Target Job Role</label>
              <div className="relative">
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-black/70 border border-violet-500/20 rounded-2xl p-4 text-white outline-none focus:border-violet-500/50 focus:shadow-[0_0_20px_rgba(139,92,246,0.2)] transition-all cursor-pointer appearance-none backdrop-blur-md"
                >
                  {roles.map(r => (
                    <option key={r} value={r} className="bg-gray-955 text-white">{r}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-violet-400">
                  <ArrowRight size={18} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="mb-8 relative z-10">
              <label className="block text-sm font-semibold text-violet-200 mb-3 tracking-wide uppercase">Upload Resume (PDF or DOCX)</label>
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer backdrop-blur-sm ${
                  isDragging ? 'border-violet-400 bg-violet-500/15 shadow-[inset_0_0_30px_rgba(139,92,246,0.15)]' : 
                  file ? 'border-fuchsia-500/40 bg-fuchsia-500/5 shadow-[0_0_30px_rgba(240,70,250,0.08)]' : 'border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  accept=".pdf,.docx" 
                  className="hidden" 
                />
                
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-fuchsia-500/15 flex items-center justify-center text-fuchsia-400 mb-4 shadow-[0_0_20px_rgba(240,70,250,0.25)]">
                      <FileText size={32} />
                    </div>
                    <p className="text-white font-semibold text-lg mb-1">{file.name}</p>
                    <p className="text-gray-400 text-sm">Click or drag to replace document</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center group">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mb-4 group-hover:scale-110 group-hover:text-violet-400 group-hover:bg-violet-500/10 transition-all duration-300">
                      <Upload size={32} />
                    </div>
                    <p className="text-gray-200 font-semibold mb-1">Drag & Drop your resume here</p>
                    <p className="text-gray-500 text-sm">Supports PDF and DOCX (Max 5MB)</p>
                  </div>
                )}
              </div>
              {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertTriangle size={16}/> {error}</p>}
            </div>

            <button 
              onClick={analyzeResume}
              disabled={!file || loading}
              className="w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_45px_rgba(139,92,246,0.65)] relative z-10 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              {loading ? (
                <>
                  <Loader2 className="animate-spin relative z-10" size={20} />
                  <span className="relative z-10 tracking-wide font-semibold">{loadingSteps[loadingStep] || "Processing..."}</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="relative z-10" />
                  <span className="relative z-10 tracking-wide font-semibold">Run AI Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Split-Pane Results View */
        <div ref={resultsRef} className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-10 duration-700 relative z-10 pt-8 pb-12">
          
          {/* Left Pane: Resume Preview */}
          <div className="w-full lg:w-[35%] flex flex-col bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.05)] h-[calc(100vh-6rem)] sticky top-8">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2 text-violet-300">
                <FileText size={18} />
                <span className="font-semibold text-sm">Resume Preview</span>
              </div>
              <button onClick={() => setResult(null)} className="text-xs text-gray-400 hover:text-white px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all font-medium border border-white/5 hover:border-white/10">
                New Analysis
              </button>
            </div>
            
            <div className="w-full flex-grow bg-white/[0.01] relative">
              {file?.type === "application/pdf" && fileUrl ? (
                <iframe 
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                  className="w-full h-full border-0"
                  title="Resume PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8 space-y-4">
                  <FileText size={48} className="text-violet-500/40" />
                  <h3 className="text-xl font-bold text-white">Preview Not Available</h3>
                  <p className="text-sm max-w-sm text-gray-400 leading-relaxed">
                    Live document preview is only supported for PDF files. Your Word document has been successfully analyzed, but cannot be rendered visually here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Premium Dashboard */}
          <div className="w-full lg:w-[65%] flex flex-col gap-6">
            
            {/* HERO SCORE CARD */}
            <div className="backdrop-blur-3xl bg-black/45 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8 border border-violet-500/10 relative overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)]">
              <div className={`absolute -right-20 -bottom-20 w-64 h-64 blur-[100px] rounded-full pointer-events-none ${
                result.overallScore >= 80 ? 'bg-emerald-500/15' : 
                result.overallScore >= 60 ? 'bg-orange-500/15' : 
                'bg-red-500/15'
              }`}></div>
              
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" 
                    strokeWidth="6" 
                    strokeLinecap="round"
                    className={`${getScoreStroke(result.overallScore)} transition-all duration-1000 ease-out`}
                    strokeDasharray={`${(result.overallScore / 100) * 283} 283`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-black ${getScoreColor(result.overallScore)}`}>{result.overallScore}</span>
                  <span className="text-xs text-gray-500 font-bold mt-1">/ 100</span>
                </div>
              </div>

              <div className="text-center md:text-left z-10">
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300 mb-2">Overall ATS Score</h2>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                  <span className="bg-white/5 text-white px-3 py-1 rounded-full text-xs font-semibold border border-white/10">Target: {role}</span>
                  <span className="bg-violet-500/15 text-violet-300 px-3 py-1 rounded-full text-xs font-semibold border border-violet-500/20">Benchmark: {result.industryBenchmark}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {result.overallScore >= 80 ? "Excellent. Your resume is highly competitive and well-optimized for ATS pipelines." : 
                   result.overallScore >= 60 ? "Average. Your resume passes basic screens but needs stronger keywords and impact metrics." : 
                   "Needs Work. Major formatting, keyword, or section issues detected. High risk of automatic rejection."}
                </p>
              </div>
            </div>

            {/* RECRUITER SIMULATION */}
            <div className={`p-6 rounded-3xl border flex flex-col relative overflow-hidden backdrop-blur-2xl ${
              result.recruiterSimulation?.decision === 'YES' ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]' : 
              result.recruiterSimulation?.decision === 'MAYBE' ? 'bg-orange-500/5 border-orange-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]' : 
              'bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-xl ${
                  result.recruiterSimulation?.decision === 'YES' ? 'bg-emerald-500/15 text-emerald-400' : 
                  result.recruiterSimulation?.decision === 'MAYBE' ? 'bg-orange-500/15 text-orange-400' : 
                  'bg-red-500/15 text-red-400'
                }`}>
                  <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Recruiter Simulation</h3>
                  <p className="text-sm text-gray-400">Would a recruiter shortlist this?</p>
                </div>
                <div className="ml-auto">
                  <span className={`text-lg font-extrabold px-4 py-2 rounded-xl border ${
                    result.recruiterSimulation?.decision === 'YES' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                    result.recruiterSimulation?.decision === 'MAYBE' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>{result.recruiterSimulation?.decision || "MAYBE"}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Top Strengths</span>
                  {result.recruiterSimulation?.topStrengths?.map((s: string, i: number) => (
                    <div key={i} className="flex gap-2.5 text-sm text-gray-300 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">Top Concerns</span>
                  {result.recruiterSimulation?.topConcerns?.map((s: string, i: number) => (
                    <div key={i} className="flex gap-2.5 text-sm text-gray-300 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                      <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* DETAILED METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Keyword Match */}
              <div className="backdrop-blur-3xl bg-black/45 p-6 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-fuchsia-400" size={18}/> Keyword Match
                  </h3>
                  <span className={`font-bold ${getScoreColor(result.keywordMatch?.score || 0)}`}>{result.keywordMatch?.score || 0}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full mb-6 overflow-hidden">
                  <div className={`h-full rounded-full ${getScoreColor(result.keywordMatch?.score || 0).replace('text-', 'bg-')}`} style={{width: `${result.keywordMatch?.score || 0}%`}}></div>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 block">Matched ({result.keywordMatch?.matched?.length || 0})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywordMatch?.matched?.map((k: string) => (
                        <span key={k} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-md font-medium">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 block">Missing ({result.keywordMatch?.missing?.length || 0})</span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywordMatch?.missing?.map((k: string) => (
                        <span key={k} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-md font-medium">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills & Sections */}
              <div className="space-y-6">
                
                {/* ATS Compatibility */}
                <div className="backdrop-blur-3xl bg-black/45 p-6 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white text-sm">ATS Compatibility Checks</h3>
                    <span className={`font-bold ${getScoreColor(result.atsCompatibility?.score || 0)}`}>{result.atsCompatibility?.score || 0}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {result.atsCompatibility?.checks && Object.entries(result.atsCompatibility.checks).map(([key, passed]) => (
                      <div key={key} className="flex items-center gap-2 text-xs text-gray-300 capitalize font-medium">
                        {passed ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <XCircle size={14} className="text-red-400 shrink-0" />}
                        <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Granular Scores */}
                <div className="backdrop-blur-3xl bg-black/45 p-6 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
                  <h3 className="font-bold text-white text-sm mb-4">Sub-Scores</h3>
                  <div className="space-y-3.5">
                    {[
                      { label: "Skills Coverage", score: result.skillsAnalysis?.score || 0 },
                      { label: "Projects Quality", score: result.projectsQuality?.score || 0 },
                      { label: "Experience Strength", score: result.experienceAnalysis?.score || 0 },
                      { label: "Achievements & Impact", score: result.achievementsAnalysis?.score || 0 },
                      { label: "Education & Formatting", score: Math.round(((result.educationQuality?.score || 0) + (result.formattingQuality?.score || 0))/2) }
                    ].map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400 font-medium">{s.label}</span>
                          <span className={`${getScoreColor(s.score)} font-bold`}>{s.score}/100</span>
                        </div>
                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getScoreColor(s.score).replace('text-', 'bg-')}`} style={{width: `${s.score}%`}}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* ACTIONABLE IMPROVEMENTS */}
            {result.actionableImprovements?.length > 0 && (
              <div className="backdrop-blur-3xl bg-black/45 p-6 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <CheckCircle2 className="text-violet-400" /> Actionable Improvements
                </h3>
                <div className="space-y-4">
                  {result.actionableImprovements.map((imp: any, i: number) => (
                    <div key={i} className="flex flex-col md:flex-row items-center gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex-1 w-full bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                        <span className="text-[10px] uppercase font-bold text-red-400 mb-1 block">Current Phrase</span>
                        <p className="text-xs text-gray-300 italic">"{imp.current}"</p>
                      </div>
                      <ArrowRight size={20} className="text-gray-600 hidden md:block shrink-0" />
                      <div className="flex-1 w-full bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 mb-1 block">AI Suggested Replacement</span>
                        <p className="text-xs text-emerald-100 font-medium">{imp.replacement}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CRITICAL ISSUES */}
            {result.criticalIssues?.length > 0 && (
              <div className="backdrop-blur-3xl bg-black/45 p-6 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-orange-400" /> Critical Issues
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.criticalIssues.map((issue: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl text-sm text-gray-300 hover:border-orange-500/20 transition-all">
                      <AlertCircle size={16} className="text-orange-400 shrink-0 mt-0.5" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
