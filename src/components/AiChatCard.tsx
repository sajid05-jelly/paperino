"use client";

import { Bot, ArrowRight } from "lucide-react";

export default function AiChatCard() {
  return (
    <button 
      onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat"))} 
      className="w-full text-left focus:outline-none"
    >
      <div className="glass-card p-6 md:p-8 h-full group cursor-pointer relative overflow-hidden transition-all hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-violet-500 to-fuchsia-400 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-violet-400 font-bold text-xl group-hover:scale-110 transition-transform shadow-lg">
            <Bot size={24} className="md:w-7 md:h-7" />
          </div>
          <ArrowRight size={20} className="text-gray-500 group-hover:text-violet-400 transition-colors md:w-6 md:h-6" />
        </div>
        <h3 className="text-xl md:text-2xl font-semibold text-white mb-3 relative z-10">AI Chat Bot</h3>
        <p className="text-sm md:text-base text-gray-400 relative z-10">Ask quick academic questions and get instant, concise student-friendly answers.</p>
      </div>
    </button>
  );
}
