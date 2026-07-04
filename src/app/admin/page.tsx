"use client";

import { useState, useEffect } from "react";
import { Users, FileText, BrainCircuit, FileSearch, Sparkles, Activity, Target, Download, AlertCircle } from "lucide-react";
import { collection, query, where, getCountFromServer, getDoc, doc, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log("[Analytics] Starting data fetch...");
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
          getDocs(query(collection(db, "platform_stats", "materials", "downloads"), orderBy("downloads", "desc"), limit(1)))
        ]);

        // Helper to extract data or log error
        const getResult = (res: any, name: string, defaultValue: any) => {
          if (res.status === "fulfilled") {
            console.log(`[Analytics] Successfully fetched ${name}`);
            return res.value;
          } else {
            console.error(`[Analytics] Error fetching ${name}:`, res.reason);
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

        const totalMaterials = totalMatsSnap.data().count;
        const totalUsers = totalUsersSnap.data().count;
        const dailyActive = dailyUsersSnap.data().count;

        const pyqs = pyqsSnap.data().count;
        const notes = notesSnap.data().count;
        const questions = questionsSnap.data().count;

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

        setStats({
          totalMaterials,
          totalUsers,
          dailyActive,
          atsUsage,
          aiUsage,
          mostVisited,
          topDepartment: "Pending Update", // Static for now based on original code
          highestDownloadedFile
        });
        setMaterialCounts({ pyqs, notes, manuals, syllabus, questions, other });
        
        console.log("[Analytics] Fetch complete.", { totalUsers, dailyActive, totalMaterials, atsUsage, mostVisited });
      } catch (error) {
        console.error("[Analytics] Fatal error fetching admin stats:", error);
        setError("A fatal error occurred while fetching analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-violet-500/20 relative overflow-hidden shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/20 blur-[80px] rounded-full pointer-events-none"></div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="text-violet-400" /> Platform Analytics
        </h1>
        <p className="text-violet-200/60 max-w-2xl">
          Real-time metrics tracking student engagement, AI usage, and material distribution across the Paperino platform.
        </p>
      </div>

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
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">+12% this week</span>
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
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">High</span>
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
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">+45 today</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">ATS Resumes Analyzed</h3>
              <p className="text-3xl font-bold text-white">{stats.atsUsage.toLocaleString()}</p>
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
