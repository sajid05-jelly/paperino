"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logFirestoreRead } from "@/lib/firestoreDiagnostics";
import { FileText, Loader2, Download, Edit2, Search, X, Check, CheckCircle2, Trash2 } from "lucide-react";
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
}

export default function ManageMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState(""); // Default: show ALL departments
  const [filterSem, setFilterSem] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // Modals
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { departments, subjects: dynamicSubjects } = useSubjects();
  const { showToast, dismissToast } = useToast();

  // Fetch materials from Firestore — use targeted where() when dept is selected
  // to avoid blind limit() missing non-btech materials.
  const fetchMaterials = async (dept?: string) => {
    setLoading(true);
    try {
      const activeDept = dept !== undefined ? dept : filterDept;
      let q;
      if (activeDept) {
        logFirestoreRead("materials", `Admin fetch: where departmentId == ${activeDept}`);
        q = query(collection(db, "materials"), where("departmentId", "==", activeDept), limit(200));
      } else {
        logFirestoreRead("materials", "Admin fetch: all departments limit(200)");
        q = query(collection(db, "materials"), limit(200));
      }
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
    fetchMaterials(filterDept);
  }, [filterDept]);

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
        semesterId: editingMat.semesterId,
        subjectId: editingMat.subjectId,
        departmentId: editingMat.departmentId || "btech"
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

  // Filter logic
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title?.toLowerCase().includes(searchTerm.toLowerCase()) || m.fileName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept ? (m.departmentId || "btech") === filterDept : true;
    const matchesSem = filterSem ? m.semesterId === filterSem : true;
    const matchesSub = filterSub ? m.subjectId === filterSub : true;
    const matchesCat = filterCat ? m.category === filterCat : true;
    return matchesSearch && matchesDept && matchesSem && matchesSub && matchesCat;
  });

  // Calculate semester counts for active filterDept
  const activeDeptObj = departments.find(d => d.id === filterDept);
  const semCount = activeDeptObj?.totalSemesters || 8;
  const semList = Array.from({ length: semCount }, (_, i) => (i + 1).toString());

  // Subjects lookup
  const filterSubjects = (filterDept && filterSem) ? dynamicSubjects[filterDept]?.[filterSem] || [] : [];
  const editSubjects = editingMat?.semesterId ? dynamicSubjects[editingMat.departmentId || "btech"]?.[editingMat.semesterId] || [] : [];
  const editDeptObj = departments.find(d => d.id === (editingMat?.departmentId || "btech"));
  const editSemCount = editDeptObj?.totalSemesters || 8;
  const editSemList = Array.from({ length: editSemCount }, (_, i) => (i + 1).toString());

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="text-purple-400" /> Manage Study Materials
          </h1>
          <p className="text-gray-400">View and edit details of uploaded study materials on Google Drive.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl mb-8 flex flex-col lg:flex-row gap-4 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by title or filename..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all"
          />
        </div>
        
        <select value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setFilterSem(""); setFilterSub(""); }} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-purple-500/50 cursor-pointer">
          {departments.filter(d => d.status === "approved").map(d => (
            <option key={d.id} value={d.id} className="bg-[#0a0714] text-white">{d.name}</option>
          ))}
        </select>

        <select value={filterSem} onChange={(e) => { setFilterSem(e.target.value); setFilterSub(""); }} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-purple-500/50 cursor-pointer">
          <option value="" className="bg-[#0a0714] text-white">All Semesters</option>
          {semList.map(sem => (
            <option key={sem} value={sem} className="bg-[#0a0714] text-white">Semester {sem}</option>
          ))}
        </select>

        <select value={filterSub} onChange={(e) => setFilterSub(e.target.value)} disabled={!filterSem} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-purple-500/50 disabled:opacity-50 cursor-pointer">
          <option value="" className="bg-[#0a0714] text-white">All Subjects</option>
          {filterSubjects.map((sub: any) => (
            <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
          ))}
        </select>

        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-purple-500/50 cursor-pointer">
          <option value="" className="bg-[#0a0714] text-white">All Categories</option>
          <option value="pyq" className="bg-[#0a0714] text-white">PYQ</option>
          <option value="notes" className="bg-[#0a0714] text-white">Notes</option>
          <option value="questions" className="bg-[#0a0714] text-white">Important Questions</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-[2rem] border border-white/5 flex flex-col items-center">
          <FileText size={48} className="text-gray-600 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No materials found</h3>
          <p className="text-gray-400">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMaterials.map(mat => (
            <div key={mat.id} className="vision-glass p-5 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1.5 truncate" title={mat.title}>{mat.title}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span className="bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider text-[10px] text-gray-400 font-bold border border-white/5">
                    {mat.departmentId || "btech"}
                  </span>
                  <span className="bg-white/5 px-2 py-0.5 rounded tracking-wider text-[10px] text-gray-400 font-bold border border-white/5">
                    SEM {mat.semesterId}
                  </span>
                  <span className="bg-white/5 px-2 py-0.5 rounded tracking-wider text-[10px] text-gray-400 font-bold border border-white/5">
                    {mat.category.toUpperCase()}
                  </span>
                  <span className="truncate max-w-xs">{mat.fileName}</span>
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
          ))}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Semester</label>
                  <select required value={editingMat.semesterId} onChange={e => setEditingMat({...editingMat, semesterId: e.target.value, subjectId: dynamicSubjects[editingMat.departmentId || "btech"]?.[e.target.value]?.[0]?.id || ""})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/50 cursor-pointer">
                    {editSemList.map(sem => (
                      <option key={sem} value={sem} className="bg-[#0a0714] text-white">Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
                  <select required value={editingMat.subjectId} onChange={e => setEditingMat({...editingMat, subjectId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-purple-500/50 cursor-pointer">
                    {editSubjects.map((sub: any) => (
                      <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
                    ))}
                  </select>
                </div>
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
