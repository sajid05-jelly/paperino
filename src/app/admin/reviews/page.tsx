"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, getDocs, doc, updateDoc, deleteDoc, increment, writeBatch, serverTimestamp, getDoc, where, startAfter, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CheckCircle2, Trash2, Ban, Loader2, ShieldAlert, FileText,
  Eye, Download, X, FileIcon, ImageIcon, RotateCcw, AlertOctagon,
  Calendar, UserCheck, Sparkles
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { recalculateLeaderboards, updateLeaderboardForUser } from "@/lib/leaderboard";
import { getDownloadHref, getDrivePreviewUrl, triggerSecureDownload } from "@/lib/driveUtils";
import { notifyUser } from "@/lib/notifications";
import UserAvatar from "@/components/UserAvatar";
import { logAdminAction } from "@/lib/admin-logger";
import DocPreviewViewer from "@/components/DocPreviewViewer";

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
  status?: string;
}

/* ─── Preview Modal ──────────────────────────────────────────────── */

interface PreviewModalProps {
  mat: Material;
  onClose: () => void;
}

function PreviewModal({ mat, onClose }: PreviewModalProps) {
  const fileName = mat.fileName || mat.title || "File";
  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileName);
  const { showToast, dismissToast } = useToast();
  const downloadHref = getDownloadHref(mat);

  const previewUrl: string | null = (() => {
    if (mat.fileId) return getDrivePreviewUrl(mat.fileId);
    if (mat.fileUrl) {
      const m = mat.fileUrl.match(/\/d\/([\w-]+)/);
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
      return mat.fileUrl;
    }
    return null;
  })();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-[#0f0f19]/95 backdrop-blur-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            {isImage ? <ImageIcon size={16} className="text-cyan-400" /> : <FileIcon size={16} className="text-cyan-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate text-sm">{fileName}</p>
            <p className="text-gray-500 text-xs mt-0.5">{mat.category} · Sem {mat.semesterId}</p>
          </div>

          <button
            onClick={() => triggerSecureDownload(mat, showToast, dismissToast)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Download size={13} /> Download
          </button>

          <button
            onClick={onClose}
            className="ml-1 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto min-h-0 bg-black/30 h-[70vh]">
          <DocPreviewViewer
            mat={mat}
            onDownload={() => triggerSecureDownload(mat, showToast, dismissToast)}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "insights" | "rejected">("pending");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [pendingInsights, setPendingInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewMat, setPreviewMat] = useState<Material | null>(null);

  // Pagination State for Materials
  const [lastVisibleMat, setLastVisibleMat] = useState<any>(null);
  const [hasMoreMats, setHasMoreMats] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Permanent Delete Modal State
  const [deleteConfirmMat, setDeleteConfirmMat] = useState<Material | null>(null);
  
  const { showToast } = useToast();

  useEffect(() => {
    if (activeTab === "insights") {
      fetchPendingInsights();
    } else {
      fetchMaterials(true);
    }
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

      // Sort chronologically descending client-side
      mats.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      if (snap.docs.length < 15) {
        setHasMoreMats(false);
      } else {
        setLastVisibleMat(snap.docs[snap.docs.length - 1]);
      }

      setMaterials(prev => {
        const combined = reset ? mats : [...prev, ...mats];
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

  const fetchPendingInsights = async () => {
    try {
      const q = query(
        collection(db, "survival_notes"),
        where("status", "==", "pending")
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      
      const userIds = new Set<string>();
      snap.forEach(d => {
        const data = d.data();
        if (data.contributorId) userIds.add(data.contributorId);
      });
      
      const userAvatars: Record<string, string> = {};
      if (userIds.size > 0) {
        const uids = Array.from(userIds);
        const userPromises = uids.map(uid => getDoc(doc(db, "users", uid)));
        const userSnaps = await Promise.all(userPromises);
        userSnaps.forEach(us => {
          if (us.exists()) {
            const udata = us.data();
            userAvatars[us.id] = udata.paperinoAvatar || "";
          }
        });
      }

      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          ...data,
          paperinoAvatar: userAvatars[data.contributorId] || null
        });
      });
      list.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return bTime - aTime;
      });
      setPendingInsights(list);
    } catch (err) {
      console.error("Error fetching pending insights:", err);
    }
  };

  const handleApproveInsight = async (note: any) => {
    setActionLoading(note.id);
    try {
      await updateDoc(doc(db, "survival_notes", note.id), { status: "approved" });
      if (note.contributorId) {
        await updateDoc(doc(db, "users", note.contributorId), {
          contributionPoints: increment(15),
          uploads: increment(1)
        });
      }
      setPendingInsights(prev => prev.filter(n => n.id !== note.id));
      showToast("Senior Insight approved successfully!", "success");
      logAdminAction(user?.email || "unknown", "APPROVE_INSIGHT", note.id, `Approved insight: ${note.title || "Untitled"}`);
    } catch (err) {
      console.error("Approve insight error:", err);
      showToast("Failed to approve insight", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectInsight = async (noteId: string) => {
    setActionLoading(noteId);
    try {
      await deleteDoc(doc(db, "survival_notes", noteId));
      setPendingInsights(prev => prev.filter(n => n.id !== noteId));
      showToast("Senior Insight rejected and deleted", "success");
    } catch (err) {
      console.error("Reject insight error:", err);
      showToast("Failed to reject insight", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const mat = materials.find(m => m.id === id);
      if (!mat) throw new Error("Material not found.");

      // 1. Approve material status & ensure Google Drive public sharing permission
      if (mat.fileId && user) {
        try {
          const token = await user.getIdToken();
          await fetch("/api/upload", {
            method: "PATCH",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ fileId: mat.fileId })
          });
        } catch (e) {
          console.warn("[Admin Review] Drive permission patch skipped:", e);
        }
      }

      await updateDoc(doc(db, "materials", id), { status: "approved" });
      logAdminAction(user?.email || "unknown", "APPROVE_MATERIAL", id, `Approved material: ${mat.title || mat.fileName}`);

      if (mat.uploaderId) {
        const userRef = doc(db, "users", mat.uploaderId);
        const udoc = await getDoc(userRef);
        const udata = udoc.data() || {};

        const allowedAdminsList = [
          "mohamedsajid.sa@gmail.com",
          "sudharajsekar2005@gmail.com",
          "admin.paperinoirfan27@gmail.com",
          "admin.paperinosam14@gmail.com",
          "gameplayitlifeitis@gmail.com"
        ];
        const isUploaderAdmin = udata.role === "admin" || (udata.email && allowedAdminsList.includes(udata.email.toLowerCase()));

        if (!isUploaderAdmin) {
          // Increment approved contribution count & points (+10 contribution points) for non-admins
          const currentUploads = Math.max(0, (udata.uploads || 0) + 1);
          const currentPoints = Math.max(0, (udata.contributionPoints || 0) + 10);
          
          const updates: Record<string, any> = {
            uploads: currentUploads,
            points: increment(10), // legacy backwards compatibility
            seasonUploads: increment(1),
            seasonPoints: increment(10),
            contributionPoints: currentPoints
          };

          // Determine badge tier
          let badgeLevel: "contributor" | "active" | "elite" | "" = "contributor";
          if (currentUploads >= 20) {
            badgeLevel = "elite";
          } else if (currentUploads >= 5) {
            badgeLevel = "active";
          }
          updates.contributorLevel = badgeLevel;

          // Premium Rewarding Stacking Rules
          let premiumDurationDays = 0;
          if (currentUploads === 5) premiumDurationDays = 10;
          else if (currentUploads === 10) premiumDurationDays = 10;
          else if (currentUploads === 15) premiumDurationDays = 10;
          else if (currentUploads === 20) premiumDurationDays = 30; // 30 Days bonus

          if (premiumDurationDays > 0) {
            const now = new Date();
            let currentPremiumEnd = udata.premiumEndDate?.toDate ? udata.premiumEndDate.toDate() : (udata.premiumEndDate ? new Date(udata.premiumEndDate) : null);
            
            let premiumStartDate = now;
            let premiumEndDate = new Date();

            if (currentPremiumEnd && currentPremiumEnd > now) {
              // Stack premium if already active
              premiumStartDate = udata.premiumStartDate?.toDate ? udata.premiumStartDate.toDate() : new Date(udata.premiumStartDate);
              premiumEndDate = new Date(currentPremiumEnd.getTime() + (premiumDurationDays * 24 * 60 * 60 * 1000));
            } else {
              // Start fresh premium
              premiumEndDate = new Date(now.getTime() + (premiumDurationDays * 24 * 60 * 60 * 1000));
            }

            updates.premiumStartDate = premiumStartDate;
            updates.premiumEndDate = premiumEndDate;

            // Notify user about Premium
            await notifyUser(
              db,
              mat.uploaderId,
              "Premium Unlocked! 🚀",
              `Congrats! Your ${currentUploads}th approved upload unlocked +${premiumDurationDays} Days of Premium benefits!`,
              "premium_unlocked"
            );
          }

          await updateDoc(userRef, updates);
        }

        await recalculateLeaderboards(db);

        // Notify the uploader
        await notifyUser(
          db,
          mat.uploaderId,
          "Material Approved! ✅",
          `Your material '${mat.title || mat.fileName || "Untitled"}' has been approved and is now live.`,
          "material_approved"
        );
      }

      setMaterials(prev => prev.filter(m => m.id !== id));
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
      const mat = materials.find(m => m.id === id);
      if (!mat) throw new Error("Material not found.");

      // Set status to rejected and rejectedAt timestamp (stays in Rejected Queue for 7 days)
      await updateDoc(doc(db, "materials", id), { 
        status: "rejected",
        rejectedAt: Date.now()
      });
      logAdminAction(user?.email || "unknown", "REJECT_MATERIAL", id, `Rejected material: ${mat.title || mat.fileName}`);

      // Update local state item status
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, status: "rejected", rejectedAt: Date.now() } : m));

      // Notify the uploader that their material was rejected
      if (mat.uploaderId) {
        await notifyUser(
          db,
          mat.uploaderId,
          "Material Rejected ❌",
          `Your material '${mat.title || mat.fileName || "Untitled"}' has been rejected and moved to review.`,
          "material_rejected"
        );
      }

      showToast("Material moved to Rejected queue", "info");
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
      
      // 2. Delete document from Firestore
      await deleteDoc(doc(db, "materials", mat.id));

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
      const snap = await getDocs(collection(db, "materials"));
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

  const closePreview = useCallback(() => setPreviewMat(null), []);

  const filteredMaterials = materials.filter(m => {
    if (activeTab === "pending") return !m.status || m.status === "pending";
    if (activeTab === "rejected") return m.status === "rejected";
    return true;
  });

  return (
    <>
      {/* Preview Modal */}
      {previewMat && <PreviewModal mat={previewMat} onClose={closePreview} />}

      <div className="w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <ShieldAlert className="text-amber-400" /> Pending Upload Reviews
            </h1>
            <p className="text-gray-400">Review and moderate study materials and senior insights submitted by contributors.</p>
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
            onClick={() => setActiveTab("insights")} 
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${activeTab === "insights" ? "bg-violet-500/10 border-violet-500/30 text-violet-400" : "bg-white/5 border-transparent text-gray-400 hover:text-white"}`}
          >
            Senior Insights ({pendingInsights.length})
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
                {activeTab === "insights" && "Senior Insights Pending Review"}
                {activeTab === "rejected" && "Rejected Materials (Deletes in 7 days)"}
              </h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                activeTab === "pending" ? "bg-amber-500/20 text-amber-400" :
                activeTab === "insights" ? "bg-violet-500/20 text-violet-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {activeTab === "insights" ? pendingInsights.length : filteredMaterials.length} Items
              </span>
            </div>

            {/* ── Tab: Senior Insights Pending Review ── */}
            {activeTab === "insights" ? (
              pendingInsights.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="text-emerald-400" size={32} />
                  </div>
                  <p className="text-lg font-medium text-white mb-1">All clean!</p>
                  <p className="text-gray-500">There are no pending senior insights to review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {pendingInsights.map((insight) => (
                    <div 
                      key={insight.id} 
                      className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-500/30 transition-colors flex flex-col gap-4 relative"
                    >
                      {/* Submitter profile header */}
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar avatarId={insight.paperinoAvatar} className="w-10 h-10 border border-white/10" size={18} />
                          <div>
                            <p className="text-white font-bold text-sm">{insight.contributorName || "Anonymous Senior"}</p>
                            <p className="text-[10px] text-gray-500">
                              Submitted: {insight.createdAt?.toDate ? insight.createdAt.toDate().toLocaleString() : new Date(insight.createdAt || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/25 text-violet-300 rounded-full text-[10px] font-bold tracking-wide uppercase">
                          {insight.category}
                        </span>
                      </div>

                      {/* Course / Subject metadata labels */}
                      <div className="flex flex-wrap gap-2.5">
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-400 uppercase font-bold">
                          DEPT: {insight.departmentId}
                        </span>
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-400 uppercase font-bold">
                          SEM: {insight.semesterId}
                        </span>
                        <span className="bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded text-[10px] text-violet-300 uppercase font-bold">
                          SUBJECT: {insight.subjectId}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line font-medium">
                          {insight.content}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-4">
                        <button
                          onClick={() => handleRejectInsight(insight.id)}
                          disabled={actionLoading !== null}
                          className="px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          {actionLoading === insight.id ? <Loader2 size={12} className="animate-spin" /> : <span>✗ Reject</span>}
                        </button>
                        <button
                          onClick={() => handleApproveInsight(insight)}
                          disabled={actionLoading !== null}
                          className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        >
                          {actionLoading === insight.id ? <Loader2 size={12} className="animate-spin" /> : <span>✓ Approve</span>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ── Tab: Materials pending or rejected ── */
              filteredMaterials.length === 0 ? (
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
                        {activeTab === "pending" ? (
                          <button
                            onClick={() => handleApprove(mat.id)}
                            disabled={actionLoading === mat.id}
                            className="flex-1 xl:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 text-sm"
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
                            className="flex-1 xl:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            {actionLoading === mat.id
                              ? <Loader2 size={16} className="animate-spin" />
                              : <RotateCcw size={16} />}
                            Restore
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewMat(mat)}
                            className="flex-1 xl:flex-none px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors border border-cyan-500/20 flex items-center justify-center gap-1.5 text-xs font-medium"
                          >
                            <Eye size={14} /> View File
                          </button>

                          {activeTab === "pending" ? (
                            <button
                              onClick={() => handleReject(mat.id)}
                              disabled={actionLoading === mat.id}
                              className="flex-1 xl:flex-none px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors border border-orange-500/20 flex items-center justify-center gap-1.5 text-xs font-medium"
                            >
                              <Ban size={14} /> Reject
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmMat(mat)}
                              disabled={actionLoading === mat.id}
                              className="flex-1 xl:flex-none px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 flex items-center justify-center gap-1.5 text-xs font-medium"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}

                          {mat.uploaderId && (
                            <button
                              onClick={() => handleBlockUser(mat.uploaderId!)}
                              disabled={actionLoading !== null}
                              title="Block this contributor from Paperino"
                              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 flex items-center justify-center"
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
              )
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
