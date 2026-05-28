"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSubjects } from "@/context/SubjectsContext";
import { Search, Edit2, Trash2, ExternalLink, Copy, AlertTriangle, X, Loader2, CheckCircle2, FileText, Plus, BookOpen } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { recalculateLeaderboards } from "@/lib/leaderboard";


interface Material {
  id: string;
  semesterId: string;
  subjectId: string;
  title: string;
  category: string;
  fileUrl: string;
  fileId: string;
  fileName: string;
  createdAt: number;
  status?: string;
  uploaderId?: string;
}

export default function ManageMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSem, setFilterSem] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // Modals
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [deletingMat, setDeletingMat] = useState<Material | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { subjects: dynamicSubjects } = useSubjects();
  const { showToast } = useToast();

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "materials"));
      const mats: Material[] = [];
      snap.forEach(doc => {
        mats.push({ id: doc.id, ...doc.data() } as Material);
      });
      // Sort by newest first
      mats.sort((a, b) => b.createdAt - a.createdAt);
      setMaterials(mats);
    } catch (err) {
      console.error("Error fetching materials:", err);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingMat) return;
    setActionLoading(true);
    try {
      // 1. Delete physical file from Google Drive via backend API
      if (deletingMat.fileId) {
        const token = user ? await user.getIdToken() : "";
        const res = await fetch(`/api/upload?fileId=${deletingMat.fileId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!res.ok) {
          const resData = await res.json();
          throw new Error(resData.error || "Failed to delete file from Google Drive");
        }
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, "materials", deletingMat.id));
      
      // Decrement uploader's stats in Firestore if it was an approved material
      if (deletingMat.status === "approved" && deletingMat.uploaderId) {
        await updateDoc(doc(db, "users", deletingMat.uploaderId), {
          uploads: increment(-1),
          points: increment(-10),
          seasonUploads: increment(-1),
          seasonPoints: increment(-10)
        });
        // Update pre-aggregated leaderboard documents
        await recalculateLeaderboards(db);
      }

      // Update local state
      setMaterials(prev => prev.filter(m => m.id !== deletingMat.id));
      setDeletingMat(null);
      
      showToast("Material deleted successfully", "success");
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast(err.message || "Failed to delete material.", "error");
    }
    setActionLoading(false);
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
      
      // Update local state
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

  // Filter Logic
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title?.toLowerCase().includes(searchTerm.toLowerCase()) || m.fileName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSem = filterSem ? m.semesterId === filterSem : true;
    const matchesSub = filterSub ? m.subjectId === filterSub : true;
    const matchesCat = filterCat ? m.category === filterCat : true;
    return matchesSearch && matchesSem && matchesSub && matchesCat;
  });

  // Current subjects for edit modal
  const editSubjects = editingMat?.semesterId ? dynamicSubjects[editingMat.semesterId] || [] : [];
  const filterSubjects = filterSem ? dynamicSubjects[filterSem] || [] : [];

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="text-[color:var(--primary-400)]" /> Manage Materials
          </h1>
          <p className="text-gray-400">View, edit, and manage all uploaded resources.</p>
        </div>
        <div className="flex gap-3">
          <a href="/admin/upload" className="bg-[color:var(--primary-600)] hover:bg-[color:var(--primary-500)] text-white font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 text-sm">
            <Plus size={16} /> Upload New
          </a>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl mb-8 flex flex-col md:flex-row gap-4 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by title or filename..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[color:var(--primary-500)]/50 focus:bg-white/5 transition-all"
          />
        </div>
        
        <select value={filterSem} onChange={(e) => { setFilterSem(e.target.value); setFilterSub(""); }} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-[color:var(--primary-500)]/50 cursor-pointer">
          <option value="" className="bg-[#0a0714] text-white">All Semesters</option>
          {Array.from({ length: 8 }, (_, i) => i + 1).map(sem => (
            <option key={sem} value={sem.toString()} className="bg-[#0a0714] text-white">Semester {sem}</option>
          ))}
        </select>

        <select value={filterSub} onChange={(e) => setFilterSub(e.target.value)} disabled={!filterSem} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-[color:var(--primary-500)]/50 disabled:opacity-50 cursor-pointer">
          <option value="" className="bg-[#0a0714] text-white">All Subjects</option>
          {filterSubjects.map((sub: any) => (
            <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
          ))}
        </select>

        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-[color:var(--primary-500)]/50 cursor-pointer">
          <option value="" className="bg-[#0a0714] text-white">All Categories</option>
          <option value="pyq" className="bg-[#0a0714] text-white">PYQs</option>
          <option value="notes" className="bg-[#0a0714] text-white">Notes</option>
          <option value="questions" className="bg-[#0a0714] text-white">Important Qs</option>
        </select>
      </div>

      {/* Materials Grid / List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[color:var(--primary-400)]">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p>Loading database...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center flex flex-col items-center border border-white/5">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
            <FileText size={32} className="text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Materials Found</h3>
          <p className="text-gray-400 max-w-sm">Try adjusting your search or filter parameters to find what you're looking for.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMaterials.map((mat) => (
            <div key={mat.id} className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-[color:var(--primary-500)]/30 hover:bg-white/[0.03] transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--primary-400)] mb-1">
                    Sem {mat.semesterId} • {mat.category.toUpperCase()}
                  </span>
                  <h3 className="text-white font-bold leading-tight line-clamp-2" title={mat.title}>{mat.title}</h3>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingMat(mat)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => setDeletingMat(mat)} className="p-2 hover:bg-rose-500/20 rounded-lg text-gray-400 hover:text-rose-400 transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-gray-400 mb-4 line-clamp-1">
                <span className="font-medium text-gray-300">Subject:</span> {mat.subjectId}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-[10px] text-gray-500">
                  {new Date(mat.createdAt).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => copyToClipboard(mat.fileUrl, mat.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
                  >
                    {copiedId === mat.id ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copiedId === mat.id ? "Copied" : "Copy"}
                  </button>
                  <a 
                    href={mat.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--primary-500)]/10 hover:bg-[color:var(--primary-500)]/20 border border-[color:var(--primary-500)]/20 text-xs font-medium text-[color:var(--primary-300)] transition-colors"
                  >
                    View <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editing Modal */}
      {editingMat && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#05030a]/90 backdrop-blur-sm" onClick={() => !actionLoading && setEditingMat(null)}></div>
          <div className="relative w-full max-w-lg bg-[#0a0714] border border-white/10 rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Edit Material</h2>
              <button onClick={() => setEditingMat(null)} disabled={actionLoading} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                <input required type="text" value={editingMat.title} onChange={e => setEditingMat({...editingMat, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[color:var(--primary-500)]/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Semester</label>
                  <select required value={editingMat.semesterId} onChange={e => setEditingMat({...editingMat, semesterId: e.target.value, subjectId: dynamicSubjects[e.target.value]?.[0]?.id || ""})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[color:var(--primary-500)]/50 cursor-pointer">
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(sem => (
                      <option key={sem} value={sem.toString()} className="bg-[#0a0714] text-white">Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
                  <select required value={editingMat.subjectId} onChange={e => setEditingMat({...editingMat, subjectId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[color:var(--primary-500)]/50 cursor-pointer">
                    {editSubjects.map((sub: any) => (
                      <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <select required value={editingMat.category} onChange={e => setEditingMat({...editingMat, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-[color:var(--primary-500)]/50 cursor-pointer">
                  <option value="pyq" className="bg-[#0a0714] text-white">PYQ</option>
                  <option value="notes" className="bg-[#0a0714] text-white">Notes</option>
                  <option value="questions" className="bg-[#0a0714] text-white">Important Qs</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingMat(null)} disabled={actionLoading} className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 rounded-xl font-medium text-sm bg-[color:var(--primary-600)] hover:bg-[color:var(--primary-500)] text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] transition-all flex items-center gap-2">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deletion Modal */}
      {deletingMat && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#05030a]/90 backdrop-blur-sm" onClick={() => !actionLoading && setDeletingMat(null)}></div>
          <div className="relative w-full max-w-md bg-rose-950/20 border border-rose-500/20 rounded-[2rem] shadow-[0_0_50px_rgba(225,29,72,0.1)] p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-rose-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Delete Material?</h2>
            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to permanently delete <strong className="text-gray-200">{deletingMat.title}</strong>? 
              This will remove the metadata from Firestore and delete the physical file from Google Drive. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeletingMat(null)} disabled={actionLoading} className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-300 hover:bg-white/5 transition-colors border border-white/5">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={actionLoading} className="px-5 py-2.5 rounded-xl font-medium text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all flex items-center gap-2">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Yes, Delete File"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
