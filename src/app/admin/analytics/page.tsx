"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, FileText, BrainCircuit, FileSearch, Sparkles, Activity, Target, Download, AlertCircle, GraduationCap, Bell, Trash2, Loader2, X, CheckCircle2, RefreshCw } from "lucide-react";
import { collection, query, where, getCountFromServer, getDoc, doc, orderBy, limit, getDocs, writeBatch, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Module-level cache for Platform Analytics statistics to prevent repeated getCountFromServer calls on dashboard re-mounts
let cachedStats: any = null;
let cachedMaterialCounts: any = null;
let cachedQuotaExceeded = false;

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    dailyActive: 0,
    totalMaterials: 0,
    atsUsage: 0,
    aiUsage: 0,
    mostVisited: "N/A",
    topDepartment: "N/A",
    highestDownloadedFile: "N/A",
    totalDepts: 0,
    pendingDepts: 0,
    approvedDepts: 0,
    totalSubjects: 0
  });
  const [materialCounts, setMaterialCounts] = useState({
    pyqs: 0,
    notes: 0,
    manuals: 0,
    syllabus: 0,
    questions: 0,
    other: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notification Management
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearingNotifs, setClearingNotifs] = useState(false);
  const [clearResult, setClearResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Dynamic Tagline is now managed in /admin/header-message

  const handleClearAllNotifications = useCallback(async () => {
    setClearingNotifs(true);
    setClearResult(null);
    try {
      const snap = await getDocs(collection(db, "notifications"));
      if (snap.empty) {
        setClearResult({ type: "success", message: "No notifications to clear." });
        setClearingNotifs(false);
        setTimeout(() => { setShowClearModal(false); setClearResult(null); }, 1500);
        return;
      }
      // Firestore batch max 500 per commit
      const batchSize = 500;
      for (let i = 0; i < snap.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      setClearResult({ type: "success", message: `Cleared ${snap.docs.length} notification${snap.docs.length !== 1 ? "s" : ""} successfully.` });
      setTimeout(() => { setShowClearModal(false); setClearResult(null); }, 2000);
    } catch (err) {
      console.error("[Admin] Failed to clear notifications:", err);
      setClearResult({ type: "error", message: "Failed to clear notifications. Please try again." });
    } finally {
      setClearingNotifs(false);
    }
  }, []);

  const fetchStats = useCallback(async (forceRefetch = false) => {
    if (!forceRefetch && cachedStats && cachedMaterialCounts) {
      console.log("[Analytics] Serving dashboard statistics from session cache");
      setStats(cachedStats);
      setMaterialCounts(cachedMaterialCounts);
      setIsQuotaExceeded(cachedQuotaExceeded);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log("[Analytics] Starting statistics database fetch...");
      setError(null);
      const matsColl = collection(db, "materials");
      const usersColl = collection(db, "users");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch using allSettled to prevent one failing collection from bringing down the entire dashboard
      const results = await Promise.allSettled([
        getCountFromServer(matsColl),
        getCountFromServer(usersColl),
        getCountFromServer(query(usersColl, where("lastLogin", ">=", today))),
        getCountFromServer(query(matsColl, where("category", "==", "pyq"))),
        getCountFromServer(query(matsColl, where("category", "==", "notes"))),
        getCountFromServer(query(matsColl, where("category", "==", "questions"))),
        getDoc(doc(db, "platform_stats", "global")),
        getDocs(query(collection(db, "platform_stats", "subjects", "visits"), orderBy("visits", "desc"), limit(1))),
        getDocs(query(collection(db, "platform_stats", "materials", "downloads"), orderBy("downloads", "desc"), limit(1))),
        getCountFromServer(collection(db, "departments")),
        getCountFromServer(query(collection(db, "departments"), where("status", "==", "pending"))),
        getCountFromServer(query(collection(db, "departments"), where("status", "==", "approved"))),
        getCountFromServer(query(collection(db, "dynamic_subjects"), where("status", "==", "approved")))
      ]);

      // Check if any promise rejected due to Quota limits to trigger the fallback catch block
      const quotaError = results.find(
        (r) => r.status === "rejected" && String(r.reason?.message || r.reason).toLowerCase().includes("quota")
      );
      if (quotaError && quotaError.status === "rejected") {
        throw quotaError.reason;
      }

      // Helper to extract data or log error
      const getResult = (res: any, name: string, defaultValue: any) => {
        if (res.status === "fulfilled") {
          console.log(`[Analytics] Successfully fetched ${name}`);
          return res.value;
        } else {
          const isQuota = String(res.reason?.message || res.reason).toLowerCase().includes("quota");
          if (isQuota) {
            console.warn(`[Analytics] Service Notice (Quota): Failed to fetch ${name}`);
          } else {
            console.error(`[Analytics] Error fetching ${name}:`, res.reason);
          }
          return defaultValue;
        }
      };

      const totalMatsSnap = getResult(results[0], "Total Materials", { data: () => ({ count: 0 }) });
      const totalUsersSnap = getResult(results[1], "Total Users", { data: () => ({ count: 0 }) });
      const dailyUsersSnap = getResult(results[2], "Daily Users", { data: () => ({ count: 0 }) });
      const pyqsSnap = getResult(results[3], "PYQs", { data: () => ({ count: 0 }) });
      const notesSnap = getResult(results[4], "Notes", { data: () => ({ count: 0 }) });
      const questionsSnap = getResult(results[5], "Questions", { data: () => ({ count: 0 }) });
      const globalStatsSnap = getResult(results[6], "Global Stats", { exists: () => false, data: () => ({ atsUsage: 0, aiUsage: 0 }) });
      const topSubjectSnap = getResult(results[7], "Top Subject", { empty: true, docs: [] });
      const topDownloadSnap = getResult(results[8], "Top Download", { empty: true, docs: [] });
      const totalDeptsSnap = getResult(results[9], "Total Depts", { data: () => ({ count: 0 }) });
      const pendingDeptsSnap = getResult(results[10], "Pending Depts", { data: () => ({ count: 0 }) });
      const approvedDeptsSnap = getResult(results[11], "Approved Depts", { data: () => ({ count: 0 }) });
      const totalSubjectsSnap = getResult(results[12], "Total Subjects", { data: () => ({ count: 0 }) });

      const totalMaterials = totalMatsSnap.data().count;
      const totalUsers = totalUsersSnap.data().count;
      const dailyActive = dailyUsersSnap.data().count;

      const pyqs = pyqsSnap.data().count;
      const notes = notesSnap.data().count;
      const questions = questionsSnap.data().count;

      const totalDepts = totalDeptsSnap.data().count;
      const pendingDepts = pendingDeptsSnap.data().count;
      const approvedDepts = approvedDeptsSnap.data().count;
      const totalSubjects = totalSubjectsSnap.data().count;

      const manuals = 0; 
      const syllabus = 0;
      const other = Math.max(0, totalMaterials - (pyqs + notes + questions));

      const globalData = globalStatsSnap.exists() ? globalStatsSnap.data() : { atsUsage: 0, aiUsage: 0 };
      const atsUsage = globalData?.atsUsage || 0;
      const aiUsage = globalData?.aiUsage || 0;

      let mostVisited = "N/A";
      if (!topSubjectSnap.empty && topSubjectSnap.docs.length > 0) {
        mostVisited = topSubjectSnap.docs[0].data().name || topSubjectSnap.docs[0].id;
      }

      let highestDownloadedFile = "N/A";
      if (!topDownloadSnap.empty && topDownloadSnap.docs.length > 0) {
        highestDownloadedFile = topDownloadSnap.docs[0].data().name || topDownloadSnap.docs[0].id;
      }

      const newStats = {
        totalMaterials,
        totalUsers,
        dailyActive,
        atsUsage,
        aiUsage,
        mostVisited,
        topDepartment: "Pending Update", 
        highestDownloadedFile,
        totalDepts,
        pendingDepts,
        approvedDepts,
        totalSubjects
      };

      const newCounts = { pyqs, notes, manuals, syllabus, questions, other };

      setStats(newStats);
      setMaterialCounts(newCounts);

      // Save to cache
      cachedStats = newStats;
      cachedMaterialCounts = newCounts;
      cachedQuotaExceeded = false;

      console.log("[Analytics] Fetch complete.", { totalUsers, dailyActive, totalMaterials, atsUsage, mostVisited });
    } catch (error: any) {
      const errorStr = String(error?.message || error);
      if (errorStr.toLowerCase().includes("quota") || errorStr.toLowerCase().includes("exhausted")) {
        console.warn("[Analytics] Service Notice: Firebase quota exceeded. Switching to offline mode.");
        setIsQuotaExceeded(true);
        cachedQuotaExceeded = true;
        const fallbackStats = {
          totalMaterials: 24,
          totalUsers: 85,
          dailyActive: 12,
          atsUsage: 43,
          aiUsage: 120,
          mostVisited: "Data Structures",
          topDepartment: "CSE",
          highestDownloadedFile: "Notes_Unit1.pdf",
          totalDepts: 5,
          pendingDepts: 0,
          approvedDepts: 5,
          totalSubjects: 14
        };
        const fallbackCounts = { pyqs: 12, notes: 8, manuals: 2, syllabus: 1, questions: 1, other: 0 };
        setStats(fallbackStats);
        setMaterialCounts(fallbackCounts);
        cachedStats = fallbackStats;
        cachedMaterialCounts = fallbackCounts;
      } else {
        console.error("[Analytics] Fatal error fetching admin stats:", error);
        setError("A fatal error occurred while fetching analytics.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(false);
  }, [fetchStats]);

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-violet-500/20 relative overflow-hidden shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Activity className="text-violet-400" /> Platform Analytics
            </h1>
            <p className="text-violet-200/60 max-w-2xl">
              Real-time engagement metrics tracking student engagement, AI usage, and material distribution across the Paperino platform.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStats(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all text-sm font-bold shrink-0 flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/30 transition-all text-sm font-bold shrink-0 group"
            >
              <Bell size={16} className="group-hover:animate-pulse" />
              Clear All Notifications
            </button>
          </div>
        </div>
      </div>

      {isQuotaExceeded && (
        <>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              Analytics are temporarily running in offline mode because today's Firebase free usage limit has been reached. Core Paperino features continue to work normally.
            </div>
          </div>
          <div className="fixed bottom-6 left-6 z-[9999] flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.15)] backdrop-blur-md animate-in slide-in-from-bottom-5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Service Notice: Offline Mode</span>
          </div>
        </>
      )}

      {/* Clear All Notifications Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!clearingNotifs) { setShowClearModal(false); setClearResult(null); } }} />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200" style={{ background: "rgba(12,8,24,0.97)", backdropFilter: "blur(20px)" }}>
            <button
              onClick={() => { if (!clearingNotifs) { setShowClearModal(false); setClearResult(null); } }}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>

            {clearResult ? (
              <div className="flex flex-col items-center text-center py-4 animate-in fade-in duration-300">
                {clearResult.type === "success" ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                      <CheckCircle2 size={28} className="text-emerald-400" />
                    </div>
                    <p className="text-white font-bold text-lg mb-1">Done!</p>
                    <p className="text-gray-400 text-sm">{clearResult.message}</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
                      <AlertCircle size={28} className="text-rose-400" />
                    </div>
                    <p className="text-white font-bold text-lg mb-1">Error</p>
                    <p className="text-gray-400 text-sm">{clearResult.message}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                    <Trash2 size={22} className="text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Clear All Notifications</h3>
                    <p className="text-gray-400 text-xs">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                  This will permanently delete <span className="text-white font-bold">all notification documents</span> from Firestore for every user on the platform.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowClearModal(false)}
                    disabled={clearingNotifs}
                    className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAllNotifications}
                    disabled={clearingNotifs}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-all text-sm font-bold disabled:opacity-50"
                  >
                    {clearingNotifs ? (
                      <><Loader2 size={14} className="animate-spin" /> Clearing...</>
                    ) : (
                      <><Trash2 size={14} /> Clear All Notifications</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-400 rounded-full animate-spin"></div>
          <p className="text-violet-400 animate-pulse">Syncing with Firebase...</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="glass-panel p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center gap-3 text-red-400 mb-6 animate-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0" />
              <div>
                <span className="font-bold block">Error Loading Dashboard</span>
                <span className="text-sm text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Top Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Stat Card 1 */}
            <div className="vision-glass p-6 rounded-3xl relative overflow-hidden group vision-hover">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
                  <Users size={24} />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">Total Registered Users</h3>
              <p className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
            </div>

            {/* Stat Card 2 */}
            <div className="vision-glass p-6 rounded-3xl relative overflow-hidden group vision-hover">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]">
                  <Activity size={24} />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">Daily Active Users</h3>
              <p className="text-3xl font-bold text-white">{stats.dailyActive.toLocaleString()}</p>
            </div>

            {/* Stat Card 4 */}
            <div className="vision-glass p-6 rounded-3xl relative overflow-hidden group vision-hover">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <FileSearch size={24} />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">ATS Resumes Analyzed</h3>
              <p className="text-3xl font-bold text-white">{stats.atsUsage.toLocaleString()}</p>
            </div>

          </div>

          {/* Course Management Analytics Grid */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <GraduationCap className="text-purple-400" size={20} /> Course Management Analytics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="vision-glass p-5 rounded-2xl relative overflow-hidden group">
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Departments</h3>
                <p className="text-3xl font-bold text-white">{stats.totalDepts.toLocaleString()}</p>
              </div>
              <div className="vision-glass p-5 rounded-2xl relative overflow-hidden group">
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Pending Requests</h3>
                <p className="text-3xl font-bold text-amber-400">{stats.pendingDepts.toLocaleString()}</p>
              </div>
              <div className="vision-glass p-5 rounded-2xl relative overflow-hidden group">
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Approved Depts</h3>
                <p className="text-3xl font-bold text-emerald-400">{stats.approvedDepts.toLocaleString()}</p>
              </div>
              <div className="vision-glass p-5 rounded-2xl relative overflow-hidden group">
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Active Subjects</h3>
                <p className="text-3xl font-bold text-white">{stats.totalSubjects.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Detailed Distribution (Custom CSS Charts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Materials Distribution */}
            <div className="glass-panel p-8 rounded-3xl border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-violet-400" size={20}/> Content Distribution
                </h3>
                <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-gray-300">Total: {stats.totalMaterials}</span>
              </div>
              
              <div className="space-y-5">
                {[
                  { label: "Question Papers (PYQs)", value: materialCounts.pyqs, color: "bg-fuchsia-500", shadow: "shadow-[0_0_10px_rgba(var(--secondary-rgb),0.5)]" },
                  { label: "Handwritten Notes", value: materialCounts.notes, color: "bg-violet-500", shadow: "shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" },
                  { label: "Important Questions", value: materialCounts.questions, color: "bg-emerald-500", shadow: "shadow-[0_0_10px_rgba(16,185,129,0.5)]" },
                  { label: "Lab Manuals", value: materialCounts.manuals, color: "bg-cyan-500", shadow: "shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" },
                  { label: "Syllabus PDFs", value: materialCounts.syllabus, color: "bg-blue-500", shadow: "shadow-[0_0_10px_rgba(59,130,246,0.5)]" },
                  { label: "Other Resources", value: materialCounts.other, color: "bg-gray-400", shadow: "shadow-[0_0_10px_rgba(156,163,175,0.5)]" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">{item.label}</span>
                      <span className="text-white font-medium">{item.value}</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} ${item.shadow}`} style={{ width: `${stats.totalMaterials > 0 ? (item.value / stats.totalMaterials) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending & Insights */}
            <div className="glass-panel p-8 rounded-3xl border border-white/5">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="text-fuchsia-400" size={20}/> Platform Insights
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Most Visited Subject</h4>
                    {stats.mostVisited === "N/A" ? (
                      <p className="text-gray-500 text-sm italic">N/A</p>
                    ) : (
                      <p className="text-white font-bold">{stats.mostVisited}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Top Department</h4>
                    {stats.topDepartment === "N/A" ? (
                      <p className="text-gray-500 text-sm italic">N/A</p>
                    ) : (
                      <p className="text-white font-bold">{stats.topDepartment}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Download size={20} />
                  </div>
                  <div>
                    <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Highest Downloaded File</h4>
                    {stats.highestDownloadedFile === "N/A" ? (
                      <p className="text-gray-500 text-sm italic">N/A</p>
                    ) : (
                      <p className="text-white font-bold">{stats.highestDownloadedFile}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
