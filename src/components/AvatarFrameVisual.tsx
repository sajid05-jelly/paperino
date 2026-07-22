"use client";

import React from "react";

interface AvatarFrameVisualProps {
  frameId: string;
  size: number;
  children: React.ReactNode;
}

export default function AvatarFrameVisual({ frameId, size, children }: AvatarFrameVisualProps) {
  // Padding helper to ensure avatar content fits perfectly within the custom frame borders
  const padClass = frameId === "none" ? "p-0" : "p-[6%]";

  return (
    <div className="relative w-full h-full flex items-center justify-center">
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
            {/* Common Filters */}
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="heavyGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradients */}
            <linearGradient id="classicGlass" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="purpleEnergy" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            <linearGradient id="neonTrack" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            <linearGradient id="scholarMagic" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>

            <linearGradient id="galaxyNebula" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#d946ef" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            <linearGradient id="fireFlame" x1="0" y1="64" x2="0" y2="0">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="40%" stopColor="#f97316" />
              <stop offset="80%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="iceFrost" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="hologramRainbow" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="75%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            <linearGradient id="diamondCrys" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#bae6fd" />
              <stop offset="70%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>

            <linearGradient id="bronzeMetal" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <linearGradient id="silverMetal" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <linearGradient id="goldMetal" x1="0" y1="0" x2="64" y2="64">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#eab308" />
              <stop offset="70%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>

            {/* Sweep Shine Animation */}
            <linearGradient id="shineSweep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Render individual frame layers based on ID */}
          {frameId === "classic" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#classicGlass)" strokeWidth="2.5" />
              <circle cx="32" cy="32" r="27.5" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
            </>
          )}

          {frameId === "purple-glow" && (
            <>
              {/* Pulsing energy background */}
              <circle cx="32" cy="32" r="29" stroke="url(#purpleEnergy)" strokeWidth="3" filter="url(#softGlow)" />
              {/* Moving light accent */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="#f472b6"
                strokeWidth="1.5"
                strokeDasharray="15 80"
                className="animate-spin"
                style={{ animationDuration: "4s" }}
              />
            </>
          )}

          {frameId === "neon" && (
            <>
              {/* Cyberpunk Track */}
              <circle cx="32" cy="32" r="29" stroke="url(#neonTrack)" strokeWidth="2" strokeDasharray="38 8 16 8" />
              {/* Segmented glows */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="4 60"
                className="animate-spin"
                style={{ animationDuration: "2s" }}
                filter="url(#softGlow)"
              />
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4 60"
                className="animate-spin"
                style={{ animationDuration: "3s", animationDirection: "reverse" }}
                filter="url(#softGlow)"
              />
            </>
          )}

          {frameId === "scholar" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#scholarMagic)" strokeWidth="3" />
              {/* Glowing Rune Symbols */}
              <g filter="url(#softGlow)" stroke="#a5b4fc" strokeWidth="1">
                {/* Ancient diamond stars */}
                <path d="M32 5 L33 8 L32 11 L31 8 Z" />
                <path d="M32 53 L33 56 L32 59 L31 56 Z" />
                <path d="M5 32 L8 33 L11 32 L8 31 Z" />
                <path d="M53 32 L56 33 L59 32 L56 31 Z" />
              </g>
              <circle cx="32" cy="32" r="27" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2 6" opacity="0.4" />
            </>
          )}

          {frameId === "galaxy" && (
            <>
              {/* Cosmic dust ring */}
              <circle cx="32" cy="32" r="29" stroke="url(#galaxyNebula)" strokeWidth="3.5" filter="url(#softGlow)" />
              {/* Tiny orbiting nebula stars */}
              <g className="animate-spin" style={{ animationDuration: "12s" }}>
                <circle cx="12" cy="18" r="1.5" fill="#ffffff" filter="url(#softGlow)" />
                <circle cx="52" cy="46" r="1" fill="#bae6fd" />
                <circle cx="48" cy="12" r="1.2" fill="#fbcfe8" filter="url(#softGlow)" />
              </g>
            </>
          )}

          {frameId === "fire" && (
            <>
              {/* Shaded base ring */}
              <circle cx="32" cy="32" r="29" stroke="#7f1d1d" strokeWidth="2.5" />
              {/* Fire sparks and flames */}
              <g filter="url(#softGlow)">
                {/* Bottom left flame */}
                <path d="M12 48 C6 38, 14 36, 10 24 C14 30, 16 38, 14 46 Z" fill="url(#fireFlame)" />
                {/* Bottom right flame */}
                <path d="M52 48 C58 38, 50 36, 54 24 C50 30, 48 38, 50 46 Z" fill="url(#fireFlame)" />
                {/* Top flame */}
                <path d="M32 4 C26 12, 38 12, 32 20 C36 14, 34 8, 32 4 Z" fill="url(#fireFlame)" />
              </g>
            </>
          )}

          {frameId === "ice" && (
            <>
              {/* Frozen base */}
              <circle cx="32" cy="32" r="29" stroke="url(#iceFrost)" strokeWidth="2" />
              {/* Crystallized Ice Shards */}
              <g fill="url(#iceFrost)" stroke="#e0f2fe" strokeWidth="0.5">
                {/* Crystal shard 1 */}
                <polygon points="6,32 10,26 14,32 10,38" />
                {/* Crystal shard 2 */}
                <polygon points="58,32 54,26 50,32 54,38" />
                {/* Crystal shard 3 */}
                <polygon points="32,6 26,10 32,14 38,10" />
                {/* Crystal shard 4 */}
                <polygon points="32,58 26,54 32,50 38,54" />
              </g>
            </>
          )}

          {frameId === "rainbow" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#hologramRainbow)" strokeWidth="3" />
              {/* Rotating shine overlay to simulate light sweep */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="url(#shineSweep)"
                strokeWidth="3.5"
                className="animate-spin"
                style={{ animationDuration: "5s" }}
              />
            </>
          )}

          {frameId === "diamond" && (
            <>
              {/* Diamond Facets */}
              <circle cx="32" cy="32" r="29" stroke="url(#diamondCrys)" strokeWidth="3.5" />
              {/* Inner bevel ring */}
              <circle cx="32" cy="32" r="27.2" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5" />
              {/* Diagonal refraction splits */}
              <g stroke="#ffffff" strokeWidth="0.8" opacity="0.7">
                <line x1="11" y1="11" x2="14" y2="14" />
                <line x1="53" y1="11" x2="50" y2="14" />
                <line x1="11" y1="53" x2="14" y2="50" />
                <line x1="53" y1="53" x2="50" y2="50" />
              </g>
              {/* Glitter sparkle */}
              <g className="animate-pulse" style={{ animationDuration: "1.5s" }}>
                <path d="M50 15 L52 17 L50 19 L48 17 Z" fill="#ffffff" filter="url(#softGlow)" />
                <path d="M14 45 L16 47 L14 49 L12 47 Z" fill="#ffffff" filter="url(#softGlow)" />
              </g>
            </>
          )}

          {frameId === "minimal" && (
            <>
              <circle cx="32" cy="32" r="29.5" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
              <circle cx="32" cy="32" r="28.5" stroke="#000000" strokeWidth="1.2" opacity="0.7" />
            </>
          )}

          {frameId === "bronze" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#bronzeMetal)" strokeWidth="3.5" />
              {/* Inner details */}
              <circle cx="32" cy="32" r="27.2" stroke="#f59e0b" strokeWidth="0.5" opacity="0.4" />
              {/* Rivets */}
              <g fill="#f59e0b" opacity="0.8">
                <circle cx="32" cy="6.5" r="0.8" />
                <circle cx="32" cy="57.5" r="0.8" />
                <circle cx="6.5" cy="32" r="0.8" />
                <circle cx="57.5" cy="32" r="0.8" />
              </g>
            </>
          )}

          {frameId === "silver" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#silverMetal)" strokeWidth="3.5" />
              {/* Highlight sweep */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="url(#shineSweep)"
                strokeWidth="4"
                className="animate-spin"
                style={{ animationDuration: "4s" }}
              />
            </>
          )}

          {frameId === "gold" && (
            <>
              <circle cx="32" cy="32" r="29" stroke="url(#goldMetal)" strokeWidth="3.5" />
              <circle cx="32" cy="32" r="27" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" />
              {/* Highlight sweep */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="url(#shineSweep)"
                strokeWidth="4"
                className="animate-spin"
                style={{ animationDuration: "3s" }}
              />
            </>
          )}

          {frameId === "legendary" && (
            <>
              {/* Base Gold Ring */}
              <circle cx="32" cy="32" r="29" stroke="url(#goldMetal)" strokeWidth="4" />
              {/* Moving shine */}
              <circle
                cx="32"
                cy="32"
                r="29"
                stroke="url(#shineSweep)"
                strokeWidth="4.5"
                className="animate-spin"
                style={{ animationDuration: "3s" }}
              />

              {/* Floating Crown sits above, aligned nicely */}
              <g transform="translate(18, -12) scale(0.45)" filter="url(#softGlow)">
                {/* Crown Shape */}
                <polygon points="12,48 52,48 58,26 44,36 32,16 20,36 6,26" fill="url(#goldMetal)" stroke="#ffffff" strokeWidth="1.5" />
                {/* Crown Gems */}
                <circle cx="14" cy="42" r="2.5" fill="#ef4444" />
                <circle cx="32" cy="42" r="3.5" fill="#3b82f6" />
                <circle cx="50" cy="42" r="2.5" fill="#ef4444" />
                <circle cx="32" cy="16" r="2" fill="#ffffff" />
                <circle cx="6" cy="26" r="1.5" fill="#ffffff" />
                <circle cx="58" cy="26" r="1.5" fill="#ffffff" />
              </g>

              {/* Golden sparkles / star particles */}
              <g className="animate-pulse" style={{ animationDuration: "2s" }}>
                <path d="M12 24 L14 26 L12 28 L10 26 Z" fill="#fef08a" />
                <path d="M52 24 L54 26 L52 28 L50 26 Z" fill="#fef08a" />
              </g>
            </>
          )}
        </svg>
      )}
    </div>
  );
}
