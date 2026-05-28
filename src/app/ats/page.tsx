"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Activity, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2, Sparkles, AlertCircle, Info } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadingSteps = [
    "Uploading Document...",
    "Extracting Resume Content...",
    "Running ATS Analysis...",
    "Generating Feedback...",
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
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", role);

    try {
      const response = await fetch("/api/ats", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze resume.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
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

  const getSeverityColor = (severity: string) => {
    if (severity === "critical") return "bg-red-500/10 border-red-500/30 text-red-400";
    if (severity === "warning") return "bg-orange-500/10 border-orange-500/30 text-orange-400";
    return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === "critical") return <XCircle size={20} className="text-red-400" />;
    if (severity === "warning") return <AlertTriangle size={20} className="text-orange-400" />;
    return <CheckCircle2 size={20} className="text-emerald-400" />;
  };

  // Removed broken extracted text rendering in favor of native iframe

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
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Upload your resume and select a target role. Gemini AI will deeply analyze your structure, keywords, and impact, providing highly specific suggestions to boost your ATS compatibility.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(var(--primary-rgb),0.05)] relative overflow-hidden">
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
                    <p className="text-gray-500 text-sm">Supports PDF and DOCX</p>
                  </div>
                )}
              </div>
              {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-2"><AlertTriangle size={16}/> {error}</p>}
            </div>

            <button 
              onClick={analyzeResume}
              disabled={!file || loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)] relative z-10 overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              {loading ? (
                <>
                  <Loader2 className="animate-spin relative z-10" size={20} />
                  <span className="relative z-10">{loadingSteps[loadingStep]}</span>
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
            
            {/* Top Summary Card */}
            <div className={`p-6 rounded-3xl border backdrop-blur-md shadow-lg ${
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
            
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overall Score */}
              <div className="glass-panel p-6 rounded-3xl flex items-center justify-between col-span-1 md:col-span-2 border-l-4 border-l-violet-500 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-violet-500/20 blur-3xl rounded-full"></div>
                <div>
                  <h2 className="text-white text-2xl font-bold mb-1">ATS Match Score</h2>
                  <p className="text-violet-300/70 text-sm">Target Role: <strong className="text-white">{role}</strong></p>
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

              {/* Keyword Match */}
              <div className="glass-panel p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-5 -top-5 w-24 h-24 bg-cyan-500/10 blur-2xl rounded-full"></div>
                <h3 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" />
                  Keyword Match
                </h3>
                <div className="text-4xl font-black text-cyan-400 mb-2">{result.keywordMatchPercentage}%</div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full" style={{ width: `${result.keywordMatchPercentage}%` }}></div>
                </div>
              </div>
            </div>

            {/* Section Scores */}
            <div className="glass-panel p-6 rounded-3xl grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Skills", score: result.sectionScores?.skills || 0 },
                { label: "Projects", score: result.sectionScores?.projects || 0 },
                { label: "Experience", score: result.sectionScores?.experience || 0 },
                { label: "Education", score: result.sectionScores?.education || 0 },
                { label: "Contact Info", score: result.sectionScores?.contact || 0 }
              ].map((sec, i) => (
                <div key={i} className="flex flex-col items-center p-3 bg-white/[0.02] rounded-2xl border border-white/5 text-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wider mb-2">{sec.label}</span>
                  <div className={`text-lg font-bold ${getScoreColor(sec.score)}`}>{sec.score}/100</div>
                  <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${sec.score >= 80 ? 'bg-emerald-500' : sec.score >= 60 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${sec.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Missing Skills Warning */}
            {result.missingSkills?.length > 0 && (
              <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 backdrop-blur-md">
                <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                  <AlertCircle size={20} /> Missing Critical Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.missingSkills.map((skill: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-red-500/20 text-red-200 rounded-lg text-sm border border-red-500/30">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Granular AI Issues List */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4 pl-2 flex items-center gap-2">
                <Activity className="text-violet-400" /> Granular Feedback
              </h2>
              
              {result.issues?.length > 0 ? result.issues.map((issue: any, index: number) => {
                const isExpanded = activeIssue === index;
                
                return (
                  <div 
                    key={index}
                    onClick={() => setActiveIssue(isExpanded ? null : index)}
                    className={`p-5 rounded-2xl border backdrop-blur-md transition-all cursor-pointer group hover:-translate-y-1 ${getSeverityColor(issue.severity)} ${isExpanded ? 'shadow-lg shadow-black/50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getSeverityIcon(issue.severity)}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80 px-2 py-0.5 rounded bg-black/20">
                              {issue.section}
                            </span>
                            <span className="text-xs uppercase tracking-wider opacity-60">
                              {issue.type.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="font-semibold text-white group-hover:opacity-90">{issue.message}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Before/After Suggestions */}
                    {isExpanded && issue.currentText && issue.suggestedText && (
                      <div className="mt-6 pt-4 border-t border-current/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                          <span className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2 block">Current Text</span>
                          <p className="text-red-200/80 text-sm leading-relaxed italic">"{issue.currentText}"</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Sparkles size={12}/> AI Suggestion
                          </span>
                          <p className="text-emerald-100/90 text-sm leading-relaxed">"{issue.suggestedText}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }) : (
                <div className="glass-panel p-8 rounded-3xl text-center border border-emerald-500/30">
                  <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Flawless Resume!</h3>
                  <p className="text-emerald-200/70">Our AI couldn't find any major issues. Your resume is perfectly optimized for ATS systems.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
