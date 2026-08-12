"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, HelpCircle, Loader2, ArrowLeft, Lock, Award, AlertCircle } from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';
import { useRouter } from 'next/navigation';

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

export default function CodeBreakerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [challengeDate, setChallengeDate] = useState<string>('');
  
  const [secretCode, setSecretCode] = useState<number[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(['', '', '', '']);
  const [attempts, setAttempts] = useState<number[][]>([]);
  const [validationMsg, setValidationMsg] = useState('');
  
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const maxAttempts = 8;

  const startGame = async () => {
    try {
      setError('');
      setGameState('submitting');
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in to play');
      
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
      
      // Generate secret code deterministically (digits 0-7, no repeats)
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
      setAttempts([]);
      setCurrentGuess(['', '', '', '']);
      setStartTime(Date.now());
      setGameState('playing');
    } catch (err: any) {
      setError(err.message || 'Unable to start challenge');
      setGameState('intro');
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    if (!/^[0-7]?$/.test(val)) return;
    const nextGuess = [...currentGuess];
    nextGuess[index] = val;
    setCurrentGuess(nextGuess);
    setValidationMsg('');
  };

  const handleGuessSubmit = () => {
    if (currentGuess.some(d => d === '')) {
      setValidationMsg('Please enter all 4 digits (0-7)');
      return;
    }

    const numGuess = currentGuess.map(Number);
    
    // Check for duplicate digits
    const uniqueDigits = new Set(numGuess);
    if (uniqueDigits.size !== 4) {
      setValidationMsg('Digits cannot be repeated in your guess');
      return;
    }

    const newAttempts = [...attempts, numGuess];
    setAttempts(newAttempts);
    setCurrentGuess(['', '', '', '']);
    setValidationMsg('');
    
    const isWin = numGuess.join('') === secretCode.join('');
    
    if (isWin || newAttempts.length >= maxAttempts) {
      submitGame(newAttempts);
    }
  };

  const submitGame = async (finalAttempts: number[][]) => {
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
      setError(err.message || 'Failed to submit score');
      setGameState('playing');
    }
  };

  const getFeedback = (guess: number[]) => {
    return guess.map((g, i) => {
      if (g === secretCode[i]) return 'correct'; // Green
      if (secretCode.includes(g)) return 'misplaced'; // Yellow
      return 'absent'; // Gray
    });
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
            <Lock size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Code Breaker</h1>
            <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
              Crack the secret 4-digit code using logic and color feedback. Each digit is between 0 and 7 with no repeats. You have 8 attempts!
            </p>
          </div>

          <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-left text-gray-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
              <span><strong>Green:</strong> Correct digit & position</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
              <span><strong>Yellow:</strong> Correct digit, wrong position</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-500 shrink-0"></span>
              <span><strong>Gray:</strong> Digit not in code</span>
            </div>
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
        <p className="text-sm text-purple-300 font-medium">Securing session...</p>
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
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto flex flex-col justify-between">
      
      {/* Header bar */}
      <div className="w-full flex justify-between items-center glass-panel p-4 rounded-2xl border border-purple-500/20 mb-6">
        <button 
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Leave
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold text-white">Code Breaker</h2>
          <p className="text-xs text-purple-300 font-semibold">Attempt {attempts.length + 1} of {maxAttempts}</p>
        </div>

        <GameTimer isRunning={gameState === 'playing'} startTime={startTime} />
      </div>

      {/* Attempts History */}
      <div className="w-full flex-1 glass-panel vision-glass p-6 rounded-3xl border border-purple-500/20 mb-6 flex flex-col justify-between">
        <div className="space-y-3 overflow-y-auto max-h-[45vh] pr-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Attempt History</h3>
          
          {attempts.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500 italic">No guesses submitted yet. Make your 1st attempt below!</div>
          ) : (
            attempts.map((guess, idx) => {
              const feedback = getFeedback(guess);
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                  
                  <div className="flex gap-2">
                    {guess.map((digit, dIdx) => (
                      <span key={dIdx} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center">
                        {digit}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    {feedback.map((status, fIdx) => {
                      let bg = "bg-gray-500";
                      if (status === 'correct') bg = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]";
                      if (status === 'misplaced') bg = "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]";
                      return <span key={fIdx} className={`w-3.5 h-3.5 rounded-full ${bg}`}></span>;
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Guess Input Row */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="flex justify-center gap-3">
            {currentGuess.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                className="w-12 h-14 bg-black/60 border border-purple-500/30 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-purple-400 shadow-inner"
                placeholder="0-7"
              />
            ))}
          </div>

          {validationMsg && (
            <p className="text-xs text-rose-400 font-medium text-center">{validationMsg}</p>
          )}

          <button
            onClick={handleGuessSubmit}
            disabled={currentGuess.some(d => d === '')}
            className="liquid-btn w-full py-3.5 text-xs font-bold uppercase tracking-wider"
          >
            Submit Guess #{attempts.length + 1}
          </button>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold text-white">Abandon Code Breaker?</h3>
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
