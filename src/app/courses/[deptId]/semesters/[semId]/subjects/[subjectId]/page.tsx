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

export default function SubjectPage({ params }: { params: Promise<{ deptId: string, semId: string, subjectId: string }> }) {
  const resolvedParams = use(params);
  const { deptId, semId, subjectId } = resolvedParams;
  const { user, isAdmin, isContributor, loading: authLoading } = useAuth();
  const { subjects: dynamicSubjects } = useSubjects();
  
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"pyq" | "notes" | "questions">("pyq");
  const [previewMat, setPreviewMat] = useState<any | null>(null);

  const semesterSubjects = dynamicSubjects[deptId]?.[semId] || [];
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

  const fetchMaterialsAndBookmarks = async () => {
    try {
      const qMaterials = query(
        collection(db, "materials"),
        where("semesterId", "==", semId),
        where("subjectId", "==", subjectId)
      );
      const matSnapshot = await getDocs(qMaterials);
      let matList = matSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter by departmentId dynamically (handling old records without deptId as 'btech')
      matList = matList.filter((m: any) => {
        const mDept = m.departmentId || "btech";
        return mDept === deptId;
      });

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

  useEffect(() => {
    fetchMaterialsAndBookmarks();
  }, [deptId, semId, subjectId, user, isAdmin]);

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
      if (isBookmarked) {
        await deleteDoc(docRef);
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.delete(mat.id);
          return next;
        });
      } else {
        await setDoc(docRef, {
          title: mat.title,
          category: mat.category,
          fileName: mat.fileName,
          fileId: mat.fileId,
          subjectId,
          semesterId: semId,
          departmentId: deptId,
          bookmarkedAt: Date.now()
        });
        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.add(mat.id);
          return next;
        });
      }
    } catch (err) {
      console.error("Error bookmarking:", err);
    }
  };

  const pyqs = materials.filter(m => m.category === "pyq");
  const notes = materials.filter(m => m.category === "notes");
  const questions = materials.filter(m => m.category === "questions");

  const openUploadModal = (category: "pyq" | "notes" | "questions") => {
    setUploadCategory(category);
    setIsUploadModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">PENDING</span>;
      case "rejected":
        return <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">REJECTED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link href={`/courses/${deptId}/semesters/${semId}`} className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Subjects
      </Link>

      <div className="mb-12 relative z-10">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest">
            {deptId.toUpperCase()}
          </span>
          <span className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest">
            SEM {semId}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">{subjectName}</h1>
        {subject?.code && (
          <p className="text-lg text-purple-400 font-medium tracking-wide uppercase">{subject.code}</p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 w-full">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
          <p className="text-gray-400">Syncing materials...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PYQs Section */}
          <div className="vision-glass p-6 rounded-[2rem] border border-white/5 relative flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="text-purple-400" /> Past Papers (PYQs)
                </h3>
                {user && (
                  <button onClick={() => openUploadModal("pyq")} className="text-xs text-purple-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-purple-500/20 transition-all cursor-pointer">
                    <Upload size={12} /> Upload
                  </button>
                )}
              </div>

              {pyqs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <FileText className="mx-auto mb-2 opacity-30" size={36} />
                  <p className="text-sm">No PYQs uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pyqs.map(mat => (
                    <div key={mat.id} className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between transition-all group">
                      <div className="min-w-0 pr-2">
                        <p className="text-sm text-white font-medium truncate" title={mat.title}>{mat.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 font-semibold truncate">{mat.fileName}</span>
                          {getStatusBadge(mat.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleBookmark(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Bookmark">
                          <Bookmark size={15} className={bookmarkedIds.has(mat.id) ? "fill-purple-400 text-purple-400" : ""} />
                        </button>
                        <button onClick={() => setPreviewMat(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Preview">
                          <Eye size={15} />
                        </button>
                        <a href={getDownloadHref(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Download">
                          <Download size={15} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="vision-glass p-6 rounded-[2rem] border border-white/5 relative flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="text-purple-400" /> Syllabus & Notes
                </h3>
                {user && (
                  <button onClick={() => openUploadModal("notes")} className="text-xs text-purple-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-purple-500/20 transition-all cursor-pointer">
                    <Upload size={12} /> Upload
                  </button>
                )}
              </div>

              {notes.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <FileText className="mx-auto mb-2 opacity-30" size={36} />
                  <p className="text-sm">No notes uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map(mat => (
                    <div key={mat.id} className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between transition-all group">
                      <div className="min-w-0 pr-2">
                        <p className="text-sm text-white font-medium truncate" title={mat.title}>{mat.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 font-semibold truncate">{mat.fileName}</span>
                          {getStatusBadge(mat.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleBookmark(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Bookmark">
                          <Bookmark size={15} className={bookmarkedIds.has(mat.id) ? "fill-purple-400 text-purple-400" : ""} />
                        </button>
                        <button onClick={() => setPreviewMat(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Preview">
                          <Eye size={15} />
                        </button>
                        <a href={getDownloadHref(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Download">
                          <Download size={15} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Important Questions Section */}
          <div className="vision-glass p-6 rounded-[2rem] border border-white/5 relative flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <HelpCircle className="text-purple-400" /> Key Questions & Guides
                </h3>
                {user && (
                  <button onClick={() => openUploadModal("questions")} className="text-xs text-purple-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-purple-500/20 transition-all cursor-pointer">
                    <Upload size={12} /> Upload
                  </button>
                )}
              </div>

              {questions.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <FileText className="mx-auto mb-2 opacity-30" size={36} />
                  <p className="text-sm">No materials uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map(mat => (
                    <div key={mat.id} className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between transition-all group">
                      <div className="min-w-0 pr-2">
                        <p className="text-sm text-white font-medium truncate" title={mat.title}>{mat.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 font-semibold truncate">{mat.fileName}</span>
                          {getStatusBadge(mat.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleBookmark(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Bookmark">
                          <Bookmark size={15} className={bookmarkedIds.has(mat.id) ? "fill-purple-400 text-purple-400" : ""} />
                        </button>
                        <button onClick={() => setPreviewMat(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Preview">
                          <Eye size={15} />
                        </button>
                        <a href={getDownloadHref(mat)} className="p-2 text-gray-500 hover:text-purple-400 transition-colors" title="Download">
                          <Download size={15} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* PDF / Document Preview Lightbox Modal */}
      {previewMat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setPreviewMat(null)}></div>
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#07050d] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col z-10 shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base truncate max-w-md">{previewMat.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{previewMat.fileName}</p>
              </div>
              <button onClick={() => setPreviewMat(null)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 w-full bg-black relative">
              <iframe 
                src={getDrivePreviewUrl(previewMat.fileId)} 
                className="w-full h-full border-none"
                allow="autoplay"
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <QuickUploadModal 
          isOpen={isUploadModalOpen} 
          onClose={() => setIsUploadModalOpen(false)} 
          semesterId={semId} 
          subjectId={subjectId} 
          departmentId={deptId}
          category={uploadCategory} 
          onSuccess={fetchMaterialsAndBookmarks} 
        />
      )}
    </div>
  );
}
