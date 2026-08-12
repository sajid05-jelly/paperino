"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, RefreshCw, ArrowLeft, Activity, Clock } from "lucide-react";

interface GameResultProps {
  score: number;
  durationMs: number;
  rank: number | null;
  isOfficial: boolean;
  gameId: string;
  gameName: string;
  onViewLeaderboard: () => void;
  onPlayAgain: () => void;
  onBackToHub: () => void;
}

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = (ms % 60000) / 1000;
  if (minutes > 0) {
    return `${minutes}m ${seconds.toFixed(1)}s`;
  }
  return `${seconds.toFixed(1)}s`;
};

export default function GameResult({
  score,
  durationMs,
  rank,
  isOfficial,
  gameId,
  gameName,
  onViewLeaderboard,
  onPlayAgain,
  onBackToHub,
}: GameResultProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    const duration = 1500; // ms

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutQuart)
      const easeOut = 1 - Math.pow(1 - percentage, 4);
      
      setDisplayScore(Math.floor(easeOut * score));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayScore(score);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [score]);

  const getRankBadge = (rankNum: number | null) => {
    if (!rankNum) return null;
    
    let colorClass = "bg-white/10 text-gray-300 border-white/20";
    if (rankNum === 1) colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]";
    if (rankNum === 2) colorClass = "bg-slate-300/20 text-slate-300 border-slate-300/50 shadow-[0_0_15px_rgba(203,213,225,0.3)]";
    if (rankNum === 3) colorClass = "bg-orange-700/20 text-orange-400 border-orange-700/50 shadow-[0_0_15px_rgba(194,65,12,0.3)]";

    return (
      <div className={`px-4 py-1.5 rounded-full border font-bold ${colorClass} flex items-center gap-2`}>
        <Trophy className="w-4 h-4" />
        <span>#{rankNum}</span>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-md w-full mx-auto"
    >
      <div className="glass-panel vision-glass rounded-3xl p-8 relative overflow-hidden border border-purple-500/20 shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-2">{gameName}</h2>
          
          {!isOfficial && (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-6">
              Practice Mode
            </span>
          )}

          {/* Score Display */}
          <div className="flex flex-col items-center justify-center my-8">
            <span className="text-gray-400 uppercase tracking-widest text-sm font-semibold mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Final Score
            </span>
            <motion.div 
              className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-purple-200 to-purple-400 filter drop-shadow-lg"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              {displayScore}
            </motion.div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-white/5">
              <span className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time
              </span>
              <span className="text-xl font-semibold text-purple-100 font-mono">
                {formatDuration(durationMs)}
              </span>
            </div>
            
            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-white/5">
              <span className="text-gray-400 text-xs uppercase tracking-wider mb-1">Rank</span>
              {getRankBadge(rank) || <span className="text-xl font-semibold text-gray-500">-</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full relative z-20">
            <button 
              onClick={onViewLeaderboard}
              className="liquid-btn w-full py-4 rounded-2xl font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 relative z-30"
            >
              <Trophy className="w-5 h-5" /> View Leaderboard
            </button>
            
            <button 
              onClick={onPlayAgain}
              title="Practice run, won't affect leaderboard"
              className="w-full py-4 rounded-2xl font-medium text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 transition-colors flex items-center justify-center gap-2 group relative z-30 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> 
              Play Again (Practice)
            </button>
            
            <button 
              onClick={onBackToHub}
              className="w-full py-3 mt-2 rounded-2xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 relative z-30"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Challenges
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
