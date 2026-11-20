"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logFirestoreRead } from "@/lib/firestoreDiagnostics";
import { FileText, Loader2, Download, Edit2, Search, X, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSubjects } from "@/context/SubjectsContext";
import { useToast } from "@/components/Toast";
import { triggerSecureDownload } from "@/lib/driveUtils";

interface Material {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileId: string;
  subjectId: string;
  semesterId: string;
  departmentId?: string;
  status: string;
  uploaderName?: string;
  uploaderId?: string;
  createdAt?: any;
}

export default function ManageMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters: Long search term + optional Category filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // Modals
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const { allSubjectsList } = useSubjects();
  const { showToast, dismissToast } = useToast();

  // Fetch all materials across all subjects directly (no department or semester gating)
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      logFirestoreRead("materials", "Admin fetch: all materials limit(1000)");
      const q = query(collection(db, "materials"), limit(1000));
      const snap = await getDocs(q);
      const mats: Material[] = [];
      snap.forEach(d => {
        mats.push({ id: d.id, ...d.data() } as Material);
      });
      // Sort newest first client-side
      mats.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setMaterials(mats);
    } catch (err) {
      console.error("Error fetching materials:", err);
      showToast("Failed to fetch materials.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this study material?")) return;
    try {
      await deleteDoc(doc(db, "materials", id));
      setMaterials(prev => prev.filter(m => m.id !== id));
      showToast("Material deleted successfully.", "success");
    } catch (err) {
      console.error("Error deleting material:", err);
      showToast("Failed to delete material.", "error");
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMat) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "materials", editingMat.id), {
        title: editingMat.title.trim(),
        category: editingMat.category,
        subjectId: editingMat.subjectId,
      });
      
      setMaterials(prev => prev.map(m => m.id === editingMat.id ? editingMat : m));
      showToast("Material updated successfully.", "success");
      setEditingMat(null);
    } catch (err) {
      console.error("Error updating material:", err);
      showToast("Failed to update material.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Real-time filter across subject name, code, title, and filename
  const filteredMaterials = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    return materials.filter(m => {
      const subjectObj = allSubjectsList.find(s => 
        s.id === m.subjectId || 
        s.id.toLowerCase() === (m.subjectId || "").toLowerCase()
      );
      const subjectName = (subjectObj?.name || "").toLowerCase();
      const subjectCode = (subjectObj?.code || "").toLowerCase();
      const subjectId = (m.subjectId || "").toLowerCase();
      const title = (m.title || "").toLowerCase();
      const fileName = (m.fileName || "").toLowerCase();

      const matchesSearch = !searchLower || (
        subjectName.includes(searchLower) ||
        subjectCode.includes(searchLower) ||
        subjectId.includes(searchLower) ||
        title.includes(searchLower) ||
        fileName.includes(searchLower)
      );

      const matchesCat = filterCat ? m.category === filterCat : true;

      return matchesSearch && matchesCat;
    });
  }, [materials, searchTerm, filterCat, allSubjectsList]);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="text-purple-400" /> Manage Study Materials
          </h1>
          <p className="text-gray-400 text-sm">
            Search, view, download, or edit study materials across all subjects.
          </p>
        </div>
        <div className="text-xs text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full shrink-0">
          {filteredMaterials.length} of {materials.length} Materials
        </div>
      </div>

      {/* Long Elongated Search Bar + Optional Category Filter */}
      <div className="glass-panel p-3.5 rounded-2xl mb-8 flex flex-col sm:flex-row items-center gap-3 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {/* Full-Width Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" size={18} />
          <input 
            type="text" 
            placeholder="Search by subject name, code, title, or filename (e.g. Python, Maths, CLA 1)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-10 py-3 text-sm text-white placeholder-gray-400 outline-none focus:border-purple-500/60 focus:bg-white/5 focus:ring-1 focus:ring-purple-500/30 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="w-full sm:w-auto shrink-0">
          <select 
            value={filterCat} 
            onChange={(e) => setFilterCat(e.target.value)} 
            className="w-full sm:w-auto bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none focus:border-purple-500/50 cursor-pointer"
          >
            <option value="" className="bg-[#0a0714] text-white">All Categories</option>
            <option value="pyq" className="bg-[#0a0714] text-white">PYQ</option>
            <option value="notes" className="bg-[#0a0714] text-white">Notes</option>
            <option value="questions" className="bg-[#0a0714] text-white">Important Questions</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-[2rem] border border-white/5 flex flex-col items-center">
          <FileText size={48} className="text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No materials found</h3>
          <p className="text-gray-400 text-sm">
            {searchTerm ? `No materials matching "${searchTerm}". Try another search query.` : "No study materials available."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMaterials.map(mat => {
            const subjectObj = allSubjectsList.find(s => 
              s.id === mat.subjectId || 
              s.id.toLowerCase() === (mat.subjectId || "").toLowerCase()
            );

            return (
              <div key={mat.id} className="vision-glass p-5 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-1.5 truncate" title={mat.title}>{mat.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    {subjectObj ? (
                      <span className="bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded font-semibold text-[11px]">
                        {subjectObj.name}
                      </span>
                    ) : mat.subjectId ? (
                      <span className="bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded font-semibold text-[11px]">
                        {mat.subjectId}
                      </span>
                    ) : null}

                    {subjectObj?.code && (
                      <span className="bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded text-[10px] font-mono">
                        {subjectObj.code}
                      </span>
                    )}

                    <span className="bg-white/5 px-2 py-0.5 rounded tracking-wider text-[10px] text-gray-400 font-bold border border-white/5">
                      {mat.category.toUpperCase()}
                    </span>
                    <span className="truncate max-w-xs text-gray-400">{mat.fileName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => triggerSecureDownload(mat, showToast, dismissToast)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/5 cursor-pointer" title="Download">
                    <Download size={16} />
                  </button>
                  <button onClick={() => setEditingMat(mat)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/5 cursor-pointer" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  {user?.email === "mohamedsajid.sa@gmail.com" && (
                    <button onClick={() => handleDeleteMaterial(mat.id)} className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 cursor-pointer" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingMat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => !actionLoading && setEditingMat(null)}></div>
          <div className="relative w-full max-w-lg bg-[#07050d] border border-white/10 rounded-[2rem] p-6 shadow-2xl z-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="text-purple-400" size={20} /> Edit Material Details
              </h3>
              <button onClick={() => setEditingMat(null)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" disabled={actionLoading}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                <input required type="text" value={editingMat.title} onChange={e => setEditingMat({...editingMat, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/50" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
                <select 
                  required 
                  value={editingMat.subjectId} 
                  onChange={e => setEditingMat({...editingMat, subjectId: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  {allSubjectsList.map((sub: any) => (
                    <option key={`${sub.id}_${sub.name}`} value={sub.id} className="bg-[#0a0714] text-white">
                      {sub.name} {sub.code ? `(${sub.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <select required value={editingMat.category} onChange={e => setEditingMat({...editingMat, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/50 cursor-pointer">
                  <option value="pyq" className="bg-[#0a0714] text-white">PYQ</option>
                  <option value="notes" className="bg-[#0a0714] text-white">Notes</option>
                  <option value="questions" className="bg-[#0a0714] text-white">Important Questions</option>
                </select>
              </div>

              <button type="submit" disabled={actionLoading} className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
