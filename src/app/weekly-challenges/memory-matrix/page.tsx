"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';

type GameState = 'intro' | 'memorizing' | 'recalling' | 'submitting' | 'result';

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

import { useRouter } from 'next/navigation';

export default function MemoryMatrixPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [challengeDate, setChallengeDate] = useState<string>('');
  
  const [rounds, setRounds] = useState<any[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [userRounds, setUserRounds] = useState<any[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  
  const startGame = async () => {
    try {
      setError('');
      setGameState('submitting');
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      
      const res = await fetch('/api/challenge-start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameId: 'memory-matrix' })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start game');
      
      setSessionId(data.sessionId);
      setChallengeDate(data.challengeDate);
      
      // Generate rounds locally matching server logic
      const seedNum = getSeed(`memory-matrix-${data.challengeDate}`);
      const rand = mulberry32(seedNum);
      const generatedRounds: string[][] = [];
      
      for (let r = 0; r < 5; r++) {
        const pattern: string[] = [];
        const numCells = 3 + r;
        while (pattern.length < numCells) {
          const rRow = Math.floor(rand() * 4);
          const rCol = Math.floor(rand() * 4);
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
      startMemorizationPhase();
    } catch (err: any) {
      setError(err.message);
      setGameState('intro');
    }
  };

  const startMemorizationPhase = () => {
    setGameState('memorizing');
    setTimeout(() => {
      setGameState('recalling');
    }, 2000);
  };

  const submitGame = async (finalUserRounds: any[]) => {
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
      if (!res.ok) throw new Error(data.error || 'Failed to submit game');
      
      setResultData(data);
      setGameState('result');
    } catch (err: any) {
      setError(err.message);
      setGameState('recalling');
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'recalling' || showFeedback) return;
    
    const cellId = `${r},${c}`;
    const newSelected = selectedCells.includes(cellId)
      ? selectedCells.filter(id => id !== cellId)
      : [...selectedCells, cellId];
      
    setSelectedCells(newSelected);
    
    const targetCellsCount = rounds[currentRoundIdx].length;
    
    if (newSelected.length === targetCellsCount) {
      setShowFeedback(true);
      
      setTimeout(() => {
        const currentRoundSubmission = {
          selected: newSelected.map(id => id.split(',').map(Number))
        };
        const newUserRounds = [...userRounds, currentRoundSubmission];
        setUserRounds(newUserRounds);
        setSelectedCells([]);
        setShowFeedback(false);
        
        if (currentRoundIdx < 4) {
          setCurrentRoundIdx(prev => prev + 1);
          startMemorizationPhase();
        } else {
          submitGame(newUserRounds);
        }
      }, 1500);
    }
  };

  if (gameState === 'intro') {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 max-w-md w-full text-center"
        >
          <h1 className="text-3xl font-bold text-white mb-4">Memory Matrix</h1>
          <p className="text-gray-400 mb-6">
            Memorize the highlighted pattern on the grid. Recreate it after it disappears!
            There are 5 rounds of increasing difficulty.
          </p>
          
          {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}
          
          <button onClick={startGame} className="liquid-btn w-full py-3">
            Start Challenge
          </button>
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

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8 glass-panel p-4">
        <div>
          <h2 className="text-xl font-bold text-white">Memory Matrix</h2>
          <p className="text-sm text-gray-400">Round {currentRoundIdx + 1} of 5</p>
        </div>
        <GameTimer isRunning={gameState === 'memorizing' || gameState === 'recalling'} startTime={startTime} />
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div className="text-center mb-8 h-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={gameState}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-xl font-semibold text-purple-300"
            >
              {gameState === 'memorizing' ? 'Memorize the pattern!' : 
               gameState === 'recalling' && !showFeedback ? 'Recreate the pattern' : 
               showFeedback ? 'Result' : 
               gameState === 'submitting' ? 'Submitting...' : ''}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="glass-panel p-4 inline-block">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: 4 }).map((_, r) => (
              Array.from({ length: 4 }).map((_, c) => {
                const cellId = `${r},${c}`;
                const isTarget = currentPattern.includes(cellId);
                const isSelected = selectedCells.includes(cellId);
                
                let cellStateClass = "bg-white/5 border-white/10";
                
                if (gameState === 'memorizing' && isTarget) {
                  cellStateClass = "bg-purple-500/80 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]";
                } else if ((gameState === 'recalling' || showFeedback) && isSelected) {
                  if (!showFeedback) {
                    cellStateClass = "bg-cyan-500/50 border-cyan-400";
                  } else {
                    if (isTarget) {
                      cellStateClass = "bg-green-500/80 border-green-400"; // Correct
                    } else {
                      cellStateClass = "bg-red-500/80 border-red-400"; // Incorrect
                    }
                  }
                } else if (showFeedback && isTarget && !isSelected) {
                   cellStateClass = "bg-purple-500/30 border-purple-400/50"; // Missed target
                }

                return (
                  <motion.div
                    key={cellId}
                    whileTap={gameState === 'recalling' && !showFeedback ? { scale: 0.95 } : {}}
                    onClick={() => handleCellClick(r, c)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl border cursor-pointer transition-all duration-300 ${cellStateClass}`}
                  />
                );
              })
            ))}
          </div>
        </div>
        
        <div className="mt-8 text-gray-400">
          Selected: {selectedCells.length} / {currentPattern.length}
        </div>
      </div>
    </div>
  );
}
