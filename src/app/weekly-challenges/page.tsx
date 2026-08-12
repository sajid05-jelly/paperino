"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { 
  Trophy, 
  Lock, 
  Grid3X3, 
  DoorOpen, 
  Type as TypeIcon, 
  Clock, 
  AlertCircle, 
  Calendar,
  ChevronRight,
  Play,
  CheckCircle2,
  LockKeyhole
} from "lucide-react";
import { 
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
  availableDays: [2, 4, 5],
  activeGames: ['code-breaker', 'memory-matrix', 'impossible-room', 'word-forge'],
  leaderboardEnabled: true,
  officialAttempts: 1,
  maintenanceMode: false
};

const ICONS = {
  'code-breaker': Lock,
  'memory-matrix': Grid3X3,
  'impossible-room': DoorOpen,
  'word-forge': TypeIcon,
};

export default function WeeklyChallengesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch config
        const configRef = doc(db, "settings", "weeklyChallenges");
        const configSnap = await getDoc(configRef);
        let currentConfig = DEFAULT_CONFIG;
        
        if (configSnap.exists()) {
          currentConfig = { ...DEFAULT_CONFIG, ...configSnap.data() } as any;
          setConfig(currentConfig);
        }

        // Fetch user sessions
        if (user) {
          try {
            const today = getChallengeDate();
            const sessionsRef = collection(db, "challenge_sessions");
            const q = query(
              sessionsRef,
              where("userId", "==", user.uid),
              where("challengeDate", "==", today),
              limit(4)
            );
            
            const sessionSnap = await getDocs(q);
            const sessionMap: Record<string, any> = {};
            sessionSnap.forEach(docSnap => {
              const data = docSnap.data();
              if (data.gameId) {
                sessionMap[data.gameId] = data;
              }
            });
            setSessions(sessionMap);
          } catch (sessionErr) {
            console.warn("Could not fetch user challenge sessions:", sessionErr);
          }
        }
      } catch (error) {
        console.error("Error loading challenge data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
        <h2 className="text-xl font-semibold text-white">Loading Challenges...</h2>
        <p className="mt-2 text-gray-400">Preparing your weekly puzzles</p>
      </div>
    );
  }

  if (config.maintenanceMode || !config.enabled) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
        <h1 className="mb-2 text-3xl font-bold text-white">Maintenance Mode</h1>
        <p className="text-gray-400">Weekly challenges are currently undergoing maintenance. Please check back later.</p>
      </div>
    );
  }

  const isTodayAvailable = isChallengeDay(config.availableDays);
  const nextDay = getNextChallengeDay(config.availableDays);
  const nextDayName = DAY_NAMES[nextDay.getDay()];
  const availableDaysString = config.availableDays.map(d => DAY_NAMES[d].substring(0, 3)).join(" · ");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      {/* Header Section */}
      <div className="mb-12 text-center md:flex md:items-end md:justify-between md:text-left">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
            <Trophy className="h-4 w-4" />
            <span>{getCurrentChallengeWeek().replace('-W', ' Week ')}</span>
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">Weekly Challenges</h1>
          <p className="text-lg text-gray-400">Test your skills with premium brain challenges</p>
        </div>
        
        <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3 md:mt-0 glass-panel">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="text-left">
              <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Available Days</p>
              <p className="text-sm font-medium text-white">{availableDaysString}</p>
            </div>
          </div>
        </div>
      </div>

      {!user ? (
        <div className="mb-12 rounded-3xl border border-white/5 bg-white/[0.02] p-12 text-center glass-panel">
          <LockKeyhole className="mx-auto mb-4 h-12 w-12 text-gray-500" />
          <h2 className="mb-2 text-2xl font-bold text-white">Login Required</h2>
          <p className="mb-6 text-gray-400">You need to be logged in to participate in Weekly Challenges.</p>
          <Link href="/login" className="liquid-btn inline-flex items-center justify-center rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-all hover:bg-purple-700">
            Sign In to Play
          </Link>
        </div>
      ) : !isTodayAvailable ? (
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-8 text-center glass-panel">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent"></div>
          <Clock className="mx-auto mb-4 h-12 w-12 text-purple-400/50" />
          <h2 className="mb-2 text-2xl font-bold text-white">Challenges are currently closed</h2>
          <p className="text-gray-400">
            Come back on <span className="font-semibold text-white">{nextDayName}</span> to play the next set of challenges.
          </p>
        </div>
      ) : null}

      {/* Grid of Games */}
      <div className="grid gap-6 md:grid-cols-2">
        {GAME_IDS.map(gameId => {
          if (!config.activeGames.includes(gameId)) return null;
          
          const game = GAME_INFO[gameId];
          const IconComponent = ICONS[gameId as keyof typeof ICONS] || Trophy;
          const session = sessions[gameId];
          const isCompleted = session?.status === 'completed';
          const isInProgress = session?.status === 'in-progress';
          
          const isLocked = !user || !isTodayAvailable;

          return (
            <div 
              key={gameId} 
              className={`relative flex flex-col rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 glass-panel ${
                isLocked 
                  ? "opacity-60 grayscale-[0.5]" 
                  : "hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.04] shadow-[0_0_30px_rgba(var(--primary-rgb),0.02)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.06)]"
              }`}
            >
              <div className="mb-6 flex items-start justify-between">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] ${game.color}`}>
                  <IconComponent className="h-7 w-7" />
                </div>
                
                {/* Status Badge */}
                <div className="flex">
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  ) : isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </span>
                  ) : isInProgress ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                      <Play className="h-3 w-3" /> In Progress
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
                      <Play className="h-3 w-3" /> Available
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-grow">
                <h3 className="mb-2 text-xl font-bold text-white">{game.name}</h3>
                <p className="mb-6 text-sm text-gray-400">{game.description}</p>
                
                {isCompleted && session && (
                  <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-white/5 bg-black/20 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">Score</p>
                      <p className="text-lg font-bold text-white">{session.score}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">Time</p>
                      <p className="text-lg font-bold text-white">{formatDuration(session.duration || 0)}</p>
                    </div>
                  </div>
                )}
              </div>

              {!isLocked && (
                <div className="mt-auto">
                  {isCompleted ? (
                    <Link 
                      href={`/weekly-challenges/${gameId}`}
                      className="group flex w-full items-center justify-between rounded-xl bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
                    >
                      View Results
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ) : (
                    <Link 
                      href={`/weekly-challenges/${gameId}`}
                      className="group flex w-full items-center justify-between rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-purple-700"
                    >
                      {isInProgress ? 'Resume Challenge' : 'Start Challenge'}
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
