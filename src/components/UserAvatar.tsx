import React from 'react';
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

export default function UserAvatar({ avatarId, className = "", size = 20 }: UserAvatarProps) {
  const avatar = AVATARS.find(a => a.id === avatarId);

  if (!avatar) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-white/10 ${className}`}>
        <User size={size} className="text-gray-400" />
      </div>
    );
  }

  const Icon = avatar.icon;

  return (
    <div className={`flex items-center justify-center rounded-full ${avatar.bg} border border-white/5 shadow-inner relative overflow-hidden ${className}`}>
      {/* Subtle glowing orb behind icon */}
      <div className={`absolute inset-0 ${avatar.color.replace('text-', 'bg-')} opacity-20 blur-md rounded-full`}></div>
      <Icon size={size} className={`${avatar.color} relative z-10`} />
    </div>
  );
}
