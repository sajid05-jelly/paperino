"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recalculateLeaderboards } from "@/lib/leaderboard";
import { CheckCircle2, XCircle, Trash2, Ban, Loader2, ExternalLink, ShieldAlert, FileText } from "lucide-react";
import { useToast } from "@/components/Toast";


interface Material {
  id: string;
  semesterId: string;
  subjectId: string;
  title: string;
  category: string;
  fileUrl: string;
  fileId?: string;
  fileName?: string;
  createdAt: number;
  uploaderId?: string;
  uploaderName?: string;
  status?: string;
}

export default function AdminReviewsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchPendingMaterials();
  }, []);

  const fetchPendingMaterials = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "materials"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const mats: Material[] = [];
      snap.forEach(doc => mats.push({ id: doc.id, ...doc.data() } as Material));
      
      mats.sort((a, b) => b.createdAt - a.createdAt);
      setMaterials(mats);
    } catch (err) {
      console.error("Error fetching pending materials:", err);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "materials", id), { status: "approved" });
      setMaterials(prev => prev.filter(m => m.id !== id));
      await recalculateLeaderboards(db);
      showToast("Material approved successfully", "success");
    } catch (err: any) {
      console.error("Approve error:", err);
      showToast(err.message || "Failed to approve material.", "error");
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "materials", id), { status: "rejected" });
      setMaterials(prev => prev.filter(m => m.id !== id));
      showToast("Material rejected successfully", "success");
    } catch (err: any) {
      console.error("Reject error:", err);
      showToast(err.message || "Failed to reject material.", "error");
    }
    setActionLoading(null);
  };

  const handleDelete = async (mat: Material) => {
    if (!confirm(`Are you sure you want to permanently delete "${mat.title}"?`)) return;
    setActionLoading(mat.id);
    try {
      if (mat.fileId) {
        const res = await fetch(`/api/upload?fileId=${mat.fileId}`, { method: "DELETE" });
        if (!res.ok) {
          const resData = await res.json();
          throw new Error(resData.error || "Failed to delete file from Google Drive");
        }
      }
      await deleteDoc(doc(db, "materials", mat.id));
      setMaterials(prev => prev.filter(m => m.id !== mat.id));
      // Only recalculate if it was an approved material previously (optional: always to be safe)
      await recalculateLeaderboards(db);
      showToast("Material deleted successfully", "success");
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast(err.message || "Failed to delete material.", "error");
    }
    setActionLoading(null);
  };

  const handleBlockUser = async (uid: string) => {
    if (!uid) return;
    if (!confirm("Are you sure you want to block this user from Paperino?")) return;
    setActionLoading(uid); // using uid as key for action loader won't match mat.id, but good enough to prevent multiple clicks if we disable UI globally. actually let's just use window.confirm
    try {
      await updateDoc(doc(db, "users", uid), { status: "blocked", role: "student" });
      alert("User blocked successfully. They can no longer login.");
      await recalculateLeaderboards(db);
    } catch (err) {
      console.error("Block user error:", err);
      alert("Failed to block user.");
    }
    setActionLoading(null);
  };

  return (
    <div className="w-full space-y-8">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldAlert className="text-amber-400" /> Pending Upload Reviews
          </h1>
          <p className="text-gray-400">Review and moderate study materials submitted by contributors.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-400" size={40} /></div>
      ) : (
        <div className="glass-panel p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-white">Materials Awaiting Approval</h2>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
              {materials.length} Pending
            </span>
          </div>

          {materials.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-emerald-400" size={32} />
              </div>
              <p className="text-lg font-medium text-white mb-1">All caught up!</p>
              <p className="text-gray-500">There are no pending materials to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map(mat => (
                <div key={mat.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-colors flex flex-col xl:flex-row gap-6">
                  
                  {/* Left: Material Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Needs Review
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                        Sem {mat.semesterId}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        {mat.subjectId}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 border border-white/10 px-2 py-0.5 rounded">
                        {mat.category}
                      </span>
                    </div>
                    
                    <h4 className="text-white font-bold text-xl leading-tight mb-2 truncate" title={mat.title || mat.fileName}>
                      {mat.title || mat.fileName || "Untitled Material"}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 bg-black/40 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} className="text-gray-500" />
                        Uploaded: {new Date(mat.createdAt).toLocaleString()}
                      </div>
                      <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[8px] font-bold text-indigo-400">
                          {mat.uploaderName?.charAt(0).toUpperCase() || "?"}
                        </span>
                        By: <span className="text-white font-medium">{mat.uploaderName || "Unknown Contributor"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col sm:flex-row xl:flex-col gap-2 flex-shrink-0 justify-center">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(mat.id)}
                        disabled={actionLoading === mat.id}
                        className="flex-1 xl:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        {actionLoading === mat.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                        Approve
                      </button>
                      <button 
                        onClick={() => handleReject(mat.id)}
                        disabled={actionLoading === mat.id}
                        className="flex-1 xl:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/10 flex items-center justify-center gap-2 text-sm"
                      >
                        {actionLoading === mat.id ? <Loader2 size={16} className="animate-spin"/> : <XCircle size={16}/>}
                        Reject
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <a 
                        href={mat.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 xl:flex-none px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors border border-cyan-500/20 flex items-center justify-center gap-1.5 text-xs font-medium"
                      >
                        <ExternalLink size={14}/> View File
                      </a>
                      
                      <div className="relative group flex-1 xl:flex-none">
                        <button 
                          onClick={() => handleDelete(mat)}
                          disabled={actionLoading === mat.id}
                          className="w-full px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 flex items-center justify-center gap-1.5 text-xs font-medium"
                        >
                          <Trash2 size={14}/> Delete
                        </button>
                      </div>

                      {mat.uploaderId && (
                        <button 
                          onClick={() => handleBlockUser(mat.uploaderId!)}
                          disabled={actionLoading !== null}
                          title="Block this contributor from Paperino"
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 flex items-center justify-center"
                        >
                          <Ban size={14}/>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
