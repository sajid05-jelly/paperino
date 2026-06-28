"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Download, History, BookOpen, HelpCircle, Bookmark, Upload, Sparkles, Clock, Lock, Eye, X } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import { useAuth } from "@/context/AuthContext";
import QuickUploadModal from "@/components/QuickUploadModal";
import { getDownloadHref, getDrivePreviewUrl } from "@/lib/driveUtils";

export default function SubjectPage({ params }: { params: Promise<{ semId: string, subjectId: string }> }) {
  const resolvedParams = use(params);
  const { semId, subjectId } = resolvedParams;
  const { user, isAdmin, isContributor, loading: authLoading } = useAuth();
  const { subjects: dynamicSubjects } = useSubjects();
  
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"pyq" | "notes" | "questions">("pyq");
  const [previewMat, setPreviewMat] = useState<any | null>(null);

  const semesterSubjects = dynamicSubjects[semId] || [];
  const subject = semesterSubjects.find(s => s.id === subjectId);
  const subjectName = subject?.name || subjectId;

  // Private Workspace Security Gate
  if (subject && subject.status === "pending") {
    const isOwner = isContributor && user?.uid === subject.contributorId;
    if (!isAdmin && !isOwner) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Clock size={40} className="text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Course Pending Approval</h1>
          <p className="text-gray-400 max-w-md mx-auto">This course has been suggested by a contributor and is currently waiting for admin approval before it becomes public.</p>
        </div>
      );
    }
  }

  useEffect(() => {
    const fetchMaterialsAndBookmarks = async () => {
      try {
        const qMaterials = query(
          collection(db, "materials"),
          where("semesterId", "==", semId),
          where("subjectId", "==", subjectId)
        );
        const matSnapshot = await getDocs(qMaterials);
        let matList = matSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filter materials based on role and ownership
        matList = matList.filter((m: any) => {
          if (m.status === "approved") return true;
          if (isAdmin) return true; // Admins see everything (pending, approved, rejected)
          if (user && m.uploaderId === user.uid) return true; // Owners see their own uploads (pending, approved, rejected)
          return false;
        });
        
        matList.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setMaterials(matList);

        if (user) {
          const bSnapshot = await getDocs(collection(db, "users", user.uid, "bookmarks"));
          const bIds = new Set<string>();
          bSnapshot.forEach(d => bIds.add(d.id));
          setBookmarkedIds(bIds);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterialsAndBookmarks();
  }, [semId, subjectId, user, isAdmin]);

  // Analytics tracking for Most Visited Subject
  useEffect(() => {
    if (subjectId) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visit_subject", id: subjectId, name: subjectName })
      }).catch(err => console.error("Analytics tracking failed:", err));
    }
  }, [subjectId, subjectName]);

  const toggleBookmark = async (mat: any) => {
    if (!user) {
      alert("Please log in to bookmark materials.");
      return;
    }
    const isBookmarked = bookmarkedIds.has(mat.id);
    const docRef = doc(db, "users", user.uid, "bookmarks", mat.id);
    
    try {
      const newBookmarks = new Set(bookmarkedIds);
      if (isBookmarked) {
        newBookmarks.delete(mat.id);
        await deleteDoc(docRef);
      } else {
        newBookmarks.add(mat.id);
        await setDoc(docRef, mat);
      }
      setBookmarkedIds(newBookmarks);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      alert("Failed to update bookmark.");
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  const handleUploadSuccess = (newMaterial: any) => {
    const isOwner = user && newMaterial.uploaderId === user.uid;
    if (newMaterial.status === "approved" || isAdmin || isOwner) {
      setMaterials(prev => [newMaterial, ...prev].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)));
    }
  };

  const pyqMaterials = materials.filter(m => m.category === "pyq");
  const notesMaterials = materials.filter(m => m.category === "notes");
  const questionsMaterials = materials.filter(m => m.category === "questions");

  const MaterialList = ({ items }: { items: any[] }) => {
    if (!authLoading && !user) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-in fade-in zoom-in-95 duration-700 bg-white/[0.02] rounded-xl border border-white/5 shadow-[inset_0_0_20px_rgba(139,92,246,0.05)] h-full mt-2">
          <div className="p-3 bg-violet-500/10 rounded-full mb-4 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            <Lock className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-white font-medium mb-2">Authentication Required</p>
          <p className="text-gray-400 text-sm mb-4">Please log in to view and download study materials.</p>
          <Link href="/login" className="px-6 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            Log In
          </Link>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-in fade-in zoom-in-95 duration-700 bg-white/[0.02] rounded-xl border border-white/5 shadow-[inset_0_0_20px_rgba(139,92,246,0.05)] h-full mt-2">
          <div className="p-3 bg-violet-500/10 rounded-full mb-3 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
          </div>
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-300 font-medium tracking-wide drop-shadow-[0_0_10px_rgba(167,139,250,0.4)] text-sm md:text-base">
            Premium study resources coming soon ✨
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 mt-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent hover:scrollbar-thumb-purple-500/50">
        {items.map(mat => {
          const isCommunityUpload = mat.uploadedBy === "contributor" || (mat.uploaderId && mat.uploadedBy !== "admin");
          return (
            <div key={mat.id} className={`glass-card p-4 rounded-xl border transition-all flex items-center justify-between group bg-black/20 ${
              mat.status === "pending"
                ? "border-amber-500/30 bg-amber-500/[0.03] shadow-[0_0_20px_rgba(245,158,11,0.05)] hover:border-amber-500/50"
                : mat.status === "rejected"
                  ? "border-rose-500/20 bg-rose-500/[0.02]"
                  : "border-white/5 hover:border-purple-500/30"
            }`}>
              <div className="flex flex-col overflow-hidden w-full pr-2">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="text-white font-medium truncate" title={mat.title || mat.fileName}>
                    {mat.title || mat.fileName || "Untitled Material"}
                  </h4>
                  {(isCommunityUpload || mat.status === "pending" || mat.status === "rejected") && (
                    <div className="flex gap-2 items-center flex-wrap">
                      {mat.status === "approved" && (
                        <span className="text-[10px] font-semibold bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 text-fuchsia-300 px-2.5 py-0.5 rounded-full border border-fuchsia-500/20 whitespace-nowrap tracking-wide">
                          Community Upload
                        </span>
                      )}
                      {mat.status === "pending" && (
                        <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 whitespace-nowrap shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse tracking-wide font-mono">
                          Pending Review
                        </span>
                      )}
                      {mat.status === "rejected" && (
                        <span className="text-[10px] font-bold bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/40 whitespace-nowrap shadow-[0_0_10px_rgba(244,63,94,0.15)] font-mono">
                          Rejected
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <FileText size={12} className="text-purple-400" />
                  {mat.createdAt ? new Date(mat.createdAt).toLocaleDateString() : 'Just now'}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleBookmark(mat)}
                  title="Bookmark"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    bookmarkedIds.has(mat.id)
                      ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Bookmark size={14} fill={bookmarkedIds.has(mat.id) ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => setPreviewMat(mat)}
                  title="Preview"
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-violet-500 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <Eye size={14} />
                </button>
                <a 
                  href={getDownloadHref(mat)} 
                  download
                  title="Download"
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-cyan-500 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link href={`/btech/semesters/${semId}`} className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Semester {semId}
      </Link>

      {subject?.status === "pending" && (
        <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-400 animate-in fade-in slide-in-from-top-4 duration-500">
          <Clock size={20} className="animate-pulse" />
          <span className="font-medium">Private Workspace: This course is pending admin approval and is strictly hidden from the public.</span>
        </div>
      )}

      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">{subjectName}</h1>
        <p className="text-gray-400 text-lg">Semester {semId} • B.Tech</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Previous Year Questions Section */}
        <section className="glass-panel p-6 rounded-2xl border-t-4 border-t-blue-500 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          <div className="flex items-start justify-between mb-6 relative z-10 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <History size={20} />
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">Previous Year<br/>Questions</h2>
            </div>
            {(isAdmin || isContributor) && (
              <button 
                onClick={() => { setUploadCategory("pyq"); setIsUploadModalOpen(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--primary-500)]/20 text-[color:var(--primary-300)] border border-[color:var(--primary-500)]/30 hover:bg-[color:var(--primary-500)]/40 transition-colors"
                title="Upload PYQ"
              >
                <Upload size={14} /> Upload
              </button>
            )}
          </div>
          <div className="relative z-10 flex-1 flex flex-col min-h-0">
            <MaterialList items={pyqMaterials} />
          </div>
        </section>

        {/* Study Notes Section */}
        <section className="glass-panel p-6 rounded-2xl border-t-4 border-t-emerald-500 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          <div className="flex items-start justify-between mb-6 relative z-10 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <BookOpen size={20} />
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">Study Notes &<br/>Resources</h2>
            </div>
            {(isAdmin || isContributor) && (
              <button 
                onClick={() => { setUploadCategory("notes"); setIsUploadModalOpen(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--primary-500)]/20 text-[color:var(--primary-300)] border border-[color:var(--primary-500)]/30 hover:bg-[color:var(--primary-500)]/40 transition-colors"
                title="Upload Notes"
              >
                <Upload size={14} /> Upload
              </button>
            )}
          </div>
          <div className="relative z-10 flex-1 flex flex-col min-h-0">
            <MaterialList items={notesMaterials} />
          </div>
        </section>

        {/* Important Questions Section */}
        <section className="glass-panel p-6 rounded-2xl border-t-4 border-t-purple-500 relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none"></div>
          <div className="flex items-start justify-between mb-6 relative z-10 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                <HelpCircle size={20} />
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">Important<br/>Questions</h2>
            </div>
            {(isAdmin || isContributor) && (
              <button 
                onClick={() => { setUploadCategory("questions"); setIsUploadModalOpen(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[color:var(--primary-500)]/20 text-[color:var(--primary-300)] border border-[color:var(--primary-500)]/30 hover:bg-[color:var(--primary-500)]/40 transition-colors"
                title="Upload Important Questions"
              >
                <Upload size={14} /> Upload
              </button>
            )}
          </div>
          <div className="relative z-10 flex-1 flex flex-col min-h-0">
            <MaterialList items={questionsMaterials} />
          </div>
        </section>
      </div>

      <QuickUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        semesterId={semId} 
        subjectId={subjectId} 
        category={uploadCategory} 
        existingMaterials={materials}
        isContributor={isContributor}
        onSuccess={handleUploadSuccess} 
      />

      {/* Preview Modal */}
      {previewMat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewMat(null)}></div>
          <div className="relative w-full max-w-5xl h-[90vh] bg-[#07050d] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-white font-semibold flex items-center gap-2 truncate pr-4">
                <Eye size={18} className="text-violet-400 flex-shrink-0" />
                <span className="truncate">{previewMat.title || previewMat.fileName || "Material"}</span>
              </h3>
              <button onClick={() => setPreviewMat(null)} className="flex-shrink-0 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-white/5 relative h-full w-full">
              {previewMat.fileId ? (
                <iframe 
                  src={getDrivePreviewUrl(previewMat.fileId)} 
                  className="w-full h-full border-0" 
                  title="PDF Preview"
                  allow="autoplay"
                ></iframe>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p>Preview not available for this legacy file.</p>
                  <p className="text-sm mt-2">Please download it to view.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
