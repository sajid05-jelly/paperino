"use client";

import { useState, useEffect } from "react";
import { Plus, X, CheckCircle2, BookOpen } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import { useSound } from "@/hooks/useSound";
import { useAuth } from "@/context/AuthContext";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateCourseModal({ isOpen, onClose }: CreateCourseModalProps) {
  const { createSubject } = useSubjects();
  const { playSuccess } = useSound();
  const { user, isContributor, isAdmin } = useAuth();
  const [semester, setSemester] = useState("1");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSemester("1");
      setName("");
      setCode("");
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Course Name is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isOnlyContributor = isContributor && !isAdmin;
      await createSubject(semester, name, code, isOnlyContributor, user?.uid, user?.displayName || user?.email || "Unknown");
      setSuccess(true);
      playSuccess();
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create course.");
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
            <Plus className="text-fuchsia-400" /> Create New Course
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
                {(isContributor && !isAdmin) ? "Course Requested!" : "Course Created!"}
              </h3>
              <p className="text-emerald-400 text-center">
                {(isContributor && !isAdmin) 
                  ? "Your request has been sent for admin approval." 
                  : "It is now available on the platform."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Semester</label>
                <select 
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors cursor-pointer"
                >
                  {[1,2,3,4,5,6,7,8].map(s => (
                    <option key={s} value={s} className="bg-[#07050d] text-white">Semester {s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Course Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Artificial Intelligence" 
                  required 
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Subject Code (Optional)</label>
                <input 
                  type="text" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  placeholder="e.g. 21CSC301J" 
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 focus:bg-white/10 transition-colors uppercase" 
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || !name.trim()} 
                className="w-full bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(232,121,249,0.3)] hover:shadow-[0_0_30px_rgba(232,121,249,0.5)]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <BookOpen size={18} /> Create Course
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
