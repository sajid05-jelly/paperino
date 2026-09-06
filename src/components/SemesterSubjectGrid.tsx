"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Book, ChevronRight } from "lucide-react";
import { getSubjectSeoPath } from "@/lib/seoUtils";
import { useSubjects } from "@/context/SubjectsContext";
import { UnifiedSubject } from "@/lib/unifiedSubjectData";

interface SemesterSubjectGridProps {
  initialData: UnifiedSubject[];
  deptId: string;
  semId: string;
}

export default function SemesterSubjectGrid({ initialData, deptId, semId }: SemesterSubjectGridProps) {
  const { subjects: clientSubjectsState } = useSubjects();

  // Merge server initialData with any dynamically created subjects on the client
  const displaySubjects = useMemo(() => {
    // Start with server-provided subjects
    const merged = [...initialData];

    // Get subjects from the client context for this exact dept and sem
    const clientSubs = clientSubjectsState?.[deptId]?.[semId] || [];

    clientSubs.forEach((clientSub) => {
      // Only include approved subjects (just like the server does)
      if (clientSub.status === "approved" || !clientSub.status) {
        // Prevent duplicates by checking id
        const exists = merged.some(
          (s) => 
            s.id.toLowerCase() === clientSub.id.toLowerCase() &&
            s.departmentId.toLowerCase() === clientSub.departmentId.toLowerCase() &&
            String(s.semesterId) === String(clientSub.semesterId)
        );

        if (!exists) {
          // Cast the client Subject into a UnifiedSubject format for rendering
          merged.push({
            id: clientSub.id,
            name: clientSub.name,
            code: clientSub.code || "",
            departmentId: clientSub.departmentId,
            semesterId: clientSub.semesterId,
            status: clientSub.status,
            createdAt: clientSub.createdAt,
          });
        }
      }
    });

    return merged;
  }, [initialData, clientSubjectsState, deptId, semId]);

  if (displaySubjects.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 flex flex-col items-center">
        <Book className="text-gray-600 mb-4" size={48} />
        <h2 className="text-xl font-medium text-white mb-2">No Subjects Listed</h2>
        <p className="text-gray-400">Subjects for Semester {semId} will appear here as they are added.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {displaySubjects.map((sub) => {
        // Format object correctly for getSubjectSeoPath
        const seoPath = getSubjectSeoPath(sub);
        return (
          <Link 
            key={sub.id} 
            href={seoPath}
            className="vision-glass p-6 h-full block group cursor-pointer relative overflow-hidden vision-hover border border-white/5 hover:border-purple-500/30 transition-all text-left no-underline"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <Book size={24} />
              </div>
              <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{sub.name}</h2>
            {sub.code && (
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">{sub.code}</p>
            )}
            <p className="text-sm text-gray-400">View PYQs, Notes, and Important Questions.</p>
          </Link>
        );
      })}
    </div>
  );
}
