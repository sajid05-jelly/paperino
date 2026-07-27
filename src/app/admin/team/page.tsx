"use client";

import { useState, useEffect } from "react";
import { collection, query, where, doc, getDocs, setDoc, getCountFromServer, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recalculateLeaderboards } from "@/lib/leaderboard";
import { 
  Users, UserCheck, ShieldCheck, Trophy, Sparkles, 
  FileText, Clock, ArrowUpRight, Loader2, RefreshCw 
} from "lucide-react";

interface ContributorInfo {
  id: string;
  displayName: string;
  email: string;
  contributionPoints: number;
  uploads: number;
}

interface RecentMat {
  id: string;
  title: string;
  fileName: string;
  category: string;
  uploaderName?: string;
  createdAt: number;
  status: string;
}

export default function AdminTeamPage() {
  const [stats, setStats] = useState({
    totalContributors: 0,
    totalApproved: 0,
    totalPending: 0,
    totalPremium: 0
  });
  const [topContributors, setTopContributors] = useState<ContributorInfo[]>([]);
  const [recentContributions, setRecentContributions] = useState<RecentMat[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Query Top 5 Contributors (ordered by points)
      const topContribQ = query(
        collection(db, "users"),
        orderBy("contributionPoints", "desc"),
        limit(5)
      );
      const topContribSnap = await getDocs(topContribQ);
      const usersList: ContributorInfo[] = [];
      topContribSnap.forEach(d => {
        const u = d.data();
        usersList.push({
          id: d.id,
          displayName: u.displayName || u.email || "Explorer",
          email: u.email,
          contributionPoints: Math.max(0, u.contributionPoints || 0),
          uploads: Math.max(0, u.uploads || 0)
        });
      });
      setTopContributors(usersList);

      // 2. Query Recent 5 Contributions (ordered by createdAt desc)
      const recentMatsQ = query(
        collection(db, "materials"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const recentMatsSnap = await getDocs(recentMatsQ);
      const matsList: RecentMat[] = [];
      recentMatsSnap.forEach(d => {
        const m = d.data();
        matsList.push({
          id: d.id,
          title: m.title || "Untitled",
          fileName: m.fileName || "Unknown File",
          category: m.category || "notes",
          uploaderName: m.uploaderName || "Contributor",
          createdAt: m.createdAt || Date.now(),
          status: m.status || "pending"
        });
      });
      setRecentContributions(matsList);

      // 3. Fetch counts in parallel via getCountFromServer
      const matsColl = collection(db, "materials");
      const usersColl = collection(db, "users");

      const [
        totalContribSnap,
        totalPremSnap,
        approvedMatsSnap,
        pendingMatsSnap
      ] = await Promise.all([
        getCountFromServer(query(usersColl, where("uploads", ">", 0))),
        getCountFromServer(query(usersColl, where("isPremiumActive", "==", true))),
        getCountFromServer(query(matsColl, where("status", "==", "approved"))),
        getCountFromServer(query(matsColl, where("status", "==", "pending")))
      ]);

      setStats({
        totalContributors: totalContribSnap.data().count,
        totalApproved: approvedMatsSnap.data().count,
        totalPending: pendingMatsSnap.data().count,
        totalPremium: totalPremSnap.data().count
      });

    } catch (err) {
      console.error("Error loading admin stats:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="w-full space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" /> Platform Analytics & Management
          </h1>
          <p className="text-gray-400">Track community contributions, premium users metrics, and adjust system levels.</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-bold transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-400" size={40} />
        </div>
      ) : (
        <>
          {/* Stats Analytics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <Users className="text-emerald-400 mb-3" size={24} />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Contributors</p>
              <p className="text-3xl font-black text-white">{stats.totalContributors}</p>
            </div>
            
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-500/5 to-transparent">
              <FileText className="text-cyan-400 mb-3" size={24} />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Approved Uploads</p>
              <p className="text-3xl font-black text-white">{stats.totalApproved}</p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-amber-500/5 to-transparent">
              <Clock className="text-amber-400 mb-3" size={24} />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Pending Reviews</p>
              <p className="text-3xl font-black text-white">{stats.totalPending}</p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-purple-500/5 to-transparent">
              <Sparkles className="text-purple-400 mb-3" size={24} />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Premium Accounts</p>
              <p className="text-3xl font-black text-white">{stats.totalPremium}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Top Contributors Leaderboard */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-yellow-400" size={20} /> Top Contributors
              </h2>
              
              {topContributors.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">
                  <p className="text-gray-500">No contributors yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topContributors.map((c, i) => (
                    <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-bold text-gray-500 font-mono w-4">#{i + 1}</span>
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-gray-300 flex-shrink-0">
                          {c.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{c.displayName}</h4>
                          <p className="text-xs text-gray-500 truncate">{c.email}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-emerald-400">{c.contributionPoints} pts</p>
                        <p className="text-[10px] text-gray-500">{c.uploads} files</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Side Column: Season Reset Controls */}
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent h-fit space-y-4">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <Trophy size={20} /> Leaderboard Seasons
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Reset the active season leaderboard. All-time total scores will remain saved and visible in the Hall of Fame.
                </p>
                
                <button 
                  disabled={actionLoading}
                  onClick={async () => {
                    if(!confirm("Are you sure you want to start a new Leaderboard Season? This will reset everyone's active season points to 0!")) return;
                    setActionLoading(true);
                    try {
                      await setDoc(doc(db, "settings", "leaderboard"), { seasonStartDate: new Date() }, { merge: true });
                      await recalculateLeaderboards(db);
                      alert("New Season Started Successfully!");
                      fetchAnalytics();
                    } catch (err) {
                      console.error("Season reset error", err);
                    }
                    setActionLoading(false);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold transition-all shadow-[0_0_15px_rgba(251,191,36,0.2)] flex justify-center items-center gap-2 text-sm"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Start New Season"}
                </button>
              </div>
            </div>

          </div>

          {/* Recent Activity */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="text-cyan-400" size={20} /> Recent Contribution Activity
            </h2>

            {recentContributions.length === 0 ? (
              <div className="text-center py-12 bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">
                <p className="text-gray-500">No uploads found.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] space-y-1">
                {recentContributions.map(m => (
                  <div key={m.id} className="pt-3 pb-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          {m.category}
                        </span>
                        <span className="text-xs text-gray-500">by {m.uploaderName}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white truncate" title={m.title}>{m.title}</h4>
                      <p className="text-[10px] text-gray-600 truncate">{m.fileName}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      m.status === "approved" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                      m.status === "rejected" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                      "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    }`}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
