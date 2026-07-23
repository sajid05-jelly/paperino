"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Book, ChevronRight, Loader2, Plus } from "lucide-react";
import SafeBackButton from "@/components/SafeBackButton";
import { useSubjects } from "@/context/SubjectsContext";
import CreateCourseModal from "@/components/CreateCourseModal";
import { useAuth } from "@/context/AuthContext";

export default function SemesterSubjectsPage({ params }: { params: Promise<{ deptId: string, semId: string }> }) {
  const resolvedParams = use(params);
  const { deptId, semId } = resolvedParams;
  
  const { departments, subjects, loading, lazyLoadSubjects } = useSubjects();
  const { user } = useAuth();
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [lazyLoading, setLazyLoading] = useState(false);

  useEffect(() => {
    if (deptId && semId && lazyLoadSubjects) {
      setLazyLoading(true);
      lazyLoadSubjects(deptId, semId).finally(() => setLazyLoading(false));
    }
  }, [deptId, semId, lazyLoadSubjects]);

  // Find active department
  const activeDept = departments.find(d => d.id === deptId);

  // Filter out pending subjects for public users
  const deptSubjects = (subjects[deptId]?.[semId] || []).filter(sub => sub.status !== "pending");

  if (loading || lazyLoading) {
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
      <SafeBackButton fallbackUrl={`/courses/${deptId}`} label="Back to Semesters" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors gap-2" size={16} />

      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">{activeDept.name}</h1>
        <h2 className="text-xl text-purple-400 mb-4 font-semibold">Semester {semId}</h2>
        <p className="text-gray-400 text-lg">Select a subject to view its study materials.</p>
      </div>

      {deptSubjects.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 flex flex-col items-center">
          <Book className="text-gray-600 mb-4" size={48} />
          <h3 className="text-xl font-medium text-white mb-2">No Subjects Configured</h3>
          <p className="text-gray-400 mb-6">There are no subjects available for this semester yet.</p>
          {user && (
            <button 
              onClick={() => setIsSuggestModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] cursor-pointer"
            >
              <Plus size={16} /> Suggest Course
            </button>
          )}
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

      <CreateCourseModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        initialDeptId={deptId}
        initialSemester={semId}
      />
    </div>
  );
}
