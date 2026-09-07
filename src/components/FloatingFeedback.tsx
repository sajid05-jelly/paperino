"use client";

import { MessageCircle } from "lucide-react";
import { useSound } from "@/hooks/useSound";

export default function FloatingFeedback() {
  const { playPop } = useSound();

  return (
    <div className="fixed bottom-6 md:bottom-12 right-4 md:right-8 z-[9999] flex flex-col items-center gap-3">
      <a
        href="mailto:paperino.study@gmail.com?subject=Paperino%20Feedback"
        onClick={() => playPop()}
        className="relative group w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-110 bg-[#0f0a1a] border border-violet-500/30 text-violet-400 hover:text-white liquid-glass no-underline"
        title="Send Feedback"
      >
        <MessageCircle size={28} />
      </a>
    </div>
  );
}

