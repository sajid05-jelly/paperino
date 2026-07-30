"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import Logo from "@/components/Logo";

/* ── QUOTES ─────────────────────────────────────────────────────────────────── */
const QUOTES = [
  "Building something amazing for you.",
  "Small updates. Big future.",
  "Almost there — worth the wait.",
  "Education deserves better.",
  "Good things take time.",
  "Precision engineering, for students.",
  "Every line of code, for you.",
  "The future of studying is loading.",
];

/* ── STATUS TASKS ────────────────────────────────────────────────────────────── */
const INITIAL_TASKS = [
  { label: "Database Optimization", done: true },
  { label: "AI Modules", done: true },
  { label: "Notification Engine", done: true },
  { label: "Deploying Free Class Finder", done: false },
  { label: "Security Hardening", done: false },
  { label: "Performance Tuning", done: false },
];

const PROGRESS_MESSAGES = [
  "Optimizing...",
  "Deploying...",
  "Securing...",
  "Compiling...",
  "Finalizing...",
  "Syncing...",
  "Patching...",
];

/* ── REPAIR MESSAGES ─────────────────────────────────────────────────────────── */
const REPAIR_STATUS_MESSAGES = [
  "Calibrating...",
  "Repairing...",
  "Welding...",
  "Optimizing...",
  "Deploying...",
];

/* ── MAIN PAGE ───────────────────────────────────────────────────────────────── */
export default function VisitorMaintenancePage() {
  const [config, setConfig] = useState({
    title: "System Upgrade in Progress",
    message: "We're building something better for you. Paperino is currently receiving new features and performance improvements.",
    estimatedReturn: "Coming Back Soon",
  });

  const [quoteIdx, setQuoteIdx] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [progressMsgIdx, setProgressMsgIdx] = useState(0);
  const [progressPct] = useState(78);

  // Firestore config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "siteConfig"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setConfig({
          title: d.title || "System Upgrade in Progress",
          message: d.message || "We're building something better for you.",
          estimatedReturn: d.estimatedReturn || "Coming Back Soon",
        });
      }
    }, console.error);
    return () => unsub();
  }, []);

  // Quote rotation with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 600);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Progress message rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressMsgIdx(i => (i + 1) % PROGRESS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Randomly flip tasks between done/in-progress
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => {
        const undoneIdx = prev.map((t, i) => (!t.done ? i : -1)).filter(i => i >= 0);
        if (undoneIdx.length === 0) return prev;
        const pick = undoneIdx[Math.floor(Math.random() * undoneIdx.length)];
        return prev.map((t, i) => (i === pick ? { ...t, done: true } : t));
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');

        /* ── AURORA ── */
        @keyframes aurora1 {
          0%,100% { transform: translate(-10%,-15%) scale(1); opacity:0.35; }
          50% { transform: translate(5%,10%) scale(1.15); opacity:0.5; }
        }
        @keyframes aurora2 {
          0%,100% { transform: translate(10%,10%) scale(1.1); opacity:0.25; }
          50% { transform: translate(-5%,-10%) scale(0.9); opacity:0.4; }
        }
        @keyframes aurora3 {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.2; }
          33% { transform: translate(-8%,5%) scale(1.1); opacity:0.35; }
          66% { transform: translate(6%,-8%) scale(0.95); opacity:0.28; }
        }
        .aurora1 { animation: aurora1 14s ease-in-out infinite; }
        .aurora2 { animation: aurora2 18s ease-in-out infinite; }
        .aurora3 { animation: aurora3 22s ease-in-out infinite; }

        /* ── FLOATING PARTICLES ── */
        @keyframes float-up {
          0% { transform: translateY(0) translateX(0); opacity:0; }
          10% { opacity:0.7; }
          90% { opacity:0.3; }
          100% { transform: translateY(-110vh) translateX(var(--drift)); opacity:0; }
        }
        .particle {
          position:fixed;
          bottom:-10px;
          border-radius:50%;
          pointer-events:none;
          animation: float-up var(--dur) linear var(--delay) infinite;
        }

        /* ── SCAN LINE ── */
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        .scan-line { animation: scan 3.5s linear infinite; }

        /* ── DRONES & ROBOTIC ARMS ── */
        @keyframes drone-arm-1 {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(30px, 20px) rotate(-15deg); }
          50% { transform: translate(15px, 35px) rotate(10deg); }
          75% { transform: translate(40px, 10px) rotate(-5deg); }
        }
        @keyframes drone-arm-2 {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(-25px, 25px) rotate(15deg); }
          50% { transform: translate(-40px, 10px) rotate(-10deg); }
          75% { transform: translate(-15px, 30px) rotate(5deg); }
        }
        @keyframes drone-arm-3 {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(25px, -25px) rotate(-10deg); }
          50% { transform: translate(35px, -15px) rotate(15deg); }
          75% { transform: translate(10px, -35px) rotate(-5deg); }
        }
        @keyframes drone-arm-4 {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(-30px, -20px) rotate(12deg); }
          50% { transform: translate(-15px, -35px) rotate(-15deg); }
          75% { transform: translate(-35px, -10px) rotate(8deg); }
        }

        .arm-robot-1 { animation: drone-arm-1 7s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .arm-robot-2 { animation: drone-arm-2 6.5s cubic-bezier(0.45, 0, 0.55, 1) infinite 0.8s; }
        .arm-robot-3 { animation: drone-arm-3 7.2s cubic-bezier(0.45, 0, 0.55, 1) infinite 1.5s; }
        .arm-robot-4 { animation: drone-arm-4 6.8s cubic-bezier(0.45, 0, 0.55, 1) infinite 0.3s; }

        /* ── LASER WELD PULSE ── */
        @keyframes laser-weld-1 {
          0%, 100% { opacity: 0; stroke-dashoffset: 100; }
          15%, 35% { opacity: 1; stroke-dashoffset: 0; }
          45% { opacity: 0.2; }
          60%, 80% { opacity: 0.9; stroke-dashoffset: 0; }
        }
        @keyframes laser-weld-2 {
          0%, 100% { opacity: 0; }
          20%, 40% { opacity: 1; }
          55%, 75% { opacity: 0.85; }
        }
        .laser-beam-weld-1 { animation: laser-weld-1 3.2s ease-in-out infinite; stroke-dasharray: 120; }
        .laser-beam-weld-2 { animation: laser-weld-2 2.6s ease-in-out infinite 0.7s; }
        .laser-beam-weld-3 { animation: laser-weld-1 3.8s ease-in-out infinite 1.2s; stroke-dasharray: 120; }
        .laser-beam-weld-4 { animation: laser-weld-2 3.1s ease-in-out infinite 1.8s; }

        /* ── SCAN RINGS ── */
        @keyframes ring-rotate-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ring-rotate-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .scan-ring-1 { transform-origin: 130px 130px; animation: ring-rotate-cw 12s linear infinite; }
        .scan-ring-2 { transform-origin: 130px 130px; animation: ring-rotate-ccw 9s linear infinite; }
        .scan-ring-3 { transform-origin: 130px 130px; animation: ring-rotate-cw 16s linear infinite; }

        /* ── BLUEPRINT FLASH ── */
        @keyframes blueprint-flash {
          0%, 88%, 100% { opacity: 0.15; }
          92%, 96% { opacity: 0.7; filter: drop-shadow(0 0 8px rgba(99,102,241,0.8)); }
        }
        .blueprint-grid-flash { animation: blueprint-flash 6.5s ease-in-out infinite; }

        /* ── DIAGNOSTIC SWEEP ── */
        @keyframes diag-sweep {
          0% { transform: translateY(-70px); opacity: 0; }
          15% { opacity: 0.8; }
          85% { opacity: 0.8; }
          100% { transform: translateY(70px); opacity: 0; }
        }
        .diag-sweep-line { animation: diag-sweep 4s ease-in-out infinite; }

        /* ── LOGO ENERGY REPAIR PULSE ── */
        @keyframes logo-energy-cycle {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 25px rgba(109,40,217,0.4)); }
          70% { transform: scale(1.04); filter: drop-shadow(0 0 45px rgba(139,92,246,0.95)) drop-shadow(0 0 20px rgba(59,130,246,0.8)); }
          75% { transform: scale(0.99); }
          82% { transform: scale(1.02); filter: drop-shadow(0 0 35px rgba(167,139,250,0.8)); }
        }
        .logo-repair-pulse { animation: logo-energy-cycle 7s ease-in-out infinite; }

        /* ── NEON PROGRESS ORBIT ── */
        @keyframes progress-orbit {
          from { stroke-dashoffset: 400; }
          to { stroke-dashoffset: 0; }
        }
        .neon-progress-line {
          stroke-dasharray: 80 120;
          stroke-dashoffset: 400;
          animation: progress-orbit 5s linear infinite;
        }

        /* ── SPARK ── */
        @keyframes spark {
          0% { transform: scale(0) translate(0,0); opacity:1; }
          100% { transform: scale(1.5) translate(var(--sx),var(--sy)); opacity:0; }
        }
        .spark { animation: spark 0.65s ease-out forwards; }

        /* ── QUOTE FADE ── */
        .quote-fade {
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .quote-visible { opacity:1; transform:translateY(0); }
        .quote-hidden { opacity:0; transform:translateY(8px); }

        /* ── TASK APPEAR ── */
        @keyframes task-check {
          0% { transform: scale(0) rotate(-10deg); }
          60% { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .task-check { animation: task-check 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }

        /* ── NEON BORDER GLOW ── */
        @keyframes neon-border {
          0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.2), 0 0 40px rgba(109,40,217,0.1), inset 0 0 20px rgba(139,92,246,0.03); }
          50% { box-shadow: 0 0 35px rgba(139,92,246,0.35), 0 0 70px rgba(109,40,217,0.2), inset 0 0 30px rgba(139,92,246,0.06); }
        }
        .neon-border { animation: neon-border 4s ease-in-out infinite; }

        /* ── COUNTER SPIN ── */
        @keyframes counter-enter {
          from { transform:translateY(-100%); opacity:0; }
          to { transform:translateY(0); opacity:1; }
        }
        .counter-enter { animation: counter-enter 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }

        /* ── LIGHT BEAM ── */
        @keyframes beam {
          0%,100% { opacity:0.04; transform:rotate(-25deg) translateY(-10%); }
          50% { opacity:0.12; transform:rotate(-25deg) translateY(5%); }
        }
        .beam { animation: beam 8s ease-in-out infinite; }
        .beam2 { animation: beam 12s ease-in-out 3s infinite; }

        /* ── REPAIR MESSAGE SWAP ── */
        @keyframes repair-msg-swap {
          0%, 15% { opacity: 0; transform: translateY(4px); }
          25%, 80% { opacity: 1; transform: translateY(0); }
          90%, 100% { opacity: 0; transform: translateY(-4px); }
        }
        .repair-msg-anim { animation: repair-msg-swap 2.5s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen w-full relative overflow-hidden text-white"
        style={{ background: "#04030e", fontFamily: "'Inter','Outfit',system-ui,sans-serif" }}>

        {/* ── BACKGROUND AURORA ── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {/* Aurora blobs */}
          <div className="aurora1 absolute -top-32 -left-32 w-[800px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.4) 0%, rgba(79,70,229,0.2) 45%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="aurora2 absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(37,99,235,0.3) 0%, rgba(59,130,246,0.15) 45%, transparent 70%)", filter: "blur(100px)" }} />
          <div className="aurora3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 65%)", filter: "blur(60px)" }} />

          {/* Light beams */}
          <div className="beam absolute top-0 left-1/4 w-[2px] h-full origin-top"
            style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.6) 0%, transparent 60%)", transform: "rotate(-25deg) translateY(-10%)" }} />
          <div className="beam2 absolute top-0 right-1/3 w-[1px] h-full origin-top"
            style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.4) 0%, transparent 50%)", transform: "rotate(15deg)" }} />

          {/* Floating particles */}
          {[...Array(18)].map((_, i) => (
            <div key={i} className="particle"
              style={{
                left: `${5 + i * 5.3}%`,
                width: i % 3 === 0 ? "3px" : i % 2 === 0 ? "2px" : "1.5px",
                height: i % 3 === 0 ? "3px" : i % 2 === 0 ? "2px" : "1.5px",
                background: i % 4 === 0 ? "rgba(139,92,246,0.8)" : i % 3 === 0 ? "rgba(59,130,246,0.7)" : "rgba(167,139,250,0.5)",
                boxShadow: `0 0 ${i % 2 === 0 ? 6 : 3}px currentColor`,
                "--dur": `${12 + (i * 3.7) % 18}s`,
                "--delay": `${(i * 1.3) % 10}s`,
                "--drift": `${(i % 5 - 2) * 30}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* ── PAGE CONTENT ── */}
        <div className="relative z-10 min-h-screen flex flex-col">

          {/* ── HEADER ── */}
          <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ border: "1px solid rgba(139,92,246,0.4)", boxShadow: "0 0 15px rgba(139,92,246,0.3)" }}>
                <Logo className="w-full h-full object-cover scale-125" />
              </div>
              <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>Paperino</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                color: "#fbbf24",
              }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              System Upgrade
            </div>
          </header>

          {/* ── MAIN BODY ── */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-12 py-10">

            {/* ═══════════════════ LEFT PANEL ═══════════════════ */}
            <div className="flex-1 max-w-xl flex flex-col gap-6">

              {/* Title */}
              <div className="space-y-4">
                <h1 className="font-black leading-none"
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontSize: "clamp(2.2rem,5vw,3.5rem)",
                    letterSpacing: "-0.035em",
                    background: "linear-gradient(135deg, #fff 0%, #c4b5fd 40%, #818cf8 70%, #60a5fa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                  {config.title}
                </h1>
                <p className="text-base leading-relaxed" style={{ color: "rgba(148,163,184,0.85)", maxWidth: "480px" }}>
                  {config.message}
                </p>
              </div>

              {/* ── STATUS CARD ── */}
              <div className="rounded-2xl p-5 space-y-3 neon-border"
                style={{
                  background: "rgba(255,255,255,0.028)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  backdropFilter: "blur(24px)",
                }}>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(148,163,184,0.5)" }}>
                  Live System Status
                </p>
                <div className="space-y-2.5">
                  {tasks.map((task, i) => (
                    <div key={task.label} className="flex items-center gap-3"
                      style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500"
                        style={task.done ? {
                          background: "rgba(34,197,94,0.15)",
                          border: "1px solid rgba(34,197,94,0.4)",
                          boxShadow: "0 0 10px rgba(34,197,94,0.25)",
                        } : {
                          background: "rgba(139,92,246,0.1)",
                          border: "1px solid rgba(139,92,246,0.3)",
                        }}>
                        {task.done ? (
                          <svg className="task-check" width="10" height="10" viewBox="0 0 10 10">
                            <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#4ade80" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <div className="w-2 h-2 rounded-full animate-spin"
                            style={{ border: "1.5px solid rgba(139,92,246,0.8)", borderTopColor: "transparent" }} />
                        )}
                      </div>
                      <span className="text-sm font-medium transition-colors duration-500"
                        style={{ color: task.done ? "rgba(203,213,225,0.9)" : "rgba(167,139,250,0.85)" }}>
                        {task.label}
                      </span>
                      {!task.done && (
                        <span className="ml-auto text-[9px] uppercase tracking-widest font-bold animate-pulse"
                          style={{ color: "#a78bfa" }}>
                          live
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── PROGRESS BAR ── */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(148,163,184,0.5)" }}>
                    Upgrade Progress
                  </span>
                  <span className="text-xs font-bold overflow-hidden h-4 relative" style={{ color: "#a78bfa" }}>
                    <span key={progressMsgIdx} className="counter-enter block">
                      {PROGRESS_MESSAGES[progressMsgIdx]}
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full progress-shimmer" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              {/* ── ESTIMATED RETURN ── */}
              <div className="inline-flex items-center gap-3 self-start px-5 py-3 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg, rgba(109,40,217,0.12) 0%, rgba(79,70,229,0.08) 100%)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 0 30px rgba(109,40,217,0.2)",
                }}>
                <div className="relative">
                  <div className="pulse-ring absolute inset-0 rounded-full"
                    style={{ border: "1.5px solid rgba(139,92,246,0.5)" }} />
                  <span className="text-xl">🚀</span>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "rgba(148,163,184,0.5)" }}>Estimated Return</p>
                  <p className="text-sm font-bold" style={{ color: "#c4b5fd" }}>{config.estimatedReturn}</p>
                </div>
              </div>

              {/* ── QUOTE ── */}
              <div className="h-8 flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5" />
                  <circle cx="6" cy="6" r="2" fill="rgba(139,92,246,0.8)" className="animate-pulse" />
                </svg>
                <p className={`text-sm italic quote-fade ${quoteVisible ? "quote-visible" : "quote-hidden"}`}
                  style={{ color: "rgba(148,163,184,0.65)" }}>
                  "{QUOTES[quoteIdx]}"
                </p>
              </div>
            </div>

            {/* ═══════════════════ RIGHT PANEL — REPAIR STATION ═══════════════════ */}
            <div className="w-full max-w-[480px] shrink-0">
              <div className="relative rounded-3xl overflow-hidden neon-border"
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  backdropFilter: "blur(32px)",
                  aspectRatio: "1 / 1.05",
                }}>

                {/* Moving neon grid background */}
                <div className="absolute inset-0 grid-scroll"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px)
                    `,
                    backgroundSize: "40px 40px",
                  }} />

                {/* Scan line */}
                <div className="scan-line absolute left-0 right-0 h-px pointer-events-none"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), rgba(59,130,246,0.5), transparent)" }} />

                {/* Inner top glow */}
                <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.2) 0%, transparent 70%)" }} />

                <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 gap-6">

                  {/* Station label */}
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#c4b5fd" }}>
                      Paperino Repair Station
                    </span>
                  </div>

                  {/* ── HOLOGRAPHIC LOGO SCENE ── */}
                  <RepairScene />

                  {/* Status text */}
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>Robots actively upgrading</p>
                    <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.45)" }}>
                      AI-assisted deployment in progress
                    </p>
                  </div>

                  {/* Bottom circuit lines */}
                  <svg className="absolute bottom-0 left-0 right-0 w-full" height="60" viewBox="0 0 480 60" fill="none">
                    <path className="circuit-line" d="M0 50 L80 50 L100 30 L200 30 L220 50 L480 50"
                      stroke="rgba(139,92,246,0.4)" strokeWidth="1" />
                    <path className="circuit-line-2" d="M0 40 L60 40 L80 20 L160 20 L180 40 L480 40"
                      stroke="rgba(59,130,246,0.3)" strokeWidth="0.8" />
                    {[80, 160, 240, 320, 400].map(x => (
                      <circle key={x} cx={x} cy="50" r="2.5" fill="rgba(139,92,246,0.5)" className="animate-pulse" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </main>

          {/* ── FOOTER ── */}
          <footer className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.35)" }}>
              © {new Date().getFullYear()} Paperino SRM Study Hub
            </p>
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.3)" }}>
              Built with care for SRM students
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

/* ── REPAIR SCENE ANIMATION ──────────────────────────────────────────────────── */
function RepairScene() {
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [energyPulses, setEnergyPulses] = useState<{ id: number; x1: number; y1: number; x2: number; y2: number; color: string }[]>([]);
  const [fragments, setFragments] = useState<{ id: number; startX: number; startY: number; targetX: number; targetY: number; color: string }[]>([]);
  const [repairMsgIdx, setRepairMsgIdx] = useState(0);
  const sparkId = useRef(0);
  const pulseId = useRef(0);
  const fragmentId = useRef(0);

  // Cycling repair status messages
  useEffect(() => {
    const msgInterval = setInterval(() => {
      setRepairMsgIdx(prev => (prev + 1) % REPAIR_STATUS_MESSAGES.length);
    }, 2500);
    return () => clearInterval(msgInterval);
  }, []);

  // Continuous welding, spark generation, energy particle flow & fragment assembly
  useEffect(() => {
    // 1. Sparks on laser contact with logo
    const sparkInterval = setInterval(() => {
      const weldPoints = [
        { x: 110, y: 110 }, { x: 150, y: 110 },
        { x: 110, y: 150 }, { x: 150, y: 150 },
        { x: 130, y: 100 }, { x: 130, y: 160 }
      ];
      const target = weldPoints[Math.floor(Math.random() * weldPoints.length)];
      const isBlue = Math.random() > 0.4;
      const id = sparkId.current++;

      setSparks(prev => [
        ...prev.slice(-14),
        { id, x: target.x, y: target.y, color: isBlue ? "#60a5fa" : "#c4b5fd" }
      ]);

      setTimeout(() => {
        setSparks(prev => prev.filter(s => s.id !== id));
      }, 650);
    }, 220);

    // 2. Energy particles travelling along laser pathways from robots to logo
    const energyInterval = setInterval(() => {
      const pathways = [
        { x1: 45, y1: 45, x2: 110, y2: 110, color: "#a78bfa" },
        { x1: 215, y1: 45, x2: 150, y2: 110, color: "#60a5fa" },
        { x1: 45, y1: 215, x2: 110, y2: 150, color: "#38bdf8" },
        { x1: 215, y1: 215, x2: 150, y2: 150, color: "#818cf8" }
      ];
      const path = pathways[Math.floor(Math.random() * pathways.length)];
      const id = pulseId.current++;

      setEnergyPulses(prev => [...prev.slice(-8), { id, ...path }]);
      setTimeout(() => {
        setEnergyPulses(prev => prev.filter(p => p.id !== id));
      }, 1200);
    }, 450);

    // 3. Fragments flying into place
    const fragmentInterval = setInterval(() => {
      const angles = [30, 120, 210, 300];
      const angle = angles[Math.floor(Math.random() * angles.length)] * (Math.PI / 180);
      const startDist = 95;
      const targetDist = 38;
      const startX = 130 + Math.cos(angle) * startDist;
      const startY = 130 + Math.sin(angle) * startDist;
      const targetX = 130 + Math.cos(angle) * targetDist;
      const targetY = 130 + Math.sin(angle) * targetDist;
      const colors = ["#a78bfa", "#60a5fa", "#38bdf8", "#c4b5fd"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const id = fragmentId.current++;

      setFragments(prev => [...prev.slice(-6), { id, startX, startY, targetX, targetY, color }]);
      setTimeout(() => {
        setFragments(prev => prev.filter(f => f.id !== id));
      }, 1800);
    }, 1400);

    return () => {
      clearInterval(sparkInterval);
      clearInterval(energyInterval);
      clearInterval(fragmentInterval);
    };
  }, []);

  return (
    <div className="relative w-72 h-72 flex items-center justify-center">
      {/* Dynamic Status Tag beside Repair Station */}
      <div className="absolute top-2 right-2 z-20 px-2.5 py-1 rounded-md flex items-center gap-1.5 backdrop-blur-md"
        style={{
          background: "rgba(15, 10, 30, 0.75)",
          border: "1px solid rgba(139,92,246,0.3)",
          boxShadow: "0 0 12px rgba(109,40,217,0.3)"
        }}>
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span key={repairMsgIdx} className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 repair-msg-anim">
          {REPAIR_STATUS_MESSAGES[repairMsgIdx]}
        </span>
      </div>

      <svg width="280" height="280" viewBox="0 0 260 260" fill="none" className="absolute inset-0">
        {/* ── ROTATING SCAN RINGS ── */}
        <circle cx="130" cy="130" r="118" stroke="rgba(139,92,246,0.12)" strokeWidth="1" className="scan-ring-1" />
        <circle cx="130" cy="130" r="102" stroke="rgba(59,130,246,0.18)" strokeWidth="1.2" strokeDasharray="15 30 45 15" className="scan-ring-2" />
        <circle cx="130" cy="130" r="82" stroke="rgba(147,51,234,0.15)" strokeWidth="0.8" strokeDasharray="6 12" className="scan-ring-3" />

        {/* ── NEON CONTINUOUS PROGRESS ORBIT LINES ── */}
        <circle cx="130" cy="130" r="94" stroke="url(#progressLineGrad)" strokeWidth="1.5" className="neon-progress-line" />

        {/* ── HOLOGRAPHIC BLUEPRINT GRID (flashing) ── */}
        <g className="blueprint-grid-flash">
          {[-2, -1, 0, 1, 2].map(r =>
            [-2, -1, 0, 1, 2].map(c => (
              <circle key={`bp-${r}-${c}`} cx={130 + c * 22} cy={130 + r * 22} r="1.2" fill="#818cf8" />
            ))
          )}
          <circle cx="130" cy="130" r="48" stroke="rgba(99,102,241,0.3)" strokeWidth="0.8" strokeDasharray="3 3" />
        </g>

        {/* ── DIAGNOSTIC SCAN LINE SWEEP ── */}
        <g className="diag-sweep-line">
          <line x1="75" y1="130" x2="185" y2="130" stroke="rgba(56,189,248,0.6)" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,0.8))" }} />
        </g>

        {/* ── LASER BEAMS & ROBOT ARM CONNECTORS ── */}
        {/* Arm 1 → Logo */}
        <line className="laser-beam-weld-1" x1="45" y1="45" x2="110" y2="110" stroke="url(#laserViolet)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Arm 2 → Logo */}
        <line className="laser-beam-weld-2" x1="215" y1="45" x2="150" y2="110" stroke="url(#laserBlue)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Arm 3 → Logo */}
        <line className="laser-beam-weld-3" x1="45" y1="215" x2="110" y2="150" stroke="url(#laserCyan)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Arm 4 → Logo */}
        <line className="laser-beam-weld-4" x1="215" y1="215" x2="150" y2="150" stroke="url(#laserIndigo)" strokeWidth="1.8" strokeLinecap="round" />

        {/* ── ENERGY PARTICLES TRAVELLING TO LOGO ── */}
        {energyPulses.map(p => (
          <circle key={p.id} r="2.5" fill={p.color} style={{ filter: `drop-shadow(0 0 5px ${p.color})` }}>
            <animateMotion path={`M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}`} dur="1.1s" repeatCount="indefinite" />
          </circle>
        ))}

        {/* ── 4 ROBOTIC ARMS (Dynamic extend/retract/rotate) ── */}
        {/* Arm 1: Top-Left */}
        <g transform="translate(45,45)" className="arm-robot-1">
          <rect x="-14" y="-10" width="28" height="20" rx="5" fill="rgba(24,16,48,0.95)" stroke="#8b5cf6" strokeWidth="1.2" />
          <line x1="-8" y1="-10" x2="-14" y2="-18" stroke="#a78bfa" strokeWidth="1.5" />
          <line x1="8" y1="-10" x2="14" y2="-18" stroke="#a78bfa" strokeWidth="1.5" />
          {/* Segment 1 */}
          <line x1="0" y1="10" x2="12" y2="28" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="28" r="3" fill="#c4b5fd" />
          {/* Segment 2 */}
          <line x1="12" y1="28" x2="28" y2="40" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="28" cy="40" r="2.5" fill="#60a5fa" style={{ filter: "drop-shadow(0 0 6px #60a5fa)" }} />
        </g>

        {/* Arm 2: Top-Right */}
        <g transform="translate(215,45)" className="arm-robot-2">
          <rect x="-14" y="-10" width="28" height="20" rx="5" fill="rgba(16,24,48,0.95)" stroke="#3b82f6" strokeWidth="1.2" />
          <line x1="-8" y1="-10" x2="-14" y2="-18" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="8" y1="-10" x2="14" y2="-18" stroke="#60a5fa" strokeWidth="1.5" />
          {/* Segment 1 */}
          <line x1="0" y1="10" x2="-12" y2="28" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="-12" cy="28" r="3" fill="#93c5fd" />
          {/* Segment 2 */}
          <line x1="-12" y1="28" x2="-28" y2="40" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="-28" cy="40" r="2.5" fill="#a78bfa" style={{ filter: "drop-shadow(0 0 6px #a78bfa)" }} />
        </g>

        {/* Arm 3: Bottom-Left */}
        <g transform="translate(45,215)" className="arm-robot-3">
          <rect x="-14" y="-10" width="28" height="20" rx="5" fill="rgba(12,28,48,0.95)" stroke="#06b6d4" strokeWidth="1.2" />
          <line x1="-8" y1="10" x2="-14" y2="18" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="8" y1="10" x2="14" y2="18" stroke="#38bdf8" strokeWidth="1.5" />
          {/* Segment 1 */}
          <line x1="0" y1="-10" x2="12" y2="-28" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="-28" r="3" fill="#67e8f9" />
          {/* Segment 2 */}
          <line x1="12" y1="-28" x2="28" y2="-40" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="28" cy="-40" r="2.5" fill="#38bdf8" style={{ filter: "drop-shadow(0 0 6px #38bdf8)" }} />
        </g>

        {/* Arm 4: Bottom-Right */}
        <g transform="translate(215,215)" className="arm-robot-4">
          <rect x="-14" y="-10" width="28" height="20" rx="5" fill="rgba(24,18,48,0.95)" stroke="#6366f1" strokeWidth="1.2" />
          <line x1="-8" y1="10" x2="-14" y2="18" stroke="#818cf8" strokeWidth="1.5" />
          <line x1="8" y1="10" x2="14" y2="18" stroke="#818cf8" strokeWidth="1.5" />
          {/* Segment 1 */}
          <line x1="0" y1="-10" x2="-12" y2="-28" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="-12" cy="-28" r="3" fill="#a5b4fc" />
          {/* Segment 2 */}
          <line x1="-12" y1="-28" x2="-28" y2="-40" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="-28" cy="-40" r="2.5" fill="#c4b5fd" style={{ filter: "drop-shadow(0 0 6px #c4b5fd)" }} />
        </g>

        {/* ── FRAGMENTS ATTACHING TO LOGO ── */}
        {fragments.map(f => (
          <g key={f.id}>
            <polygon points={`${f.targetX},${f.targetY - 3} ${f.targetX + 3},${f.targetY + 3} ${f.targetX - 3},${f.targetY + 3}`}
              fill={f.color} opacity="0.85" style={{ filter: `drop-shadow(0 0 4px ${f.color})` }}>
              <animate attributeName="points"
                from={`${f.startX},${f.startY - 4} ${f.startX + 4},${f.startY + 4} ${f.startX - 4},${f.startY + 4}`}
                to={`${f.targetX},${f.targetY - 3} ${f.targetX + 3},${f.targetY + 3} ${f.targetX - 3},${f.targetY + 3}`}
                dur="1.7s" fill="freeze" />
            </polygon>
          </g>
        ))}

        {/* ── SPARK PARTICLES AT WELD CONTACT ── */}
        {sparks.map(s => (
          <g key={s.id}>
            {[...Array(6)].map((_, j) => {
              const angle = (j / 6) * Math.PI * 2;
              return (
                <circle key={j}
                  className="spark"
                  cx={s.x} cy={s.y} r={1.2 + Math.random()}
                  fill={s.color}
                  style={{
                    "--sx": `${Math.cos(angle) * (10 + Math.random() * 14)}px`,
                    "--sy": `${Math.sin(angle) * (10 + Math.random() * 14)}px`,
                    filter: `drop-shadow(0 0 4px ${s.color})`,
                    animationDelay: `${j * 0.04}s`,
                  } as React.CSSProperties}
                />
              );
            })}
          </g>
        ))}

        {/* ── GRADIENTS DEFS ── */}
        <defs>
          <linearGradient id="laserViolet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(167,139,250,0.1)" />
            <stop offset="50%" stopColor="rgba(139,92,246,0.95)" />
            <stop offset="100%" stopColor="rgba(167,139,250,1)" />
          </linearGradient>
          <linearGradient id="laserBlue" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(96,165,250,0.1)" />
            <stop offset="50%" stopColor="rgba(59,130,246,0.95)" />
            <stop offset="100%" stopColor="rgba(96,165,250,1)" />
          </linearGradient>
          <linearGradient id="laserCyan" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.1)" />
            <stop offset="50%" stopColor="rgba(6,182,212,0.9)" />
            <stop offset="100%" stopColor="rgba(34,211,238,1)" />
          </linearGradient>
          <linearGradient id="laserIndigo" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(129,140,248,0.1)" />
            <stop offset="50%" stopColor="rgba(99,102,241,0.95)" />
            <stop offset="100%" stopColor="rgba(129,140,248,1)" />
          </linearGradient>
          <linearGradient id="progressLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── PAPERINO LOGO (Center Circular Neon Hologram) ── */}
      <div className="relative logo-repair-pulse z-10 w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          border: "2px solid rgba(59,130,246,0.85)",
          background: "radial-gradient(circle, rgba(15,20,50,0.95) 0%, rgba(8,5,24,0.98) 100%)",
          boxShadow: "0 0 25px rgba(59,130,246,0.85), 0 0 50px rgba(139,92,246,0.65), 0 0 85px rgba(59,130,246,0.4), inset 0 0 15px rgba(59,130,246,0.5)",
          backdropFilter: "blur(8px)",
          animationDuration: "2.5s",
        }}>
        <Logo className="w-full h-full object-cover scale-110" />

        {/* Holographic overlay */}
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(96,165,250,0.3) 0%, transparent 60%), linear-gradient(135deg, rgba(139,92,246,0.2) 0%, transparent 50%, rgba(59,130,246,0.2) 100%)",
            mixBlendMode: "overlay",
          }} />
      </div>
    </div>
  );
}

