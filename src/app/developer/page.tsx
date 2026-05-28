"use client";

import { Mail, Code2, Cpu, Globe, Library, BookOpen, Megaphone, Sparkles } from "lucide-react";
import Image from "next/image";

// Inline Brand SVGs
const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={`w-5 h-5 ${className}`}>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.394.1 2.646.64.699 1.026 1.591 1.026 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className={`w-5 h-5 ${className}`}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${className}`}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export default function DeveloperPage() {
  return (
    <div className="bg-[#05030a] relative overflow-hidden pt-14 md:pt-20 pb-8 px-6 sm:px-12 selection:bg-violet-500/30">
      
      {/* --- CINEMATIC VIOLET LIQUID BACKGROUND --- */}
      {/* Deep Violet Liquid Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[900px] h-[900px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.25)_0%,transparent_70%)] rounded-full mix-blend-color-dodge filter blur-[120px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.2)_0%,transparent_70%)] rounded-full mix-blend-color-dodge filter blur-[140px] animate-[pulse_10s_ease-in-out_infinite_reverse] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[50%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(196,181,253,0.15)_0%,transparent_70%)] rounded-full mix-blend-color-dodge filter blur-[100px] translate-x-[-50%] animate-[pulse_12s_ease-in-out_infinite] pointer-events-none"></div>

      {/* Floating Violet Glass Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-violet-400/40 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)] animate-[bounce_6s_infinite] mix-blend-screen"></div>
        <div className="absolute top-[65%] left-[85%] w-5 h-5 bg-fuchsia-400/30 backdrop-blur-md rounded-full shadow-[0_0_25px_rgba(var(--secondary-rgb),0.6)] animate-[bounce_7s_infinite_1s] mix-blend-screen"></div>
        <div className="absolute top-[85%] left-[25%] w-2 h-2 bg-purple-300/50 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(216,180,254,0.9)] animate-[bounce_5s_infinite_2s] mix-blend-screen"></div>
        <div className="absolute top-[35%] left-[75%] w-4 h-4 bg-violet-500/20 backdrop-blur-md rounded-full shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] animate-[bounce_8s_infinite_1.5s] mix-blend-screen"></div>
        <div className="absolute top-[50%] left-[10%] w-2.5 h-2.5 bg-indigo-400/40 backdrop-blur-md rounded-full shadow-[0_0_18px_rgba(129,140,248,0.7)] animate-[bounce_9s_infinite_0.5s] mix-blend-screen"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* --- MAIN DEVELOPER SECTION --- */}
        <div className="flex flex-col items-center justify-center mb-16 animate-in fade-in slide-in-from-bottom-10 duration-[1500ms]">
          
          {/* Reduced Lead Developer Badge */}
          <div className="inline-flex items-center justify-center gap-2 px-5 py-1.5 rounded-full bg-violet-500/[0.05] border border-violet-500/[0.15] backdrop-blur-3xl mb-6 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] transition-all duration-500 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.25)]">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-light text-violet-100 uppercase tracking-[0.3em] pt-0.5">
              The Lead Developer
            </span>
          </div>

          {/* Premium Liquid Glass Card with Hover Glow (No translation on hover) */}
          <div className="relative group w-full max-w-2xl transition-all duration-1000">
            {/* Ambient Background Glow (Intensifies on hover) */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-600/30 via-fuchsia-500/30 to-purple-600/30 rounded-[2.5rem] opacity-30 blur-xl transition-all duration-1000 group-hover:opacity-100 group-hover:from-violet-500/50 group-hover:via-fuchsia-400/50 group-hover:to-purple-500/50 group-hover:blur-2xl"></div>
            
            {/* Advanced Glassmorphism Panel */}
            <div className="relative p-[1px] rounded-[2.5rem] bg-gradient-to-b from-white/[0.1] via-white/[0.02] to-transparent overflow-hidden shadow-[0_0_40px_rgba(var(--primary-rgb),0.05)] transition-all duration-1000 group-hover:shadow-[0_0_80px_rgba(var(--primary-rgb),0.25)] group-hover:border-violet-500/20">
              <div className="absolute inset-0 bg-[#07050d]/80 backdrop-blur-[50px] transition-all duration-1000 group-hover:bg-[#07050d]/60"></div>
              
              <div className="relative p-6 md:p-10 flex flex-col items-center text-center">
                
                {/* Profile Image with Violet Liquid Border */}
                <div className="relative w-28 h-28 md:w-32 md:h-32 mb-5 group/avatar flex-shrink-0 mx-auto">
                  {/* Subtle Violet Liquid Ring */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-violet-500 via-fuchsia-400 to-purple-600 rounded-full blur-lg opacity-40 group-hover/avatar:opacity-80 transition-opacity duration-700"></div>
                  {/* Frosted Glass Ring */}
                  <div className="absolute -inset-1.5 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full backdrop-blur-sm z-10 border border-violet-500/20"></div>
                  
                  {/* Actual Image Area */}
                  <div className="absolute inset-0 bg-[#050308] rounded-full z-20 flex items-center justify-center overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] border border-violet-500/30 transition-all duration-500 group-hover:border-violet-400/50 group-hover:shadow-[inset_0_0_35px_rgba(var(--primary-rgb),0.5)]">
                    <img 
                      src="/developer-profile.png" 
                      alt="Developer Profile"
                      onError={(e) => { e.currentTarget.src = "/developer-profile.jpeg"; }}
                      className="w-full h-full object-cover object-center rounded-full transition-transform duration-700 group-hover/avatar:scale-105" 
                    />
                  </div>
                </div>

                {/* Elegant Typography */}
                <h1 className="text-2xl md:text-4xl font-light tracking-tight mb-2 leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-100 to-violet-300/60">
                    S. Mohamed Sajid
                  </span>
                </h1>
                
                <p className="text-xs md:text-sm font-light text-violet-300/60 tracking-[0.2em] uppercase mb-5">
                  B.Tech Computer Science
                </p>

                {/* Cinematic Slogan */}
                <p className="text-lg md:text-xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-gray-500 tracking-wide mb-8 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]">
                  "Conquer for all works"
                </p>

                {/* Ultra-thin Violet Divider */}
                <div className="w-full max-w-[200px] h-[1px] bg-gradient-to-r from-transparent via-violet-500/20 to-transparent mb-8"></div>

                {/* Social Icons - Stable Hover Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-5">
                  {/* GitHub */}
                  <a href="https://github.com/sajid05-jelly" target="_blank" rel="noopener noreferrer" className="relative group/btn p-[1px] rounded-[1rem] bg-gradient-to-b from-violet-500/30 to-transparent hover:scale-110 transition-all duration-300 ease-out">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-[1rem]"></div>
                    <div className="absolute inset-0 bg-violet-600/0 group-hover/btn:bg-violet-600/30 blur-lg transition-colors duration-300 rounded-[1rem]"></div>
                    <div className="relative w-12 h-12 flex items-center justify-center text-violet-300/50 group-hover/btn:text-white transition-colors duration-300">
                      <GithubIcon className="group-hover/btn:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),1)] transition-all duration-300 w-5 h-5" />
                    </div>
                  </a>
                  
                  {/* LinkedIn */}
                  <a href="https://www.linkedin.com/in/s-mohamed-sajid-50397933b/" target="_blank" rel="noopener noreferrer" className="relative group/btn p-[1px] rounded-[1rem] bg-gradient-to-b from-violet-500/30 to-transparent hover:scale-110 transition-all duration-300 ease-out">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-[1rem]"></div>
                    <div className="absolute inset-0 bg-violet-600/0 group-hover/btn:bg-violet-600/30 blur-lg transition-colors duration-300 rounded-[1rem]"></div>
                    <div className="relative w-12 h-12 flex items-center justify-center text-violet-300/50 group-hover/btn:text-white transition-colors duration-300">
                      <LinkedinIcon className="group-hover/btn:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),1)] transition-all duration-300 w-5 h-5" />
                    </div>
                  </a>

                  {/* Instagram */}
                  <a href="https://www.instagram.com/vibe_x_sajii/" target="_blank" rel="noopener noreferrer" className="relative group/btn p-[1px] rounded-[1rem] bg-gradient-to-b from-violet-500/30 to-transparent hover:scale-110 transition-all duration-300 ease-out">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-[1rem]"></div>
                    <div className="absolute inset-0 bg-violet-600/0 group-hover/btn:bg-violet-600/30 blur-lg transition-colors duration-300 rounded-[1rem]"></div>
                    <div className="relative w-12 h-12 flex items-center justify-center text-violet-300/50 group-hover/btn:text-white transition-colors duration-300">
                      <InstagramIcon className="group-hover/btn:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),1)] transition-all duration-300 w-5 h-5" />
                    </div>
                  </a>

                  {/* Mail */}
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=mohamedsajid.sa@gmail.com&su=Contacting the Developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group/btn p-[1px] rounded-[1rem] bg-gradient-to-b from-violet-500/30 to-transparent hover:scale-110 transition-all duration-300 ease-out z-50 cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-[1rem] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-violet-600/0 group-hover/btn:bg-violet-600/30 blur-lg transition-colors duration-300 rounded-[1rem] pointer-events-none"></div>
                    <div className="relative w-12 h-12 flex items-center justify-center text-violet-300/50 group-hover/btn:text-white transition-colors duration-300 pointer-events-none">
                      <Mail className="group-hover/btn:drop-shadow-[0_0_15px_rgba(var(--primary-rgb),1)] transition-all duration-300 w-5 h-5 pointer-events-none" />
                    </div>
                  </a>
                </div>

              </div>
            </div>
          </div>
        </div>


        {/* --- COMMUNITY ADMINS SECTION --- */}
        <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500 mt-20 relative z-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-light text-transparent bg-clip-text bg-gradient-to-r from-white to-violet-300/50 mb-4 tracking-tight">
              Community Admins
            </h2>
            <p className="text-violet-200/50 text-sm max-w-2xl mx-auto font-light">
              The dedicated core team designing, managing, and scaling the Paperino ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            
            {/* Admin 1 */}
            <div className="relative group transform transition-all duration-700 hover:-translate-y-3">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-violet-500/30 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md"></div>
              <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent h-full">
                <div className="absolute inset-0 bg-[#07050d]/80 backdrop-blur-3xl rounded-[2rem]"></div>
                
                <div className="relative p-8 flex flex-col items-center text-center">
                  <div className="relative w-28 h-28 mb-6 group-hover:scale-105 transition-transform duration-700">
                    <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl group-hover:bg-violet-500/40 transition-colors"></div>
                    <div className="absolute inset-0 bg-[#050308] rounded-full z-10 border-[0.5px] border-violet-500/20 flex items-center justify-center overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                      <img 
                        src="/admin-photo.png" 
                        alt="Admin Profile"
                        className="w-full h-full object-cover object-center rounded-full" 
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-light text-white mb-2">Sudha Lakshmi</h3>
                  <p className="text-[10px] font-medium text-violet-300 uppercase tracking-widest mb-8 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-500/10 rounded-full border border-violet-500/20">
                    <Library size={12} /> Resource Manager
                  </p>
                  
                  <div className="flex items-center gap-4 mt-auto">
                    <a href="https://github.com/sudhalakshmi7205" target="_blank" rel="noopener noreferrer" className="text-violet-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"><GithubIcon className="w-4 h-4" /></a>
                    <a href="https://www.linkedin.com/in/sudha-lakshmi-826009333/" target="_blank" rel="noopener noreferrer" className="text-violet-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"><LinkedinIcon className="w-4 h-4" /></a>
                    <a href="https://www.instagram.com/quite_pretty_7?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="text-violet-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"><InstagramIcon className="w-4 h-4" /></a>
                    <a href="https://mail.google.com/mail/?view=cm&fs=1&to=sudharajsekar2005@gmail.com&su=Contacting Sudha Lakshmi" target="_blank" rel="noopener noreferrer" className="text-violet-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"><Mail className="w-4 h-4 pointer-events-none" /></a>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin 2 */}
            <div className="relative group transform transition-all duration-700 hover:-translate-y-3 delay-100">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-fuchsia-500/30 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md"></div>
              <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent h-full">
                <div className="absolute inset-0 bg-[#07050d]/80 backdrop-blur-3xl rounded-[2rem]"></div>
                
                <div className="relative p-8 flex flex-col items-center text-center">
                  <div className="relative w-28 h-28 mb-6 group-hover:scale-105 transition-transform duration-700">
                    <div className="absolute inset-0 bg-fuchsia-500/20 rounded-full blur-xl group-hover:bg-fuchsia-500/40 transition-colors"></div>
                    <div className="absolute inset-0 bg-[#050308] rounded-full z-10 border-[0.5px] border-fuchsia-500/20 flex items-center justify-center overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                      <img 
                        src="/admin2-profile.png" 
                        alt="Admin Profile"
                        className="w-full h-full object-cover object-center rounded-full" 
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-light text-white mb-2">Irfan Naseer</h3>
                  <p className="text-[10px] font-medium text-fuchsia-300 uppercase tracking-widest mb-8 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-fuchsia-500/10 rounded-full border border-fuchsia-500/20">
                    <Megaphone size={12} /> Social &amp; Brand Administrator
                  </p>
                  
                  <div className="flex items-center gap-4 mt-auto">
                    <a href="https://github.com/IrfanNaseer27" target="_blank" rel="noopener noreferrer" className="text-fuchsia-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--secondary-rgb),0.8)]"><GithubIcon className="w-4 h-4" /></a>
                    <a href="https://www.linkedin.com/in/irfan-naseer-30683b2b7?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" className="text-fuchsia-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--secondary-rgb),0.8)]"><LinkedinIcon className="w-4 h-4" /></a>
                    <a href="https://www.instagram.com/irfan_27_02?igsh=MWw5cGhsZGR6dmUzZg==" target="_blank" rel="noopener noreferrer" className="text-fuchsia-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--secondary-rgb),0.8)]"><InstagramIcon className="w-4 h-4" /></a>
                    <a href="https://mail.google.com/mail/?view=cm&fs=1&to=irfanrahimansuntop@gmail.com&su=Contacting Irfan Naseer" target="_blank" rel="noopener noreferrer" className="text-fuchsia-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--secondary-rgb),0.8)]"><Mail className="w-4 h-4 pointer-events-none" /></a>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin 3 */}
            <div className="relative group transform transition-all duration-700 hover:-translate-y-3 delay-200">
              <div className="absolute -inset-[1px] bg-gradient-to-b from-purple-500/30 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md"></div>
              <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/5 to-transparent h-full">
                <div className="absolute inset-0 bg-[#07050d]/80 backdrop-blur-3xl rounded-[2rem]"></div>
                
                <div className="relative p-8 flex flex-col items-center text-center">
                  <div className="relative w-28 h-28 mb-6 group-hover:scale-105 transition-transform duration-700">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/40 transition-colors"></div>
                    <div className="absolute inset-0 bg-[#050308] rounded-full z-10 border-[0.5px] border-purple-500/20 flex items-center justify-center overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                      <img 
                        src="/admin3-profile.PNG" 
                        alt="Admin Profile"
                        className="w-full h-full object-cover object-center rounded-full" 
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-light text-white mb-2">Samuel Jebaraj</h3>
                  <p className="text-[10px] font-medium text-purple-300 uppercase tracking-widest mb-8 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-500/10 rounded-full border border-purple-500/20">
                    <Globe size={12} /> Community
                  </p>
                  
                  <div className="flex items-center gap-4 mt-auto">
                    <a href="https://github.com/samuel8877" target="_blank" rel="noopener noreferrer" className="text-purple-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"><GithubIcon className="w-4 h-4" /></a>
                    <a href="https://www.linkedin.com/in/s-samuel-jebaraj-38396028b?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" className="text-purple-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"><LinkedinIcon className="w-4 h-4" /></a>
                    <a href="https://www.instagram.com/sam_joel_77?igsh=bjdwbWMzcXVncHlx" target="_blank" rel="noopener noreferrer" className="text-purple-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"><InstagramIcon className="w-4 h-4" /></a>
                    <a href="https://mail.google.com/mail/?view=cm&fs=1&to=Ssamueljr51@gmail.com&su=Contacting Samuel Jebaraj" target="_blank" rel="noopener noreferrer" className="text-purple-400/50 hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"><Mail className="w-4 h-4 pointer-events-none" /></a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
