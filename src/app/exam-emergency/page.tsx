"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubjects } from "@/context/SubjectsContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { 
  AlertTriangle, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Award, 
  Flame, 
  Zap, 
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Activity,
  ShieldAlert,
  Infinity as InfinityIcon
} from "lucide-react";

export default function ExamEmergencyPage() {
  const { user, isAdmin, isContributor } = useAuth();
  const { departments, subjects, loading: subjectsLoading } = useSubjects();

  // Selected targets
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Usage state
  const [emergencyUsageCount, setEmergencyUsageCount] = useState(0);
  const [emergencyLastResetDate, setEmergencyLastResetDate] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [activeDashboard, setActiveDashboard] = useState(false);
  const [error, setError] = useState("");

  // Limits based on roles
  const dailyLimit = isAdmin ? 1000000 : isContributor ? 5 : 2;

  // Track IST Date
  const getTodayIST = () => {
    const date = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.toISOString().split("T")[0];
  };

  // Sync / Listen to user profile usage fields
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const userRef = doc(db, "users", user.uid);
    
    getDoc(userRef).then(async (snap) => {
      if (!isMounted || !snap.exists()) return;
      const data = snap.data();
      const count = data.emergencyUsageCount || 0;
      const lastReset = data.emergencyLastResetDate || "";
      const todayIST = getTodayIST();

      if (lastReset !== todayIST) {
        // Perform automatic 12:00 AM IST daily reset
        try {
          await updateDoc(userRef, {
            emergencyUsageCount: 0,
            emergencyLastResetDate: todayIST
          });
          if (isMounted) {
            setEmergencyUsageCount(0);
            setEmergencyLastResetDate(todayIST);
          }
        } catch (err) {
          console.error("Error resetting emergency usage:", err);
        }
      } else {
        if (isMounted) {
          setEmergencyUsageCount(count);
          setEmergencyLastResetDate(lastReset);
        }
      }
    }).catch((err) => {
      console.warn("[ExamEmergency] User doc fetch notice:", err);
    });

    return () => { isMounted = false; };
  }, [user]);

  // Handle Activation
  const handleActivateMode = async () => {
    setError("");
    if (!selectedDept || !selectedSem || !selectedSubject) {
      setError("Please select all options to activate Emergency Mode.");
      return;
    }

    if (!isAdmin && emergencyUsageCount >= dailyLimit) {
      if (isContributor) {
        setError("You've reached today's Emergency Mode limit. Try again tomorrow.");
      } else {
        setError("You've used all Emergency Mode activations for today. Come back tomorrow or become a contributor to unlock higher limits.");
      }
      return;
    }

    setIsActivating(true);

    try {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          emergencyUsageCount: emergencyUsageCount + 1,
          emergencyLastResetDate: getTodayIST()
        });
      }
      setActiveDashboard(true);
    } catch (err: any) {
      console.error("Failed to activate emergency mode:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsActivating(false);
    }
  };

  const getRemainingUses = () => {
    if (isAdmin) return "Unlimited";
    return Math.max(0, dailyLimit - emergencyUsageCount);
  };

  // Mock Generation for Emergency Subject Dashboard
  const generateEmergencyContent = (subjectName: string) => {
    return {
      repeatedQuestions: [
        `Explain the core architecture and fundamental principles of ${subjectName} with a detailed system diagram. (Repeated 5 times)`,
        `Compare and contrast the primary mechanisms, advantages, and limitations of state operations in ${subjectName}. (Repeated 4 times)`,
        `Provide a step-by-step mathematical or logical derivation of the optimal efficiency formula inside ${subjectName}. (Repeated 3 times)`,
        `Describe the practical design patterns and real-world optimization strategies used to deploy ${subjectName} pipelines. (Repeated 3 times)`
      ],
      highProbabilityQuestions: [
        { q: `What is the significance of resource management and bottleneck mitigation in ${subjectName}?`, score: 95 },
        { q: `Explain the security vulnerabilities, thread safety, and concurrency controls applicable to ${subjectName}.`, score: 88 },
        { q: `Derive the time and space complexity models of primary modules in ${subjectName}.`, score: 84 }
      ],
      lastMinuteNotes: [
        "Focus on the primary abstraction layers: lower-level operations carry 40% of standard marks.",
        "Always memorize the core lifecycle stages. Drawing structural blocks earns full layout marks.",
        "Remember that latency minimization directly correlates with caching mechanisms in secondary storage.",
        "Key trade-off: processing speed increases linearly with allocated workspace buffer, but storage cost scales quadratically."
      ],
      formulas: [
        { title: "Optimal Throughput", formula: "T_opt = (N * Efficiency) / (Latency_base + Overhead)" },
        { title: "Standard Deviation Bound", formula: "σ_bound = √[ Σ(x_i - μ)² / N_samples ]" },
        { title: "Efficiency Factor", formula: "η = (Resource_active / Resource_total) * 100%" }
      ],
      units: [
        { name: "Unit 1: Fundamentals & Core Architecture", weight: 20 },
        { name: "Unit 2: System Execution & Process Handling", weight: 10 },
        { name: "Unit 3: Advanced Optimization & Bottlenecks", weight: 35 },
        { name: "Unit 4: Security Protocols & Data Pipelines", weight: 25 },
        { name: "Unit 5: Case Studies & Future Paradigms", weight: 10 }
      ],
      revisionPlan: [
        { duration: "30 mins", task: "Review Unit 3 (Advanced Optimization) - Highest weightage area." },
        { duration: "25 mins", task: "Memorize Unit 4 Diagrams & Security Pipelines." },
        { duration: "25 mins", task: "Derive Core Formulas (Optimal Throughput & Efficiency Factor)." },
        { duration: "20 mins", task: "Solve the 4 Most Repeated Exam Questions list." },
        { duration: "20 mins", task: "Skim Unit 1 & Unit 5 quick summary bullet points." }
      ],
      passKit: [
        "Core block diagrams of System Architecture.",
        "Comparison table of primary algorithms/modules.",
        "Optimal Throughput formula derivation sequence.",
        "Typical bottleneck resolution strategies (critical fallback cases)."
      ]
    };
  };

  const currentSubjectObj = allSubjectsFlatList().find(s => s.id === selectedSubject);
  const subjectName = currentSubjectObj ? currentSubjectObj.name : "Selected Subject";
  const emergencyData = generateEmergencyContent(subjectName);

  // Helper to flat list subjects
  function allSubjectsFlatList() {
    const list: any[] = [];
    if (!subjects) return list;
    Object.entries(subjects).forEach(([deptId, semData]) => {
      Object.entries(semData).forEach(([semId, subs]) => {
        subs.forEach(s => {
          list.push(s);
        });
      });
    });
    return list;
  }

  // Semesters list
  const activeDeptObj = departments.find(d => d.id === selectedDept);
  const totalSemesters = activeDeptObj ? activeDeptObj.totalSemesters : 0;
  const semestersArray = Array.from({ length: totalSemesters }, (_, i) => (i + 1).toString());

  // Subjects for chosen sem
  const filteredSubjects = (selectedDept && selectedSem && subjects[selectedDept]?.[selectedSem]) 
    ? subjects[selectedDept][selectedSem].filter(s => s.status === "approved" || s.contributorId === "system")
    : [];

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[rgba(var(--primary-rgb),0.15)] via-[var(--background)] to-[var(--background)] text-white py-8 relative overflow-hidden selection:bg-red-500/20">
      
      {/* ── Background Glow Layers ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[850px] h-[850px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.32)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[750px] h-[750px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.25)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:45px_45px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-16">
        
        {/* Header Back Button */}
        {activeDashboard && (
          <button 
            onClick={() => { setActiveDashboard(false); setError(""); }}
            className="group flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-all bg-white/[0.04] backdrop-blur-md px-4 py-2 rounded-full border border-white/[0.08] mb-8 hover:-translate-x-0.5"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Configuration
          </button>
        )}

        {!activeDashboard ? (
          /* ═══════════════ Activation Configuration View ═══════════════ */
          <div className="max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-500 relative">
            
            {/* Ambient Aurora Light Streak Behind Hero */}
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.28)_0%,transparent_60%)] -z-10 pointer-events-none blur-[70px]" />

            {/* Pulsing AI Alert Orb */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[rgba(var(--primary-rgb),0.3)] blur-[25px] animate-pulse" />
                <div className="absolute -inset-3 rounded-full bg-[rgba(var(--primary-rgb),0.15)] blur-[18px] animate-pulse [animation-delay:1s]" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[rgba(var(--primary-rgb),0.35)] via-[rgba(var(--secondary-rgb),0.2)] to-[rgba(var(--primary-rgb),0.35)] backdrop-blur-xl border border-[rgba(var(--primary-rgb),0.3)] flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.35)] animate-bounce duration-3000">
                  <ShieldAlert size={36} className="text-[rgb(var(--primary-rgb))] drop-shadow-[0_0_12px_rgba(var(--primary-rgb),0.85)] animate-pulse" />
                </div>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400 tracking-tight leading-tight mb-4 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.25)]">
              Exam Emergency Mode
            </h1>
            
            <p className="text-gray-200 text-lg md:text-xl font-medium mb-2">
              Exam tomorrow? Don't panic.
            </p>
            <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Paperino Emergency Mode helps you focus only on what matters most. Cut out the noise and prioritize high-probability topics immediately.
            </p>

            {/* Selector Card */}
            <div className="backdrop-blur-3xl bg-white/[0.04] border border-violet-500/20 hover:border-violet-500/40 transition-all duration-500 rounded-3xl p-8 shadow-[0_0_55px_rgba(var(--primary-rgb),0.15)] max-w-xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[rgba(var(--primary-rgb),0.06)] blur-[80px] rounded-full pointer-events-none" />
              
              {/* Daily usage indicator */}
              <div className="mb-8">
                {isAdmin ? (
                  <div className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold text-xs shadow-md">
                    <InfinityIcon size={14} className="text-violet-400" />
                    Admin: Unlimited Access
                  </div>
                ) : (
                  <div className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full border text-xs font-bold transition-all ${
                    getRemainingUses() === 0 
                      ? "bg-red-500/10 border-red-500/25 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                      : "bg-red-500/5 border-red-500/20 text-red-300/90 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                  }`}>
                    <Zap size={14} className={getRemainingUses() === 0 ? "text-red-400 animate-pulse" : "text-red-400"} />
                    🚨 Emergency Uses Remaining: {getRemainingUses()}/{dailyLimit}
                  </div>
                )}
              </div>

              <div className="space-y-5 text-left relative z-10">
                {/* Department */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Select Department</label>
                  <select 
                    value={selectedDept}
                    onChange={(e) => { setSelectedDept(e.target.value); setSelectedSem(""); setSelectedSubject(""); }}
                    className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3.5 text-white outline-none focus:border-red-500/40 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all cursor-pointer"
                  >
                    <option value="" className="bg-gray-900">Choose Department...</option>
                    {departments.filter(d => d.status === "approved").map(d => (
                      <option key={d.id} value={d.id} className="bg-gray-900">{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Select Semester</label>
                  <select 
                    disabled={!selectedDept}
                    value={selectedSem}
                    onChange={(e) => { setSelectedSem(e.target.value); setSelectedSubject(""); }}
                    className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3.5 text-white outline-none focus:border-red-500/40 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-gray-900">Choose Semester...</option>
                    {semestersArray.map(sem => (
                      <option key={sem} value={sem} className="bg-gray-900">Semester {sem}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Select Subject</label>
                  <select 
                    disabled={!selectedSem}
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3.5 text-white outline-none focus:border-red-500/40 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-gray-900">Choose Subject...</option>
                    {filteredSubjects.map(s => (
                      <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-2.5 text-red-400 text-xs bg-red-500/[0.06] border border-red-500/15 p-4 rounded-xl text-left">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                onClick={handleActivateMode}
                disabled={!selectedSubject || isActivating}
                className="w-full mt-8 group relative disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.35)] hover:shadow-[0_0_45px_rgba(239,68,68,0.5)] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
                <Sparkles size={18} className="relative z-10 animate-pulse" />
                <span className="relative z-10 tracking-wide uppercase text-sm">Activate Emergency Mode</span>
              </button>
            </div>
          </div>
        ) : (
          /* ═══════════════ Emergency Study Dashboard View ═══════════════ */
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-600">
            
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.08] pb-8 mb-10">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                    Emergency Survival Dashboard
                  </h1>
                </div>
                <p className="text-gray-400">
                  Focused study plan for: <strong className="text-red-400">{subjectName}</strong>
                </p>
              </div>

              {/* Status Pill in Dashboard */}
              <div className="shrink-0">
                {isAdmin ? (
                  <div className="px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold text-xs shadow-md flex items-center gap-1.5">
                    <InfinityIcon size={14} className="text-violet-400" />
                    Admin Access
                  </div>
                ) : (
                  <div className="px-4 py-2 rounded-full bg-red-500/5 border border-red-500/20 text-red-300 font-bold text-xs shadow-sm flex items-center gap-1.5">
                    <Zap size={14} className="text-red-400" />
                    🚨 Limits Remaining: {getRemainingUses()}/{dailyLimit}
                  </div>
                )}
              </div>
            </div>

            {/* Grid Layout of Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left Column: Repeated, Probable Questions & Pass Kit */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* 📌 Most Repeated Questions */}
                <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] hover:border-violet-500/20 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.08)] rounded-3xl p-6 md:p-8 transition-all duration-300">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3 border-b border-white/[0.06] pb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 text-red-400 font-bold">📌</span>
                    Most Repeated Questions
                  </h3>
                  <div className="space-y-4">
                    {emergencyData.repeatedQuestions.map((q, i) => (
                      <div key={i} className="p-4 bg-white/[0.015] border border-white/[0.04] rounded-2xl hover:border-red-500/15 transition-all duration-200 flex gap-3.5 items-start">
                        <span className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-gray-200 text-sm leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🎯 High Probability Questions */}
                <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] hover:border-violet-500/20 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.08)] rounded-3xl p-6 md:p-8 transition-all duration-300">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3 border-b border-white/[0.06] pb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 font-bold">🎯</span>
                    High Probability Questions
                  </h3>
                  <div className="space-y-4">
                    {emergencyData.highProbabilityQuestions.map((item, i) => (
                      <div key={i} className="p-5 bg-white/[0.015] border border-white/[0.04] rounded-2xl flex justify-between items-start gap-4 hover:border-orange-500/20 transition-all duration-200">
                        <p className="text-gray-200 text-sm leading-relaxed">{item.q}</p>
                        <span className="shrink-0 bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/20">
                          Probable: {item.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 💀 Pass Kit */}
                <div className="backdrop-blur-xl bg-red-500/[0.02] border border-red-500/15 hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.08)] rounded-3xl p-6 md:p-8 transition-all duration-300">
                  <h3 className="text-xl md:text-2xl font-bold text-red-300 mb-6 flex items-center gap-3 border-b border-red-500/10 pb-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 text-red-400 font-bold">💀</span>
                    Pass Kit (Do NOT Skip)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emergencyData.passKit.map((item, i) => (
                      <div key={i} className="p-4 bg-red-500/[0.03] border border-red-500/10 rounded-2xl flex gap-3 items-start">
                        <CheckCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-300 leading-relaxed font-semibold">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Important Units, Revision, Notes & Formulas */}
              <div className="lg:col-span-1 space-y-8">

                {/* ⚡ Important Units */}
                <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] hover:border-violet-500/20 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.08)] rounded-3xl p-6 transition-all duration-300">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
                    <span className="flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-yellow-500/10 text-yellow-400 font-bold">⚡</span>
                    Important Units
                  </h3>
                  <div className="space-y-4.5">
                    {emergencyData.units.map((unit, i) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1.5 text-xs">
                          <span className="font-medium text-gray-300 truncate max-w-[80%]">{unit.name}</span>
                          <span className="font-bold text-yellow-400">{unit.weight}%</span>
                        </div>
                        <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 shadow-[0_0_8px_rgba(234,179,8,0.3)] transition-all duration-1000"
                            style={{ width: `${unit.weight}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ⏳ 2-Hour Revision Plan */}
                <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] hover:border-violet-500/20 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.08)] rounded-3xl p-6 transition-all duration-300">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
                    <span className="flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold">⏳</span>
                    2-Hour Revision Plan
                  </h3>
                  <div className="relative pl-4 border-l border-white/[0.08] space-y-5">
                    {emergencyData.revisionPlan.map((plan, i) => (
                      <div key={i} className="relative">
                        {/* Timeline node */}
                        <div className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] border border-black" />
                        <div>
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-0.5">{plan.duration}</span>
                          <p className="text-xs text-gray-300 leading-relaxed">{plan.task}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 🧠 Key Formulas & Last Minute Notes */}
                <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] hover:border-violet-500/20 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.08)] rounded-3xl p-6 transition-all duration-300">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5 border-b border-white/[0.06] pb-4">
                    <span className="flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-violet-500/10 text-violet-400 font-bold">🧠</span>
                    Formulas & Key Notes
                  </h3>
                  
                  {/* Formulas List */}
                  <div className="space-y-3.5 mb-6">
                    {emergencyData.formulas.map((item, i) => (
                      <div key={i} className="p-3 bg-white/[0.015] border border-white/[0.04] rounded-xl hover:border-violet-500/25 transition-all">
                        <span className="text-[10px] font-bold text-violet-400 tracking-wide uppercase block mb-1">{item.title}</span>
                        <code className="text-xs text-gray-300 font-mono block break-all bg-black/40 p-2 rounded-lg">{item.formula}</code>
                      </div>
                    ))}
                  </div>

                  {/* Quick Summary Notes */}
                  <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase block">Last Minute Revision Hacks</span>
                    <ul className="space-y-2">
                      {emergencyData.lastMinuteNotes.map((note, i) => (
                        <li key={i} className="flex gap-2 text-xs text-gray-400 leading-relaxed">
                          <span className="text-red-400 font-bold">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
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
