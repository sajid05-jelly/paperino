"use client";

import { useState } from "react";
import { Palette, X, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const THEMES = [
  { id: "cosmic-violet", name: "Cosmic Violet", primary: "bg-violet-500", accent: "bg-fuchsia-500", shadow: "shadow-[0_0_15px_rgba(139,92,246,0.5)]" },
  { id: "ocean-blue", name: "Ocean Blue", primary: "bg-blue-500", accent: "bg-cyan-500", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]" },
  { id: "crimson-red", name: "Crimson Red", primary: "bg-red-500", accent: "bg-orange-500", shadow: "shadow-[0_0_15px_rgba(239,68,68,0.5)]" },
  { id: "emerald-green", name: "Emerald Green", primary: "bg-emerald-500", accent: "bg-lime-500", shadow: "shadow-[0_0_15px_rgba(16,185,129,0.5)]" },
  { id: "sunset-orange", name: "Sunset Orange", primary: "bg-orange-500", accent: "bg-pink-500", shadow: "shadow-[0_0_15px_rgba(249,115,22,0.5)]" },
  { id: "midnight-silver", name: "Midnight Silver", primary: "bg-zinc-500", accent: "bg-white", shadow: "shadow-[0_0_15px_rgba(161,161,170,0.5)]" },
] as const;

export default function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* ── Desktop View Left Sidebar (Hidden on mobile and tablet) ── */}
      <div className="desktop-only-sidebar fixed top-1/2 left-0 -translate-y-1/2 z-[9800] flex flex-col gap-[10px]" style={{ maxWidth: '48px' }}>
        {/* WhatsApp Community Button */}
        <a
          href="https://chat.whatsapp.com/BAu2CuzzE5JC0DPgzgsz6M"
          target="_blank"
          rel="noopener noreferrer"
          title="Join WhatsApp Community"
          className="group relative bg-black/50 backdrop-blur-md border border-white/10 border-l-0 rounded-r-xl sm:rounded-r-2xl flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-green-500/50 hover:bg-green-500/10 w-[38px] h-[38px] sm:w-[44px] sm:h-[44px] md:w-[48px] md:h-[48px] overflow-visible"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] group-hover:scale-110 transition-all duration-300">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="hidden sm:block absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm border border-green-500/20 text-green-300 text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-[0_0_10px_rgba(34,197,94,0.15)] z-[9901]">
            Join WhatsApp Community
          </span>
        </a>

        {/* Instagram Button */}
        <a
          href="https://www.instagram.com/hi_paperino/"
          target="_blank"
          rel="noopener noreferrer"
          title="Follow on Instagram"
          className="group relative bg-black/50 backdrop-blur-md border border-white/10 border-l-0 rounded-r-xl sm:rounded-r-2xl flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-pink-500/50 hover:bg-pink-500/10 w-[38px] h-[38px] sm:w-[44px] sm:h-[44px] md:w-[48px] md:h-[48px] overflow-visible"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] group-hover:scale-110 transition-all duration-300">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:block absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-sm border border-pink-500/20 text-pink-300 text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-[0_0_10px_rgba(236,72,153,0.15)] z-[9901]">
            Follow on Instagram
          </span>
        </a>

        {/* Theme Button */}
        <button
          onClick={() => setIsOpen(true)}
          title="Customize Theme"
          className="group relative bg-black/50 backdrop-blur-md border border-white/10 border-l-0 rounded-r-xl sm:rounded-r-2xl flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-violet-500/50 hover:bg-violet-500/10 w-[38px] h-[38px] sm:w-[44px] sm:h-[44px] md:w-[48px] md:h-[48px] text-gray-400 hover:text-white overflow-visible"
        >
          <Palette size={16} className="sm:w-5 sm:h-5 group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.8)] transition-all duration-300" />
        </button>
      </div>

      {/* Theme Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Palette className="text-violet-400" /> Theme Customization
                </h2>
                <p className="text-xs text-gray-400 mt-1">Select your preferred platform aesthetic.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
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
