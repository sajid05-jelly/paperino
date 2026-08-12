"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, HelpCircle, Loader2, ArrowRight } from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';

type GameState = 'intro' | 'playing' | 'submitting' | 'result';

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

export default function CodeBreakerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [challengeDate, setChallengeDate] = useState<string>('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [secretCode, setSecretCode] = useState<number[]>([]);
  
  const [attempts, setAttempts] = useState<number[][]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(['', '', '', '']);
  const [maxAttempts, setMaxAttempts] = useState(8);
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
        body: JSON.stringify({ gameId: 'code-breaker' })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start game');
      
      setSessionId(data.sessionId);
      setIsOfficial(data.isOfficial);
      setChallengeDate(data.challengeDate);
      
      // Generate secret code locally to provide feedback
      const seedNum = getSeed(`code-breaker-${data.challengeDate}`);
      const rand = mulberry32(seedNum);
      const code: number[] = [];
      const digits = [0,1,2,3,4,5,6,7];
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(rand() * digits.length);
        code.push(digits[idx]);
        digits.splice(idx, 1);
      }
      setSecretCode(code);
      setStartTime(Date.now());
      setGameState('playing');
    } catch (err: any) {
      setError(err.message);
      setGameState('intro');
    }
  };

  const submitGame = async (finalAttempts: number[][], isWin: boolean) => {
    try {
      setGameState('submitting');
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      
      const finalGuess = finalAttempts.length > 0 ? finalAttempts[finalAttempts.length - 1] : [];
      
      const res = await fetch('/api/challenge-submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          gameData: {
            attempts: finalAttempts,
            finalGuess
          }
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit game');
      
      setResultData(data);
      setGameState('result');
    } catch (err: any) {
      setError(err.message);
      // Wait for user to retry or fail gracefully
      setGameState('playing');
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!/^[0-7]?$/.test(value)) return;
    const newGuess = [...currentGuess];
    newGuess[index] = value;
    setCurrentGuess(newGuess);
  };

  const handleGuessSubmit = () => {
    if (currentGuess.some(d => d === '')) return;
    
    const numGuess = currentGuess.map(Number);
    const newAttempts = [...attempts, numGuess];
    setAttempts(newAttempts);
    setCurrentGuess(['', '', '', '']);
    
    const isWin = numGuess.join('') === secretCode.join('');
    
    if (isWin || newAttempts.length >= maxAttempts) {
      submitGame(newAttempts, isWin);
    }
  };

  const getFeedback = (guess: number[]) => {
    return guess.map((g, i) => {
      if (g === secretCode[i]) return 'correct'; // green
      if (secretCode.includes(g)) return 'misplaced'; // yellow
      return 'absent'; // gray
    });
  };

  if (gameState === 'intro') {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 max-w-md w-full text-center"
        >
          <h1 className="text-3xl font-bold text-white mb-4">Code Breaker</h1>
          <p className="text-gray-400 mb-6">
            Crack the secret 4-digit code. Each digit is between 0 and 7 with no repeats.
            You have 8 attempts.
          </p>
          <ul className="text-left text-sm text-gray-300 space-y-3 mb-8">
            <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500"></div> Correct digit & position</li>
            <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500"></div> Correct digit, wrong position</li>
            <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-600"></div> Digit not in code</li>
          </ul>
          
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
          gameId="code-breaker"
          gameName="Code Breaker"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => window.location.reload()}
          onBackToHub={() => router.push("/weekly-challenges")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8 glass-panel p-4">
        <div>
          <h2 className="text-xl font-bold text-white">Code Breaker</h2>
          <p className="text-sm text-gray-400">Attempt {attempts.length + 1} of {maxAttempts}</p>
        </div>
        <GameTimer isRunning={gameState === 'playing'} startTime={startTime} />
      </div>

      <div className="w-full glass-panel p-6 flex flex-col gap-4">
        {/* History */}
        <div className="flex flex-col gap-3 mb-6">
          {attempts.map((attempt, idx) => {
            const feedback = getFeedback(attempt);
            return (
              <div key={idx} className="flex items-center justify-between p-3 vision-glass rounded-xl">
                <div className="flex gap-3">
                  {attempt.map((d, i) => (
                    <div key={i} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg text-lg font-bold text-white">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {feedback.map((f, i) => (
                    <div key={i} className={`w-4 h-4 rounded-full ${
                      f === 'correct' ? 'bg-green-500' : f === 'misplaced' ? 'bg-yellow-500' : 'bg-gray-600'
                    }`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Guess Input */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            {currentGuess.map((digit, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                pattern="[0-7]*"
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                className="w-14 h-16 text-center text-2xl font-bold bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                disabled={gameState === 'submitting'}
              />
            ))}
          </div>
          
          <button 
            onClick={handleGuessSubmit}
            disabled={gameState === 'submitting' || currentGuess.some(d => d === '')}
            className="liquid-btn w-full max-w-xs py-3 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {gameState === 'submitting' ? <Loader2 className="animate-spin" /> : 'Submit Guess'}
          </button>
        </div>
        {error && <p className="text-red-400 mt-2 text-center text-sm">{error}</p>}
      </div>
    </div>
  );
}
