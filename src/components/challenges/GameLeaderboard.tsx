"use client";

import React from "react";
import { motion } from "framer-motion";
import { X, Trophy, Clock, Medal } from "lucide-react";
import { formatDuration } from "@/lib/challengeUtils";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  paperinoAvatar: string;
  score: number;
  durationMs: number;
  rank: number;
}

interface GameLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  currentUserRank: number | null;
  gameId: string;
  gameName: string;
  weekId: string;
  onClose: () => void;
}

export default function GameLeaderboard({
  entries,
  currentUserId,
  currentUserRank,
  gameId,
  gameName,
  weekId,
  onClose,
}: GameLeaderboardProps) {
  const topThree = entries.filter((e) => e.rank <= 3).sort((a, b) => a.rank - b.rank);
  const remaining = entries.filter((e) => e.rank > 3).sort((a, b) => a.rank - b.rank);

  const isCurrentUserInTop10 = entries.some(e => e.userId === currentUserId && e.rank <= 10);

  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]";
      case 2:
        return "border-slate-300/50 bg-slate-300/10 shadow-[0_0_20px_rgba(203,213,225,0.15)]";
      case 3:
        return "border-orange-700/50 bg-orange-700/10 shadow-[0_0_20px_rgba(194,65,12,0.15)]";
      default:
        return "border-white/10 bg-white/5";
    }
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-amber-400";
      case 2: return "text-slate-300";
      case 3: return "text-orange-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel vision-glass w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Trophy className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">{gameName} Leaderboard</h2>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {weekId}
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <div className="flex items-end justify-center gap-4 mb-10 pt-4">
              {/* Rank 2 */}
              {topThree[1] && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`flex flex-col items-center p-4 rounded-2xl border ${getPodiumStyle(2)} w-1/3 max-w-[140px]`}
                >
                  <Medal className={`w-6 h-6 mb-2 ${getPodiumColor(2)}`} />
                  <div className="w-12 h-12 rounded-full bg-slate-300/20 flex items-center justify-center text-lg font-bold text-slate-300 mb-2">
                    {topThree[1].displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-white truncate w-full text-center">{topThree[1].displayName}</span>
                  <span className="text-lg font-black text-slate-300 mt-1">{topThree[1].score}</span>
                  <span className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDuration(topThree[1].durationMs)}</span>
                </motion.div>
              )}
              
              {/* Rank 1 */}
              {topThree[0] && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`flex flex-col items-center p-5 rounded-2xl border ${getPodiumStyle(1)} w-1/3 max-w-[160px] z-10 -translate-y-4`}
                >
                  <Trophy className={`w-8 h-8 mb-2 ${getPodiumColor(1)}`} />
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl font-bold text-amber-300 mb-2 border-2 border-amber-500/50">
                    {topThree[0].displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-white truncate w-full text-center">{topThree[0].displayName}</span>
                  <span className="text-2xl font-black text-amber-400 mt-1">{topThree[0].score}</span>
                  <span className="text-xs text-gray-300 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDuration(topThree[0].durationMs)}</span>
                </motion.div>
              )}

              {/* Rank 3 */}
              {topThree[2] && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`flex flex-col items-center p-4 rounded-2xl border ${getPodiumStyle(3)} w-1/3 max-w-[140px]`}
                >
                  <Medal className={`w-6 h-6 mb-2 ${getPodiumColor(3)}`} />
                  <div className="w-10 h-10 rounded-full bg-orange-700/30 flex items-center justify-center text-base font-bold text-orange-400 mb-2">
                    {topThree[2].displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-white truncate w-full text-center">{topThree[2].displayName}</span>
                  <span className="text-lg font-black text-orange-400 mt-1">{topThree[2].score}</span>
                  <span className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDuration(topThree[2].durationMs)}</span>
                </motion.div>
              )}
            </div>
          )}

          {/* List Entries */}
          <div className="flex flex-col gap-2">
            {remaining.map((entry, idx) => (
              <motion.div 
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (idx * 0.05) }}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${entry.userId === currentUserId ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5'} hover:bg-white/10 transition-colors`}
              >
                <div className="w-8 text-center font-mono font-bold text-gray-400">
                  #{entry.rank}
                </div>
                
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-300 shrink-0">
                  {entry.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {entry.displayName} {entry.userId === currentUserId && <span className="text-purple-400 text-xs ml-2">(You)</span>}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-black text-white">{entry.score}</div>
                  <div className="text-xs text-gray-400 font-mono">{formatDuration(entry.durationMs)}</div>
                </div>
              </motion.div>
            ))}

            {entries.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No entries yet. Be the first!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky bottom bar for current user if not in top list shown */}
        {!isCurrentUserInTop10 && currentUserRank && (
          <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/30">
              <span className="text-sm font-medium text-gray-300">Your Rank</span>
              <span className="text-xl font-bold text-purple-300">#{currentUserRank}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
