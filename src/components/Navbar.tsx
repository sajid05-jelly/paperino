"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "./UserAvatar";
import AvatarSelectorModal from "./AvatarSelectorModal";
import { Menu, X, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, isAdmin, isContributor, logout, paperinoAvatar, setPaperinoAvatar } = useAuth();
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const getLinkClass = (href: string, isSpecial = false) => {
    const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href + "/"));
    const baseClass = `px-2.5 py-1.5 lg:px-3 lg:py-1.5 xl:px-3.5 xl:py-2 rounded-full text-xs xl:text-sm font-medium transition-all duration-300 border flex-shrink-0 whitespace-nowrap`;
    
    if (isActive) {
      return `${baseClass} bg-violet-500/10 text-violet-200 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)] ring-1 ring-violet-500/20 z-10 relative`;
    }
    
    if (isSpecial) {
      return `${baseClass} text-[color:var(--primary-400)] border-transparent hover:text-[color:var(--primary-300)] hover:bg-white/5`;
    }
    
    return `${baseClass} text-gray-400 border-transparent hover:text-white hover:bg-white/5`;
  };

  const getMobileLinkClass = (href: string, isSpecial = false) => {
    const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href + "/"));
    const baseClass = `block w-full px-3 py-2.5 rounded-xl transition-all duration-300 border text-sm ${isSpecial ? 'font-semibold' : 'font-medium'}`;
    
    if (isActive) {
      return `${baseClass} bg-violet-500/20 text-violet-300 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]`;
    }
    
    if (isSpecial) {
      return `${baseClass} text-[color:var(--primary-400)] border-transparent hover:text-[color:var(--primary-300)] hover:bg-white/5`;
    }
    
    return `${baseClass} text-gray-300 border-transparent hover:text-white hover:bg-white/5`;
  };

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] w-full items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 lg:py-3 xl:py-4 gap-2 lg:gap-4">
          <Link href="/" className="flex items-center gap-1.5 group flex-shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 relative overflow-hidden rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(167,139,250,0.5)] group-hover:shadow-[0_0_25px_rgba(167,139,250,0.8)] transition-shadow bg-black border border-white/5">
              <Logo className="w-full h-full object-cover scale-[1.3] group-hover:scale-[1.35] transition-transform" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white hidden sm:block">Paperino</span>
          </Link>
          
          <div 
            className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-2 font-medium min-w-0"
          >
            <Link href="/btech" className={getLinkClass("/btech")}>B.Tech</Link>
            <Link href="/gpa" className={getLinkClass("/gpa")}>GPA Calc</Link>
            <Link href="/calculator" className={getLinkClass("/calculator")}>Sem-Calc</Link>
            <Link href="/pyq" className={getLinkClass("/pyq")}>PYQs</Link>
            <Link href="/ats" className={getLinkClass("/ats")}>ATS</Link>
            <Link href="/grades" className={getLinkClass("/grades")}>Grades</Link>
            <Link href="/bookmarks" className={getLinkClass("/bookmarks")}>Bookmarks</Link>
            
            <div className="w-[1px] h-4 bg-white/10 mx-1 hidden xl:block flex-shrink-0"></div>
            
            <Link href="/leaderboard" className={getLinkClass("/leaderboard", true)}>Leaderboard</Link>
            <Link href="/team" className={getLinkClass("/team", true)}>Team</Link>
            <Link href="/developer" className={getLinkClass("/developer", true)}>Developer</Link>
            
            {isAdmin && (
              <Link href="/admin" className={getLinkClass("/admin", true)}>Admin</Link>
            )}
            {!isAdmin && isContributor && (
              <Link href="/contributor" className={getLinkClass("/contributor", true)}>Dashboard</Link>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 lg:gap-3 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-2 lg:gap-3">
                <button 
                  onClick={() => setIsChangingAvatar(true)} 
                  className="flex flex-shrink-0 items-center gap-2 group p-1 pr-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all cursor-pointer"
                  title="Change Avatar"
                >
                  <UserAvatar avatarId={paperinoAvatar} size={16} className="w-8 h-8" />
                  <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors hidden sm:block max-w-[80px] xl:max-w-[100px] truncate">
                    {user.displayName?.split(' ')[0] || 'Student'}
                  </span>
                </button>
                <div className="hidden md:flex items-center flex-shrink-0">
                  <button 
                    onClick={logout} 
                    title="Logout"
                    className="flex flex-shrink-0 items-center justify-center w-9 h-9 rounded-full bg-red-500/5 border border-red-500/20 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] group"
                  >
                    <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="hidden md:block rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-200">
                Log In
              </Link>
            )}

            {/* Hamburger Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors rounded-lg bg-white/5 border border-white/10 ml-1"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu — slide-in drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 bottom-0 z-[10000] w-[78vw] max-w-[320px] lg:hidden flex flex-col bg-[#07050e]/95 backdrop-blur-3xl border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.6)] animate-in slide-in-from-right duration-300">

            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                <span className="text-sm font-semibold text-white tracking-wide">Menu</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Nav Links */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

              {/* Main Tools */}
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600 px-3 pb-1.5">Tools</p>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/btech" className={getMobileLinkClass("/btech")}>B.Tech Resources</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/gpa" className={getMobileLinkClass("/gpa")}>GPA Calculator</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/calculator" className={getMobileLinkClass("/calculator")}>Semester Calculator</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/pyq" className={getMobileLinkClass("/pyq")}>PYQ Analyzer</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/ats" className={getMobileLinkClass("/ats")}>ATS Analyzer</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/grades" className={getMobileLinkClass("/grades")}>Grades</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/bookmarks" className={getMobileLinkClass("/bookmarks")}>Bookmarks</Link>

              {/* Divider */}
              <div className="h-px bg-white/[0.06] my-3 mx-2" />

              {/* Discover */}
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600 px-3 pb-1.5">Discover</p>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/leaderboard" className={getMobileLinkClass("/leaderboard", true)}>Leaderboard</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/team" className={getMobileLinkClass("/team", true)}>Paperino Team</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/developer" className={getMobileLinkClass("/developer", true)}>Developer</Link>

              {/* Admin / Contributor */}
              {isAdmin && (
                <>
                  <div className="h-px bg-white/[0.06] my-3 mx-2" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600 px-3 pb-1.5">Admin</p>
                  <Link onClick={() => setIsMobileMenuOpen(false)} href="/admin" className={getMobileLinkClass("/admin", true)}>Admin Dashboard</Link>
                </>
              )}
              {!isAdmin && isContributor && (
                <>
                  <div className="h-px bg-white/[0.06] my-3 mx-2" />
                  <Link onClick={() => setIsMobileMenuOpen(false)} href="/contributor" className={getMobileLinkClass("/contributor", true)}>Contributor Dashboard</Link>
                </>
              )}
            </div>

            {/* Drawer Footer — Auth */}
            <div className="px-3 pb-6 pt-3 border-t border-white/[0.07]">
              {!user ? (
                <Link
                  onClick={() => setIsMobileMenuOpen(false)}
                  href="/login"
                  className="flex items-center justify-center w-full rounded-xl bg-[color:var(--primary-600)] px-6 py-3 text-white text-sm font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] transition-all"
                >
                  Log In
                </Link>
              ) : (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 px-6 py-3 text-gray-300 hover:text-red-400 text-sm font-bold transition-all duration-300"
                >
                  <LogOut size={15} /> Log Out
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <AvatarSelectorModal 
        isOpen={isChangingAvatar} 
        onSelect={async (id) => {
          await setPaperinoAvatar(id);
          setIsChangingAvatar(false);
        }} 
        isFirstLogin={false} 
      />
    </>
  );
}
