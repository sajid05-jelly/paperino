"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "./UserAvatar";
import AvatarSelectorModal from "./AvatarSelectorModal";
import { Menu, X, LogOut, Palette, Volume2, VolumeX, Check, ChevronDown, FlaskConical, BrainCircuit, ShieldAlert, ShieldCheck, GraduationCap } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useTheme } from "@/context/ThemeContext";
import { useSound } from "@/hooks/useSound";

const THEMES = [
  { id: "cosmic-violet", name: "Cosmic Violet", primary: "bg-violet-500", accent: "bg-fuchsia-500", shadow: "shadow-[0_0_15px_rgba(139,92,246,0.5)]" },
  { id: "ocean-blue", name: "Ocean Blue", primary: "bg-blue-500", accent: "bg-cyan-500", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]" },
  { id: "crimson-red", name: "Crimson Red", primary: "bg-red-500", accent: "bg-orange-500", shadow: "shadow-[0_0_15px_rgba(239,68,68,0.5)]" },
  { id: "emerald-green", name: "Emerald Green", primary: "bg-emerald-500", accent: "bg-lime-500", shadow: "shadow-[0_0_15px_rgba(16,185,129,0.5)]" },
  { id: "sunset-orange", name: "Sunset Orange", primary: "bg-orange-500", accent: "bg-pink-500", shadow: "shadow-[0_0_15px_rgba(249,115,22,0.5)]" },
  { id: "midnight-silver", name: "Midnight Silver", primary: "bg-zinc-500", accent: "bg-white", shadow: "shadow-[0_0_15px_rgba(161,161,170,0.5)]" },
] as const;

export default function Navbar() {
  const { user, isAdmin, isContributor, logout, paperinoAvatar, setPaperinoAvatar } = useAuth();
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const { soundEnabled, toggleSound } = useSound();
  const pathname = usePathname();
  const [isLabsOpen, setIsLabsOpen] = useState(false);
  const [isLabsMobileOpen, setIsLabsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getLinkClass = (href: string, isSpecial = false) => {
    const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href + "/"));
    const baseClass = `px-2.5 py-1.5 lg:px-3 lg:py-1.5 xl:px-3.5 xl:py-2 rounded-full text-xs xl:text-sm font-medium transition-all duration-300 border flex-shrink-0 whitespace-nowrap`;
    
    if (href === '/contributor') {
      return `${baseClass} menu-team-glossy ${isActive ? 'active shadow-[0_0_20px_rgba(139,92,246,0.4)]' : ''}`;
    }
    if (href === '/developer') {
      return `${baseClass} menu-dev-glossy ${isActive ? 'active shadow-[0_0_20px_rgba(249,115,22,0.4)]' : ''}`;
    }
    if (href === '/pulse') {
      return `${baseClass} menu-pulse-glossy ${isActive ? 'active shadow-[0_0_20px_rgba(6,182,212,0.4)]' : ''}`;
    }

    if (isActive) {
      return `${baseClass} liquid-btn text-white text-glow z-10 relative`;
    }
    
    if (isSpecial) {
      return `${baseClass} text-[color:var(--primary-400)] border-transparent hover:text-[color:var(--primary-300)] hover:bg-white/5`;
    }
    
    return `${baseClass} text-gray-400 border-transparent hover:text-white hover:bg-white/5`;
  };

  const getMobileLinkClass = (href: string, isSpecial = false) => {
    const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href + "/"));
    const baseClass = `block w-full px-3 py-2.5 rounded-xl transition-all duration-300 border text-sm ${isSpecial ? 'font-semibold' : 'font-medium'}`;
    
    if (href === '/contributor') {
      return `${baseClass} border-transparent hover:bg-white/5 menu-team-mobile-glow ${isActive ? 'active-mobile' : ''}`;
    }
    if (href === '/developer') {
      return `${baseClass} border-transparent hover:bg-white/5 menu-dev-mobile-glow ${isActive ? 'active-mobile' : ''}`;
    }
    if (href === '/pulse') {
      return `${baseClass} border-transparent hover:bg-white/5 menu-pulse-mobile-glow ${isActive ? 'active-mobile' : ''}`;
    }

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
      <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-black/20 backdrop-blur-[40px] saturate-150 border-b border-white/10 shadow-[0_10px_30px_rgba(var(--primary-rgb),0.1)]' : 'bg-transparent border-b border-transparent'}`}>
        <div className={`mx-auto flex max-w-[1600px] w-full items-center justify-between px-3 sm:px-4 lg:px-6 transition-all duration-300 gap-2 lg:gap-4 ${isScrolled ? 'py-2 lg:py-2.5 xl:py-3' : 'py-3 lg:py-4 xl:py-5'}`}>
          <Link href="/" className="flex items-center gap-1.5 group flex-shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 relative overflow-hidden rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(167,139,250,0.5)] group-hover:shadow-[0_0_30px_rgba(167,139,250,0.8)] transition-all duration-500 bg-black border border-white/5">
              <Logo className="w-full h-full object-cover scale-[1.3] group-hover:scale-[1.4] transition-transform duration-500" aria-hidden="true" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white hidden sm:block group-hover:text-glow transition-all duration-300">Paperino</span>
          </Link>
          
            <div className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-2 font-medium min-w-0"
          >
            <Link href="/courses" className={getLinkClass("/courses")}>Materials</Link>
            <Link href="/gpa" className={getLinkClass("/gpa")}>GPA Calc</Link>
            <Link href="/pyq" className={getLinkClass("/pyq")}>PYQs</Link>
            
            <div className="w-[1px] h-4 bg-white/10 mx-1 hidden xl:block flex-shrink-0"></div>
            
            <Link href="/pulse" className={getLinkClass("/pulse", true)}>Paperino Pulse</Link>
            <Link href="/leaderboard" className={getLinkClass("/leaderboard", true)}>Leaderboard</Link>
            {user && !isAdmin && (
              <Link href="/contributor" className={getLinkClass("/contributor", true)}>Dashboard</Link>
            )}

            {/* 🧪 Paperino Labs Dropdown */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setIsLabsOpen(!isLabsOpen)}
                onBlur={() => setTimeout(() => setIsLabsOpen(false), 200)}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600/10 to-cyan-500/10 backdrop-blur-xl border border-violet-500/20 hover:border-cyan-500/40 shadow-[0_0_15px_rgba(139,92,246,0.08)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-500 flex items-center gap-2 font-bold text-xs xl:text-sm text-white hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group"
              >
                <span className="flex items-center gap-1.5 text-glow relative z-10">
                  <FlaskConical 
                    size={14} 
                    className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.85)] animate-pulse group-hover:rotate-12 transition-transform duration-300"
                  />
                  Paperino Labs
                </span>

                <ChevronDown size={14} className={`transition-transform duration-300 relative z-10 text-cyan-400 ${isLabsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isLabsOpen && (
                <div className="absolute right-0 mt-2.5 w-60 rounded-2xl bg-[#07050e]/95 backdrop-blur-3xl border border-white/[0.08] p-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] via-transparent to-transparent pointer-events-none rounded-2xl" />
                  <Link
                    href="/ats"
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-bold group/item"
                  >
                    <BrainCircuit size={15} className="text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)] group-hover/item:text-cyan-400 transition-colors shrink-0" /> ATS Analyzer
                  </Link>
                  <Link
                    href="/exam-emergency"
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-bold group/item"
                  >
                    <ShieldAlert size={15} className="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] group-hover/item:text-cyan-400 transition-colors shrink-0" /> Exam Emergency
                  </Link>
                  <Link
                    href="/attendance-mafia"
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-bold group/item"
                  >
                    <ShieldCheck size={15} className="text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)] group-hover/item:text-cyan-400 transition-colors shrink-0" /> Attendance Shield
                  </Link>
                  <Link
                    href="/survival-notes"
                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-all text-xs font-bold group/item"
                  >
                    <GraduationCap size={15} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] group-hover/item:text-cyan-400 transition-colors shrink-0" /> Senior Insights
                  </Link>
                </div>
              )}
            </div>

            <Link href="/developer" className={getLinkClass("/developer", true)}>Developer</Link>
            
            {isAdmin && (
              <Link href="/admin" className={getLinkClass("/admin", true)}>Admin</Link>
            )}
          </div>

          {/* ── Tablet View Top Horizontal Row (Only visible on tablet breakpoint, inside header) ── */}
          <div className="tablet-header-utility hidden items-center gap-1.5 bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-md">
            {/* WhatsApp */}
            <a
              href="https://chat.whatsapp.com/BAu2CuzzE5JC0DPgzgsz6M"
              target="_blank"
              rel="noopener noreferrer"
              title="Join WhatsApp Community"
              className="w-8 h-8 rounded-full flex items-center justify-center text-green-400 hover:bg-green-500/10 transition-all duration-200 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px] drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/hi_paperino/"
              target="_blank"
              rel="noopener noreferrer"
              title="Follow on Instagram"
              className="w-8 h-8 rounded-full flex items-center justify-center text-pink-400 hover:bg-pink-500/10 transition-all duration-200 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] drop-shadow-[0_0_4px_rgba(236,72,153,0.4)]" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2.5" />
              </svg>
            </a>

            {/* Sound */}
            <button
              onClick={toggleSound}
              title={soundEnabled ? "Mute UI Sounds" : "Enable UI Sounds"}
              className="w-8 h-8 rounded-full flex items-center justify-center text-violet-400 hover:bg-violet-500/10 transition-all duration-200 cursor-pointer"
            >
              {soundEnabled
                ? <Volume2 size={15} className="drop-shadow-[0_0_4px_rgba(139,92,246,0.4)]" aria-hidden="true" />
                : <VolumeX size={15} aria-hidden="true" />
              }
            </button>

            {/* Theme */}
            <button
              onClick={() => setIsThemeOpen(true)}
              title="Customize Theme"
              className="w-8 h-8 rounded-full flex items-center justify-center text-violet-400 hover:bg-violet-500/10 transition-all duration-200 cursor-pointer"
            >
              <Palette size={15} className="drop-shadow-[0_0_4px_rgba(139,92,246,0.4)]" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 lg:gap-3 flex-shrink-0">
            {/* Mobile Utility Controls - WhatsApp, Instagram, Sound, Theme */}
            <div className="flex sm:hidden items-center gap-1.5 bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-md mr-1">
              {/* WhatsApp */}
              <a
                href="https://chat.whatsapp.com/BAu2CuzzE5JC0DPgzgsz6M"
                target="_blank"
                rel="noopener noreferrer"
                title="Join WhatsApp Community"
                className="w-7 h-7 rounded-full flex items-center justify-center text-green-400 hover:text-green-300 hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label="Join WhatsApp Community"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px] drop-shadow-[0_0_4px_rgba(34,197,94,0.4)]" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/hi_paperino/"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow on Instagram"
                className="w-7 h-7 rounded-full flex items-center justify-center text-pink-400 hover:text-pink-300 hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label="Follow on Instagram"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] drop-shadow-[0_0_4px_rgba(236,72,153,0.4)]" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2.5" />
                </svg>
              </a>

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                title={soundEnabled ? "Mute UI Sounds" : "Enable UI Sounds"}
                aria-label={soundEnabled ? "Mute UI Sounds" : "Enable UI Sounds"}
                className="w-7 h-7 rounded-full flex items-center justify-center text-violet-400 hover:text-violet-300 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                {soundEnabled
                  ? <Volume2 size={14} className="drop-shadow-[0_0_4px_rgba(139,92,246,0.4)]" aria-hidden="true" />
                  : <VolumeX size={14} aria-hidden="true" />
                }
              </button>

              {/* Theme Customize */}
              <button
                onClick={() => setIsThemeOpen(true)}
                title="Customize Theme"
                aria-label="Customize Theme"
                className="w-7 h-7 rounded-full flex items-center justify-center text-violet-400 hover:text-violet-300 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Palette size={14} className="drop-shadow-[0_0_4px_rgba(139,92,246,0.4)]" aria-hidden="true" />
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-2 lg:gap-3">
                {/* Notification Bell */}
                <NotificationBell />

                <button 
                  onClick={() => setIsChangingAvatar(true)} 
                  className="flex flex-shrink-0 items-center gap-2 group p-1 pr-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all cursor-pointer"
                  title="Change Avatar"
                  aria-label="Change Avatar"
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
                    aria-label="Logout"
                    className="flex flex-shrink-0 items-center justify-center w-9 h-9 rounded-full bg-red-500/5 border border-red-500/20 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] group"
                  >
                    <LogOut size={16} className="group-hover:scale-110 transition-transform" aria-hidden="true" />
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
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors rounded-lg bg-white/5 border border-white/10 ml-1"
            >
              {isMobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
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
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/courses" className={getMobileLinkClass("/courses")}>Materials</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/gpa" className={getMobileLinkClass("/gpa")}>GPA Calculator</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/pyq" className={getMobileLinkClass("/pyq")}>PYQ Analyzer</Link>

              {/* Divider */}
              <div className="h-px bg-white/[0.06] my-3 mx-2" />

              {/* Discover */}
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600 px-3 pb-1.5">Discover</p>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/leaderboard" className={getMobileLinkClass("/leaderboard", true)}>Leaderboard</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/pulse" className={getMobileLinkClass("/pulse", true)}>Paperino Pulse</Link>
              {user && !isAdmin && (
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/contributor" className={getMobileLinkClass("/contributor", true)}>Dashboard</Link>
              )}

              {/* Collapsible Mobile Paperino Labs Dropdown */}
              <div className="mx-3 my-3 bg-gradient-to-br from-violet-600/[0.07] to-cyan-500/[0.07] backdrop-blur-3xl border border-violet-500/20 hover:border-cyan-500/35 rounded-2xl p-1 transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.06)]">
                <button
                  onClick={() => setIsLabsMobileOpen(!isLabsMobileOpen)}
                  className="w-full flex items-center justify-between py-3 px-4 text-white hover:text-cyan-300 transition-all font-bold text-sm cursor-pointer rounded-xl"
                >
                  <span className="flex items-center gap-2">
                    <FlaskConical size={15} className="text-cyan-400 animate-pulse" />
                    <span>Paperino Labs</span>
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-300 text-cyan-400 ${isLabsMobileOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isLabsMobileOpen && (
                  <div className="px-2 pb-2 space-y-1 animate-in fade-in duration-300">
                    <Link 
                      onClick={() => { setIsMobileMenuOpen(false); setIsLabsMobileOpen(false); }} 
                      href="/ats" 
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.06] text-gray-300 hover:text-white transition-all text-xs font-bold"
                    >
                      <BrainCircuit size={16} className="text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)] shrink-0" />
                      <span>ATS Analyzer</span>
                    </Link>
                    <Link 
                      onClick={() => { setIsMobileMenuOpen(false); setIsLabsMobileOpen(false); }} 
                      href="/exam-emergency" 
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.06] text-gray-300 hover:text-white transition-all text-xs font-bold"
                    >
                      <ShieldAlert size={16} className="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)] shrink-0" />
                      <span>Exam Emergency</span>
                    </Link>
                    <Link 
                      onClick={() => { setIsMobileMenuOpen(false); setIsLabsMobileOpen(false); }} 
                      href="/attendance-mafia" 
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.06] text-gray-300 hover:text-white transition-all text-xs font-bold"
                    >
                      <ShieldCheck size={16} className="text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)] shrink-0" />
                      <span>Attendance Shield</span>
                    </Link>
                    <Link 
                      onClick={() => { setIsMobileMenuOpen(false); setIsLabsMobileOpen(false); }} 
                      href="/survival-notes" 
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.06] text-gray-300 hover:text-white transition-all text-xs font-bold"
                    >
                      <GraduationCap size={16} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] shrink-0" />
                      <span>Senior Insights</span>
                    </Link>
                  </div>
                )}
              </div>

              <Link onClick={() => setIsMobileMenuOpen(false)} href="/developer" className={getMobileLinkClass("/developer", true)}>Developer</Link>

              {/* Admin */}
              {isAdmin && (
                <>
                  <div className="h-px bg-white/[0.06] my-3 mx-2" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600 px-3 pb-1.5">Admin</p>
                  <Link onClick={() => setIsMobileMenuOpen(false)} href="/admin" className={getMobileLinkClass("/admin", true)}>Admin Dashboard</Link>
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

      {/* Theme Selection Modal for Mobile Header */}
      {isThemeOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsThemeOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Palette className="text-violet-400" /> Theme Customization
                </h2>
                <p className="text-xs text-gray-400 mt-1">Select your preferred platform aesthetic.</p>
              </div>
              <button onClick={() => setIsThemeOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Themes Grid */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative overflow-hidden group p-4 rounded-2xl border text-left transition-all duration-300 ${theme === t.id ? 'border-white/40 bg-white/10' : 'border-white/5 bg-black/40 hover:border-white/20 hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${t.primary} ${theme === t.id ? t.shadow : ''}`}></div>
                      <div className={`w-4 h-4 rounded-full ${t.accent} -ml-3`}></div>
                    </div>
                    {theme === t.id && <Check size={16} className="text-white" />}
                  </div>
                  
                  <span className={`block text-sm font-medium ${theme === t.id ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                    {t.name}
                  </span>
                  
                  {/* Subtle hover background glow */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-transparent to-white`}></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
