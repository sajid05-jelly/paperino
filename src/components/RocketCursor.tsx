"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Rocket geometry constants ─────────────────────────────────── */
const W = 30;      // SVG viewport width
const H = 44;      // SVG viewport height
const TIP_X = 15;  // nose tip x in SVG coords (center)
const TIP_Y = 1;   // nose tip y in SVG coords (near top)

/* ─── Particle type ─────────────────────────────────────────────── */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  hue: number; r: number;
}

/* ─── Rocket SVG — pure SVG, no JSX comments inside ──────────────── */
function RocketSvg() {
  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      overflow="visible"
    >
      <defs>
        <linearGradient id="rk-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="rk-nose" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <radialGradient id="rk-win" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#ede9fe" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </radialGradient>
        <radialGradient id="rk-flame" cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#f97316" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <filter id="rk-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#rk-glow)">
        {/* Left fin */}
        <path d="M8 25 L1 37 L8 33 Z" fill="#5b21b6" opacity="0.95" />
        {/* Right fin */}
        <path d="M22 25 L29 37 L22 33 Z" fill="#5b21b6" opacity="0.95" />

        {/* Body */}
        <path d="M15 1 L23 15 L23 32 L15 36 L7 32 L7 15 Z" fill="url(#rk-body)" />

        {/* Nose cone */}
        <path d="M15 1 L23 15 L7 15 Z" fill="url(#rk-nose)" />
        {/* Nose highlight (paper-fold crease) */}
        <path d="M15 1 L19 11 L15 13 L11 11 Z" fill="#ddd6fe" opacity="0.45" />

        {/* Engine ring */}
        <rect x="11" y="31" width="8" height="5" rx="2" fill="#4c1d95" />

        {/* Window outer ring */}
        <circle cx="15" cy="23" r="5" fill="none" stroke="#c4b5fd" strokeWidth="0.8" opacity="0.5" />
        {/* Window glass */}
        <circle cx="15" cy="23" r="4" fill="url(#rk-win)" />
        {/* Window glare */}
        <circle cx="13" cy="21" r="1.2" fill="white" opacity="0.55" />

        {/* Flame */}
        <ellipse cx="15" cy="40" rx="4.5" ry="6" fill="url(#rk-flame)" />
      </g>
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function RocketCursor() {
  const [active, setActive] = useState(false);

  const rocketRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* all animation state in refs — no React re-renders in the loop */
  const mouse      = useRef({ x: -400, y: -400 });
  const smooth     = useRef({ x: -400, y: -400 });
  const prev       = useRef({ x: -400, y: -400 });
  const visible    = useRef(false);
  const hovering   = useRef(false);
  const rafId      = useRef<number>(0);
  const particles  = useRef<Particle[]>([]);
  const lastSpawn  = useRef(0);
  const noMotion   = useRef(false);

  useEffect(() => {
    /* ── Desktop + fine-pointer check ── */
    const ptrFine  = window.matchMedia("(pointer: fine)").matches;
    const wide     = window.innerWidth >= 1024;
    noMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!ptrFine || !wide) return; // mobile / tablet — do nothing

    setActive(true);

    /* ── Hide native cursor globally ── */
    const styleTag = document.createElement("style");
    styleTag.id    = "__rk-cursor";
    styleTag.textContent = `*, *::before, *::after { cursor: none !important; }`;
    document.head.appendChild(styleTag);

    /* ── Event handlers ── */
    const onMove = (e: MouseEvent) => {
      prev.current = { ...mouse.current };
      mouse.current = { x: e.clientX, y: e.clientY };
      visible.current = true;
    };
    const onLeave  = () => { visible.current = false; };
    const onEnter  = () => { visible.current = true; };

    const HOVER_SEL =
      "a, button, [role='button'], input, select, textarea, label, " +
      "[tabindex], [class*='glass'], [class*='card'], [class*='btn']";

    const onOver = (e: MouseEvent) => {
      hovering.current = !!(e.target as HTMLElement)?.closest(HOVER_SEL);
    };

    document.addEventListener("mousemove",  onMove,  { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseover",  onOver,  { passive: true });

    /* ── Resize canvas ── */
    const resizeCanvas = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    /* ── RAF animation loop ── */
    const loop = (ts: number) => {
      /* smooth lerp (0.18 = slightly snappy) */
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.18;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.18;

      const posX = smooth.current.x - TIP_X;
      const posY = smooth.current.y - TIP_Y;

      /* — move rocket div — */
      const el = rocketRef.current;
      if (el) {
        el.style.transform = `translate(${posX}px, ${posY}px)`;
        el.style.opacity   = visible.current ? "1" : "0";

        const inner = el.firstElementChild as HTMLElement | null;
        if (inner) {
          if (hovering.current) {
            inner.style.transform = "scale(1.35)";
            inner.style.filter    =
              "drop-shadow(0 0 10px rgba(139,92,246,0.95)) " +
              "drop-shadow(0 0 20px rgba(167,139,250,0.5))";
          } else {
            inner.style.transform = "scale(1)";
            inner.style.filter    =
              "drop-shadow(0 0 5px rgba(139,92,246,0.7))";
          }
        }
      }

      /* — particle trail — */
      if (!noMotion.current) {
        const canvas = canvasRef.current;
        const ctx    = canvas?.getContext("2d");

        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const speed = Math.hypot(
            mouse.current.x - prev.current.x,
            mouse.current.y - prev.current.y
          );

          /* spawn new particle */
          if (ts - lastSpawn.current > 25 && speed > 1.5 && visible.current) {
            lastSpawn.current = ts;
            particles.current.push({
              x: smooth.current.x + (Math.random() - 0.5) * 5,
              y: smooth.current.y + 10 + Math.random() * 6,  // trail behind tip
              vx: (Math.random() - 0.5) * 1.0,
              vy: Math.random() * 0.9 + 0.3,
              life: 0,
              maxLife: 22 + Math.floor(Math.random() * 18),
              hue: 245 + Math.floor(Math.random() * 60),  // violet → blue
              r: Math.random() * 2.2 + 0.6,
            });

            if (particles.current.length > 38) particles.current.shift();
          }

          /* draw & age particles */
          for (let i = particles.current.length - 1; i >= 0; i--) {
            const p = particles.current[i];
            p.life++;
            p.x += p.vx;
            p.y += p.vy;

            if (p.life >= p.maxLife) { particles.current.splice(i, 1); continue; }

            const t   = 1 - p.life / p.maxLife;
            const rad = p.r * (0.4 + t * 0.6);
            const alp = t * 0.65;

            /* glowing particle */
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 2.5);
            grad.addColorStop(0,   `hsla(${p.hue}, 85%, 80%, ${alp})`);
            grad.addColorStop(0.5, `hsla(${p.hue}, 70%, 65%, ${alp * 0.5})`);
            grad.addColorStop(1,   `hsla(${p.hue}, 60%, 55%, 0)`);

            ctx.beginPath();
            ctx.arc(p.x, p.y, rad * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
          }
        }
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(rafId.current);
      document.removeEventListener("mousemove",  onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseover",  onOver);
      window.removeEventListener("resize", resizeCanvas);
      document.getElementById("__rk-cursor")?.remove();
    };
  }, []);

  if (!active) return null;

  return (
    <>
      {/* Particle trail canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none select-none"
        style={{ zIndex: 99996 }}
        aria-hidden="true"
      />

      {/* Rocket cursor */}
      <div
        ref={rocketRef}
        className="fixed top-0 left-0 pointer-events-none select-none"
        style={{
          zIndex: 99997,
          willChange: "transform",
          opacity: 0,
          transition: "opacity 0.15s ease",
        }}
        aria-hidden="true"
      >
        {/* Inner wrapper handles scale + glow transitions */}
        <div
          style={{
            transformOrigin: `${TIP_X}px ${TIP_Y}px`,
            transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), filter 0.18s ease",
            filter: "drop-shadow(0 0 5px rgba(139,92,246,0.7))",
          }}
        >
          <RocketSvg />
        </div>
      </div>
    </>
  );
}
