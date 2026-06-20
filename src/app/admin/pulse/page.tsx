"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Radio, Plus, Edit, Trash2, Pin, PinOff, Link as LinkIcon, AlertCircle } from "lucide-react";

interface PulseUpdate {
  id: string;
  title: string;
  description: string;
  category: string;
  link: string;
  priority: "normal" | "important" | "pinned";
  createdAt: Timestamp;
  createdBy: string;
  isPinned: boolean;
}

const CATEGORIES = [
  "Announcements",
  "Internships",
  "Hackathons",
  "Placements",
  "Website Updates",
  "Events"
];

export default function AdminPulsePage() {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<PulseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Announcements");
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState<"normal" | "important" | "pinned">("normal");

  useEffect(() => {
    const q = query(collection(db, "pulse_updates"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PulseUpdate));
      // Sort pinned posts to top locally to ensure they always show first
      data.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
      setUpdates(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("Announcements");
    setLink("");
    setPriority("normal");
    setEditingId(null);
  };

  const openModalForCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openModalForEdit = (update: PulseUpdate) => {
    setTitle(update.title);
    setDescription(update.description);
    setCategory(update.category);
    setLink(update.link || "");
    setPriority(update.priority);
    setEditingId(update.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const data = {
      title,
      description,
      category,
      link,
      priority,
      isPinned: priority === "pinned",
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "pulse_updates", editingId), data);
      } else {
        await addDoc(collection(db, "pulse_updates"), {
          ...data,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving update:", error);
      alert("Failed to save. Check your permissions and connection.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this update?")) {
      try {
        await deleteDoc(doc(db, "pulse_updates", id));
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Failed to delete.");
      }
    }
  };

  const togglePin = async (update: PulseUpdate) => {
    try {
      const newPriority = update.isPinned ? "normal" : "pinned";
      await updateDoc(doc(db, "pulse_updates", update.id), {
        priority: newPriority,
        isPinned: !update.isPinned
      });
    } catch (error) {
      console.error("Error toggling pin:", error);
      alert("Failed to update pin status.");
    }
  };

  if (loading) return <div className="text-white">Loading Pulse Updates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Radio className="text-cyan-400" size={32} />
            Manage Pulse Updates
          </h1>
          <p className="text-gray-400 mt-2">Create and manage internal news, announcements, and opportunities.</p>
        </div>
        <button 
          onClick={openModalForCreate}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
        >
          <Plus size={20} /> New Update
        </button>
      </div>

      <div className="glass-panel p-6 rounded-2xl">
        <div className="space-y-4">
          {updates.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No updates found. Create one!</div>
          ) : (
            updates.map((update) => (
              <div key={update.id} className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-colors ${update.isPinned ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 text-gray-300">
                      {update.category}
                    </span>
                    {update.isPinned && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1 border border-amber-500/30">
                        <Pin size={10} /> PINNED
                      </span>
                    )}
                    {update.priority === "important" && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1 border border-red-500/30">
                        <AlertCircle size={10} /> IMPORTANT
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white truncate">{update.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mt-1">{update.description}</p>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{update.createdAt?.toDate().toLocaleDateString()}</span>
                    {update.link && (
                      <a href={update.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                        <LinkIcon size={12} /> External Link
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => togglePin(update)}
                    className={`p-2 rounded-lg transition-colors ${update.isPinned ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                    title={update.isPinned ? "Unpin Post" : "Pin Post"}
                  >
                    {update.isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                  </button>
                  <button 
                    onClick={() => openModalForEdit(update)}
                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(update.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-[#0f0c1b] border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingId ? "Edit Update" : "Create New Update"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Title *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Category *</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="pinned">Pinned (Always Top)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description *</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-32 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">External Link (Optional)</label>
                <input 
                  type="url" 
                  value={link} 
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-600 text-white transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  {editingId ? "Save Changes" : "Publish Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
