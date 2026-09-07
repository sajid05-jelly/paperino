"use client";

import { FileText, Shield, Upload, Lock, User, AlertCircle, RefreshCw, Mail, Heart } from "lucide-react";

export default function TermsOfServicePage() {
  const sections = [
    {
      id: "acceptance-of-terms",
      title: "1. Acceptance of Terms",
      icon: <FileText className="text-violet-400" size={24} />,
      content: (
        <p className="mt-4 text-violet-200/70 leading-relaxed">
          By accessing or using Paperino, you agree to be bound by these terms. If you do not agree, please do not use the platform.
        </p>
      )
    },
    {
      id: "use-of-service",
      title: "2. Use of Service",
      icon: <Shield className="text-fuchsia-400" size={24} />,
      content: (
        <p className="mt-4 text-fuchsia-200/70 leading-relaxed">
          Paperino is a free academic resource platform. You may use it to access study materials, academic tools, and educational resources for personal, non-commercial academic purposes.
        </p>
      )
    },
    {
      id: "user-contributions",
      title: "3. User Contributions",
      icon: <Upload className="text-cyan-400" size={24} />,
      content: (
        <p className="mt-4 text-cyan-200/70 leading-relaxed">
          Users may upload study materials and suggest subjects. By uploading content, you confirm that you have the right to share it and that it does not violate any copyright. Paperino reserves the right to review and remove uploaded content.
        </p>
      )
    },
    {
      id: "intellectual-property",
      title: "4. Intellectual Property",
      icon: <Lock className="text-emerald-400" size={24} />,
      content: (
        <p className="mt-4 text-emerald-200/70 leading-relaxed">
          The Paperino platform design, branding, and original tools are the intellectual property of the Paperino team. Uploaded study materials remain the property of their respective authors.
        </p>
      )
    },
    {
      id: "account-responsibilities",
      title: "5. Account Responsibilities",
      icon: <User className="text-orange-400" size={24} />,
      content: (
        <p className="mt-4 text-orange-200/70 leading-relaxed">
          You are responsible for maintaining the security of your account. Do not share your login credentials or use another user's account.
        </p>
      )
    },
    {
      id: "limitation-of-liability",
      title: "6. Limitation of Liability",
      icon: <AlertCircle className="text-amber-400" size={24} />,
      content: (
        <p className="mt-4 text-amber-200/70 leading-relaxed">
          Paperino is provided as-is. While we strive to ensure accuracy, we do not guarantee that all study materials are error-free. Use materials as supplementary study aids.
        </p>
      )
    },
    {
      id: "modifications",
      title: "7. Modifications",
      icon: <RefreshCw className="text-blue-400" size={24} />,
      content: (
        <p className="mt-4 text-blue-200/70 leading-relaxed">
          We may update these terms from time to time. Continued use of Paperino after changes constitutes acceptance of the updated terms.
        </p>
      )
    },
    {
      id: "contact",
      title: "8. Contact",
      icon: <Mail className="text-rose-400" size={24} />,
      content: (
        <div className="mt-4 text-rose-200/70 leading-relaxed">
          <p className="mb-4">For questions about these terms, contact us at paperino.study@gmail.com.</p>
          <a 
            href="https://mail.google.com/mail/?view=cm&fs=1&to=paperino.study@gmail.com&su=Paperino Terms of Service Inquiry"
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
            <FileText className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-light text-violet-100 uppercase tracking-[0.2em] pt-0.5">
              Legal
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-violet-500">
              Terms of Service
            </span>
          </h1>

          <p className="text-xl text-violet-200/60 font-light max-w-2xl mx-auto">
            Please read these terms carefully before using Paperino.
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
