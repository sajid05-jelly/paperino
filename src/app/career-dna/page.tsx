"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/components/Toast";
import {
  GraduationCap, Briefcase, Award, Code, CheckCircle, AlertTriangle, HelpCircle,
  TrendingUp, RefreshCw, Layers, Sparkles, Send, Upload, Trash2, ArrowRight,
  Shield, Bell, BrainCircuit, Globe, Edit2, CheckSquare, Square, User, X
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
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    college: "",
    department: "",
    currentYear: 1,
    graduationYear: new Date().getFullYear() + 3,
    dreamRole: "",
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
    portfolio: "",
    resumeText: "",
  });

  const [langInput, setLangInput] = useState("");
  const [frameworkInput, setFrameworkInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [projectInput, setProjectInput] = useState("");

  const [uploadingResume, setUploadingResume] = useState(false);

  const sanitizeStr = (val: any) => {
    if (val === null || val === undefined) return "";
    const s = String(val).trim();
    return s.toLowerCase() === "null" ? "" : s;
  };

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
            fullName: sanitizeStr(data.profile.fullName),
            college: sanitizeStr(data.profile.college),
            department: sanitizeStr(data.profile.department),
            currentYear: Number(data.profile.currentYear) || 1,
            graduationYear: Number(data.profile.graduationYear) || (new Date().getFullYear() + 3),
            dreamRole: sanitizeStr(data.profile.dreamRole),
            goal: data.profile.goal || "internship",
            preferredLocation: sanitizeStr(data.profile.preferredLocation),
            cgpa: Number(data.profile.cgpa) || 8.0,
            tenthPercentage: Number(data.profile.tenthPercentage) || 90,
            twelfthPercentage: Number(data.profile.twelfthPercentage) || 90,
            activeBacklogs: Number(data.profile.activeBacklogs) || 0,
            languages: data.profile.languages || [],
            frameworks: data.profile.frameworks || [],
            tools: data.profile.tools || [],
            certifications: data.profile.certifications || [],
            projects: data.profile.projects || [],
            github: sanitizeStr(data.profile.github),
            linkedin: sanitizeStr(data.profile.linkedin),
            portfolio: sanitizeStr(data.profile.portfolio),
            resumeText: sanitizeStr(data.profile.resumeText),
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

  // Dynamic Live Update Career Progress calculation
  const progressMetrics = useMemo(() => {
    const checklist = [
      { label: "Resume Uploaded", checked: !!formData.resumeText, value: 20, missingMsg: "Upload a resume for better AI recommendations." },
      { label: "LinkedIn Added", checked: !!formData.linkedin && formData.linkedin.startsWith("http"), value: 15, missingMsg: "Improve your LinkedIn profile." },
      { label: "GitHub Added", checked: !!formData.github && formData.github.startsWith("http"), value: 15, missingMsg: "Upload your GitHub profile." },
      { label: "Portfolio Website Added", checked: !!formData.portfolio && formData.portfolio.startsWith("http"), value: 15, missingMsg: "Build a portfolio website." },
      { label: "Skills Added", checked: (formData.languages.length + formData.frameworks.length + formData.tools.length) > 0, value: 15, missingMsg: "Add programming languages, frameworks, or tools." },
      { label: "Projects Added", checked: formData.projects.length > 0, value: 10, missingMsg: "Complete more technical projects." },
      { label: "Certifications Added", checked: formData.certifications.length > 0, value: 10, missingMsg: "Add professional certifications." },
    ];

    const totalPercentage = checklist.reduce((acc, item) => acc + (item.checked ? item.value : 0), 0);
    const missingItems = checklist.filter(item => !item.checked);
    const estimatedImprovement = missingItems.reduce((acc, item) => acc + item.value, 0);

    return {
      percentage: totalPercentage,
      checklist,
      missingItems,
      estimatedImprovement,
      suggestions: missingItems.map(item => item.missingMsg)
    };
  }, [formData]);

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
      setIsEditing(false);
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

  const filteredOpportunities = analysis?.opportunities?.filter((opp: CareerOpportunity) => {
    if (activeFilter === "All") return true;
    return opp.matchLevel === activeFilter;
  }) || [];

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 relative min-h-screen text-white">
      <AmbientOrbs />

      <header className="w-full mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 border-b border-white/[0.06] pb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-300 flex items-center gap-3">
            Career DNA <span className="text-sm font-semibold tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full uppercase">AI Mentor</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-xl">
            A premium career intelligence dashboard matching your technical profiles and academic goals.
          </p>
        </div>

        {profile && (
          <div className="flex items-center gap-3">
            {!isEditing && (
              <button
                onClick={() => setShowProfileModal(true)}
                className="px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:text-white hover:bg-purple-500/20 transition text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              >
                <User size={12} />
                View DNA Profile
              </button>
            )}
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setActiveStep(1);
              }}
              className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition text-xs font-semibold cursor-pointer flex items-center gap-2"
            >
              <Edit2 size={12} />
              {isEditing ? "View Matches" : "Edit Profile"}
            </button>
            {!isEditing && (
              <button
                onClick={() => triggerAnalysis()}
                disabled={analysing}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/80 hover:bg-purple-600 border border-purple-500/30 text-white transition text-xs font-semibold cursor-pointer"
              >
                <RefreshCw size={12} className={analysing ? "animate-spin" : ""} />
                {analysing ? "Sync AI" : "Sync AI"}
              </button>
            )}
          </div>
        )}
      </header>

      <div className="w-full relative z-10">
        {(!profile || isEditing) ? (
          // ONBOARDING & EDIT PROFILE FORM SCREEN
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
            
            {/* Form Editor column */}
            <div className="lg:col-span-2 bg-[#0c0916]/80 border border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative">
              <div className="flex justify-between items-center mb-8 border-b border-white/[0.05] pb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <GraduationCap className="text-purple-400" />
                    {profile ? "Edit Career DNA Profile" : "Onboard Career DNA"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Fill out your profile details below.</p>
                </div>
                <div className="text-sm font-medium text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  Step {activeStep} of 4
                </div>
              </div>

              <div className="space-y-6">
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
                    <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">💻 Technical Profile & Links</h3>
                    
                    {/* Resume Upload parsing section */}
                    <div className="p-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-white">Upload Resume (Optional)</span>
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

                    {/* GitHub, LinkedIn & Portfolio Profile Links - Displayed upfront */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1.5 font-semibold">GitHub Profile URL</label>
                        <input
                          type="url"
                          value={formData.github}
                          onChange={e => setFormData({ ...formData, github: e.target.value })}
                          placeholder="e.g. https://github.com/username"
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1.5 font-semibold">LinkedIn Profile URL</label>
                        <input
                          type="url"
                          value={formData.linkedin}
                          onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                          placeholder="e.g. https://linkedin.com/in/username"
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1.5 font-semibold">Portfolio URL</label>
                        <input
                          type="url"
                          value={formData.portfolio}
                          onChange={e => setFormData({ ...formData, portfolio: e.target.value })}
                          placeholder="e.g. https://myportfolio.com"
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-white"
                        />
                      </div>
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

                    {/* Certifications Input */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-medium">Certifications</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={certInput}
                          onChange={e => setCertInput(e.target.value)}
                          placeholder="e.g. AWS Certified Solutions Architect"
                          className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (certInput.trim()) {
                              setFormData(prev => ({ ...prev, certifications: Array.from(new Set([...prev.certifications, certInput.trim()])) }));
                              setCertInput("");
                            }
                          }}
                          className="px-3 rounded-xl bg-purple-600 text-white text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {formData.certifications.map((c, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                            {c}
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, certifications: prev.certifications.filter(item => item !== c) }))} className="text-purple-400 hover:text-white font-bold ml-0.5">×</button>
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
                    <button
                      type="button"
                      onClick={() => { if (profile) setIsEditing(false); }}
                      className="px-6 py-2.5 rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white transition text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
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
                      type="button"
                      onClick={handleSubmit}
                      disabled={analysing}
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all text-xs flex items-center gap-2 cursor-pointer"
                    >
                      {analysing && <RefreshCw size={12} className="animate-spin" />}
                      {analysing ? "Analyzing Career DNA..." : "Generate Career DNA Analysis"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Progress Preview (Right panel inside onboarding / edit mode) */}
            <div className="space-y-6">
              <div className="rounded-[2.5rem] border border-white/5 bg-[#0f0a1a]/40 backdrop-blur-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-purple-400" />
                  <h3 className="text-md font-bold text-white">Live Progress Preview</h3>
                </div>
                
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span className="font-semibold">Completeness</span>
                    <span className="font-bold text-purple-400">{progressMetrics.percentage}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300 ease-out"
                      style={{ width: `${progressMetrics.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Estimate */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <span className="block text-[9px] text-purple-300 font-bold uppercase tracking-wider mb-0.5">Estimated Improvement:</span>
                  <span className="text-sm font-extrabold text-white">
                    +{progressMetrics.estimatedImprovement}% after completing missing items
                  </span>
                </div>

                {/* Live Checklist */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
                  <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold">Profile Checklist:</span>
                  {progressMetrics.checklist.map((item, idx) => (
                    <div key={idx} className="flex gap-2 text-xs items-center text-gray-300">
                      {item.checked ? (
                        <CheckSquare size={13} className="text-purple-400 shrink-0" />
                      ) : (
                        <Square size={13} className="text-gray-600 shrink-0" />
                      )}
                      <span className={item.checked ? "text-gray-300 font-medium" : "text-gray-500"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          // MAIN PREMIUM MENTOR DASHBOARD SCREEN
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
            {/* LEFT 2 COLUMNS: Progress Card and opportunities list (No sections here!) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* CAREER PROGRESS SECTION (Placed right at the top of the feed) */}
              <div className="rounded-[2.5rem] border border-white/5 bg-[#0f0a1a]/40 backdrop-blur-xl p-8 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none"></div>
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="text-purple-400" />
                    Career Progress
                  </h3>
                  {analysis?.readinessLevel && (
                    <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold border ${
                      analysis.readinessLevel === "High Ready" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      analysis.readinessLevel === "Medium Ready" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}>
                      {analysis.readinessLevel === "High Ready" ? "🟢 High Ready" :
                       analysis.readinessLevel === "Medium Ready" ? "🟡 Medium Ready" :
                       "🔴 Beginner"}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-300">
                      <span className="font-semibold">Profile Completeness</span>
                      <span className="font-bold text-purple-400 text-sm">{progressMetrics.percentage}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300"
                        style={{ width: `${progressMetrics.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Estimated profile improvement */}
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="block text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-0.5">Estimated Improvement:</span>
                      <p className="text-sm font-extrabold text-white">
                        +{progressMetrics.estimatedImprovement}% after completing missing items
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500 italic">Estimated from profile items</span>
                  </div>

                  {/* Checklist and missing suggestions grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/[0.05]">
                    {/* Checklist */}
                    <div className="space-y-2">
                      <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold">Profile Checklist:</span>
                      <div className="space-y-1.5">
                        {progressMetrics.checklist.map((item, idx) => (
                          <div key={idx} className="flex gap-2 text-xs items-center text-gray-300">
                            {item.checked ? (
                              <CheckSquare size={14} className="text-purple-400 shrink-0" />
                            ) : (
                              <Square size={14} className="text-gray-600 shrink-0" />
                            )}
                            <span className={item.checked ? "text-gray-300 font-semibold" : "text-gray-500"}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggestions recommendations */}
                    <div className="space-y-2">
                      <span className="block text-[10px] text-gray-500 uppercase tracking-widest font-bold">Suggested Actions:</span>
                      <div className="space-y-1.5">
                        {progressMetrics.suggestions.map((s, idx) => (
                          <div key={idx} className="flex gap-2 text-xs items-start text-purple-300">
                            <span className="text-purple-400">•</span>
                            <span>{s}</span>
                          </div>
                        ))}
                        {progressMetrics.suggestions.length === 0 && (
                          <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle size={14} /> Congratulations! Your profile is 100% complete!
                          </div>
                        )}
                      </div>
                    </div>
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
              
              {/* AI Improvement Advisor */}
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
                className="px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold transition animate-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL DNA PROFILE DETAILS MODAL (Pop-up popover drawer) */}
      {showProfileModal && profile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowProfileModal(false)}></div>
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#0c0916] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl z-10 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6 border-b border-white/[0.05] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BrainCircuit className="text-purple-400" />
                  Your Career DNA Profile
                </h2>
                <p className="text-xs text-gray-500">Comprehensive structured summary of your professional assets.</p>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable sections */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              
              {/* SECTION 1: Career Profile */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">1. Personal Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-0.5">Full Name</span>
                    <span className="font-semibold text-white">{profile.fullName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">College / Institute</span>
                    <span className="font-semibold text-white">{profile.college}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">Department / Major</span>
                    <span className="font-semibold text-white">{profile.department}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500 block mb-0.5">Current Year</span>
                      <span className="font-semibold text-white">Year {profile.currentYear}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Graduation Year</span>
                      <span className="font-semibold text-white">{profile.graduationYear}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Career Goals */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">2. Career Goals</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-0.5">Dream Role</span>
                    <span className="font-semibold text-white">{profile.dreamRole}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">Career Goal</span>
                    <span className="font-semibold text-purple-300 uppercase tracking-wider">{profile.goal?.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">Preferred Location</span>
                    <span className="font-semibold text-white">{profile.preferredLocation}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Academic Information */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">3. Academic Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-0.5">Current CGPA</span>
                    <span className="font-semibold text-white">{profile.cgpa.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">10th Score / %</span>
                    <span className="font-semibold text-white">{profile.tenthPercentage}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">12th Score / %</span>
                    <span className="font-semibold text-white">{profile.twelfthPercentage}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">Active Backlogs</span>
                    <span className={`font-semibold ${profile.activeBacklogs > 0 ? "text-rose-400" : "text-emerald-400"}`}>{profile.activeBacklogs}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Technical Profile */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">4. Technical Profile</h3>
                
                <div className="space-y-3 text-xs">
                  {/* Skill Badges */}
                  {profile.languages?.length > 0 && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider w-24 shrink-0">Languages:</span>
                      {profile.languages.map((l, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-300 font-bold">{l}</span>
                      ))}
                    </div>
                  )}

                  {profile.frameworks?.length > 0 && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider w-24 shrink-0">Frameworks:</span>
                      {profile.frameworks.map((f, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-300 font-bold">{f}</span>
                      ))}
                    </div>
                  )}

                  {profile.tools?.length > 0 && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider w-24 shrink-0">Tools & Infra:</span>
                      {profile.tools.map((t, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-300 font-bold">{t}</span>
                      ))}
                    </div>
                  )}

                  {profile.certifications?.length > 0 && (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider w-24 shrink-0">Certificates:</span>
                      {profile.certifications.map((c, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-purple-300 font-bold">{c}</span>
                      ))}
                    </div>
                  )}

                  {profile.projects?.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Key Projects:</span>
                      {profile.projects.map((p, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/10 p-2 rounded-xl text-xs text-white leading-normal">
                          {p}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-white/[0.05]">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">GitHub</span>
                      {profile.github ? (
                        <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline truncate block">GitHub Profile</a>
                      ) : (
                        <span className="text-gray-600 italic block">Not provided</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">LinkedIn</span>
                      {profile.linkedin ? (
                        <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline truncate block">LinkedIn Profile</a>
                      ) : (
                        <span className="text-gray-600 italic block">Not provided</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Portfolio</span>
                      {profile.portfolio ? (
                        <a href={profile.portfolio} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline truncate block">Portfolio Website</a>
                      ) : (
                        <span className="text-gray-600 italic block">Not provided</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Resume</span>
                      {profile.resumeText ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-0.5">✔ Integrated</span>
                      ) : (
                        <span className="text-gray-600 italic block">Missing</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-white/[0.05] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setIsEditing(true);
                  setActiveStep(1);
                }}
                className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition cursor-pointer"
              >
                Edit Profile Settings
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
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
