"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Upload, Settings, FileText, Activity, Bot, ShieldCheck, ShieldAlert, MessageSquare, Plus, BookOpen } from "lucide-react";
import CreateCourseModal from "@/components/CreateCourseModal";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        router.push("/login");
      }
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user || !isAdmin) {
    return <div className="flex items-center justify-center min-h-[50vh]">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto px-6 py-8 gap-8">
      {/* Admin Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="glass-panel p-6 rounded-2xl md:sticky top-24">
          <h2 className="text-xl font-bold text-white mb-6">Admin Panel</h2>
          <nav className="flex flex-col gap-2">
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <Activity size={20} className="text-violet-400" />
              Analytics Dashboard
            </Link>
            <Link href="/admin/ai" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <Bot size={20} className="text-fuchsia-400" />
              AI Controls
            </Link>
            <div className="h-px w-full bg-white/10 my-2"></div>
            <Link href="/admin/upload" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <Upload size={20} />
              Upload Material
            </Link>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors w-full text-left">
              <Plus size={20} className="text-fuchsia-400" />
              Create New Course
            </button>
            <Link href="/admin/materials" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <FileText size={20} />
              Manage Materials
            </Link>
            <Link href="/admin/courses" className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors font-medium border border-blue-500/20">
              <BookOpen size={20} />
              Pending Course Requests
            </Link>
            <Link href="/admin/reviews" className="flex items-center gap-3 px-4 py-3 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors font-medium border border-amber-500/20">
              <ShieldAlert size={20} />
              Pending Reviews
            </Link>
            <Link href="/admin/team" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <ShieldCheck size={20} className="text-emerald-400" />
              Manage Team
            </Link>
            <Link href="/admin/feedback" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <MessageSquare size={20} className="text-fuchsia-400" />
              Feedback Center
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Admin Content Area */}
      <div className="flex-1">
        {children}
      </div>

      <CreateCourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
