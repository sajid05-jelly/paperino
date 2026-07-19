"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/components/Toast";
import {
  GraduationCap, Briefcase, Award, Code, CheckCircle, AlertTriangle, HelpCircle,
  TrendingUp, RefreshCw, Layers, Sparkles, Send, Upload, Trash2, ArrowRight,
  Shield, Bell, BrainCircuit
} from "lucide-react";
import dynamic from "next/dynamic";
import { CareerDnaProfile, CareerOpportunity } from "@/types/careerDna";

const AmbientOrbs = dynamic(() => import("@/components/AmbientOrbs"), { ssr: false });

export default function CareerDnaPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<CareerDnaProfile | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [activeFilter, setActiveFilter] = useState<"All" | "High Match" | "Medium Match" | "Stretch Opportunity">("All");
  const [selectedEligibleMat, setSelectedEligibleMat] = useState<CareerOpportunity | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    college: "",
    department: "",
    currentYear: 1,
    graduationYear: new Date().getFullYear() + 3,
    dreamRole: "",
    dreamCompany: "",
    goal: "internship" as const,
    preferredLocation: "",
    cgpa: 8.0,
    tenthPercentage: 90,
    twelfthPercentage: 90,
    activeBacklogs: 0,
    languages: [] as string[],
    frameworks: [] as string[],
    tools: [] as string[],
    certifications: [] as string[],
    projects: [] as string[],
    github: "",
    linkedin: "",
    resumeText: "",
  });

  const [langInput, setLangInput] = useState("");
  const [frameworkInput, setFrameworkInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [projectInput, setProjectInput] = useState("");

  const [uploadingResume, setUploadingResume] = useState(false);

  // Load user profile & saved analysis on mount
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const dnaDoc = await getDoc(doc(db, "career_dna", user.uid));
        if (dnaDoc.exists()) {
          const data = dnaDoc.data();
          setProfile(data.profile as CareerDnaProfile);
          setAnalysis(data.analysis);
          setFormData({
            fullName: data.profile.fullName || "",
            college: data.profile.college || "",
            department: data.profile.department || "",
            currentYear: Number(data.profile.currentYear) || 1,
            graduationYear: Number(data.profile.graduationYear) || (new Date().getFullYear() + 3),
            dreamRole: data.profile.dreamRole || "",
            dreamCompany: data.profile.dreamCompany || "",
            goal: data.profile.goal || "internship",
            preferredLocation: data.profile.preferredLocation || "",
            cgpa: Number(data.profile.cgpa) || 8.0,
            tenthPercentage: Number(data.profile.tenthPercentage) || 90,
            twelfthPercentage: Number(data.profile.twelfthPercentage) || 90,
            activeBacklogs: Number(data.profile.activeBacklogs) || 0,
            languages: data.profile.languages || [],
            frameworks: data.profile.frameworks || [],
            tools: data.profile.tools || [],
            certifications: data.profile.certifications || [],
            projects: data.profile.projects || [],
            github: data.profile.github || "",
            linkedin: data.profile.linkedin || "",
            resumeText: data.profile.resumeText || "",
          });
        }
      } catch (err) {
        console.error("Error loading career dna:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Skill parser from resume text
  const extractSkillsFromText = (text: string) => {
    const lowerText = text.toLowerCase();
    const parsedLangs: string[] = [];
    const parsedFrameworks: string[] = [];
    const parsedTools: string[] = [];

    const KNOWN_LANGS = ["javascript", "typescript", "python", "java", "c\\+\\+", "c#", "ruby", "golang", "rust", "php", "swift", "kotlin", "sql", "html", "css"];
    const KNOWN_FRAMEWORKS = ["react", "angular", "vue", "next\\.js", "nuxt", "svelte", "django", "flask", "spring", "express", "nest", "laravel", "rails", "fastapi"];
    const KNOWN_TOOLS = ["git", "github", "docker", "kubernetes", "aws", "gcp", "azure", "firebase", "vercel", "netlify", "jenkins", "jira", "figma", "postman"];

    KNOWN_LANGS.forEach(l => {
      const regex = new RegExp(`\\b${l}\\b`, "i");
      if (regex.test(lowerText)) parsedLangs.push(l.replace("\\+", "+"));
    });
    KNOWN_FRAMEWORKS.forEach(f => {
      const regex = new RegExp(`\\b${f}\\b`, "i");
      if (regex.test(lowerText)) parsedFrameworks.push(f.replace("\\.", "."));
    });
    KNOWN_TOOLS.forEach(t => {
      const regex = new RegExp(`\\b${t}\\b`, "i");
      if (regex.test(lowerText)) parsedTools.push(t);
    });

    setFormData(prev => ({
      ...prev,
      languages: Array.from(new Set([...prev.languages, ...parsedLangs])),
      frameworks: Array.from(new Set([...prev.frameworks, ...parsedFrameworks])),
      tools: Array.from(new Set([...prev.tools, ...parsedTools])),
    }));
  };

  // Resume Upload & Auto Parse
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && !file.name.toLowerCase().endsWith(".docx")) {
      showToast("Only PDF or DOCX files are allowed", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB", "error");
      return;
    }

    setUploadingResume(true);
    showToast("Parsing resume text using ATS engine...", "info");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication failed");

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/ats", {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` },
        body: fd
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to extract text from resume");
      }

      setFormData(prev => ({ ...prev, resumeText: data.text }));
      extractSkillsFromText(data.text);
      showToast("Resume parsed! Skills and technical profile populated.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to parse resume file", "error");
    } finally {
      setUploadingResume(false);
    }
  };

  // AI analysis fetcher
  const triggerAnalysis = async (profileData = formData) => {
    setAnalysing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Auth failed");

      const res = await fetch("/api/career-dna", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ profile: profileData })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setProfile(profileData as CareerDnaProfile);
      setAnalysis(data);
      showToast("AI Career Analysis updated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "AI Analysis failed", "error");
    } finally {
      setAnalysing(false);
    }
  };

  // Submit Profile Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerAnalysis();
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05030a] text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 bg-[#05030a] text-white relative">
        <AmbientOrbs />
        <div className="liquid-glass p-8 max-w-md rounded-[2.5rem] border border-white/5 bg-[#0f0a1a]/40 backdrop-blur-2xl relative z-10 shadow-2xl">
          <BrainCircuit size={48} className="text-purple-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">AI Career DNA</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Unlock your private career readiness score, customized match ratings, and strategic guidance from Paperino AI Mentor.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all">
            Login / Signup <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  // Filter recommendations
  const filteredOpportunities = analysis?.opportunities?.filter((opp: CareerOpportunity) => {
    if (activeFilter === "All") return true;
    return opp.matchLevel === activeFilter;
  }) || [];

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 relative min-h-screen text-white">
      <AmbientOrbs />

      <header className="w-full mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 border-b border-white/[0.06] pb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-300">
            Career DNA <span className="text-sm font-semibold tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full uppercase ml-3">AI Mentor</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-xl">
            A premium career intelligence dashboard matching your technical profiles and academic goals.
          </p>
        </div>

        {profile && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setProfile(null);
                setActiveStep(1);
              }}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition text-xs font-semibold cursor-pointer"
            >
              Update Profile
            </button>
            <button
              onClick={() => triggerAnalysis()}
              disabled={analysing}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/80 hover:bg-purple-600 border border-purple-500/30 text-white transition text-xs font-semibold cursor-pointer"
            >
              <RefreshCw size={12} className={analysing ? "animate-spin" : ""} />
              {analysing ? "Syncing..." : "Sync AI DNA"}
            </button>
          </div>
        )}
      </header>

      <div className="w-full relative z-10">
        {!profile ? (
          // ONBOARDING FORM SCREEN
          <div className="max-w-2xl mx-auto bg-[#0c0916]/80 border border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative">
            <div className="flex justify-between items-center mb-8 border-b border-white/[0.05] pb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <GraduationCap className="text-purple-400" />
                  Onboard Career DNA
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Let's map out your academic and career details.</p>
              </div>
              <div className="text-sm font-medium text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                Step {activeStep} of 4
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {activeStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">👤 Personal & Basic Details</h3>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Sajid Mohamed"
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">College Name</label>
                    <input
                      type="text"
                      required
                      value={formData.college}
                      onChange={e => setFormData({ ...formData, college: e.target.value })}
                      placeholder="e.g. SRM University"
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">Department</label>
                      <input
                        type="text"
                        required
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g. CSE, ECE"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">Current Year</label>
                      <select
                        value={formData.currentYear}
                        onChange={e => setFormData({ ...formData, currentYear: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      >
                        {[1, 2, 3, 4].map(y => (
                          <option key={y} value={y} className="bg-[#0c0916]">Year {y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">Graduation Year</label>
                      <input
                        type="number"
                        required
                        value={formData.graduationYear}
                        onChange={e => setFormData({ ...formData, graduationYear: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">🎯 Career Goals</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">Dream Role</label>
                      <input
                        type="text"
                        required
                        value={formData.dreamRole}
                        onChange={e => setFormData({ ...formData, dreamRole: e.target.value })}
                        placeholder="e.g. Software Engineer"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">Dream Company</label>
                      <input
                        type="text"
                        required
                        value={formData.dreamCompany}
                        onChange={e => setFormData({ ...formData, dreamCompany: e.target.value })}
                        placeholder="e.g. Microsoft, Google"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">Core Goal</label>
                      <select
                        value={formData.goal}
                        onChange={e => setFormData({ ...formData, goal: e.target.value as any })}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      >
                        <option value="internship" className="bg-[#0c0916]">Internship Opportunities</option>
                        <option value="placement" className="bg-[#0c0916]">Full-time Placement</option>
                        <option value="higher_studies" className="bg-[#0c0916]">Higher Studies / Research</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">Preferred Location</label>
                      <input
                        type="text"
                        required
                        value={formData.preferredLocation}
                        onChange={e => setFormData({ ...formData, preferredLocation: e.target.value })}
                        placeholder="e.g. Bangalore, Remote"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">📚 Academic Profile</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs text-gray-400 font-medium">Current CGPA</label>
                        <Link href="/gpa" target="_blank" className="text-[10px] text-purple-400 hover:underline">Open GPA Calculator</Link>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        required
                        value={formData.cgpa}
                        onChange={e => setFormData({ ...formData, cgpa: Number(e.target.value) })}
                        placeholder="e.g. 8.5"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">Active Backlogs</label>
                      <input
                        type="number"
                        required
                        value={formData.activeBacklogs}
                        onChange={e => setFormData({ ...formData, activeBacklogs: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">10th Class Percentage / Grade</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={formData.tenthPercentage}
                        onChange={e => setFormData({ ...formData, tenthPercentage: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">12th Class Percentage / Grade</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={formData.twelfthPercentage}
                        onChange={e => setFormData({ ...formData, twelfthPercentage: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">💻 Technical Profile & Skills</h3>
                  
                  {/* Resume Upload parsing section */}
                  <div className="p-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-white">Upload Resume (Optional - Auto extracts skills)</span>
                      {uploadingResume && <span className="text-[10px] text-purple-400 animate-pulse">ATS Parsing...</span>}
                    </div>
                    <label className="flex flex-col items-center justify-center h-20 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer">
                      <Upload size={18} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-300">Click to upload PDF or DOCX</span>
                      <input type="file" onChange={handleResumeUpload} className="hidden" accept=".pdf,.docx" disabled={uploadingResume} />
                    </label>
                    {formData.resumeText && (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-2 font-medium">
                        <CheckCircle size={10} /> Resume details successfully integrated!
                      </div>
                    )}
                  </div>

                  {/* Languages Input */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-medium">Programming Languages</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={langInput}
                        onChange={e => setLangInput(e.target.value)}
                        placeholder="e.g. Java, Python"
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (langInput.trim()) {
                            setFormData(prev => ({ ...prev, languages: Array.from(new Set([...prev.languages, langInput.trim()])) }));
                            setLangInput("");
                          }
                        }}
                        className="px-3 rounded-xl bg-purple-600 text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.languages.map((l, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                          {l}
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, languages: prev.languages.filter(item => item !== l) }))} className="text-purple-400 hover:text-white font-bold ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Frameworks Input */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-medium">Frameworks</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={frameworkInput}
                        onChange={e => setFrameworkInput(e.target.value)}
                        placeholder="e.g. React, Next.js"
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (frameworkInput.trim()) {
                            setFormData(prev => ({ ...prev, frameworks: Array.from(new Set([...prev.frameworks, frameworkInput.trim()])) }));
                            setFrameworkInput("");
                          }
                        }}
                        className="px-3 rounded-xl bg-purple-600 text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.frameworks.map((f, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                          {f}
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, frameworks: prev.frameworks.filter(item => item !== f) }))} className="text-purple-400 hover:text-white font-bold ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tools Input */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-medium">Tools</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={toolInput}
                        onChange={e => setToolInput(e.target.value)}
                        placeholder="e.g. Git, Docker"
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (toolInput.trim()) {
                            setFormData(prev => ({ ...prev, tools: Array.from(new Set([...prev.tools, toolInput.trim()])) }));
                            setToolInput("");
                          }
                        }}
                        className="px-3 rounded-xl bg-purple-600 text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.tools.map((t, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                          {t}
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, tools: prev.tools.filter(item => item !== t) }))} className="text-purple-400 hover:text-white font-bold ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Projects Input */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">Key Projects</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={projectInput}
                        onChange={e => setProjectInput(e.target.value)}
                        placeholder="e.g. Ecommerce Platform using MERN Stack"
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (projectInput.trim()) {
                            setFormData(prev => ({ ...prev, projects: Array.from(new Set([...prev.projects, projectInput.trim()])) }));
                            setProjectInput("");
                          }
                        }}
                        className="px-3 rounded-xl bg-purple-600 text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-1">
                      {formData.projects.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2 py-1.5 rounded">
                          <span>{p}</span>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, projects: prev.projects.filter(item => item !== p) }))} className="text-rose-400 hover:text-rose-300 font-bold ml-2">×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GitHub & LinkedIn Profile Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">GitHub Link</label>
                      <input
                        type="url"
                        value={formData.github}
                        onChange={e => setFormData({ ...formData, github: e.target.value })}
                        placeholder="https://github.com/username"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">LinkedIn Link</label>
                      <input
                        type="url"
                        value={formData.linkedin}
                        onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Onboarding Navigation buttons */}
              <div className="flex justify-between border-t border-white/[0.05] pt-6 mt-8">
                {activeStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep(prev => prev - 1)}
                    className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white transition text-xs font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {activeStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep(prev => prev + 1)}
                    className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    Continue <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={analysing}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all text-xs flex items-center gap-2 cursor-pointer"
                  >
                    {analysing && <RefreshCw size={12} className="animate-spin" />}
                    {analysing ? "Analyzing Career DNA..." : "Generate Career DNA Analysis"}
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          // MAIN PREMIUM MENTOR DASHBOARD SCREEN
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
            {/* LEFT 2 COLUMNS: Profile status and matches grid */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Profile Card & Readiness Gauge */}
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0f0a1a]/40 backdrop-blur-xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none"></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-white leading-tight">{profile.fullName}</h3>
                    {analysis?.readinessLevel === "High Ready" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                        🟢 High Ready
                      </span>
                    )}
                    {analysis?.readinessLevel === "Medium Ready" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full font-bold shadow-[0_0_12px_rgba(234,179,8,0.3)]">
                        🟡 Medium Ready
                      </span>
                    )}
                    {analysis?.readinessLevel === "Beginner" && (
                      <span className="inline-flex items-center gap-1 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full font-bold shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                        🔴 Beginner
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm font-light">
                    {profile.department} · {profile.college} · Year {profile.currentYear}
                  </p>
                  <p className="text-xs text-purple-300 font-medium">
                    🎯 Dream: {profile.dreamRole} at {profile.dreamCompany} ({profile.preferredLocation})
                  </p>
                </div>
                <div className="flex gap-4 sm:border-l border-white/10 sm:pl-8 py-2">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-white">{profile.cgpa.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">CGPA</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-white">{profile.activeBacklogs}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">Backlogs</p>
                  </div>
                </div>
              </div>

              {/* Opportunities Feed */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Briefcase className="text-purple-400" />
                    Recommended Opportunities
                  </h3>
                  {/* Filters */}
                  <div className="flex flex-wrap gap-1.5">
                    {["All", "High Match", "Medium Match", "Stretch Opportunity"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f as any)}
                        className={`px-3 py-1.5 rounded-full border text-[10px] font-bold transition cursor-pointer ${
                          activeFilter === f
                            ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/10"
                            : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filteredOpportunities.length === 0 ? (
                    <div className="text-center py-12 bg-white/[0.01] border border-white/5 rounded-2xl text-gray-500 text-sm">
                      No matching opportunities found for the selected filter.
                    </div>
                  ) : (
                    filteredOpportunities.map((opp: CareerOpportunity) => (
                      <div
                        key={opp.id}
                        className="p-6 rounded-[2rem] border border-white/5 bg-[#0f0a1a]/30 hover:bg-[#0f0a1a]/50 transition-colors flex flex-col justify-between gap-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-purple-300 font-bold uppercase tracking-wider">
                                {opp.type}
                              </span>
                              {opp.matchLevel === "High Match" && (
                                <span className="text-[10px] font-bold text-emerald-400">⭐⭐⭐⭐⭐ High Match</span>
                              )}
                              {opp.matchLevel === "Medium Match" && (
                                <span className="text-[10px] font-bold text-yellow-400">⭐⭐⭐⭐ Medium Match</span>
                              )}
                              {opp.matchLevel === "Stretch Opportunity" && (
                                <span className="text-[10px] font-bold text-rose-400">⭐⭐ Stretch Opportunity</span>
                              )}
                            </div>
                            <h4 className="text-lg font-bold text-white">{opp.role}</h4>
                            <p className="text-xs text-gray-400">{opp.company} · {opp.location}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedEligibleMat(opp)}
                              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-[10px] font-semibold cursor-pointer"
                            >
                              Why am I not eligible?
                            </button>
                            <a
                              href={opp.applyLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1.5 rounded-full bg-purple-600/80 hover:bg-purple-600 text-white text-[10px] font-semibold cursor-pointer text-center inline-block"
                            >
                              Apply Now
                            </a>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        {opp.matchReasons && opp.matchReasons.length > 0 && (
                          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3">
                            <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">Match Analysis:</span>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {opp.matchReasons.map((r, idx) => (
                                <span key={idx} className="text-xs text-gray-300 flex items-center gap-1">
                                  <span className="text-emerald-400">✔</span> {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Skills */}
                        {opp.missingSkills && opp.missingSkills.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Missing skills:</span>
                            {opp.missingSkills.map((s, idx) => (
                              <span key={idx} className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: AI Improvement Advisor & Hub integrations */}
            <div className="space-y-6">
              
              {/* AI Improvement Suggestions */}
              <div className="rounded-[2.5rem] border border-white/5 bg-[#0f0a1a]/40 backdrop-blur-xl p-6 space-y-4">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <Sparkles className="text-purple-400" />
                  AI Improvement Advisor
                </h3>
                <div className="space-y-2.5">
                  {analysis?.suggestions?.map((s: string, idx: number) => (
                    <div key={idx} className="flex gap-2.5 text-xs items-start text-gray-300 bg-white/[0.01] border border-white/5 rounded-xl p-3">
                      <TrendingUp size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                  {(!analysis?.suggestions || analysis.suggestions.length === 0) && (
                    <p className="text-xs text-gray-500">No suggestions available.</p>
                  )}
                </div>
              </div>

              {/* Paperino Integration Hub */}
              <div className="rounded-[2.5rem] border border-white/5 bg-[#0f0a1a]/40 backdrop-blur-xl p-6 space-y-4">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <Layers className="text-purple-400" />
                  Paperino Integration Hub
                </h3>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <Link href="/ats" className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 text-gray-300 hover:text-white transition">
                    <span className="flex items-center gap-2">
                      <Code size={14} className="text-purple-400" /> ATS Resume Analyzer
                    </span>
                    <span className="text-[10px] text-gray-500">Scan score</span>
                  </Link>

                  <Link href="/gpa" className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 text-gray-300 hover:text-white transition">
                    <span className="flex items-center gap-2">
                      <GraduationCap size={14} className="text-purple-400" /> GPA / CGPA Calculator
                    </span>
                    <span className="text-[10px] text-gray-500">Grade target</span>
                  </Link>

                  <Link href="/survival-notes" className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 text-gray-300 hover:text-white transition">
                    <span className="flex items-center gap-2">
                      <Layers size={14} className="text-purple-400" /> Senior Insights
                    </span>
                    <span className="text-[10px] text-gray-500">Survival tips</span>
                  </Link>

                  <Link href="/attendance-mafia" className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 text-gray-300 hover:text-white transition">
                    <span className="flex items-center gap-2">
                      <Shield size={14} className="text-purple-400" /> Attendance Shield
                    </span>
                    <span className="text-[10px] text-gray-500">Alert bypass</span>
                  </Link>

                  <Link href="/pulse" className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/5 text-gray-300 hover:text-white transition">
                    <span className="flex items-center gap-2">
                      <Bell size={14} className="text-purple-400" /> Paperino Pulse
                    </span>
                    <span className="text-[10px] text-gray-500">Recruitment</span>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ELIGIBILITY DIALOG MODAL */}
      {selectedEligibleMat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedEligibleMat(null)}></div>
          <div className="relative w-full max-w-md bg-[#0c0916] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl z-10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-yellow-400" />
              Eligibility Analysis
            </h3>
            <p className="text-xs text-gray-400">
              Breakdown of qualifications for **{selectedEligibleMat.role}** at **{selectedEligibleMat.company}**.
            </p>

            <div className="space-y-3">
              {/* Eligibility checklist */}
              <div className="space-y-1.5">
                <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold">Requirement checks:</span>
                {selectedEligibleMat.eligibilityBreakdown?.reasons?.map((r, idx) => (
                  <div key={idx} className="flex gap-2 text-xs text-rose-300 items-start">
                    <span className="text-rose-500">❌</span>
                    <span>{r}</span>
                  </div>
                ))}
                {(!selectedEligibleMat.eligibilityBreakdown?.reasons || selectedEligibleMat.eligibilityBreakdown.reasons.length === 0) && (
                  <div className="flex gap-2 text-xs text-emerald-300 items-center">
                    <span>✔</span> You meet all minimum criteria.
                  </div>
                )}
              </div>

              {/* Suggestions to improve eligibility */}
              {selectedEligibleMat.eligibilityBreakdown?.suggestions && selectedEligibleMat.eligibilityBreakdown.suggestions.length > 0 && (
                <div className="pt-2 border-t border-white/[0.05] space-y-1.5">
                  <span className="block text-[10px] text-purple-400 uppercase tracking-widest font-bold">Action items to qualify:</span>
                  {selectedEligibleMat.eligibilityBreakdown.suggestions.map((s, idx) => (
                    <div key={idx} className="flex gap-2 text-xs text-gray-300 items-start">
                      <span className="text-purple-400">•</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setSelectedEligibleMat(null)}
                className="px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
