"use client";

import { useState, useRef, useEffect } from "react";

const EASTER_EGG_QUOTES = [
  "One syllabus to rule them all.",
  "Arrears bow to preparation.",
  "All roads lead to 9+ CGPA.",
  "Doom demands academic excellence.",
  "Your potential is without limit."
];

export default function DoomsdayEmblem() {
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    // Pick random quote
    const randomQuote = EASTER_EGG_QUOTES[Math.floor(Math.random() * EASTER_EGG_QUOTES.length)];
    setActiveQuote(randomQuote);
    setIsPulsing(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActiveQuote(null);
      setIsPulsing(false);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative inline-flex flex-col items-center select-none my-4">
      <button
        onClick={handleClick}
        type="button"
        aria-label="Doctor Doom Armored Crest — Click for tactical insight"
        title="Tactical Emblem (Click to inspect)"
        className={`group relative p-3 rounded-2xl bg-gradient-to-b from-[#16241d] to-[#0d1411] border border-[#10e87a]/40 shadow-[0_0_30px_rgba(16,232,122,0.25)] hover:shadow-[0_0_45px_rgba(16,232,122,0.45)] hover:border-[#10e87a] transition-all duration-300 cursor-pointer active:scale-95 ${
          isPulsing ? "scale-105 shadow-[0_0_50px_rgba(16,232,122,0.6)]" : ""
        }`}
      >
        {/* Armored Mask / Hood Crest SVG */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10 md:w-12 md:h-12 text-[#10e87a] transition-transform duration-300 group-hover:scale-105"
        >
          {/* Hood Contour */}
          <path
            d="M24 4C13 4 8 13 8 26C8 36 14 42 24 44C34 42 40 36 40 26C40 13 35 4 24 4Z"
            fill="#060908"
            stroke="#10e87a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Metallic Inner Faceplate */}
          <path
            d="M14 20L18 36L24 40L30 36L34 20C34 16 30 12 24 12C18 12 14 16 14 20Z"
            fill="#121c17"
            stroke="#8aa095"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Brow Plate Accent */}
          <path
            d="M17 18L24 21L31 18"
            stroke="#10e87a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Armored Slit Eyes (Glowing Emerald) */}
          <path
            d="M18 24L22 25"
            stroke="#10e87a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M30 24L26 25"
            stroke="#10e87a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Nose Bridge & Rivets */}
          <line x1="24" y1="21" x2="24" y2="31" stroke="#8aa095" strokeWidth="1.5" />
          <circle cx="21" cy="33" r="1" fill="#10e87a" />
          <circle cx="27" cy="33" r="1" fill="#10e87a" />
          {/* Mouth Guard Slits */}
          <line x1="21" y1="36" x2="27" y2="36" stroke="#8aa095" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* Ambient Subtle Emerald Pulse Ring */}
        <span className="absolute -inset-1 rounded-2xl border border-[#10e87a]/20 pointer-events-none group-hover:border-[#10e87a]/40 transition-colors" />
      </button>

      {/* Accessible 2.5s Tooltip Popup */}
      {activeQuote && (
        <div
          role="status"
          aria-live="polite"
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3.5 py-1.5 rounded-lg bg-[#0d1411] border border-[#10e87a] text-[#10e87a] text-xs font-bold tracking-wide shadow-[0_0_20px_rgba(16,232,122,0.4)] animate-in fade-in zoom-in-95 duration-150 z-30"
        >
          {activeQuote}
        </div>
      )}
    </div>
  );
}
