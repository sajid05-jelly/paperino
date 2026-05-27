"use client";

import { useState, useEffect } from "react";
import { collection, query, where, doc, updateDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recalculateLeaderboards } from "@/lib/leaderboard";
import { Users, UserPlus, ShieldAlert, CheckCircle2, XCircle, Loader2, Ban, ShieldCheck, Trophy } from "lucide-react";


interface JoinRequest {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  status: string;
  timestamp: any;
}

interface Contributor {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  paperinoAvatar?: string;
}

export default function AdminTeamPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Real-time listener for Pending Requests
    const reqQ = query(collection(db, "contributor_requests"), where("status", "==", "pending"));
    const unsubRequests = onSnapshot(reqQ, (snap) => {
      const reqs: JoinRequest[] = [];
      snap.forEach(doc => reqs.push({ id: doc.id, ...doc.data() } as JoinRequest));
      setRequests(reqs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      setLoading(false);
    }, (err) => {
      console.error("Error fetching requests:", err);
      setLoading(false);
    });

    // Real-time listener for Active Contributors
    const conQ = query(collection(db, "users"), where("role", "==", "contributor"));
    const unsubContributors = onSnapshot(conQ, (snap) => {
      const cons: Contributor[] = [];
      snap.forEach(doc => cons.push({ id: doc.id, ...doc.data() } as Contributor));
      setContributors(cons.filter(c => c.status !== "blocked"));
    }, (err) => {
      console.error("Error fetching contributors:", err);
    });

    return () => {
      unsubRequests();
      unsubContributors();
    };
  }, []);

  const handleApprove = async (request: JoinRequest) => {
    setActionLoading(request.id);
    try {
      // 1. Update Join Request
      await updateDoc(doc(db, "contributor_requests", request.id), { status: "approved" });
      
      // 2. Update User Role
      await updateDoc(doc(db, "users", request.uid), { role: "contributor" });
      
      // Update leaderboard pre-aggregated tables immediately
      await recalculateLeaderboards(db);
    } catch (err) {
      console.error("Approve error:", err);
      alert("Failed to approve contributor.");
    }
    setActionLoading(null);
  };

  const handleReject = async (request: JoinRequest) => {
    setActionLoading(request.id);
    try {
      await updateDoc(doc(db, "contributor_requests", request.id), { status: "rejected" });
    } catch (err) {
      console.error("Reject error:", err);
    }
    setActionLoading(null);
  };

  const handleRevoke = async (uid: string) => {
    if (!confirm("Are you sure you want to revoke this user's contributor access?")) return;
    setActionLoading(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role: "student" });
      
      // Update leaderboard pre-aggregated tables immediately
      await recalculateLeaderboards(db);
    } catch (err) {
      console.error("Revoke error:", err);
    }
    setActionLoading(null);
  };

  const handleBlock = async (uid: string) => {
    if (!confirm("Are you sure you want to BLOCK this user entirely from Paperino?")) return;
    setActionLoading(uid);
    try {
      await updateDoc(doc(db, "users", uid), { status: "blocked", role: "student" });
      
      // Update leaderboard pre-aggregated tables immediately
      await recalculateLeaderboards(db);
    } catch (err) {
      console.error("Block error:", err);
    }
    setActionLoading(null);
  };

  return (
    <div className="w-full space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldCheck className="text-emerald-400" /> Team Management
          </h1>
          <p className="text-gray-400">Approve join requests and manage Paperino Team contributors.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pending Applications List */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 h-fit">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <UserPlus className="text-violet-400" size={20}/> Pending Applications
            </h2>
            
            {requests.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                <p className="text-gray-500">No pending join requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white font-bold truncate">{req.displayName}</h4>
                      <p className="text-sm text-gray-400 truncate">{req.email}</p>
                      <p className="text-xs text-gray-500 mt-1">Applied: {req.timestamp?.toDate().toLocaleDateString() || "Recently"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={() => handleReject(req)}
                        disabled={actionLoading === req.id}
                        className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
                        title="Reject Application"
                      >
                        {actionLoading === req.id ? <Loader2 size={18} className="animate-spin"/> : <XCircle size={18}/>}
                      </button>
                      <button 
                        onClick={() => handleApprove(req)}
                        disabled={actionLoading === req.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 text-sm"
                      >
                        {actionLoading === req.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Active Contributors List */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 h-fit">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="text-emerald-400" size={20}/> Active Contributors
              </h2>

              {contributors.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                  <p className="text-gray-500">No active contributors found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contributors.map(contributor => (
                    <div key={contributor.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/30">
                          {contributor.displayName?.charAt(0).toUpperCase() || "C"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-white font-bold truncate">{contributor.displayName}</h4>
                          <p className="text-sm text-gray-400 truncate">{contributor.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                          onClick={() => handleRevoke(contributor.id)}
                          disabled={actionLoading === contributor.id}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors border border-white/5"
                        >
                          Revoke Role
                        </button>
                        <button 
                          onClick={() => handleBlock(contributor.id)}
                          disabled={actionLoading === contributor.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-400 transition-colors border border-rose-500/20 flex items-center gap-1"
                        >
                          <Ban size={12}/> Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard Controls */}
            <div className="glass-panel p-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent h-fit">
              <h2 className="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2">
                <Trophy size={20}/> Leaderboard Seasons
              </h2>
              <p className="text-sm text-gray-400 mb-6">Reset the main leaderboard by starting a new season. The Hall of Fame will retain all-time scores.</p>
              
              <button 
                onClick={async () => {
                  if(!confirm("Are you sure you want to start a new Leaderboard Season? This will reset everyone's main score to 0!")) return;
                  try {
                    await setDoc(doc(db, "settings", "leaderboard"), { seasonStartDate: new Date() }, { merge: true });
                    // Recalculate leaderboards with the new season start date
                    await recalculateLeaderboards(db);
                    alert("New Season Started!");
                  } catch (err) {
                    console.error("Season error", err);
                  }
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)]"
              >
                Start New Season Now
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
