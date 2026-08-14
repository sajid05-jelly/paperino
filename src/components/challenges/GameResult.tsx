"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Activity, Clock } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  paperinoAvatar: string;
  score: number;
  durationMs: number;
  rank: number;
}

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
  leaderboard?: LeaderboardEntry[];
}

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = (ms % 60000) / 1000;
  if (minutes > 0) {
    const secStr = seconds < 10 ? `0${seconds.toFixed(1)}` : seconds.toFixed(1);
    return `${minutes}m ${secStr}s`;
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
  leaderboard = [],
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

  const getRankBadge = (rankNum: number | null | undefined) => {
    if (rankNum === undefined || rankNum === null) {
      return (
        <span className="text-xs font-semibold text-purple-300 animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping inline-block" />
          Calculating rank...
        </span>
      );
    }
    
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
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-6xl mx-auto px-4 py-8"
    >
      <div className="glass-panel vision-glass rounded-3xl p-6 md:p-10 relative overflow-hidden border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col gap-8">
        
        {/* Title Header */}
        <div className="text-center relative z-10">
          <span className="text-4xl block mb-2">🎉</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white uppercase tracking-wider">Challenge Complete</h2>
          <p className="text-sm text-purple-300 font-semibold tracking-widest mt-1">{gameName}</p>
        </div>

        {/* 2-Column Split: Result Details left, Leaderboard right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-stretch">
          
          {/* Column Left: Result Details */}
          <div className="lg:col-span-5 bg-black/35 border border-white/5 rounded-2xl p-6 flex flex-col justify-between items-center text-center">
            <div className="w-full space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-white/5 pb-2">Your Result</h3>
              
              <div className="py-4">
                <span className="text-gray-400 uppercase tracking-widest text-[11px] font-bold block mb-1">Final Score</span>
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400">
                  {displayScore} / 100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 flex flex-col items-center">
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-semibold">
                    <Clock size={11} /> Time
                  </span>
                  <span className="text-lg font-bold text-white font-mono">
                    {formatDuration(durationMs)}
                  </span>
                </div>
                
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 flex flex-col items-center">
                  <span className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-semibold">Rank</span>
                  {getRankBadge(rank)}
                </div>
              </div>
            </div>

            {/* Actions Panel nested inside the result section */}
            <div className="w-full flex flex-col gap-3 mt-8 border-t border-white/5 pt-6">
              <button 
                onClick={onViewLeaderboard}
                className="liquid-btn w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trophy size={14} /> View Leaderboard
              </button>
              
              <button 
                onClick={onBackToHub}
                className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Challenges
              </button>
            </div>
          </div>

          {/* Column Right: Real-time Leaderboard */}
          <div className="lg:col-span-7 bg-black/35 border border-white/5 rounded-2xl p-6 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-300 border-b border-white/5 pb-2 mb-4">
              Weekly Leaderboard
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2 pr-1">
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((entry, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center text-xs p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full font-black text-[10px] ${
                        entry.rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        entry.rank === 2 ? 'bg-slate-400/20 text-slate-200 border border-slate-400/30' :
                        entry.rank === 3 ? 'bg-orange-700/20 text-orange-300 border border-orange-700/30' :
                        'bg-white/5 text-gray-400 border border-white/5'
                      }`}>
                        #{entry.rank}
                      </span>
                      <span className="text-gray-200 font-bold text-sm">
                        {entry.displayName}
                      </span>
                    </div>
                    
                    <div className="text-right font-mono flex items-center gap-2">
                      <span className="text-purple-300 font-extrabold text-sm">{entry.score} pts</span>
                      <span className="text-gray-600 font-normal">|</span>
                      <span className="text-gray-450 font-medium">{(entry.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-center py-12 text-sm text-gray-400 italic">
                  Be the first to complete this challenge.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
