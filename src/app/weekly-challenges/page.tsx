"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  onSnapshot,
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from "firebase/firestore";
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
  Type as TypeIcon
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
    'memory-matrix',
    'impossible-room',
    'word-forge',
    'target-number',
    'memory-heist',
    'the-impostor',
    'paradox'
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
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Overall Top 5 Leaderboard</h2>
            <p className="text-xs text-purple-300">Weekly Challenge Standings</p>
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

export default function WeeklyChallengesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // 1. Subscribe to Live Firestore Config (instant updates when Admin toggles settings)
  useEffect(() => {
    const configRef = doc(db, "settings", "weeklyChallenges");
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setConfig(prev => ({ ...prev, ...data }));
      }
      setLoading(false);
    }, (error) => {
      console.warn("Realtime config sync warning, falling back:", error);
      getDoc(configRef).then(snap => {
        if (snap.exists()) setConfig(prev => ({ ...prev, ...snap.data() }));
      }).finally(() => setLoading(false));
    });

    return () => unsubscribe();
  }, []);

  // 2. Compute Active Games List directly from Admin Config
  const activeGamesList = useMemo(() => {
    if (Array.isArray(config.activeGames)) {
      return config.activeGames.filter((id): id is GameId => GAME_IDS.includes(id as any));
    }
    return [...ARENA_GAME_IDS];
  }, [config.activeGames]);

  // 3. Lightweight single query for user's completed sessions
  useEffect(() => {
    async function loadUserSessions() {
      if (!user) {
        setSessions({});
        return;
      }
      try {
        const activeChallengeWeek = (config as any).currentWeek || getCurrentChallengeWeek();
        const sessionMap: Record<string, any> = {};

        const games = GAME_IDS;
        const targetChallengeIds: Record<string, string> = {};
        games.forEach((gId) => {
          let challengeId = `${gId}-${getChallengeDate()}`;
          if ((config as any).challengeSessionId) {
            challengeId = `${gId}-${(config as any).challengeSessionId}`;
          } else if ((config as any).currentChallengeId) {
            challengeId = `${gId}-${(config as any).currentChallengeId}`;
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

    loadUserSessions();
  }, [user, (config as any).challengeSessionId, (config as any).currentWeek]);

  // Schedule availability checks
  const isDayAvailable = isChallengeDay(config.availableDays);
  const isHourAvailable = isChallengeHour(config.openTime, config.closeTime);
  const isTimeAvailable = isDayAvailable && isHourAvailable;

  const nextDate = getNextChallengeDay(config.availableDays);
  const nextDayName = nextDate ? DAY_NAMES[nextDate.getDay()] : 'next scheduled cycle';

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

  // ─── STRICT ADMIN CONTROLS ───

  // 1. Maintenance Mode
  if (config.maintenanceMode === true) {
    return (
      <div className="relative min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative max-w-lg mx-auto p-8 rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 via-slate-900/60 to-black/80 backdrop-blur-xl shadow-[0_0_50px_rgba(139,92,246,0.15)]">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-400/30 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
            <Rocket className="h-10 w-10 text-purple-300 animate-bounce" />
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-cyan-400 animate-pulse" />
          </div>
          <h1 className="mb-3 text-3xl font-extrabold text-white">🚀 Arena Maintenance in Progress</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            The Paperino Challenge Arena is currently under maintenance. Please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  // 2. Feature Enabled / Disabled Globally
  if (config.enabled === false) {
    return (
      <div className="relative min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative max-w-lg mx-auto p-8 rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/40 via-slate-900/60 to-black/80 backdrop-blur-xl shadow-2xl">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
            <Lock className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="mb-3 text-2xl sm:text-3xl font-extrabold text-white">🔒 Challenges Disabled</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Weekly challenges are currently paused by the administrator. Please check back later.
          </p>
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

          {/* ─── 2. SCHEDULE NOTICE (IF CLOSED TODAY) ─── */}
          {!isTimeAvailable && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-950/25 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.12)]">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200">
                    Weekly Challenges Closed Today
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    Challenges are active on <strong className="text-amber-300">{availableDaysNames}</strong> from <strong className="text-amber-300">{config.openTime || "00:00"} to {config.closeTime || "23:59"}</strong>. Next official challenge opens on <strong className="text-white">{nextDayName}</strong>.
                  </p>
                </div>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0">
                <Clock size={13} />
                <span>Opens {nextDayName}</span>
              </div>
            </div>
          )}

          {/* ─── 3. ACTIVE GAMES GRID ─── */}
          <div>
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
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold">
                              <CheckCircle2 size={13} /> Completed
                            </span>
                          ) : isLocked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium">
                              <Lock size={12} /> {!user ? "Sign In" : `Opens ${nextDayName}`}
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

                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">
                          {info.name}
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed mb-6">
                          {info.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {isCompleted ? (
                          <Link
                            href={`/weekly-challenges/${gameId}`}
                            className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-300 hover:text-white transition-all flex items-center justify-between group/btn cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10"
                          >
                            <span>Review Answers & Results</span>
                            <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        ) : !user ? (
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
                              <Lock size={12} /> Locked until {nextDayName}
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
