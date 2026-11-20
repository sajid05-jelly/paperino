"use client";

import { useState, useEffect } from "react";
import { Plus, X, CheckCircle2, BookOpen, Loader2 } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import { useAuth } from "@/context/AuthContext";
import { notifyAdmins } from "@/lib/notifications";

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubjectName?: string;
}

export default function AddSubjectModal({
  isOpen,
  onClose,
  initialSubjectName = ""
}: AddSubjectModalProps) {
  const { departments, createSubject } = useSubjects();
  const { user, isContributor, isAdmin } = useAuth();

  const [subjectName, setSubjectName] = useState(initialSubjectName);
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("btech");
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSubjectName(initialSubjectName);
      setSubjectCode("");
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen, initialSubjectName]);

  if (!isOpen) return null;

  // Filter approved departments
  const availableDepts = departments.filter(d => d.status === "approved" || !d.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setError("Please enter a subject name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const generatedId = await createSubject(
        selectedDeptId,
        selectedSemester,
        subjectName.trim(),
        subjectCode.trim(),
        isContributor,
        user?.uid,
        user?.displayName || "Student",
        ["pyq", "notes", "questions"]
      );

      // Notify admins if created by contributor/student
      if (!isAdmin) {
        await notifyAdmins(
          null,
          "New Subject Added",
          `${user?.displayName || "A student"} added "${subjectName.trim()}" to ${selectedDeptId.toUpperCase()} Semester ${selectedSemester}.`,
          "subject_suggested"
        );
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSubjectName("");
        setSubjectCode("");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to add subject:", err);
      setError(err?.message || "Failed to add subject. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c0818] border border-purple-500/30 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.25)]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Plus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add New Subject</h2>
              <p className="text-xs text-purple-300">Expand the study library for all students</p>
            </div>
          </div>
          <button
            onClick={!loading ? onClose : undefined}
            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Subject Added!</h3>
              <p className="text-xs text-emerald-400">
                {isAdmin ? "Subject is now live in the directory." : "Subject has been submitted and is ready for materials."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Subject Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Subject Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Data Structures and Algorithms"
                  required
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl p-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
              </div>

              {/* Subject Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Subject Code <span className="text-gray-500 text-[10px] lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g. 21CSC201J"
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl p-3 text-sm text-white placeholder-gray-500 outline-none transition-colors uppercase"
                />
              </div>

              {/* Department & Semester Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                    Degree / Course
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#120a24] border border-white/10 focus:border-purple-500 rounded-xl p-3 text-xs text-white outline-none transition-colors cursor-pointer"
                  >
                    {availableDepts.length === 0 ? (
                      <option value="btech">B.Tech / Engineering</option>
                    ) : (
                      availableDepts.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.code ? `[${d.code.toUpperCase()}] ` : ""}{d.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                    Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#120a24] border border-white/10 focus:border-purple-500 rounded-xl p-3 text-xs text-white outline-none transition-colors cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={String(s)}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !subjectName.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>Creating Subject...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Add Subject to Directory</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
