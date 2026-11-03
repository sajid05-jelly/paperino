"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, getDocs, doc, updateDoc, deleteDoc, setDoc, increment, writeBatch, serverTimestamp, getDoc, where, startAfter, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CheckCircle2, Trash2, Ban, Loader2, ShieldAlert, FileText,
  Download, RotateCcw, AlertOctagon,
  Calendar, UserCheck, Sparkles
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { getDownloadHref, getDrivePreviewUrl, triggerSecureDownload } from "@/lib/driveUtils";
import { notifyUser } from "@/lib/notifications";
import { logAdminAction } from "@/lib/admin-logger";
import { useBadges } from "@/context/BadgeContext";

interface Material {
  id: string;
  semesterId: string;
  subjectId: string;
  title: string;
  category: string;
  fileUrl?: string;
  fileId?: string;
  fileName?: string;
  createdAt: number;
  rejectedAt?: number;
  uploaderId?: string;
  uploaderName?: string;
  uploaderEmail?: string;
  status?: string;
  departmentId?: string;
  isNewSubjectRequest?: boolean;
  subjectName?: string;
  subjectCode?: string;
  newSubjectData?: any;
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const { markAdminSectionSeen } = useBadges();
  const [activeTab, setActiveTab] = useState<"pending" | "rejected">("pending");

  useEffect(() => {
    markAdminSectionSeen("reviews");
  }, [markAdminSectionSeen]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Download state tracking per material
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  // Pagination State for Materials
  const [lastVisibleMat, setLastVisibleMat] = useState<any>(null);
  const [hasMoreMats, setHasMoreMats] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Permanent Delete Modal State
  const [deleteConfirmMat, setDeleteConfirmMat] = useState<Material | null>(null);
  
  const { showToast, dismissToast } = useToast();

  const handleDownloadMaterial = async (mat: Material) => {
    if (downloadingId === mat.id) return;
    setDownloadingId(mat.id);
    const success = await triggerSecureDownload(mat, showToast, dismissToast, (loading) => {
      if (!loading) setDownloadingId(null);
    });
    if (success) {
      setDownloadedId(mat.id);
      setTimeout(() => {
        setDownloadedId(prev => (prev === mat.id ? null : prev));
      }, 2500);
    }
  };

  useEffect(() => {
    fetchMaterials(true);
  }, [activeTab]);

  const fetchMaterials = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setMaterials([]);
      setLastVisibleMat(null);
      setHasMoreMats(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const targetStatus = activeTab === "rejected" ? "rejected" : "pending";
      
      let q = query(
        collection(db, "materials"),
        where("status", "==", targetStatus),
        limit(15)
      );

      if (!reset && lastVisibleMat) {
        q = query(
          collection(db, "materials"),
          where("status", "==", targetStatus),
          startAfter(lastVisibleMat),
          limit(15)
        );
      }

      const snap = await getDocs(q);
      const mats: Material[] = [];
      const now = Date.now();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

      // Filter and check for 7-day auto deletion inside the load flow
      const deletePromises: Promise<void>[] = [];
      const token = user ? await user.getIdToken() : "";

      snap.forEach(d => {
        const data = d.data();
        const matId = d.id;
        
        // Auto-delete if rejected and older than 7 days
        if (data.status === "rejected" && data.rejectedAt && (now - data.rejectedAt) > SEVEN_DAYS_MS) {
          const fileId = data.fileId;
          
          const autoDeleteFlow = (async () => {
            try {
              if (fileId) {
                await fetch(`/api/upload?fileId=${fileId}`, {
                  method: "DELETE",
                  headers: { "Authorization": `Bearer ${token}` }
                });
              }
              await deleteDoc(doc(db, "materials", matId));
              console.log(`[Auto-Delete] Deleted expired material ${matId}`);
            } catch (err) {
              console.error(`[Auto-Delete] Failed to delete ${matId}:`, err);
            }
          })();
          deletePromises.push(autoDeleteFlow);
        } else {
          mats.push({ id: d.id, ...data } as Material);
        }
      });

      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }

      // Fetch emails for each uploader (cache and skip if already known)
      const uploaderEmailCache = new Map<string, string>();
      const enrichedMats = await Promise.all(mats.map(async (m) => {
        if (m.uploaderEmail) {
          if (m.uploaderId) uploaderEmailCache.set(m.uploaderId, m.uploaderEmail);
          return m;
        }
        if (m.uploaderId) {
          if (uploaderEmailCache.has(m.uploaderId)) {
            m.uploaderEmail = uploaderEmailCache.get(m.uploaderId);
            return m;
          }
          try {
            const userSnap = await getDoc(doc(db, "users", m.uploaderId));
            if (userSnap.exists()) {
              const email = userSnap.data()?.email;
              if (email) {
                m.uploaderEmail = email;
                uploaderEmailCache.set(m.uploaderId, email);
              }
            }
          } catch (e) {
            console.warn("Failed to fetch uploader email for", m.uploaderId, e);
          }
        }
        return m;
      }));

      // Sort chronologically descending client-side
      enrichedMats.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      if (snap.docs.length < 15) {
        setHasMoreMats(false);
      } else {
        setLastVisibleMat(snap.docs[snap.docs.length - 1]);
      }

      setMaterials(prev => {
        const combined = reset ? enrichedMats : [...prev, ...enrichedMats];
        // Sort final list chronologically
        combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return combined;
      });
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const mat = materials.find(m => m.id === id);
      if (!mat) throw new Error("Material not found.");
      if (!user) throw new Error("Admin authentication required.");

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/approve-material", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          materialId: mat.id,
          departmentId: mat.departmentId || "btech",
          semesterId: mat.semesterId || "1",
          subjectId: mat.subjectId,
          subjectName: mat.subjectName || (mat as any).newSubjectData?.name || mat.title,
          subjectCode: mat.subjectCode || (mat as any).newSubjectData?.code || "",
          category: mat.category,
          title: mat.title,
          fileName: mat.fileName,
          fileId: mat.fileId,
          uploaderId: mat.uploaderId,
          uploaderName: mat.uploaderName,
          uploaderEmail: mat.uploaderEmail,
          isNewSubjectRequest: (mat as any).isNewSubjectRequest,
          newSubjectData: (mat as any).newSubjectData
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || "Failed to approve material.");
      }

      // Clear subject cache in sessionStorage so new section & material appear immediately
      if (typeof window !== "undefined") {
        const cacheKey = `paperino_subject_cache_${mat.departmentId || "btech"}_${mat.semesterId || "1"}_${mat.subjectId}`;
        sessionStorage.removeItem(cacheKey);
      }

      setMaterials(prev => prev.filter(m => m.id !== id));
      showToast("Material approved and section published successfully", "success");
    } catch (err: any) {
      console.error("Approve error:", err);
      showToast(err.message || "Failed to approve material.", "error");
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const mat = materials.find(m => m.id === id);
      if (!mat) throw new Error("Material not found.");
      if (!user) throw new Error("Admin authentication required.");

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/reject-material", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          materialId: mat.id,
          fileId: mat.fileId,
          departmentId: mat.departmentId || "btech",
          semesterId: mat.semesterId || "1",
          subjectId: mat.subjectId,
          title: mat.title,
          fileName: mat.fileName,
          uploaderId: mat.uploaderId,
          isNewSubjectRequest: (mat as any).isNewSubjectRequest
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.error || "Failed to reject material.");
      }

      setMaterials(prev => prev.filter(m => m.id !== id));
      showToast("Submission rejected and completely deleted.", "info");
    } catch (err: any) {
      console.error("Reject error:", err);
      showToast(err.message || "Failed to reject material.", "error");
    }
    setActionLoading(null);
  };

  const handleRestore = async (id: string) => {
    setActionLoading(id);
    try {
      // Restore status to pending and remove rejectedAt
      await updateDoc(doc(db, "materials", id), {
        status: "pending",
        rejectedAt: null
      });

      setMaterials(prev => prev.map(m => m.id === id ? { ...m, status: "pending", rejectedAt: undefined } : m));
      showToast("Material restored to Pending queue", "success");
    } catch (err: any) {
      console.error("Restore error:", err);
      showToast(err.message || "Failed to restore material.", "error");
    }
    setActionLoading(null);
  };

  const handlePermanentDelete = async () => {
    if (!deleteConfirmMat) return;
    const mat = deleteConfirmMat;
    setActionLoading(mat.id);
    try {
      // 1. Delete file from Google Drive (non-fatal if already missing)
      if (mat.fileId) {
        try {
          const token = user ? await user.getIdToken() : "";
          const res = await fetch(`/api/upload?fileId=${mat.fileId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) {
            const resData = await res.json();
            console.warn("Drive delete warning (non-fatal):", resData.error);
          }
        } catch (driveErr) {
          console.warn("Drive delete error (ignored):", driveErr);
        }
      }
      
      // 2. Delete document from Firestore via Admin API (0 client reads)
      const token = user ? await user.getIdToken() : "";
      const delRes = await fetch("/api/admin/reject-material", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          materialId: mat.id,
          fileId: mat.fileId,
          departmentId: mat.departmentId || "btech",
          semesterId: mat.semesterId || "1",
          subjectId: mat.subjectId
        })
      });
      if (!delRes.ok) {
        const delData = await delRes.json().catch(() => ({}));
        throw new Error(delData.error || "Failed to permanently delete material.");
      }

      setMaterials(prev => prev.filter(m => m.id !== mat.id));
      showToast("Material permanently deleted", "success");
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast(err.message || "Failed to permanently delete material.", "error");
    } finally {
      setActionLoading(null);
      setDeleteConfirmMat(null);
    }
  };

  const handleBlockUser = async (uid: string) => {
    if (!uid) return;
    if (!confirm("Are you sure you want to block this user from Paperino?")) return;
    try {
      await updateDoc(doc(db, "users", uid), { status: "blocked", role: "student" });
      logAdminAction(user?.email || "unknown", "BLOCK_USER", uid, `Blocked user ID: ${uid}`);
      alert("User blocked successfully. They can no longer login.");
    } catch (err) {
      console.error("Block user error:", err);
      alert("Failed to block user.");
    }
  };

  const [repairingPermissions, setRepairingPermissions] = useState(false);

  const handleRepairAllPermissions = async () => {
    if (!user) return;
    setRepairingPermissions(true);
    showToast("Starting Google Drive permissions repair for contributor PDFs...", "info");
    try {
      const snap = await getDocs(query(collection(db, "materials"), limit(50)));
      const token = await user.getIdToken();
      let repairedCount = 0;

      for (const docSnap of snap.docs) {
        const mat = docSnap.data();
        if (mat.fileId) {
          try {
            await fetch("/api/upload", {
              method: "PATCH",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ fileId: mat.fileId })
            });
            repairedCount++;
          } catch (e) {
            console.warn(`Repair error for ${mat.fileId}:`, e);
          }
        }
      }

      showToast(`✅ Successfully repaired Google Drive permissions for ${repairedCount} materials!`, "success");
    } catch (err: any) {
      console.error("Permission repair failed:", err);
      showToast("Permission repair failed: " + err.message, "error");
    } finally {
      setRepairingPermissions(false);
    }
  };

  const filteredMaterials = materials.filter(m => {
    if (activeTab === "pending") return !m.status || m.status === "pending";
    if (activeTab === "rejected") return m.status === "rejected";
    return true;
  });

  return (
    <>
      <div className="w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <ShieldAlert className="text-amber-400" /> Pending Upload Reviews
            </h1>
            <p className="text-gray-400">Review and moderate study materials submitted by contributors.</p>
          </div>
          <button
            disabled={repairingPermissions}
            onClick={handleRepairAllPermissions}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Automatically update Google Drive public permissions for all uploaded materials"
          >
            {repairingPermissions ? <Loader2 size={14} className="animate-spin text-purple-400" /> : <Sparkles size={14} className="text-purple-400" />}
            <span>Repair PDF Drive Permissions</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => setActiveTab("pending")} 
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${activeTab === "pending" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/5 border-transparent text-gray-400 hover:text-white"}`}
          >
            Pending Requests ({materials.filter(m => !m.status || m.status === "pending").length})
          </button>
          <button 
            onClick={() => setActiveTab("rejected")} 
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${activeTab === "rejected" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/5 border-transparent text-gray-400 hover:text-white"}`}
          >
            Rejected Queue ({materials.filter(m => m.status === "rejected").length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-amber-400" size={40} />
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold text-white">
                {activeTab === "pending" && "Materials Awaiting Approval"}
                {activeTab === "rejected" && "Rejected Materials (Deletes in 7 days)"}
              </h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                activeTab === "pending" ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {filteredMaterials.length} Items
              </span>
            </div>

            {/* ── Tab: Materials pending or rejected ── */}
            {filteredMaterials.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="text-emerald-400" size={32} />
                  </div>
                  <p className="text-lg font-medium text-white mb-1">All clean!</p>
                  <p className="text-gray-500">There are no materials in this queue.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMaterials.map(mat => (
                    <div
                      key={mat.id}
                      className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-colors flex flex-col xl:flex-row gap-6"
                    >
                      {/* Left: Material Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {mat.status === "rejected" && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                              Rejected
                            </span>
                          )}
                          {(!mat.status || mat.status === "pending") && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Needs Review
                            </span>
                          )}
                          {mat.isNewSubjectRequest && (
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-fuchsia-300 bg-fuchsia-500/20 border border-fuchsia-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_12px_rgba(217,70,239,0.25)]">
                              <Sparkles size={11} className="text-fuchsia-400" />
                              New Subject + Material
                            </span>
                          )}
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
                          {mat.isNewSubjectRequest && mat.subjectName ? `${mat.subjectName}${mat.subjectCode ? ` (${mat.subjectCode})` : ""} — ` : ""}
                          {mat.title || mat.fileName || "Untitled Material"}
                        </h4>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 bg-black/40 p-3 rounded-xl border border-white/5">
                          <div className="flex items-center gap-1.5">
                            <FileText size={14} className="text-gray-500" />
                            Uploaded: {new Date(mat.createdAt).toLocaleString()}
                          </div>
                          {mat.rejectedAt && (
                            <>
                              <div className="w-px h-4 bg-white/10 hidden sm:block" />
                              <div className="flex items-center gap-1.5 text-red-400 font-medium">
                                <AlertOctagon size={14} />
                                Rejected: {new Date(mat.rejectedAt).toLocaleDateString()}
                              </div>
                            </>
                          )}
                          <div className="w-px h-4 bg-white/10 hidden sm:block" />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[8px] font-bold text-indigo-400">
                              {mat.uploaderName?.charAt(0).toUpperCase() || "?"}
                            </span>
                            By: <span className="text-white font-medium">{mat.uploaderName || "Unknown Contributor"}</span>
                            {mat.uploaderEmail && (
                              <a 
                                href={`mailto:${mat.uploaderEmail}`} 
                                className="text-indigo-400 hover:text-indigo-300 transition-colors ml-1 underline decoration-indigo-500/30 underline-offset-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                ({mat.uploaderEmail})
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col sm:flex-row xl:flex-col gap-2 flex-shrink-0 justify-center">
                        <button
                          onClick={() => handleDownloadMaterial(mat)}
                          disabled={downloadingId === mat.id}
                          title="Download Material"
                          className="px-3.5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-colors border border-violet-500/25 flex items-center justify-center gap-1.5 text-xs font-semibold shadow-[0_0_12px_rgba(139,92,246,0.15)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingId === mat.id ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-violet-400" />
                              <span>Downloading...</span>
                            </>
                          ) : downloadedId === mat.id ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-400" />
                              <span className="text-emerald-300">Downloaded</span>
                            </>
                          ) : (
                            <>
                              <Download size={14} className="text-violet-400" />
                              <span>Download</span>
                            </>
                          )}
                        </button>

                        {activeTab === "pending" ? (
                          <button
                            onClick={() => handleApprove(mat.id)}
                            disabled={actionLoading === mat.id}
                            className="flex-1 xl:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                          >
                            {actionLoading === mat.id
                              ? <Loader2 size={16} className="animate-spin" />
                              : <CheckCircle2 size={16} />}
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(mat.id)}
                            disabled={actionLoading === mat.id}
                            className="flex-1 xl:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                          >
                            {actionLoading === mat.id
                              ? <Loader2 size={16} className="animate-spin" />
                              : <RotateCcw size={16} />}
                            Restore
                          </button>
                        )}
                        <div className="flex gap-2">
                          {activeTab === "pending" ? (
                            <button
                              onClick={() => handleReject(mat.id)}
                              disabled={actionLoading === mat.id}
                              className="flex-1 xl:flex-none px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors border border-orange-500/20 flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
                            >
                              <Ban size={14} /> Reject
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmMat(mat)}
                              disabled={actionLoading === mat.id}
                              className="flex-1 xl:flex-none px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}

                          {mat.uploaderId && (
                            <button
                              onClick={() => handleBlockUser(mat.uploaderId!)}
                              disabled={actionLoading !== null}
                              title="Block this contributor from Paperino"
                              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 flex items-center justify-center cursor-pointer"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasMoreMats && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={() => fetchMaterials(false)}
                        disabled={loadingMore}
                        className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-2 border border-white/5 cursor-pointer"
                      >
                        {loadingMore ? <Loader2 size={12} className="animate-spin" /> : null}
                        Load More Materials
                      </button>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmMat && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirmMat(null)}>
          <div 
            className="bg-[#160d21]/95 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(239,68,68,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Permanently Delete File?</h3>
                <p className="text-xs text-gray-400">This will remove it from drive & database forever</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-5">
              <p className="text-sm text-gray-300">
                Are you sure you want to permanently delete <span className="text-red-400 font-semibold">&quot;{deleteConfirmMat.title || deleteConfirmMat.fileName}&quot;</span>?
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirmMat(null)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handlePermanentDelete}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-500/30 transition-all text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
