"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
// Client Firestore imports removed in favor of Server Admin API
import { 
  Trophy, 
  Lock, 
  Clock, 
  Calendar,
  ChevronRight, 
  Play, 
  CheckCircle2, 
  Rocket, 
  Sparkles, 
  Gamepad2, 
  Target, 
  Brain, 
  Search, 
  Zap, 
  X, 
  Bug,
  Keyboard,
  Cpu,
  Terminal,
  Grid3X3,
  DoorOpen,
  Type as TypeIcon,
  Wrench,
  ShieldCheck,
  Activity,
  ArrowLeft,
  BookOpen,
  Crown,
  Gift,
  Flame,
  Info
} from "lucide-react";
import { 
  ARENA_GAME_IDS,
  GAME_IDS, 
  GAME_INFO, 
  GameId,
  getCurrentChallengeWeek, 
  getChallengeDate, 
  isChallengeDay, 
  isChallengeHour,
  isChallengeScheduleActive,
  getNextChallengeDay,
  DAY_NAMES
} from "@/lib/challengeUtils";

const DEFAULT_CONFIG = {
  enabled: true,
  availableDays: [0, 1, 2, 3, 4, 5, 6],
  activeGames: [
    'bug-hunter',
    'memory-rush',
    'typing-blitz',
    'number-detective',
    'logic-master',
    'code-breaker',
    'circuit-master',
  ],
  openTime: "00:00",
  closeTime: "23:59",
  leaderboardEnabled: true,
  officialAttempts: 1,
  maintenanceMode: false
};

const ALL_GAME_ICONS: Record<string, any> = {
  'bug-hunter': Bug,
  'memory-rush': Sparkles,
  'typing-blitz': Keyboard,
  'number-detective': Search,
  'logic-master': Brain,
  'code-breaker': Terminal,
  'circuit-master': Cpu,
  'memory-matrix': Grid3X3,
  'impossible-room': DoorOpen,
  'word-forge': TypeIcon,
  'target-number': Target,
  'memory-heist': Brain,
  'the-impostor': Search,
  'paradox': Zap,
};

const ACCENT_COLORS: Record<string, {
  border: string;
  glow: string;
  badge: string;
  btn: string;
  text: string;
}> = {
  'bug-hunter': {
    border: 'border-rose-500/30',
    glow: 'rgba(244,63,94,0.15)',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    btn: 'from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500',
    text: 'text-rose-400'
  },
  'memory-rush': {
    border: 'border-amber-500/30',
    glow: 'rgba(245,158,11,0.15)',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    btn: 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500',
    text: 'text-amber-400'
  },
  'typing-blitz': {
    border: 'border-cyan-500/30',
    glow: 'rgba(6,182,212,0.15)',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    btn: 'from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500',
    text: 'text-cyan-400'
  },
  'number-detective': {
    border: 'border-indigo-500/30',
    glow: 'rgba(99,102,241,0.15)',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    btn: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500',
    text: 'text-indigo-400'
  },
  'logic-master': {
    border: 'border-purple-500/30',
    glow: 'rgba(168,85,247,0.15)',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    btn: 'from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500',
    text: 'text-purple-400'
  },
  'code-breaker': {
    border: 'border-emerald-500/30',
    glow: 'rgba(16,185,129,0.15)',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    btn: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    text: 'text-emerald-400'
  },
  'circuit-master': {
    border: 'border-fuchsia-500/30',
    glow: 'rgba(217,70,239,0.15)',
    badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    btn: 'from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500',
    text: 'text-fuchsia-400'
  },
  'memory-matrix': {
    border: 'border-blue-500/30',
    glow: 'rgba(59,130,246,0.15)',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    btn: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
    text: 'text-blue-400'
  },
  'impossible-room': {
    border: 'border-violet-500/30',
    glow: 'rgba(139,92,246,0.15)',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    btn: 'from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500',
    text: 'text-violet-400'
  },
  'word-forge': {
    border: 'border-orange-500/30',
    glow: 'rgba(249,115,22,0.15)',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    btn: 'from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500',
    text: 'text-orange-400'
  },
  'target-number': {
    border: 'border-red-500/30',
    glow: 'rgba(239,68,68,0.15)',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    btn: 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500',
    text: 'text-red-400'
  },
  'memory-heist': {
    border: 'border-pink-500/30',
    glow: 'rgba(236,72,153,0.15)',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    btn: 'from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500',
    text: 'text-pink-400'
  },
  'the-impostor': {
    border: 'border-yellow-500/30',
    glow: 'rgba(234,179,8,0.15)',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    btn: 'from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500',
    text: 'text-yellow-400'
  },
  'paradox': {
    border: 'border-teal-500/30',
    glow: 'rgba(20,184,166,0.15)',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    btn: 'from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500',
    text: 'text-teal-400'
  },
};

function LeaderboardModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [data, setData] = useState<{rank: number, displayName: string, score: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const fetchLeaderboard = useCallback(() => {
    setLoading(true);
    setErrorMsg(null);
    fetch('/api/weekly-leaderboard')
      .then(async res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(d => {
        if (d && Array.isArray(d.leaderboard)) {
          setData(d.leaderboard);
        } else {
          setData([]);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("Leaderboard fetch failed:", e);
        setErrorMsg("Failed to load leaderboard");
        setData([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, fetchLeaderboard]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0a0515] border border-purple-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Overall Top 5 Leaderboard</h2>
            <p className="text-xs text-purple-300">Weekly Challenge Standings</p>
          </div>
        </div>

        {/* Mega Event Reward Banner */}
        <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-lime-500/20 via-emerald-500/10 to-yellow-500/20 border border-lime-500/40 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
              <Crown size={16} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-lime-400 font-bold">Mega Weekly Event</p>
              <p className="text-xs font-bold text-white">#1 Wins Free Paperino Premium!</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-300 border border-lime-500/30 font-bold shrink-0">
            ACTIVE
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full border-b-2 border-t-2 border-purple-500 h-8 w-8"></div>
          </div>
        ) : errorMsg ? (
          <div className="py-12 text-center">
            <p className="text-rose-400 text-sm font-semibold">{errorMsg}</p>
            <button
              onClick={fetchLeaderboard}
              className="mt-4 px-4 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-medium border border-purple-500/30 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No official challenge completions recorded yet this week.</p>
            <p className="text-gray-500 text-xs mt-1">Be the first to complete a game and claim #1!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((entry, idx) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  idx === 0 ? 'bg-amber-500/10 border-amber-500/40 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]' :
                  idx === 1 ? 'bg-slate-300/10 border-slate-300/30 text-slate-200' :
                  idx === 2 ? 'bg-orange-700/10 border-orange-700/30 text-orange-200' :
                  'bg-white/[0.02] border-white/5 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full font-black text-xs ${
                    idx === 0 ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' :
                    idx === 1 ? 'bg-slate-400/30 text-slate-200 border border-slate-400/50' :
                    idx === 2 ? 'bg-orange-700/30 text-orange-300 border border-orange-700/50' :
                    'bg-white/5 text-gray-400 border border-white/5'
                  }`}>
                    #{entry.rank}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-[180px]">
                      {entry.displayName}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-mono font-bold text-lime-400 flex items-center gap-1 mt-0.5">
                        <Crown size={11} className="text-yellow-400" /> #1 Free Premium Winner
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base text-purple-300 font-mono">
                    {entry.score}
                  </span>
                  <span className="text-[10px] text-gray-500 block uppercase tracking-wider -mt-1">
                    Score
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MegaChallengeHero({ onOpenLeaderboard }: { onOpenLeaderboard: () => void }) {
  const [showEventRules, setShowEventRules] = useState(false);

  const scrollToGames = () => {
    const el = document.getElementById("challenge-games");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border-2 border-lime-500/40 bg-gradient-to-br from-[#0a180d]/95 via-[#06110a]/95 to-[#0e071c]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(34,197,94,0.18)]">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-lime-500/15 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-[80px] pointer-events-none" />
        
        {/* Subtle Cyber Grid scanlines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
          {/* Left Column: Event Content */}
          <div className="flex-1 space-y-5 text-center lg:text-left">
            
            {/* Top Pill Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-lime-500/20 text-lime-300 border border-lime-500/40 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <Flame className="w-3.5 h-3.5 text-lime-400 animate-pulse" />
                <span>Special Event</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Mega Edition</span>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider bg-yellow-400/10 text-yellow-300 border border-yellow-400/30">
                <span>⚡ PLAY • COMPETE • CLIMB • WIN!</span>
              </div>
            </div>

            {/* Gamified Main Title */}
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-lime-400 font-extrabold flex items-center justify-center lg:justify-start gap-2 mb-1">
                <span>PAPERINO ARENA</span>
                <span>•</span>
                <span>HIGH-STAKES RACE</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] font-sans">
                WEEKLY CHALLENGE
              </h2>
              <div className="inline-block mt-1.5 transform -rotate-1">
                <span className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-lime-400 via-emerald-400 to-green-500 text-black font-black text-xs sm:text-sm md:text-base tracking-wider uppercase shadow-[0_0_25px_rgba(34,197,94,0.6)] font-mono">
                  ⚡ MEGA EDITION ⚡
                </span>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-xs sm:text-sm md:text-base text-gray-300 max-w-xl leading-relaxed font-medium">
              A special, high-stakes edition of our Weekly Challenge! Run the race across coding, puzzle, and logic arenas to claim the ultimate championship prize.
            </p>

            {/* Prize Callout Box */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-black/70 border-2 border-lime-500/50 shadow-[0_0_30px_rgba(34,197,94,0.25)] text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-lime-500/20 text-yellow-300 border border-yellow-400/40 shadow-[0_0_20px_rgba(234,179,8,0.3)] flex-shrink-0">
                  <Crown size={28} className="animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30">
                      Grand Prize
                    </span>
                    <span className="text-[11px] font-mono text-lime-400 font-bold">Rank #1 Global Leader</span>
                  </div>
                  <h3 className="text-sm sm:text-base md:text-lg font-black text-white mt-1 leading-snug">
                    Rank #1 & Win a <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-emerald-300 to-green-400 underline decoration-lime-400/50">Free Premium Subscription</span>!
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Whoever finishes top on the global leaderboard wins Paperino Premium unlocked free on their account.
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-300 text-center flex-shrink-0 min-w-[110px]">
                <Gift className="w-6 h-6 text-lime-400 mb-1" />
                <span className="text-[9px] font-mono uppercase tracking-wider text-gray-300">Reward</span>
                <span className="text-xs font-black text-white">PREMIUM</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              <button
                onClick={scrollToGames}
                className="px-6 py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-black bg-gradient-to-r from-lime-400 via-emerald-400 to-green-500 hover:brightness-110 shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
              >
                <Gamepad2 size={18} />
                <span>Join the Mega Challenge</span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={onOpenLeaderboard}
                className="px-5 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-lime-300 bg-lime-950/40 hover:bg-lime-950/80 border border-lime-500/40 hover:border-lime-400 shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all cursor-pointer flex items-center gap-2"
              >
                <Trophy size={16} className="text-yellow-400" />
                <span>View #1 Race</span>
              </button>

              <button
                onClick={() => setShowEventRules(true)}
                className="px-4 py-3.5 rounded-xl font-bold text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Info size={15} />
                <span>Rules</span>
              </button>
            </div>

          </div>

          {/* Right Column: Poster Image Artwork */}
          <div className="w-full sm:w-auto flex-shrink-0 flex justify-center">
            <div className="relative group rounded-3xl p-2 bg-gradient-to-b from-lime-500/40 via-emerald-500/20 to-purple-500/30 border border-lime-500/40 shadow-[0_0_40px_rgba(34,197,94,0.25)] transition-transform duration-300 hover:scale-[1.02]">
              <div className="relative w-[260px] sm:w-[300px] md:w-[320px] aspect-square rounded-2xl overflow-hidden bg-black/60 shadow-inner">
                <Image
                  src="/images/mega-weekly-challenge.jpg"
                  alt="Paperino Mega Weekly Challenge Poster"
                  fill
                  sizes="(max-width: 640px) 260px, 320px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-70 pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-lime-300 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-lime-500/30">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-lime-400 animate-ping" />
                    LIVE RACE
                  </span>
                  <span className="font-bold text-yellow-400 flex items-center gap-1">
                    <Crown size={12} /> #1 WINS PREMIUM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Rules Modal */}
      {showEventRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0a120a] border-2 border-lime-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
            <button
              onClick={() => setShowEventRules(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-lime-500/20 text-lime-400 border border-lime-500/30">
                <Crown size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Mega Weekly Challenge</h3>
                <p className="text-xs text-lime-300 font-mono">Official Rules & Rewards</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h4 className="font-bold text-white flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
                  The Grand Prize: Free Premium
                </h4>
                <p className="text-gray-400 text-xs pl-7">
                  The player holding the <strong className="text-lime-300">#1 position on the Global Leaderboard</strong> at the close of the weekly cycle will be awarded a <strong className="text-white">Free Paperino Premium Subscription</strong> for 1 Month.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h4 className="font-bold text-white flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
                  Run the Race Across All Arenas
                </h4>
                <p className="text-gray-400 text-xs pl-7">
                  Compete in the active weekly challenges (Bug Hunter, Logic Master, Circuit Master, Memory Rush, etc.). Your cumulative highest official scores across all games are tallied to determine your rank.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <h4 className="font-bold text-white flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center text-xs font-mono font-bold">3</span>
                  Tie-breaking & Fair Play
                </h4>
                <p className="text-gray-400 text-xs pl-7">
                  When scores tie, lowest completion time and earliest submission break the tie. Automated bots, script injection, and multi-accounting are strictly prohibited.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowEventRules(false);
                scrollToGames();
              }}
              className="mt-6 w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-gradient-to-r from-lime-400 to-emerald-400 hover:brightness-110 shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Gamepad2 size={16} />
              <span>Enter Arena — Start Playing</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function WeeklyChallengesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // 1. Fetch live admin config from server API (Admin DB superuser avoids client permission restrictions)
  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/challenges/config", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json?.data && isMounted) {
            setConfig(prev => ({ ...prev, ...json.data }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch challenge config from API:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConfig();

    // Re-check every 8s and on window focus for immediate reactivity when Admin updates settings
    const interval = setInterval(fetchConfig, 8000);
    const handleFocus = () => fetchConfig();
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // 2. Compute Active Games List directly from Admin Config
  const activeGamesList = useMemo(() => {
    if (Array.isArray(config.activeGames)) {
      return config.activeGames.filter((id): id is GameId => GAME_IDS.includes(id as any));
    }
    return [...ARENA_GAME_IDS];
  }, [config.activeGames]);

  // 3. Lightweight single query for user's completed sessions via Server Admin API
  useEffect(() => {
    async function loadUserSessions() {
      if (!user) {
        setSessions({});
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/challenges/user-sessions", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!Array.isArray(json?.results)) return;

        const activeChallengeWeek = (config as any).currentWeek || getCurrentChallengeWeek();
        const sessionMap: Record<string, any> = {};

        const games = GAME_IDS;
        const targetChallengeIds: Record<string, string> = {};
        games.forEach((gId) => {
          const weekChallengeId = `${gId}-${activeChallengeWeek}`;
          const dateChallengeId = `${gId}-${getChallengeDate()}`;
          targetChallengeIds[weekChallengeId] = gId;
          targetChallengeIds[dateChallengeId] = gId;
        });

        json.results.forEach((data: any) => {
          const gId = targetChallengeIds[data.challengeId] || data.gameId;
          if (gId) {
            sessionMap[gId] = {
              status: 'completed',
              score: data.score,
              duration: data.durationMs,
              challengeId: data.challengeId
            };
          }
        });

        setSessions(sessionMap);
      } catch (sessionErr) {
        console.warn("Could not fetch user challenge results:", sessionErr);
      }
    }

    loadUserSessions();
  }, [user, (config as any).currentWeek]);

  // Schedule availability checks using Asia/Kolkata IST
  const isTimeAvailable = isChallengeScheduleActive(
    config.availableDays, 
    config.openTime, 
    config.closeTime
  );

  const nextDate = getNextChallengeDay(config.availableDays);
  const nextDayName = nextDate ? DAY_NAMES[nextDate.getDay()] : (config.availableDays?.length === 0 ? 'next cycle' : 'tomorrow');

  const availableDaysNames = useMemo(() => {
    const days = config.availableDays;
    if (!Array.isArray(days) || days.length === 7) return "Every day";
    if (days.length === 0) return "No days scheduled (Closed)";
    return days.map(d => DAY_NAMES[d]).join(", ");
  }, [config.availableDays]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
        <h2 className="text-xl font-bold text-white tracking-wide">Connecting to Weekly Challenges...</h2>
      </div>
    );
  }

  // ─── STRICT ADMIN CONTROLS PRIORITY ───

  // Priority 1: Feature Enabled / Disabled Globally
  if (config.enabled === false) {
    return (
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center select-none">
        <div className="max-w-lg w-full mx-auto p-8 sm:p-10 rounded-3xl border border-white/10 bg-[#0c0916]/95 text-center shadow-xl">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10 mb-6">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <span>Temporarily Offline</span>
          </div>

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gray-400">
            <Lock className="h-8 w-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            Challenges Temporarily Offline
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed max-w-md mx-auto mb-8 font-normal">
            Weekly challenges are currently paused by the platform administrator. The arena will be reactivated in the next scheduled cycle.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/courses"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen size={16} />
              <span>Browse Study Notes</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium text-sm transition-colors border border-white/10 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={15} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Priority 2: Maintenance Mode
  if (config.maintenanceMode === true) {
    return (
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center select-none">
        <div className="max-w-lg w-full mx-auto p-8 sm:p-10 rounded-3xl border border-white/10 bg-[#0c0916]/95 text-center shadow-xl">
          
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-6">
            Under Maintenance
          </div>

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <Wrench className="h-8 w-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
            Arena Under Maintenance
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed max-w-md mx-auto mb-8 font-normal">
            Paperino Challenge Arena is temporarily offline for scheduled system updates. Game sessions, challenges, and leaderboards will resume shortly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/courses"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen size={16} />
              <span>Explore Materials</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-medium text-sm transition-colors border border-white/10 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={15} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

      <div className="relative min-h-screen pb-16 pt-6 px-4 md:px-8 text-gray-200">
        <div className="container mx-auto max-w-6xl space-y-8 relative z-10">
          
          {/* ─── 1. CLEAN HEADER ─── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-purple-500/20 pb-6">
            <div className="text-center sm:text-left space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3.5 py-1 text-xs font-bold text-purple-400 ring-1 ring-inset ring-purple-500/30 uppercase tracking-widest">
                <Sparkles className="h-3 w-3 text-fuchsia-400" />
                <span>Paperino Weekly Challenges</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Weekly Challenges
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Sharpen your engineering, logic, and coding skills through official weekly challenges.
              </p>
            </div>

            {/* Leaderboard Button */}
            {config.leaderboardEnabled !== false && (
              <button 
                onClick={() => setShowLeaderboard(true)}
                className="liquid-btn group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 hover:bg-purple-500/20 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all flex items-center gap-3 cursor-pointer shrink-0"
              >
                <Trophy className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Standings</p>
                  <p className="text-xs font-black text-white">Top 5 Leaderboard</p>
                </div>
              </button>
            )}
          </div>

          {/* ─── 2. MEGA WEEKLY CHALLENGE EVENT SHOWCASE ─── */}
          <MegaChallengeHero onOpenLeaderboard={() => setShowLeaderboard(true)} />

          {/* ─── 3. SCHEDULE NOTICE (IF CLOSED TODAY) ─── */}
          {!isTimeAvailable && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-950/25 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.12)]">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200">
                    {config.availableDays?.length === 0 ? "Weekly Challenges Closed" : "Weekly Challenges Closed Today"}
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    {config.availableDays?.length === 0 ? (
                      "No challenge days are currently scheduled by the administrator. Please check back later."
                    ) : (
                      <>
                        Challenges are active on <strong className="text-amber-300">{availableDaysNames}</strong> from <strong className="text-amber-300">{config.openTime || "00:00"} to {config.closeTime || "23:59"}</strong>. Next official challenge opens on <strong className="text-white">{nextDayName}</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0">
                <Clock size={13} />
                <span>{config.availableDays?.length === 0 ? "Schedule Closed" : `Opens ${nextDayName}`}</span>
              </div>
            </div>
          )}

          {/* ─── 4. ACTIVE GAMES GRID ─── */}
          <div id="challenge-games" className="scroll-mt-8">
            {activeGamesList.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                <Gamepad2 className="mx-auto h-12 w-12 text-gray-500" />
                <h3 className="text-lg font-bold text-white">No Challenges Active</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  No challenge games are currently activated in settings. Please check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeGamesList.map((gameId) => {
                  const info = GAME_INFO[gameId];
                  if (!info) return null;
                  const IconComponent = ALL_GAME_ICONS[gameId] || Trophy;
                  const accent = ACCENT_COLORS[gameId] || ACCENT_COLORS['logic-master'];
                  const session = sessions[gameId];
                  const isCompleted = session?.status === 'completed';
                  const isLocked = !isTimeAvailable || !user;

                  return (
                    <div
                      key={gameId}
                      className={`relative rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between group overflow-hidden ${accent.border} bg-[#0b0618]/70 backdrop-blur-xl hover:shadow-[0_0_35px_rgba(168,85,247,0.18)] hover:-translate-y-1`}
                    >
                      <div 
                        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                        style={{ background: accent.glow, filter: 'blur(30px)' }}
                      />

                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-2xl bg-white/[0.04] border border-white/10 ${accent.text} group-hover:scale-110 transition-transform`}>
                            <IconComponent size={24} />
                          </div>

                          {/* Status Badge */}
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium">
                              <Lock size={12} /> {!user ? "Sign In" : config.availableDays?.length === 0 ? "Closed" : `Opens ${nextDayName}`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                              <Play size={11} className="fill-emerald-400 text-emerald-400" /> Start
                            </span>
                          )}
                        </div>

                        {/* Category Pill */}
                        {info.badge && (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border ${accent.badge}`}>
                            {info.badge}
                          </span>
                        )}

                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">
                          {info.name}
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed mb-6">
                          {info.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {!user ? (
                          <Link
                            href="/login"
                            className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-between group/btn cursor-pointer bg-white/10 hover:bg-white/15 border border-white/20"
                          >
                            <span>Sign In to Play</span>
                            <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        ) : isLocked ? (
                          <button
                            disabled
                            className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-400 bg-white/5 border border-white/10 flex items-center justify-between opacity-50 cursor-not-allowed"
                          >
                            <span className="flex items-center gap-1.5">
                              <Lock size={12} /> {config.availableDays?.length === 0 ? "Locked: Schedule Closed" : `Locked until ${nextDayName}`}
                            </span>
                            <Lock size={12} />
                          </button>
                        ) : (
                          <Link
                            href={`/weekly-challenges/${gameId}`}
                            className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-between group/btn cursor-pointer bg-gradient-to-r ${accent.btn} shadow-[0_0_15px_${accent.glow}] hover:brightness-110`}
                          >
                            <span>Start Challenge</span>
                            <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
