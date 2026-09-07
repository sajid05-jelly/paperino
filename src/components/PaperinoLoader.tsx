"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function PaperinoLoader() {
  const [fadeOut, setFadeOut] = useState(false);

  // Trigger fade-out after ~1.6s so the intro is short
  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pl-logo-entrance {
          0%   { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pl-text-entrance {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pl-bar-fill {
          0%   { width: 0%; }
          70%  { width: 85%; }
          100% { width: 100%; }
        }
        @keyframes pl-glow-breathe {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.7; }
        }
        .pl-logo-enter {
          animation: pl-logo-entrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pl-text-enter {
          animation: pl-text-entrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
          opacity: 0;
        }
        .pl-sub-enter {
          animation: pl-text-entrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;
          opacity: 0;
        }
        .pl-bar-enter {
          animation: pl-text-entrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.55s forwards;
          opacity: 0;
        }
        .pl-bar-fill {
          animation: pl-bar-fill 1.4s cubic-bezier(0.4, 0, 0.2, 1) 0.6s forwards;
          width: 0%;
        }
        .pl-glow {
          animation: pl-glow-breathe 2.5s ease-in-out infinite;
        }
        .pl-screen-fadeout {
          transition: opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <div
        className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden pl-screen-fadeout ${
          fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{
          background: "#04030e",
          fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
        }}
      >
        {/* Subtle ambient glow — very minimal, no sci-fi */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div
            className="pl-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        {/* Centered composition */}
        <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8">
          {/* Logo */}
          <div className="pl-logo-enter">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                border: "1.5px solid rgba(139, 92, 246, 0.35)",
                background:
                  "radial-gradient(circle, rgba(15,20,45,0.95) 0%, rgba(8,5,20,0.98) 100%)",
                boxShadow:
                  "0 0 30px rgba(139,92,246,0.15), 0 0 60px rgba(59,130,246,0.08)",
              }}
            >
              <Image
                src="/logo-final.png"
                alt="Paperino"
                width={96}
                height={96}
                className="w-full h-full object-cover scale-110"
                priority
                unoptimized
              />
            </div>
          </div>

          {/* Title text */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <h1
              className="pl-text-enter text-lg sm:text-xl font-bold tracking-[0.25em] uppercase"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              PAPERINO
            </h1>
            <p
              className="pl-sub-enter text-[11px] sm:text-xs font-medium tracking-[0.3em] uppercase"
              style={{ color: "rgba(167,139,250,0.6)" }}
            >
              SRM STUDY HUB
            </p>
          </div>

          {/* Thin progress bar */}
          <div className="pl-bar-enter w-40 sm:w-52">
            <div
              className="w-full h-[2px] rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="pl-bar-fill h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(139,92,246,0.8), rgba(99,102,241,0.9), rgba(59,130,246,0.8))",
                  boxShadow: "0 0 8px rgba(99,102,241,0.4)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
