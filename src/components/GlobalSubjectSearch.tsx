"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Book, Building2, Calendar } from "lucide-react";

export default function GlobalSubjectSearch({ 
  subjects, 
  departments,
  baseRoute = "/courses"
}: { 
  subjects: any[], 
  departments: any[],
  baseRoute?: string
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const searchLower = searchQuery.toLowerCase().trim();
  
  const matchedSubjects = searchLower ? subjects.filter(s => 
    s.name.toLowerCase().includes(searchLower) || (s.code || '').toLowerCase().includes(searchLower)
  ) : [];

  return (
    <div className="w-full">
      <div className="relative flex-1 w-full max-w-3xl mx-auto group mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-full blur-md opacity-20 group-hover:opacity-40 group-focus-within:opacity-65 transition-opacity duration-500"></div>
        <div className="relative flex items-center bg-[#07050d]/80 border border-white/10 group-focus-within:border-purple-500/50 rounded-full p-2 backdrop-blur-xl shadow-lg transition-colors">
          <div className="pl-4 pr-2 text-gray-400 group-focus-within:text-purple-400 transition-colors">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects (e.g. Engineering Mathematics)..." 
            className="w-full bg-transparent border-none text-white focus:ring-0 placeholder-gray-500 text-sm py-2 px-2"
          />
        </div>
      </div>

      {searchLower && (
        <div className="mb-12">
          <h3 className="text-xl font-bold text-white mb-6">Subject Search Results</h3>
          {matchedSubjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchedSubjects.map((sub, i) => {
                const deptName = departments.find(d => d.id === sub.departmentId)?.name || sub.departmentId;
                const linkHref = sub.departmentId.toLowerCase() === 'btech' 
                  ? `/srm/btech/semesters/${sub.semesterId}/subjects/${sub.id}` 
                  : `${baseRoute}/${sub.departmentId}/semesters/${sub.semesterId}/subjects/${sub.id}`;
                  
                return (
                  <Link key={`${sub.departmentId}-${sub.semesterId}-${sub.id}-${i}`} href={linkHref}>
                    <div className="vision-glass p-6 rounded-[2rem] group cursor-pointer vision-hover h-full flex flex-col justify-between min-h-[160px] relative overflow-hidden border border-white/5 hover:border-purple-500/30">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all shadow-sm">
                          <Book size={22} />
                        </div>
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-purple-300 transition-colors">
                          {sub.name}
                        </h3>
                        <div className="flex flex-col gap-1.5 mt-4">
                          <div className="flex items-center text-xs text-gray-400 bg-white/5 w-fit px-2 py-1 rounded">
                            <Building2 size={12} className="mr-1.5 text-purple-400" /> {deptName}
                          </div>
                          <div className="flex items-center text-xs text-gray-400 bg-white/5 w-fit px-2 py-1 rounded">
                            <Calendar size={12} className="mr-1.5 text-fuchsia-400" /> Semester {sub.semesterId}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 vision-glass rounded-[2rem] border border-white/5">
              <Search size={32} className="mx-auto text-gray-500 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">No subjects found</h3>
              <p className="text-gray-400 text-sm">We couldn't find any subjects matching "{searchQuery}".</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
