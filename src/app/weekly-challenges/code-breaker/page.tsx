"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, HelpCircle, Loader2, ArrowLeft, Lock, Award, AlertCircle } from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';
import ChallengeGameShell from '@/components/challenges/ChallengeGameShell';
import { useRouter } from 'next/navigation';

type GameState = 'intro' | 'loading' | 'playing' | 'submitting' | 'result';

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
  const [checkingAttempt, setCheckingAttempt] = useState(true);

  // Guard reference to prevent duplicate session creation
  const isCreatingSession = useRef(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStage, setLoadStage] = useState('');

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
          body: JSON.stringify({ gameId: "code-breaker" })
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
      setLoadProgress(10);
      setLoadStage('Securing your session...');

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in to play');
      
      setLoadProgress(30);
      setLoadStage("Preparing today's puzzle...");

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
      
      setLoadProgress(70);
      setLoadStage('Loading challenge...');
      setSessionId(data.sessionId);
      setIsOfficial(data.isOfficial);
      setChallengeDate(data.challengeDate);
      
      // Generate secret code deterministically (digits 0-7, no repeats)
      const seedNum = getSeed(`code-breaker-${data.challengeDate}`);
      const rand = mulberry32(seedNum);
      const code: number[] = [];
      const digits = [0, 1, 2, 3, 4, 5, 6, 7];
      for (let i = 0; i < 4; i++) {
        const idx = Math.floor(rand() * digits.length);
        code.push(digits[idx]);
        digits.splice(idx, 1);
      }

      setSecretCode(code);
      setAttempts([]);
      setCurrentGuess(['', '', '', '']);
      setStartTime(Date.now());
      setLoadProgress(100);
      setLoadStage('Ready!');
      setGameState('playing');
    } catch (err: any) {
      console.error("Start challenge error:", err);
      setError(err.message || 'Unable to start challenge');
      setGameState('intro');
    } finally {
      isCreatingSession.current = false;
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    if (!/^[0-7]?$/.test(val)) return;
    const nextGuess = [...currentGuess];
    nextGuess[index] = val;
    setCurrentGuess(nextGuess);
    setValidationMsg('');
  };

  const isSubmittingGame = useRef(false);

  const getFeedback = (guess: number[], targetCode: number[] = secretCode) => {
    return guess.map((g, i) => {
      if (g === targetCode[i]) return 'correct'; // Green (correct digit & position)
      if (targetCode.includes(g)) return 'misplaced'; // Yellow (correct digit, wrong position)
      return 'absent'; // Gray (digit not in code)
    });
  };

  const handleGuessSubmit = () => {
    if (gameState !== 'playing' || isSubmittingGame.current) return;
    if (currentGuess.some(d => d === '')) {
      setValidationMsg('Enter 4 digits from 0–7.');
      return;
    }

    const numGuess = currentGuess.map(Number);
    
    // Check for duplicate digits
    const uniqueDigits = new Set(numGuess);
    if (uniqueDigits.size !== 4) {
      setValidationMsg('Digits cannot repeat.');
      return;
    }

    // Validate digits range [0-7]
    if (numGuess.some(d => isNaN(d) || d < 0 || d > 7)) {
      setValidationMsg('All digits must be between 0 and 7.');
      return;
    }

    const newAttempts = [...attempts, numGuess];
    setAttempts(newAttempts);
    setCurrentGuess(['', '', '', '']);
    setValidationMsg('');
    
    // Check if the current guess matches secret code exactly
    const isWin = secretCode.length === 4 && 
                  numGuess.length === 4 && 
                  numGuess.every((d, idx) => d === secretCode[idx]);
    
    if (isWin) {
      submitGame(newAttempts);
    }
  };

  const submitGame = async (finalAttempts: number[][]) => {
    if (isSubmittingGame.current) return;
    try {
      isSubmittingGame.current = true;
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
            finalGuess,
            durationMs: Date.now() - startTime,
            gameId: 'code-breaker'
          }
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        console.error('Submit failed:', data.error);
        setResultData({
          score: 0,
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
        score: 0,
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
            <Lock size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Code Breaker</h1>
            <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
              Crack the secret 4-digit code using logic and color feedback. Each digit is between 0 and 7 with no repeats. Try to solve it as fast as possible!
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

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center flex flex-col items-center gap-6"
        >
          <div className="text-4xl animate-bounce">🔐</div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Preparing Challenge</h2>
            <p className="text-xs text-gray-400">{loadStage || 'Securing your session...'}</p>
          </div>

          <div className="w-full space-y-3">
            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10 relative">
              <motion.div 
                className="bg-gradient-to-r from-purple-500 via-indigo-400 to-purple-500 h-full rounded-full w-1/2 absolute left-0"
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  ease: "easeInOut"
                }}
              />
            </div>
            <p className="text-[12px] text-amber-300/90 font-medium animate-pulse">Please wait for 25 seconds while we set up your challenge session...</p>
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
          gameId="code-breaker"
          gameName="Code Breaker"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => window.location.reload()}
          onBackToHub={() => router.push("/weekly-challenges")}
          leaderboard={resultData.leaderboard}
        />
      </div>
    );
  }

  // Add auto-focus reference navigation for digits input boxes
  const handleDigitChangeWithFocus = (index: number, val: string) => {
    if (!/^[0-7]?$/.test(val)) return;
    const nextGuess = [...currentGuess];
    nextGuess[index] = val;
    setCurrentGuess(nextGuess);
    setValidationMsg('');

    if (val && index < 3) {
      const nextInput = document.getElementById(`cb-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !currentGuess[index] && index > 0) {
      const prevInput = document.getElementById(`cb-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const rulesContent = (
    <ul className="space-y-2.5 list-disc list-inside text-sm">
      <li>Crack the 4-digit secret code.</li>
      <li>All digits are in the range of <strong>0 to 7</strong>.</li>
      <li>Digits cannot be repeated in the code.</li>
      <li>You can make unlimited guesses.</li>
      <li><strong>Green Circle:</strong> Digit is correct and in the right position.</li>
      <li><strong>Yellow Circle:</strong> Digit is in the code but in the wrong position.</li>
      <li><strong>Gray Circle:</strong> Digit is not part of the secret code.</li>
    </ul>
  );

  return (
    <ChallengeGameShell
      gameId="code-breaker"
      gameName="Code Breaker"
      gameIcon={<Lock size={20} />}
      attemptText={`Guesses: ${attempts.length}`}
      timerNode={<GameTimer isRunning={gameState === 'playing'} startTime={startTime} />}
      rulesContent={rulesContent}
      gameState={gameState}
    >
      <div className="w-full flex flex-col lg:flex-row gap-8 items-stretch mt-2">
        {/* Left Side: Guess Form Box */}
        <div className="flex-1 glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 flex flex-col justify-between">
          <div className="text-center space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Enter Your Guess</h3>
              <p className="text-xs text-gray-400">Enter a 4-digit code • digits 0–7 • no repeats</p>
            </div>

            <div className="flex justify-center gap-6 py-6">
              {currentGuess.map((digit, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <input
                    id={`cb-input-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChangeWithFocus(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-20 h-24 bg-black/60 border-2 border-purple-500/30 rounded-2xl text-center text-4xl font-extrabold text-white focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20 shadow-2xl transition-all"
                    placeholder=""
                  />
                  {!digit && <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">0–7</span>}
                </div>
              ))}
            </div>

            {validationMsg && (
              <p className="text-sm text-rose-400 font-medium text-center">{validationMsg}</p>
            )}
          </div>

          <div className="pt-6 mt-8 border-t border-white/5">
            <button
              onClick={handleGuessSubmit}
              disabled={currentGuess.some(d => d === '')}
              className="liquid-btn w-full py-4 text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Guess #{attempts.length + 1}
            </button>
          </div>
        </div>

        {/* Right Side: Attempt History list */}
        <div className="w-full lg:w-96 glass-panel vision-glass p-6 rounded-3xl border border-purple-500/20 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-450 mb-4 pb-2 border-b border-white/5">Guess History</h3>
          
          <div className="flex-1 overflow-y-auto max-h-[50vh] lg:max-h-[350px] space-y-3 pr-1">
            {attempts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center py-12 text-xs text-gray-500 italic">
                No guesses submitted yet. Make your first guess!
              </div>
            ) : (
              attempts.map((guess, idx) => {
                const feedback = getFeedback(guess);
                return (
                  <div key={idx} className="flex flex-col gap-2 p-3.5 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">Guess #{idx + 1}</span>
                      
                      <div className="flex gap-2">
                        {guess.map((digit, dIdx) => (
                          <span key={dIdx} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center justify-center">
                            {digit}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-1">
                        {feedback.map((status, fIdx) => {
                          let bg = "bg-gray-500";
                          if (status === 'correct') bg = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]";
                          if (status === 'misplaced') bg = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]";
                          return <span key={fIdx} className={`w-3 h-3 rounded-full ${bg}`}></span>;
                        })}
                      </div>
                    </div>
                    {feedback.every(s => s === 'correct') && (
                      <div className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase text-right mt-1">
                        ✓ CODE CRACKED
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </ChallengeGameShell>
  );
}
