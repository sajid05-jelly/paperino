"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Activity, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2, Sparkles, AlertCircle, Info } from "lucide-react";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
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

      // STEP 2: ANALYZE WITH SEQUENTIAL AI REQUESTS (To avoid Gemini concurrency limits)
      const fetchAction = async (action: string) => {
        const res = await fetch("/api/ats", {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${idToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text: textToAnalyze, role, action }),
        });
        const rawText = await res.text();
        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch(e) {
          throw new Error(`Timeout for ${action}`);
        }
        if (!res.ok) {
          if (res.status === 429) throw new Error(parsed.error || "Rate limit reached");
          throw new Error(parsed.error || `Failed ${action}`);
        }
        return parsed;
      };

      const results: Record<string, any> = {};

      setLoadingStep(1); // Calculating ATS Score
      try { results.score = { status: "fulfilled", value: await fetchAction("score") }; }
      catch (e: any) { results.score = { status: "rejected", reason: e }; }

      setLoadingStep(2); // Matching Keywords
      try { results.keywords = { status: "fulfilled", value: await fetchAction("keywords") }; }
      catch (e: any) { results.keywords = { status: "rejected", reason: e }; }

      setLoadingStep(3); // Analyzing Skills
      try { results.skills = { status: "fulfilled", value: await fetchAction("skills") }; }
      catch (e: any) { results.skills = { status: "rejected", reason: e }; }

      setLoadingStep(4); // Generating Suggestions
      try { results.suggestions = { status: "fulfilled", value: await fetchAction("suggestions") }; }
      catch (e: any) { results.suggestions = { status: "rejected", reason: e }; }

      const scoreRes = results.score;
      const keywordsRes = results.keywords;
      const skillsRes = results.skills;
      const suggestionsRes = results.suggestions;

      setLoadingStep(5); // Finalizing results

      // If all failed, throw an error
      if (scoreRes.status === "rejected" && keywordsRes.status === "rejected" && skillsRes.status === "rejected" && suggestionsRes.status === "rejected") {
         throw new Error(scoreRes.reason?.message || "AI Analysis completely failed due to timeout.");
      }

      // Combine partial results
      let aggregatedIssues = suggestionsRes.status === "fulfilled" ? suggestionsRes.value.issues || [] : [{
        type: "ats_compatibility", severity: "warning", section: "General",
        message: "Suggestions timed out. Vercel aborted the heavy suggestion generation. Other metrics are successfully loaded.",
        currentText: "", suggestedText: ""
      }];

      if (scoreRes.status === "rejected") {
        aggregatedIssues.push({
          type: "ats_compatibility", severity: "critical", section: "Score Calculation",
          message: "Failed to calculate ATS score. " + (scoreRes.reason?.message || ""),
          currentText: "", suggestedText: ""
        });
      }

      if (keywordsRes.status === "rejected") {
        aggregatedIssues.push({
          type: "missing_keyword", severity: "critical", section: "Keywords",
          message: "Keyword analysis timed out or failed. " + (keywordsRes.reason?.message || ""),
          currentText: "", suggestedText: ""
        });
      }

      const data = {
        overallScore: scoreRes.status === "fulfilled" ? scoreRes.value.overallScore || 0 : 0,
        sectionScores: scoreRes.status === "fulfilled" ? scoreRes.value.sectionScores || {} : { skills: 0, projects: 0, experience: 0, education: 0, contact: 0 },
        keywordMatchPercentage: keywordsRes.status === "fulfilled" ? keywordsRes.value.keywordMatchPercentage || 0 : 0,
        missingSkills: skillsRes.status === "fulfilled" ? skillsRes.value.missingSkills || [] : ["Failed to analyze skills due to timeout"],
        isFakeOrCorrupted: skillsRes.status === "fulfilled" ? skillsRes.value.isFakeOrCorrupted || false : false,
        fakeReason: skillsRes.status === "fulfilled" ? skillsRes.value.fakeReason || "" : "",
        issues: aggregatedIssues,
        rawText: textToAnalyze
      };

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="w-full min-h-screen bg-[#05030a] py-8 relative overflow-hidden selection:bg-violet-500/30">
      
      {/* --- CINEMATIC AMBIENT BACKGROUND --- */}
      <div className="absolute top-[-20%] left-[-10%] w-[900px] h-[900px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.18)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[120px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(var(--accent-rgb),0.15)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[140px] animate-[pulse_10s_ease-in-out_infinite_reverse] pointer-events-none z-0"></div>
      <div className="absolute top-[40%] left-[50%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.12)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[100px] translate-x-[-50%] animate-[pulse_12s_ease-in-out_infinite] pointer-events-none z-0"></div>

      {!result ? (
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 animate-in fade-in slide-in-from-bottom-10 duration-700 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-violet-500/20 rounded-full mb-6 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
              <Sparkles size={40} className="text-violet-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">AI Resume Reviewer</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
              Upload your resume and select a target role. Gemini AI will deeply analyze your structure, keywords, and impact, providing highly specific suggestions to boost your ATS compatibility.
            </p>
            <AICreditsDisplay tool="ats" />
          </div>

          <div className="vision-glass p-8 rounded-3xl  relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full"></div>
            
            <div className="mb-8 relative z-10">
              <label className="block text-sm font-medium text-violet-200 mb-3">Target Job Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-black/60 border border-violet-500/20 rounded-2xl p-4 text-white outline-none focus:border-violet-500 focus:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] transition-all cursor-pointer appearance-none backdrop-blur-md"
              >
                {roles.map(r => (
                  <option key={r} value={r} className="bg-gray-900">{r}</option>
                ))}
              </select>
            </div>

            <div className="mb-8 relative z-10">
              <label className="block text-sm font-medium text-violet-200 mb-3">Upload Resume (PDF or DOCX)</label>
              <div 
                className={`border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all cursor-pointer backdrop-blur-sm ${
                  isDragging ? 'border-violet-400 bg-violet-500/10 shadow-[inset_0_0_30px_rgba(var(--primary-rgb),0.1)]' : 
                  file ? 'border-fuchsia-500/50 bg-fuchsia-500/5 shadow-[0_0_20px_rgba(var(--secondary-rgb),0.1)]' : 'border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5'
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
                    <div className="w-16 h-16 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 mb-4 shadow-[0_0_15px_rgba(var(--secondary-rgb),0.3)]">
                      <FileText size={32} />
                    </div>
                    <p className="text-white font-medium text-lg mb-1">{file.name}</p>
                    <p className="text-gray-500 text-sm">Click or drag to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mb-4 transition-transform group-hover:scale-110">
                      <Upload size={32} />
                    </div>
                    <p className="text-gray-300 font-medium mb-1">Drag & Drop your resume here</p>
                    <p className="text-gray-500 text-sm">Supports PDF and DOCX (Max 5MB)</p>
                  </div>
                )}
              </div>
              {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertTriangle size={16}/> {error}</p>}
            </div>

            <button 
              onClick={analyzeResume}
              disabled={!file || loading}
              className="w-full liquid-btn disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)] relative z-10 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              {loading ? (
                <>
                  <Loader2 className="animate-spin relative z-10" size={20} />
                  <span className="relative z-10">{loadingSteps[loadingStep] || "Processing..."}</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="relative z-10" />
                  <span className="relative z-10">Run AI Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Split-Pane Results View */
        <div ref={resultsRef} className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700 relative z-10 pt-8 pb-12">
          
          {/* Left Pane: Resume Preview */}
          <div className="w-full md:w-1/2 flex flex-col bg-[#07050d] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(var(--primary-rgb),0.05)] h-fit sticky top-8">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-2 text-violet-300">
                <FileText size={18} />
                <span className="font-medium text-sm">Resume Preview</span>
              </div>
              <button onClick={() => setResult(null)} className="text-xs text-gray-400 hover:text-white px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors font-medium">
                New Analysis
              </button>
            </div>
            
            <div className="w-full h-[800px] bg-white/[0.02] relative">
              {file?.type === "application/pdf" && fileUrl ? (
                <iframe 
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                  className="w-full h-full border-0 rounded-b-3xl"
                  title="Resume PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8 space-y-4">
                  <FileText size={48} className="text-violet-500/50" />
                  <h3 className="text-xl font-bold text-white">Preview Not Available</h3>
                  <p className="text-sm max-w-sm">
                    Live document preview is only supported for PDF files. Your Word document has been successfully analyzed, but cannot be rendered visually here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: AI Analysis Dashboard */}
          <div className="w-full md:w-1/2 flex flex-col space-y-6">
            
            {/* 1. Final Verdict & Executive Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-6 rounded-3xl border backdrop-blur-md shadow-lg flex flex-col justify-center ${
                result.overallScore >= 80 ? 'bg-emerald-500/10 border-emerald-500/30' : 
                result.overallScore >= 60 ? 'bg-orange-500/10 border-orange-500/30' : 
                'bg-red-500/10 border-red-500/30'
              }`}>
                <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${
                  result.overallScore >= 80 ? 'text-emerald-400' : 
                  result.overallScore >= 60 ? 'text-orange-400' : 
                  'text-red-400'
                }`}>
                  <Activity size={20} /> Final Verdict
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {result.overallScore >= 80 
                    ? "Your resume is highly optimized and compatible with ATS systems. Minor tweaks to layout or specific keywords could make it perfect."
                    : result.overallScore >= 60
                    ? "Your resume is moderately ATS-friendly but needs improvement in formatting and keyword optimization to ensure it passes automated screens consistently."
                    : "Your resume has critical formatting or keyword issues that will likely cause it to be rejected by most ATS systems. Major revisions are strongly recommended."
                  }
                </p>
              </div>

              <div className="glass-panel p-6 rounded-3xl flex items-center justify-between border-l-4 border-l-violet-500 relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-violet-500/20 blur-3xl rounded-full"></div>
                <div>
                  <h2 className="text-white text-2xl font-bold mb-1">ATS Match</h2>
                  <p className="text-violet-300/70 text-sm">Target: <strong className="text-white">{role}</strong></p>
                </div>
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" 
                      strokeWidth="8" 
                      strokeLinecap="round"
                      className={`${getScoreStroke(result.overallScore)} transition-all duration-1000 ease-out`}
                      strokeDasharray={`${(result.overallScore / 100) * 283} 283`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-black ${getScoreColor(result.overallScore)}`}>{result.overallScore}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Recruiter Perspective & Benchmarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-violet-400 font-bold mb-4 flex items-center gap-2">
                  <Activity size={18} /> Recruiter Perspective
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Top Strengths</span>
                    <ul className="space-y-1">
                      {result.executiveSummary?.topStrengths?.map((str: string, i: number) => (
                        <li key={i} className="text-sm text-emerald-300 flex items-start gap-2">
                          <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> {str}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Top Concerns</span>
                    <ul className="space-y-1">
                      {result.executiveSummary?.topWeaknesses?.map((wk: string, i: number) => (
                        <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {wk}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="glass-panel p-5 rounded-3xl">
                  <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">Hiring Readiness</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-white">{result.recruiterPerspective?.hiringReadiness || 0}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-600 to-violet-400 h-full rounded-full" style={{ width: `${result.recruiterPerspective?.hiringReadiness || 0}%` }}></div>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-1">Pass Probability</h3>
                    <div className="text-2xl font-black text-cyan-400">{result.atsPassProbability || 0}%</div>
                  </div>
                  <div className="text-right">
                    <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-1">Industry Benchmark</h3>
                    <div className="text-sm font-bold text-white bg-white/10 px-3 py-1.5 rounded-lg inline-block">
                      {result.industryBenchmark || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Transparent Score Breakdown */}
            <div className="glass-panel p-6 rounded-3xl">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-emerald-400" /> Score Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { id: 0, key: "skills", label: "Skills", score: result.sectionScores?.skills || 0 },
                  { id: 1, key: "projects", label: "Projects", score: result.sectionScores?.projects || 0 },
                  { id: 2, key: "experience", label: "Experience", score: result.sectionScores?.experience || 0 },
                  { id: 3, key: "education", label: "Education", score: result.sectionScores?.education || 0 },
                  { id: 4, key: "contact", label: "Contact Info", score: result.sectionScores?.contact || 0 },
                  { id: 5, key: "formatting", label: "Formatting", score: result.sectionScores?.formatting || 0 }
                ].map((sec) => (
                  <div key={sec.id} className="relative">
                    <div 
                      onClick={() => setActiveSection(activeSection === sec.id ? null : sec.id)}
                      className={`flex flex-col items-center p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                        activeSection === sec.id ? 'bg-white/10 border-white/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{sec.label}</span>
                      <div className={`text-base font-bold ${getScoreColor(sec.score)}`}>{sec.score}/100</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Active Section Explanation */}
              {activeSection !== null && (
                <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5 animate-in slide-in-from-top-2">
                  <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wider">
                    {[
                      { id: 0, key: "skills" },
                      { id: 1, key: "projects" },
                      { id: 2, key: "experience" },
                      { id: 3, key: "education" },
                      { id: 4, key: "contact" },
                      { id: 5, key: "formatting" }
                    ].find(s => s.id === activeSection)?.key} Explanation
                  </h4>
                  <ul className="space-y-1">
                    {result.explanations?.[
                      [
                        { id: 0, key: "skills" },
                        { id: 1, key: "projects" },
                        { id: 2, key: "experience" },
                        { id: 3, key: "education" },
                        { id: 4, key: "contact" },
                        { id: 5, key: "formatting" }
                      ].find(s => s.id === activeSection)?.key || "skills"
                    ]?.map((expl: string, idx: number) => (
                      <li key={idx} className={`text-xs ${expl.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                        {expl}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 4. Categorized Missing Skills */}
            {result.missingSkills && Object.keys(result.missingSkills).some(k => result.missingSkills[k]?.length > 0) && (
              <div className="glass-panel p-6 rounded-3xl">
                <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                  <AlertCircle size={20} /> Missing Critical Skills
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(result.missingSkills).map(([category, skills]: [string, any]) => {
                    if (!skills || skills.length === 0) return null;
                    return (
                      <div key={category} className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">
                          {category}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-red-500/20 text-red-200 rounded text-xs border border-red-500/30">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 5. Top Action Items */}
            {result.topActionItems?.length > 0 && (
              <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-md">
                <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                  <Activity size={20} /> Top Action Items
                </h3>
                <ul className="space-y-3">
                  {result.topActionItems.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-blue-100">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
                        {i + 1}
                      </span>
                      <span className="mt-0.5">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6. Granular AI Issues List (Collapsed) */}
            <div className="space-y-4">
              <details className="group glass-panel rounded-3xl border border-white/10 [&_summary::-webkit-details-marker]:hidden">
                <summary className="p-6 cursor-pointer flex items-center justify-between text-xl font-bold text-white">
                  <span className="flex items-center gap-2"><Activity className="text-violet-400" /> Granular Feedback (Advanced)</span>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                
                <div className="p-6 pt-0 space-y-4">
                  {result.issues?.length > 0 ? result.issues.map((issue: any, index: number) => {
                    const isExpanded = activeIssue === index;
                    
                    return (
                      <div 
                        key={index}
                        onClick={() => setActiveIssue(isExpanded ? null : index)}
                        className={`p-5 rounded-2xl border backdrop-blur-md transition-all cursor-pointer hover:-translate-y-1 ${getSeverityColor(issue.priority)} ${isExpanded ? 'shadow-lg shadow-black/50' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">{getSeverityIcon(issue.priority)}</div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 px-2 py-0.5 rounded bg-black/20">
                                  {issue.section}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 px-2 py-0.5 rounded border border-current/30">
                                  {issue.priority}
                                </span>
                              </div>
                              <h4 className="font-semibold text-white/90 text-sm leading-snug">{issue.message}</h4>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Before/After Suggestions */}
                        {isExpanded && issue.currentText && issue.suggestedText && (
                          <div className="mt-4 pt-4 border-t border-current/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2 block">Current Text</span>
                              <p className="text-red-200/80 text-xs leading-relaxed italic">"{issue.currentText}"</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Sparkles size={10}/> AI Suggestion
                              </span>
                              <p className="text-emerald-100/90 text-xs leading-relaxed">"{issue.suggestedText}"</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }) : (
                    <div className="p-4 text-center border border-emerald-500/30 rounded-2xl bg-emerald-500/10 text-emerald-200">
                      No advanced issues found.
                    </div>
                  )}
                </div>
              </details>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
