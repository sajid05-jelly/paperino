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
      {/* Primary Orb */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.15)_0%,transparent_60%)] blur-[100px] animate-blob mix-blend-screen" />
      
      {/* Secondary Orb */}
      <div className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.12)_0%,transparent_60%)] blur-[100px] animate-blob animation-delay-2000 mix-blend-screen" />
      
      {/* Accent Orb */}
      <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.1)_0%,transparent_60%)] blur-[120px] animate-blob animation-delay-4000 mix-blend-screen" />
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.015] bg-[url('/noise.png')] mix-blend-overlay" />
    </div>
  );
}
