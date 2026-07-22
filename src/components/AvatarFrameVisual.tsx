"use client";

import React from "react";

interface AvatarFrameVisualProps {
  frameId: string;
  size: number;
  children: React.ReactNode;
}

export default function AvatarFrameVisual({ frameId, size, children }: AvatarFrameVisualProps) {
  // Padding adjusted to 10% to prevent the thicker frames from clipping the inner avatar icon
  const padClass = frameId === "none" ? "p-0" : "p-[10%]";

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      {/* Inner Avatar Content */}
      <div className={`w-full h-full rounded-full overflow-hidden ${padClass} flex items-center justify-center z-0`}>
        {children}
      </div>

      {/* Frame Visual Overlay */}
      {frameId !== "none" && (
        <svg
          viewBox="0 0 64 64"
          className="absolute inset-0 w-full h-full z-10 pointer-events-none overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Thicker AAA Glow Filters for realistic bloom */}
            <filter id="aaaBloom" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="6" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <filter id="intenseBloom" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feGaussianBlur stdDeviation="12" result="blur3" />
              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Specular Metallic Gradients */}
            <linearGradient id="aaaClassic" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="25%" stopColor="#cbd5e1" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#475569" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="aaaPurpleEnergy" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="30%" stopColor="#c084fc" />
              <stop offset="70%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            <linearGradient id="aaaNeon" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="35%" stopColor="#a855f7" />
              <stop offset="70%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="aaaScholar" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>

            <linearGradient id="aaaGalaxy" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#d946ef" />
              <stop offset="30%" stopColor="#6d28d9" />
              <stop offset="70%" stopColor="#db2777" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            <linearGradient id="aaaFire" x1="0" y1="64" x2="0" y2="0">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="30%" stopColor="#ea580c" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="85%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <linearGradient id="aaaIce" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#7dd3fc" />
              <stop offset="70%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>

            <linearGradient id="aaaRainbow" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="20%" stopColor="#38bdf8" />
              <stop offset="40%" stopColor="#34d399" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="80%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>

            <linearGradient id="aaaDiamond" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="75%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <linearGradient id="aaaBronze" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="80%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="aaaSilver" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="75%" stopColor="#475569" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <linearGradient id="aaaGold" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="25%" stopColor="#ca8a04" />
              <stop offset="50%" stopColor="#fef08a" />
              <stop offset="75%" stopColor="#854d0e" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Shine sweep pattern */}
            <linearGradient id="aaaShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. Classic Glass */}
          {frameId === "classic" && (
            <>
              {/* Outer rim */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaClassic)" strokeWidth="4.5" />
              {/* Depth inner line */}
              <circle cx="32" cy="32" r="26.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
            </>
          )}

          {frameId === "purple-glow" && (
            <>
              {/* Deep bloom underlay */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaPurpleEnergy)" strokeWidth="5.5" filter="url(#aaaBloom)" opacity="0.6" />
              {/* Glowing core rim */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaPurpleEnergy)" strokeWidth="4.5" />
              {/* Shifting inner highlight */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="20 70"
                className="animate-spin"
                style={{ animationDuration: "3s" }}
                opacity="0.9"
              />
            </>
          )}

          {frameId === "neon" && (
            <>
              {/* Segmented base tracks for high contrast */}
              <circle cx="32" cy="32" r="29" stroke="#111827" strokeWidth="5" />
              {/* Cyber Glow outer track */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaNeon)" strokeWidth="4.5" strokeDasharray="30 15 20 15" filter="url(#aaaBloom)" />
              {/* Electric energy points rotating */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="#22d3ee"
                strokeWidth="2.5"
                strokeDasharray="6 80"
                className="animate-spin"
                style={{ animationDuration: "2s" }}
                filter="url(#intenseBloom)"
              />
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="#ec4899"
                strokeWidth="2.5"
                strokeDasharray="6 80"
                className="animate-spin"
                style={{ animationDuration: "3.5s", animationDirection: "reverse" }}
                filter="url(#intenseBloom)"
              />
            </>
          )}

          {frameId === "scholar" && (
            <>
              {/* Base Runes Ring */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaScholar)" strokeWidth="4.5" />
              {/* Glowing Rune Symbols Rotating */}
              <g className="animate-spin" style={{ animationDuration: "12s" }} filter="url(#aaaBloom)">
                {/* Mystic Glyphs at angles */}
                <polygon points="32,4 34,7 32,10 30,7" fill="#a5b4fc" />
                <polygon points="32,54 34,57 32,60 30,57" fill="#a5b4fc" />
                <polygon points="4,32 7,34 10,32 7,30" fill="#a5b4fc" />
                <polygon points="54,32 57,34 60,32 57,30" fill="#a5b4fc" />
                {/* Diagonal Runes */}
                <circle cx="12" cy="12" r="2" fill="#a5b4fc" />
                <circle cx="52" cy="12" r="2" fill="#a5b4fc" />
                <circle cx="12" cy="52" r="2" fill="#a5b4fc" />
                <circle cx="52" cy="52" r="2" fill="#a5b4fc" />
              </g>
              {/* Outer boundary runes circle */}
              <circle cx="32" cy="32" r="31" stroke="#818cf8" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.6" />
            </>
          )}

          {frameId === "galaxy" && (
            <>
              {/* High thickness Nebula */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaGalaxy)" strokeWidth="5.5" filter="url(#aaaBloom)" />
              {/* Floating stars & cosmic dust */}
              <circle cx="32" cy="32" r="31" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2 12" opacity="0.8" />
              {/* Tiny orbiting planets */}
              <g className="animate-spin" style={{ animationDuration: "8s" }}>
                {/* Planet 1 with ring */}
                <circle cx="14" cy="18" r="2.5" fill="#f472b6" filter="url(#aaaBloom)" />
                <ellipse cx="14" cy="18" rx="4" ry="1.2" stroke="#ffffff" strokeWidth="0.5" opacity="0.8" transform="rotate(-15 14 18)" />
                {/* Planet 2 */}
                <circle cx="50" cy="46" r="2" fill="#38bdf8" filter="url(#aaaBloom)" />
              </g>
            </>
          )}

          {frameId === "fire" && (
            <>
              {/* Dark ember base */}
              <circle cx="32" cy="32" r="29" stroke="#450a0a" strokeWidth="4.5" />
              {/* Real animated flames and glowing embers wrapping border */}
              <g filter="url(#aaaBloom)">
                {/* Left Flame */}
                <path d="M12 44 C4 30, 16 28, 8 16 C14 24, 18 32, 14 44 Z" fill="url(#aaaFire)" />
                {/* Right Flame */}
                <path d="M52 44 C60 30, 48 28, 56 16 C50 24, 46 32, 50 44 Z" fill="url(#aaaFire)" />
                {/* Top Flame */}
                <path d="M32 4 C24 14, 40 14, 32 24 C38 16, 36 8, 32 4 Z" fill="url(#aaaFire)" />
                {/* Embers */}
                <g className="animate-pulse" style={{ animationDuration: "1.2s" }}>
                  <circle cx="16" cy="18" r="1.5" fill="#facc15" />
                  <circle cx="48" cy="18" r="1" fill="#f97316" />
                  <circle cx="20" cy="48" r="1.2" fill="#ffffff" />
                  <circle cx="44" cy="48" r="1.5" fill="#facc15" />
                </g>
              </g>
            </>
          )}

          {frameId === "ice" && (
            <>
              {/* Frozen crystalline ring */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaIce)" strokeWidth="4.5" />
              {/* Ice shards protruding outward */}
              <g fill="url(#aaaIce)" stroke="#ffffff" strokeWidth="0.8">
                <polygon points="4,32 10,24 16,32 10,40" filter="url(#aaaBloom)" />
                <polygon points="60,32 54,24 48,32 54,40" filter="url(#aaaBloom)" />
                <polygon points="32,4 24,10 32,16 40,10" filter="url(#aaaBloom)" />
                <polygon points="32,60 24,54 32,48 40,54" filter="url(#aaaBloom)" />
              </g>
              {/* Frost particles */}
              <g className="animate-pulse" style={{ animationDuration: "2.5s" }}>
                <circle cx="16" cy="16" r="1.2" fill="#ffffff" />
                <circle cx="48" cy="16" r="1" fill="#e0f2fe" />
                <circle cx="16" cy="48" r="1" fill="#e0f2fe" />
                <circle cx="48" cy="48" r="1.2" fill="#ffffff" />
              </g>
            </>
          )}

          {frameId === "rainbow" && (
            <>
              {/* Iridescent thickness base */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaRainbow)" strokeWidth="4.5" />
              {/* Glowing highlights */}
              <circle cx="32" cy="32" r="31" stroke="#ffffff" strokeWidth="0.5" opacity="0.4" />
              {/* Shifting light sweep */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="url(#aaaShine)"
                strokeWidth="5"
                className="animate-spin"
                style={{ animationDuration: "4s" }}
              />
            </>
          )}

          {frameId === "diamond" && (
            <>
              {/* Outer beveled diamond structure */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaDiamond)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26.5" stroke="#bae6fd" strokeWidth="0.8" opacity="0.6" />
              {/* Sparkling Points */}
              <g className="animate-pulse" style={{ animationDuration: "1.8s" }} filter="url(#aaaBloom)">
                <path d="M48 14 L51 17 L48 20 L45 17 Z" fill="#ffffff" />
                <path d="M16 48 L19 51 L16 54 L13 51 Z" fill="#ffffff" />
                <path d="M50 48 L52 50 L50 52 L48 50 Z" fill="#93c5fd" />
                <path d="M14 14 L16 16 L14 18 L12 16 Z" fill="#93c5fd" />
              </g>
              {/* Bevel lines */}
              <g stroke="#ffffff" strokeWidth="0.5" opacity="0.5">
                <line x1="32" y1="2" x2="32" y2="7" />
                <line x1="32" y1="57" x2="32" y2="62" />
                <line x1="2" y1="32" x2="7" y2="32" />
                <line x1="57" y1="32" x2="62" y2="32" />
              </g>
            </>
          )}

          {frameId === "minimal" && (
            <>
              {/* Apple-style smooth matte ring */}
              <circle cx="32" cy="32" r="29.5" stroke="#e2e8f0" strokeWidth="4.5" />
              <circle cx="32" cy="32" r="27" stroke="#1e293b" strokeWidth="1" opacity="0.8" />
            </>
          )}

          {frameId === "bronze" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#aaaBronze)" strokeWidth="5.5" />
              {/* Engraved inner ring */}
              <circle cx="32" cy="32" r="26.5" stroke="#78350f" strokeWidth="1.2" />
              {/* Structural rivets */}
              <g fill="#f59e0b" opacity="0.9">
                <circle cx="32" cy="5" r="1.2" />
                <circle cx="32" cy="59" r="1.2" />
                <circle cx="5" cy="32" r="1.2" />
                <circle cx="59" cy="32" r="1.2" />
                <circle cx="12.9" cy="12.9" r="1" />
                <circle cx="51.1" cy="12.9" r="1" />
                <circle cx="12.9" cy="51.1" r="1" />
                <circle cx="51.1" cy="51.1" r="1" />
              </g>
            </>
          )}

          {frameId === "silver" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#aaaSilver)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26.5" stroke="#475569" strokeWidth="0.8" opacity="0.5" />
              {/* Mirror shine sweep */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="url(#aaaShine)"
                strokeWidth="5.5"
                className="animate-spin"
                style={{ animationDuration: "3.5s" }}
              />
            </>
          )}

          {frameId === "gold" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#aaaGold)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26.5" stroke="#b45309" strokeWidth="0.8" opacity="0.4" />
              {/* Gold light sweep */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="url(#aaaShine)"
                strokeWidth="5.5"
                className="animate-spin"
                style={{ animationDuration: "2.8s" }}
              />
            </>
          )}

          {frameId === "legendary" && (
            <>
              {/* Underlay glow aura */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaGold)" strokeWidth="6.5" filter="url(#intenseBloom)" opacity="0.5" />
              {/* Base Gold Frame */}
              <circle cx="32" cy="32" r="29" stroke="url(#aaaGold)" strokeWidth="5" />
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="url(#aaaShine)"
                strokeWidth="5.5"
                className="animate-spin"
                style={{ animationDuration: "2.5s" }}
              />

              {/* Large royal golden crown sitting on top */}
              <g transform="translate(14, -18) scale(0.55)" filter="url(#aaaBloom)" className="overflow-visible">
                {/* Crown Body */}
                <polygon points="12,48 52,48 58,22 44,34 32,12 20,34 6,22" fill="url(#aaaGold)" stroke="#ffffff" strokeWidth="1.5" />
                {/* Crown Base Band */}
                <rect x="12" y="44" width="40" height="4" fill="#854d0e" />
                {/* Crown Gemstones */}
                <circle cx="14" cy="40" r="3.5" fill="#ef4444" filter="url(#softGlow)" />
                <circle cx="32" cy="40" r="4.5" fill="#3b82f6" filter="url(#softGlow)" />
                <circle cx="50" cy="40" r="3.5" fill="#ef4444" filter="url(#softGlow)" />
                {/* Floating gemstone above spikes */}
                <circle cx="32" cy="12" r="2.5" fill="#eab308" filter="url(#softGlow)" />
                <circle cx="6" cy="22" r="2" fill="#ffffff" />
                <circle cx="58" cy="22" r="2" fill="#ffffff" />
              </g>

              {/* Sparkling star particles */}
              <g className="animate-pulse" style={{ animationDuration: "1.5s" }} filter="url(#aaaBloom)">
                <path d="M10 22 L12 24 L10 26 L8 24 Z" fill="#fef08a" />
                <path d="M54 22 L56 24 L54 26 L52 24 Z" fill="#fef08a" />
                <path d="M32 50 L34 52 L32 54 L30 52 Z" fill="#ffffff" />
              </g>
            </>
          )}
        </svg>
      )}
    </div>
  );
}
