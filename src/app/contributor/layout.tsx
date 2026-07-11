"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Upload, Plus, BookOpen } from "lucide-react";
import CreateCourseModal from "@/components/CreateCourseModal";

export default function ContributorLayout({ children }: { children: React.ReactNode }) {
  const { user, isContributor, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex items-center justify-center min-h-[50vh] text-fuchsia-400 animate-pulse">Loading Contributor Dashboard...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto px-6 py-8 gap-8 animate-in fade-in duration-500">
      {/* Contributor Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="glass-panel p-6 rounded-2xl md:sticky top-24 border border-fuchsia-500/20 shadow-[0_0_30px_rgba(217,70,239,0.05)]">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-fuchsia-500 animate-pulse shadow-[0_0_10px_rgba(217,70,239,0.8)]"></span>
            Contributor
          </h2>
          <nav className="flex flex-col gap-2">
            <Link href="/contributor" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <LayoutDashboard size={20} className="text-cyan-400" />
              My Uploads
            </Link>
            <div className="h-px w-full bg-white/10 my-2"></div>
            <Link href="/contributor/upload" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <Upload size={20} className="text-fuchsia-400" />
              Upload Material
            </Link>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors w-full text-left">
              <Plus size={20} className="text-fuchsia-400" />
              Create New Course
            </button>
            <Link href="/contributor/courses" className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors font-medium border border-blue-500/20">
              <BookOpen size={20} />
              My Requested Courses
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1">
        {children}
      </div>

      <CreateCourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
