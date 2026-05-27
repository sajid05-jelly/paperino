"use client";

import { Shield, Database, Lock, Eye, CheckCircle2, Cloud, Sparkles, Mail, FileText, Heart } from "lucide-react";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      id: "information-we-collect",
      title: "1. Information We Collect",
      icon: <Database className="text-violet-400" size={24} />,
      content: (
        <ul className="space-y-3 mt-4 text-violet-200/70">
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-violet-500" /> Name</li>
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-violet-500" /> Email address</li>
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-violet-500" /> Uploaded study materials</li>
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-violet-500" /> Resume files for ATS analysis</li>
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-violet-500" /> Bookmarked resources</li>
        </ul>
      )
    },
    {
      id: "how-we-use-information",
      title: "2. How We Use Information",
      icon: <Sparkles className="text-fuchsia-400" size={24} />,
      content: (
        <ul className="space-y-3 mt-4 text-fuchsia-200/70">
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-fuchsia-500" /> Improve student experience</li>
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-fuchsia-500" /> Provide ATS analysis</li>
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-fuchsia-500" /> Save bookmarks</li>
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-fuchsia-500" /> Manage admin access</li>
          <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-fuchsia-500" /> Enhance website features</li>
        </ul>
      )
    },
    {
      id: "resume-file-privacy",
      title: "3. Resume & File Privacy",
      icon: <FileText className="text-cyan-400" size={24} />,
      content: (
        <p className="mt-4 text-cyan-200/70 leading-relaxed">
          Uploaded resumes and files are used exclusively for advanced AI analysis (like our ATS tool and PYQ predictor) and are <strong>never shared publicly</strong> or stored long-term.
        </p>
      )
    },
    {
      id: "google-authentication",
      title: "4. Google Authentication",
      icon: <Lock className="text-emerald-400" size={24} />,
      content: (
        <p className="mt-4 text-emerald-200/70 leading-relaxed">
          Paperino uses Google Sign-In for modern, seamless, and mathematically secure authentication. We do not store your passwords.
        </p>
      )
    },
    {
      id: "student-platform-notice",
      title: "5. Student Platform Notice",
      icon: <Shield className="text-blue-400" size={24} />,
      content: (
        <p className="mt-4 text-blue-200/70 leading-relaxed">
          Paperino is built specifically for SRM students to simplify academic preparation, GPA tracking, and resource access.
        </p>
      )
    },
    {
      id: "data-security",
      title: "6. Data Security",
      icon: <Eye className="text-orange-400" size={24} />,
      content: (
        <p className="mt-4 text-orange-200/70 leading-relaxed">
          We implement highly secure authentication flows and rigid database practices to protect your information against unauthorized access.
        </p>
      )
    },
    {
      id: "third-party-services",
      title: "7. Third-Party Services",
      icon: <Cloud className="text-purple-400" size={24} />,
      content: (
        <div className="mt-4">
          <p className="text-purple-200/70 mb-3">Paperino may securely interface with:</p>
          <ul className="space-y-3 text-purple-200/70">
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-purple-500" /> Firebase</li>
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-purple-500" /> Google Gemini API</li>
            <li className="flex items-center gap-3"><CheckCircle2 size={16} className="text-purple-500" /> Google Authentication</li>
          </ul>
        </div>
      )
    },
    {
      id: "contact",
      title: "8. Contact",
      icon: <Mail className="text-rose-400" size={24} />,
      content: (
        <div className="mt-4 text-rose-200/70 leading-relaxed">
          <p className="mb-2">For support, data deletion requests, or other issues, please contact us:</p>
          <a 
            href="https://mail.google.com/mail/?view=cm&fs=1&to=paperino.study@gmail.com&su=Paperino Support"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition-colors w-full sm:w-auto justify-center"
          >
            <Mail size={16} className="pointer-events-none" /> <span className="pointer-events-none">paperino.study@gmail.com</span>
          </a>
        </div>
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
              Legal & Transparency
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-violet-500">
              Privacy Policy
            </span>
          </h1>

          <p className="text-xl text-violet-200/60 font-light max-w-2xl mx-auto">
            Your privacy and data security matter to us. We are committed to protecting your personal information.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {sections.map((section, index) => (
            <div 
              key={section.id} 
              className={`relative group p-[1px] rounded-3xl bg-gradient-to-b from-white/[0.1] to-transparent overflow-hidden transition-all duration-700 hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.15)] ${index === 7 ? 'md:col-span-2' : ''}`}
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
