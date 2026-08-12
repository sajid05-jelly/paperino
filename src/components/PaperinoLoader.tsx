"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

const BOOT_MESSAGES = [
  "Initializing Paperino Core...",
  "Loading Student Services...",
  "Connecting Community...",
  "Scanning Study Resources...",
  "Deploying AI Modules...",
  "Preparing Smart Workspace...",
  "Synchronizing Cloud...",
  "Optimizing Performance...",
  "Almost Ready...",
];

function NeonMaterialsIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300 pl-neon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="rgba(139,92,246,0.12)" />
      <path d="M8 6h8" stroke="rgba(196,181,253,0.9)" />
      <path d="M8 10h6" stroke="rgba(196,181,253,0.7)" />
      <circle cx="17" cy="14" r="1.2" fill="#c4b5fd" />
    </svg>
  );
}

function NeonCareerIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300 pl-neon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" stroke="rgba(56,189,248,0.5)" fill="rgba(56,189,248,0.08)" />
      <circle cx="12" cy="12" r="5" stroke="rgba(56,189,248,0.9)" />
      <circle cx="12" cy="12" r="1.5" fill="#38bdf8" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="rgba(56,189,248,0.8)" strokeDasharray="1 2" />
    </svg>
  );
}

function NeonResumeIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300 pl-neon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(59,130,246,0.1)" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="rgba(147,197,253,0.9)" />
      <line x1="8" y1="16" x2="13" y2="16" stroke="rgba(147,197,253,0.7)" />
      <path d="M7 8h2" stroke="#60a5fa" />
    </svg>
  );
}

function NeonClassroomIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300 pl-neon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="rgba(99,102,241,0.1)" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" stroke="rgba(165,180,252,0.85)" />
      <path d="M12 21v-3" stroke="#818cf8" strokeWidth="2" />
    </svg>
  );
}

function NeonTrophyIcon() {
  return (
    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-violet-300 pl-neon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0V4z" fill="rgba(139,92,246,0.12)" />
      <path d="M4 6H2a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h2M20 6h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-2" stroke="rgba(196,181,253,0.8)" />
      <polygon points="12 7 13.2 9.2 15.5 9.5 13.8 11.2 14.2 13.5 12 12.4 9.8 13.5 10.2 11.2 8.5 9.5 10.8 9.2" fill="#c4b5fd" stroke="none" />
    </svg>
  );
}

const FEATURE_HOLOGRAMS = [
  { icon: <NeonMaterialsIcon />, label: "Materials", delay: 0 },
  { icon: <NeonCareerIcon />, label: "Career DNA", delay: 0.8 },
  { icon: <NeonResumeIcon />, label: "Resume ATS", delay: 1.6 },
  { icon: <NeonClassroomIcon />, label: "Free Class Finder", delay: 2.4 },
  { icon: <NeonTrophyIcon />, label: "Hackathons", delay: 3.2 },
];

export default function PaperinoLoader() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const sparkId = useRef(0);

  // Boot message rotation every 2s with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % BOOT_MESSAGES.length);
        setMsgVisible(true);
      }, 400);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Spark bursts every 2.5s
  useEffect(() => {
    const spawn = () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 58 + Math.random() * 20;
      const x = 50 + Math.cos(angle) * r;
      const y = 50 + Math.sin(angle) * r;
      const colors = ["#a78bfa", "#60a5fa", "#38bdf8", "#c4b5fd"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const id = sparkId.current++;
      setSparks(prev => [...prev.slice(-10), { id, x, y, color }]);
      setTimeout(() => setSparks(prev => prev.filter(s => s.id !== id)), 700);
    };
    const interval = setInterval(spawn, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pl-neon-pulse {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(167,139,250,0.6)); opacity: 0.88; transform: scale(1); }
          50% { filter: drop-shadow(0 0 8px rgba(167,139,250,1)) drop-shadow(0 0 14px rgba(96,165,250,0.8)); opacity: 1; transform: scale(1.05); }
        }
        .pl-neon-icon {
          animation: pl-neon-pulse 3.2s ease-in-out infinite;
          display: inline-block;
          vertical-align: middle;
        }

        @keyframes pl-aurora1 {
          0%,100% { transform: translate(-12%,-18%) scale(1); opacity:.4; }
          50% { transform: translate(6%,12%) scale(1.18); opacity:.55; }
        }
        @keyframes pl-aurora2 {
          0%,100% { transform: translate(12%,12%) scale(1.1); opacity:.28; }
          50% { transform: translate(-6%,-12%) scale(0.88); opacity:.44; }
        }
        @keyframes pl-aurora3 {
          0%,100%{ transform:translate(0,0) scale(1); opacity:.2; }
          40%{ transform:translate(-8%,6%) scale(1.1); opacity:.35; }
        }
        .pl-aurora1 { animation: pl-aurora1 13s ease-in-out infinite; }
        .pl-aurora2 { animation: pl-aurora2 17s ease-in-out infinite; }
        .pl-aurora3 { animation: pl-aurora3 21s ease-in-out infinite; }

        @keyframes pl-grid-scroll {
          from { background-position: 0 0; }
          to   { background-position: 0 48px; }
        }
        .pl-grid { animation: pl-grid-scroll 4s linear infinite; }

        @keyframes pl-float-up {
          0%   { transform:translateY(0) translateX(0); opacity:0; }
          10%  { opacity:.75; }
          90%  { opacity:.35; }
          100% { transform:translateY(-100vh) translateX(var(--drift)); opacity:0; }
        }
        .pl-particle {
          position:absolute;
          bottom:-8px;
          border-radius:50%;
          pointer-events:none;
          animation: pl-float-up var(--dur) linear var(--delay) infinite;
        }

        @keyframes pl-ring-cw  { from{transform:rotate(0deg);}  to{transform:rotate(360deg);}  }
        @keyframes pl-ring-ccw { from{transform:rotate(360deg);} to{transform:rotate(0deg);}   }
        .pl-ring-1 { transform-origin:50% 50%; animation: pl-ring-cw  10s linear infinite; }
        .pl-ring-2 { transform-origin:50% 50%; animation: pl-ring-ccw  7s linear infinite; }
        .pl-ring-3 { transform-origin:50% 50%; animation: pl-ring-cw  15s linear infinite; }

        @keyframes pl-scan {
          0%  { transform:translateY(-90px); opacity:0; }
          15% { opacity:.85; }
          85% { opacity:.85; }
          100%{ transform:translateY(90px);  opacity:0; }
        }
        .pl-scan { animation: pl-scan 2.8s ease-in-out infinite; }

        @keyframes pl-logo-pulse {
          0%,100%{ box-shadow:0 0 28px rgba(59,130,246,.85),0 0 55px rgba(139,92,246,.65),0 0 90px rgba(59,130,246,.4),inset 0 0 18px rgba(59,130,246,.5); transform:scale(1); }
          50%    { box-shadow:0 0 45px rgba(59,130,246,1),  0 0 85px rgba(139,92,246,.9), 0 0 130px rgba(59,130,246,.6),inset 0 0 28px rgba(96,165,250,.7); transform:scale(1.04); }
        }
        .pl-logo-pulse { animation: pl-logo-pulse 2.5s ease-in-out infinite; }

        @keyframes pl-progress {
          0%   { width:0%; }
          100% { width:100%; }
        }
        .pl-progress { animation: pl-progress 2.6s cubic-bezier(.4,0,.2,1) infinite; }

        @keyframes pl-spark {
          0%   { transform:scale(0) translate(0,0); opacity:1; }
          100% { transform:scale(1.6) translate(var(--sx),var(--sy)); opacity:0; }
        }
        .pl-spark { animation: pl-spark .65s ease-out forwards; }

        @keyframes pl-hologram-float {
          0%,100%{ transform:translateY(0) scale(1);  opacity:.7; }
          50%    { transform:translateY(-8px) scale(1.04); opacity:1; }
        }
        .pl-holo { animation: pl-hologram-float var(--hd) ease-in-out var(--hdelay) infinite; }

        .pl-msg-fade {
          transition: opacity .4s ease, transform .4s ease;
        }
        .pl-msg-visible { opacity:1; transform:translateY(0); }
        .pl-msg-hidden  { opacity:0; transform:translateY(6px); }

        @keyframes pl-orbital-particle {
          0%   { transform: rotate(0deg)   translateX(var(--or)) rotate(0deg);   opacity:0; }
          20%  { opacity:1; }
          80%  { opacity:.8; }
          100% { transform: rotate(360deg) translateX(var(--or)) rotate(-360deg); opacity:0; }
        }
        .pl-orb-particle {
          position:absolute;
          left:50%; top:50%;
          width:4px; height:4px;
          border-radius:50%;
          animation: pl-orbital-particle var(--dur) linear var(--delay) infinite;
          transform-origin: 0 0;
          margin:-2px;
        }

        @keyframes pl-shimmer-progress {
          0%   { background-position:-200% 0; }
          100% { background-position:200%  0; }
        }
        .pl-progress-bar {
          background: linear-gradient(90deg,#7c3aed,#6366f1,#3b82f6,#8b5cf6,#7c3aed);
          background-size:200% 100%;
          animation: pl-progress 2.6s cubic-bezier(.4,0,.2,1) infinite,
                     pl-shimmer-progress 2s linear infinite;
        }

        @keyframes pl-ring-glow {
          0%,100%{ opacity:.65; }
          50%    { opacity:1; }
        }
        .pl-ring-glow-1 { animation: pl-ring-glow 3s ease-in-out infinite; }
        .pl-ring-glow-2 { animation: pl-ring-glow 4s ease-in-out .8s infinite; }
        .pl-ring-glow-3 { animation: pl-ring-glow 5s ease-in-out 1.5s infinite; }

        .pl-holo-pos-0 { left: 2%; top: 12%; }
        .pl-holo-pos-1 { left: 2%; top: 70%; }
        .pl-holo-pos-2 { right: 2%; top: 12%; }
        .pl-holo-pos-3 { right: 2%; top: 70%; }
        .pl-holo-pos-4 { left: 50%; top: 4%; transform: translateX(-50%); }

        @media (min-width: 640px) {
          .pl-holo-pos-0 { left: 6%; top: 22%; }
          .pl-holo-pos-1 { left: 4%; top: 55%; }
          .pl-holo-pos-2 { right: 6%; top: 18%; }
          .pl-holo-pos-3 { right: 5%; top: 52%; }
          .pl-holo-pos-4 { left: 50%; top: 10%; transform: translateX(-50%); }
        }
      `}</style>

      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden px-3"
        style={{ background: "#04030e", fontFamily: "'Inter','Outfit',system-ui,sans-serif" }}>

        {/* ── AURORA BACKGROUND ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="pl-aurora1 absolute -top-40 -left-40 w-[900px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(ellipse,rgba(109,40,217,.42) 0%,rgba(79,70,229,.2) 45%,transparent 70%)", filter: "blur(90px)" }} />
          <div className="pl-aurora2 absolute -bottom-48 -right-48 w-[800px] h-[800px] rounded-full"
            style={{ background: "radial-gradient(ellipse,rgba(37,99,235,.32) 0%,rgba(59,130,246,.15) 45%,transparent 70%)", filter: "blur(110px)" }} />
          <div className="pl-aurora3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(ellipse,rgba(139,92,246,.18) 0%,transparent 65%)", filter: "blur(70px)" }} />

          {/* Volumetric light beams */}
          <div className="absolute top-0 left-1/3 w-px h-full origin-top opacity-10"
            style={{ background: "linear-gradient(180deg,rgba(139,92,246,.8) 0%,transparent 65%)", transform: "rotate(-20deg)" }} />
          <div className="absolute top-0 right-1/4 w-px h-full origin-top opacity-[0.07]"
            style={{ background: "linear-gradient(180deg,rgba(59,130,246,.7) 0%,transparent 55%)", transform: "rotate(12deg)" }} />

          {/* Moving grid */}
          <div className="pl-grid absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,1) 1px,transparent 1px)",
              backgroundSize: "48px 48px",
            }} />

          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <div key={i} className="pl-particle"
              style={{
                left: `${4 + i * 4.8}%`,
                width: i % 3 === 0 ? "3px" : "2px",
                height: i % 3 === 0 ? "3px" : "2px",
                background: i % 4 === 0 ? "rgba(139,92,246,.9)" : i % 3 === 0 ? "rgba(59,130,246,.8)" : "rgba(167,139,250,.6)",
                "--dur": `${13 + (i * 3.3) % 16}s`,
                "--delay": `${(i * 1.1) % 9}s`,
                "--drift": `${(i % 5 - 2) * 28}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* ── FEATURE HOLOGRAMS (floating sides) ── */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {FEATURE_HOLOGRAMS.map((f, i) => (
            <div key={f.label}
              className={`pl-holo pl-holo-pos-${i} absolute flex flex-col items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl max-sm:scale-95`}
              style={{
                background: "rgba(255,255,255,0.028)",
                border: "1px solid rgba(139,92,246,0.25)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 0 20px rgba(139,92,246,0.15), inset 0 0 12px rgba(139,92,246,0.08)",
                "--hd": `${4 + i * 0.6}s`,
                "--hdelay": `${f.delay}s`,
              } as unknown as React.CSSProperties}>
              <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7">
                {f.icon}
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest whitespace-nowrap"
                style={{ color: "rgba(167,139,250,0.85)" }}>
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── MAIN LOGO SCENE ── */}
        <div className="relative flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 mb-4 sm:mb-8 scale-90 sm:scale-100 flex-shrink-0">

          {/* Orbital traveling particles */}
          {[
            { r: 96,  dur: "8s",  delay: "0s",   color: "#a78bfa" },
            { r: 96,  dur: "8s",  delay: "2.7s", color: "#60a5fa" },
            { r: 112, dur: "12s", delay: "1s",   color: "#38bdf8" },
            { r: 112, dur: "12s", delay: "5s",   color: "#c4b5fd" },
            { r: 80,  dur: "6s",  delay: "0.5s", color: "#818cf8" },
          ].map((p, i) => (
            <div key={i} className="pl-orb-particle"
              style={{
                background: p.color,
                boxShadow: `0 0 6px ${p.color}`,
                "--or": `${p.r}px`,
                "--dur": p.dur,
                "--delay": p.delay,
              } as React.CSSProperties} />
          ))}

          {/* SVG rings + scan + sparks */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 220" fill="none">
            {/* Ring 3 — outermost slow */}
            <circle cx="110" cy="110" r="100"
              stroke="rgba(139,92,246,0.18)" strokeWidth="1"
              strokeDasharray="12 24 6 36"
              className="pl-ring-3 pl-ring-glow-3" />
            {/* Ring 2 — middle ccw */}
            <circle cx="110" cy="110" r="86"
              stroke="rgba(59,130,246,0.28)" strokeWidth="1.5"
              strokeDasharray="20 18 8 28"
              className="pl-ring-2 pl-ring-glow-2" />
            {/* Ring 1 — inner fast cw */}
            <circle cx="110" cy="110" r="72"
              stroke="rgba(167,139,250,0.45)" strokeWidth="2"
              strokeDasharray="30 12 6 18"
              className="pl-ring-1 pl-ring-glow-1" />

            {/* Scan line */}
            <line className="pl-scan"
              x1="55" y1="110" x2="165" y2="110"
              stroke="rgba(56,189,248,0.65)" strokeWidth="1.5"
              style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,0.9))" }} />

            {/* Blueprint crosshairs */}
            <line x1="110" y1="68" x2="110" y2="152" stroke="rgba(99,102,241,0.12)" strokeWidth=".5" strokeDasharray="2 5" />
            <line x1="68"  y1="110" x2="152" y2="110" stroke="rgba(99,102,241,0.12)" strokeWidth=".5" strokeDasharray="2 5" />

            {/* Corner brackets */}
            {[
              "M76,90 L76,76 L90,76",
              "M130,76 L144,76 L144,90",
              "M76,130 L76,144 L90,144",
              "M130,144 L144,144 L144,130",
            ].map((d, i) => (
              <path key={i} d={d} stroke="rgba(139,92,246,0.45)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            ))}

            {/* Spark particles (dynamic) */}
            {sparks.map(s => (
              <g key={s.id}>
                {[...Array(6)].map((_, j) => {
                  const a = (j / 6) * Math.PI * 2;
                  // Convert % coords to svg coords (0-220)
                  const svgX = (s.x / 100) * 220;
                  const svgY = (s.y / 100) * 220;
                  return (
                    <circle key={j} className="pl-spark"
                      cx={svgX} cy={svgY} r={1.5}
                      fill={s.color}
                      style={{
                        "--sx": `${Math.cos(a) * (8 + Math.random() * 12)}px`,
                        "--sy": `${Math.sin(a) * (8 + Math.random() * 12)}px`,
                        filter: `drop-shadow(0 0 4px ${s.color})`,
                        animationDelay: `${j * 0.04}s`,
                      } as React.CSSProperties} />
                  );
                })}
              </g>
            ))}
          </svg>

          {/* Circular Paperino logo */}
          <div className="pl-logo-pulse relative z-10 w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              border: "2px solid rgba(59,130,246,0.85)",
              background: "radial-gradient(circle,rgba(15,20,50,.96) 0%,rgba(8,5,24,.98) 100%)",
              backdropFilter: "blur(8px)",
            }}>
            <Image src="/logo-final.png" alt="Paperino" width={80} height={80}
              className="w-full h-full object-cover scale-110" priority unoptimized />
            {/* Holographic overlay */}
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle at 30% 30%,rgba(96,165,250,.3) 0%,transparent 60%),linear-gradient(135deg,rgba(139,92,246,.2) 0%,transparent 50%,rgba(59,130,246,.2) 100%)",
                mixBlendMode: "overlay",
              }} />
          </div>
        </div>

        {/* ── BOOT MESSAGE ── */}
        <div className="h-7 flex items-center justify-center mb-4 sm:mb-6 px-4">
          <p key={msgIdx}
            className={`text-xs sm:text-sm font-mono tracking-wider text-center pl-msg-fade ${msgVisible ? "pl-msg-visible" : "pl-msg-hidden"}`}
            style={{ color: "rgba(167,139,250,0.85)" }}>
            {BOOT_MESSAGES[msgIdx]}
          </p>
        </div>

        {/* ── NEON PROGRESS LINE ── */}
        <div className="w-56 sm:w-80 max-w-[80vw] flex flex-col items-center gap-2">
          <div className="w-full h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="pl-progress-bar h-full rounded-full" />
          </div>
          {/* Three glowing dots below bar */}
          <div className="flex gap-2">
            {[0, 0.4, 0.8].map((d, i) => (
              <div key={i} className="w-1 h-1 rounded-full animate-pulse"
                style={{
                  background: "#a78bfa",
                  boxShadow: "0 0 6px #a78bfa",
                  animationDelay: `${d}s`,
                }} />
            ))}
          </div>
        </div>

        {/* ── WATERMARK ── */}
        <p className="absolute bottom-3 sm:bottom-6 text-[10px] uppercase tracking-widest text-center"
          style={{ color: "rgba(148,163,184,0.28)" }}>
          Paperino · SRM Study Hub
        </p>
      </div>
    </>
  );
}
