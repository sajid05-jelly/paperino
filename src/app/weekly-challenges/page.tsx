"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { 
  Trophy, 
  Lock, 
  Clock, 
  AlertCircle, 
  Calendar,
  ChevronRight, 
  Play, 
  CheckCircle2, 
  LockKeyhole, 
  Rocket, 
  Sparkles, 
  Gamepad2, 
  Target, 
  Brain, 
  Search, 
  Zap, 
  X, 
  User as UserIcon,
  Bug,
  Keyboard,
  Cpu,
  Flame,
  Award,
  Star,
  Activity,
  Terminal,
  ShieldCheck
} from "lucide-react";
import { 
  ARENA_GAME_IDS,
  GAME_IDS, 
  GAME_INFO, 
  getCurrentChallengeWeek, 
  getChallengeDate, 
  isChallengeDay, 
  getNextChallengeDay,
  formatDuration,
  DAY_NAMES
} from "@/lib/challengeUtils";

const DEFAULT_CONFIG = {
  enabled: true,
  availableDays: [0, 1, 2, 3, 4, 5, 6], // Available every day for Arena
  activeGames: [
    'bug-hunter',
    'memory-rush',
    'typing-blitz',
    'number-detective',
    'logic-master',
    'code-breaker',
    'circuit-master',
  ],
  leaderboardEnabled: true,
  officialAttempts: 1,
  maintenanceMode: false
};

const ARENA_ICONS: Record<string, any> = {
  'bug-hunter': Bug,
  'memory-rush': Sparkles,
  'typing-blitz': Keyboard,
  'number-detective': Search,
  'logic-master': Brain,
  'code-breaker': Terminal,
  'circuit-master': Cpu,
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
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Overall Top 5 Leaderboard</h2>
            <p className="text-xs text-purple-300">Weekly Challenge Arena Standings</p>
          </div>
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
              className="mt-4 px-4 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-medium border border-purple-500/30 transition-colors"
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
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate max-w-[140px]">
                      {entry.displayName}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base text-purple-300 font-mono">
                    {entry.score}
                  </span>
                  <span className="text-[10px] text-gray-500 block uppercase tracking-wider -mt-1">
                    XP Pts
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

export default function WeeklyChallengesPage() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [top5Preview, setTop5Preview] = useState<any[]>([]);

  // Daily featured challenge selection based on day of week
  const featuredGameId = useMemo(() => {
    const day = new Date().getDay();
    const map = [
      'bug-hunter',
      'memory-rush',
      'typing-blitz',
      'number-detective',
      'logic-master',
      'code-breaker',
      'circuit-master',
    ];
    return map[day % map.length] || 'code-breaker';
  }, []);

  const featuredGameInfo = GAME_INFO[featuredGameId as keyof typeof GAME_INFO] || GAME_INFO['code-breaker'];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch admin config
        const configRef = doc(db, "settings", "weeklyChallenges");
        const configSnap = await getDoc(configRef);
        let currentConfig: any = DEFAULT_CONFIG;
        
        if (configSnap.exists()) {
          currentConfig = { ...DEFAULT_CONFIG, ...configSnap.data() } as any;
          setConfig(currentConfig);
        }

        // 2. Fetch user results
        if (user) {
          try {
            const activeChallengeWeek = currentConfig.currentWeek || getCurrentChallengeWeek();
            const sessionMap: Record<string, any> = {};

            const games = [
              'bug-hunter',
              'memory-rush',
              'typing-blitz',
              'number-detective',
              'logic-master',
              'code-breaker',
              'circuit-master',
              'memory-matrix',
              'impossible-room',
              'word-forge',
              'target-number',
              'memory-heist',
              'the-impostor',
              'paradox'
            ];

            const targetChallengeIds: Record<string, string> = {};
            games.forEach((gId) => {
              let challengeId = `${gId}-${getChallengeDate()}`;
              if (currentConfig.challengeSessionId) {
                challengeId = `${gId}-${currentConfig.challengeSessionId}`;
              } else if (currentConfig.currentChallengeId) {
                challengeId = `${gId}-${currentConfig.currentChallengeId}`;
              } else if (activeChallengeWeek) {
                challengeId = `${gId}-${activeChallengeWeek}`;
              }
              targetChallengeIds[challengeId] = gId;
            });

            const resultsRef = collection(db, "challenge_results");
            const q = query(
              resultsRef,
              where("userId", "==", user.uid),
              where("isOfficial", "==", true),
              limit(15)
            );
            
            const resSnap = await getDocs(q);
            resSnap.forEach((docSnap) => {
              const data = docSnap.data();
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

        // 3. Fetch top 5 preview for sidebar
        fetch('/api/weekly-leaderboard')
          .then(res => res.json())
          .then(d => {
            if (d && Array.isArray(d.leaderboard)) {
              setTop5Preview(d.leaderboard);
            }
          })
          .catch(() => {});

      } catch (error) {
        console.error("Error loading challenge data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Compute User Aggregate Stats
  const completedEntries = Object.values(sessions).filter(s => s?.status === 'completed');
  const totalWeeklyXp = completedEntries.reduce((acc, curr) => acc + (Number(curr.score || 0) * 10), 0);
  const personalBestScore = completedEntries.reduce((acc, curr) => Math.max(acc, Number(curr.score || 0)), 0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
        <h2 className="text-xl font-bold text-white tracking-wide">Connecting to Challenge Arena...</h2>
        <p className="mt-2 text-sm text-gray-400">Loading daily puzzles and live standings</p>
      </div>
    );
  }

  const isAdminBypass = Boolean(isAdmin && (config as any).adminTestMode);
  const isMaintenanceActive = (config.maintenanceMode || !config.enabled) && !isAdminBypass;

  if (isMaintenanceActive) {
    return (
      <div className="relative min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative max-w-lg mx-auto p-8 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 via-slate-900/60 to-black/80 backdrop-blur-xl shadow-[0_0_50px_rgba(139,92,246,0.15)]">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
            <Rocket className="h-10 w-10 text-purple-300 animate-bounce" />
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="mb-3 text-3xl font-extrabold text-white">🚀 Arena Maintenance in Progress</h1>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            The Paperino Challenge Arena is receiving upgraded puzzle suites and performance enhancements. Please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  const isTodayAvailable = isChallengeDay(config.availableDays) || isAdminBypass;

  return (
    <>
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

      <div className="relative min-h-screen pb-16 pt-6 px-4 md:px-8 text-gray-200">
        <div className="container mx-auto max-w-6xl space-y-10 relative z-10">
          
          {/* ─── 1. ARENA HERO HEADER ─── */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-purple-500/20 pb-8">
            <div className="text-center lg:text-left space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-1.5 text-xs font-bold text-purple-400 ring-1 ring-inset ring-purple-500/30 uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
                <span>Paperino Challenge Arena</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 tracking-tight">
                Paperino Challenge Arena
              </h1>
              <p className="text-sm sm:text-base text-gray-400 max-w-xl">
                Master 7 solo engineering games. Solve code bugs, logic circuits, typing sprints, and algorithmic puzzles to climb the Weekly Top 5 Leaderboard.
              </p>
            </div>

            {/* Quick Action Top Button */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button 
                onClick={() => setShowLeaderboard(true)}
                className="liquid-btn group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-3.5 glass-panel hover:bg-purple-500/20 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all flex items-center gap-3 cursor-pointer"
              >
                <Trophy className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Weekly Standings</p>
                  <p className="text-xs font-black text-white">Top 5 Leaderboard</p>
                </div>
              </button>
            </div>
          </div>

          {/* ─── 2. USER PROFILE & WEEKLY STATS BAR ─── */}
          {user ? (
            <div className="glass-panel vision-glass rounded-3xl p-5 sm:p-6 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)] flex flex-col md:flex-row items-center justify-between gap-6">
              {/* User Avatar & Name */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                    <div className="w-full h-full bg-[#0a0515] rounded-[calc(1rem-2px)] flex items-center justify-center font-bold text-white text-lg">
                      {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : <UserIcon size={24} />}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0a0515] flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-[180px]">
                      {user.displayName || user.email?.split('@')[0] || "Challenger"}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                      Solo Challenger
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
              </div>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center justify-center gap-1 mb-0.5">
                    <Zap size={11} className="text-purple-400" /> Weekly XP
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono">
                    {totalWeeklyXp}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center justify-center gap-1 mb-0.5">
                    <Award size={11} className="text-amber-400" /> Best Score
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                    {personalBestScore}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-center gap-1 mb-0.5">
                    <Flame size={11} className="text-cyan-400" /> Completed
                  </span>
                  <span className="text-base sm:text-lg font-black text-cyan-300 font-mono">
                    {completedEntries.length}/7
                  </span>
                </div>
              </div>

              {/* Badges preview */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold flex items-center gap-1.5" title="Precision Master">
                  <span>🎯 Precision</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1.5" title="Speed Demon">
                  <span>⚡ Speed</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-white/10 text-center space-y-4">
              <LockKeyhole className="mx-auto h-10 w-10 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Sign In to Enter the Challenge Arena</h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Track your weekly XP, unlock answer reviews, and compete on the official Weekly Top 5 Leaderboard.
              </p>
              <Link
                href="/login"
                className="liquid-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-105 transition-all"
              >
                Sign In to Play
              </Link>
            </div>
          )}

          {/* ─── 3. DAILY FEATURED CHALLENGE BANNER ─── */}
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-[#0d0720] to-[#0a0515] p-6 sm:p-8 shadow-[0_0_40px_rgba(168,85,247,0.15)]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <Star size={13} className="text-amber-400 fill-amber-400" />
                  <span>Daily Featured Challenge</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {featuredGameInfo.name}
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {featuredGameInfo.description}. Earn bonus weekly XP and unlock solution explanations upon completion.
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-purple-400" /> ~2-3 Minutes</span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5"><Zap size={14} className="text-amber-400" /> Up to 1000 XP</span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5"><Target size={14} className="text-cyan-400" /> Solution Review Included</span>
                </div>
              </div>

              <Link
                href={`/weekly-challenges/${featuredGameId}`}
                className="liquid-btn px-7 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider text-white transition-all bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:scale-105 flex items-center gap-2.5 flex-shrink-0 cursor-pointer"
              >
                <Play size={16} className="fill-white" />
                <span>Play Featured Game</span>
              </Link>
            </div>
          </div>

          {/* ─── 4. SEVEN PLAYABLE GAME CARDS GRID ─── */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  7 Arena Challenge Games
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Choose any challenge to test your engineering skills
                </p>
              </div>

              <span className="text-xs font-semibold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                Solo Mode Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ARENA_GAME_IDS.map((gameId) => {
                const info = GAME_INFO[gameId];
                const IconComponent = ARENA_ICONS[gameId] || Trophy;
                const accent = ACCENT_COLORS[gameId] || ACCENT_COLORS['logic-master'];
                const session = sessions[gameId];
                const isCompleted = session?.status === 'completed';
                const isLocked = !user;

                return (
                  <div
                    key={gameId}
                    className={`relative rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between group overflow-hidden ${accent.border} bg-[#0b0618]/70 backdrop-blur-xl hover:shadow-[0_0_35px_rgba(168,85,247,0.18)] hover:-translate-y-1`}
                  >
                    {/* Top Glow Layer */}
                    <div 
                      className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                      style={{ background: accent.glow, filter: 'blur(30px)' }}
                    />

                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl bg-white/[0.04] border border-white/10 ${accent.text} group-hover:scale-110 transition-transform`}>
                          <IconComponent size={24} />
                        </div>

                        {/* Status Badge */}
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold">
                            <CheckCircle2 size={13} /> Completed ({session.score} pts)
                          </span>
                        ) : isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10 text-xs font-medium">
                            <Lock size={12} /> Sign In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                            Available
                          </span>
                        )}
                      </div>

                      {/* Category Pill */}
                      {info.badge && (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border ${accent.badge}`}>
                          {info.badge}
                        </span>
                      )}

                      {/* Title & Description */}
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">
                        {info.name}
                      </h3>
                      <p className="text-xs text-gray-400 leading-relaxed mb-6">
                        {info.description}
                      </p>
                    </div>

                    {/* Card Action Button */}
                    <div className="pt-2">
                      <Link
                        href={`/weekly-challenges/${gameId}`}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-between group/btn cursor-pointer ${
                          isCompleted
                            ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white'
                            : `bg-gradient-to-r ${accent.btn} shadow-[0_0_15px_${accent.glow}] hover:brightness-110`
                        }`}
                      >
                        <span>{isCompleted ? 'Review Answers & Standings' : 'Enter Arena'}</span>
                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── 5. WEEKLY TOP 5 STANDINGS PREVIEW PANEL ─── */}
          <div className="glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.1)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Trophy size={22} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Overall Weekly Top 5 Leaderboard
                  </h3>
                  <p className="text-xs text-gray-400">
                    Highest aggregate verified scores across all 7 Arena games this week
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowLeaderboard(true)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-purple-300 hover:text-white border border-purple-500/20 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>Full Standings</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Standings List */}
            <div className="space-y-3">
              {top5Preview && top5Preview.length > 0 ? (
                top5Preview.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      idx === 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]' :
                      idx === 1 ? 'bg-slate-300/10 border-slate-300/20 text-slate-200' :
                      idx === 2 ? 'bg-orange-700/10 border-orange-700/20 text-orange-200' :
                      'bg-white/[0.02] border-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full font-black text-xs ${
                        idx === 0 ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' :
                        idx === 1 ? 'bg-slate-400/30 text-slate-200 border border-slate-400/50' :
                        idx === 2 ? 'bg-orange-700/30 text-orange-300 border border-orange-700/50' :
                        'bg-white/5 text-gray-400 border border-white/5'
                      }`}>
                        #{entry.rank}
                      </span>
                      <span className="font-bold text-sm text-white truncate max-w-[150px] sm:max-w-none">
                        {entry.displayName}
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-sm sm:text-base font-extrabold text-purple-300">
                        {entry.score} XP
                      </span>
                      {entry.durationMs && (
                        <span className="text-[10px] text-gray-500 block">
                          {(entry.durationMs / 1000).toFixed(1)}s total
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-gray-400 italic">
                  No official results recorded yet this cycle. Play any game to establish the weekly benchmark!
                </div>
              )}
            </div>
          </div>

          {/* ─── 6. STREAKS & BADGES SHOWCASE ─── */}
          <div className="glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Award className="text-purple-400" size={18} />
              Arena Achievements & Masteries
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                <span className="text-2xl block">🎯</span>
                <h4 className="text-xs font-bold text-white">Precision Master</h4>
                <p className="text-[10px] text-gray-400">Score 90%+ accuracy on any puzzle</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                <span className="text-2xl block">⚡</span>
                <h4 className="text-xs font-bold text-white">Speed Demon</h4>
                <p className="text-[10px] text-gray-400">Finish any challenge in under 60 seconds</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                <span className="text-2xl block">🐛</span>
                <h4 className="text-xs font-bold text-white">Bug Buster</h4>
                <p className="text-[10px] text-gray-400">Identify all code bugs without mistakes</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                <span className="text-2xl block">🏆</span>
                <h4 className="text-xs font-bold text-white">Arena Legend</h4>
                <p className="text-[10px] text-gray-400">Rank in the Overall Weekly Top 5</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
