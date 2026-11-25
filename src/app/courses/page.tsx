"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Search, 
  Plus, 
  X, 
  BookOpen, 
  GraduationCap, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  FileText,
  Building2
} from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import AmbientOrbs from "@/components/AmbientOrbs";
import AddSubjectModal from "@/components/AddSubjectModal";
import { getSubjectSeoPath } from "@/lib/seoUtils";

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { allSubjectsList, departments, loading } = useSubjects();

  // Fast department name lookup map
  const deptMap = useMemo(() => {
    const map: Record<string, string> = {
      btech: "B.Tech",
      mca: "MCA",
      mba: "MBA",
      "me-cse": "M.E CSE",
      "me-se": "M.E Structural Engg",
    };
    if (Array.isArray(departments)) {
      departments.forEach((d) => {
        if (d && d.id && d.name) {
          map[d.id] = d.name;
        }
      });
    }
    return map;
  }, [departments]);

  // Restore search query from URL if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuery = urlParams.get("q");
      if (urlQuery) {
        setSearchQuery(urlQuery);
      }
    }
  }, []);

  // Update search query and browser URL seamlessly without sticky session lock
  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    if (typeof window !== "undefined") {
      if (val.trim()) {
        const newUrl = `${window.location.pathname}?q=${encodeURIComponent(val.trim())}`;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
      } else {
        window.history.replaceState({ ...window.history.state, as: window.location.pathname, url: window.location.pathname }, "", window.location.pathname);
      }
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    if (typeof window !== "undefined") {
      window.history.replaceState({ ...window.history.state, as: window.location.pathname, url: window.location.pathname }, "", window.location.pathname);
    }
  }, []);

  // Case-insensitive real-time search across subject name, code, and id
  const filteredSubjects = useMemo(() => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return allSubjectsList;

    return allSubjectsList.filter((sub) => {
      const nameMatch = (sub.name || "").toLowerCase().includes(searchLower);
      const codeMatch = (sub.code || "").toLowerCase().includes(searchLower);
      const idMatch = (sub.id || "").toLowerCase().includes(searchLower);
      return nameMatch || codeMatch || idMatch;
    });
  }, [allSubjectsList, searchQuery]);

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 py-10 relative min-h-[85vh]">
      <AmbientOrbs />
      
      {/* Background glow effects */}
      <div className="text-glow absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="text-glow absolute top-1/3 -right-40 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Main Header */}
      <div className="text-center mb-8 w-full relative z-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
          <BookOpen size={14} className="text-purple-400" />
          <span>Study Materials Library</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-300 mb-4 tracking-tight text-glow">
          All Subjects & Materials
        </h1>
        <p className="text-gray-400 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto">
          Directly access previous year question papers (PYQs), lecture notes, and exam guides. Search any subject name or code below.
        </p>
      </div>

      {/* Search Bar & Add Subject Action Bar */}
      <div className="w-full max-w-3xl mx-auto mb-10 relative z-10">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search any subject by name or code (e.g. Python, Maths, 21CSE354T)..."
              className="w-full pl-12 pr-11 py-3.5 rounded-2xl bg-[#120924]/80 border border-purple-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 text-sm md:text-base backdrop-blur-md transition-all shadow-[0_0_30px_rgba(139,92,246,0.15)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Add Subject Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-500 text-white font-bold text-sm tracking-wide transition-all shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:shadow-[0_0_35px_rgba(168,85,247,0.55)] cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>Add Subject</span>
          </button>
        </div>

        {/* Counter Info & Help Text */}
        <div className="flex items-center justify-between text-xs text-gray-400 mt-3 px-2">
          <span>
            Showing <strong className="text-purple-300">{filteredSubjects.length}</strong> of {allSubjectsList.length} subjects
          </span>
          {searchQuery && (
            <span className="text-purple-400/80">
              Matching &ldquo;{searchQuery}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Content Section: Loading, Empty, or Subjects Grid */}
      <div className="w-full max-w-6xl mx-auto relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 w-full">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Loading study library...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          /* Empty Search State */
          <div className="vision-glass p-10 md:p-14 text-center rounded-3xl w-full max-w-2xl mx-auto border border-white/10 my-8 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-5 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <BookOpen size={30} />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">No subjects found</h3>
            <p className="text-gray-400 text-sm md:text-base mb-6 max-w-md mx-auto">
              We couldn&apos;t find any subject matching <span className="text-purple-300 font-semibold">&ldquo;{searchQuery}&rdquo;</span>.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer"
            >
              <Plus size={16} />
              <span>Add &ldquo;{searchQuery}&rdquo; as a new subject</span>
            </button>
          </div>
        ) : (
          /* Subjects Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 w-full">
            {filteredSubjects.map((sub, index) => {
              const rawHref = getSubjectSeoPath(sub);
              const href = searchQuery.trim()
                ? `${rawHref}${rawHref.includes("?") ? "&" : "?"}refSearch=${encodeURIComponent(searchQuery.trim())}`
                : rawHref;

              const deptName = deptMap[sub.departmentId] || (sub.departmentId === "btech" ? "B.Tech" : (sub.departmentId || "").toUpperCase());

              return (
                <Link key={`${sub.departmentId}_${sub.semesterId}_${sub.id}_${index}`} href={href} className="flex subject-card-contain">
                  <div className="vision-glass p-6 rounded-[2rem] w-full border border-white/10 hover:border-purple-500/40 bg-[#0f0a1a]/60 hover:bg-[#150d28]/90 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                    <div>
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 group-hover:scale-110 transition-all">
                          <FileText size={18} />
                        </div>
                        {sub.code && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                            {sub.code}
                          </span>
                        )}
                      </div>

                      {/* Department on Top */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2.5 relative z-10">
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                          <Building2 size={11} className="text-purple-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{deptName}</span>
                        </span>
                      </div>

                      {/* Subject Name */}
                      <h3 className="text-lg md:text-xl font-bold text-white mb-3 tracking-tight group-hover:text-purple-300 transition-colors line-clamp-2 relative z-10">
                        {sub.name}
                      </h3>
                    </div>

                    {/* Bottom Row */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 group-hover:text-gray-300 transition-colors relative z-10">
                      <span className="text-gray-400 font-light text-[11px] tracking-wide">
                        PYQs &amp; Notes
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-purple-400 group-hover:text-purple-300 group-hover:translate-x-1 transition-all">
                        <span>View Materials</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      <AddSubjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialSubjectName={searchQuery}
      />
    </div>
  );
}
