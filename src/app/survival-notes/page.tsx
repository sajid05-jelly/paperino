"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubjects } from "@/context/SubjectsContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { 
  BookOpen, 
  Award, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Loader2, 
  ChevronRight,
  Bot,
  UserCheck
} from "lucide-react";

interface SurvivalNote {
  id: string;
  subjectId: string;
  departmentId: string;
  semesterId: string;
  category: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulUsers: string[];
  notHelpfulUsers: string[];
  contributorId: string;
  contributorName: string;
  createdAt: any;
}

export default function SurvivalNotesPage() {
  const { user, isAdmin } = useAuth();
  const { departments, subjects, refreshSubjects } = useSubjects();

  // Navigation / Selection
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Notes List
  const [notes, setNotes] = useState<SurvivalNote[]>([]);
  const [pendingNotes, setPendingNotes] = useState<SurvivalNote[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Submission
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("📚 Exam Tips");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const categories = [
    "📚 Exam Tips",
    "🧠 Important Units",
    "💀 Common Mistakes",
    "🎤 Viva Questions",
    "👨‍🏫 Faculty Insights",
    "📝 Assignment Advice"
  ];

  // Fetch approved notes for selected subject
  useEffect(() => {
    if (!selectedSubject) {
      setNotes([]);
      return;
    }

    const fetchNotes = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "survival_notes"),
          where("subjectId", "==", selectedSubject),
          where("status", "==", "approved")
        );
        const snap = await getDocs(q);
        const list: SurvivalNote[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SurvivalNote);
        });
        // Sort by helpfulness score (helpful - notHelpful)
        list.sort((a, b) => (b.helpfulCount - b.notHelpfulCount) - (a.helpfulCount - a.notHelpfulCount));
        setNotes(list);
      } catch (err) {
        console.error("Error fetching notes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [selectedSubject]);

  // Fetch pending review notes (For Admins)
  useEffect(() => {
    if (!isAdmin) return;

    const fetchPending = async () => {
      try {
        const q = query(collection(db, "survival_notes"), where("status", "==", "pending"));
        const snap = await getDocs(q);
        const list: SurvivalNote[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SurvivalNote);
        });
        setPendingNotes(list);
      } catch (err) {
        console.error("Error fetching pending notes:", err);
      }
    };

    fetchPending();
  }, [isAdmin, selectedSubject]);

  // Handle Note Submission
  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setFeedbackMsg("Please log in to submit survival notes.");
      return;
    }
    if (!newContent.trim()) {
      setFeedbackMsg("Please enter content.");
      return;
    }
    if (!selectedDept || !selectedSem || !selectedSubject) {
      setFeedbackMsg("Please select department, semester, and subject first.");
      return;
    }

    setSubmitting(true);
    setFeedbackMsg("");

    try {
      await addDoc(collection(db, "survival_notes"), {
        subjectId: selectedSubject,
        departmentId: selectedDept,
        semesterId: selectedSem,
        category: newCategory,
        content: newContent,
        status: "pending",
        helpfulCount: 0,
        notHelpfulCount: 0,
        helpfulUsers: [],
        notHelpfulUsers: [],
        contributorId: user.uid,
        contributorName: user.displayName || "Anonymous Senior",
        createdAt: serverTimestamp()
      });

      setNewContent("");
      setFeedbackMsg("Notes submitted! Pending admin review before publishing.");
      setTimeout(() => setShowAddForm(false), 2000);
    } catch (err) {
      console.error("Error adding note:", err);
      setFeedbackMsg("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Voting / Helpful rating
  const handleVote = async (noteId: string, type: "helpful" | "notHelpful") => {
    if (!user) return;

    const noteRef = doc(db, "survival_notes", noteId);
    const note = notes.find(n => n.id === noteId) || pendingNotes.find(n => n.id === noteId);
    if (!note) return;

    const uid = user.uid;
    const hasVotedHelpful = note.helpfulUsers.includes(uid);
    const hasVotedNotHelpful = note.notHelpfulUsers.includes(uid);

    try {
      if (type === "helpful") {
        if (hasVotedHelpful) {
          // Remove vote
          await updateDoc(noteRef, {
            helpfulCount: increment(-1),
            helpfulUsers: arrayRemove(uid)
          });
        } else {
          // Add vote and remove notHelpful if present
          await updateDoc(noteRef, {
            helpfulCount: increment(1),
            helpfulUsers: arrayUnion(uid),
            ...(hasVotedNotHelpful ? {
              notHelpfulCount: increment(-1),
              notHelpfulUsers: arrayRemove(uid)
            } : {})
          });
        }
      } else {
        if (hasVotedNotHelpful) {
          // Remove vote
          await updateDoc(noteRef, {
            notHelpfulCount: increment(-1),
            notHelpfulUsers: arrayRemove(uid)
          });
        } else {
          // Add vote and remove helpful if present
          await updateDoc(noteRef, {
            notHelpfulCount: increment(1),
            notHelpfulUsers: arrayUnion(uid),
            ...(hasVotedHelpful ? {
              helpfulCount: increment(-1),
              helpfulUsers: arrayRemove(uid)
            } : {})
          });
        }
      }

      // Refresh list locally
      const q = query(
        collection(db, "survival_notes"),
        where("subjectId", "==", selectedSubject),
        where("status", "==", "approved")
      );
      const snap = await getDocs(q);
      const list: SurvivalNote[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SurvivalNote);
      });
      list.sort((a, b) => (b.helpfulCount - b.notHelpfulCount) - (a.helpfulCount - a.notHelpfulCount));
      setNotes(list);
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  // Admin approval flow
  const handleAdminAction = async (noteId: string, action: "approve" | "reject" | "delete") => {
    const noteRef = doc(db, "survival_notes", noteId);
    
    try {
      if (action === "approve") {
        const noteData = pendingNotes.find(n => n.id === noteId);

        await updateDoc(noteRef, { status: "approved" });
        
        // Award points to contributor
        if (noteData && noteData.contributorId) {
          const userRef = doc(db, "users", noteData.contributorId);
          await updateDoc(userRef, {
            contributionPoints: increment(15), // approved notes award 15 points
            uploads: increment(1)
          });
        }

        // Move item to approved list locally
        setPendingNotes(prev => prev.filter(n => n.id !== noteId));
      } else if (action === "reject") {
        await updateDoc(noteRef, { status: "rejected" });
        setPendingNotes(prev => prev.filter(n => n.id !== noteId));
      } else if (action === "delete") {
        await deleteDoc(noteRef);
        setNotes(prev => prev.filter(n => n.id !== noteId));
        setPendingNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error("Admin action failed:", err);
    }
  };

  // Semester dropdown list
  const activeDeptObj = departments.find(d => d.id === selectedDept);
  const semestersArray = activeDeptObj ? Array.from({ length: activeDeptObj.totalSemesters }, (_, i) => (i + 1).toString()) : [];

  // Subject dropdown list
  const filteredSubjects = (selectedDept && selectedSem && subjects[selectedDept]?.[selectedSem])
    ? subjects[selectedDept][selectedSem].filter(s => s.status === "approved" || s.contributorId === "system")
    : [];

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[rgba(var(--primary-rgb),0.15)] via-[var(--background)] to-[var(--background)] text-white py-8 relative overflow-hidden selection:bg-violet-500/30">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[850px] h-[850px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.32)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[750px] h-[750px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.25)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-16">
        
        {/* Header */}
        <div className="text-center mb-12 relative">
          
          {/* Ambient Aurora Light Streak Behind Hero */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.28)_0%,transparent_60%)] -z-10 pointer-events-none blur-[70px]" />

          <div className="inline-flex items-center justify-center p-4 bg-violet-500/10 rounded-full mb-6 border border-violet-500/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
            <BookOpen size={36} className="text-violet-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400 mb-4 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.25)]">
            Senior Survival Notes
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Real advice, viva experiences, assignments hacks, and faculty insights shared by senior graduates.
          </p>
        </div>

        {/* Dropdown selectors */}
        <div className="backdrop-blur-3xl bg-white/[0.05] border border-violet-500/20 rounded-3xl p-6 shadow-[0_0_40px_rgba(var(--primary-rgb),0.12)] max-w-4xl mx-auto mb-10 transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Select Department</label>
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setSelectedSem(""); setSelectedSubject(""); }}
                className="w-full bg-black/60 border border-white/[0.1] focus:border-violet-500/30 rounded-xl p-3.5 text-white outline-none cursor-pointer"
              >
                <option value="">Select Department...</option>
                {departments.filter(d => d.status === "approved").map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Select Semester</label>
              <select
                disabled={!selectedDept}
                value={selectedSem}
                onChange={(e) => { setSelectedSem(e.target.value); setSelectedSubject(""); }}
                className="w-full bg-black/60 border border-white/[0.1] focus:border-violet-500/30 rounded-xl p-3.5 text-white outline-none cursor-pointer disabled:opacity-40"
              >
                <option value="">Select Semester...</option>
                {semestersArray.map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Select Subject</label>
              <select
                disabled={!selectedSem}
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-black/60 border border-white/[0.1] focus:border-violet-500/30 rounded-xl p-3.5 text-white outline-none cursor-pointer disabled:opacity-40"
              >
                <option value="">Select Subject...</option>
                {filteredSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {selectedSubject ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Notes List Column */}
            <div className="lg:col-span-8 space-y-6 animate-in fade-in duration-500">
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity size={18} className="text-violet-400" />
                  <span>Survival Advice ({notes.length})</span>
                </h3>

                {user && (
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.35)]"
                  >
                    <Plus size={14} /> Contribute Tip
                  </button>
                )}
              </div>

              {/* Add form overlay/block */}
              {showAddForm && (
                <form onSubmit={handleSubmitNote} className="backdrop-blur-3xl bg-white/[0.05] border border-violet-500/25 rounded-3xl p-6 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-bold text-white">Contribute Survival Tip</h4>
                  
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-black/60 border border-white/[0.1] focus:border-violet-500/30 rounded-xl p-3.5 text-white outline-none cursor-pointer"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Write your tip (anonymous by default)</label>
                    <textarea
                      rows={4}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Share exam tips, unit importance, viva questions, or assignment details..."
                      className="w-full bg-black/60 border border-white/[0.1] focus:border-violet-500/30 rounded-xl p-3.5 text-white outline-none"
                    />
                  </div>

                  {feedbackMsg && <p className="text-xs text-violet-400 font-bold">{feedbackMsg}</p>}

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {submitting ? <Loader2 className="animate-spin" size={14} /> : "Submit"}
                    </button>
                  </div>
                </form>
              )}

              {loading ? (
                <div className="py-20 text-center">
                  <Loader2 className="animate-spin text-violet-500 inline-block mb-3" size={32} />
                  <p className="text-gray-400 text-sm">Loading survival notes...</p>
                </div>
              ) : notes.length === 0 ? (
                <div className="backdrop-blur-3xl bg-white/[0.05] border border-violet-500/20 rounded-3xl p-12 text-center text-gray-500 space-y-4 shadow-[0_0_30px_rgba(var(--primary-rgb),0.08)]">
                  <Bot size={44} className="mx-auto text-violet-500/40 animate-pulse" />
                  <p className="text-sm font-semibold">No approved notes found for this subject yet.</p>
                  {user && (
                    <button 
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/[0.08] text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Be the first to contribute!
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {notes.map(note => {
                    const isHelpfulSelected = user ? note.helpfulUsers?.includes(user.uid) : false;
                    const isNotHelpfulSelected = user ? note.notHelpfulUsers?.includes(user.uid) : false;

                    return (
                      <div key={note.id} className="backdrop-blur-3xl bg-white/[0.05] border border-violet-500/20 hover:border-violet-500/40 rounded-3xl p-6 transition-all duration-300 relative group/card shadow-[0_0_30px_rgba(var(--primary-rgb),0.06)] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.12)]">
                        
                        {/* Category Badge & Contributor */}
                        <div className="flex justify-between items-center mb-4">
                          <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/25 text-violet-300 rounded-full text-[10px] font-bold tracking-wide">
                            {note.category}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                            <UserCheck size={12} className="text-violet-400" /> Senior Contributor
                          </span>
                        </div>

                        {/* Content text */}
                        <p className="text-gray-200 text-sm leading-relaxed mb-6 whitespace-pre-line font-medium">
                          {note.content}
                        </p>

                        {/* Voting and actions row */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                          
                          {/* Vote buttons */}
                          <div className="flex items-center gap-3">
                            <button
                              disabled={!user}
                              onClick={() => handleVote(note.id, "helpful")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                isHelpfulSelected 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                                  : "bg-white/5 border-white/[0.08] text-gray-400 hover:bg-white/10"
                              }`}
                              title={user ? "Mark helpful" : "Log in to rate"}
                            >
                              <ThumbsUp size={13} />
                              <span>{note.helpfulCount}</span>
                            </button>

                            <button
                              disabled={!user}
                              onClick={() => handleVote(note.id, "notHelpful")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                isNotHelpfulSelected 
                                  ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]" 
                                  : "bg-white/5 border-white/[0.08] text-gray-400 hover:bg-white/10"
                              }`}
                              title={user ? "Mark not helpful" : "Log in to rate"}
                            >
                              <ThumbsDown size={13} />
                              <span>{note.notHelpfulCount}</span>
                            </button>
                          </div>

                          {/* Delete button for Admin */}
                          {isAdmin && (
                            <button
                              onClick={() => handleAdminAction(note.id, "delete")}
                              className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-all"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin pending review list (Right Column, displays only to Admins) */}
            {isAdmin && (
              <div className="lg:col-span-4 space-y-6 animate-in fade-in duration-500">
                <h3 className="text-lg font-bold text-amber-400 border-b border-amber-500/20 pb-3 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500 animate-pulse" />
                  <span>Pending Review ({pendingNotes.length})</span>
                </h3>

                {pendingNotes.length === 0 ? (
                  <p className="text-xs text-gray-500">No pending survival notes to review.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingNotes.map(pNote => (
                      <div key={pNote.id} className="p-4 backdrop-blur-3xl bg-white/[0.04] border border-amber-500/35 rounded-2xl space-y-3 shadow-[0_0_20px_rgba(245,158,11,0.05)] transition-all">
                        <div className="flex justify-between items-center">
                          <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded text-[9px] font-bold">
                            {pNote.category}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold">By: {pNote.contributorName}</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-line font-semibold border-b border-white/[0.06] pb-2">
                          "{pNote.content}"
                        </p>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleAdminAction(pNote.id, "reject")}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-all text-[10px] font-bold"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAdminAction(pNote.id, "approve")}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-xl mx-auto text-center py-16 text-gray-500 space-y-3">
            <Bot size={48} className="mx-auto text-violet-500/30" />
            <p className="text-sm">Please select a Department, Semester, and Subject to view survival notes and tips.</p>
          </div>
        )}

      </div>
    </div>
  );
}
