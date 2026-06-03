"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CheckCircle2, Trash2, Ban, Loader2, ShieldAlert, FileText,
  Eye, Download, X, FileIcon, ImageIcon
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { recalculateLeaderboards } from "@/lib/leaderboard";
import { getDownloadHref, getDrivePreviewUrl } from "@/lib/driveUtils";
import { notifyUser } from "@/lib/notifications";


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
  const downloadHref = getDownloadHref(mat);

  // Determine the best preview URL
  const previewUrl: string | null = (() => {
    if (mat.fileId) return getDrivePreviewUrl(mat.fileId);
    // Legacy fileUrl – try to convert to preview mode
    if (mat.fileUrl) {
      const m = mat.fileUrl.match(/\/d\/([\w-]+)/);
      if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
      return mat.fileUrl;
    }
    return null;
  })();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border border-white/10"
        style={{ background: "rgba(15,15,25,0.97)" }}
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

          {/* Download button */}
          <a
            href={downloadHref}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            <Download size={13} /> Download
          </a>

          {/* Close */}
          <button
            onClick={onClose}
            className="ml-1 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto min-h-0 bg-black/30">
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
              <FileIcon size={40} className="opacity-30" />
              <p className="text-sm">No preview available.</p>
              <a href={downloadHref} download className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                Download to view
              </a>
            </div>
          ) : isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain mx-auto block"
            />
          ) : (
            <iframe
              src={previewUrl}
              title={fileName}
              className="w-full"
              style={{ height: "70vh", border: "none" }}
              allow="autoplay"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */

export default function AdminReviewsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewMat, setPreviewMat] = useState<Material | null>(null);
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
      snap.forEach(d => mats.push({ id: d.id, ...d.data() } as Material));
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
      const mat = materials.find(m => m.id === id);
      await updateDoc(doc(db, "materials", id), { status: "approved" });

      if (mat?.uploaderId) {
        await updateDoc(doc(db, "users", mat.uploaderId), {
          uploads: increment(1),
          points: increment(10),
          seasonUploads: increment(1),
          seasonPoints: increment(10)
        });
        await recalculateLeaderboards(db);

        // Notify the uploader
        await notifyUser(
          db,
          mat.uploaderId,
          "Material Approved! ✅",
          `Your material '${mat.title || mat.fileName || "Untitled"}' has been approved and is now visible to students.`,
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

  const handleDelete = async (mat: Material) => {
    if (!confirm(`Are you sure you want to permanently delete "${mat.title}"?`)) return;
    setActionLoading(mat.id);
    try {
      if (mat.fileId) {
        const token = user ? await user.getIdToken() : "";
        const res = await fetch(`/api/upload?fileId=${mat.fileId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) {
          const resData = await res.json();
          throw new Error(resData.error || "Failed to delete file from Google Drive");
        }
      }
      await deleteDoc(doc(db, "materials", mat.id));

      // Notify the uploader that their material was not approved
      if (mat.uploaderId) {
        await notifyUser(
          db,
          mat.uploaderId,
          "Material Not Approved",
          `Your material '${mat.title || mat.fileName || "Untitled"}' was not approved and has been removed.`,
          "material_rejected"
        );
      }

      setMaterials(prev => prev.filter(m => m.id !== mat.id));
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
    try {
      await updateDoc(doc(db, "users", uid), { status: "blocked", role: "student" });
      alert("User blocked successfully. They can no longer login.");
    } catch (err) {
      console.error("Block user error:", err);
      alert("Failed to block user.");
    }
  };

  const closePreview = useCallback(() => setPreviewMat(null), []);

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
            <p className="text-gray-400">Review and moderate study materials submitted by contributors.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-amber-400" size={40} />
          </div>
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
                  <div
                    key={mat.id}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-colors flex flex-col xl:flex-row gap-6"
                  >
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
                        <div className="w-px h-4 bg-white/10 hidden sm:block" />
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[8px] font-bold text-indigo-400">
                            {mat.uploaderName?.charAt(0).toUpperCase() || "?"}
                          </span>
                          By: <span className="text-white font-medium">{mat.uploaderName || "Unknown Contributor"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions — Approve | View File | Delete (+ Block) */}
                    <div className="flex flex-col sm:flex-row xl:flex-col gap-2 flex-shrink-0 justify-center">
                      {/* Row 1: Approve */}
                      <div className="flex gap-2">
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
                      </div>

                      {/* Row 2: View File | Delete | Block */}
                      <div className="flex gap-2">
                        {/* View File → opens preview modal */}
                        <button
                          onClick={() => setPreviewMat(mat)}
                          className="flex-1 xl:flex-none px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors border border-cyan-500/20 flex items-center justify-center gap-1.5 text-xs font-medium"
                        >
                          <Eye size={14} /> View File
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(mat)}
                          disabled={actionLoading === mat.id}
                          className="flex-1 xl:flex-none px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20 flex items-center justify-center gap-1.5 text-xs font-medium"
                        >
                          <Trash2 size={14} /> Delete
                        </button>

                        {/* Block user */}
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
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
