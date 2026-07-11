"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { 
  Trophy, Upload, FileText, Edit2, Download, Copy, CheckCircle2, 
  Loader2, BookOpen, Award, Target, Star, Calendar, Sparkles, 
  Bookmark, Bell, Trash2, Inbox, Info 
} from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import { getDownloadHref } from "@/lib/driveUtils";

interface Material {
  id: string;
  semesterId: string;
  subjectId: string;
  departmentId?: string;
  title: string;
  category: string;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: number;
  status?: string;
}

export default function ContributorDashboardPage() {
  const { 
    user, 
    uploads: approvedCountDb, 
    contributionPoints, 
    isPremiumActive, 
    premiumEndDate 
  } = useAuth();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<"uploads" | "bookmarks" | "notifications">("uploads");
  const { subjects: dynamicSubjects } = useSubjects();

  const [downloadsCount, setDownloadsCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Uploads
      const q = query(collection(db, "materials"), where("uploaderId", "==", user.uid));
      const snap = await getDocs(q);
      const mats: Material[] = [];
      snap.forEach(doc => mats.push({ id: doc.id, ...doc.data() } as Material));
      mats.sort((a, b) => b.createdAt - a.createdAt);
      setMaterials(mats);

      // 2. Fetch Bookmarks
      const bSnap = await getDocs(collection(db, "users", user.uid, "bookmarks"));
      const bList = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      bList.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setBookmarks(bList);

      // 3. Fetch Notifications
      const nSnap = await getDocs(query(collection(db, "notifications"), where("userId", "==", user.uid)));
      const nList = nSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      nList.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(nList);

      // 4. Fetch downloads
      const udoc = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
      if (!udoc.empty) {
        setDownloadsCount(udoc.docs[0].data().downloads || 0);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
    setLoading(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMat) return;
    setActionLoading(true);
    try {
      const ref = doc(db, "materials", editingMat.id);
      await updateDoc(ref, {
        title: editingMat.title,
        semesterId: editingMat.semesterId,
        subjectId: editingMat.subjectId,
        category: editingMat.category
      });
      
      setMaterials(prev => prev.map(m => m.id === editingMat.id ? editingMat : m));
      setEditingMat(null);
    } catch (err) {
      console.error("Edit error:", err);
      alert("Error updating material.");
    }
    setActionLoading(false);
  };

  const removeBookmark = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "bookmarks", id));
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const editSubjects = editingMat?.semesterId ? dynamicSubjects[editingMat.departmentId || "btech"]?.[editingMat.semesterId] || [] : [];

  // Local Counts
  const approvedCount = materials.filter(m => m.status === "approved").length;
  const pendingCount = materials.filter(m => !m.status || m.status === "pending").length;
  const rejectedCount = materials.filter(m => m.status === "rejected").length;

  // Next Milestone Target
  let nextMilestone = 5;
  if (approvedCount >= 20) nextMilestone = 20;
  else if (approvedCount >= 15) nextMilestone = 20;
  else if (approvedCount >= 10) nextMilestone = 15;
  else if (approvedCount >= 5) nextMilestone = 10;

  const uploadsRemaining = Math.max(0, nextMilestone - approvedCount);
  const progressPercent = Math.min(100, (approvedCount / nextMilestone) * 100);

  // Badge Level Selection
  const badgeLevel = approvedCount >= 20 ? "elite" : approvedCount >= 5 ? "active" : approvedCount >= 1 ? "contributor" : "normal";
  const badgeInfo = {
    elite: { name: "Elite Contributor", icon: "🥇", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.15)]" },
    active: { name: "Active Contributor", icon: "🥈", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" },
    contributor: { name: "Contributor", icon: "🥉", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    normal: { name: "Academic Explorer", icon: "📖", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" }
  }[badgeLevel];

  const formattedExpiry = premiumEndDate
    ? (premiumEndDate.toDate ? premiumEndDate.toDate() : new Date(premiumEndDate)).toLocaleDateString()
    : null;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Dashboard</h1>
          <p className="text-gray-400">View your contributions, saved bookmarks, reward points, and system updates.</p>
        </div>
        <div className="flex gap-3">
          <a href="/contributor/upload" className="bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(232,121,249,0.3)] flex items-center gap-2 text-sm">
            <Upload size={16} /> Go to Contribution Section
          </a>
        </div>
      </div>

      {/* Contributor Profile Banner */}
      <div className="vision-glass p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-fuchsia-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
            {badgeInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl font-bold text-white">{user?.displayName || "Student"}</h2>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${badgeInfo.color}`}>
                {badgeInfo.name}
              </span>
            </div>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>

        {/* Premium Status Info Box */}
        <div className="w-full md:w-auto bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPremiumActive ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-gray-500"}`}>
            <Sparkles size={20} className={isPremiumActive ? "animate-pulse" : ""} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Premium Status</p>
            {isPremiumActive ? (
              <p className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                Active <span className="text-[10px] text-gray-400 font-normal">(Expires: {formattedExpiry})</span>
              </p>
            ) : (
              <p className="text-sm font-bold text-gray-400">Inactive</p>
            )}
          </div>
        </div>
      </div>

      {/* Rewards Progress Milestone Indicator */}
      {uploadsRemaining > 0 ? (
        <div className="vision-glass p-6 rounded-3xl border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-medium flex items-center gap-1.5">
              <Trophy size={14} className="text-yellow-400" />
              Next reward: <strong className="text-white">+{nextMilestone === 20 ? "30 Days Bonus" : "10 Days Premium"}</strong>
            </span>
            <span className="text-fuchsia-400 font-bold">{uploadsRemaining} Approved Uploads Left</span>
          </div>
          
          <div className="w-full bg-black/50 border border-white/5 h-2.5 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-fuchsia-500 to-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="flex justify-between text-[10px] text-gray-500 font-bold">
            <span>{approvedCount} Approved</span>
            <span>{nextMilestone} Goal</span>
          </div>
        </div>
      ) : (
        <div className="vision-glass p-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 flex items-center gap-4">
          <Trophy className="text-yellow-400 animate-bounce" size={24} />
          <div>
            <h4 className="text-sm font-bold text-white">Elite Contributor Achieved!</h4>
            <p className="text-xs text-gray-400">You have completed all standard reward milestones. Thank you for building the community!</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Approved</p>
          <p className="text-2xl font-bold text-emerald-400">{approvedCount}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-400">{rejectedCount}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-white/5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Downloads</p>
          <p className="text-2xl font-bold text-cyan-400">{downloadsCount}</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-white/5 col-span-2 md:col-span-1 bg-fuchsia-500/5 border-fuchsia-500/10">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Points</p>
          <p className="text-2xl font-bold text-fuchsia-400">{contributionPoints}</p>
        </div>
      </div>

      {/* Tab Switcher: Upload History vs Bookmarks vs Notifications */}
      <div className="flex border-b border-white/10 gap-6">
        <button 
          onClick={() => setDashboardTab("uploads")} 
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-1.5 ${dashboardTab === "uploads" ? "text-fuchsia-400" : "text-gray-400 hover:text-white"}`}
        >
          <FileText size={16} /> My Uploads ({materials.length})
          {dashboardTab === "uploads" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-fuchsia-500 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setDashboardTab("bookmarks")} 
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-1.5 ${dashboardTab === "bookmarks" ? "text-fuchsia-400" : "text-gray-400 hover:text-white"}`}
        >
          <Bookmark size={16} /> Bookmarks ({bookmarks.length})
          {dashboardTab === "bookmarks" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-fuchsia-500 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setDashboardTab("notifications")} 
          className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-1.5 ${dashboardTab === "notifications" ? "text-fuchsia-400" : "text-gray-400 hover:text-white"}`}
        >
          <Bell size={16} /> Notifications ({notifications.length})
          {dashboardTab === "notifications" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-fuchsia-500 rounded-t-full"></div>}
        </button>
      </div>

      {/* Main Tab Render Block */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-fuchsia-400" size={32} />
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-3xl border border-white/5 min-h-[300px]">
          
          {/* UPLOADS TAB */}
          {dashboardTab === "uploads" && (
            materials.length === 0 ? (
              <div className="text-center py-16 text-gray-500 space-y-3">
                <FileText size={40} className="mx-auto opacity-30" />
                <p>You haven't uploaded any study materials yet.</p>
                <a href="/contributor/upload" className="inline-block text-xs font-bold text-fuchsia-400 underline">Upload your first note</a>
              </div>
            ) : (
              <div className="space-y-4">
                {materials.map(mat => (
                  <div key={mat.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded">
                          Sem {mat.semesterId}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-gray-500">
                          {mat.category}
                        </span>
                        {(!mat.status || mat.status === "pending") && (
                          <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 whitespace-nowrap animate-pulse tracking-wide font-mono ml-2">
                            Pending Review
                          </span>
                        )}
                        {mat.status === "approved" && (
                          <span className="text-[10px] font-semibold bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 text-fuchsia-300 px-2.5 py-0.5 rounded-full border border-fuchsia-500/20 whitespace-nowrap tracking-wide ml-2">
                            Approved & Live
                          </span>
                        )}
                        {mat.status === "rejected" && (
                          <span className="text-[10px] font-bold bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/40 whitespace-nowrap shadow-[0_0_10px_rgba(244,63,94,0.15)] font-mono ml-2">
                            Rejected
                          </span>
                        )}
                      </div>
                      <h4 className="text-white font-medium text-lg leading-tight mb-1 truncate">{mat.title || mat.fileName}</h4>
                      <p className="text-xs text-gray-500 truncate">Subject: {mat.subjectId} • Uploaded: {new Date(mat.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-2 md:self-center flex-wrap flex-shrink-0 mt-4 md:mt-0">
                      {(!mat.status || mat.status === "pending") ? (
                        <button onClick={() => setEditingMat(mat)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors border border-white/5" title="Edit Metadata">
                          <Edit2 size={14} /> Edit
                        </button>
                      ) : (
                        <button disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 opacity-50 cursor-not-allowed text-xs font-medium text-gray-500 border border-white/5" title="Approved or Rejected materials cannot be edited">
                          <Edit2 size={14} /> Edit Locked
                        </button>
                      )}
                      <button onClick={() => copyToClipboard(getDownloadHref(mat), mat.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors border border-white/5">
                        {copiedId === mat.id ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        {copiedId === mat.id ? "Copied" : "Copy"}
                      </button>
                      <a href={getDownloadHref(mat)} download className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-medium text-cyan-400 transition-colors border border-cyan-500/20">
                        Download <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* BOOKMARKS TAB */}
          {dashboardTab === "bookmarks" && (
            bookmarks.length === 0 ? (
              <div className="text-center py-16 text-gray-500 space-y-3">
                <Bookmark size={40} className="mx-auto opacity-30" />
                <p>No saved bookmarks found.</p>
                <a href="/courses" className="inline-block text-xs font-bold text-fuchsia-400 underline">Browse courses to save items</a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookmarks.map((b) => (
                  <div key={b.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-start gap-4 hover:border-purple-500/20 transition-all">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                        {b.category}
                      </span>
                      <h4 className="text-white font-semibold text-lg leading-tight mt-2 mb-1 line-clamp-1">{b.title || b.fileName}</h4>
                      <p className="text-xs text-gray-500">Subject: {b.subjectId} · Sem {b.semesterId}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={getDownloadHref(b)} download className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20" title="Download">
                        <Download size={15} />
                      </a>
                      <button onClick={() => removeBookmark(b.id)} className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20" title="Remove Bookmark">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* NOTIFICATIONS TAB */}
          {dashboardTab === "notifications" && (
            notifications.length === 0 ? (
              <div className="text-center py-16 text-gray-500 space-y-2">
                <Bell size={40} className="mx-auto opacity-30" />
                <p>You have no recent notifications.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-3.5 items-start">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-lg flex-shrink-0">
                      {n.type === "premium_unlocked" ? "🚀" : n.type === "material_approved" ? "✅" : "🔔"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">{n.title}</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-normal">{n.message}</p>
                      <p className="text-[10px] text-gray-500 font-medium font-mono mt-1.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      )}

      {/* Editing Modal */}
      {editingMat && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#05030a]/90 backdrop-blur-sm" onClick={() => !actionLoading && setEditingMat(null)}></div>
          <div className="relative w-full max-w-lg bg-[#0a0714] border border-fuchsia-500/20 rounded-[2rem] shadow-[0_0_50px_rgba(217,70,239,0.1)] p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-6">Edit Upload Metadata</h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                <input required type="text" value={editingMat.title} onChange={e => setEditingMat({...editingMat, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-fuchsia-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Semester</label>
                  <select required value={editingMat.semesterId} onChange={e => setEditingMat({...editingMat, semesterId: e.target.value, subjectId: dynamicSubjects[editingMat.departmentId || "btech"]?.[e.target.value]?.[0]?.id || ""})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-fuchsia-500/50 cursor-pointer">
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(sem => (
                      <option key={sem} value={sem.toString()} className="bg-[#0a0714] text-white">Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
                  <select required value={editingMat.subjectId} onChange={e => setEditingMat({...editingMat, subjectId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-fuchsia-500/50 cursor-pointer">
                    {editSubjects.map((sub: any) => (
                      <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <select required value={editingMat.category} onChange={e => setEditingMat({...editingMat, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-fuchsia-500/50 cursor-pointer">
                  <option value="pyq" className="bg-[#0a0714] text-white">PYQ</option>
                  <option value="notes" className="bg-[#0a0714] text-white">Notes</option>
                  <option value="questions" className="bg-[#0a0714] text-white">Important Qs</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingMat(null)} disabled={actionLoading} className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 rounded-xl font-medium text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all flex items-center gap-2">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
