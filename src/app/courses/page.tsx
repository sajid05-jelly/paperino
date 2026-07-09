"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Calendar, Search, ChevronRight, Loader2, Plus } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";
import AmbientOrbs from "@/components/AmbientOrbs";
import CreateCourseModal from "@/components/CreateCourseModal";
import { useAuth } from "@/context/AuthContext";

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { departments, loading } = useSubjects();
  const { user } = useAuth();

  // Filter approved departments only for public display
  const approvedDepts = departments.filter(d => d.status === "approved");

  const filteredDepts = approvedDepts.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-12 relative min-h-[80vh]">
      <AmbientOrbs />
      
      <div className="text-glow absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="text-center mb-10 w-full relative z-10">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 mb-6 tracking-tight text-glow">
          Explore Courses
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          Select a department to browse study resources, GPA tools, notes, and past question papers.
        </p>

        {/* Search & Suggest Layout */}
        <div className="flex flex-col sm:flex-row items-center gap-4 max-w-3xl mx-auto">
          <div className="relative flex-1 w-full group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-full blur-md opacity-20 group-hover:opacity-40 group-focus-within:opacity-65 transition-opacity duration-500"></div>
            <div className="relative flex items-center bg-[#07050d]/80 border border-white/10 group-focus-within:border-purple-500/50 rounded-full p-2 backdrop-blur-xl shadow-lg transition-colors">
              <div className="pl-4 pr-2 text-gray-400 group-focus-within:text-purple-400 transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search departments (e.g. B.Tech, MBA, MCA)..." 
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 py-2.5 text-sm md:text-base"
              />
            </div>
          </div>
          {user && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(232,121,249,0.35)] hover:shadow-[0_0_30px_rgba(232,121,249,0.55)] cursor-pointer"
            >
              <Plus size={18} /> Suggest Course
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 w-full">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading departments...</p>
        </div>
      ) : filteredDepts.length === 0 ? (
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
          {filteredDepts.map((dept, i) => (
            <Link key={dept.id} href={`/courses/${dept.id}`}>
              <div 
                className="vision-glass p-6 rounded-[2rem] group cursor-pointer vision-hover h-full flex flex-col justify-between min-h-[160px] animate-in fade-in slide-in-from-bottom-8" 
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
                  <h3 className="text-xl font-bold text-white mb-1.5 tracking-tight group-hover:text-purple-300 transition-colors">
                    {dept.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-500 group-hover:text-purple-400 transition-colors">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {dept.totalSemesters} Semesters
                    </span>
                    <span className="flex items-center gap-0.5">
                      Explore <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateCourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
