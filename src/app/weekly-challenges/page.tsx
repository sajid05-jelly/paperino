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
  const { user, isAdmin } = useAuth();
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
        let currentConfig: any = DEFAULT_CONFIG;
        
        if (configSnap.exists()) {
          currentConfig = { ...DEFAULT_CONFIG, ...configSnap.data() } as any;
          setConfig(currentConfig);
        }

        // Fetch user sessions
        // Fetch user results for this active challengeId
        if (user) {
          try {
            const activeChallengeWeek = currentConfig.currentWeek || getCurrentChallengeWeek();
            const sessionMap: Record<string, any> = {};

            const games = ['code-breaker', 'memory-matrix', 'impossible-room', 'word-forge'];
            
            await Promise.all(games.map(async (gId) => {
              // Determine active challengeId for this game (based on settings or weekly schedule)
              let challengeId = `${gId}-${getChallengeDate()}`;
              if (currentConfig.currentChallengeId) {
                challengeId = String(currentConfig.currentChallengeId);
              } else if (activeChallengeWeek) {
                challengeId = `${gId}-${activeChallengeWeek}`;
              }

              const resultsRef = collection(db, "challenge_results");
              const q = query(
                resultsRef,
                where("userId", "==", user.uid),
                where("challengeId", "==", challengeId),
                where("isOfficial", "==", true),
                limit(1)
              );
              
              const resSnap = await getDocs(q);
              if (!resSnap.empty) {
                const data = resSnap.docs[0].data();
                sessionMap[gId] = {
                  status: 'completed',
                  score: data.score,
                  duration: data.durationMs,
                  challengeId: challengeId
                };
              }
            }));

            setSessions(sessionMap);
          } catch (sessionErr) {
            console.warn("Could not fetch user challenge results:", sessionErr);
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

  const isAdminBypass = Boolean(isAdmin && (config as any).adminTestMode);
  const isMaintenanceActive = (config.maintenanceMode || !config.enabled) && !isAdminBypass;

  if (isMaintenanceActive) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
        <h1 className="mb-2 text-3xl font-bold text-white">Maintenance Mode</h1>
        <p className="text-gray-400">Weekly challenges are currently undergoing maintenance. Please check back later.</p>
      </div>
    );
  }

  const isTodayAvailable = isChallengeDay(config.availableDays) || isAdminBypass;
  const nextDay = getNextChallengeDay(config.availableDays);
  const nextDayName = DAY_NAMES[nextDay.getDay()];
  const availableDaysString = config.availableDays.map(d => DAY_NAMES[d].substring(0, 3)).join(" · ");

  return (
    <>
      {/* ─── Decorative Arena Background ─── */}
      <style>{`
        @keyframes wc-float-1 {
          0%,100% { transform: translateY(0px) translateX(0px); opacity: 0.35; }
          33%      { transform: translateY(-18px) translateX(6px);  opacity: 0.55; }
          66%      { transform: translateY(8px)  translateX(-4px); opacity: 0.28; }
        }
        @keyframes wc-float-2 {
          0%,100% { transform: translateY(0px)  translateX(0px); opacity: 0.25; }
          40%      { transform: translateY(14px) translateX(-8px); opacity: 0.45; }
          75%      { transform: translateY(-6px) translateX(5px);  opacity: 0.18; }
        }
        @keyframes wc-float-3 {
          0%,100% { transform: translateY(0px)   translateX(0px);  opacity: 0.3; }
          50%      { transform: translateY(-22px) translateX(-10px); opacity: 0.5; }
        }
        @keyframes wc-pulse-glow {
          0%,100% { opacity: 0.12; }
          50%      { opacity: 0.22; }
        }
        @keyframes wc-pulse-glow2 {
          0%,100% { opacity: 0.07; }
          50%      { opacity: 0.15; }
        }
        @keyframes wc-scan-line {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 0.06; }
          90%  { opacity: 0.06; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes wc-twinkle {
          0%,100% { opacity: 0; transform: scale(0.5); }
          50%      { opacity: 1; transform: scale(1.1); }
        }
        @keyframes wc-grid-shift {
          0%   { transform: translateX(0) translateY(0); }
          100% { transform: translateX(40px) translateY(40px); }
        }
        @keyframes wc-rotate-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes wc-rotate-rev {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
        .wc-float-1 { animation: wc-float-1 9s ease-in-out infinite; }
        .wc-float-2 { animation: wc-float-2 13s ease-in-out infinite; }
        .wc-float-3 { animation: wc-float-3 7s ease-in-out infinite; }
        .wc-pulse-glow  { animation: wc-pulse-glow  6s ease-in-out infinite; }
        .wc-pulse-glow2 { animation: wc-pulse-glow2 9s ease-in-out infinite; }
        .wc-scan  { animation: wc-scan-line 12s linear infinite; }
        .wc-twinkle { animation: wc-twinkle var(--d,4s) ease-in-out infinite; }
        .wc-rot   { animation: wc-rotate-slow var(--rd,30s) linear infinite; }
        .wc-rot-r { animation: wc-rotate-rev  var(--rd,25s) linear infinite; }
      `}</style>

      {/* Fixed full-page background layer — pointer-events-none so nothing is blocked */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: 0 }}
      >
        {/* 1 ── Base radial gradient — deep purple/black to navy */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 0%, #0d0618 0%, #09091a 45%, #020208 100%)",
          }}
        />

        {/* 2 ── Ambient left glow — purple */}
        <div
          className="wc-pulse-glow absolute"
          style={{
            left: "-10%", top: "15%",
            width: "55vw", height: "55vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.08) 45%, transparent 72%)",
            filter: "blur(60px)",
          }}
        />

        {/* 3 ── Ambient right glow — cyan/teal */}
        <div
          className="wc-pulse-glow2 absolute"
          style={{
            right: "-8%", top: "25%",
            width: "45vw", height: "45vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(6,182,212,0.05) 50%, transparent 72%)",
            filter: "blur(55px)",
            animationDelay: "2s",
          }}
        />

        {/* 4 ── Bottom center glow — deep purple */}
        <div
          className="wc-pulse-glow absolute"
          style={{
            left: "25%", bottom: "-5%",
            width: "50vw", height: "35vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(88,28,235,0.14) 0%, transparent 70%)",
            filter: "blur(70px)",
            animationDelay: "4s",
          }}
        />

        {/* 5 ── Circuit-board dot grid */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.06,
            backgroundImage: `
              radial-gradient(circle, rgba(168,85,247,0.9) 1px, transparent 1px),
              radial-gradient(circle, rgba(34,211,238,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px, 120px 120px",
            backgroundPosition: "0 0, 20px 20px",
            animation: "wc-grid-shift 60s linear infinite",
          }}
        />

        {/* 6 ── Fine diagonal circuit lines (SVG data-URI) */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.045,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 40 L40 0 M40 80 L80 40 M-10 50 L50 -10 M30 90 L90 30' stroke='%238B5CF6' stroke-width='0.5' fill='none'/%3E%3Cpath d='M0 0 L80 80 M20 0 L80 60 M0 20 L60 80' stroke='%2306B6D4' stroke-width='0.3' fill='none'/%3E%3C/svg%3E")`,
            backgroundSize: "80px 80px",
          }}
        />

        {/* 7 ── HUD corner brackets */}
        {[
          { top: "6%",  left:  "3%",  rotate: "0deg"   },
          { top: "6%",  right: "3%",  rotate: "90deg"  },
          { bottom:"6%",left:  "3%",  rotate: "270deg" },
          { bottom:"6%",right: "3%",  rotate: "180deg" },
        ].map((pos, i) => (
          <div key={i} className="absolute" style={{ ...pos, opacity: 0.12 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M2 18 L2 2 L18 2" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 2 L2 2" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        ))}

        {/* 8 ── Rotating geometric ring — top-right */}
        <div
          className="wc-rot absolute"
          style={{
            top: "8%", right: "7%",
            width: 140, height: 140,
            opacity: 0.07,
            "--rd": "28s",
          } as React.CSSProperties}
        >
          <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="70" cy="70" r="64" stroke="#8B5CF6" strokeWidth="0.8" strokeDasharray="8 4"/>
            <circle cx="70" cy="70" r="48" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="4 8"/>
            <polygon points="70,6 134,53 134,87 70,134 6,87 6,53" stroke="#A855F7" strokeWidth="0.6" fill="none" strokeDasharray="6 6"/>
          </svg>
        </div>

        {/* 9 ── Rotating geometric ring — bottom-left */}
        <div
          className="wc-rot-r absolute"
          style={{
            bottom: "10%", left: "5%",
            width: 110, height: 110,
            opacity: 0.065,
            "--rd": "22s",
          } as React.CSSProperties}
        >
          <svg viewBox="0 0 110 110" fill="none">
            <rect x="10" y="10" width="90" height="90" rx="4" stroke="#8B5CF6" strokeWidth="0.7" strokeDasharray="6 4" transform="rotate(45 55 55)"/>
            <circle cx="55" cy="55" r="40" stroke="#22D3EE" strokeWidth="0.5" strokeDasharray="3 5"/>
          </svg>
        </div>

        {/* 10 ── Abstract puzzle/circuit symbol — left mid */}
        <div
          className="wc-float-2 absolute"
          style={{ left: "2%", top: "40%", opacity: 0.065 }}
        >
          <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
            <rect x="5"  y="5"  width="25" height="25" rx="3" stroke="#8B5CF6" strokeWidth="0.8"/>
            <rect x="40" y="5"  width="25" height="25" rx="3" stroke="#06B6D4" strokeWidth="0.8"/>
            <rect x="5"  y="40" width="25" height="25" rx="3" stroke="#06B6D4" strokeWidth="0.8"/>
            <rect x="40" y="40" width="25" height="25" rx="3" stroke="#8B5CF6" strokeWidth="0.8"/>
            <line x1="30" y1="17" x2="40" y2="17" stroke="#8B5CF6" strokeWidth="0.6"/>
            <line x1="17" y1="30" x2="17" y2="40" stroke="#8B5CF6" strokeWidth="0.6"/>
            <line x1="53" y1="30" x2="53" y2="40" stroke="#06B6D4" strokeWidth="0.6"/>
            <line x1="30" y1="53" x2="40" y2="53" stroke="#06B6D4" strokeWidth="0.6"/>
          </svg>
        </div>

        {/* 11 ── Abstract binary / data symbol — right mid */}
        <div
          className="wc-float-1 absolute"
          style={{ right: "3%", top: "55%", opacity: 0.055 }}
        >
          <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
            {[0,10,20,30,40,50,60,70].map((y, i) => (
              <g key={y}>
                <text x={i % 2 === 0 ? 0 : 15} y={y+10} fontSize="8" fill="#8B5CF6" fontFamily="monospace" opacity="0.9">{i % 3 === 0 ? "01" : i % 3 === 1 ? "10" : "11"}</text>
                <text x={i % 2 === 0 ? 35 : 20} y={y+10} fontSize="8" fill="#06B6D4" fontFamily="monospace" opacity="0.6">{i % 2 === 0 ? "10" : "01"}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* 12 ── Scan line sweep */}
        <div
          className="wc-scan absolute inset-x-0"
          style={{
            height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.18), rgba(34,211,238,0.12), transparent)",
            top: 0,
          }}
        />

        {/* 13 ── Floating glow dots */}
        {[
          { left: "12%",  top: "22%",  size: 4, color: "#A855F7", d: "5s",  delay: "0s"   },
          { left: "78%",  top: "18%",  size: 3, color: "#22D3EE", d: "7s",  delay: "1.5s" },
          { left: "55%",  top: "72%",  size: 5, color: "#8B5CF6", d: "6s",  delay: "3s"   },
          { left: "88%",  top: "62%",  size: 3, color: "#06B6D4", d: "9s",  delay: "0.5s" },
          { left: "32%",  top: "85%",  size: 4, color: "#A855F7", d: "4s",  delay: "2s"   },
          { left: "6%",   top: "68%",  size: 3, color: "#22D3EE", d: "8s",  delay: "4s"   },
          { left: "67%",  top: "38%",  size: 2, color: "#8B5CF6", d: "5s",  delay: "1s"   },
          { left: "42%",  top: "12%",  size: 3, color: "#06B6D4", d: "6.5s",delay: "2.5s" },
          { left: "92%",  top: "30%",  size: 4, color: "#A855F7", d: "7.5s",delay: "3.5s" },
          { left: "20%",  top: "48%",  size: 2, color: "#22D3EE", d: "4.5s",delay: "0.8s" },
          { left: "75%",  top: "88%",  size: 3, color: "#8B5CF6", d: "5.5s",delay: "1.8s" },
          { left: "48%",  top: "55%",  size: 2, color: "#06B6D4", d: "8.5s",delay: "3.2s" },
        ].map((dot, i) => (
          <div
            key={i}
            className="wc-twinkle absolute rounded-full"
            style={{
              left: dot.left, top: dot.top,
              width: dot.size, height: dot.size,
              background: dot.color,
              boxShadow: `0 0 ${dot.size * 3}px ${dot.color}`,
              "--d": dot.d,
              animationDelay: dot.delay,
            } as React.CSSProperties}
          />
        ))}

        {/* 14 ── Thin horizontal HUD lines */}
        {["18%", "50%", "80%"].map((top, i) => (
          <div
            key={i}
            className="absolute inset-x-0"
            style={{
              top,
              height: "1px",
              background: i === 1
                ? "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.08) 20%, rgba(34,211,238,0.06) 50%, rgba(139,92,246,0.08) 80%, transparent 100%)"
                : "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.05) 30%, transparent 70%)",
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* ─── Page content — sits on top of background layer ─── */}
      <div className="relative" style={{ zIndex: 1 }}>
        <div className="container mx-auto max-w-5xl px-4 py-12">
          {/* Header Section */}
          <div className="mb-12 text-center md:flex md:items-end md:justify-between md:text-left">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
                <Trophy className="h-4 w-4" />
                <span>SOLVE</span>
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

              // Per-game accent colour tokens (raw values for inline styles)
              const accentMap: Record<string, { glow: string; border: string; icon: string; btn: string; btnHover: string }> = {
                'code-breaker':   { glow: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.25)',  icon: 'rgba(74,222,128,0.15)',  btn: 'linear-gradient(135deg,#16a34a,#14532d)', btnHover: 'rgba(74,222,128,0.15)' },
                'memory-matrix':  { glow: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)',  icon: 'rgba(96,165,250,0.15)',  btn: 'linear-gradient(135deg,#2563eb,#1e3a8a)', btnHover: 'rgba(96,165,250,0.15)' },
                'impossible-room':{ glow: 'rgba(192,132,252,0.13)', border: 'rgba(192,132,252,0.28)', icon: 'rgba(192,132,252,0.15)', btn: 'linear-gradient(135deg,#7c3aed,#4c1d95)', btnHover: 'rgba(192,132,252,0.15)' },
                'word-forge':     { glow: 'rgba(251,146,60,0.11)',  border: 'rgba(251,146,60,0.24)',  icon: 'rgba(251,146,60,0.14)',  btn: 'linear-gradient(135deg,#c2410c,#7c2d12)', btnHover: 'rgba(251,146,60,0.14)' },
              };
              const ac = accentMap[gameId] ?? accentMap['impossible-room'];

              return (
                <div
                  key={gameId}
                  className="wc-card group relative flex flex-col overflow-hidden rounded-3xl p-px transition-all duration-500"
                  style={{
                    background: isLocked
                      ? 'rgba(255,255,255,0.04)'
                      : `linear-gradient(135deg, ${ac.border} 0%, rgba(255,255,255,0.06) 40%, rgba(34,211,238,0.1) 100%)`,
                    boxShadow: isLocked
                      ? 'none'
                      : `0 0 0 0px ${ac.glow}, 0 8px 32px rgba(0,0,0,0.45)`,
                    opacity: isLocked ? 0.55 : 1,
                    filter: isLocked ? 'grayscale(0.4)' : 'none',
                  }}
                >
                  {/* ── Hover glow ring (expands on hover via CSS) ── */}
                  <style>{`
                    .wc-card:not(.locked):hover {
                      transform: translateY(-4px) scale(1.005);
                      box-shadow: 0 0 0 1px ${ac.border}, 0 20px 50px rgba(0,0,0,0.55), 0 0 40px ${ac.glow} !important;
                    }
                    .wc-card:not(.locked):hover .wc-sweep {
                      transform: translateX(100%) skewX(-12deg);
                      opacity: 1;
                    }
                    .wc-card:not(.locked):hover .wc-icon-ring {
                      box-shadow: 0 0 0 2px ${ac.border}, 0 0 20px ${ac.glow} !important;
                    }
                    .wc-start-btn {
                      position: relative;
                      overflow: hidden;
                    }
                    .wc-start-btn::before {
                      content: '';
                      position: absolute;
                      inset: 0;
                      background: linear-gradient(180deg, rgba(255,255,255,0.13) 0%, transparent 60%);
                      border-radius: inherit;
                      pointer-events: none;
                    }
                    .wc-start-btn:hover {
                      filter: brightness(1.15);
                      box-shadow: 0 0 20px ${ac.glow}, 0 4px 16px rgba(0,0,0,0.4) !important;
                      transform: translateY(-1px);
                    }
                    .wc-dot-pulse {
                      animation: wc-dot-blink 2s ease-in-out infinite;
                    }
                    @keyframes wc-dot-blink {
                      0%,100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
                      50%      { opacity: 0.6; box-shadow: 0 0 0 3px transparent; }
                    }
                  `}</style>

                  {/* ── Inner card surface ── */}
                  <div
                    className="relative flex flex-grow flex-col rounded-[calc(1.5rem-1px)] p-6"
                    style={{
                      background: 'linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(10,6,25,0.85) 35%, rgba(5,3,15,0.92) 100%)',
                      backdropFilter: 'blur(18px)',
                    }}
                  >
                    {/* Inner top-edge highlight */}
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[calc(1.5rem-1px)]"
                      style={{ background: `linear-gradient(90deg, transparent, ${ac.border}, rgba(255,255,255,0.12), ${ac.border}, transparent)` }}
                    />

                    {/* Ambient corner glow */}
                    <div
                      className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full"
                      style={{ background: `radial-gradient(circle, ${ac.glow} 0%, transparent 70%)`, filter: 'blur(16px)' }}
                    />

                    {/* Light sweep on hover */}
                    <div
                      className="wc-sweep pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-12deg] opacity-0 transition-all duration-700"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)' }}
                    />

                    {/* ── Header row: icon + badge ── */}
                    <div className="mb-6 flex items-start justify-between">
                      {/* Glassy icon container */}
                      <div
                        className="wc-icon-ring relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500"
                        style={{
                          background: `linear-gradient(145deg, ${ac.icon}, rgba(255,255,255,0.03))`,
                          boxShadow: `0 0 0 1px ${ac.border}, 0 4px 16px rgba(0,0,0,0.35)`,
                        }}
                      >
                        {/* Icon gloss sheen */}
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.12),transparent)' }} />
                        <IconComponent className={`h-7 w-7 ${game.color} relative z-10`} />
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
                          <span className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
                            <span className="wc-dot-pulse h-1.5 w-1.5 rounded-full bg-green-400" />
                            Available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="flex-grow">
                      <h3 className="mb-2 text-xl font-bold tracking-tight text-white">{game.name}</h3>
                      <p className="mb-6 text-sm leading-relaxed text-gray-400">{game.description}</p>

                      {isCompleted && session && (
                        <div
                          className="mb-6 grid grid-cols-2 gap-4 rounded-xl p-4"
                          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <div>
                            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Score</p>
                            <p className="text-lg font-bold text-white">{session.score}</p>
                          </div>
                          <div>
                            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Time</p>
                            <p className="text-lg font-bold text-white">{formatDuration(session.duration || 0)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Action button ── */}
                    {!isLocked && (
                      <div className="mt-auto">
                        {isCompleted ? (
                          <Link
                            href={`/weekly-challenges/${gameId}`}
                            className="group/btn flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-white/80 transition-all duration-300 hover:text-white"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            View Results
                            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                          </Link>
                        ) : (
                          <Link
                            href={`/weekly-challenges/${gameId}`}
                            className="wc-start-btn group/btn flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-300"
                            style={{
                              background: ac.btn,
                              boxShadow: `0 2px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)`,
                            }}
                          >
                            {isInProgress ? 'Resume Challenge' : 'Start Challenge'}
                            <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
