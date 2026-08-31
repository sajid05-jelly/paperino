"use client";

import { useState, useEffect } from "react";
import { Plus, X, CheckCircle2, BookOpen } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import { useSound } from "@/hooks/useSound";
import { useAuth } from "@/context/AuthContext";
import { notifyAdmins } from "@/lib/notifications";
import { db } from "@/lib/firebase";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDeptId?: string;
  initialSemester?: string;
  lockDepartment?: boolean;
  lockSemester?: boolean;
  mode?: "course" | "department";
}

export default function CreateCourseModal({ 
  isOpen, 
  onClose, 
  initialDeptId, 
  initialSemester,
  lockDepartment = false,
  lockSemester = false,
  mode = "course"
}: CreateCourseModalProps) {
  const { departments, createDepartment, createSubject } = useSubjects();
  const { playSuccess } = useSound();
  const { user, isContributor, isAdmin } = useAuth();

  const [deptMode, setDeptMode] = useState<"select" | "new">("select");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  
  // New Department fields
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptSemesters, setNewDeptSemesters] = useState("8");

  // Subject fields
  const [semester, setSemester] = useState("1");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Only show approved departments to non-admins, or departments created by them
  const visibleDepartments = departments.filter(d => d.status === "approved" || isAdmin || (user && d.createdBy === user.uid));

  useEffect(() => {
    if (isOpen) {
      if (mode === "department") {
        setDeptMode("new");
      } else {
        setDeptMode("select");
      }
      // Set default selected department to the prefilled one or first available
      const firstDept = initialDeptId || visibleDepartments[0]?.id || "";
      setSelectedDeptId(firstDept);
      
      setNewDeptName("");
      setNewDeptCode("");
      setNewDeptSemesters("8");
      
      setSemester(initialSemester || "1");
      setSubjectName("");
      setSubjectCode("");
      
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen, departments, initialDeptId, initialSemester]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Update semester options when department changes
  useEffect(() => {
    if (deptMode === "select" && selectedDeptId) {
      if (selectedDeptId === initialDeptId && initialSemester) {
        setSemester(initialSemester);
      } else {
        setSemester("1");
      }
    }
  }, [selectedDeptId, deptMode, initialDeptId, initialSemester]);

  if (!isOpen) return null;

  // Calculate semester options list dynamically
  const getSemesterOptions = () => {
    if (deptMode === "new") {
      const semCount = parseInt(newDeptSemesters) || 8;
      return Array.from({ length: semCount }, (_, i) => (i + 1).toString());
    } else {
      const activeDept = visibleDepartments.find(d => d.id === selectedDeptId);
      const semCount = activeDept?.totalSemesters || 8;
      return Array.from({ length: semCount }, (_, i) => (i + 1).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (deptMode === "new") {
      if (!newDeptName.trim()) {
        setError("Department Name is required.");
        return;
      }
      const sems = parseInt(newDeptSemesters);
      if (isNaN(sems) || sems <= 0) {
        setError("Number of Semesters must be a valid positive number.");
        return;
      }
    } else {
      if (!subjectName.trim()) {
        setError("Subject Name is required.");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const isSuggestion = !isAdmin;

      if (deptMode === "new") {
        // ONLY create department request
        await createDepartment(
          newDeptName,
          newDeptCode || newDeptName.substring(0, 3).toUpperCase(),
          parseInt(newDeptSemesters) || 8,
          isSuggestion,
          user?.uid,
          user?.displayName || user?.email || "Unknown"
        );

        if (isSuggestion) {
          await notifyAdmins(
            db,
            "New Department Suggested 🏢",
            `${user?.displayName || "A contributor"} suggested a new department: ${newDeptName}.`,
            "department_suggested"
          );
        }

        setSuccess(true);
        playSuccess();
        setTimeout(() => onClose(), 2000);
        return; // STOP EXECUTION HERE, do not create subject
      }

      // Existing Course/Subject creation logic
      let finalDeptId = selectedDeptId;

      // Create subject request
      await createSubject(
        finalDeptId,
        semester,
        subjectName,
        subjectCode,
        isSuggestion,
        user?.uid,
        user?.displayName || user?.email || "Unknown"
      );

      if (isSuggestion) {
        await notifyAdmins(
          db,
          "New Subject Suggested 📚",
          `${user?.displayName || "A contributor"} suggested a new subject: ${subjectName} under ${finalDeptId}.`,
          "subject_suggested"
        );
      }

      setSuccess(true);
      playSuccess();
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create department / subject.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined}></div>
      
      <div className="relative w-full max-w-lg bg-[#07050d] border border-fuchsia-500/20 rounded-[2rem] shadow-[0_0_50px_rgba(232,121,249,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="text-fuchsia-400" /> {mode === "department" ? "Suggest Department" : "Dynamic Course Creation"}
          </h2>
          <button onClick={!loading ? onClose : undefined} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6 relative z-10">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {(isContributor && !isAdmin) ? "Request Submitted!" : (mode === "department" ? "Department Added!" : "Course Added!")}
              </h3>
              <p className="text-emerald-400 text-center">
                {(isContributor && !isAdmin) 
                  ? "Your suggestions have been submitted for administrator review." 
                  : "Changes are now live on the platform."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Step 1: Select Department */}
              {mode !== "department" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Department</label>
                  <select 
                    value={deptMode === "new" ? "create_new" : selectedDeptId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "create_new") {
                        setDeptMode("new");
                      } else {
                        setDeptMode("select");
                        setSelectedDeptId(val);
                      }
                    }}
                    disabled={loading || lockDepartment}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {visibleDepartments.map(d => (
                      <option key={d.id} value={d.id} className="bg-[#07050d] text-white">
                        {d.name} ({d.code})
                      </option>
                    ))}
                    {!lockDepartment && (
                      <option value="create_new" className="bg-[#07050d] text-fuchsia-400 font-semibold">
                        + Create New Department
                      </option>
                    )}
                  </select>
                </div>
              )}

              {/* If "Create New Department" Selected, render extra department configuration fields */}
              {deptMode === "new" && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <h3 className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest">New Department Configuration</h3>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Department Name</label>
                    <input 
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g. Artificial Intelligence"
                      required
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-400 mb-1">Department Code (Optional)</label>
                      <input 
                        type="text"
                        value={newDeptCode}
                        onChange={(e) => setNewDeptCode(e.target.value)}
                        placeholder="e.g. AI"
                        disabled={loading}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-400 mb-1">Number of Semesters</label>
                      <input 
                        type="number"
                        min="1"
                        max="12"
                        value={newDeptSemesters}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/^0+(?=\d)/, '');
                          e.target.value = clean;
                          setNewDeptSemesters(clean);
                        }}
                        required
                        disabled={loading}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Dynamic Semester Selector */}
              {deptMode !== "new" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Semester</label>
                  <select 
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    disabled={loading || lockSemester}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {getSemesterOptions().map(s => (
                      <option key={s} value={s} className="bg-[#07050d] text-white">Semester {s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 3: Create Subject details */}
              {deptMode !== "new" && (
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <h3 className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest">Subject Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Subject Name</label>
                    <input 
                      type="text" 
                      value={subjectName} 
                      onChange={(e) => setSubjectName(e.target.value)} 
                      placeholder="e.g. Machine Learning" 
                      required 
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Subject Code (Optional)</label>
                    <input 
                      type="text" 
                      value={subjectCode} 
                      onChange={(e) => setSubjectCode(e.target.value)} 
                      placeholder="e.g. 21CSC302J" 
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors uppercase" 
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
                  {error}
                </div>
              )}

              {deptMode === "new" && mode !== "department" && (
                <button
                  type="button"
                  onClick={() => {
                    setDeptMode("select");
                    setSelectedDeptId(visibleDepartments[0]?.id || "");
                  }}
                  className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
                  disabled={loading}
                >
                  &larr; Back to Create Course
                </button>
              )}

              <button 
                type="submit" 
                disabled={loading || (deptMode === "new" ? !newDeptName.trim() : !subjectName.trim())} 
                className="w-full bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(232,121,249,0.3)] hover:shadow-[0_0_30px_rgba(232,121,249,0.5)]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <BookOpen size={18} /> 
                    {deptMode === "new" 
                      ? ((isContributor && !isAdmin) ? "Suggest Department" : "Create Department")
                      : ((isContributor && !isAdmin) ? "Submit Suggestion" : "Create Course")}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
