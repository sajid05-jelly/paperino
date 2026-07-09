"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Book, ChevronRight, Loader2 } from "lucide-react";
import { useSubjects } from "@/context/SubjectsContext";

export default function SemesterSubjectsPage({ params }: { params: Promise<{ deptId: string, semId: string }> }) {
  const resolvedParams = use(params);
  const { deptId, semId } = resolvedParams;
  
  const { departments, subjects, loading } = useSubjects();

  // Find active department
  const activeDept = departments.find(d => d.id === deptId);

  // Filter out pending subjects for public users
  const deptSubjects = (subjects[deptId]?.[semId] || []).filter(sub => sub.status !== "pending");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] w-full">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
        <p className="text-gray-400">Loading semester subjects...</p>
      </div>
    );
  }

  // If department or semester doesn't exist/is invalid
  if (!activeDept || (activeDept.status !== "approved")) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold text-white mb-2">Department Not Found</h1>
        <p className="text-gray-400 mb-8">The requested department does not exist or is pending approval.</p>
        <Link href="/courses" className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors">
          Return to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link href={`/courses/${deptId}`} className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back to Semesters
      </Link>

      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">{activeDept.name}</h1>
        <h2 className="text-xl text-purple-400 mb-4 font-semibold">Semester {semId}</h2>
        <p className="text-gray-400 text-lg">Select a subject to view its study materials.</p>
      </div>

      {deptSubjects.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/5">
          <Book className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-xl font-medium text-white mb-2">No Subjects Configured</h3>
          <p className="text-gray-400">There are no subjects available for this semester yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {deptSubjects.map(sub => (
            <Link key={sub.id} href={`/courses/${deptId}/semesters/${semId}/subjects/${sub.id}`}>
              <div className="vision-glass p-6 h-full group cursor-pointer relative overflow-hidden vision-hover border border-white/5 hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                    <Book size={24} />
                  </div>
                  <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{sub.name}</h3>
                {sub.code && (
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">{sub.code}</p>
                )}
                <p className="text-sm text-gray-400">View PYQs, Notes, and Important Questions.</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
