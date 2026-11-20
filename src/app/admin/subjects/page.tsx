"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Search, 
  X, 
  Trash2, 
  Edit2, 
  ExternalLink, 
  Plus, 
  Loader2, 
  AlertTriangle,
  FileText,
  Sparkles
} from "lucide-react";
import { useSubjects, Subject } from "@/context/SubjectsContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import dynamic from "next/dynamic";
import { collection, query, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

const AddSubjectModal = dynamic(() => import("@/components/AddSubjectModal"), { ssr: false });

export default function AdminSubjectsPage() {
  const { user, isAdmin } = useAuth();
  const { allSubjectsList, loading: subjectsLoading, deleteSubject, editSubject, refreshSubjects } = useSubjects();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Material counts per subject
  const [materialsCountMap, setMaterialsCountMap] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Delete modal state
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit modal state
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Fetch materials to calculate counts per subject
  useEffect(() => {
    let isMounted = true;
    const fetchMaterialCounts = async () => {
      try {
        const q = query(collection(db, "materials"), limit(2000));
        const snap = await getDocs(q);
        const counts: Record<string, number> = {};
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const sId = String(data.subjectId || "").toLowerCase().trim();
          if (sId) {
            counts[sId] = (counts[sId] || 0) + 1;
          }
        });
        if (isMounted) {
          setMaterialsCountMap(counts);
          setLoadingCounts(false);
        }
      } catch (err) {
        console.warn("Error fetching material counts for subjects:", err);
        if (isMounted) setLoadingCounts(false);
      }
    };

    fetchMaterialCounts();
    return () => { isMounted = false; };
  }, []);

  // Filter subjects in real time
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allSubjectsList;
    return allSubjectsList.filter(sub => {
      const nameMatch = (sub.name || "").toLowerCase().includes(q);
      const codeMatch = (sub.code || "").toLowerCase().includes(q);
      const idMatch = (sub.id || "").toLowerCase().includes(q);
      return nameMatch || codeMatch || idMatch;
    });
  }, [allSubjectsList, searchQuery]);

  // Handle Delete Subject
  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSubject(
        subjectToDelete.id, 
        subjectToDelete.departmentId || "btech", 
        subjectToDelete.semesterId || "1"
      );
      showToast(`Subject "${subjectToDelete.name}" and all materials were permanently deleted.`, "success");
      setSubjectToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete subject:", err);
      showToast(err.message || "Failed to delete subject. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (sub: Subject) => {
    setSubjectToEdit(sub);
    setEditName(sub.name || "");
    setEditCode(sub.code || "");
  };

  // Save Edit Subject
  const handleSaveEdit = async () => {
    if (!subjectToEdit || !editName.trim()) {
      showToast("Subject name cannot be empty.", "error");
      return;
    }
    setIsSavingEdit(true);
    try {
      await editSubject(
        subjectToEdit.id,
        editName.trim(),
        editCode.trim(),
        subjectToEdit.departmentId || "btech",
        subjectToEdit.semesterId || "1"
      );
      showToast("Subject details updated successfully.", "success");
      setSubjectToEdit(null);
    } catch (err: any) {
      console.error("Failed to edit subject:", err);
      showToast(err.message || "Failed to update subject.", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="text-purple-400" size={24} />
            <h1 className="text-2xl font-bold text-white tracking-tight">Manage Subjects</h1>
          </div>
          <p className="text-sm text-gray-400">
            View, search, edit, or permanently remove subjects and all their study materials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] cursor-pointer"
          >
            <Plus size={16} />
            <span>Add New Subject</span>
          </button>
        </div>
      </div>

      {/* Elongated Real-Time Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search subjects by name or subject code (e.g. Data Structures, 21CSC201J)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm md:text-base focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <span>
            Showing <strong className="text-white">{filteredSubjects.length}</strong> of <strong className="text-white">{allSubjectsList.length}</strong> subjects
          </span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Subjects List */}
      <div className="space-y-3">
        {subjectsLoading ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-white/10">
            <Loader2 className="animate-spin mx-auto text-purple-400 mb-3" size={32} />
            <p className="text-gray-400 text-sm">Loading subjects directory...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-white/10">
            <BookOpen className="mx-auto text-gray-600 mb-3" size={36} />
            <h3 className="text-white font-semibold mb-1">No subjects found</h3>
            <p className="text-gray-400 text-xs max-w-md mx-auto">
              {searchQuery 
                ? `No subjects match "${searchQuery}". Check spelling or add a new subject.`
                : "No subjects are currently configured."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((sub) => {
              const cleanId = String(sub.id).toLowerCase().trim();
              const matCount = materialsCountMap[cleanId] ?? 0;
              const subjectPageUrl = `/courses/${sub.departmentId || "btech"}/${sub.semesterId || "1"}/${sub.id}`;

              return (
                <div
                  key={`${sub.departmentId}_${sub.semesterId}_${sub.id}`}
                  className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-purple-500/30 transition-all duration-200 group"
                >
                  <div>
                    {/* Top Row: Code Badge + Material Count */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      {sub.code ? (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                          {sub.code}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 italic">No Code</span>
                      )}

                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                        <FileText size={11} className="text-purple-400" />
                        <span>{loadingCounts ? "..." : `${matCount} materials`}</span>
                      </span>
                    </div>

                    {/* Subject Name */}
                    <h3 className="text-base font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-2 mb-1">
                      {sub.name}
                    </h3>

                    {/* Subject ID slug */}
                    <p className="text-[11px] text-gray-500 font-mono truncate">
                      ID: {sub.id}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between gap-2">
                    <Link
                      href={subjectPageUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 transition-all"
                    >
                      <span>View</span>
                      <ExternalLink size={12} />
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                        title="Edit Subject Name / Code"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => setSubjectToDelete(sub)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                        title="Delete Entire Subject"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#120d1d] border border-rose-500/30 p-6 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.2)] animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Permanently Delete Subject?</h3>
            
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              Are you sure you want to completely remove <strong className="text-white">"{subjectToDelete.name}"</strong>?
            </p>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 mb-6 text-xs text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Trash2 size={13} /> This action cannot be undone!
              </p>
              <p className="text-rose-300/80">
                The subject will be completely removed from the entire platform, and all attached study materials (notes, PYQs, and question banks) will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Yes, Delete Subject</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {subjectToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#120d1d] border border-white/15 p-6 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 size={20} className="text-purple-400" />
                Edit Subject Details
              </h3>
              <button
                onClick={() => setSubjectToEdit(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Subject Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Data Structures and Algorithms"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Subject Code (optional)
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="e.g. 21CSC201J"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div className="text-[11px] text-gray-400 bg-white/5 p-3 rounded-xl border border-white/5">
                <span>Subject ID: </span>
                <span className="font-mono text-purple-300">{subjectToEdit.id}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubjectToEdit(null)}
                disabled={isSavingEdit}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      <AddSubjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
