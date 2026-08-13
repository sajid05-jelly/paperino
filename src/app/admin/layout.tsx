"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Upload, Activity, Bot, FileText,
  ShieldCheck, ShieldAlert, MessageSquare, Plus, BookOpen, Radio, 
  BrainCircuit, Wrench, Building2, ChevronDown, Sparkles, Gamepad2, FlaskConical
} from "lucide-react";
import CreateCourseModal from "@/components/CreateCourseModal";

const LEAD_ADMIN_EMAIL = "mohamedsajid.sa@gmail.com";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLeadAdmin = user?.email?.toLowerCase() === LEAD_ADMIN_EMAIL.toLowerCase();

  // System Control Sub-menu Expand State
  const isSystemPath = ["/admin/system", "/admin/analytics", "/admin/header-message", "/admin/ats", "/admin/career-dna", "/admin/free-class-finder"].some(path => pathname?.startsWith(path));
  const [isSystemControlOpen, setIsSystemControlOpen] = useState(isSystemPath);

  // Protected Lead-Admin-Only Routes
  const LEAD_ADMIN_ONLY_PATHS = [
    "/admin/system",
    "/admin/system/challenges",
    "/admin/maintenance",
    "/admin/header-message",
    "/admin/ats",
    "/admin/career-dna",
    "/admin/free-class-finder",
    "/admin/analytics"
  ];

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        router.push("/login");
        return;
      }

      // If a non-lead admin attempts to access Lead-Admin-Only routes, redirect to /admin/materials
      if (!isLeadAdmin && LEAD_ADMIN_ONLY_PATHS.some(path => pathname?.startsWith(path))) {
        router.push("/admin/materials");
      }
    }
  }, [user, isAdmin, isLeadAdmin, loading, pathname, router]);

  if (loading || !user || !isAdmin) {
    return <div className="flex items-center justify-center min-h-[50vh] text-white font-semibold">Loading Admin Dashboard...</div>;
  }

  // Prevent flash of protected content for non-lead admin on lead-admin routes
  if (!isLeadAdmin && LEAD_ADMIN_ONLY_PATHS.some(path => pathname?.startsWith(path))) {
    return <div className="flex items-center justify-center min-h-[50vh] text-white font-semibold">Redirecting...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto px-6 py-8 gap-8">
      {/* Admin Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="glass-panel p-6 rounded-2xl md:sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            {isLeadAdmin ? (
              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded-full">
                Lead Admin
              </span>
            ) : (
              <span className="text-[10px] font-bold text-gray-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </div>

          <nav className="flex flex-col gap-2">
            <Link href="/admin/upload" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <Upload size={20} />
              Upload Material
            </Link>

            {isLeadAdmin && (
              <Link href="/admin/analytics" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                <Activity size={20} className="text-violet-400" />
                Analytics Dashboard
              </Link>
            )}

            <div className="h-px w-full bg-white/10 my-2"></div>
            
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

            <Link href="/admin/reviews" className="flex items-center gap-3 px-4 py-3 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors font-medium border border-rose-500/20">
              <ShieldAlert size={20} />
              Pending Reviews
            </Link>
            
            {/* ── System Control Expandable Group (LEAD ADMIN ONLY) ───────────────────────────── */}
            {isLeadAdmin && (
              <>
                <div className="h-px w-full bg-white/10 my-2"></div>

                <div className="space-y-1">
                  <button
                    onClick={() => setIsSystemControlOpen(!isSystemControlOpen)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all font-medium border cursor-pointer ${
                      isSystemPath 
                        ? "bg-red-500/15 border-red-500/40 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                        : "text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wrench size={20} />
                      <span>System Control</span>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isSystemControlOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isSystemControlOpen && (
                    <div className="pl-4 space-y-1.5 pt-1 border-l-2 border-red-500/30 ml-4 animate-in fade-in duration-200">
                      {/* 1. Maintenance */}
                      <Link 
                        href="/admin/system" 
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          pathname === "/admin/system" ? "bg-red-500/20 text-red-300 font-bold border border-red-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Wrench size={15} className="text-red-400 shrink-0" />
                        <span>Maintenance</span>
                      </Link>

                      {/* 2. Paperino Header Message */}
                      <Link 
                        href="/admin/header-message" 
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          pathname === "/admin/header-message" ? "bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Sparkles size={15} className="text-violet-400 shrink-0" />
                        <span>Paperino Header Message</span>
                      </Link>

                      {/* 3. ATS Management */}
                      <Link 
                        href="/admin/ats" 
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          pathname === "/admin/ats" ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Bot size={15} className="text-emerald-400 shrink-0" />
                        <span>ATS Management</span>
                      </Link>

                      {/* 4. Career DNA Admin */}
                      <Link 
                        href="/admin/career-dna" 
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          pathname === "/admin/career-dna" ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <BrainCircuit size={15} className="text-purple-400 shrink-0" />
                        <span>Career DNA Admin</span>
                      </Link>

                      {/* 5. Free Class Finder Control */}
                      <Link 
                        href="/admin/free-class-finder" 
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          pathname === "/admin/free-class-finder" ? "bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Building2 size={15} className="text-violet-400 shrink-0" />
                        <span>Free Class Finder Control</span>
                      </Link>

                      {/* 6. Challenges Control */}
                      <Link 
                        href="/admin/system/challenges" 
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          pathname === "/admin/system/challenges" ? "bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30" : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Gamepad2 size={15} className="text-violet-400 shrink-0" />
                        <span>Challenges Control</span>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="h-px w-full bg-white/10 my-2"></div>

            <Link href="/admin/subject-requests" className="flex items-center gap-3 px-4 py-3 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors font-medium border border-amber-500/20">
              <BookOpen size={20} />
              Subject Requests
            </Link>



            <Link href="/admin/team" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <ShieldCheck size={20} className="text-emerald-400" />
              Platform Analytics
            </Link>

            <Link href="/admin/pulse" className="flex items-center gap-3 px-4 py-3 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors font-medium border border-cyan-500/20">
              <Radio size={20} />
              Manage Pulse Updates
            </Link>

            <Link href="/admin/feedback" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <MessageSquare size={20} className="text-fuchsia-400" />
              Feedback Center
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Admin Content Area */}
      <div className="flex-1 min-w-0 w-full max-w-full">
        {children}
      </div>

      <CreateCourseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
