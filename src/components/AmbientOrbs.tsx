"use client";

import { useEffect, useState } from "react";

export default function AmbientOrbs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Primary Orb - GPU optimized on mobile viewports */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] sm:w-[40vw] h-[50vw] sm:h-[40vw] rounded-full bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.15)_0%,transparent_60%)] blur-[35px] sm:blur-[60px] md:blur-[100px] animate-blob md:mix-blend-screen will-change-transform" />
      
      {/* Secondary Orb */}
      <div className="absolute top-[20%] right-[-10%] w-[45vw] sm:w-[35vw] h-[45vw] sm:h-[35vw] rounded-full bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.12)_0%,transparent_60%)] blur-[35px] sm:blur-[60px] md:blur-[100px] animate-blob animation-delay-2000 md:mix-blend-screen will-change-transform" />
      
      {/* Accent Orb */}
      <div className="absolute bottom-[-20%] left-[20%] w-[60vw] sm:w-[50vw] h-[60vw] sm:h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.1)_0%,transparent_60%)] blur-[40px] sm:blur-[70px] md:blur-[120px] animate-blob animation-delay-4000 md:mix-blend-screen will-change-transform" />
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.01] md:opacity-[0.015] bg-[url('/noise.png')] md:mix-blend-overlay" />
    </div>
  );
}
