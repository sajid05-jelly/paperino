"use client";

import { useState, useEffect } from 'react';
import { AVATARS } from './UserAvatar';
import { Sparkles, Check, ChevronRight } from 'lucide-react';

interface AvatarSelectorModalProps {
  onSelect: (avatarId: string) => void;
  isOpen: boolean;
  isFirstLogin?: boolean;
}

export default function AvatarSelectorModal({ onSelect, isOpen, isFirstLogin = true }: AvatarSelectorModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

if (!isOpen) return null;

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    await onSelect(selected);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4">
      {/* Blurred Backdrop */}
      <div className="absolute inset-0 bg-[#05030a]/90 backdrop-blur-xl" />

      {/* Modal Shell — full responsive container */}
      <div
        className="relative w-full max-w-4xl flex flex-col bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_0_80px_rgba(var(--primary-rgb),0.15)] animate-in fade-in zoom-in-95 duration-500"
        style={{ maxHeight: '90vh' }}
      >
        {/* Background Gradients (decorative, pointer-events-none) */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/[0.05] to-transparent rounded-[2rem] sm:rounded-[2.5rem] pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.2)_0%,transparent_70%)] rounded-full blur-[80px] pointer-events-none" />

        {/* ── SCROLLABLE CONTENT AREA ── */}
        <div
          className="relative flex-1 overflow-y-auto overscroll-contain"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(139,92,246,0.3) transparent',
          }}
        >
          <div className="px-5 pt-7 pb-4 sm:px-8 sm:pt-10 md:px-12 md:pt-12">

            {/* Header */}
            <div className="text-center mb-6 sm:mb-10">
              <div className="inline-flex items-center justify-center p-3 bg-white/[0.05] rounded-2xl mb-4 border border-white/10">
                <Sparkles className="text-[color:var(--primary-400)]" size={24} />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
                {isFirstLogin ? 'Choose Your Identity' : 'Update Your Avatar'}
              </h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Select a futuristic Paperino avatar to represent you across the platform, leaderboards, and AI chat.
              </p>
            </div>

            {/* Avatar Grid — 2 cols on mobile, 3 on sm, 5 on md+ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {AVATARS.map((avatar) => {
                const isSelected = selected === avatar.id;
                const Icon = avatar.icon;

                return (
                  <button
                    key={avatar.id}
                    onClick={() => setSelected(avatar.id)}
                    className={`relative group flex flex-col items-center justify-center p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border transition-all duration-300 ${
                      isSelected
                        ? 'border-[color:var(--primary-500)] bg-[color:var(--primary-500)]/10 scale-[1.04] shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]'
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                  >
                    {/* Avatar Icon Circle */}
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 transition-transform duration-500 ${
                        isSelected ? '' : 'group-hover:scale-110 group-hover:rotate-6'
                      } ${avatar.bg} border border-white/10 relative flex-shrink-0`}
                    >
                      <div className={`absolute inset-0 ${avatar.color.replace('text-', 'bg-')} opacity-20 blur-md rounded-full`} />
                      <Icon size={22} className={`${avatar.color} relative z-10 sm:text-[26px] md:text-[28px]`} />
                    </div>

                    {/* Name */}
                    <span
                      className={`text-[10px] sm:text-xs font-bold text-center leading-tight ${
                        isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                      }`}
                    >
                      {avatar.name}
                    </span>

                    {/* Selected Check Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-[color:var(--primary-500)] rounded-full flex items-center justify-center animate-in zoom-in shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* ── STICKY SAVE BUTTON — always visible at bottom ── */}
        <div className="relative flex-shrink-0 px-5 py-4 sm:px-8 sm:py-5 md:px-12 md:py-6 border-t border-white/[0.06] bg-black/30 backdrop-blur-xl rounded-b-[2rem] sm:rounded-b-[2.5rem]">
          {/* Subtle glow line at the top edge of sticky footer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--primary-rgb),0.4)] to-transparent" />

          <div className="flex justify-center">
            <button
              onClick={handleSave}
              disabled={!selected || saving}
              className={`flex items-center gap-2 px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 ${
                !selected
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                  : 'bg-[color:var(--primary-500)] hover:bg-[color:var(--primary-600)] text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.6)] hover:scale-105 active:scale-100'
              }`}
            >
              {saving ? 'Saving Identity...' : isFirstLogin ? 'Enter Paperino' : 'Save Changes'}
              {!saving && <ChevronRight size={20} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
