"use client";

import { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, increment, getDoc } from "firebase/firestore";
import Link from "next/link";
import { FileText, Loader2, Download, History, BookOpen, HelpCircle, Upload, Sparkles, Clock, Lock, Eye, X, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import SafeBackButton from "@/components/SafeBackButton";
import { useSubjects } from "@/context/SubjectsContext";
import { useAuth } from "@/context/AuthContext";
import QuickUploadModal from "@/components/QuickUploadModal";
import SuggestSubjectModal from "@/components/SuggestSubjectModal";
import DocPreviewViewer from "@/components/DocPreviewViewer";
import { getDownloadHref, getDrivePreviewUrl, triggerSecureDownload } from "@/lib/driveUtils";
import { useToast } from "@/components/Toast";
import { logFirestoreRead, logFirestoreCacheHit } from "@/lib/firestoreDiagnostics";

const contributorCache: Record<string, string> = {};
const subjectDataCache: Record<string, { materials: any[], survivalNotes: any[] }> = {};

export default function SubjectClientComponent({ params }: { params: Promise<{ deptId: string, semId: string, subjectId: string }> }) {
  const resolvedParams = use(params);
  const { deptId, semId, subjectId } = resolvedParams;
  const { user, isAdmin, isContributor, loading: authLoading } = useAuth();
  const { showToast, dismissToast } = useToast();
  const { subjects: dynamicSubjects, lazyLoadSubjects } = useSubjects();

  useEffect(() => {
    if (deptId && semId && lazyLoadSubjects) {
      lazyLoadSubjects(deptId, semId);
    }
  }, [deptId, semId, lazyLoadSubjects]);
  
  const [materials, setMaterials] = useState<any[]>([]);
  const [survivalNotes, setSurvivalNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"pyq" | "notes" | "questions">("pyq");
  const [previewMat, setPreviewMat] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const semesterSubjects = dynamicSubjects[deptId]?.[semId] || [];
  const subject = semesterSubjects.find(s => s.id === subjectId);
  const subjectName = subject?.name || subjectId.replace(/([a-zA-Z]+)(\d+)/, '$1 $2').toUpperCase();

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

  const fetchMaterials = async (forceRefetch = false) => {
    const cacheKey = `${deptId}_${semId}_${subjectId}`;
    if (forceRefetch) {
      delete subjectDataCache[cacheKey];
    }

    if (!forceRefetch && subjectDataCache[cacheKey]) {
      logFirestoreCacheHit(`SubjectClientComponent (${cacheKey})`, "Serving materials from session cache");
      setMaterials(subjectDataCache[cacheKey].materials);
      setSurvivalNotes(subjectDataCache[cacheKey].survivalNotes);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      logFirestoreRead(`materials & survival_notes (${cacheKey})`, "Fetching subject materials from Firestore");
      // 1. Fetch Subject Materials
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

      // 2. Fetch Approved Survival Advice (Senior Insights)
      const qSurvival = query(
        collection(db, "survival_notes"),
        where("departmentId", "==", deptId),
        where("semesterId", "==", semId),
        where("subjectId", "==", subjectId),
        where("status", "==", "approved")
      );
      const survSnapshot = await getDocs(qSurvival);
      const list: any[] = [];
      
      const contributorIds = new Set<string>();
      survSnapshot.forEach(d => {
        const data = d.data();
        if (data.contributorId) contributorIds.add(data.contributorId);
      });

      const userLevels: Record<string, string> = {};
      const uidsToFetch: string[] = [];
      contributorIds.forEach(uid => {
        if (contributorCache[uid]) {
          userLevels[uid] = contributorCache[uid];
        } else {
          uidsToFetch.push(uid);
        }
      });

      if (uidsToFetch.length > 0) {
        const userPromises = uidsToFetch.map(uid => getDoc(doc(db, "users", uid)));
        const userSnaps = await Promise.all(userPromises);
        userSnaps.forEach(us => {
          if (us.exists()) {
            const udata = us.data();
            const urole = udata.role || "student";
            let level = "STUDENT";
            if (urole === "admin") {
              level = "👑 PAPERINO ADMIN";
            } else if (urole === "moderator") {
              level = "MODERATOR";
            } else if (urole === "contributor") {
              level = "CONTRIBUTOR";
            }
            contributorCache[us.id] = level;
            userLevels[us.id] = level;
          }
        });
      }

      survSnapshot.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          ...data,
          contributorLevel: userLevels[data.contributorId] || "STUDENT"
        });
      });

      // Sort by helpfulness score (helpful - notHelpful)
      list.sort((a, b) => {
        const scoreA = (a.helpfulCount || 0) - (a.notHelpfulCount || 0);
        const scoreB = (b.helpfulCount || 0) - (b.notHelpfulCount || 0);
        return scoreB - scoreA;
      });

      // Save to cache
      subjectDataCache[cacheKey] = {
        materials: matList,
        survivalNotes: list
      };

      setMaterials(matList);
      setSurvivalNotes(list);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (noteId: string, type: "helpful" | "notHelpful") => {
    if (!user) return;
    const noteRef = doc(db, "survival_notes", noteId);
    const note = survivalNotes.find(n => n.id === noteId);
    if (!note) return;

    const uid = user.uid;
    const helpfulUsers = note.helpfulUsers || [];
    const notHelpfulUsers = note.notHelpfulUsers || [];
    const hasVotedHelpful = helpfulUsers.includes(uid);
    const hasVotedNotHelpful = notHelpfulUsers.includes(uid);

    try {
      if (type === "helpful") {
        if (hasVotedHelpful) {
          await updateDoc(noteRef, {
            helpfulCount: increment(-1),
            helpfulUsers: arrayRemove(uid)
          });
        } else {
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
          await updateDoc(noteRef, {
            notHelpfulCount: increment(-1),
            notHelpfulUsers: arrayRemove(uid)
          });
        } else {
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
      fetchMaterials(true); // Reload lists to refresh UI immediately and invalidate cache
    } catch (err) {
      console.error("Voting failed:", err);
    }
  };

  const handleDeleteInsight = async (noteId: string) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to permanently delete this Senior Insight?")) return;
    try {
      await deleteDoc(doc(db, "survival_notes", noteId));
      delete subjectDataCache[`${deptId}_${semId}_${subjectId}`];
      setSurvivalNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error("Delete insight failed:", err);
    }
  };

  useEffect(() => {
    fetchMaterials(false);
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
        <SafeBackButton 
          fallbackUrl={`/courses/${deptId}/semesters/${semId}`} 
          label="Back to Semester"
          className="group inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-all bg-white/[0.04] backdrop-blur-md px-4.5 py-2 rounded-full border border-white/[0.08] mb-8 hover:-translate-x-0.5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)]"
          size={14}
        />

        {/* Header with Premium Glow */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500 relative">
          <div className="absolute -top-8 -left-8 w-[300px] h-[200px] bg-[radial-gradient(ellipse,rgba(var(--primary-rgb),0.20)_0%,transparent_70%)] filter blur-[60px] pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--primary-400)] mb-1 relative z-10">SRM Hub • B.Tech • Semester {semId}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 relative z-10 drop-shadow-[0_0_25px_rgba(var(--primary-rgb),0.15)]">{subjectName}</h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed relative z-10">
            Access {subjectName} notes, syllabus, previous year question papers (PYQs), important questions and study materials for SRM Institute of Science and Technology students on Paperino.
          </p>

          {/* Hidden Crawlable SEO Text for Search Engines */}
          <div className="sr-only">
            <span>SRM Institute of Science and Technology</span>
            <span>SRM students</span>
            <span>B.Tech</span>
            <span>Semester {semId}</span>
            <span>{subjectName} Notes</span>
            <span>{subjectName} Study Materials</span>
            <span>{subjectName} Previous Year Question Papers</span>
            <span>{subjectName} PYQs</span>
            <span>{subjectName} Syllabus</span>
            <span>{subjectName} Important Questions</span>
          </div>

          {/* JSON-LD Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": `${subjectName} Notes, PYQs & Study Materials | SRM | Paperino`,
                "description": `Access ${subjectName} notes, syllabus, previous year question papers (PYQs), important questions and study materials for SRM Institute of Science and Technology students on Paperino.`,
                "url": `https://paperino-eta.vercel.app/courses/${deptId}/semesters/${semId}/subjects/${subjectId}`,
                "provider": {
                  "@type": "Organization",
                  "name": "Paperino",
                  "url": "https://paperino-eta.vercel.app"
                },
                "about": {
                  "@type": "EducationalOccupationalProgram",
                  "name": `${subjectName}`,
                  "educationalProgramMode": "B.Tech",
                  "provider": {
                    "@type": "CollegeOrUniversity",
                    "name": "SRM Institute of Science and Technology"
                  }
                },
                "breadcrumb": {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://paperino-eta.vercel.app"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "B.Tech",
                      "item": "https://paperino-eta.vercel.app/btech"
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": `Semester ${semId}`,
                      "item": `https://paperino-eta.vercel.app/courses/${deptId}/semesters/${semId}`
                    },
                    {
                      "@type": "ListItem",
                      "position": 4,
                      "name": subjectName,
                      "item": `https://paperino-eta.vercel.app/courses/${deptId}/semesters/${semId}/subjects/${subjectId}`
                    }
                  ]
                }
              })
            }}
          />
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
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <History className="text-purple-400" /> Past Papers (PYQs)
                  </h2>
                  {user && (
                    <button onClick={() => openUploadModal("pyq")} className="text-xs text-purple-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-purple-500/20 transition-all cursor-pointer">
                      <Upload size={12} /> Upload
                    </button>
                  )}
                </div>

                {pyqs.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-2 opacity-30" size={36} />
                    <p className="text-sm">Help Build the PYQ Library</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pyqs.map(mat => (
                      <div key={mat.id} className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between transition-all group">
                        <div className="min-w-0 pr-2">
                          <p className="text-sm text-white font-medium truncate" title={`${subjectName} ${mat.title}`} aria-label={`${subjectName} ${mat.title}`}>{mat.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-500 font-semibold truncate">{mat.fileName}</span>
                            {getStatusBadge(mat.status)}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          <button onClick={() => setPreviewMat(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title={`Preview ${subjectName} ${mat.title}`} aria-label={`Preview ${subjectName} ${mat.title}`}>
                            <Eye size={14} />
                          </button>
                          <button 
                            disabled={downloadingId === mat.id}
                            onClick={() => {
                              setDownloadingId(mat.id);
                              triggerSecureDownload(mat, showToast, dismissToast, (loading) => {
                                if (!loading) setDownloadingId(null);
                              });
                            }} 
                            className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed" 
                            title={downloadingId === mat.id ? "Downloading..." : `Download ${subjectName} ${mat.title}`}
                            aria-label={`Download ${subjectName} ${mat.title}`}
                          >
                            {downloadingId === mat.id ? <Loader2 size={14} className="text-purple-400 animate-spin" /> : <Download size={14} />}
                          </button>
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
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="text-purple-400" /> Syllabus & Notes
                  </h2>
                  {user && (
                    <button onClick={() => openUploadModal("notes")} className="text-xs text-purple-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-purple-500/20 transition-all cursor-pointer">
                      <Upload size={12} /> Upload
                    </button>
                  )}
                </div>

                {notes.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-2 opacity-30" size={36} />
                    <p className="text-sm">Expand the Notes Library</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notes.map(mat => (
                      <div key={mat.id} className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between transition-all group">
                        <div className="min-w-0 pr-2">
                          <p className="text-sm text-white font-medium truncate" title={`${subjectName} ${mat.title}`} aria-label={`${subjectName} ${mat.title}`}>{mat.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-500 font-semibold truncate">{mat.fileName}</span>
                            {getStatusBadge(mat.status)}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          <button onClick={() => setPreviewMat(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title={`Preview ${subjectName} ${mat.title}`} aria-label={`Preview ${subjectName} ${mat.title}`}>
                            <Eye size={14} />
                          </button>
                          <button 
                            disabled={downloadingId === mat.id}
                            onClick={() => {
                              setDownloadingId(mat.id);
                              triggerSecureDownload(mat, showToast, dismissToast, (loading) => {
                                if (!loading) setDownloadingId(null);
                              });
                            }} 
                            className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed" 
                            title={downloadingId === mat.id ? "Downloading..." : `Download ${subjectName} ${mat.title}`}
                            aria-label={`Download ${subjectName} ${mat.title}`}
                          >
                            {downloadingId === mat.id ? <Loader2 size={14} className="text-purple-400 animate-spin" /> : <Download size={14} />}
                          </button>
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
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <HelpCircle className="text-purple-400" /> Key Questions & Guides
                  </h2>
                  {user && (
                    <button onClick={() => openUploadModal("questions")} className="text-xs text-purple-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 hover:bg-purple-500/20 transition-all cursor-pointer">
                      <Upload size={12} /> Upload
                    </button>
                  )}
                </div>

                {questions.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-2 opacity-30" size={36} />
                    <p className="text-sm">Build the Exam Guide</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questions.map(mat => (
                      <div key={mat.id} className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between transition-all group">
                        <div className="min-w-0 pr-2">
                          <p className="text-sm text-white font-medium truncate" title={`${subjectName} ${mat.title}`} aria-label={`${subjectName} ${mat.title}`}>{mat.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-500 font-semibold truncate">{mat.fileName}</span>
                            {getStatusBadge(mat.status)}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          <button onClick={() => setPreviewMat(mat)} className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5" title={`Preview ${subjectName} ${mat.title}`} aria-label={`Preview ${subjectName} ${mat.title}`}>
                            <Eye size={14} />
                          </button>
                          <button 
                            disabled={downloadingId === mat.id}
                            onClick={() => {
                              setDownloadingId(mat.id);
                              triggerSecureDownload(mat, showToast, dismissToast, (loading) => {
                                if (!loading) setDownloadingId(null);
                              });
                            }} 
                            className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed" 
                            title={downloadingId === mat.id ? "Downloading..." : `Download ${subjectName} ${mat.title}`}
                            aria-label={`Download ${subjectName} ${mat.title}`}
                          >
                            {downloadingId === mat.id ? <Loader2 size={14} className="text-purple-400 animate-spin" /> : <Download size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── Senior Survival Advice Section ── */}
        {!loading && (
          <div className="mt-12 space-y-6 animate-in fade-in duration-700">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                  <Sparkles size={16} className="text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Senior Survival Advice</h2>
              </div>
            </div>

            {survivalNotes.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                <p className="text-gray-400 text-sm font-medium">No Senior Insights available for this subject yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {survivalNotes.map((note) => {
                  const hasVotedHelpful = note.helpfulUsers?.includes(user?.uid || "");
                  const hasVotedNotHelpful = note.notHelpfulUsers?.includes(user?.uid || "");

                  return (
                    <div 
                      key={note.id} 
                      className="vision-glass p-6 rounded-[2rem] border border-white/[0.08] relative flex flex-col justify-between shadow-[0_0_30px_rgba(var(--primary-rgb),0.04)] hover:shadow-[0_0_45px_rgba(var(--primary-rgb),0.08)] transition-all duration-300 group hover:border-violet-500/20"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 gap-2">
                          <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/25 text-violet-300 rounded-full text-[10px] font-bold tracking-wide uppercase">
                            {note.category}
                          </span>
                          
                          {/* Admin Manage Mode Delete Button */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteInsight(note.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 text-red-400 transition-all cursor-pointer"
                              title="Delete insight permanently"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* Text */}
                        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line font-medium mb-4">
                          {note.content}
                        </p>
                      </div>

                      {/* Footer & Voting info */}
                      <div className="border-t border-white/[0.06] pt-4 mt-auto flex flex-col gap-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {/* Contributor Profile */}
                          <div className="flex flex-col">
                            <span className="text-xs text-white font-bold">{note.contributorName || "Anonymous Senior"}</span>
                            <span className="text-[9px] text-violet-400 font-bold uppercase tracking-wider">
                              Level: {note.contributorLevel || "Contributor"}
                            </span>
                          </div>

                          {/* Date Info */}
                          <span className="text-[10px] text-gray-500 font-semibold">
                            {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : new Date(note.createdAt || 0).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Interactive Voting Row */}
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            onClick={() => handleVote(note.id, "helpful")}
                            disabled={!user}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                              hasVotedHelpful
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : "bg-white/5 border-transparent text-gray-400 hover:text-white"
                            }`}
                          >
                            <ThumbsUp size={12} />
                            <span>Helpful ({note.helpfulCount || 0})</span>
                          </button>

                          <button
                            onClick={() => handleVote(note.id, "notHelpful")}
                            disabled={!user}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                              hasVotedNotHelpful
                                ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                                : "bg-white/5 border-transparent text-gray-400 hover:text-white"
                            }`}
                          >
                            <ThumbsDown size={12} />
                            <span>Not Helpful ({note.notHelpfulCount || 0})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                <button 
                  disabled={downloadingId === previewMat.id}
                  onClick={() => {
                    setDownloadingId(previewMat.id);
                    triggerSecureDownload(previewMat, showToast, dismissToast, (loading) => {
                      if (!loading) setDownloadingId(null);
                    });
                  }} 
                  className="p-2 text-gray-400 hover:text-purple-400 transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed" 
                  title={downloadingId === previewMat.id ? "Downloading..." : "Download File"}
                >
                  {downloadingId === previewMat.id ? <Loader2 size={16} className="text-purple-400 animate-spin" /> : <Download size={16} />}
                </button>
                <button onClick={() => setPreviewMat(null)} className="p-2 text-gray-400 hover:text-white transition-colors" title="Close Preview">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Preview container */}
            <div className="flex-1 bg-[#050308] relative min-h-[500px]">
              <DocPreviewViewer
                mat={previewMat}
                onDownload={() => {
                  setDownloadingId(previewMat.id);
                  triggerSecureDownload(previewMat, showToast, dismissToast, (loading) => {
                    if (!loading) setDownloadingId(null);
                  });
                }}
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
          onSuccess={() => fetchMaterials(true)}
          departmentId={deptId}
          semesterId={semId}
          subjectId={subjectId}
          category={uploadCategory}
        />
      )}
    </div>
  );
}
