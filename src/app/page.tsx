"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePlanGate } from "@/context/PlanGateContext";
import { BookOpen, Zap, Sparkles, FileText, Calculator, FileSearch, Download, GraduationCap, Heart, BrainCircuit, ArrowRight, Bot, Building2, ChevronRight, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { useSubjects } from "@/context/SubjectsContext";
import { sortDepartments } from "@/lib/courseSorting";
import DoomsdayEmblem from "@/components/DoomsdayEmblem";

const Testimonials = dynamic(() => import("@/components/Testimonials"), { ssr: false });
const AmbientOrbs = dynamic(() => import("@/components/AmbientOrbs"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { plan } = useAuth();
  const { showPlanGate } = usePlanGate();
  const { departments, deptMaterialCounts, listenToDeptsWithMaterials, loading } = useSubjects();
  
  useEffect(() => {
    const unsub = listenToDeptsWithMaterials();
    return () => unsub();
  }, [listenToDeptsWithMaterials]);

  const approvedDepts = departments.filter(d => d.status === "approved" && !d.parentCourse);

  return (
    <div className="flex flex-col items-center w-full overflow-x-hidden px-4 sm:px-6 py-12 md:py-24 relative">
      <AmbientOrbs />
      <div className="w-full max-w-7xl mx-auto relative z-10">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center w-full max-w-4xl mx-auto mb-20">
        {/* Default Theme Hero (Visible in Default theme, hidden in Doomsday) */}
        <div className="default-hero-content w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium mb-8 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-shadow animate-float">
            <Zap size={16} className="text-purple-400" aria-hidden="true" />
            <span className="tracking-wide">Prepare for exams at lightspeed</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-bold tracking-tight text-white mb-6 w-full text-center leading-tight">
            The Universe of <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-violet-400 text-glow animate-pulse">
              Study Materials
            </span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-400/90 mb-12 max-w-2xl mx-auto px-4 font-light leading-relaxed">
            Access semester-wise question papers, notes, and lab manuals in one seamless, space-themed platform.
          </p>
        </div>

        {/* Doomsday Edition Hero (Hidden in Default theme, visible in Doomsday) */}
        <div className="doomsday-hero-content flex-col items-center text-center w-full max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full doomsday-hero-badge text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldCheck size={14} className="text-[#10e87a]" />
            <span>Special Edition Protocol</span>
          </div>

          <DoomsdayEmblem />

          <h1 className="doomsday-hero-title text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] font-extrabold tracking-tight mb-4 leading-none uppercase">
            PAPERINO <span className="doomsday-hero-gradient block mt-2 text-3xl sm:text-5xl md:text-6xl">DOOMSDAY EDITION</span>
          </h1>
          <p className="text-base sm:text-xl md:text-2xl text-[#8aa095] mb-12 max-w-2xl mx-auto px-4 font-normal leading-relaxed">
            Assemble Your Knowledge. Unleash Your Power.
          </p>
        </div>

        {/* Dynamic total semesters calculation across all approved departments */}
        {(() => {
          const totalSems = approvedDepts.reduce((sum, d) => sum + (d.totalSemesters || 8), 0);
          const semsDisplay = totalSems > 0 ? `${totalSems}+` : "15+";

          return (
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 w-full max-w-3xl mx-auto">
              {[
                { label: "Semesters", value: semsDisplay, color: "text-purple-400" },
                { label: "Study Materials", value: "500+", color: "text-fuchsia-400" },
                { label: "AI Tools", value: "7+", color: "text-cyan-400" }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-5 md:p-6 rounded-[1.5rem] liquid-glass hover:-translate-y-1 transition-transform duration-300 flex-1 min-w-[120px]">
                  <span className={`text-4xl font-black ${stat.color} drop-shadow-[0_0_15px_rgba(currentcolor,0.4)] mb-1`}>{stat.value}</span>
                  <span className="text-xs text-gray-300 uppercase tracking-[0.2em] font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      {/* Colleges & Courses Section */}
      <section className="w-full max-w-6xl mx-auto mb-24">
        <div className="flex flex-col items-center justify-center text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3">
            <Building2 size={14} className="text-purple-400" />
            <span>Colleges Directory</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-3">
            Explore Colleges
          </h2>
          <p className="text-gray-400 text-sm md:text-base mt-2 max-w-lg">
            Select your university to access department courses, study materials, and past exam papers.
          </p>
        </div>

        {/* SRM University College Card */}
        <div className="w-full max-w-3xl mx-auto mb-10">
          <Link href="/courses" className="block">
            <div className="vision-glass p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] cursor-pointer relative overflow-hidden transition-all duration-500 border border-purple-500/30 bg-[#0f0a1a]/60 hover:border-purple-500/60 hover:bg-[#120924]/80 shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:shadow-[0_0_50px_rgba(139,92,246,0.3)] group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full blur-[80px] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                  <div className="flex items-center gap-4 sm:block">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.2)] group-hover:scale-105 transition-transform">
                      <Building2 size={24} className="sm:hidden" />
                      <Building2 size={32} className="hidden sm:block" />
                    </div>
                    <div className="sm:hidden">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          SRM IST
                        </span>
                        <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          ● Active
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white tracking-tight group-hover:text-purple-300 transition-colors">
                        SRM University
                      </h3>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="hidden sm:flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                        SRM IST
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ● Active Campus
                      </span>
                    </div>
                    <h3 className="hidden sm:block text-2xl md:text-3xl font-extrabold text-white tracking-tight group-hover:text-purple-300 transition-colors">
                      SRM University
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-xl font-light leading-relaxed">
                      Access notes, question papers &amp; study materials across all SRM University campuses throughout India.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0 border-t border-white/5 sm:border-t-0 shrink-0 w-full sm:w-auto">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider group-hover:text-white transition-colors">
                    Access Materials
                  </span>
                  <ChevronRight size={18} className="text-purple-400 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Smart Tools Section */}
      <section className="w-full max-w-5xl mx-auto mb-32 mt-20 px-4 md:px-0">
        <div className="flex flex-col items-center justify-center text-center mb-12 w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]">
            <BrainCircuit size={14} className="text-violet-400" aria-hidden="true" />
            <span>Smart Tools</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            Premium AI-powered <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">student tools</span>
          </h2>
          <p className="text-gray-400 mt-5 max-w-2xl text-base md:text-lg mx-auto">
            Supercharge your academic workflow with our cutting-edge AI utilities. Analyze your resume or predict exam questions instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full perspective-[1000px]">
          {/* PYQ Predictor Card */}
          <Link href="/pyq" className="w-full flex">
            <div className="relative w-full h-full rounded-[2.5rem] bg-[#110F1C]/95 md:bg-[#110F1C]/90 md:backdrop-blur-xl border border-[rgba(124,58,237,0.2)] md:border-[rgba(124,58,237,0.35)] shadow-md md:shadow-[0_0_30px_rgba(124,58,237,0.25)] p-8 md:p-10 flex flex-col group cursor-pointer overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:border-[rgba(124,58,237,0.5)] hardware-accelerated">
              <div className="flex flex-col h-full relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-8 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-500 shadow-sm md:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] hardware-accelerated">
                  <BrainCircuit size={26} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-violet-300 transition-colors">PYQ Predictor</h3>
                <p className="text-gray-400 flex-grow leading-relaxed font-light text-xs md:text-sm">Upload multiple Previous Year Question papers and let our AI cross-reference them to predict the most important concepts for your next exam.</p>
                <div className="mt-8 flex items-center gap-2 text-violet-400 font-medium text-xs group-hover:text-violet-300 transition-colors uppercase tracking-wider">
                  Try Predictor <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300 hardware-accelerated" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Link>

          {/* ATS Analyzer Card */}
          <Link href="/ats" className="w-full flex">
            <div className="relative w-full h-full rounded-[2.5rem] bg-[#110F1C]/95 md:bg-[#110F1C]/90 md:backdrop-blur-xl border border-[rgba(124,58,237,0.2)] md:border-[rgba(124,58,237,0.35)] shadow-md md:shadow-[0_0_30px_rgba(124,58,237,0.25)] p-8 md:p-10 flex flex-col group cursor-pointer overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:border-[rgba(124,58,237,0.5)] hardware-accelerated">
              <div className="flex flex-col h-full relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-8 group-hover:scale-110 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all duration-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                  <FileSearch size={26} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-violet-300 transition-colors">ATS Analyzer</h3>
                <p className="text-gray-400 flex-grow leading-relaxed font-light text-xs md:text-sm">Ensure your resume beats the bots. Get a granular AI breakdown of your formatting, missing skills, and perfect keyword optimization.</p>
                <div className="mt-8 flex items-center gap-2 text-violet-400 font-medium text-xs group-hover:text-violet-300 transition-colors uppercase tracking-wider">
                  Analyze Resume <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Link>

          {/* Career DNA Card */}
          <Link href="/career-dna" className="w-full flex">
            <div className="relative w-full h-full rounded-[2.5rem] bg-[#110F1C]/95 md:bg-[#110F1C]/90 md:backdrop-blur-xl border border-[rgba(124,58,237,0.2)] md:border-[rgba(124,58,237,0.35)] shadow-md md:shadow-[0_0_30px_rgba(124,58,237,0.25)] p-8 md:p-10 flex flex-col group cursor-pointer overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:border-[rgba(124,58,237,0.5)] hardware-accelerated">
              <div className="flex flex-col h-full relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-8 group-hover:scale-110 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all duration-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                  <Bot size={26} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-violet-300 transition-colors">Career DNA</h3>
                <p className="text-gray-400 flex-grow leading-relaxed font-light text-xs md:text-sm">Build your professional identity. Map your academic parameters to placement analytics and unlock custom career pathways.</p>
                <div className="mt-8 flex items-center gap-2 text-violet-400 font-medium text-xs group-hover:text-violet-300 transition-colors uppercase tracking-wider">
                  Build Career DNA <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Link>

          {/* Attendance Shield Card */}
          <Link href="/attendance-mafia" className="w-full flex">
            <div className="relative w-full h-full rounded-[2.5rem] bg-[#110F1C]/95 md:bg-[#110F1C]/90 md:backdrop-blur-xl border border-[rgba(124,58,237,0.2)] md:border-[rgba(124,58,237,0.35)] shadow-md md:shadow-[0_0_30px_rgba(124,58,237,0.25)] p-8 md:p-10 flex flex-col group cursor-pointer overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:border-[rgba(124,58,237,0.5)] hardware-accelerated">
              <div className="flex flex-col h-full relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-8 group-hover:scale-110 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all duration-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                  <Calculator size={26} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-violet-300 transition-colors">Attendance Shield</h3>
                <p className="text-gray-400 flex-grow leading-relaxed font-light text-xs md:text-sm">Manage class targets seamlessly. Calculate how many classes you can skip or need to attend to stay safely above the 75% line.</p>
                <div className="mt-8 flex items-center gap-2 text-violet-400 font-medium text-xs group-hover:text-violet-300 transition-colors uppercase tracking-wider">
                  Configure Shield <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Link>

          {/* Exam Emergency Card */}
          <div 
            onClick={() => {
              if (plan === "free" || plan === "plus") {
                showPlanGate("Exam Emergency Mode", "pro", "Upgrade to Pro to unlock Exam Emergency Mode.");
              } else {
                router.push("/exam-emergency");
              }
            }} 
            className="w-full flex"
          >
            <div className="relative w-full h-full rounded-[2.5rem] bg-[#110F1C]/95 md:bg-[#110F1C]/90 md:backdrop-blur-xl border border-[rgba(124,58,237,0.2)] md:border-[rgba(124,58,237,0.35)] shadow-md md:shadow-[0_0_30px_rgba(124,58,237,0.25)] p-8 md:p-10 flex flex-col group cursor-pointer overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:border-[rgba(124,58,237,0.5)] hardware-accelerated">
              <div className="flex flex-col h-full relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-8 group-hover:scale-110 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all duration-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                  <GraduationCap size={26} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-violet-300 transition-colors">Exam Emergency</h3>
                <p className="text-gray-400 flex-grow leading-relaxed font-light text-xs md:text-sm">Panic mode activated? Get instant access to essential study packets, crash course notes, and last-minute preparation materials.</p>
                <div className="mt-8 flex items-center gap-2 text-violet-400 font-medium text-xs group-hover:text-violet-300 transition-colors uppercase tracking-wider">
                  Open Emergency <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-300" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* What is Paperino Section */}
      <section id="about" className="w-full max-w-5xl mx-auto mb-24 relative animate-in fade-in slide-in-from-bottom-10 duration-1000 mt-16 md:mt-32 px-2">
        {/* Ambient Background Glow */}
        <div className="absolute -inset-[2px] bg-gradient-to-r from-violet-600/20 via-fuchsia-500/20 to-purple-600/20 rounded-[2rem] md:rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition-all duration-1000 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.1)_0%,transparent_60%)] rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Main Glass Panel */}
        <div className="relative group p-[1px] rounded-[2rem] md:rounded-[3rem] bg-gradient-to-b from-white/[0.1] via-white/[0.02] to-transparent overflow-hidden shadow-[0_0_40px_rgba(var(--primary-rgb),0.05)] transition-all duration-1000 hover:shadow-[0_0_80px_rgba(var(--primary-rgb),0.15)] hover:border-violet-500/20">
          <div className="absolute inset-0 bg-[#07050d]/80 backdrop-blur-[50px] transition-all duration-1000 group-hover:bg-[#07050d]/60"></div>
          
          <div className="relative p-6 md:p-10 lg:p-16 flex flex-col items-center text-center z-10">
            {/* Tag */}
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1 md:px-5 md:py-1.5 rounded-full bg-violet-500/[0.05] border border-violet-500/[0.15] backdrop-blur-3xl mb-6 md:mb-8 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]">
              <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5 text-violet-400" aria-hidden="true" />
              <span className="text-[10px] md:text-xs font-light text-violet-100 uppercase tracking-[0.2em] pt-0.5">
                About The Platform
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 md:mb-8">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-violet-500">
                What is Paperino?
              </span>
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-violet-200/70 font-light max-w-3xl leading-relaxed mb-16">
              <strong className="text-white font-medium">Paperino</strong> is a smart academic platform created specially for SRM students to access semester-wise study materials, previous year question papers, notes, GPA/CGPA calculators, ATS tools, and important academic resources in one seamless place.
            </p>

            {/* Features Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16">
              {[
                { icon: <BookOpen className="w-5 h-5 text-violet-400" aria-hidden="true" />, title: "Semester-wise Materials" },
                { icon: <FileText className="w-5 h-5 text-fuchsia-400" aria-hidden="true" />, title: "Previous Year Papers" },
                { icon: <Calculator className="w-5 h-5 text-purple-400" aria-hidden="true" />, title: "GPA & CGPA Calculator" },
                { icon: <FileSearch className="w-5 h-5 text-violet-400" aria-hidden="true" />, title: "ATS Resume Analyzer" },
                { icon: <Download className="w-5 h-5 text-cyan-400" aria-hidden="true" />, title: "Instant Downloads" },
                { icon: <GraduationCap className="w-5 h-5 text-violet-400" aria-hidden="true" />, title: "Important Study Resources" },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors duration-300">
                  <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/10 shadow-[inset_0_0_15px_rgba(var(--primary-rgb),0.1)] flex-shrink-0">
                    {feature.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-200 text-left">{feature.title}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="w-full max-w-md h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent mb-12"></div>

            {/* Motivational Footer */}
            <div className="flex flex-col items-center max-w-2xl text-center space-y-8">
              <p className="text-base md:text-lg text-violet-300/80 font-serif italic tracking-wide">
                "This platform is built to support SRM students in learning, growing, and achieving their academic goals with ease."
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-400 bg-white/[0.02] py-3 px-6 rounded-full border border-white/[0.05]">
                <Heart className="w-4 h-4 text-violet-500 animate-pulse flex-shrink-0" aria-hidden="true" />
                <p>
                  Thank you for visiting Paperino. Wishing you success in your academic journey. All the best for your future!
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Student Testimonials Section */}
      <Testimonials />
      </div>
    </div>
  );
}
