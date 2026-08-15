"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Loader2, RotateCcw, Check, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';
import ChallengeGameShell from '@/components/challenges/ChallengeGameShell';
import { useRouter } from 'next/navigation';

type GameState = 'intro' | 'loading' | 'memorizing' | 'recalling' | 'checking_round' | 'round_result' | 'submitting' | 'result';

function getSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const ROUND_CONFIGS = [
  { round: 1, size: 3, targets: 3 },
  { round: 2, size: 4, targets: 4 },
  { round: 3, size: 5, targets: 6 },
  { round: 4, size: 6, targets: 8 },
  { round: 5, size: 7, targets: 10 },
];

interface RoundStats {
  round: number;
  correct: number;
  totalTargets: number;
  incorrect: number;
  missed: number;
  accuracy: number;
  score: number;
  originalPattern: string[];
  selectedPattern: string[];
}

export default function MemoryMatrixPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [isOfficial, setIsOfficial] = useState(false);
  
  const [rounds, setRounds] = useState<string[][]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [userRounds, setUserRounds] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(3);
  
  const [lastRoundStats, setLastRoundStats] = useState<RoundStats | null>(null);
  
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

  const currentCfg = ROUND_CONFIGS[currentRoundIdx] || ROUND_CONFIGS[0];
  const isCreatingSession = useRef(false);
  const isSubmittingRound = useRef(false);

  useEffect(() => {
    async function checkAttempt() {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setCheckingAttempt(false);
        return;
      }
      try {
        setCheckingAttempt(true);
        const token = await currentUser.getIdToken();
        const configRes = await fetch("/api/challenge-start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ gameId: "memory-matrix" })
        });
        const configData = await configRes.json();
        
        if (configRes.status === 409 && configData.completed) {
          setResultData({
            score: configData.score,
            durationMs: configData.durationMs,
            rank: configData.rank,
            isOfficial: true,
            leaderboard: configData.leaderboard || []
          });
          setWasAlreadyCompleted(true);
          setGameState("result");
        } else if (!configRes.ok) {
          setError(configData.error || "Failed to contact game servers");
        }
      } catch (err: any) {
        console.error("Checking challenge attempt failed:", err);
      } finally {
        setCheckingAttempt(false);
      }
    }
    
    // Subscribe to auth state transitions
    const unsubscribe = auth.onAuthStateChanged((u: any) => {
      if (u) {
        checkAttempt();
      } else {
        setCheckingAttempt(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const startGame = async () => {
    if (isCreatingSession.current) return;
    try {
      isCreatingSession.current = true;
      setError('');
      setGameState('loading');
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in to play Weekly Challenges.');
      
      const res = await fetch('/api/challenge-start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameId: 'memory-matrix' })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start challenge session');
      
      setSessionId(data.sessionId);
      setIsOfficial(Boolean(data.isOfficial));
      
      const seedNum = getSeed(`memory-matrix-${data.challengeDate}`);
      const rand = mulberry32(seedNum);
      const generatedRounds: string[][] = [];
      
      for (let r = 0; r < 5; r++) {
        const cfg = ROUND_CONFIGS[r];
        const pattern: string[] = [];
        while (pattern.length < cfg.targets) {
          const rRow = Math.floor(rand() * cfg.size);
          const rCol = Math.floor(rand() * cfg.size);
          const cellStr = `${rRow},${rCol}`;
          if (!pattern.includes(cellStr)) {
            pattern.push(cellStr);
          }
        }
        generatedRounds.push(pattern);
      }
      
      setRounds(generatedRounds);
      setCurrentRoundIdx(0);
      setUserRounds([]);
      setSelectedCells([]);
      setStartTime(Date.now());
      startRoundPhase(0, generatedRounds);
    } catch (err: any) {
      setError(err.message || 'Unable to start challenge');
      setGameState('intro');
    } finally {
      isCreatingSession.current = false;
    }
  };

  const recallStartTimeRef = useRef<number>(0);

  const startRoundPhase = (roundIdx: number, roundsArray: string[][]) => {
    setCurrentRoundIdx(roundIdx);
    setSelectedCells([]);
    isSubmittingRound.current = false;
    setGameState('memorizing');
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        recallStartTimeRef.current = Date.now();
        setGameState('recalling');
      }
    }, 1000);
  };

  const handleCellClick = (cellStr: string) => {
    if (gameState !== 'recalling' || isSubmittingRound.current) return;
    
    if (selectedCells.includes(cellStr)) {
      setSelectedCells(prev => prev.filter(c => c !== cellStr));
    } else {
      if (selectedCells.length < currentCfg.targets) {
        setSelectedCells(prev => [...prev, cellStr]);
      }
    }
  };

  const handleClearSelection = () => {
    if (gameState !== 'recalling' || isSubmittingRound.current) return;
    setSelectedCells([]);
  };

  const handleRoundSubmit = () => {
    if (isSubmittingRound.current || gameState !== 'recalling') return;
    isSubmittingRound.current = true;
    setGameState('checking_round');

    const recallDurationMs = Math.max(1, Date.now() - (recallStartTimeRef.current || Date.now()));
    const recallSeconds = recallDurationMs / 1000;

    const pattern = rounds[currentRoundIdx] || [];
    const totalTargets = pattern.length;
    
    // Exact Target Match Calculations
    const correctTargets = selectedCells.filter(c => pattern.includes(c)).length;
    const incorrectSelections = selectedCells.filter(c => !pattern.includes(c)).length;
    const missedTargets = pattern.filter(c => !selectedCells.includes(c)).length;
    
    const accuracy = totalTargets > 0 ? Math.round((correctTargets / totalTargets) * 100) : 0;
    const isFullyCorrect = correctTargets === totalTargets && incorrectSelections === 0;

    // SCORING SPECIFICATION:
    // Base 10 points if round is correct (or scaled by accuracy if partial)
    const basePoints = Math.round((accuracy / 100) * 10);

    // Speed bonus up to 10 points based on actual recall seconds:
    // Very fast (< 2.5s): +10
    // Fast (< 4.5s): +8
    // Normal (< 7.0s): +5
    // Slow (< 10.0s): +2
    // Very slow (>= 10.0s): +0
    let speedBonus = 0;
    if (isFullyCorrect || accuracy >= 80) {
      if (recallSeconds < 2.5) speedBonus = 10;
      else if (recallSeconds < 4.5) speedBonus = 8;
      else if (recallSeconds < 7.0) speedBonus = 5;
      else if (recallSeconds < 10.0) speedBonus = 2;
      else speedBonus = 0;
    }

    const roundScore = Math.min(20, basePoints + speedBonus);

    const roundResultData = {
      round: currentRoundIdx + 1,
      selected: selectedCells,
      targets: pattern,
      correct: correctTargets,
      total: totalTargets,
      incorrect: incorrectSelections,
      missed: missedTargets,
      accuracy,
      basePoints,
      speedBonus,
      recallSeconds,
      score: roundScore
    };

    const updatedUserRounds = [...userRounds, roundResultData];
    setUserRounds(updatedUserRounds);

    setLastRoundStats({
      round: currentRoundIdx + 1,
      correct: correctTargets,
      totalTargets,
      incorrect: incorrectSelections,
      missed: missedTargets,
      accuracy,
      score: roundScore,
      originalPattern: pattern,
      selectedPattern: [...selectedCells]
    });

    // Immediate state transition to round result
    setGameState('round_result');
  };

  const handleNextRound = () => {
    if (currentRoundIdx < 4) {
      startRoundPhase(currentRoundIdx + 1, rounds);
    } else {
      submitGame(userRounds);
    }
  };

  const submitGame = async (overrideRounds?: any[]) => {
    const roundsToSubmit = (overrideRounds && overrideRounds.length > 0) ? overrideRounds : userRounds;
    let totalAccumulatedScore = 0;
    roundsToSubmit.forEach((r: any) => {
      totalAccumulatedScore += (r.score || 0);
    });
    const finalCalculatedScore = Math.max(0, Math.min(100, Math.round(totalAccumulatedScore)));

    try {
      setGameState('submitting');
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/challenge-submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          gameData: {
            rounds: roundsToSubmit,
            score: finalCalculatedScore,
            durationMs: Date.now() - startTime
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Submit failed:', data.error);
        setResultData({
          score: finalCalculatedScore,
          durationMs: Date.now() - startTime,
          rank: isOfficial ? 1 : null,
          isOfficial: isOfficial,
          leaderboard: []
        });
        setGameState('result');
        return;
      }

      setResultData({
        ...data,
        rank: data.rank ?? (data.isOfficial ? 1 : null),
        leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : []
      });
      setGameState('result');
    } catch (err: any) {
      console.error('Submit error:', err);
      setResultData({
        score: finalCalculatedScore,
        durationMs: Date.now() - startTime,
        rank: isOfficial ? 1 : null,
        isOfficial: isOfficial,
        leaderboard: []
      });
      setGameState('result');
    }
  };



  if (gameState === 'intro') {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center max-w-xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center flex flex-col items-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <RefreshCw className="animate-spin text-purple-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Memory Matrix</h1>
            <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
              Memorize the highlighted cell patterns and recreate them. The grid starts at 3x3 and grows to a challenging 7x7!
            </p>
          </div>

          <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-left text-gray-300">
            <p>• <strong>5 rounds</strong> of progressive complexity</p>
            <p>• Round 1 is 3x3 grid, up to Round 5 which is 7x7 grid</p>
            <p>• <strong>3 seconds</strong> to memorize pattern each round</p>
            <p>• Recreate the pattern by clicking cells</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button onClick={startGame} className="liquid-btn w-full py-3.5 font-bold text-sm uppercase tracking-wider">
            Start Challenge
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center flex flex-col items-center gap-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Preparing Challenge</h2>
            <p className="text-xs text-gray-400">Securing your session...</p>
            <p className="text-xs text-amber-300/80 font-medium animate-pulse mt-2">Please wait for 25 seconds while we set up your challenge session...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'submitting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center flex flex-col items-center gap-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2 leading-snug">Please wait up to 25 seconds while we save your result.</h2>
            <p className="text-xs text-gray-400 leading-relaxed">Your result is being saved securely. Please do not close or refresh this page.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'result' && resultData) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <GameResult 
          score={resultData.score}
          durationMs={resultData.durationMs}
          rank={resultData.rank}
          isOfficial={resultData.isOfficial}
          wasAlreadyCompleted={wasAlreadyCompleted}
          gameId="memory-matrix"
          gameName="Memory Matrix"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => window.location.reload()}
          onBackToHub={() => router.push("/weekly-challenges")}
          leaderboard={resultData.leaderboard}
        />
      </div>
    );
  }

  const currentPattern = rounds[currentRoundIdx] || [];
  const gridSize = currentCfg.size;

  const rulesContent = (
    <ul className="space-y-2.5 list-disc list-inside text-sm">
      <li>Memorize the highlighted purple pattern.</li>
      <li>You have <strong>3 seconds</strong> to look at the pattern.</li>
      <li>Recreate it precisely by clicking the grid cells.</li>
      <li>Rounds increase in size progressively from <strong>3x3</strong> up to <strong>7x7</strong>.</li>
      <li>Each round score depends on accuracy and correctly selected targets.</li>
    </ul>
  );

  return (
    <ChallengeGameShell
      gameId="memory-matrix"
      gameName="Memory Matrix"
      gameIcon={<RefreshCw size={20} />}
      attemptText={`Round ${currentRoundIdx + 1} of 5 (${gridSize}×${gridSize})`}
      timerNode={<GameTimer isRunning={gameState === 'memorizing' || gameState === 'recalling'} startTime={startTime} />}
      rulesContent={rulesContent}
      gameState={gameState}
    >
      <div className="w-full max-w-2xl flex flex-col items-center justify-center py-4">
        
        {/* Header Phase Banners */}
        {gameState === 'memorizing' && (
          <div className="mb-6 text-center space-y-1">
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-bold uppercase tracking-wider animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Eye size={16} /> MEMORIZE THE PATTERN — {countdown}s
            </span>
            <p className="text-xs text-gray-400">Remember the highlighted cells. They will disappear.</p>
          </div>
        )}

        {(gameState === 'recalling' || gameState === 'checking_round') && (
          <div className="mb-6 text-center space-y-1">
            <span className="inline-block px-5 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              RECREATE THE PATTERN
            </span>
            <p className="text-xs text-gray-400">Select the cells that were highlighted.</p>
          </div>
        )}

        {/* Grid Container */}
        <div 
          className="grid gap-2.5 p-6 glass-panel vision-glass rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-[460px] aspect-square"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
            const row = Math.floor(idx / gridSize);
            const col = idx % gridSize;
            const cellStr = `${row},${col}`;
            
            const isTarget = currentPattern.includes(cellStr);
            const isSelected = selectedCells.includes(cellStr);

            let bgClass = "bg-white/5 border-white/10 hover:bg-white/10";
            if (gameState === 'memorizing' && isTarget) {
              bgClass = "bg-purple-500 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.8)] scale-95";
            } else if ((gameState === 'recalling' || gameState === 'checking_round') && isSelected) {
              bgClass = "bg-cyan-500 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-95";
            }

            return (
              <button
                key={cellStr}
                onClick={() => handleCellClick(cellStr)}
                disabled={gameState !== 'recalling' || isSubmittingRound.current}
                className={`rounded-xl border transition-all duration-200 aspect-square flex items-center justify-center cursor-pointer ${bgClass} disabled:cursor-not-allowed`}
              >
                {(gameState === 'recalling' || gameState === 'checking_round') && isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm animate-ping"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Control Footer */}
        {(gameState === 'recalling' || gameState === 'checking_round') && (
          <div className="w-full max-w-[460px] mt-8 flex flex-col items-center gap-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between w-full px-2 text-xs font-semibold text-gray-300">
              <span>Selected: <strong className="text-cyan-400">{selectedCells.length} / {currentCfg.targets}</strong></span>
              <button 
                onClick={handleClearSelection}
                disabled={isSubmittingRound.current}
                className="flex items-center gap-1 text-gray-400 hover:text-rose-450 transition-colors cursor-pointer disabled:opacity-40"
              >
                <RotateCcw size={12} /> Clear Selection
              </button>
            </div>

            <button
              onClick={handleRoundSubmit}
              disabled={selectedCells.length !== currentCfg.targets || isSubmittingRound.current}
              className="liquid-btn w-full py-3.5 text-xs uppercase tracking-wider font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {gameState === 'checking_round' ? (
                <>
                  <Loader2 size={14} className="animate-spin text-purple-300" />
                  CHECKING...
                </>
              ) : (
                `SUBMIT ROUND ${currentRoundIdx + 1}`
              )}
            </button>
          </div>
        )}
      </div>

      {/* Round Result Modal */}
      {gameState === 'round_result' && lastRoundStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel vision-glass p-6 rounded-3xl border border-purple-500/30 max-w-md w-full text-center space-y-5 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Check size={24} />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wide">✓ ROUND {lastRoundStats.round} COMPLETE</h3>
              <p className="text-xs text-gray-400 mt-1">Pattern analysis breakdown</p>
            </div>
            
            {/* Quantitative Stats */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center"><span className="text-gray-300">Correct Targets</span><span className="text-emerald-400 font-bold">{lastRoundStats.correct} / {lastRoundStats.totalTargets}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Incorrect Selections</span><span className="text-rose-400 font-bold">{lastRoundStats.incorrect}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Missed Targets</span><span className="text-amber-400 font-bold">{lastRoundStats.missed}</span></div>
              <div className="h-px bg-white/10 my-1"></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Accuracy</span><span className="text-purple-300 font-bold">{lastRoundStats.accuracy}%</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-300">Round Score</span><span className="text-emerald-400 font-extrabold text-sm">+{lastRoundStats.score}</span></div>
            </div>

            {/* Visual Pattern Comparison Grid */}
            <div className="space-y-1.5 text-left">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">Pattern Comparison</p>
              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-300 py-1">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Correct</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span> Wrong</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span> Missed</span>
              </div>
              
              <div 
                className="grid gap-1.5 p-3 bg-black/50 rounded-2xl border border-white/10 max-w-[240px] mx-auto aspect-square"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
                }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                  const row = Math.floor(idx / gridSize);
                  const col = idx % gridSize;
                  const cellStr = `${row},${col}`;
                  
                  const isTarget = lastRoundStats.originalPattern.includes(cellStr);
                  const isSelected = lastRoundStats.selectedPattern.includes(cellStr);

                  let cellStyle = "bg-white/5 border-white/10";
                  if (isTarget && isSelected) {
                    cellStyle = "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"; // Correct
                  } else if (!isTarget && isSelected) {
                    cellStyle = "bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"; // Wrong Selection
                  } else if (isTarget && !isSelected) {
                    cellStyle = "bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"; // Missed
                  }

                  return (
                    <div 
                      key={`comp-${cellStr}`}
                      className={`rounded-lg border aspect-square ${cellStyle}`}
                    />
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleNextRound}
              className="liquid-btn w-full py-3.5 text-xs uppercase tracking-wider font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              {currentRoundIdx < 4 ? `CONTINUE TO ROUND ${currentRoundIdx + 2}` : 'COMPLETE CHALLENGE'}
            </button>
          </div>
        </div>
      )}
    </ChallengeGameShell>
  );
}
