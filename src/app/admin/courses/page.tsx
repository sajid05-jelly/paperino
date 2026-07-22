"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, doc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BookOpen, CheckCircle2, XCircle, Loader2, Calendar, Edit2, Check, X, GraduationCap, Trash2, Ban, RotateCcw } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { useSubjects } from "@/context/SubjectsContext";
import { notifyUser } from "@/lib/notifications";

interface DepartmentRequest {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
  status: "pending" | "approved" | "rejected";
  createdBy: string;
  contributorName?: string;
  createdAt: any;
}

interface SubjectRequest {
  id: string;
  subjectId: string;
  name: string;
  code: string;
  departmentId: string;
  semesterId: string;
  status: "pending" | "approved" | "rejected";
  contributorId: string;
  contributorName: string;
  createdAt: any;
}

export default function AdminCoursesPage() {
  const [activeReviewType, setActiveReviewType] = useState<"departments" | "subjects">("departments");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  
  const [departmentsList, setDepartmentsList] = useState<DepartmentRequest[]>([]);
  const [subjectsList, setSubjectsList] = useState<SubjectRequest[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Edit mode states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editSemesters, setEditSemesters] = useState(8);
  const [editSemesterId, setEditSemesterId] = useState("1");

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: "dept" | "sub"; name: string } | null>(null);
  
  const { playSuccess } = useSound();
  const { refreshSubjects } = useSubjects();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Departments
      const deptSnapshot = await getDocs(collection(db, "departments"));
      const depts = deptSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRequest));
      setDepartmentsList(depts);

      // 2. Fetch Subjects
      const subSnapshot = await getDocs(collection(db, "dynamic_subjects"));
      const subs = subSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SubjectRequest));
      setSubjectsList(subs);
    } catch (error) {
      console.error("Error fetching admin review data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDept = async (id: string) => {
    setActionLoading(id);
    try {
      const dept = departmentsList.find(d => d.id === id);
      await updateDoc(doc(db, "departments", id), { status: "approved" });
      setDepartmentsList(prev => prev.map(d => d.id === id ? { ...d, status: "approved" } : d));
      
      if (dept?.createdBy) {
        await updateDoc(doc(db, "users", dept.createdBy), {
          contributionPoints: increment(15),
          points: increment(15) // legacy compatibility
        });
      }

      playSuccess();
      await refreshSubjects();

      if (dept?.createdBy) {
        await notifyUser(
          db,
          dept.createdBy,
          "Department Approved! ✅",
          `Your department request "${dept.name}" has been approved and is now live.`,
          "department_approved"
        );
      }
    } catch (error) {
      console.error("Error approving department:", error);
      alert("Failed to approve department.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDept = async (id: string) => {
    setActionLoading(id);
    try {
      const dept = departmentsList.find(d => d.id === id);
      await updateDoc(doc(db, "departments", id), { status: "rejected" });
      setDepartmentsList(prev => prev.map(d => d.id === id ? { ...d, status: "rejected" } : d));
      playSuccess();
      await refreshSubjects();

      if (dept?.createdBy) {
        await notifyUser(
          db,
          dept.createdBy,
          "Department Request Rejected ❌",
          `Your department request "${dept.name}" has been rejected.`,
          "department_rejected"
        );
      }
    } catch (error) {
      console.error("Error rejecting department:", error);
      alert("Failed to reject department.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreDept = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "departments", id), { status: "pending" });
      setDepartmentsList(prev => prev.map(d => d.id === id ? { ...d, status: "pending" } : d));
      playSuccess();
      await refreshSubjects();
    } catch (error) {
      console.error("Error restoring department:", error);
      alert("Failed to restore department.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDept = async (id: string) => {
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, "departments", id));
      setDepartmentsList(prev => prev.filter(d => d.id !== id));
      playSuccess();
      await refreshSubjects();
    } catch (error) {
      console.error("Error deleting department:", error);
      alert("Failed to delete department.");
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  const handleApproveSub = async (id: string) => {
    setActionLoading(id);
    try {
      const sub = subjectsList.find(s => s.id === id);
      await updateDoc(doc(db, "dynamic_subjects", id), { status: "approved" });
      setSubjectsList(prev => prev.map(s => s.id === id ? { ...s, status: "approved" } : s));
      
      if (sub?.contributorId) {
        await updateDoc(doc(db, "users", sub.contributorId), {
          contributionPoints: increment(15),
          points: increment(15) // legacy compatibility
        });
      }

      playSuccess();
      await refreshSubjects();

      if (sub?.contributorId) {
        await notifyUser(
          db,
          sub.contributorId,
          "Subject Approved! ✅",
          `Your subject request "${sub.name}" has been approved and is now live.`,
          "subject_approved"
        );
      }
    } catch (error) {
      console.error("Error approving subject:", error);
      alert("Failed to approve subject.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSub = async (id: string) => {
    setActionLoading(id);
    try {
      const sub = subjectsList.find(s => s.id === id);
      await updateDoc(doc(db, "dynamic_subjects", id), { status: "rejected" });
      setSubjectsList(prev => prev.map(s => s.id === id ? { ...s, status: "rejected" } : s));
      playSuccess();
      await refreshSubjects();

      if (sub?.contributorId) {
        await notifyUser(
          db,
          sub.contributorId,
          "Subject Request Rejected ❌",
          `Your subject request "${sub.name}" has been rejected.`,
          "subject_rejected"
        );
      }
    } catch (error) {
      console.error("Error rejecting subject:", error);
      alert("Failed to reject subject.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreSub = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "dynamic_subjects", id), { status: "pending" });
      setSubjectsList(prev => prev.map(s => s.id === id ? { ...s, status: "pending" } : s));
      playSuccess();
      await refreshSubjects();
    } catch (error) {
      console.error("Error restoring subject:", error);
      alert("Failed to restore subject.");
    } finally {
      setActionLoading(null);
    }
  };



  const handleDeleteSub = async (id: string) => {
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, "dynamic_subjects", id));
      setSubjectsList(prev => prev.filter(s => s.id !== id));
      playSuccess();
      await refreshSubjects();
    } catch (error) {
      console.error("Error deleting subject:", error);
      alert("Failed to delete subject.");
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "dept") {
      handleDeleteDept(deleteConfirm.id);
    } else {
      handleDeleteSub(deleteConfirm.id);
    }
  };

  // Inline editing actions
  const startEditingDept = (dept: DepartmentRequest) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditCode(dept.code);
    setEditSemesters(dept.totalSemesters);
  };

  const saveEditingDept = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "departments", id), {
        name: editName.trim(),
        code: editCode.trim(),
        totalSemesters: editSemesters
      });
      setDepartmentsList(prev => prev.map(d => d.id === id ? { ...d, name: editName, code: editCode, totalSemesters: editSemesters } : d));
      setEditingId(null);
      playSuccess();
      await refreshSubjects();
    } catch (error) {
      console.error("Error saving department:", error);
      alert("Failed to update department.");
    } finally {
      setActionLoading(null);
    }
  };

  const startEditingSub = (sub: SubjectRequest) => {
    setEditingId(sub.id);
    setEditName(sub.name);
    setEditCode(sub.code);
    setEditSemesterId(sub.semesterId);
  };

  const saveEditingSub = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "dynamic_subjects", id), {
        name: editName.trim(),
        code: editCode.trim(),
        semesterId: editSemesterId
      });
      setSubjectsList(prev => prev.map(s => s.id === id ? { ...s, name: editName, code: editCode, semesterId: editSemesterId } : s));
      setEditingId(null);
      playSuccess();
      await refreshSubjects();
    } catch (error) {
      console.error("Error saving subject:", error);
      alert("Failed to update subject.");
    } finally {
      setActionLoading(null);
    }
  };

  // Filtering data for view
  const currentDepts = departmentsList.filter(d => d.status === activeTab);
  const currentSubs = subjectsList.filter(s => s.status === activeTab);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <GraduationCap className="text-purple-400" /> Dynamic Course Review Queue
          </h1>
          <p className="text-gray-400">Approve, Edit, Reject, or Delete department and subject suggestions from contributors.</p>
        </div>
      </div>

      {/* Main Review Section Switcher */}
      <div className="flex gap-4 mb-6 border-b border-white/5">
        <button 
          onClick={() => { setActiveReviewType("departments"); setActiveTab("pending"); }}
          className={`pb-3 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${activeReviewType === "departments" ? "text-purple-400" : "text-gray-400 hover:text-white"}`}
        >
          <GraduationCap size={16} /> Departments ({departmentsList.filter(d => d.status === "pending").length} Pending)
          {activeReviewType === "departments" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => { setActiveReviewType("subjects"); setActiveTab("pending"); }}
          className={`pb-3 px-2 font-bold text-sm transition-colors relative flex items-center gap-2 ${activeReviewType === "subjects" ? "text-purple-400" : "text-gray-400 hover:text-white"}`}
        >
          <BookOpen size={16} /> Subjects ({subjectsList.filter(s => s.status === "pending").length} Pending)
          {activeReviewType === "subjects" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-t-full"></div>}
        </button>
      </div>

      {/* Status Tab Switcher (Pending / Approved / Rejected) */}
      <div className="flex gap-3 mb-6">
        <button 
          onClick={() => setActiveTab("pending")} 
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${activeTab === "pending" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/5 border-transparent text-gray-400 hover:text-white"}`}
        >
          Pending Requests ({activeReviewType === "departments" ? departmentsList.filter(d => d.status === "pending").length : subjectsList.filter(s => s.status === "pending").length})
        </button>
        <button 
          onClick={() => setActiveTab("approved")} 
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${activeTab === "approved" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-transparent text-gray-400 hover:text-white"}`}
        >
          Approved ({activeReviewType === "departments" ? departmentsList.filter(d => d.status === "approved").length : subjectsList.filter(s => s.status === "approved").length})
        </button>
        <button 
          onClick={() => setActiveTab("rejected")} 
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${activeTab === "rejected" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/5 border-transparent text-gray-400 hover:text-white"}`}
        >
          Rejected ({activeReviewType === "departments" ? departmentsList.filter(d => d.status === "rejected").length : subjectsList.filter(s => s.status === "rejected").length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : activeReviewType === "departments" ? (
        /* ==================== DEPARTMENTS LIST ==================== */
        currentDepts.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-[2rem] border border-white/5 flex flex-col items-center">
            <GraduationCap size={40} className="text-gray-500 mb-4" />
            <h3 className="text-xl font-medium text-white mb-1">No {activeTab} departments</h3>
            <p className="text-gray-400">There are no department listings in this review state.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentDepts.map(dept => (
              <div key={dept.id} className="vision-glass p-5 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all flex flex-col md:flex-row justify-between gap-4 group">
                <div className="flex-1">
                  {editingId === dept.id ? (
                    <div className="space-y-3 max-w-xl">
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Department Name" 
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                        />
                        <input 
                          type="text" 
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          placeholder="Code (e.g. MBA)" 
                          className="w-28 bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm text-white uppercase"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-400">Total Semesters:</label>
                        <input 
                          type="number" 
                          value={editSemesters}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/^0+(?=\d)/, '');
                            e.target.value = clean;
                            setEditSemesters(parseInt(clean) || 8);
                          }}
                          min="1"
                          max="12"
                          className="w-20 bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{dept.name}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 uppercase">
                          {dept.code}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-purple-400" />
                          {dept.totalSemesters} Semesters
                        </div>
                        {dept.contributorName && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
                            Suggested by: <span className="text-gray-300">{dept.contributorName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {actionLoading === dept.id ? (
                    <Loader2 size={20} className="text-purple-400 animate-spin mr-4" />
                  ) : editingId === dept.id ? (
                    <>
                      <button onClick={() => saveEditingDept(dept.id)} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" title="Save">
                        <Check size={18} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20" title="Cancel">
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditingDept(dept)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white" title="Edit inline">
                        <Edit2 size={16} />
                      </button>
                      
                      {activeTab === "pending" && (
                        <>
                          <button onClick={() => handleApproveDept(dept.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20">
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button onClick={() => handleRejectDept(dept.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/20">
                            <Ban size={14} /> Reject
                          </button>
                        </>
                      )}

                      {activeTab === "rejected" && (
                        <>
                          <button onClick={() => handleApproveDept(dept.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20">
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button onClick={() => handleRestoreDept(dept.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20">
                            <RotateCcw size={14} /> Restore
                          </button>
                        </>
                      )}

                      {/* Delete button — always visible */}
                      <button 
                        onClick={() => setDeleteConfirm({ id: dept.id, type: "dept", name: dept.name })} 
                        className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all" 
                        title="Permanently delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ==================== SUBJECTS LIST ==================== */
        currentSubs.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-[2rem] border border-white/5 flex flex-col items-center">
            <BookOpen size={40} className="text-gray-500 mb-4" />
            <h3 className="text-xl font-medium text-white mb-1">No {activeTab} subjects</h3>
            <p className="text-gray-400">There are no subjects in this review state.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {currentSubs.map(sub => (
              <div key={sub.id} className="vision-glass p-5 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all flex flex-col md:flex-row justify-between gap-4 group">
                <div className="flex-1">
                  {editingId === sub.id ? (
                    <div className="space-y-3 max-w-xl">
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Subject Name" 
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                        />
                        <input 
                          type="text" 
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          placeholder="Code" 
                          className="w-28 bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm text-white uppercase"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-400">Semester:</label>
                        <select 
                          value={editSemesterId} 
                          onChange={(e) => setEditSemesterId(e.target.value)}
                          className="bg-black/50 border border-white/10 rounded-xl p-2.5 text-sm text-white cursor-pointer"
                        >
                          {["1","2","3","4","5","6","7","8","9","10"].map(s => (
                            <option key={s} value={s} className="bg-black">Semester {s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{sub.name}</h3>
                        {sub.code && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 uppercase">
                            {sub.code}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-400 uppercase font-bold">
                          DEPT: {sub.departmentId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-purple-400" />
                          Semester {sub.semesterId}
                        </div>
                        {sub.contributorName && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"></span>
                            Suggested by: <span className="text-gray-300">{sub.contributorName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {actionLoading === sub.id ? (
                    <Loader2 size={20} className="text-purple-400 animate-spin mr-4" />
                  ) : editingId === sub.id ? (
                    <>
                      <button onClick={() => saveEditingSub(sub.id)} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" title="Save">
                        <Check size={18} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20" title="Cancel">
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditingSub(sub)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white" title="Edit inline">
                        <Edit2 size={16} />
                      </button>
                      
                      {activeTab === "pending" && (
                        <>
                          <button onClick={() => handleApproveSub(sub.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20">
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button onClick={() => handleRejectSub(sub.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/20">
                            <Ban size={14} /> Reject
                          </button>
                        </>
                      )}

                      {activeTab === "rejected" && (
                        <>
                          <button onClick={() => handleApproveSub(sub.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20">
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button onClick={() => handleRestoreSub(sub.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20">
                            <RotateCcw size={14} /> Restore
                          </button>
                        </>
                      )}

                      {/* Delete button — always visible */}
                      <button 
                        onClick={() => setDeleteConfirm({ id: sub.id, type: "sub", name: sub.name })} 
                        className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all" 
                        title="Permanently delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div 
            className="bg-[#1a0e1c]/95 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(239,68,68,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Permanently Delete?</h3>
                <p className="text-xs text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-5">
              <p className="text-sm text-gray-300">
                You are about to permanently delete <span className="text-red-400 font-semibold">&quot;{deleteConfirm.name}&quot;</span> from Firestore. 
                This will remove it from all admin tabs and it cannot be recovered.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm font-semibold hover:text-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/30 transition-all flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
