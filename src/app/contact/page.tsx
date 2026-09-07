"use client";

import { Mail, AlertCircle, BookOpen, Shield, Clock, Heart } from "lucide-react";

export default function ContactPage() {
  const sections = [
    {
      id: "email-support",
      title: "Email Support",
      icon: <Mail className="text-violet-400" size={24} />,
      content: (
        <div className="mt-4 text-violet-200/70 leading-relaxed">
          <p className="mb-4">
            For general inquiries, feedback, or support requests, email us at paperino.study@gmail.com.
          </p>
          <a 
            href="https://mail.google.com/mail/?view=cm&fs=1&to=paperino.study@gmail.com&su=Paperino Support"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition-colors w-full sm:w-auto justify-center"
          >
            <Mail size={16} className="pointer-events-none" /> <span className="pointer-events-none">paperino.study@gmail.com</span>
          </a>
        </div>
      )
    },
    {
      id: "report-an-issue",
      title: "Report an Issue",
      icon: <AlertCircle className="text-fuchsia-400" size={24} />,
      content: (
        <p className="mt-4 text-fuchsia-200/70 leading-relaxed">
          Found a bug or broken link? Let us know by sending an email via the feedback button available on every page, or{" "}
          <a 
            href="https://mail.google.com/mail/?view=cm&fs=1&to=paperino.study@gmail.com&su=Paperino Bug Report"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-2 transition-colors"
          >
            email us directly
          </a>
          .
        </p>
      )
    },
    {
      id: "content-requests",
      title: "Content Requests",
      icon: <BookOpen className="text-cyan-400" size={24} />,
      content: (
        <p className="mt-4 text-cyan-200/70 leading-relaxed">
          Need study materials for a specific subject? Use the &apos;Suggest a Subject&apos; feature available on course pages, or{" "}
          <a 
            href="https://mail.google.com/mail/?view=cm&fs=1&to=paperino.study@gmail.com&su=Paperino Subject Request"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
          >
            email us
          </a>{" "}
          with your department, semester, and subject details.
        </p>
      )
    },
    {
      id: "data-privacy",
      title: "Data & Privacy",
      icon: <Shield className="text-emerald-400" size={24} />,
      content: (
        <p className="mt-4 text-emerald-200/70 leading-relaxed">
          For data deletion requests or privacy-related concerns, contact us at{" "}
          <a 
            href="https://mail.google.com/mail/?view=cm&fs=1&to=paperino.study@gmail.com&su=Paperino Privacy Request"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
          >
            paperino.study@gmail.com
          </a>
          . We take your privacy seriously and respond promptly.
        </p>
      )
    },
    {
      id: "response-time",
      title: "Response Time",
      icon: <Clock className="text-rose-400" size={24} />,
      content: (
        <p className="mt-4 text-rose-200/70 leading-relaxed">
          We typically respond to emails within 24-48 hours. For urgent academic resource requests, please mention <strong className="text-rose-300 font-semibold">&apos;Urgent&apos;</strong> in your email subject.
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
            <Mail className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-light text-violet-100 uppercase tracking-[0.2em] pt-0.5">
              Get in Touch
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-violet-500">
              Contact Us
            </span>
          </h1>

          <p className="text-xl text-violet-200/60 font-light max-w-2xl mx-auto">
            Have questions, feedback, or need support? We are here to help.
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
