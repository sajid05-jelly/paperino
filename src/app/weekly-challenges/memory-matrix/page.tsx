"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, RotateCcw, Award, Check, AlertCircle, RefreshCw } from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';
import { useRouter } from 'next/navigation';

type GameState = 'intro' | 'memorizing' | 'recalling' | 'round_result' | 'submitting' | 'result';

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

export default function MemoryMatrixPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [challengeDate, setChallengeDate] = useState<string>('');
  
  const [rounds, setRounds] = useState<string[][]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [userRounds, setUserRounds] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(3);
  
  const [lastRoundStats, setLastRoundStats] = useState<{ correct: number; total: number; accuracy: number; score: number } | null>(null);
  
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const currentCfg = ROUND_CONFIGS[currentRoundIdx] || ROUND_CONFIGS[0];

  const startGame = async () => {
    try {
      setError('');
      setGameState('submitting');
      
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
      setChallengeDate(data.challengeDate);
      
      // Generate rounds deterministically matching round configs (3x3 up to 7x7)
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
    }
  };

  const startRoundPhase = (roundIdx: number, roundsArray: string[][]) => {
    setCurrentRoundIdx(roundIdx);
    setSelectedCells([]);
    setGameState('memorizing');
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setGameState('recalling');
      }
    }, 1000);
  };

  const handleCellClick = (cellStr: string) => {
    if (gameState !== 'recalling') return;
    
    if (selectedCells.includes(cellStr)) {
      setSelectedCells(prev => prev.filter(c => c !== cellStr));
    } else {
      if (selectedCells.length < currentCfg.targets) {
        setSelectedCells(prev => [...prev, cellStr]);
      }
    }
  };

  const handleClearSelection = () => {
    if (gameState === 'recalling') {
      setSelectedCells([]);
    }
  };

  const handleRoundSubmit = () => {
    if (selectedCells.length !== currentCfg.targets) return;

    const targetPattern = rounds[currentRoundIdx] || [];
    let correctCount = 0;
    selectedCells.forEach(cell => {
      if (targetPattern.includes(cell)) correctCount++;
    });

    const accuracy = Math.round((correctCount / currentCfg.targets) * 100);
    const roundScore = correctCount * 50;

    setLastRoundStats({
      correct: correctCount,
      total: currentCfg.targets,
      accuracy,
      score: roundScore
    });

    const formattedSelected = selectedCells.map(c => c.split(',').map(Number));
    const nextUserRounds = [...userRounds, { selected: formattedSelected }];
    setUserRounds(nextUserRounds);
    setGameState('round_result');
  };

  const handleNextRound = () => {
    const nextIdx = currentRoundIdx + 1;
    if (nextIdx < 5) {
      startRoundPhase(nextIdx, rounds);
    } else {
      submitFinalGame(userRounds);
    }
  };

  const submitFinalGame = async (finalUserRounds: any[]) => {
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
            rounds: finalUserRounds
          }
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit game results');
      
      setResultData(data);
      setGameState('result');
    } catch (err: any) {
      setError(err.message || 'Failed to submit game');
      setGameState('recalling');
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
            <Award size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Memory Matrix</h1>
            <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
              Memorize the glowing grid pattern before it vanishes, then recreate it cell for cell. 5 rounds of escalating difficulty (3x3 to 7x7)!
            </p>
          </div>

          <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-gray-400">
            <div className="flex justify-between"><span>Round 1</span><span className="text-purple-300 font-bold">3×3 Grid (3 Targets)</span></div>
            <div className="flex justify-between"><span>Round 3</span><span className="text-purple-300 font-bold">5×5 Grid (6 Targets)</span></div>
            <div className="flex justify-between"><span>Round 5</span><span className="text-purple-300 font-bold">7×7 Grid (10 Targets)</span></div>
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

  if (gameState === 'submitting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
        <p className="text-sm text-purple-300 font-medium">Securing session & loading puzzle...</p>
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
          gameId="memory-matrix"
          gameName="Memory Matrix"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => window.location.reload()}
          onBackToHub={() => router.push("/weekly-challenges")}
        />
      </div>
    );
  }

  const currentPattern = rounds[currentRoundIdx] || [];
  const gridSize = currentCfg.size;

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto flex flex-col items-center justify-between">
      
      {/* Header bar */}
      <div className="w-full flex justify-between items-center glass-panel p-4 rounded-2xl border border-purple-500/20 mb-4">
        <button 
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Leave
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold text-white">Memory Matrix</h2>
          <p className="text-xs text-purple-300 font-semibold">Round {currentRoundIdx + 1} of 5 ({gridSize}×{gridSize})</p>
        </div>

        <GameTimer isRunning={gameState === 'memorizing' || gameState === 'recalling'} startTime={startTime} />
      </div>

      {/* Main Game Stage */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-4">
        
        {/* Phase Banners */}
        {gameState === 'memorizing' && (
          <div className="mb-4 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider animate-pulse">
              Memorize Pattern — {countdown}s
            </span>
          </div>
        )}

        {gameState === 'recalling' && (
          <div className="mb-4 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              Recreate the Pattern
            </span>
          </div>
        )}

        {/* Grid Container */}
        <div 
          className="grid gap-2 p-4 glass-panel vision-glass rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-full max-h-[60vh] aspect-square"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: `${Math.min(480, gridSize * 64)}px`
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
            } else if (gameState === 'recalling' && isSelected) {
              bgClass = "bg-cyan-500 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-95";
            }

            return (
              <button
                key={cellStr}
                onClick={() => handleCellClick(cellStr)}
                disabled={gameState !== 'recalling'}
                className={`rounded-xl border transition-all duration-200 aspect-square flex items-center justify-center cursor-pointer ${bgClass}`}
              >
                {gameState === 'recalling' && isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Control Footer */}
        {gameState === 'recalling' && (
          <div className="w-full max-w-md mt-6 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full px-4 text-xs font-semibold text-gray-300">
              <span>Selected: <strong className="text-cyan-400">{selectedCells.length} / {currentCfg.targets}</strong></span>
              <button 
                onClick={handleClearSelection}
                className="flex items-center gap-1 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} /> Clear Selection
              </button>
            </div>

            <button
              onClick={handleRoundSubmit}
              disabled={selectedCells.length !== currentCfg.targets}
              className="liquid-btn w-full py-3 text-xs uppercase tracking-wider font-bold disabled:opacity-40"
            >
              Submit Round {currentRoundIdx + 1}
            </button>
          </div>
        )}
      </div>

      {/* Round Result Modal */}
      {gameState === 'round_result' && lastRoundStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel vision-glass p-6 rounded-3xl border border-purple-500/30 max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-300 mx-auto flex items-center justify-center border border-purple-500/40">
              <Check size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Round {currentRoundIdx + 1} Complete</h3>
            
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Correct Targets</span><span className="text-white font-bold">{lastRoundStats.correct} / {lastRoundStats.total}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Accuracy</span><span className="text-purple-300 font-bold">{lastRoundStats.accuracy}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Round Score</span><span className="text-emerald-400 font-bold">+{lastRoundStats.score}</span></div>
            </div>

            <button 
              onClick={handleNextRound}
              className="liquid-btn w-full py-3 text-xs uppercase tracking-wider font-bold"
            >
              {currentRoundIdx < 4 ? `Continue to Round ${currentRoundIdx + 2}` : 'Complete Challenge'}
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold text-white">Abandon Challenge?</h3>
            <p className="text-xs text-gray-400">Leaving will forfeit your current attempt session.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="px-4 py-2 rounded-xl text-xs bg-white/10 text-white font-semibold">Continue Game</button>
              <button onClick={() => router.push('/weekly-challenges')} className="px-4 py-2 rounded-xl text-xs bg-rose-600 text-white font-semibold">Abandon & Exit</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
