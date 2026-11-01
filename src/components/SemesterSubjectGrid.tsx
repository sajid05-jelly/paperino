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
  const { subjects: clientSubjectsState, lazyLoadSubjects } = useSubjects();
  const [clientLoaded, setClientLoaded] = React.useState(false);

  // Trigger client-side synchronization on mount so newly added, renamed, or deleted subjects reflect immediately
  React.useEffect(() => {
    let isMounted = true;
    if (deptId && semId && lazyLoadSubjects) {
      lazyLoadSubjects(deptId, semId).finally(() => {
        if (isMounted) setClientLoaded(true);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [deptId, semId, lazyLoadSubjects]);

  // Client subjects from Firestore are authoritative once loaded.
  // Server initialData is used as the instant SSR fallback before client hydration/fetch completes.
  const displaySubjects = useMemo(() => {
    const clientSubs = clientSubjectsState?.[deptId]?.[semId];

    if (!clientLoaded || !clientSubs) {
      return initialData;
    }

    return clientSubs
      .filter((s) => s.status === "approved" || !s.status)
      .map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code || "",
        departmentId: s.departmentId,
        semesterId: s.semesterId,
        status: s.status,
        createdAt: s.createdAt,
      }));
  }, [initialData, clientSubjectsState, deptId, semId, clientLoaded]);

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
