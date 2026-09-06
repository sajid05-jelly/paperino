"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Calendar, Search, ChevronRight, Loader2, Plus, Building2, Layers } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import AmbientOrbs from "@/components/AmbientOrbs";
import CreateCourseModal from "@/components/CreateCourseModal";
import GlobalSubjectSearch from "@/components/GlobalSubjectSearch";
import { useAuth } from "@/context/AuthContext";
import { sortDepartments } from "@/lib/courseSorting";

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { departments, deptMaterialCounts, listenToDeptsWithMaterials, loading, allSubjectsList } = useSubjects();
  const { user, isAdmin } = useAuth();
  
  useEffect(() => {
    const unsub = listenToDeptsWithMaterials();
    return () => unsub();
  }, [listenToDeptsWithMaterials]);

  // Filter for approved or admin or created by current user
  const visibleDepts = departments.filter(d => d.status === "approved" || isAdmin || (user && d.createdBy === user.uid));
  
  const filteredDepts = visibleDepts.filter(d => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return true;

    const matchDeptName = d.name.toLowerCase().includes(searchLower);
    const matchDeptCode = d.code.toLowerCase().includes(searchLower);

    const hasMatchingSubject = allSubjectsList.some(s => 
      s.departmentId === d.id && 
      (s.name.toLowerCase().includes(searchLower) || (s.code || '').toLowerCase().includes(searchLower))
    );

    return matchDeptName || matchDeptCode || hasMatchingSubject;
  });

  const sortedDepts = sortDepartments(filteredDepts, deptMaterialCounts);

  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-12 relative min-h-[80vh]">
      <AmbientOrbs />
      
      <div className="text-glow absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="text-center mb-10 w-full relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3">
          <Building2 size={14} className="text-purple-400" />
          <span>Colleges Directory</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 mb-4 tracking-tight text-glow">
          Explore Colleges
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-10">
          Select a university to browse department courses, study resources, GPA tools, notes, and past question papers.
        </p>

        {/* SRM University College Card */}
        <div className="w-full max-w-3xl mx-auto text-left">
          <div 
            onClick={() => setSelectedCollege(selectedCollege === "srm" ? null : "srm")}
            className={`vision-glass p-8 rounded-[2.5rem] cursor-pointer relative overflow-hidden transition-all duration-500 border ${
              selectedCollege === "srm" 
                ? "border-purple-500/60 bg-[#120924]/80 shadow-[0_0_50px_rgba(139,92,246,0.3)] ring-2 ring-purple-500/40" 
                : "border-white/10 bg-[#0f0a1a]/50 hover:border-purple-500/30 hover:bg-[#120924]/60"
            }`}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start md:items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                  <Building2 size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                      SRM IST
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ● Active Campus
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    SRM University
                  </h3>
                  <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-xl font-light leading-relaxed">
                    Access B.Tech, MCA, MBA &amp; all departmental courses across SRM campuses (KTR, Ramapuram, Vadapalani, Trichy, NCR).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  {selectedCollege === "srm" ? "Hide Courses" : "Explore Courses"}
                </span>
                <ChevronRight size={18} className={`text-purple-400 transition-transform duration-300 ${selectedCollege === "srm" ? "rotate-90" : ""}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SRM Courses View (Only displayed when selectedCollege === "srm") */}
      {selectedCollege === "srm" && (
        <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-400 relative z-10">
          {/* Header & Search */}
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-4 px-2">
              <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Layers className="text-purple-400" size={22} />
                SRM Courses
              </h3>
              <span className="text-xs text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-3.5 py-1 rounded-full">
                {sortedDepts.length} Courses
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 max-w-3xl mx-auto">
              <GlobalSubjectSearch subjects={allSubjectsList} departments={departments} />
              {user && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(232,121,249,0.35)] hover:shadow-[0_0_30px_rgba(232,121,249,0.55)] cursor-pointer"
                >
                  <Plus size={18} /> Suggest Department
                </button>
              )}
            </div>
          </div>

          {/* Department Cards Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading departments...</p>
            </div>
          ) : sortedDepts.length === 0 ? (
            <div className="vision-glass p-12 text-center rounded-3xl w-full max-w-2xl mx-auto border border-white/10 mt-6 animate-in fade-in zoom-in-95">
              <GraduationCap className="mx-auto text-gray-600 mb-4" size={48} />
              <h3 className="text-xl font-medium text-white mb-2">No departments found</h3>
              <p className="text-gray-400 mb-6">We couldn't find any departments matching your search.</p>
              {user && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                >
                  Suggest a New Department
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full relative z-10 mt-4">
              {sortedDepts.map((dept, i) => {
                let matchingSubjectName = null;
                const searchLower = searchQuery.toLowerCase().trim();
                
                if (searchLower) {
                  const matchDeptName = dept.name.toLowerCase().includes(searchLower);
                  const matchDeptCode = dept.code.toLowerCase().includes(searchLower);
                  
                  if (!matchDeptName && !matchDeptCode) {
                    const matchingSubject = allSubjectsList.find(s => 
                      s.departmentId === dept.id && 
                      (s.name.toLowerCase().includes(searchLower) || (s.code || '').toLowerCase().includes(searchLower))
                    );
                    if (matchingSubject) {
                      matchingSubjectName = matchingSubject.name;
                    }
                  }
                }

                return (
                  <Link key={dept.id} href={dept.id.toLowerCase() === 'btech' ? '/srm/btech' : `/courses/${dept.id}`}>
                    <div 
                      className="vision-glass p-6 rounded-[2rem] group cursor-pointer vision-hover h-full flex flex-col justify-between min-h-[160px] animate-in fade-in slide-in-from-bottom-8 relative overflow-hidden"
                      style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all shadow-sm">
                          <GraduationCap size={22} />
                        </div>

                        <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          {dept.code}
                        </span>
                      </div>

                      <div className="relative z-10">
                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-300 transition-colors">
                          {dept.name}
                        </h3>
                        {matchingSubjectName && (
                          <div className="mb-3 text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                            <Search size={12} className="mt-0.5 shrink-0 text-purple-400" />
                            <span className="line-clamp-2">Includes: <strong>{matchingSubjectName}</strong></span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {dept.totalSemesters} Semesters
                          </span>
                          <span className="flex items-center gap-0.5 font-semibold">
                            Explore <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      <CreateCourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} mode="department" />
    </div>
  );
}
