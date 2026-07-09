"use client";

import { useState, useEffect } from "react";
import { MessageSquare, X, CheckCircle2, AlertCircle } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useSound } from "@/hooks/useSound";
import { notifyAdmins } from "@/lib/notifications";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}


const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user, isContributor, isAdmin } = useAuth();
  const { playSuccess } = useSound();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const subjectPlaceholders = [
    "Add new course to this semester",
    "Improve PYQ Analyzer accuracy",
    "Fix mobile navbar issue",
    "Add new dark theme"
  ];

  const messagePlaceholders = [
    "Describe your suggestion, issue, or idea in detail...",
    "Explain what feature should be improved or added...",
    "Share your experience or report a bug..."
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Rotate placeholders
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => prev + 1);
        setFade(true);
      }, 500); // 500ms fade out duration
    }, 3500); // Rotate every 3.5 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  const currentSubjectPlaceholder = subjectPlaceholders[placeholderIndex % subjectPlaceholders.length];
  const currentMessagePlaceholder = messagePlaceholders[placeholderIndex % messagePlaceholders.length];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubject("");
      setMessage("");
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to send feedback.");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    // Cooldown check
    const lastFeedbackTime = localStorage.getItem("paperino_last_feedback_time");
    if (lastFeedbackTime) {
      const timeSinceLastFeedback = Date.now() - parseInt(lastFeedbackTime);
      if (timeSinceLastFeedback < COOLDOWN_MS) {
        const minutesLeft = Math.ceil((COOLDOWN_MS - timeSinceLastFeedback) / 60000);
        setError(`Please wait ${minutesLeft} minute(s) before sending another feedback to prevent spam.`);
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const role = isAdmin ? "admin" : isContributor ? "contributor" : "student";
      
      await addDoc(collection(db, "user_feedback"), {
        uid: user.uid,
        userName: user.displayName || "Unknown User",
        email: user.email,
        role,
        subject,
        category: "General Feedback",
        message,
        status: "new", // new, read, resolved
        timestamp: serverTimestamp()
      });

      localStorage.setItem("paperino_last_feedback_time", Date.now().toString());

      // Notify all admins about the new feedback
      await notifyAdmins(
        db,
        "New Feedback Received 💬",
        `${user.displayName || user.email || "A user"} submitted feedback: "${subject}".`,
        "feedback_submitted"
      );

      setSuccess(true);
      playSuccess();
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Feedback error:", err);
      setError(err.message || "Failed to send feedback. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined}></div>
      
      <div className="relative w-full max-w-lg modal-glass  rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px] pointer-events-none"></div>

        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-violet-400" /> Send Feedback
          </h2>
          <button onClick={!loading ? onClose : undefined} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 relative z-10">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Feedback Sent!</h3>
              <p className="text-emerald-400 text-center">Thank you for helping us improve Paperino.</p>
            </div>
          ) : !user ? (
            <div className="py-8 text-center">
              <AlertCircle size={40} className="text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
              <p className="text-gray-400">You must be logged in to send feedback to the admin team.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Subject</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    required 
                    disabled={loading}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-violet-500 focus:bg-white/10 transition-colors" 
                  />
                  {!subject && (
                    <span className={`absolute top-3 left-3 pointer-events-none text-violet-300/40 font-medium tracking-wide transition-all duration-500 ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
                      {currentSubjectPlaceholder}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Message</label>
                <div className="relative">
                  <textarea 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    required 
                    disabled={loading}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-violet-500 focus:bg-white/10 transition-colors resize-none" 
                  />
                  {!message && (
                    <span className={`absolute top-3 left-3 pointer-events-none text-violet-300/40 font-medium tracking-wide transition-all duration-500 ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
                      {currentMessagePlaceholder}
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || !subject.trim() || !message.trim()} 
                className="w-full liquid-btn text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  "Send Feedback"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
