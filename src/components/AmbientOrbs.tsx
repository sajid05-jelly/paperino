"use client";

import { useEffect, useState } from "react";

export default function AmbientOrbs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Mobile-optimized lightweight static ambient glow (no blur filter, zero compositing overhead) */}
      <div className="sm:hidden absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_15%_20%,rgba(var(--primary-rgb),0.08)_0%,transparent_50%),radial-gradient(circle_at_85%_70%,rgba(var(--secondary-rgb),0.06)_0%,transparent_50%)]" />

      {/* Desktop / Tablet Ambient Orbs */}
      <div className="hidden sm:block absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.15)_0%,transparent_60%)] blur-[60px] md:blur-[100px] animate-blob md:mix-blend-screen" />
      <div className="hidden sm:block absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.12)_0%,transparent_60%)] blur-[60px] md:blur-[100px] animate-blob animation-delay-2000 md:mix-blend-screen" />
      <div className="hidden sm:block absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.1)_0%,transparent_60%)] blur-[70px] md:blur-[120px] animate-blob animation-delay-4000 md:mix-blend-screen" />
      
      {/* Noise Texture Overlay */}
      <div className="hidden md:block absolute inset-0 opacity-[0.015] bg-[url('/noise.png')] mix-blend-overlay" />
    </div>
  );
}
