"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, 
  ArrowLeft, 
  Activity, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Zap, 
  Target, 
  BookOpen, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";

export interface ReviewItem {
  questionNumber: number;
  question: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  options?: string[];
  category?: string;
  details?: Record<string, any>;
}

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
  onPlayAgain?: () => void;
  onBackToHub: () => void;
  leaderboard?: LeaderboardEntry[];
  wasAlreadyCompleted?: boolean;
  xpEarned?: number;
  accuracy?: number;
  correctCount?: number;
  totalQuestions?: number;
  reviewItems?: ReviewItem[];
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
  wasAlreadyCompleted = false,
  xpEarned = Math.max(50, score * 10),
  accuracy = 100,
  correctCount,
  totalQuestions = 5,
  reviewItems = [],
}: GameResultProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showReview, setShowReview] = useState(true);

  const resolvedCorrectCount = correctCount ?? (Math.round((accuracy / 100) * totalQuestions));
  const resolvedIncorrectCount = Math.max(0, totalQuestions - resolvedCorrectCount);

  useEffect(() => {
    if (wasAlreadyCompleted) {
      setDisplayScore(score);
      return;
    }
    let startTime: number;
    let animationFrame: number;
    const duration = 1200; // ms

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
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
  }, [score, wasAlreadyCompleted]);

  const getRankBadge = (rankNum: number | null | undefined) => {
    if (rankNum === undefined || rankNum === null) {
      return (
        <span className="text-xs font-semibold text-purple-300 animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping inline-block" />
          Rank #1
        </span>
      );
    }
    
    let colorClass = "bg-white/10 text-gray-300 border-white/20";
    if (rankNum === 1) colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]";
    if (rankNum === 2) colorClass = "bg-slate-300/20 text-slate-300 border-slate-300/50 shadow-[0_0_15px_rgba(203,213,225,0.3)]";
    if (rankNum === 3) colorClass = "bg-orange-700/20 text-orange-400 border-orange-700/50 shadow-[0_0_15px_rgba(194,65,12,0.3)]";

    return (
      <div className={`px-3 py-1 rounded-full border font-bold text-xs ${colorClass} flex items-center gap-1.5`}>
        <Trophy className="w-3.5 h-3.5" />
        <span>#{rankNum}</span>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-8"
    >
      <div className="glass-panel vision-glass rounded-3xl p-4 sm:p-6 md:p-10 relative overflow-hidden border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col gap-5 sm:gap-8">
        
        {/* Title Header */}
        <div className="text-center relative z-10">
          <span className="text-4xl block mb-2">{wasAlreadyCompleted ? '✅' : '🎉'}</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white uppercase tracking-wider">
            {wasAlreadyCompleted ? 'Attempt Completed' : 'Challenge Complete'}
          </h2>
          <p className="text-sm text-purple-300 font-semibold tracking-widest mt-1">{gameName}</p>
          {wasAlreadyCompleted && (
            <p className="text-xs text-gray-400 mt-3 max-w-md mx-auto leading-relaxed">
              Your official attempt for this challenge session is already completed. 
              Review your answers below or check back when the next session opens.
            </p>
          )}
        </div>

        {/* 4-Stat Mobile Responsive Performance Metric Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-semibold">
              <Zap size={12} className="text-purple-400" /> Weekly XP
            </span>
            <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400">
              +{xpEarned} XP
            </span>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-semibold">
              <Target size={12} className="text-cyan-400" /> Accuracy
            </span>
            <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
              {accuracy}%
            </span>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-semibold">
              <CheckCircle2 size={12} className="text-green-400" /> Correct / Incorrect
            </span>
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold font-mono">
              <span className="text-green-400">{resolvedCorrectCount}✓</span>
              <span className="text-gray-600">/</span>
              <span className="text-rose-400">{resolvedIncorrectCount}✗</span>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1 font-semibold">
              <Clock size={12} className="text-amber-400" /> Time Taken
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {formatDuration(durationMs)}
            </span>
          </div>
        </div>

        {/* 2-Column Split: Result Details left, Leaderboard right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 relative z-10 items-stretch">
          
          {/* Column Left: Result Details */}
          <div className="lg:col-span-5 bg-black/35 border border-white/5 rounded-2xl p-4 sm:p-6 flex flex-col justify-between items-center text-center">
            <div className="w-full space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-white/5 pb-2">Your Performance</h3>
              
              <div className="py-2">
                <span className="text-gray-400 uppercase tracking-widest text-[11px] font-bold block mb-1">Final Score</span>
                <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400">
                  {displayScore} / 100
                </span>
              </div>

              <div className="flex justify-center items-center gap-2 pt-2">
                <span className="text-gray-400 text-xs font-semibold">Official Rank:</span>
                {getRankBadge(rank)}
              </div>
            </div>

            {/* Actions Panel */}
            <div className="w-full flex flex-col gap-3 mt-4 sm:mt-8 border-t border-white/5 pt-4 sm:pt-6">
              <button 
                onClick={onViewLeaderboard}
                className="liquid-btn w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.2)]"
              >
                <Trophy size={14} /> Overall Weekly Leaderboard
              </button>
              
              <button 
                onClick={onBackToHub}
                className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Arena
              </button>
            </div>
          </div>

          {/* Column Right: Top 3 Leaderboard */}
          <div className="lg:col-span-7 bg-black/35 border border-white/5 rounded-2xl p-4 sm:p-6 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-300 border-b border-white/5 pb-2 mb-3 sm:mb-4 flex items-center justify-between">
              <span>Challenge Leaderboard · Top 3</span>
              <span className="text-[10px] text-gray-400 font-normal">Official verified scores</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto max-h-[280px] sm:max-h-[320px] space-y-2 pr-1">
              {leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((entry, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-default"
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
                      <span className="text-gray-200 font-bold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                        {entry.displayName}
                      </span>
                    </div>
                    
                    <div className="text-right font-mono flex items-center gap-2 flex-shrink-0">
                      <span className="text-purple-300 font-extrabold text-xs sm:text-sm">{entry.score} pts</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-400 text-xs">{(entry.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-center py-12 text-sm text-gray-400 italic">
                  Be the first to record an official score for this challenge!
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ─── COMPLETE ANSWER REVIEW / SOLUTION REVIEW SECTION ─── */}
      {reviewItems && reviewItems.length > 0 && (
        <div className="glass-panel vision-glass rounded-3xl p-4 sm:p-6 md:p-8 border border-purple-500/20 relative overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  Answer & Solution Review
                </h3>
                <p className="text-xs text-gray-400">
                  Question-by-question breakdown with engineering explanations
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowReview(!showReview)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer border border-white/5"
            >
              <span>{showReview ? 'Collapse' : 'Expand'}</span>
              {showReview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showReview && (
            <div className="space-y-6">
              {reviewItems.map((item, idx) => {
                const isUnanswered = !item.userAnswer || item.userAnswer === 'Not Answered';
                
                return (
                  <div 
                    key={idx}
                    className={`rounded-2xl p-4 sm:p-6 border transition-all ${
                      item.isCorrect 
                        ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' 
                        : isUnanswered
                          ? 'bg-amber-950/20 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                          : 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
                    }`}
                  >
                    {/* Header Row: Q Number, Category & Status Indicator */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-mono font-bold text-xs">
                          Question {item.questionNumber}
                        </span>
                        {item.category && (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-medium border border-purple-500/30">
                            {item.category}
                          </span>
                        )}
                      </div>

                      {/* Status indicator badge */}
                      {item.isCorrect ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                          <CheckCircle2 size={14} className="text-emerald-400" /> Correct
                        </span>
                      ) : isUnanswered ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                          <AlertCircle size={14} className="text-amber-400" /> Not Answered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                          <XCircle size={14} className="text-rose-400" /> Incorrect
                        </span>
                      )}
                    </div>

                    {/* Question text */}
                    <div className="text-sm sm:text-base text-gray-200 font-medium mb-4 whitespace-pre-line leading-relaxed">
                      {item.question}
                    </div>

                    {/* Answer Comparison Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {/* Student's answer */}
                      <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                        item.isCorrect
                          ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-100'
                          : isUnanswered
                            ? 'bg-amber-900/30 border-amber-500/40 text-amber-100'
                            : 'bg-rose-900/30 border-rose-500/40 text-rose-100'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                          Your Selected Answer:
                        </span>
                        <div className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                          {item.isCorrect ? (
                            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                          ) : isUnanswered ? (
                            <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-rose-400 flex-shrink-0" />
                          )}
                          <span className="break-words">{item.userAnswer || 'Not Answered'}</span>
                        </div>
                      </div>

                      {/* Correct answer */}
                      <div className="p-3 rounded-xl border bg-emerald-950/40 border-emerald-500/50 text-emerald-100 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                          Correct Solution:
                        </span>
                        <div className="font-semibold text-xs sm:text-sm flex items-center gap-2 text-emerald-300">
                          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                          <span className="break-words">{item.correctAnswer}</span>
                        </div>
                      </div>
                    </div>

                    {/* Explanation Box */}
                    {item.explanation && (
                      <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs sm:text-sm text-purple-200 leading-relaxed flex items-start gap-2.5">
                        <Lightbulb size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block mb-0.5 text-xs uppercase tracking-wider">
                            Explanation & Technical Breakdown:
                          </span>
                          <span>{item.explanation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
