"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Calendar, Search, ChevronRight, Loader2 } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import AmbientOrbs from "@/components/AmbientOrbs";

export default function BTechPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const semesters = Array.from({ length: 8 }, (_, i) => i + 1);

  const { subjects: dynamicSubjects, loading } = useSubjects();

  // Flatten all subjects into a single array for searching (excluding pending)
  const allSubjects = Object.entries(dynamicSubjects).flatMap(([sem, subjects]) => 
    subjects.filter(sub => sub.status !== "pending").map(sub => ({ ...sub, semId: sem }))
  );

  const searchResults = searchQuery.trim() === "" 
    ? [] 
    : allSubjects.filter(sub => 
        sub.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-12 relative min-h-[80vh]">
      <AmbientOrbs />
      <div className="text-center mb-10 w-full relative z-10">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 mb-6 tracking-tight text-glow">Bachelor of Technology</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          Select your semester or search for a specific subject to access study materials.
        </p>

        {/* Search Bar */}
        <div className="relative w-full max-w-2xl mx-auto group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-md opacity-20 group-hover:opacity-40 group-focus-within:opacity-60 transition-opacity duration-500"></div>
          <div className="relative flex items-center bg-[#07050d]/80 border border-white/10 group-focus-within:border-purple-500/50 rounded-full p-2 backdrop-blur-xl shadow-lg transition-colors">
            <div className="pl-4 pr-2 text-gray-400 group-focus-within:text-purple-400 transition-colors">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for subjects (e.g. Calculus, Data Structures)..." 
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 py-3 text-sm md:text-base"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 w-full">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading courses...</p>
        </div>
      ) : searchQuery.trim() !== "" ? (
        <div className="w-full relative z-10">
          <h2 className="text-xl font-semibold text-white mb-6">
            Search Results for "{searchQuery}"
          </h2>
          {searchResults.length === 0 ? (
            <div className="vision-glass p-12 text-center rounded-2xl w-full neon-border">
              <Search className="mx-auto text-gray-600 mb-4" size={48} />
              <h3 className="text-xl font-medium text-white mb-2">No subjects found</h3>
              <p className="text-gray-400">Try adjusting your search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {searchResults.map((sub, i) => (
                <Link key={`${sub.semId}-${sub.id}`} href={`/btech/semesters/${sub.semId}/subjects/${sub.id}`}>
                  <div className="vision-glass neon-border p-6 h-full group cursor-pointer relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(168,85,247,0.2)] animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all shadow-inner">
                        <BookOpen size={24} />
                      </div>
                      <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-300 transition-colors">{sub.name}</h3>
                    <p className="text-sm text-gray-400 font-medium tracking-wide">Semester {sub.semId}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 w-full relative z-10">
          {semesters.map((sem, i) => (
            <Link key={sem} href={`/btech/semesters/${sem}`}>
              <div className="vision-glass neon-border p-5 md:p-6 rounded-[1.5rem] group cursor-pointer hover:shadow-[0_15px_30px_-10px_rgba(168,85,247,0.3)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between min-h-[140px] animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all shadow-sm">
                    <Calendar size={20} />
                  </div>
                  <BookOpen size={18} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-1 tracking-tight group-hover:text-purple-300 transition-colors">Semester {sem}</h3>
                  <p className="text-xs md:text-sm text-gray-400 font-medium tracking-wide flex items-center gap-1 group-hover:text-cyan-400 transition-colors">View subjects <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
