"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Radio, Check, X, RefreshCw, Edit, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface QueueItem {
  id: string;
  title: string;
  description: string;
  category: string;
  link: string;
  organizer?: string;
  sourceName?: string;
  deadline?: Timestamp;
  status: string;
  createdAt: Timestamp;
}

const CATEGORIES = [
  "Announcements",
  "Internships",
  "Hackathons",
  "Placements",
  "Website Updates",
  "Events"
];

export default function AdminPulseQueuePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Hackathons");
  const [link, setLink] = useState("");

  useEffect(() => {
    const q = query(collection(db, "pulse_queue"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueueItem));
      setItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFetchNow = async () => {
    setFetching(true);
    setFetchResult(null);
    try {
      const res = await fetch("/api/cron/fetch-pulse");
      const data = await res.json();
      if (res.ok) {
        setFetchResult(`Successfully fetched ${data.newItemsAdded || 0} new opportunities.`);
      } else {
        setFetchResult(`Fetch failed: ${data.error}`);
      }
    } catch (e: any) {
      setFetchResult(`Error: ${e.message}`);
    }
    setFetching(false);
    setTimeout(() => setFetchResult(null), 5000);
  };

  const openEditModal = (item: QueueItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category || "Hackathons");
    setLink(item.link || "");
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateDoc(doc(db, "pulse_queue", editingItem.id), {
        title,
        description,
        category,
        link
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving edit:", error);
    }
  };

  const handleApprove = async (item: QueueItem) => {
    if (!confirm(`Approve "${item.title}"? This will publish it to Paperino Pulse.`)) return;
    try {
      // 1. Add to pulse_updates
      await addDoc(collection(db, "pulse_updates"), {
        title: item.title,
        description: item.description,
        category: item.category,
        link: item.link,
        priority: "normal",
        isPinned: false,
        verifiedSource: true,
        sourceName: item.sourceName || "Automated",
        deadline: item.deadline || null,
        organizer: item.organizer || "",
        createdAt: Timestamp.now(),
        createdBy: user?.uid || "system"
      });
      
      // 2. Remove from pulse_queue
      await deleteDoc(doc(db, "pulse_queue", item.id));
    } catch (error) {
      console.error("Error approving item:", error);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject and delete this item permanently?")) return;
    try {
      await deleteDoc(doc(db, "pulse_queue", id));
    } catch (error) {
      console.error("Error rejecting item:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Review Queue</h2>
          <p className="text-sm text-gray-400">Review, approve, or reject automatically scraped opportunities.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/pulse" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium">
            Back to Pulse Admin
          </Link>
          <button
            onClick={handleFetchNow}
            disabled={fetching}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-lg transition-all text-sm font-bold disabled:opacity-50"
          >
            <RefreshCw size={16} className={fetching ? "animate-spin" : ""} />
            {fetching ? "Fetching..." : "Fetch Now"}
          </button>
        </div>
      </div>

      {fetchResult && (
        <div className="p-4 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 flex items-center gap-2 animate-in fade-in">
          <Radio size={16} />
          {fetchResult}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-2xl border border-white/10">
          <ShieldCheck className="mx-auto h-12 w-12 text-gray-500 mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">Queue is empty</h3>
          <p className="text-gray-400 text-sm">No new opportunities to review right now.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.id} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-6 hover:border-white/20 transition-all">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-1 bg-white/10 text-gray-300 rounded text-[10px] font-bold uppercase tracking-wider">
                    {item.category}
                  </span>
                  {item.sourceName && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck size={12} /> {item.sourceName}
                    </span>
                  )}
                  {item.organizer && (
                    <span className="text-xs text-gray-500 font-medium">By {item.organizer}</span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Found: {item.createdAt?.toDate().toLocaleDateString()}</span>
                  {item.deadline && (
                    <span className="text-red-400">Deadline: {item.deadline.toDate().toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center justify-end gap-2 md:w-32 flex-shrink-0 border-t border-white/10 pt-4 md:border-t-0 md:pt-0 md:border-l pl-0 md:pl-6">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex-1 md:w-full flex justify-center items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition-colors border border-white/5">
                  <ExternalLink size={14} /> Link
                </a>
                <button onClick={() => openEditModal(item)} className="flex-1 md:w-full flex justify-center items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg transition-colors border border-blue-500/20">
                  <Edit size={14} /> Edit
                </button>
                <button onClick={() => handleApprove(item)} className="flex-1 md:w-full flex justify-center items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-medium rounded-lg transition-colors border border-green-500/20">
                  <Check size={14} /> Approve
                </button>
                <button onClick={() => handleReject(item.id)} className="flex-1 md:w-full flex justify-center items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/20">
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f0c1b] border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-2xl font-bold text-white mb-6">Edit Opportunity</h3>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#161224] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">External Link</label>
                <input
                  type="url"
                  required
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
