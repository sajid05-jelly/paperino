"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  PenTool, 
  BookOpen, 
  Bot, 
  BookOpenCheck, 
  Rocket, 
  GraduationCap, 
  Brain, 
  Sailboat, 
  Telescope, 
  Bird,
  User
} from 'lucide-react';
import { FRAMES, COMPANIONS } from '@/lib/gamification';
import CompanionVisual from './CompanionVisual';
import AvatarFrameVisual from './AvatarFrameVisual';

export type AvatarId = 
  | 'pen-paper' 
  | 'neon-notebook' 
  | 'ai-robot' 
  | 'cyber-book' 
  | 'violet-rocket' 
  | 'graduation-cap' 
  | 'hologram-brain' 
  | 'minimal-boat' 
  | 'galaxy-student' 
  | 'futuristic-owl';

interface UserAvatarProps {
  avatarId?: string | null;
  frameId?: string | null;
  companionId?: string | null;
  hideCrown?: boolean;
  className?: string;
  size?: number;
}

export const AVATARS = [
  { id: 'pen-paper', name: 'Pen & Paper', icon: PenTool, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'neon-notebook', name: 'Neon Notebook', icon: BookOpen, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
  { id: 'ai-robot', name: 'AI Robot', icon: Bot, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'cyber-book', name: 'Cyber Book', icon: BookOpenCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'violet-rocket', name: 'Violet Rocket', icon: Rocket, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { id: 'graduation-cap', name: 'Graduation Cap', icon: GraduationCap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'hologram-brain', name: 'Hologram Brain', icon: Brain, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { id: 'minimal-boat', name: 'Minimal Paper Boat', icon: Sailboat, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'galaxy-student', name: 'Galaxy Student', icon: Telescope, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 'futuristic-owl', name: 'Futuristic Owl', icon: Bird, color: 'text-rose-400', bg: 'bg-rose-500/10' },
];

export default function UserAvatar({ avatarId, frameId = "none", companionId = "none", hideCrown = false, className = "", size = 20 }: UserAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const avatar = AVATARS.find(a => a.id === avatarId);
  const frame = FRAMES.find(f => f.id === frameId);
  const companion = COMPANIONS.find(c => c.id === companionId);

  // Parse custom border colors
  let frameBorderClass = "border border-white/5";
  if (frame && frame.id !== "none") {
    frameBorderClass = `border-2 ${frame.class}`;
  }

  // Width mapping for size parameter
  const avatarWidthClass = size > 20 ? `w-20 h-20` : `w-12 h-12`;
  const iconSize = size > 20 ? 32 : 20;

  const renderIcon = () => {
    if (!avatar) {
      return <User size={iconSize} className="text-gray-400" />;
    }
    const Icon = avatar.icon;
    return (
      <div className={`w-full h-full flex items-center justify-center rounded-full ${avatar.bg} relative overflow-hidden`}>
        <div className={`absolute inset-0 ${avatar.color.replace('text-', 'bg-')} opacity-20 blur-md rounded-full`}></div>
        <Icon size={iconSize} className={`${avatar.color} relative z-10`} />
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block ${isVisible ? 'active-anim' : ''} ${className}`}
    >
      {/* ── Outer Companion Sprites ── */}
      {companion && companion.id !== "none" && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {companion.id === "paper-duck" && (
            <div className="companion-duck w-5 h-5 flex items-center justify-center"><CompanionVisual id="paper-duck" className="w-full h-full" /></div>
          )}
          {companion.id === "floating-book" && (
            <div className="companion-book w-5 h-5 flex items-center justify-center"><CompanionVisual id="floating-book" className="w-full h-full" /></div>
          )}
          {companion.id === "lucky-star" && (
            <div className="companion-orbit w-5 h-5 flex items-center justify-center"><CompanionVisual id="lucky-star" className="w-full h-full" /></div>
          )}
          {companion.id === "butterfly" && (
            <div className="companion-butterfly w-5 h-5 flex items-center justify-center"><CompanionVisual id="butterfly" className="w-full h-full" /></div>
          )}
          {companion.id === "purple-crystal" && (
            <div className="companion-orbit w-5 h-5 flex items-center justify-center"><CompanionVisual id="purple-crystal" className="w-full h-full" /></div>
          )}
          {companion.id === "electric-orb" && (
            <div className="companion-electric w-5 h-5 flex items-center justify-center"><CompanionVisual id="electric-orb" className="w-full h-full" /></div>
          )}
          {companion.id === "moon-spirit" && (
            <div className="companion-orbit w-5 h-5 flex items-center justify-center"><CompanionVisual id="moon-spirit" className="w-full h-full" /></div>
          )}
          {companion.id === "mini-penguin" && (
            <div className="companion-duck w-5 h-5 flex items-center justify-center"><CompanionVisual id="mini-penguin" className="w-full h-full" /></div>
          )}
          {companion.id === "graduation-cap" && (
            <div className="companion-cap w-5 h-5 flex items-center justify-center"><CompanionVisual id="graduation-cap" className="w-full h-full" /></div>
          )}
        </div>
      )}

      {/* ── Avatar Frame Wrapper ── */}
      <div 
        className={`avatar-frame-container ${avatarWidthClass} flex items-center justify-center`}
      >
        <AvatarFrameVisual frameId={frameId || "none"} size={size}>
          {renderIcon()}
        </AvatarFrameVisual>
      </div>
    </div>
  );
}
