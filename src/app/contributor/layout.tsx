"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, Plus, BookOpen } from "lucide-react";
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
        <div className="glass-panel p-6 rounded-2xl md:sticky top-24 border border-fuchsia-500/20 shadow-[0_0_30px_rgba(217,70,239,0.05)] space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-fuchsia-500 animate-pulse shadow-[0_0_10px_rgba(217,70,239,0.8)]"></span>
              Contributor
            </h2>
            <p className="text-[11px] text-gray-400 mt-1">Study Material Hub</p>
          </div>

          <nav className="flex flex-col gap-2">
            <Link 
              href="/contributor" 
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-fuchsia-300 hover:text-white hover:bg-fuchsia-500/10 transition-colors text-sm font-medium border border-fuchsia-500/20 w-full"
            >
              <Upload size={18} />
              Dashboard
            </Link>
            <Link 
              href="/contributor/upload" 
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors text-sm font-medium border border-emerald-500/20 w-full"
            >
              <Plus size={18} />
              Upload Material
            </Link>
            <Link 
              href="/contributor/courses" 
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors text-sm font-medium border border-blue-500/20 w-full"
            >
              <BookOpen size={18} />
              My Suggestions
            </Link>
          </nav>

          {/* Mini Perk Highlight */}
          <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border border-purple-500/20 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <span>🎁 Free Plus Offer</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">
              Upload <strong className="text-white">10+ approved materials</strong> to unlock Paperino Plus Plan 100% free!
            </p>
          </div>
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
