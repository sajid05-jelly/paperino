"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/components/Toast";
import { useSound } from "@/hooks/useSound";

interface SuggestSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string;
  departmentName: string;
  semesterId: string;
}

export default function SuggestSubjectModal({
  isOpen,
  onClose,
  departmentId,
  departmentName,
  semesterId
}: SuggestSubjectModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { playSuccess } = useSound();

  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSubjectName("");
      setSubjectCode("");
      setNotes("");
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setError("Subject Name is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addDoc(collection(db, "subject_requests"), {
        departmentId,
        departmentName,
        courseName: departmentName,
        semesterId,
        semesterName: `Semester ${semesterId}`,
        subjectName: subjectName.trim(),
        subjectCode: subjectCode.trim(),
        notes: notes.trim(),
        requestedBy: user?.displayName || user?.email || "Anonymous",
        userEmail: user?.email || "anonymous@paperino.app",
        createdAt: serverTimestamp(),
        status: "pending"
      });

      setSuccess(true);
      if (playSuccess) playSuccess();
      showToast("✅ Thank you! Your subject request has been received. Our team will review and upload the materials soon.", "success");
      
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      console.error("Failed to submit subject request:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-3xl border border-white/10 p-6 md:p-8 shadow-[0_20px_50px_rgba(139,92,246,0.15)] overflow-hidden text-left"
        style={{ background: "rgba(12,8,24,0.98)", backdropFilter: "blur(20px)" }}
      >
        {/* Decorative Light Orbs */}
        <div className="absolute -right-24 -top-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center text-center py-12 space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-2">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-white">Request Submitted!</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Thank you! Your subject request has been received. Our team will review and upload the materials soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                <BookOpen size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Suggest a Subject</h3>
                <p className="text-xs text-gray-400">Recommend missing subjects to the Paperino community</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Prefilled Fields Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Department</label>
                  <input
                    type="text"
                    value={departmentName}
                    disabled
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Semester</label>
                  <input
                    type="text"
                    value={`Semester ${semesterId}`}
                    disabled
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Subject Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Theory of Computation"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              {/* Subject Code */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Subject Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 18CSE302T"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  placeholder="Provide reference links, books, or any special requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl animate-shake">
                {error}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-900/30"
              >
                {loading && <Loader2 size={12} className="animate-spin" />}
                Submit Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
