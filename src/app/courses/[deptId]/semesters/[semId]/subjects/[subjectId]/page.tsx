"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Download, History, BookOpen, HelpCircle, Upload, Sparkles, Clock, Lock, Eye, X } from "lucide-react";
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

  const fetchMaterials = async () => {
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
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
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

  const pyqs = materials.filter(m => m.category === "pyq");
  const notes = materials.filter(m => m.category === "notes");
  const questions = materials.filter(m => m.category === "questions");

  const openUploadModal = (category: "pyq" | "notes" | "questions") => {
    setUploadCategory(category);
    setIsUploadModalOpen(true);
  };

  const getStatusBadge = (status?: string) => {
    if (!status || status === "approved") return null;
    if (status === "pending") {
      return <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">Pending</span>;
    }
    if (status === "rejected") {
      return <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-wider">Rejected</span>;
    }
    return null;
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[rgba(var(--primary-rgb),0.12)] via-[var(--background)] to-[var(--background)] text-white py-12 relative overflow-hidden selection:bg-purple-500/20">
      {/* ── Background Ambient Glow Layers ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Primary violet orb — top-left */}
        <div className="absolute top-[-15%] left-[-10%] w-[900px] h-[900px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.22)_0%,transparent_65%)] rounded-full mix-blend-screen filter blur-[100px]" />
        {/* Secondary cyan orb — bottom-right */}
        <div className="absolute bottom-[-15%] right-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.16)_0%,transparent_65%)] rounded-full mix-blend-screen filter blur-[120px]" />
        {/* Center hero glow */}
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse,rgba(var(--primary-rgb),0.18)_0%,transparent_70%)] filter blur-[80px]" />
        {/* Subtle mid-page violet wash */}
        <div className="absolute top-[40%] left-[20%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.08)_0%,transparent_70%)] filter blur-[90px]" />
        {/* Cyan accent — right side */}
        <div className="absolute top-[30%] right-[-5%] w-[400px] h-[600px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.10)_0%,transparent_70%)] filter blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Back Button */}
        <Link 
          href={`/courses/${deptId}/semesters/${semId}`} 
          className="group inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-all bg-white/[0.04] backdrop-blur-md px-4.5 py-2 rounded-full border border-white/[0.08] mb-8 hover:-translate-x-0.5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)]"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" /> Back to Semester
        </Link>

        {/* Header with Premium Glow */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500 relative">
          <div className="absolute -top-8 -left-8 w-[300px] h-[200px] bg-[radial-gradient(ellipse,rgba(var(--primary-rgb),0.20)_0%,transparent_70%)] filter blur-[60px] pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--primary-400)] mb-1 relative z-10">SRM Hub • B.Tech</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 relative z-10 drop-shadow-[0_0_25px_rgba(var(--primary-rgb),0.15)]">{subjectName}</h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed relative z-10">
            Access curated study materials and collaborate with other students by uploading resources.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin text-purple-500 inline-block mb-3" size={36} />
            <p className="text-gray-400 text-sm">Synchronizing classroom resources...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-700">
            
            {/* PYQ Section */}
            <div className="vision-glass p-6 rounded-[2rem] border border-white/[0.08] relative flex flex-col justify-between min-h-[300px] shadow-[0_0_30px_rgba(var(--primary-rgb),0.06)]">
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
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          <button onClick={() => setPreviewMat(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title="Preview">
                            <Eye size={14} />
                          </button>
                          <a href={getDownloadHref(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title="Download">
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="vision-glass p-6 rounded-[2rem] border border-white/[0.08] relative flex flex-col justify-between min-h-[300px] shadow-[0_0_30px_rgba(var(--primary-rgb),0.06)]">
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
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          <button onClick={() => setPreviewMat(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title="Preview">
                            <Eye size={14} />
                          </button>
                          <a href={getDownloadHref(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title="Download">
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Important Questions Section */}
            <div className="vision-glass p-6 rounded-[2rem] border border-white/[0.08] relative flex flex-col justify-between min-h-[300px] shadow-[0_0_30px_rgba(var(--primary-rgb),0.06)]">
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
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          <button onClick={() => setPreviewMat(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title="Preview">
                            <Eye size={14} />
                          </button>
                          <a href={getDownloadHref(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title="Download">
                            <Download size={14} />
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

      </div>

      {/* PDF / Document Preview Lightbox Overlay */}
      {previewMat && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPreviewMat(null)}></div>
          <div className="bg-[#0b0816] w-full max-w-5xl h-[85vh] rounded-3xl border border-white/10 overflow-hidden flex flex-col relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-black/30">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate" title={previewMat.title}>{previewMat.title}</h3>
                <p className="text-[10px] text-gray-500 font-semibold truncate mt-0.5">{previewMat.fileName}</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={getDownloadHref(previewMat)} className="p-2 text-gray-400 hover:text-purple-400 transition-colors" title="Download File">
                  <Download size={16} />
                </a>
                <button onClick={() => setPreviewMat(null)} className="p-2 text-gray-400 hover:text-white transition-colors" title="Close Preview">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Iframe container */}
            <div className="flex-1 bg-[#050308] relative">
              <iframe 
                src={getDrivePreviewUrl(previewMat.fileId)} 
                className="w-full h-full border-none"
                allow="autoplay"
                title="Material Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <QuickUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={fetchMaterials}
          departmentId={deptId}
          semesterId={semId}
          subjectId={subjectId}
          category={uploadCategory}
        />
      )}
    </div>
  );
}
