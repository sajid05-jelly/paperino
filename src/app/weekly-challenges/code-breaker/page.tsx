"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { 
  Terminal, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Award, 
  Zap, 
  ChevronRight, 
  Binary 
} from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';
import ChallengeGameShell from '@/components/challenges/ChallengeGameShell';
import { useRouter } from 'next/navigation';

type GameState = 'intro' | 'loading' | 'playing' | 'submitting' | 'result';

interface CodeBreakerQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
}

export default function CodeBreakerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [difficulty, setDifficulty] = useState<'novice' | 'adept' | 'master'>('adept');
  
  const [questions, setQuestions] = useState<CodeBreakerQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

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
        body: JSON.stringify({ gameId: "code-breaker", difficulty })
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
      if (data.puzzleData?.questions) {
        setQuestions(data.puzzleData.questions);
      }
      setStartTime(Date.now());
      setGameState('playing');
    } catch (err: any) {
      setError(err.message || "Failed to start challenge");
      setGameState('intro');
    } finally {
      isCreatingSession.current = false;
    }
  };

  const handleSelectOption = (opt: string) => {
    setSelectedOption(opt);
    const q = questions[currentIndex];
    if (q) {
      setUserAnswers(prev => ({ ...prev, [q.id]: opt }));
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextQ = questions[nextIdx];
      setSelectedOption(nextQ ? (userAnswers[nextQ.id] || null) : null);
    } else {
      handleSubmitGame();
    }
  };

  const handleSubmitGame = async () => {
    if (gameState === 'submitting') return;
    setGameState('submitting');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Authentication session expired");
      const token = await currentUser.getIdToken();
      const durationMs = Math.max(1000, Date.now() - startTime);

      const res = await fetch("/api/challenge-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          gameData: {
            gameId: "code-breaker",
            userAnswers,
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

  const timeLimitMs = difficulty === 'novice' ? 180000 : difficulty === 'adept' ? 150000 : 120000;

  if (checkingAttempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07040f]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-gray-400 font-medium text-sm">Decoding binary streams...</p>
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
          gameId="code-breaker"
          gameName="Code Breaker"
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

  const currentQ = questions[currentIndex];

  return (
    <ChallengeGameShell
      gameId="code-breaker"
      gameName="Code Breaker"
      gameIcon={<Terminal className="w-5 h-5 text-emerald-400" />}
      attemptText={isOfficial ? "Official Weekly Attempt" : "Practice Mode"}
      gameState={gameState}
      timerNode={
        gameState === 'playing' ? (
          <GameTimer 
            startTime={startTime} 
            maxDurationMs={timeLimitMs} 
            onExpire={handleSubmitGame} 
          />
        ) : null
      }
      rulesContent={
        <div className="space-y-4 text-sm text-gray-300">
          <p>• Solve binary conversions, hexadecimal arithmetic, bitwise masks, and Big-O algorithm complexity.</p>
          <p>• Pick the exact numerical or algorithmic answer from the 4 options.</p>
          <p>• Fast answers with zero errors yield max score and Top 5 leaderboard placement.</p>
          <p>• Step-by-step binary bit-shifting and complexity analysis available upon completion.</p>
        </div>
      }
    >
      {gameState === 'intro' && (
        <div className="max-w-xl mx-auto w-full glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-emerald-500/20 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Terminal size={32} />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Code Breaker Arena</h1>
            <p className="text-gray-400 text-sm mt-2">
              Crack binary, hexadecimal, bitwise logic, and algorithm complexity puzzles.
            </p>
          </div>

          {/* Difficulty selector */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
              Choose Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['novice', 'adept', 'master'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setDifficulty(lvl)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                    difficulty === lvl
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {lvl}
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                    {lvl === 'novice' ? '3m' : lvl === 'adept' ? '2.5m' : '2m'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleStartGame}
            className="liquid-btn w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap size={16} /> Break The Code
          </button>
        </div>
      )}

      {gameState === 'loading' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
          <p className="text-gray-300 font-semibold text-sm">Compiling cryptographic puzzles...</p>
        </div>
      )}

      {gameState === 'submitting' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
          <p className="text-gray-300 font-semibold text-sm">Verifying binary math and updating leaderboard...</p>
        </div>
      )}

      {gameState === 'playing' && currentQ && (
        <div className="max-w-2xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Puzzle {currentIndex + 1} of {questions.length}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {currentQ.category}
            </span>
          </div>

          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-emerald-500/20 space-y-6">
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-center">
              <h2 className="text-base sm:text-lg font-bold text-emerald-300 whitespace-pre-line leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            {/* 4 Options Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === opt || userAnswers[currentQ.id] === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    className={`p-4 rounded-2xl border text-center font-mono text-sm sm:text-base font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]'
                        : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Next / Finish Button */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleNextQuestion}
                disabled={!selectedOption && !userAnswers[currentQ.id]}
                className="liquid-btn px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <span>{currentIndex === questions.length - 1 ? 'Finish & Review' : 'Next Puzzle'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </ChallengeGameShell>
  );
}
