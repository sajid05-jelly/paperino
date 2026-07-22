"use client";

import React from "react";

interface CompanionVisualProps {
  id: string;
  className?: string;
  size?: number;
}

export default function CompanionVisual({ id, className = "w-12 h-12", size }: CompanionVisualProps) {
  const finalStyle = size ? { width: size, height: size } : undefined;

  switch (id) {
    case "paper-duck":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="duckGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#701a75" />
            </linearGradient>
            <linearGradient id="duckGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
            <linearGradient id="duckGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id="duckBeak" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          {/* Origami Shards for Body */}
          <polygon points="12,44 48,44 40,28 18,28" fill="url(#duckGrad1)" opacity="0.9" />
          <polygon points="40,28 48,44 54,34 46,24" fill="url(#duckGrad2)" />
          {/* Wing shard */}
          <polygon points="20,32 38,32 32,42 16,40" fill="url(#duckGrad3)" opacity="0.85" />
          {/* Tail */}
          <polygon points="12,44 6,36 18,28" fill="url(#duckGrad2)" opacity="0.7" />
          {/* Neck */}
          <polygon points="40,28 46,24 44,14 36,18" fill="url(#duckGrad1)" />
          {/* Head */}
          <polygon points="44,14 52,14 48,6 40,8" fill="url(#duckGrad2)" />
          {/* Beak */}
          <polygon points="52,14 58,16 50,18" fill="url(#duckBeak)" />
          {/* Neon Highlights */}
          <line x1="18" y1="28" x2="40" y2="28" stroke="#f472b6" strokeWidth="1" opacity="0.8" />
          <line x1="40" y1="28" x2="48" y2="44" stroke="#f472b6" strokeWidth="1" opacity="0.8" />
          <circle cx="45" cy="10" r="1.5" fill="#22d3ee" />
        </svg>
      );

    case "floating-book":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id="bookPages" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#e9d5ff" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Book base / Cover */}
          <path d="M12 40 L32 46 L52 40 L50 20 L32 26 L14 20 Z" fill="url(#bookCover)" />
          {/* Pages left side */}
          <path d="M15 21 L32 27 L32 45 L15 39 Z" fill="url(#bookPages)" opacity="0.9" />
          {/* Pages right side */}
          <path d="M32 27 L49 21 L49 39 L32 45 Z" fill="url(#bookPages)" opacity="0.9" />
          {/* Binding Center line */}
          <line x1="32" y1="27" x2="32" y2="45" stroke="#a855f7" strokeWidth="2" />
          {/* Glowing Magic Ribbons / Runes */}
          <path d="M32 26 C36 16, 28 8, 32 4" stroke="#22d3ee" strokeWidth="1.5" filter="url(#glow)" strokeDasharray="3 3" />
          <path d="M22 23 C18 16, 24 10, 20 6" stroke="#f472b6" strokeWidth="1" filter="url(#glow)" />
          <path d="M42 23 C46 16, 40 10, 44 6" stroke="#f472b6" strokeWidth="1" filter="url(#glow)" />
        </svg>
      );

    case "lucky-star":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="starGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <linearGradient id="starGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
          </defs>
          {/* 3D Segmented Star */}
          <g>
            {/* Top spike */}
            <polygon points="32,8 32,32 39,24" fill="url(#starGrad1)" />
            <polygon points="32,8 32,32 25,24" fill="url(#starGrad2)" />
            {/* Right spike */}
            <polygon points="56,24 32,32 44,36" fill="url(#starGrad1)" />
            <polygon points="56,24 32,32 39,24" fill="url(#starGrad2)" />
            {/* Bottom Right spike */}
            <polygon points="46,50 32,32 32,42" fill="url(#starGrad1)" />
            <polygon points="46,50 32,32 44,36" fill="url(#starGrad2)" />
            {/* Bottom Left spike */}
            <polygon points="18,50 32,32 20,36" fill="url(#starGrad1)" />
            <polygon points="18,50 32,32 32,42" fill="url(#starGrad2)" />
            {/* Left spike */}
            <polygon points="8,24 32,32 25,24" fill="url(#starGrad1)" />
            <polygon points="8,24 32,32 20,36" fill="url(#starGrad2)" />
          </g>
          {/* Outer glowing rings */}
          <circle cx="32" cy="32" r="26" stroke="#eab308" strokeWidth="0.5" opacity="0.3" strokeDasharray="4 4" />
          <circle cx="32" cy="32" r="22" stroke="#ffffff" strokeWidth="0.5" opacity="0.2" />
        </svg>
      );

    case "butterfly":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="wingLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
            <linearGradient id="wingRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
          </defs>
          {/* Antennae */}
          <path d="M30 20 Q24 10 18 12" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M34 20 Q40 10 46 12" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
          {/* Left Wing Top */}
          <path d="M32 26 C26 14, 8 16, 12 30 C15 40, 28 34, 32 30 Z" fill="url(#wingLeft)" opacity="0.9" />
          {/* Left Wing Bottom */}
          <path d="M32 30 C28 38, 14 48, 18 52 C22 56, 30 44, 32 34 Z" fill="url(#wingLeft)" opacity="0.75" />
          {/* Right Wing Top */}
          <path d="M32 26 C38 14, 56 16, 52 30 C49 40, 36 34, 32 30 Z" fill="url(#wingRight)" opacity="0.9" />
          {/* Right Wing Bottom */}
          <path d="M32 30 C36 38, 50 48, 46 52 C42 56, 34 44, 32 34 Z" fill="url(#wingRight)" opacity="0.75" />
          {/* Glowing Wing details */}
          <circle cx="20" cy="26" r="3" fill="#22d3ee" opacity="0.8" />
          <circle cx="44" cy="26" r="3" fill="#22d3ee" opacity="0.8" />
          {/* Cyber Body */}
          <rect x="30" y="20" width="4" height="24" rx="2" fill="#ffffff" />
          <line x1="32" y1="20" x2="32" y2="44" stroke="#a855f7" strokeWidth="1" />
        </svg>
      );

    case "purple-crystal":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="crys1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="crys2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#311042" />
            </linearGradient>
            <linearGradient id="crys3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#581c87" />
            </linearGradient>
          </defs>
          {/* Main central crystal */}
          <polygon points="32,6 42,26 32,54 22,26" fill="url(#crys1)" />
          <polygon points="32,6 32,54 22,26" fill="url(#crys2)" opacity="0.4" />
          {/* Side crystal right */}
          <polygon points="40,20 48,34 38,50 32,36" fill="url(#crys3)" />
          <polygon points="40,20 38,50 32,36" fill="url(#crys2)" opacity="0.4" />
          {/* Side crystal left */}
          <polygon points="24,20 32,36 26,50 16,34" fill="url(#crys3)" />
          <polygon points="24,20 26,50 16,34" fill="url(#crys2)" opacity="0.6" />
          {/* Crystal sparklines */}
          <line x1="32" y1="6" x2="32" y2="54" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
          <line x1="24" y1="20" x2="26" y2="50" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" />
          <line x1="40" y1="20" x2="38" y2="50" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" />
        </svg>
      );

    case "electric-orb":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_14px_rgba(34,211,238,0.7)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e0f7fa" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#0891b2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
            </radialGradient>
            <filter id="lightningGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Outer Glass Sphere */}
          <circle cx="32" cy="32" r="24" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
          <circle cx="32" cy="32" r="23" fill="url(#orbGrad)" />
          {/* Lightning arcs inside */}
          <path d="M32 32 L36 20 L26 24 L32 8" stroke="#ffffff" strokeWidth="1.5" filter="url(#lightningGlow)" strokeLinecap="round" />
          <path d="M32 32 L26 38 L36 36 L30 50" stroke="#ffffff" strokeWidth="1.2" filter="url(#lightningGlow)" strokeLinecap="round" opacity="0.8" />
          <path d="M32 32 L44 30 L40 38 L50 36" stroke="#22d3ee" strokeWidth="1" filter="url(#lightningGlow)" strokeLinecap="round" opacity="0.9" />
          <path d="M32 32 L20 28 L18 36 L10 32" stroke="#22d3ee" strokeWidth="1" filter="url(#lightningGlow)" strokeLinecap="round" opacity="0.9" />
          {/* Energy core */}
          <circle cx="32" cy="32" r="6" fill="#ffffff" filter="url(#lightningGlow)" />
        </svg>
      );

    case "moon-spirit":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>
            <linearGradient id="spiritGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <filter id="spiritGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Crescent Moon */}
          <path
            d="M44 48 C30 48, 18 36, 18 22 C18 14, 22 8, 26 4 C14 8, 8 20, 8 32 C8 46, 20 58, 34 58 C42 58, 48 54, 52 48 C50 48, 46 48, 44 48 Z"
            fill="url(#moonGrad)"
          />
          {/* Spirit Fire/Flame in the crescent */}
          <path
            d="M32 36 C32 42, 42 42, 42 34 C42 24, 30 18, 34 10 C24 16, 26 28, 28 32 C30 34, 32 34, 32 36 Z"
            fill="url(#spiritGrad)"
            filter="url(#spiritGlow)"
            opacity="0.95"
          />
          {/* Floating tiny stars */}
          <circle cx="22" cy="12" r="1" fill="#ffffff" opacity="0.8" />
          <circle cx="16" cy="38" r="1.5" fill="#38bdf8" opacity="0.6" />
          <circle cx="34" cy="50" r="1" fill="#c084fc" opacity="0.7" />
        </svg>
      );

    case "mini-penguin":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="pengBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id="pengBelly" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {/* Arms / Flippers */}
          <ellipse cx="14" cy="38" rx="4" ry="12" fill="#312e81" transform="rotate(-15 14 38)" />
          <ellipse cx="50" cy="38" rx="4" ry="12" fill="#312e81" transform="rotate(15 50 38)" />
          {/* Main Body */}
          <ellipse cx="32" cy="36" rx="18" ry="22" fill="url(#pengBody)" />
          {/* White Glass Belly Plate */}
          <ellipse cx="32" cy="39" rx="12" ry="15" fill="url(#pengBelly)" />
          {/* Head details */}
          {/* Neon Orange Beak */}
          <polygon points="32,24 37,28 27,28" fill="#f97316" />
          {/* Eyes */}
          <circle cx="24" cy="20" r="2.5" fill="#22d3ee" />
          <circle cx="40" cy="20" r="2.5" fill="#22d3ee" />
          {/* Cheeks */}
          <circle cx="21" cy="23" r="2" fill="#ec4899" opacity="0.7" />
          <circle cx="43" cy="23" r="2" fill="#ec4899" opacity="0.7" />
          {/* Neon Scarf */}
          <path d="M18 30 Q32 34 46 30" stroke="#d946ef" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M42 31 L45 42" stroke="#d946ef" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case "graduation-cap":
      return (
        <svg
          viewBox="0 0 64 64"
          className={`${className} drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]`}
          style={finalStyle}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="capTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="50%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="tasselGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
          {/* Cap Base stand */}
          <path d="M22 36 L22 42 C22 45, 42 45, 42 42 L42 36 Z" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" />
          {/* Diamond top plate */}
          <polygon points="32,16 54,26 32,36 10,26" fill="url(#capTop)" stroke="#a855f7" strokeWidth="1.5" />
          {/* Neon tassel cord */}
          <path d="M32 26 Q46 28 48 38" stroke="url(#tasselGrad)" strokeWidth="1.5" />
          {/* Tassel fringe */}
          <polygon points="48,38 46,46 50,46" fill="url(#tasselGrad)" />
          {/* Tiny glowing magic particles around cap */}
          <circle cx="16" cy="18" r="1.5" fill="#facc15" />
          <circle cx="48" cy="18" r="1.5" fill="#f472b6" />
          <circle cx="32" cy="10" r="1" fill="#22d3ee" />
        </svg>
      );

    default:
      return null;
  }
}
