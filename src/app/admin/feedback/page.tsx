"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, Loader2, CheckCircle2, Trash2, Filter, Reply } from "lucide-react";

interface Feedback {
  id: string;
  uid: string;
  userName: string;
  email: string;
  role: string;
  subject: string;
  category: string;
  message: string;
  status: string; // new, read, resolved
  timestamp: any;
}

const CATEGORIES = ["All", "Bug Report", "Suggestion", "Contributor Issue", "Content Problem", "General Feedback"];

export default function FeedbackCenterPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "user_feedback"));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const fbList: Feedback[] = [];
      snap.forEach(doc => fbList.push({ id: doc.id, ...doc.data() } as Feedback));
      
      // Sort by timestamp, newest first
      fbList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      
      setFeedbacks(fbList);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching feedback:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResolve = async (id: string) => {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, "user_feedback", id), { status: "resolved" });
    } catch (err) {
      console.error("Resolve error:", err);
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback forever?")) return;
    setActionLoading(id);
    try {
      await deleteDoc(doc(db, "user_feedback", id));
    } catch (err) {
      console.error("Delete error:", err);
    }
    setActionLoading(null);
  };

  const filteredFeedbacks = filter === "All" 
    ? feedbacks 
    : feedbacks.filter(fb => fb.category === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30";
      case "resolved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <MessageSquare className="text-fuchsia-400" /> Feedback Center
          </h1>
          <p className="text-gray-400">Review and resolve user feedback, bug reports, and suggestions.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#0f0a1a] border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-violet-500 transition-colors"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-fuchsia-400" size={40} /></div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
          <MessageSquare size={48} className="text-white/10 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Feedback Found</h3>
          <p className="text-gray-500">You're all caught up! No feedback matches this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredFeedbacks.map((fb) => (
            <div key={fb.id} className={`glass-panel p-6 rounded-3xl border transition-all ${fb.status === 'new' ? 'border-fuchsia-500/30 shadow-[0_0_20px_rgba(217,70,239,0.1)]' : 'border-white/5 opacity-70'}`}>
              
              <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${getStatusColor(fb.status)}`}>
                      {fb.status}
                    </span>
                    <span className="text-xs text-gray-400 font-medium bg-white/5 px-2 py-1 rounded-md">
                      {fb.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {fb.timestamp?.toDate().toLocaleString() || "Just now"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{fb.subject}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{fb.userName}</p>
                    <p className="text-xs text-gray-500">{fb.email} • {fb.role}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{fb.message}</p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button 
                  onClick={() => handleDelete(fb.id)}
                  disabled={actionLoading === fb.id}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  {actionLoading === fb.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}
                  Delete
                </button>
                
                {fb.status !== "resolved" && (
                  <button 
                    onClick={() => handleResolve(fb.id)}
                    disabled={actionLoading === fb.id}
                    className="px-4 py-2 rounded-xl bg-fuchsia-600/20 hover:bg-fuchsia-600/40 border border-fuchsia-500/30 text-fuchsia-300 transition-colors flex items-center gap-2 text-sm font-bold"
                  >
                    {actionLoading === fb.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>}
                    Mark Resolved
                  </button>
                )}
                
                <a 
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${fb.email}&su=Re: ${fb.subject} - Paperino Support`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all flex items-center gap-2 text-sm"
                >
                  <Reply size={16} />
                  Reply via Email
                </a>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
