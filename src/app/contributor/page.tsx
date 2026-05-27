"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Trophy, Upload, FileText, Edit2, ExternalLink, Copy, CheckCircle2, Loader2, BookOpen, Award, Target } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";

interface Material {
  id: string;
  semesterId: string;
  subjectId: string;
  title: string;
  category: string;
  fileUrl: string;
  createdAt: number;
  status?: string;
}

export default function ContributorDashboardPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { subjects: dynamicSubjects } = useSubjects();

  useEffect(() => {
    if (user) {
      fetchMyUploads();
    }
  }, [user]);

  const fetchMyUploads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "materials"), where("uploaderId", "==", user.uid));
      const snap = await getDocs(q);
      const mats: Material[] = [];
      snap.forEach(doc => mats.push({ id: doc.id, ...doc.data() } as Material));
      
      // Sort by newest
      mats.sort((a, b) => b.createdAt - a.createdAt);
      setMaterials(mats);
    } catch (err) {
      console.error("Error fetching my uploads:", err);
    }
    setLoading(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMat) return;
    setActionLoading(true);
    try {
      const ref = doc(db, "materials", editingMat.id);
      await updateDoc(ref, {
        title: editingMat.title,
        semesterId: editingMat.semesterId,
        subjectId: editingMat.subjectId,
        category: editingMat.category
      });
      
      setMaterials(prev => prev.map(m => m.id === editingMat.id ? editingMat : m));
      setEditingMat(null);
    } catch (err) {
      console.error("Edit error:", err);
      alert("Error updating material.");
    }
    setActionLoading(false);
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const editSubjects = editingMat?.semesterId ? dynamicSubjects[editingMat.semesterId] || [] : [];

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Contributions</h1>
          <p className="text-gray-400">View and edit the study materials you have shared with the community.</p>
        </div>
        <div className="flex gap-3">
          <a href="/contributor/upload" className="bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(232,121,249,0.3)] hover:shadow-[0_0_30px_rgba(232,121,249,0.5)] flex items-center gap-2 text-sm">
            <Upload size={16} /> Upload New Material
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-fuchsia-500/10 blur-2xl rounded-full"></div>
          <div className="w-14 h-14 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
          <div>
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Uploads</h3>
            <p className="text-3xl font-bold text-white">{materials.length}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 blur-2xl rounded-full"></div>
          <div className="w-14 h-14 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Target size={24} />
          </div>
          <div>
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Impact Status</h3>
            <p className="text-xl font-bold text-emerald-400">Active Contributor</p>
          </div>
        </div>
      </div>

      {/* Uploads List */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <FileText className="text-gray-400" size={20} /> Upload History
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-fuchsia-400" size={32} />
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            You haven't uploaded any materials yet. Head over to Upload Material to start contributing!
          </div>
        ) : (
          <div className="space-y-4">
            {materials.map(mat => (
              <div key={mat.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded">
                      Sem {mat.semesterId}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">
                      {mat.category}
                    </span>
                    {mat.status === "pending" && (
                      <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 whitespace-nowrap shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse tracking-wide font-mono ml-2">
                        Pending Review
                      </span>
                    )}
                    {mat.status === "approved" && (
                      <span className="text-[10px] font-semibold bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 text-fuchsia-300 px-2.5 py-0.5 rounded-full border border-fuchsia-500/20 whitespace-nowrap tracking-wide ml-2">
                        Community Upload
                      </span>
                    )}
                    {mat.status === "rejected" && (
                      <span className="text-[10px] font-bold bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/40 whitespace-nowrap shadow-[0_0_10px_rgba(244,63,94,0.15)] font-mono ml-2">
                        Rejected
                      </span>
                    )}
                  </div>
                  <h4 className="text-white font-medium text-lg leading-tight mb-1 truncate">{mat.title}</h4>
                  <p className="text-xs text-gray-500 truncate">Subject: {mat.subjectId} • Uploaded: {new Date(mat.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-2 md:self-center flex-wrap flex-shrink-0 mt-4 md:mt-0">
                  {(!mat.status || mat.status === "pending") ? (
                    <button onClick={() => setEditingMat(mat)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors border border-white/5" title="Edit Metadata">
                      <Edit2 size={14} /> Edit
                    </button>
                  ) : (
                    <button disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 opacity-50 cursor-not-allowed text-xs font-medium text-gray-500 border border-white/5" title="Approved or Rejected materials cannot be edited">
                      <Edit2 size={14} /> Edit Locked
                    </button>
                  )}
                  <button onClick={() => copyToClipboard(mat.fileUrl, mat.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors border border-white/5">
                    {copiedId === mat.id ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedId === mat.id ? "Copied" : "Copy"}
                  </button>
                  <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-medium text-cyan-400 transition-colors border border-cyan-500/20">
                    View <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editing Modal */}
      {editingMat && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#05030a]/90 backdrop-blur-sm" onClick={() => !actionLoading && setEditingMat(null)}></div>
          <div className="relative w-full max-w-lg bg-[#0a0714] border border-fuchsia-500/20 rounded-[2rem] shadow-[0_0_50px_rgba(217,70,239,0.1)] p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-6">Edit Upload Metadata</h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                <input required type="text" value={editingMat.title} onChange={e => setEditingMat({...editingMat, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-fuchsia-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Semester</label>
                  <select required value={editingMat.semesterId} onChange={e => setEditingMat({...editingMat, semesterId: e.target.value, subjectId: dynamicSubjects[e.target.value]?.[0]?.id || ""})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-fuchsia-500/50 cursor-pointer">
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(sem => (
                      <option key={sem} value={sem.toString()} className="bg-[#0a0714] text-white">Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
                  <select required value={editingMat.subjectId} onChange={e => setEditingMat({...editingMat, subjectId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-fuchsia-500/50 cursor-pointer">
                    {editSubjects.map((sub: any) => (
                      <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <select required value={editingMat.category} onChange={e => setEditingMat({...editingMat, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-fuchsia-500/50 cursor-pointer">
                  <option value="pyq" className="bg-[#0a0714] text-white">PYQ</option>
                  <option value="notes" className="bg-[#0a0714] text-white">Notes</option>
                  <option value="questions" className="bg-[#0a0714] text-white">Important Qs</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingMat(null)} disabled={actionLoading} className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 rounded-xl font-medium text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all flex items-center gap-2">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
