"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { FileText, Loader2, Download, Check, History, BookOpen, HelpCircle, Upload, Sparkles, Clock, Lock, Eye, X, ThumbsUp, ThumbsDown, Trash2, Plus, ArrowLeft } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";

const QuickUploadModal = dynamic(() => import("@/components/QuickUploadModal"), { ssr: false });
const SuggestSubjectModal = dynamic(() => import("@/components/SuggestSubjectModal"), { ssr: false });
const DocPreviewViewer = dynamic(() => import("@/components/DocPreviewViewer"), {
  loading: () => (
    <div className="flex flex-col items-center justify-center p-12 text-purple-400">
      <Loader2 className="animate-spin mb-3" size={32} />
      <p className="text-xs text-gray-400">Loading document viewer...</p>
    </div>
  ),
  ssr: false
});
import { triggerSecureDownload } from "@/lib/driveUtils";
import { useToast } from "@/components/Toast";
import { usePlanGate } from "@/context/PlanGateContext";
import { logFirestoreRead, logFirestoreCacheHit } from "@/lib/firestoreDiagnostics";

import { getSubjectSlug } from "@/lib/seoUtils";
import { SITE_CONFIG } from "@/lib/siteConfig";
import { SUBJECTS as STATIC_SUBJECTS, COMPREHENSIVE_CATALOG } from "@/lib/subjects";
import PartnerSlot from "@/components/ads/PartnerSlot";

const contributorCache: Record<string, string> = {};
const getCachedContributorLevel = (uid: string): string | null => {
  if (contributorCache[uid]) return contributorCache[uid];
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("paperino_contributor_cache");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[uid]) {
          contributorCache[uid] = parsed[uid];
          return parsed[uid];
        }
      }
    } catch {}
  }
  return null;
};

const setCachedContributorLevel = (uid: string, level: string) => {
  contributorCache[uid] = level;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("paperino_contributor_cache");
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[uid] = level;
      sessionStorage.setItem("paperino_contributor_cache", JSON.stringify(parsed));
    } catch {}
  }
};
const subjectDataCache: Record<string, { materials: any[], sections?: string[], timestamp: number, fetched?: boolean }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10-minute cache TTL

interface ServerOverview {
  subjectName: string;
  subjectCode: string;
  deptName: string;
  deptCode: string;
  semId: string;
  universityName: string;
  materialsCount: number;
  notesCount: number;
  pyqsCount: number;
  questionsCount: number;
}

export default function SubjectClientComponent({
  params,
  serverOverview,
  initialMaterials
}: {
  params: Promise<{ deptId: string, semId: string, subjectId: string }>;
  serverOverview?: ServerOverview;
  initialMaterials?: any[];
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { deptId, semId, subjectId } = resolvedParams;
  const { user, isAdmin, isContributor, loading: authLoading, canAccess } = useAuth();
  const { showPlanGate } = usePlanGate();
  const { showToast, dismissToast } = useToast();
  const { subjects: dynamicSubjects, lazyLoadSubjects, deleteSubject, departments } = useSubjects();
  const currentDeptName = serverOverview?.deptName || departments.find(d => d.id === deptId)?.name || (deptId === "btech" ? "B.Tech" : (deptId || "").toUpperCase());

  useEffect(() => {
    if (deptId && semId && lazyLoadSubjects) {
      lazyLoadSubjects(deptId, semId);
    }
  }, [deptId, semId, lazyLoadSubjects]);
  
  const [materials, setMaterials] = useState<any[]>(initialMaterials || []);
  const materialsRef = useRef<any[]>(materials);
  materialsRef.current = materials;
  const fetchedSubjectKeysRef = useRef<Set<string>>(new Set());
  const [subjectSections, setSubjectSections] = useState<string[] | null>(() => {
    if (Array.isArray(initialMaterials)) {
      return Array.from(
        new Set(
          initialMaterials
            .filter((m: any) => m.status === "approved" || (!m.status && !m.rejectedAt))
            .map((m: any) => m.category)
            .filter((c: any) => ["pyq", "notes", "questions"].includes(c))
        )
      );
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(() => !Array.isArray(initialMaterials) || initialMaterials.length === 0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"pyq" | "notes" | "questions">("pyq");
  const [previewMat, setPreviewMat] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [showDeleteSubjectModal, setShowDeleteSubjectModal] = useState(false);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);
  const [isQuotaNotice, setIsQuotaNotice] = useState(false);
  const [backUrl, setBackUrl] = useState("/courses");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const refSearch = urlParams.get("refSearch");
      const savedSearch = sessionStorage.getItem("paperino_courses_search");
      const activeSearch = refSearch || savedSearch;
      if (activeSearch && activeSearch.trim()) {
        setBackUrl(`/courses?q=${encodeURIComponent(activeSearch.trim())}`);
      }
    }
  }, []);

  const handleBackToMaterials = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const refSearch = urlParams.get("refSearch");
      const savedSearch = sessionStorage.getItem("paperino_courses_search");
      const activeSearch = refSearch || savedSearch;

      if (activeSearch && activeSearch.trim()) {
        router.push(`/courses?q=${encodeURIComponent(activeSearch.trim())}`);
        return;
      }
      if (window.history.length > 1) {
        router.back();
        return;
      }
    }
    router.push("/courses");
  };

  const handleDeleteSubject = async () => {
    setIsDeletingSubject(true);
    try {
      if (deleteSubject) {
        await deleteSubject(subjectId, deptId, semId);
      }
      showToast(`Subject and all its materials have been deleted.`, "success");
      setShowDeleteSubjectModal(false);
      router.replace("/courses");
    } catch (err: any) {
      console.error("Failed to delete subject:", err);
      showToast(err.message || "Failed to delete subject.", "error");
    } finally {
      setIsDeletingSubject(false);
    }
  };

  const handlePreviewClick = (mat: any) => {
    if (mat.isConfiguredFallback) {
      showToast("Firebase daily read quota is active. In-browser document preview will resume as soon as the quota resets.", "info");
      return;
    }
    if (!canAccess("pdfPreview")) {
      showPlanGate("In-browser PDF Preview", "plus", "PDF preview is a premium feature. Upgrade to Plus, Pro, or Premium to view materials instantly in your browser.");
      return;
    }
    setPreviewMat(mat);
  };

  const handleDownloadMaterial = async (mat: any) => {
    if (mat.isConfiguredFallback) {
      showToast("Firebase daily read quota is active. Direct file downloading will resume as soon as the quota resets.", "info");
      return;
    }
    if (downloadingId === mat.id) return;
    setDownloadingId(mat.id);
    const success = await triggerSecureDownload(mat, showToast, dismissToast, (loading) => {
      if (!loading) setDownloadingId(null);
    });
    if (success) {
      setDownloadedId(mat.id);
      setTimeout(() => {
        setDownloadedId(prev => (prev === mat.id ? null : prev));
      }, 2500);
    }
  };

  const semesterSubjects = dynamicSubjects[deptId]?.[semId] || [];
  const cleanSemKey = String(semId).replace(/^semester-/, "");
  const staticSemesterSubs = STATIC_SUBJECTS[cleanSemKey] || [];
  const catalogSubs = (COMPREHENSIVE_CATALOG || []).filter(
    s => (s.departmentId === deptId || s.departmentId === (deptId || "").toLowerCase()) && String(s.semesterId) === cleanSemKey
  );
  // Put static semester subjects first so canonical SRM IDs (e.g. 'acca', 'calc') are prioritized
  const allKnownSubjects = [...staticSemesterSubs, ...semesterSubjects, ...catalogSubs];

  const foundSubject = allKnownSubjects.find(
    s => s.id.toLowerCase() === subjectId.toLowerCase() || 
         getSubjectSlug(s) === subjectId.toLowerCase() ||
         s.name.toLowerCase() === subjectId.toLowerCase()
  );
  const realSubjectId = foundSubject ? foundSubject.id : subjectId;
  const subject = foundSubject || allKnownSubjects.find(s => s.id === subjectId);
  const subjectName = subject?.name || subjectId.replace(/([a-zA-Z]+)(\d+)/, '$1 $2').toUpperCase();

  const fetchMaterials = useCallback(async (forceRefetch = false) => {
    const cacheKey = `paperino_subject_v6_cache_${deptId}_${semId}_${realSubjectId}`;
    
    if (forceRefetch) {
      delete subjectDataCache[cacheKey];
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(cacheKey);
      }
    }

    const now = Date.now();
    let cachedData = subjectDataCache[cacheKey];

    // Try to recover from sessionStorage if in-memory cache is empty (e.g. after navigation/remount)
    if (!cachedData && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(cacheKey);
        if (stored) {
          cachedData = JSON.parse(stored);
          subjectDataCache[cacheKey] = cachedData; // Restore to memory
        }
      } catch (e) {
        console.warn("Failed to parse subject cache from sessionStorage", e);
      }
    }

    const hasCachedContent = !!cachedData && Array.isArray(cachedData.materials) && cachedData.materials.length > 0;
    if (!forceRefetch && hasCachedContent && (now - cachedData.timestamp < CACHE_TTL_MS)) {
      logFirestoreCacheHit(`SubjectClientComponent (${cacheKey})`, "Serving materials from session cache");
      setMaterials(cachedData.materials);
      if (Array.isArray(cachedData.sections)) {
        setSubjectSections(cachedData.sections);
      }
      setFetchError(null);
      setLoading(false);
      return;
    }

    // If initialMaterials was provided by SSR with items and not forceRefetch, use them
    if (!forceRefetch && Array.isArray(initialMaterials) && initialMaterials.length > 0 && !cachedData) {
      const approvedCats = Array.from(
        new Set(
          initialMaterials
            .filter((m: any) => m.status === "approved" || (!m.status && !m.rejectedAt))
            .map((m: any) => m.category)
            .filter((c: any) => ["pyq", "notes", "questions"].includes(c))
        )
      );
      setMaterials(initialMaterials);
      setSubjectSections(approvedCats);
      setFetchError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);

    // Resolve all possible candidate IDs/slugs for this subject
    const allCandidateIds = new Set<string>([realSubjectId, subjectId].filter(Boolean));
    allKnownSubjects.forEach(s => {
      const sSlug = getSubjectSlug(s).toLowerCase();
      if (allCandidateIds.has(s.id.toLowerCase()) || allCandidateIds.has(sSlug) || allCandidateIds.has(s.name.toLowerCase())) {
        allCandidateIds.add(s.id);
        allCandidateIds.add(s.id.toLowerCase());
        allCandidateIds.add(sSlug);
      }
    });
    const candidateList = Array.from(allCandidateIds);

    try {
      let matList: any[] | null = null;

      // Strategy 1: First try resilient first-party server API (/api/materials)
      // This bypasses client-side Firestore connection failures, ad blockers, and persistence locks
      try {
        const queryParams = new URLSearchParams({
          deptId,
          semId,
          subjectId: realSubjectId,
          slug: subjectId,
          aliases: candidateList.join(","),
          ...(forceRefetch ? { refresh: "true" } : {})
        });
        const res = await fetch(`/api/materials?${queryParams.toString()}`);
        if (res.ok) {
          const apiJson = await res.json();
          if (apiJson && apiJson.success && Array.isArray(apiJson.materials)) {
            matList = apiJson.materials;
            if (apiJson.isQuotaNotice) {
              setIsQuotaNotice(true);
            }
            if (Array.isArray(apiJson.sections) && apiJson.sections.length > 0) {
              setSubjectSections(apiJson.sections);
            }
          } else if (apiJson && apiJson.isQuotaNotice) {
            setIsQuotaNotice(true);
            setFetchError("Database Daily Free Quota Limit Reached (50,000 reads/day). All materials are 100% safe in Firestore! Quota resets shortly or upon upgrading to Firebase Blaze plan.");
            return;
          }
        }
      } catch (apiErr) {
        console.warn("Direct API materials fetch failed, falling back to client SDK:", apiErr);
      }

      // Strategy 2: Fallback to Firebase Client SDK if API was unavailable
      if (matList === null) {
        if (!db) {
          throw new Error("Database client not available");
        }
        logFirestoreRead(`materials (${cacheKey})`, "Fetching subject materials from Firestore SDK");

        const cleanSem = String(semId).replace(/^semester-/, "").trim();
        const numSem = parseInt(cleanSem, 10);

        const clientQueries: any[] = [];
        candidateList.forEach(sId => {
          clientQueries.push(
            getDocs(query(
              collection(db, "materials"),
              where("semesterId", "==", cleanSem),
              where("subjectId", "==", sId)
            ))
          );
          if (!isNaN(numSem)) {
            clientQueries.push(
              getDocs(query(
                collection(db, "materials"),
                where("semesterId", "==", numSem),
                where("subjectId", "==", sId)
              ))
            );
          }
        });

        const snapshots = await Promise.all(clientQueries);
        const seenDocIds = new Set<string>();
        const collected: any[] = [];
        snapshots.forEach(snap => {
          snap.docs.forEach((d: any) => {
            if (!seenDocIds.has(d.id)) {
              seenDocIds.add(d.id);
              collected.push({ id: d.id, ...d.data() });
            }
          });
        });
        matList = collected;
      }

      // Only include categories that actually have approved materials uploaded!
      const categoriesWithApprovedMaterials = Array.from(
        new Set(
          (matList || [])
            .filter((m: any) => m.status === "approved" || (!m.status && !m.rejectedAt))
            .map((m: any) => m.category)
            .filter((c: any) => ["pyq", "notes", "questions"].includes(c))
        )
      );

      const finalCacheData = {
        materials: matList || [],
        sections: categoriesWithApprovedMaterials,
        timestamp: Date.now(),
        fetched: true
      };

      if (matList && matList.length > 0) {
        // Save to memory cache
        subjectDataCache[cacheKey] = finalCacheData;
        
        // Save to sessionStorage cache to survive navigations
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(finalCacheData));
          } catch (e) {
            console.warn("Failed to persist subject cache to sessionStorage (possibly too large)", e);
          }
        }
      }

      setMaterials(matList || []);
      setSubjectSections(categoriesWithApprovedMaterials);
      setFetchError(null);
    } catch (error: any) {
      console.error("Error fetching subject data:", error);
      // If we already have materials in state or initialMaterials, preserve them instead of showing a blank error
      if ((materialsRef.current && materialsRef.current.length > 0) || (initialMaterials && initialMaterials.length > 0)) {
        setFetchError(null);
      } else {
        const isQuota = error?.message?.includes("Quota exceeded") || error?.code === "resource-exhausted" || error?.message?.includes("RESOURCE_EXHAUSTED");
        if (isQuota) {
          setFetchError("Database Daily Free Quota Limit Reached (50,000 reads/day). All materials are 100% safe in Firestore! Upgrade to Firebase Blaze plan or wait for the midnight PST quota reset.");
        } else {
          setFetchError("Unable to load subject materials right now. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [deptId, semId, realSubjectId, subjectId, initialMaterials]);

  // Synchronize cache ONLY when initialMaterials actually has content from SSR
  useEffect(() => {
    if (Array.isArray(initialMaterials) && initialMaterials.length > 0) {
      const cacheKey = `paperino_subject_v6_cache_${deptId}_${semId}_${realSubjectId}`;
      const approvedCats = Array.from(
        new Set(
          initialMaterials
            .filter((m: any) => m.status === "approved" || (!m.status && !m.rejectedAt))
            .map((m: any) => m.category)
            .filter((c: any) => ["pyq", "notes", "questions"].includes(c))
        )
      );
      const cachePayload = {
        materials: initialMaterials,
        sections: approvedCats,
        timestamp: Date.now(),
        fetched: true
      };
      subjectDataCache[cacheKey] = cachePayload;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(cachePayload));
        } catch {}
      }
    }
  }, [deptId, semId, realSubjectId, initialMaterials]);

  const currentKey = `${deptId}_${semId}_${realSubjectId}`;
  useEffect(() => {
    // If SSR already provided non-empty materials, no dynamic fetch needed
    if (Array.isArray(initialMaterials) && initialMaterials.length > 0) {
      setLoading(false);
      return;
    }

    if (fetchedSubjectKeysRef.current.has(currentKey)) {
      return;
    }
    fetchedSubjectKeysRef.current.add(currentKey);

    void fetchMaterials(false);
  }, [currentKey, initialMaterials, fetchMaterials]);

  // Analytics tracking for Most Visited Subject (deduplicated per session)
  useEffect(() => {
    if (subjectId) {
      const sessionKey = `tracked_subj_${subjectId}`;
      if (typeof window !== "undefined" && !sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "visit_subject", id: subjectId, name: subjectName })
        }).catch(err => console.error("Analytics tracking failed:", err));
      }
    }
  }, [subjectId, subjectName]);

  // Private Workspace Security Gate
  const subjectRecord = subject as any;
  if (subjectRecord && subjectRecord.status === "pending") {
    const isOwner = isContributor && user?.uid === subjectRecord.contributorId;
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

  // Filter materials: only approved materials are publicly visible to other students.
  // Admins and the material uploader can see pending materials.
  const visibleMaterials = materials.filter(m => {
    if (m.status === "approved" || (!m.status && !m.rejectedAt)) return true;
    if (isAdmin) return true;
    if (user && m.uploaderId === user.uid) return true;
    return false;
  });

  const pyqs = visibleMaterials.filter(m => m.category === "pyq");
  const notes = visibleMaterials.filter(m => m.category === "notes");
  const questions = visibleMaterials.filter(m => m.category === "questions");

  // Determine active sections:
  // Only categories that actually have uploaded materials are displayed as active section cards.
  // Empty sections without materials remain hidden, exactly matching the Image 1 & 2 flow.
  const activeSections: string[] = Array.from(
    new Set(
      visibleMaterials
        .map((m: any) => m.category)
        .filter((c: any) => ["pyq", "notes", "questions"].includes(c))
    )
  );




  const gridLayoutClass =
    activeSections.length === 1
      ? "grid-cols-1 max-w-xl mx-auto"
      : activeSections.length === 2
      ? "grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto"
      : "grid-cols-1 lg:grid-cols-3";

  const ALL_SECTION_KEYS: Array<"pyq" | "notes" | "questions"> = ["pyq", "notes", "questions"];
  const SECTION_CONFIG = {
    pyq: {
      label: "Question Papers",
      shortLabel: "PYQs",
      icon: History,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/30 text-purple-300",
      btnColor: "hover:bg-purple-500/20 text-purple-300 border-purple-500/30"
    },
    notes: {
      label: "Notes",
      shortLabel: "Notes",
      icon: BookOpen,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/30 text-blue-300",
      btnColor: "hover:bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    questions: {
      label: "Important Questions",
      shortLabel: "Questions",
      icon: HelpCircle,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
      btnColor: "hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
    }
  };

  const handleSectionClick = (category: "pyq" | "notes" | "questions") => {
    if (activeSections.includes(category)) {
      // Already created: open / focus the section without creating a duplicate
      const el = document.getElementById(`section-card-${category}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("ring-2", "ring-purple-400/60");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-purple-400/60");
        }, 1200);
      }
      return;
    }

    // Section does not exist: show the upload interface for that selected category.
    // Simply clicking a category must NOT create a section record.
    openUploadModal(category);
  };

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
      {/* ── Background Ambient Glow Layers (Responsive GPU-optimized) ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Primary violet orb — top-left */}
        <div className="absolute top-[-10%] left-[-10%] w-[350px] sm:w-[500px] md:w-[900px] h-[350px] sm:h-[500px] md:h-[900px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.22)_0%,transparent_65%)] rounded-full md:mix-blend-screen filter blur-[40px] sm:blur-[60px] md:blur-[100px]" />
        {/* Secondary cyan orb — bottom-right */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] sm:w-[450px] md:w-[800px] h-[300px] sm:h-[450px] md:h-[800px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.16)_0%,transparent_65%)] rounded-full md:mix-blend-screen filter blur-[40px] sm:blur-[60px] md:blur-[120px]" />
        {/* Center hero glow */}
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[450px] md:w-[700px] h-[200px] sm:h-[300px] md:h-[400px] bg-[radial-gradient(ellipse,rgba(var(--primary-rgb),0.18)_0%,transparent_70%)] filter blur-[35px] sm:blur-[50px] md:blur-[80px]" />
        {/* Subtle mid-page violet wash (Desktop only to prevent mobile overdraw) */}
        <div className="hidden md:block absolute top-[40%] left-[20%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.08)_0%,transparent_70%)] filter blur-[90px]" />
        {/* Cyan accent — right side (Desktop only to prevent mobile overdraw) */}
        <div className="hidden md:block absolute top-[30%] right-[-5%] w-[400px] h-[600px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.10)_0%,transparent_70%)] filter blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Top Navigation & Admin Actions */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link 
            href={backUrl}
            onClick={handleBackToMaterials}
            className="group inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-all bg-white/[0.04] backdrop-blur-md px-4.5 py-2 rounded-full border border-white/[0.08] hover:-translate-x-0.5 shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)] cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Materials</span>
          </Link>

          {isAdmin && (
            <button
              onClick={() => setShowDeleteSubjectModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:border-rose-500/50"
              title="Admin: Delete this entire subject and all its materials"
            >
              <Trash2 size={13} />
              <span>Delete Entire Subject</span>
            </button>
          )}
        </div>

        {/* Header with Premium Glow */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500 relative">
          <div className="absolute -top-8 -left-8 w-[300px] h-[200px] bg-[radial-gradient(ellipse,rgba(var(--primary-rgb),0.20)_0%,transparent_70%)] filter blur-[60px] pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--primary-400)] mb-1 relative z-10">SRM University • {currentDeptName} • Semester {semId}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 relative z-10 drop-shadow-[0_0_25px_rgba(var(--primary-rgb),0.15)]">{subjectName}</h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed relative z-10">
            Access {subjectName} notes, syllabus, previous year question papers (PYQs), important questions and study materials for SRM Institute of Science and Technology students on Paperino.
          </p>

          {/* Visible Subject Overview Card */}
          {serverOverview && (
            <div className="mt-8 vision-glass p-6 rounded-[2rem] border border-white/[0.08] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(var(--primary-rgb),0.06)] to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex flex-wrap gap-3 mb-4">
                  {serverOverview.subjectCode && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                      {serverOverview.subjectCode}
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                    {serverOverview.universityName}
                  </span>
                </div>
                {(() => {
                  const mCount = materials.length > 0 ? materials.length : (serverOverview.materialsCount || 0);
                  const nCount = materials.length > 0 ? materials.filter((m: any) => m.category === "notes").length : (serverOverview.notesCount || 0);
                  const pCount = materials.length > 0 ? materials.filter((m: any) => m.category === "pyq").length : (serverOverview.pyqsCount || 0);
                  const qCount = materials.length > 0 ? materials.filter((m: any) => m.category === "questions").length : (serverOverview.questionsCount || 0);

                  return (
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Study materials, lecture notes, and previous year question papers for {serverOverview.subjectName} at {serverOverview.universityName}.
                      {mCount > 0
                        ? ` This subject currently has ${mCount} verified study ${mCount === 1 ? 'resource' : 'resources'} available on Paperino, including ${nCount > 0 ? `${nCount} set${nCount === 1 ? '' : 's'} of notes` : ''}${nCount > 0 && pCount > 0 ? ', ' : ''}${pCount > 0 ? `${pCount} previous year question paper${pCount === 1 ? '' : 's'}` : ''}${(nCount > 0 || pCount > 0) && qCount > 0 ? ', and ' : ''}${qCount > 0 ? `${qCount} question bank${qCount === 1 ? '' : 's'}` : ''}.`
                        : ' Study materials, notes, and question papers for this subject are being collected and will be available soon.'
                      }
                    </p>
                  );
                })()}
              </div>
            </div>
          )}

          {/* JSON-LD Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": `${subjectName} Notes, PYQs & Study Materials | SRM | Paperino`,
                "description": `Access ${subjectName} notes, syllabus, previous year question papers (PYQs), important questions and study materials for SRM Institute of Science and Technology students on Paperino.`,
                "url": `${SITE_CONFIG.baseUrl}/srm/${deptId.toLowerCase()}/semester-${semId}`,
                "provider": {
                  "@type": "Organization",
                  "name": "Paperino",
                  "url": SITE_CONFIG.baseUrl
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
                      "item": SITE_CONFIG.baseUrl
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": "SRM Courses",
                      "item": `${SITE_CONFIG.baseUrl}/srm`
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": `Semester ${semId}`,
                      "item": `${SITE_CONFIG.baseUrl}/srm/${deptId.toLowerCase()}/semester-${semId}`
                    },
                    {
                      "@type": "ListItem",
                      "position": 4,
                      "name": subjectName,
                      "item": `${SITE_CONFIG.baseUrl}/srm/${deptId.toLowerCase()}/semester-${semId}`
                    }
                  ]
                }
              })
            }}
          />
        </div>

        {/* ── Material Categories / Section Options ── */}
        {!fetchError && (
          <div className="mb-8 flex flex-wrap items-center gap-2.5">
            {ALL_SECTION_KEYS.map((key) => {
              const conf = SECTION_CONFIG[key];
              const Icon = conf.icon;
              const isEnabled = activeSections.includes(key);

              return (
                <button
                  key={key}
                  id={`section-btn-${key}`}
                  onClick={() => handleSectionClick(key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isEnabled
                      ? "bg-purple-600/15 border-purple-500/40 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:bg-purple-600/25"
                      : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-gray-400 hover:text-white"
                  }`}
                  title={isEnabled ? `${conf.label} (Active)` : `Upload to create ${conf.label} section`}
                >
                  <Icon size={14} className={isEnabled ? conf.color : "text-gray-400"} />
                  <span>{conf.label}</span>
                  {!isEnabled && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/5 text-gray-400 border border-white/10">
                      + Upload
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {isQuotaNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300 animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>
                Firebase Spark Daily Free Read Quota reached (50,000 reads/day). Showing verified course materials and sections from local store. Full document downloads will restore when the daily quota resets.
              </span>
            </div>
            <button
              onClick={() => setIsQuotaNotice(false)}
              className="p-1 text-amber-400/70 hover:text-amber-200 transition-colors ml-2 cursor-pointer shrink-0"
              title="Dismiss notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {fetchError ? (
          <div className="py-16 text-center max-w-md mx-auto vision-glass p-8 rounded-3xl border border-red-500/20 bg-red-500/5">
            <p className="text-white font-medium mb-2">{fetchError}</p>
            <p className="text-xs text-gray-400 mb-6">Network or server error occurred while retrieving study materials.</p>
            <button
              onClick={() => fetchMaterials(true)}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse" data-testid="section-loading-skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="vision-glass p-6 rounded-[2rem] border border-white/[0.08] min-h-[300px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-6 w-36 bg-white/10 rounded-lg" />
                    <div className="h-6 w-16 bg-white/5 rounded-lg" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-12 bg-white/5 rounded-xl border border-white/5" />
                    <div className="h-12 bg-white/5 rounded-xl border border-white/5" />
                    <div className="h-12 bg-white/5 rounded-xl border border-white/5" />
                  </div>
                </div>
                <div className="h-9 bg-white/5 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : activeSections.length === 0 ? (
          <div className="py-14 text-center max-w-2xl mx-auto vision-glass p-8 rounded-3xl border border-white/10 animate-in fade-in duration-500 space-y-6" data-testid="section-empty-state">
            <div>
              <FileText className="mx-auto mb-3 text-purple-400/60" size={42} />
              <h3 className="text-xl font-bold text-white mb-2">No Material Sections Enabled Yet</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Submit study material for any category below to initiate section creation:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {ALL_SECTION_KEYS.map((key) => {
                const conf = SECTION_CONFIG[key];
                const Icon = conf.icon;

                return (
                  <button
                    key={key}
                    onClick={() => openUploadModal(key)}
                    className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 flex flex-col items-center justify-center gap-2.5 transition-all group cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-white/5 group-hover:bg-purple-500/20 transition-colors">
                      <Icon size={22} className={conf.color} />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-purple-300">
                      {conf.label}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Upload size={10} /> Upload Material
                    </span>
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <div className="pt-4 border-t border-white/5">
                <Link
                  href="/admin/subjects"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Manage All Subjects in Admin
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className={`grid ${gridLayoutClass} gap-8 items-start animate-in fade-in duration-500`}>
            
            {/* PYQ Section */}
            {activeSections.includes("pyq") && (
              <div id="section-card-pyq" className="vision-glass p-6 rounded-[2rem] border border-white/[0.08] relative flex flex-col justify-between min-h-[300px] shadow-[0_0_30px_rgba(var(--primary-rgb),0.06)] transition-all duration-300">
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

                  {loading ? (
                    <div className="py-12 text-center text-gray-400 space-y-2">
                      <Loader2 className="animate-spin text-purple-400 mx-auto" size={24} />
                      <p className="text-xs font-mono">Loading PYQs...</p>
                    </div>
                  ) : pyqs.length === 0 ? (
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
                            <button 
                              onClick={() => handlePreviewClick(mat)} 
                              className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5 cursor-pointer" 
                              title={`Preview ${subjectName} ${mat.title}`} 
                              aria-label={`Preview ${subjectName} ${mat.title}`}
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              disabled={downloadingId === mat.id}
                              onClick={() => handleDownloadMaterial(mat)} 
                              className={`p-2.5 rounded-xl transition-all border border-white/5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                                downloadedId === mat.id
                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                  : "text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10"
                              }`}
                              title={
                                downloadingId === mat.id
                                  ? "Downloading..."
                                  : downloadedId === mat.id
                                  ? "Downloaded"
                                  : `Download ${subjectName} ${mat.title}`
                              }
                              aria-label={`Download ${subjectName} ${mat.title}`}
                            >
                              {downloadingId === mat.id ? (
                                <Loader2 size={14} className="text-purple-400 animate-spin" />
                              ) : downloadedId === mat.id ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Download size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AD 03: Study Materials Grid Slot */}
            <PartnerSlot placement="study_materials" />

            {/* Notes Section */}
            {activeSections.includes("notes") && (
              <div id="section-card-notes" className="vision-glass p-6 rounded-[2rem] border border-white/[0.08] relative flex flex-col justify-between min-h-[300px] shadow-[0_0_30px_rgba(var(--primary-rgb),0.06)] transition-all duration-300">
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

                  {loading ? (
                    <div className="py-12 text-center text-gray-400 space-y-2">
                      <Loader2 className="animate-spin text-purple-400 mx-auto" size={24} />
                      <p className="text-xs font-mono">Loading Notes...</p>
                    </div>
                  ) : notes.length === 0 ? (
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
                            <button 
                              onClick={() => handlePreviewClick(mat)} 
                              className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5 cursor-pointer" 
                              title={`Preview ${subjectName} ${mat.title}`} 
                              aria-label={`Preview ${subjectName} ${mat.title}`}
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              disabled={downloadingId === mat.id}
                              onClick={() => handleDownloadMaterial(mat)} 
                              className={`p-2.5 rounded-xl transition-all border border-white/5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                                downloadedId === mat.id
                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                  : "text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10"
                              }`}
                              title={
                                downloadingId === mat.id
                                  ? "Downloading..."
                                  : downloadedId === mat.id
                                  ? "Downloaded"
                                  : `Download ${subjectName} ${mat.title}`
                              }
                              aria-label={`Download ${subjectName} ${mat.title}`}
                            >
                              {downloadingId === mat.id ? (
                                <Loader2 size={14} className="text-purple-400 animate-spin" />
                              ) : downloadedId === mat.id ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Download size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Important Questions Section */}
            {activeSections.includes("questions") && (
              <div id="section-card-questions" className="vision-glass p-6 rounded-[2rem] border border-white/[0.08] relative flex flex-col justify-between min-h-[300px] shadow-[0_0_30px_rgba(var(--primary-rgb),0.06)] transition-all duration-300">
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

                  {loading ? (
                    <div className="py-12 text-center text-gray-400 space-y-2">
                      <Loader2 className="animate-spin text-purple-400 mx-auto" size={24} />
                      <p className="text-xs font-mono">Loading Key Questions...</p>
                    </div>
                  ) : questions.length === 0 ? (
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
                            <button 
                              onClick={() => handlePreviewClick(mat)} 
                              className="p-2.5 text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10 rounded-xl transition-all border border-white/5 cursor-pointer" 
                              title={`Preview ${subjectName} ${mat.title}`} 
                              aria-label={`Preview ${subjectName} ${mat.title}`}
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              disabled={downloadingId === mat.id}
                              onClick={() => handleDownloadMaterial(mat)} 
                              className={`p-2.5 rounded-xl transition-all border border-white/5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                                downloadedId === mat.id
                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                  : "text-gray-400 hover:text-purple-400 bg-white/5 hover:bg-purple-500/10"
                              }`}
                              title={
                                downloadingId === mat.id
                                  ? "Downloading..."
                                  : downloadedId === mat.id
                                  ? "Downloaded"
                                  : `Download ${subjectName} ${mat.title}`
                              }
                              aria-label={`Download ${subjectName} ${mat.title}`}
                            >
                              {downloadingId === mat.id ? (
                                <Loader2 size={14} className="text-purple-400 animate-spin" />
                              ) : downloadedId === mat.id ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Download size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* PDF / Document Preview Lightbox Overlay */}
      {previewMat && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pt-20 sm:pt-24 pb-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPreviewMat(null)}></div>
          <div className="bg-[#0b0816] w-full max-w-6xl h-[calc(100vh-6rem)] rounded-3xl border border-white/10 overflow-hidden flex flex-col relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0e091b] relative z-20 flex-shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="text-sm font-bold text-white truncate" title={previewMat.title}>{previewMat.title}</h3>
                <p className="text-[11px] text-purple-300/70 font-mono truncate mt-0.5">{previewMat.fileName}</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 relative z-30">
                <button 
                  disabled={downloadingId === previewMat.id}
                  onClick={() => handleDownloadMaterial(previewMat)} 
                  className={`p-2 rounded-xl transition-all border border-white/5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${
                    downloadedId === previewMat.id
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-purple-300"
                  }`}
                  title={
                    downloadingId === previewMat.id
                      ? "Downloading..."
                      : downloadedId === previewMat.id
                      ? "Downloaded"
                      : "Download File"
                  }
                >
                  {downloadingId === previewMat.id ? (
                    <Loader2 size={16} className="text-purple-400 animate-spin" />
                  ) : downloadedId === previewMat.id ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Download size={16} />
                  )}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewMat(null);
                  }} 
                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 transition-all cursor-pointer" 
                  title="Close Preview"
                >
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
          subjectId={realSubjectId}
          category={uploadCategory}
        />
      )}

      {/* Admin Subject Delete Confirmation Modal */}
      {showDeleteSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#120d1d] border border-rose-500/30 p-6 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.2)] animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <Trash2 size={24} />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Delete Entire Subject?</h3>
            
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">&ldquo;{subjectName}&rdquo;</strong>?
            </p>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 mb-6 text-xs text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                Permanent Subject Deletion
              </p>
              <p className="text-rose-300/80">
                This will delete the subject from the platform and remove all study materials associated with it. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteSubjectModal(false)}
                disabled={isDeletingSubject}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteSubject}
                disabled={isDeletingSubject}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingSubject ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Yes, Delete Subject</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
