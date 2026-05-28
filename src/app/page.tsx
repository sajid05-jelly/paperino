import Link from "next/link";
import { BookOpen, Layers, Zap, Sparkles, FileText, Calculator, FileSearch, Bookmark, GraduationCap, Heart, BrainCircuit, ArrowRight, Bot } from "lucide-react";
import AiChatCard from "@/components/AiChatCard";
import Testimonials from "@/components/Testimonials";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full overflow-x-hidden px-4 sm:px-6 py-12 md:py-24">
      <div className="w-full max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center w-full max-w-4xl mx-auto mb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium mb-6 animate-pulse">
          <Zap size={16} />
          <span>Prepare for exams at lightspeed</span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6">
          The Universe of <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Study Materials
          </span>
        </h1>
        <p className="text-base md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto px-4">
          Access semester-wise question papers, notes, and lab manuals in one seamless, space-themed platform.
        </p>
      </section>

      {/* Courses Section */}
      <section className="w-full max-w-3xl mx-auto mb-24">
        <div className="flex items-center justify-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Layers className="text-purple-400" />
            Explore Courses
          </h2>
        </div>

        <div className="flex justify-center w-full">
          <Link href="/btech" className="w-full md:w-2/3">
            <div className="glass-card p-6 md:p-8 h-full group cursor-pointer relative overflow-hidden transition-all hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="px-4 h-12 md:px-6 md:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold text-sm md:text-base tracking-widest group-hover:scale-110 transition-transform shadow-lg">
                  B.TECH
                </div>
                <BookOpen size={24} className="text-gray-500 group-hover:text-cyan-400 transition-colors md:w-7 md:h-7" />
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold text-white mb-3 relative z-10">Bachelor of Technology</h3>
              <p className="text-gray-400 relative z-10 text-base md:text-lg">Access all 8 semesters of carefully curated question papers, notes, and lab manuals.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Smart Tools Section */}
      <section className="w-full max-w-7xl mx-auto mb-32 mt-20 px-4 md:px-0">
        <div className="flex flex-col items-center justify-center text-center mb-12 w-full">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]">
            <Sparkles size={14} className="text-violet-400" />
            <span>AI Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            Premium AI-powered <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">student tools</span>
          </h2>
          <p className="text-gray-400 mt-5 max-w-2xl text-base md:text-lg mx-auto">
            Supercharge your academic workflow with our cutting-edge AI utilities. Analyze your resume or predict exam questions instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
          {/* PYQ Predictor Card */}
          <Link href="/pyq" className="w-full flex">
            <div className="glass-panel p-8 md:p-10 h-full w-full group cursor-pointer relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-fuchsia-500/40 hover:shadow-[0_20px_50px_rgba(var(--secondary-rgb),0.15)] rounded-[2.5rem] bg-[#07050d] border border-white/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-fuchsia-500/20 to-rose-400/20 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="flex flex-col h-full relative z-10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 mb-8 group-hover:scale-110 group-hover:bg-fuchsia-500/20 transition-all duration-500 shadow-[0_0_15px_rgba(var(--secondary-rgb),0.1)]">
                  <BrainCircuit size={28} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">PYQ Predictor</h3>
                <p className="text-gray-400 flex-grow leading-relaxed font-light text-sm md:text-base">Upload multiple Previous Year Question papers and let our AI cross-reference them to predict the most important concepts for your next exam.</p>
                <div className="mt-8 flex items-center gap-2 text-fuchsia-400 font-medium text-sm group-hover:text-fuchsia-300 transition-colors uppercase tracking-wider">
                  Try Predictor <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>

          {/* ATS Analyzer Card */}
          <Link href="/ats" className="w-full flex">
            <div className="glass-panel p-8 md:p-10 h-full w-full group cursor-pointer relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-cyan-500/40 hover:shadow-[0_20px_50px_rgba(var(--accent-rgb),0.15)] rounded-[2.5rem] bg-[#07050d] border border-white/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-400/20 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="flex flex-col h-full relative z-10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-8 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-500 shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]">
                  <FileSearch size={28} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">ATS Analyzer</h3>
                <p className="text-gray-400 flex-grow leading-relaxed font-light text-sm md:text-base">Ensure your resume beats the bots. Get a granular AI breakdown of your formatting, missing skills, and perfect keyword optimization.</p>
                <div className="mt-8 flex items-center gap-2 text-cyan-400 font-medium text-sm group-hover:text-cyan-300 transition-colors uppercase tracking-wider">
                  Analyze Resume <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </Link>

          {/* AI Chat Card */}
          <div className="w-full flex">
            <AiChatCard />
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
              <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-violet-400" />
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
                { icon: <BookOpen className="w-5 h-5 text-violet-400" />, title: "Semester-wise Materials" },
                { icon: <FileText className="w-5 h-5 text-fuchsia-400" />, title: "Previous Year Papers" },
                { icon: <Calculator className="w-5 h-5 text-purple-400" />, title: "GPA & CGPA Calculator" },
                { icon: <FileSearch className="w-5 h-5 text-blue-400" />, title: "ATS Resume Analyzer" },
                { icon: <Bookmark className="w-5 h-5 text-cyan-400" />, title: "Smart Bookmarks" },
                { icon: <GraduationCap className="w-5 h-5 text-violet-400" />, title: "Important Study Resources" },
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
                <Heart className="w-4 h-4 text-violet-500 animate-pulse flex-shrink-0" />
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
