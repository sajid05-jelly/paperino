"use client";

import { AlertTriangle, FileSearch, GraduationCap, ExternalLink, Sparkles, ShieldOff, Shield, Heart } from "lucide-react";

export default function DisclaimerPage() {
  const sections = [
    {
      id: "general-disclaimer",
      title: "1. General Disclaimer",
      icon: <AlertTriangle className="text-violet-400" size={24} />,
      content: (
        <p className="mt-4 text-violet-200/70 leading-relaxed">
          Paperino is an independent student-built academic platform. It is not officially affiliated with, endorsed by, or operated by SRM Institute of Science and Technology. All university names and trademarks belong to their respective owners.
        </p>
      )
    },
    {
      id: "content-accuracy",
      title: "2. Content Accuracy",
      icon: <FileSearch className="text-fuchsia-400" size={24} />,
      content: (
        <p className="mt-4 text-fuchsia-200/70 leading-relaxed">
          Study materials, notes, and question papers are contributed by students and community members. While we review submissions, Paperino does not guarantee the accuracy, completeness, or currency of any material. Always verify with official university sources.
        </p>
      )
    },
    {
      id: "academic-use-only",
      title: "3. Academic Use Only",
      icon: <GraduationCap className="text-cyan-400" size={24} />,
      content: (
        <p className="mt-4 text-cyan-200/70 leading-relaxed">
          All content on Paperino is intended solely for personal academic preparation. Do not use materials for any commercial purpose or academic dishonesty.
        </p>
      )
    },
    {
      id: "third-party-links",
      title: "4. Third-Party Links",
      icon: <ExternalLink className="text-emerald-400" size={24} />,
      content: (
        <p className="mt-4 text-emerald-200/70 leading-relaxed">
          Paperino may contain links to external websites or services. We are not responsible for the content, privacy practices, or availability of those external resources.
        </p>
      )
    },
    {
      id: "ai-powered-tools",
      title: "5. AI-Powered Tools",
      icon: <Sparkles className="text-orange-400" size={24} />,
      content: (
        <p className="mt-4 text-orange-200/70 leading-relaxed">
          Certain features such as the ATS analyzer and career tools use artificial intelligence. AI-generated outputs are provided as guidance only and should not be considered professional advice.
        </p>
      )
    },
    {
      id: "no-warranty",
      title: "6. No Warranty",
      icon: <ShieldOff className="text-rose-400" size={24} />,
      content: (
        <p className="mt-4 text-rose-200/70 leading-relaxed">
          Paperino is provided on an as-is basis without warranties of any kind, express or implied. We do not warrant uninterrupted service or that the platform will be free of errors. Use Paperino at your own discretion.
        </p>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#05030a] relative overflow-hidden py-24 px-6 sm:px-12 selection:bg-violet-500/30">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[20%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.15)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[120px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.1)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[140px] animate-[pulse_10s_ease-in-out_infinite_reverse] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-[1500ms]">
        
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center gap-2 px-5 py-1.5 rounded-full bg-violet-500/[0.05] border border-violet-500/[0.15] backdrop-blur-3xl mb-8 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]">
            <Shield className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-light text-violet-100 uppercase tracking-[0.2em] pt-0.5">
              Legal Notice
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-violet-500">
              Disclaimer
            </span>
          </h1>

          <p className="text-xl text-violet-200/60 font-light max-w-2xl mx-auto">
            Important information about the use of Paperino and its content.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {sections.map((section, index) => (
            <div 
              key={section.id} 
              className={`relative group p-[1px] rounded-3xl bg-gradient-to-b from-white/[0.1] to-transparent overflow-hidden transition-all duration-700 hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.15)] ${index === sections.length - 1 ? 'md:col-span-2' : ''}`}
            >
              {/* Card Background & Hover effect */}
              <div className="absolute inset-0 bg-[#07050d]/80 backdrop-blur-xl transition-all duration-700 group-hover:bg-[#07050d]/60"></div>
              <div className="absolute -inset-10 bg-violet-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              <div className="relative p-8 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                  <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 shadow-[inset_0_0_15px_rgba(var(--primary-rgb),0.05)]">
                    {section.icon}
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-wide">{section.title}</h2>
                </div>
                <div className="flex-1">
                  {section.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Premium Divider */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent mb-12"></div>

        {/* Footer Note */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-500/5 border border-violet-500/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
            <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="text-sm font-medium text-violet-200 tracking-wider">
              Built with passion for students and innovation.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
