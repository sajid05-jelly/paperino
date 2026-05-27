"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Calendar, Search, ChevronRight, Loader2 } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";

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
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-12">
      <div className="text-center mb-10 w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Bachelor of Technology</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          Select your semester or search for a specific subject to access study materials.
        </p>

        {/* Search Bar */}
        <div className="relative w-full max-w-2xl mx-auto group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-md opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative flex items-center bg-black/50 border border-white/10 rounded-full p-2 backdrop-blur-xl">
            <div className="pl-4 pr-2 text-gray-400">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for subjects (e.g. Calculus, Data Structures)..." 
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 py-3"
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
        <div className="w-full">
          <h2 className="text-xl font-semibold text-white mb-6">
            Search Results for "{searchQuery}"
          </h2>
          {searchResults.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl w-full">
              <Search className="mx-auto text-gray-600 mb-4" size={48} />
              <h3 className="text-xl font-medium text-white mb-2">No subjects found</h3>
              <p className="text-gray-400">Try adjusting your search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {searchResults.map(sub => (
                <Link key={`${sub.semId}-${sub.id}`} href={`/btech/semesters/${sub.semId}/subjects/${sub.id}`}>
                  <div className="glass-card p-6 h-full group cursor-pointer relative overflow-hidden hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                        <BookOpen size={24} />
                      </div>
                      <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{sub.name}</h3>
                    <p className="text-sm text-gray-400">Semester {sub.semId}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
          {semesters.map((sem) => (
            <Link key={sem} href={`/btech/semesters/${sem}`}>
              <div className="glass-card p-6 rounded-2xl group cursor-pointer hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] transition-all h-full flex flex-col justify-between">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                    <Calendar size={24} />
                  </div>
                  <BookOpen size={20} className="text-gray-500 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Semester {sem}</h3>
                  <p className="text-sm text-gray-400">View subjects &rarr;</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
