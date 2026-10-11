"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Layers, 
  Search, 
  Trash2, 
  Eye, 
  Plus, 
  History, 
  BookOpen, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  X, 
  ExternalLink, 
  FileText, 
  Filter, 
  RotateCcw,
  ShieldCheck,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { useSubjects } from "@/context/SubjectsContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

interface ConfiguredSection {
  id: string; // docId: e.g. dept_semX_subId_secType
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  departmentId: string;
  departmentName?: string;
  semesterId: string;
  sectionType: "pyq" | "notes" | "questions";
  createdAt?: any;
  createdBy?: string;
}

const SECTION_TYPE_META: Record<string, { label: string; icon: any; color: string; badge: string; desc: string }> = {
  pyq: {
    label: "Question Papers",
    icon: History,
    color: "text-purple-400",
    badge: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    desc: "Past semester examination papers (PYQs)"
  },
  notes: {
    label: "Notes",
    icon: BookOpen,
    color: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    desc: "Syllabus, lecture notes & study modules"
  },
  questions: {
    label: "Important Questions",
    icon: HelpCircle,
    color: "text-amber-400",
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    desc: "2-mark, 16-mark & key revision questions"
  }
};

export default function AdminSectionsPage() {
  const { user } = useAuth();
  const { departments, subjects: dynamicSubjects, refreshSubjects, lazyLoadSubjects } = useSubjects();
  const { showToast } = useToast();

  const [sections, setSections] = useState<ConfiguredSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterSem, setFilterSem] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "pyq" | "notes" | "questions">("all");

  // Inspect Modal
  const [inspectingSection, setInspectingSection] = useState<ConfiguredSection | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectMaterials, setInspectMaterials] = useState<any[]>([]);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<ConfiguredSection | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add Section Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDept, setAddDept] = useState("");
  const [addSem, setAddSem] = useState("1");
  const [addSubId, setAddSubId] = useState("");
  const [addSelectedTypes, setAddSelectedTypes] = useState<string[]>(["pyq", "notes", "questions"]);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const approvedDepts = departments.filter(d => d.status === "approved" || !d.status);

  // Initial fetch of configured sections
  useEffect(() => {
    fetchSections();
  }, [departments]);

  const fetchSections = async () => {
    setLoading(true);
    try {
      // 1. Fetch from subject_sections collection
      const secSnapshot = await getDocs(collection(db, "subject_sections"));
      const sectionList: ConfiguredSection[] = [];
      const seenKeys = new Set<string>();

      secSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const key = `${data.departmentId}_${data.semesterId}_${data.subjectId}_${data.sectionType}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const dept = departments.find(d => d.id === data.departmentId);
          sectionList.push({
            id: docSnap.id,
            subjectId: data.subjectId,
            subjectName: data.subjectName || data.subjectId,
            subjectCode: data.subjectCode || "",
            departmentId: data.departmentId,
            departmentName: data.departmentName || (dept ? dept.name : data.departmentId.toUpperCase()),
            semesterId: String(data.semesterId || "1"),
            sectionType: data.sectionType,
            createdAt: data.createdAt,
            createdBy: data.createdBy
          });
        }
      });

      // 2. Also check dynamic_subjects for any subjects with sections array that aren't yet in subject_sections
      const subSnapshot = await getDocs(collection(db, "dynamic_subjects"));
      subSnapshot.forEach(docSnap => {
        const subData = docSnap.data();
        if (Array.isArray(subData.sections)) {
          const dept = departments.find(d => d.id === subData.departmentId);
          subData.sections.forEach((secType: string) => {
            const key = `${subData.departmentId}_${subData.semesterId}_${subData.subjectId}_${secType}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              sectionList.push({
                id: `${subData.departmentId}_sem${subData.semesterId}_${subData.subjectId}_${secType}`,
                subjectId: subData.subjectId,
                subjectName: subData.name || subData.subjectId,
                subjectCode: subData.code || "",
                departmentId: subData.departmentId,
                departmentName: dept ? dept.name : subData.departmentId.toUpperCase(),
                semesterId: String(subData.semesterId || "1"),
                sectionType: secType as any,
                createdAt: subData.createdAt,
                createdBy: subData.createdBy
              });
            }
          });
        }
      });

      // Sort newest first or alphabetically by subject name
      sectionList.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      setSections(sectionList);
    } catch (err) {
      console.error("Error fetching sections:", err);
      showToast("Failed to load configured sections.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Inspect Section Materials
  const handleOpenInspect = async (section: ConfiguredSection) => {
    setInspectingSection(section);
    setInspectLoading(true);
    setInspectMaterials([]);

    try {
      const qMat = query(
        collection(db, "materials"),
        where("semesterId", "==", section.semesterId),
        where("subjectId", "==", section.subjectId),
        where("category", "==", section.sectionType)
      );
      const matSnap = await getDocs(qMat);
      const mats = matSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInspectMaterials(mats);
    } catch (err) {
      console.error("Error inspecting section materials:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Delete Section Configuration
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      const { id, departmentId, semesterId, subjectId, sectionType } = deleteTarget;

      // 1. Delete document from subject_sections
      await deleteDoc(doc(db, "subject_sections", id));

      // 2. Also remove from dynamic_subjects doc's sections array
      const subDocId = `${departmentId}_sem${semesterId}_${subjectId}`;
      try {
        await updateDoc(doc(db, "dynamic_subjects", subDocId), {
          sections: arrayRemove(sectionType)
        });
      } catch (subErr) {
        // Document might not exist if created outside dynamic_subjects
        console.warn("Could not update dynamic_subjects document:", subErr);
      }

      // 3. Clear cache in sessionStorage if present
      if (typeof window !== "undefined") {
        const cacheKey = `paperino_subject_cache_${departmentId}_${semesterId}_${subjectId}`;
        sessionStorage.removeItem(cacheKey);
      }

      // 4. Update local state
      setSections(prev => prev.filter(s => s.id !== id));
      await refreshSubjects();

      showToast("Section configuration removed. Existing uploaded materials are preserved.", "success");
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Error deleting section:", err);
      showToast("Failed to remove section configuration.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Add Section Configuration
  const handleOpenAddModal = () => {
    const firstDept = approvedDepts[0]?.id || "";
    setAddDept(firstDept);
    setAddSem("1");
    setAddSubId("");
    setAddSelectedTypes(["pyq", "notes", "questions"]);
    setAddError("");
    setIsAddModalOpen(true);

    if (firstDept) {
      lazyLoadSubjects(firstDept, "1");
    }
  };

  const handleAddDeptChange = (deptId: string) => {
    setAddDept(deptId);
    setAddSubId("");
    lazyLoadSubjects(deptId, addSem);
  };

  const handleAddSemChange = (sem: string) => {
    setAddSem(sem);
    setAddSubId("");
    if (addDept) {
      lazyLoadSubjects(addDept, sem);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDept || !addSem || !addSubId) {
      setAddError("Please select a department, semester, and subject.");
      return;
    }
    if (addSelectedTypes.length === 0) {
      setAddError("Please select at least one section type to configure.");
      return;
    }

    setAddLoading(true);
    setAddError("");

    try {
      const targetSub = dynamicSubjects[addDept]?.[addSem]?.find(s => s.id === addSubId);
      const subName = targetSub ? targetSub.name : addSubId;
      const subCode = targetSub?.code || "";
      const deptObj = departments.find(d => d.id === addDept);
      const deptName = deptObj ? deptObj.name : addDept.toUpperCase();

      const promises = addSelectedTypes.map(secType => {
        const secDocId = `${addDept}_sem${addSem}_${addSubId}_${secType}`;
        return setDoc(doc(db, "subject_sections", secDocId), {
          id: secDocId,
          subjectId: addSubId,
          subjectName: subName,
          subjectCode: subCode,
          departmentId: addDept,
          departmentName: deptName,
          semesterId: addSem,
          sectionType: secType,
          createdBy: user?.email || "admin",
          createdAt: serverTimestamp()
        }, { merge: true });
      });

      await Promise.all(promises);

      // Update dynamic_subjects document with the configured sections
      const subDocId = `${addDept}_sem${addSem}_${addSubId}`;
      try {
        await updateDoc(doc(db, "dynamic_subjects", subDocId), {
          sections: arrayUnion(...addSelectedTypes)
        });
      } catch (subDocErr) {
        // If doc doesn't exist, create it
        await setDoc(doc(db, "dynamic_subjects", subDocId), {
          subjectId: addSubId,
          name: subName,
          code: subCode,
          departmentId: addDept,
          semesterId: addSem,
          sections: addSelectedTypes,
          status: "approved",
          createdAt: serverTimestamp(),
          createdBy: user?.email || "admin"
        }, { merge: true });
      }

      // Invalidate session cache
      if (typeof window !== "undefined") {
        const cacheKey = `paperino_subject_cache_${addDept}_${addSem}_${addSubId}`;
        sessionStorage.removeItem(cacheKey);
      }

      await refreshSubjects();
      await fetchSections();

      showToast(`Sections configured successfully for ${subName}!`, "success");
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Error adding sections:", err);
      setAddError(err.message || "Failed to configure sections.");
    } finally {
      setAddLoading(false);
    }
  };

  // Helper date formatter
  const formatDate = (val: any) => {
    if (!val) return "Active";
    try {
      const d = val.toDate ? val.toDate() : val._seconds ? new Date(val._seconds * 1000) : new Date(val);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Active";
    }
  };

  // Filtered list
  const filteredSections = sections.filter(sec => {
    const matchesSearch = 
      sec.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.subjectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sec.subjectCode && sec.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = filterDept === "all" || sec.departmentId === filterDept;
    const matchesSem = filterSem === "all" || sec.semesterId === filterSem;
    const matchesType = filterType === "all" || sec.sectionType === filterType;

    return matchesSearch && matchesDept && matchesSem && matchesType;
  });

  const availableSubjectsForAdd = (addDept && addSem) ? (dynamicSubjects[addDept]?.[addSem] || []) : [];

  return (
    <div className="space-y-6 w-full max-w-6xl pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Layers size={26} />
            </span>
            Subject Section Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure, inspect, and manage material sections (Question Papers, Notes, Important Questions) per subject.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSections}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Refresh Sections"
          >
            <RotateCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Configure Section</span>
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Sections</p>
            <p className="text-xl font-bold text-white">{sections.length}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <History size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Question Papers</p>
            <p className="text-xl font-bold text-white">
              {sections.filter(s => s.sectionType === "pyq").length}
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Notes</p>
            <p className="text-xl font-bold text-white">
              {sections.filter(s => s.sectionType === "notes").length}
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <HelpCircle size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Important Qs</p>
            <p className="text-xl font-bold text-white">
              {sections.filter(s => s.sectionType === "questions").length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by subject name, code, or ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
            {/* Department Filter */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">All Courses</option>
              {approvedDepts.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code || d.id.toUpperCase()})</option>
              ))}
            </select>

            {/* Semester Filter */}
            <select
              value={filterSem}
              onChange={(e) => setFilterSem(e.target.value)}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">All Semesters</option>
              {Array.from({ length: 8 }, (_, i) => (i + 1).toString()).map(sem => (
                <option key={sem} value={sem}>Sem {sem}</option>
              ))}
            </select>

            {/* Section Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="pyq">Question Papers</option>
              <option value="notes">Notes</option>
              <option value="questions">Important Questions</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Section List ── */}
      {loading ? (
        <div className="py-24 text-center glass-panel rounded-2xl border border-white/5 space-y-3">
          <Loader2 className="animate-spin text-purple-400 mx-auto" size={32} />
          <p className="text-sm font-medium text-gray-400">Loading configured sections...</p>
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-2xl border border-white/5 space-y-4">
          <Layers className="mx-auto text-gray-600" size={48} />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Configured Sections Found</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {searchQuery || filterDept !== "all" || filterSem !== "all" || filterType !== "all"
                ? "No sections match your active filters. Try resetting search or filter criteria."
                : "No sections have been created yet. When you create a subject or click 'Configure Section', sections will appear here."}
            </p>
          </div>
          {(searchQuery || filterDept !== "all" || filterSem !== "all" || filterType !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterDept("all");
                setFilterSem("all");
                setFilterType("all");
              }}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-gray-300"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/[0.03] border-b border-white/10 text-gray-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Subject</th>
                  <th className="py-3.5 px-4 font-bold">Course & Semester</th>
                  <th className="py-3.5 px-4 font-bold">Section Type</th>
                  <th className="py-3.5 px-4 font-bold">Configured Date</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSections.map(sec => {
                  const meta = SECTION_TYPE_META[sec.sectionType] || SECTION_TYPE_META.notes;
                  const Icon = meta.icon;

                  return (
                    <tr key={sec.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Subject */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-purple-300 transition-colors">
                            {sec.subjectName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {sec.subjectCode && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-gray-400 border border-white/5 uppercase">
                                {sec.subjectCode}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-gray-500">
                              ID: {sec.subjectId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Course & Semester */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-200">
                            {sec.departmentName || sec.departmentId.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-purple-400 font-semibold">
                            Semester {sec.semesterId}
                          </span>
                        </div>
                      </td>

                      {/* Section Type */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.badge}`}>
                          <Icon size={12} className={meta.color} />
                          {meta.label}
                        </span>
                      </td>

                      {/* Configured Date */}
                      <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-500" />
                          {formatDate(sec.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Button */}
                          <button
                            onClick={() => handleOpenInspect(sec)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 border border-white/5 hover:border-purple-500/20 transition-all cursor-pointer"
                            title="Inspect Section Details"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteTarget(sec)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Remove Section Configuration"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Inspection Modal ── */}
      {inspectingSection && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#090614] border border-purple-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">
                  Section Inspection
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {inspectingSection.subjectName}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {inspectingSection.departmentName || inspectingSection.departmentId.toUpperCase()} • Semester {inspectingSection.semesterId}
                </p>
              </div>
              <button
                onClick={() => setInspectingSection(null)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Section Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.02] p-4 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Section Type</p>
                <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                  {SECTION_TYPE_META[inspectingSection.sectionType]?.label}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Category Key</p>
                <p className="text-sm font-mono text-purple-300 mt-0.5">
                  {inspectingSection.sectionType}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Subject Code</p>
                <p className="text-xs font-mono text-gray-300 mt-0.5">
                  {inspectingSection.subjectCode || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Subject ID</p>
                <p className="text-xs font-mono text-gray-300 mt-0.5">
                  {inspectingSection.subjectId}
                </p>
              </div>
            </div>

            {/* Live Link */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <span className="text-xs text-purple-300 font-medium">View live subject page:</span>
              <Link
                href={`/courses/${inspectingSection.departmentId}/semesters/${inspectingSection.semesterId}/subjects/${inspectingSection.subjectId}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              >
                <span>Open Subject Page</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {/* Uploaded Materials in this Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Uploaded Materials in this Section ({inspectMaterials.length})
                </h4>
                {inspectLoading && <Loader2 size={12} className="animate-spin text-purple-400" />}
              </div>

              {inspectLoading ? (
                <div className="py-6 text-center text-xs text-gray-500">Checking uploaded materials...</div>
              ) : inspectMaterials.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-500">
                  No materials uploaded in this section yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {inspectMaterials.map((mat: any) => (
                    <div key={mat.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-white truncate">{mat.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{mat.fileName}</p>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Architecture Separation Notice */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-2">
              <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <span>
                Section configuration controls visibility on the subject page. Uploaded materials and files exist independently in Firestore and Google Drive.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingSection(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deletion Confirmation Dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0a050f] border border-rose-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.25)] space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Remove Section Configuration?</h3>
                <p className="text-xs text-gray-400 mt-0.5">Please confirm this action</p>
              </div>
            </div>

            {/* Target details */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
              <p className="text-gray-300 font-bold">
                Subject: <span className="text-white">{deleteTarget.subjectName}</span>
              </p>
              <p className="text-gray-400">
                Course: <span className="text-gray-200">{deleteTarget.departmentName || deleteTarget.departmentId}</span> (Semester {deleteTarget.semesterId})
              </p>
              <p className="text-gray-400">
                Section Type: <span className="text-rose-400 font-bold">{SECTION_TYPE_META[deleteTarget.sectionType]?.label}</span>
              </p>
            </div>

            {/* Non-destructive guarantee notice */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-rose-200">
                <span>🛡️ Non-Destructive Operation</span>
              </p>
              <p className="text-[11px] leading-relaxed text-rose-300/90">
                Removing this section configuration will hide the <strong>{SECTION_TYPE_META[deleteTarget.sectionType]?.label}</strong> section from the subject's page. Any files or study materials previously uploaded will <strong>NOT</strong> be deleted—they will remain safely preserved in the database.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Remove Section
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Configure Section Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#080512] border border-purple-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.2)] overflow-hidden space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Plus className="text-purple-400" size={20} />
                  Configure Material Sections
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Activate or add sections to any subject in the catalogue.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Department / Course
                </label>
                <select
                  value={addDept}
                  onChange={(e) => handleAddDeptChange(e.target.value)}
                  disabled={addLoading}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none focus:border-purple-500 cursor-pointer"
                >
                  {approvedDepts.map(d => (
                    <option key={d.id} value={d.id} className="bg-[#090614] text-white">
                      {d.name} ({d.code || d.id.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Semester
                </label>
                <select
                  value={addSem}
                  onChange={(e) => handleAddSemChange(e.target.value)}
                  disabled={addLoading}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none focus:border-purple-500 cursor-pointer"
                >
                  {Array.from({ length: 8 }, (_, i) => (i + 1).toString()).map(sem => (
                    <option key={sem} value={sem} className="bg-[#090614] text-white">
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Subject
                </label>
                {availableSubjectsForAdd.length === 0 ? (
                  <p className="text-xs text-gray-500 italic p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    No approved subjects found in this semester.
                  </p>
                ) : (
                  <select
                    value={addSubId}
                    onChange={(e) => setAddSubId(e.target.value)}
                    disabled={addLoading}
                    className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none focus:border-purple-500 cursor-pointer"
                    required
                  >
                    <option value="">Select a subject...</option>
                    {availableSubjectsForAdd.map(s => (
                      <option key={s.id} value={s.id} className="bg-[#090614] text-white">
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Section Types Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Sections to Enable
                </label>
                <div className="space-y-2">
                  {Object.entries(SECTION_TYPE_META).map(([key, meta]) => {
                    const isChecked = addSelectedTypes.includes(key);
                    const Icon = meta.icon;

                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-purple-500/10 border-purple-500/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                            : "bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={addLoading}
                          onChange={() => {
                            setAddSelectedTypes(prev =>
                              prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                            );
                          }}
                          className="w-4 h-4 mt-0.5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-black/40 accent-purple-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon size={14} className={isChecked ? meta.color : "text-gray-500"} />
                            <span className="text-xs font-bold text-white">{meta.label}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">{meta.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {addError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {addError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addLoading}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addLoading || !addSubId || addSelectedTypes.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {addLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Save Sections
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
