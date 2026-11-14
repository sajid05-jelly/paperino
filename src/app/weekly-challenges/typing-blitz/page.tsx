"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { 
  Keyboard, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Zap, 
  ChevronRight, 
  Activity, 
  RotateCcw 
} from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';
import ChallengeGameShell from '@/components/challenges/ChallengeGameShell';
import { useRouter } from 'next/navigation';

type GameState = 'intro' | 'loading' | 'playing' | 'submitting' | 'result';

interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  explanation: string;
}

export default function TypingBlitzPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [isOfficial, setIsOfficial] = useState(false);
  
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [completedSnippets, setCompletedSnippets] = useState<Array<{ id: string; typed: string; accuracy: number; wpm: number }>>([]);

  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [snippetStartTime, setSnippetStartTime] = useState<number>(0);
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isCreatingSession = useRef(false);

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
          body: JSON.stringify({ gameId: "typing-blitz" })
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
    
    const unsubscribe = auth.onAuthStateChanged((u: any) => {
      if (u) checkAttempt();
      else setCheckingAttempt(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStartGame = async () => {
    if (isCreatingSession.current) return;
    isCreatingSession.current = true;
    setError('');
    setGameState('loading');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Please log in to play");
      const token = await currentUser.getIdToken();

      const res = await fetch("/api/challenge-start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameId: "typing-blitz" })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.completed) {
          setResultData({
            score: data.score,
            durationMs: data.durationMs,
            rank: data.rank,
            isOfficial: true,
            leaderboard: data.leaderboard || []
          });
          setWasAlreadyCompleted(true);
          setGameState("result");
          return;
        }
        throw new Error(data.error || "Failed to initialize game");
      }

      setSessionId(data.sessionId);
      setIsOfficial(Boolean(data.isOfficial));
      if (data.puzzleData?.snippets) {
        setSnippets(data.puzzleData.snippets);
      }
      setCurrentIndex(0);
      setUserInput('');
      setCompletedSnippets([]);
      const now = Date.now();
      setStartTime(now);
      setSnippetStartTime(now);
      setGameState('playing');
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch (err: any) {
      setError(err.message || "Failed to start challenge");
      setGameState('intro');
    } finally {
      isCreatingSession.current = false;
    }
  };

  const currentSnippet = snippets[currentIndex];

  const calculateMetrics = (typed: string, target: string, durationMs: number) => {
    let correctChars = 0;
    const minLen = Math.min(typed.length, target.length);
    for (let i = 0; i < minLen; i++) {
      if (typed[i] === target[i]) correctChars++;
    }
    const accuracy = target.length > 0 ? Math.round((correctChars / target.length) * 100) : 0;
    const minutes = Math.max(0.05, durationMs / 60000);
    const words = typed.length / 5;
    const wpm = Math.round(words / minutes);
    return { accuracy, wpm };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserInput(val);

    if (currentSnippet && val === currentSnippet.code) {
      // Completed current snippet!
      advanceSnippet(val);
    }
  };

  const advanceSnippet = (finalTyped: string) => {
    if (!currentSnippet) return;
    const timeSpent = Math.max(1000, Date.now() - snippetStartTime);
    const { accuracy, wpm } = calculateMetrics(finalTyped, currentSnippet.code, timeSpent);

    const updated = [
      ...completedSnippets,
      { id: currentSnippet.id, typed: finalTyped, accuracy, wpm }
    ];
    setCompletedSnippets(updated);

    if (currentIndex < snippets.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setUserInput('');
      setSnippetStartTime(Date.now());
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      handleSubmitGame(updated);
    }
  };

  const handleSubmitGame = async (finalSnippets?: Array<{ id: string; typed: string; accuracy: number; wpm: number }>) => {
    if (gameState === 'submitting') return;
    setGameState('submitting');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Authentication session expired");
      const token = await currentUser.getIdToken();
      const durationMs = Math.max(1000, Date.now() - startTime);

      const toSubmit = finalSnippets ?? completedSnippets;

      const res = await fetch("/api/challenge-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          gameData: {
            gameId: "typing-blitz",
            snippetsTyped: toSubmit,
            durationMs
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setResultData({
        score: data.score,
        durationMs: data.durationMs,
        rank: data.rank,
        isOfficial: data.isOfficial,
        leaderboard: data.leaderboard || [],
        xpEarned: data.xp,
        accuracy: data.accuracy,
        correctCount: data.correctCount,
        totalQuestions: data.totalQuestions,
        reviewItems: data.reviewItems || []
      });
      setGameState('result');
    } catch (err: any) {
      setError(err.message || "Failed to submit challenge");
      setGameState('playing');
    }
  };

  if (checkingAttempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07040f]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          <p className="text-gray-400 font-medium text-sm">Initializing Typing Blitz Terminal...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'result' && resultData) {
    return (
      <div className="min-h-screen bg-[#07040f] py-8">
        <GameResult
          score={resultData.score}
          durationMs={resultData.durationMs}
          rank={resultData.rank}
          isOfficial={resultData.isOfficial}
          gameId="typing-blitz"
          gameName="Typing Blitz"
          leaderboard={resultData.leaderboard}
          wasAlreadyCompleted={wasAlreadyCompleted}
          xpEarned={resultData.xpEarned}
          accuracy={resultData.accuracy}
          correctCount={resultData.correctCount}
          totalQuestions={resultData.totalQuestions}
          reviewItems={resultData.reviewItems}
          onViewLeaderboard={() => router.push("/weekly-challenges")}
          onBackToHub={() => router.push("/weekly-challenges")}
        />
      </div>
    );
  }

  return (
    <ChallengeGameShell
      gameId="typing-blitz"
      gameName="Typing Blitz"
      gameIcon={<Keyboard className="w-5 h-5 text-cyan-400" />}
      attemptText={isOfficial ? "Official Weekly Attempt" : "Practice Mode"}
      gameState={gameState}
      timerNode={
        gameState === 'playing' ? (
          <GameTimer 
            startTime={startTime} 
            maxDurationMs={120000} 
            onExpire={() => handleSubmitGame()} 
          />
        ) : null
      }
      rulesContent={
        <div className="space-y-4 text-sm text-gray-300">
          <p>• Type developer code snippets with high speed and precision.</p>
          <p>• Characters turn green as you type accurately, and red if there is a mismatch.</p>
          <p>• Complete all 3 code prompts before the timer runs out.</p>
          <p>• Review your typing accuracy, WPM, and syntax notes upon completion.</p>
        </div>
      }
    >
      {gameState === 'intro' && (
        <div className="max-w-xl mx-auto w-full glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-cyan-500/20 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Keyboard size={32} />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Typing Blitz Arena</h1>
            <p className="text-gray-400 text-sm mt-2">
              Prove your programming speed, accuracy, and developer muscle memory against the clock.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleStartGame}
            className="liquid-btn w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all bg-gradient-to-r from-cyan-600 to-blue-600 shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap size={16} /> Start Typing Challenge
          </button>
        </div>
      )}

      {gameState === 'loading' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
          <p className="text-gray-300 font-semibold text-sm">Loading code snippets...</p>
        </div>
      )}

      {gameState === 'submitting' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
          <p className="text-gray-300 font-semibold text-sm">Evaluating WPM and keystroke precision...</p>
        </div>
      )}

      {gameState === 'playing' && currentSnippet && (
        <div className="max-w-2xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Snippet {currentIndex + 1} of {snippets.length}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {currentSnippet.language}
            </span>
          </div>

          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / snippets.length) * 100}%` }}
            />
          </div>

          {/* Terminal Box */}
          <div className="glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-cyan-500/20 space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                {currentSnippet.title}
              </span>
              <p className="text-xs text-gray-400 mb-4">
                Type the code snippet below exactly as shown:
              </p>
            </div>

            {/* Target Display with Character Highlighting */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-sm sm:text-base leading-relaxed tracking-wider overflow-x-auto select-none">
              {currentSnippet.code.split('').map((char, i) => {
                let colorClass = 'text-gray-400';
                if (i < userInput.length) {
                  colorClass = userInput[i] === char ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40';
                } else if (i === userInput.length) {
                  colorClass = 'text-white border-b-2 border-cyan-400 animate-pulse';
                }
                return (
                  <span key={i} className={`px-[1px] rounded ${colorClass}`}>
                    {char}
                  </span>
                );
              })}
            </div>

            {/* Input Field */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="Start typing the code..."
                className="w-full py-3.5 px-4 rounded-xl bg-white/[0.04] border border-cyan-500/40 text-white font-mono text-sm sm:text-base focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition-all placeholder:text-gray-500"
              />
            </div>

            {/* Skip / Next if stuck */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-gray-400">
                Press Enter or click Next to advance when finished
              </span>
              <button
                onClick={() => advanceSnippet(userInput)}
                className="liquid-btn px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 flex items-center gap-2 cursor-pointer"
              >
                <span>{currentIndex === snippets.length - 1 ? 'Finish Challenge' : 'Next Snippet'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </ChallengeGameShell>
  );
}
