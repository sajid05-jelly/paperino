"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Book, ChevronRight, Loader2 } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";

export default function SemesterPage({ params }: { params: Promise<{ semId: string }> }) {
  const resolvedParams = use(params);
  const { semId } = resolvedParams;
  
  const { subjects, loading } = useSubjects();

  // Filter out pending courses so they don't appear in the public grid
  const semesterSubjects = (subjects[semId] || []).filter(sub => sub.status !== "pending");

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link href="/btech" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Semesters
      </Link>

      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Semester {semId}</h1>
        <p className="text-gray-400 text-lg">Select a subject to view its study materials.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 w-full">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
          <p className="text-gray-400">Loading courses...</p>
        </div>
      ) : semesterSubjects.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <Book className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-xl font-medium text-white mb-2">No Subjects Configured</h3>
          <p className="text-gray-400">There are no subjects available for this semester yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {semesterSubjects.map(sub => (
            <Link key={sub.id} href={`/btech/semesters/${semId}/subjects/${sub.id}`}>
              <div className="vision-glass neon-border p-6 h-full group cursor-pointer relative overflow-hidden vision-hover">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                    <Book size={24} />
                  </div>
                  <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{sub.name}</h3>
                <p className="text-sm text-gray-400">View PYQs, Notes, and Important Questions.</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
