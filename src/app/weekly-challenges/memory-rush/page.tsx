"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  Clock, 
  HelpCircle, 
  Zap, 
  RefreshCw 
} from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';
import ChallengeGameShell from '@/components/challenges/ChallengeGameShell';
import { useRouter } from 'next/navigation';

type GameState = 'intro' | 'loading' | 'playing' | 'submitting' | 'result';

interface CardItem {
  uid: string;
  cardId: string;
  symbol: string;
  name: string;
  concept: string;
}

export default function MemoryRushPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [difficulty, setDifficulty] = useState<'novice' | 'adept' | 'master'>('adept');
  
  const [deck, setDeck] = useState<CardItem[]>([]);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<string[]>([]);
  const [totalMoves, setTotalMoves] = useState(0);

  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

  const isCreatingSession = useRef(false);
  const isEvaluatingPair = useRef(false);

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
          body: JSON.stringify({ gameId: "memory-rush" })
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
        body: JSON.stringify({ gameId: "memory-rush", difficulty })
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
      if (data.puzzleData?.deck) {
        setDeck(data.puzzleData.deck);
      }
      setFlippedUids([]);
      setMatchedCardIds([]);
      setTotalMoves(0);
      setStartTime(Date.now());
      setGameState('playing');
    } catch (err: any) {
      setError(err.message || "Failed to start challenge");
      setGameState('intro');
    } finally {
      isCreatingSession.current = false;
    }
  };

  const handleCardClick = (card: CardItem) => {
    if (isEvaluatingPair.current) return;
    if (flippedUids.includes(card.uid)) return;
    if (matchedCardIds.includes(card.cardId)) return;

    const newFlipped = [...flippedUids, card.uid];
    setFlippedUids(newFlipped);

    if (newFlipped.length === 2) {
      isEvaluatingPair.current = true;
      setTotalMoves(m => m + 1);

      const [firstUid, secondUid] = newFlipped;
      const firstCard = deck.find(c => c.uid === firstUid);
      const secondCard = deck.find(c => c.uid === secondUid);

      if (firstCard && secondCard && firstCard.cardId === secondCard.cardId) {
        // Matched!
        setTimeout(() => {
          setMatchedCardIds(prev => {
            const updated = [...prev, firstCard.cardId];
            if (updated.length === 8) {
              // All 8 pairs matched!
              handleSubmitGame(updated.length, totalMoves + 1);
            }
            return updated;
          });
          setFlippedUids([]);
          isEvaluatingPair.current = false;
        }, 500);
      } else {
        // Not matched, flip back after 800ms
        setTimeout(() => {
          setFlippedUids([]);
          isEvaluatingPair.current = false;
        }, 800);
      }
    }
  };

  const handleSubmitGame = async (matchedCountOverride?: number, movesOverride?: number) => {
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
            gameId: "memory-rush",
            matchedPairsCount: matchedCountOverride ?? matchedCardIds.length,
            totalMoves: movesOverride ?? totalMoves,
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

  const timeLimitMs = difficulty === 'novice' ? 180000 : difficulty === 'adept' ? 120000 : 90000;

  if (checkingAttempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07040f]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-gray-400 font-medium text-sm">Shuffling Memory Rush cards...</p>
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
          gameId="memory-rush"
          gameName="Memory Rush"
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
      gameId="memory-rush"
      gameName="Memory Rush"
      gameIcon={<Sparkles className="w-5 h-5 text-amber-400" />}
      attemptText={isOfficial ? "Official Weekly Attempt" : "Practice Mode"}
      gameState={gameState}
      timerNode={
        gameState === 'playing' ? (
          <GameTimer 
            startTime={startTime} 
            maxDurationMs={timeLimitMs} 
            onExpire={() => handleSubmitGame()} 
          />
        ) : null
      }
      rulesContent={
        <div className="space-y-4 text-sm text-gray-300">
          <p>• Flip cards on the 4x4 grid to match pairs of tech stacks and software engineering concepts.</p>
          <p>• Match all 8 pairs in as few moves and as quickly as possible.</p>
          <p>• Faster matching with fewer missteps awards bonus points and higher weekly leaderboard rank.</p>
          <p>• Unlock an in-depth breakdown of all engineering concepts upon game completion.</p>
        </div>
      }
    >
      {gameState === 'intro' && (
        <div className="max-w-xl mx-auto w-full glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-amber-500/20 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Sparkles size={32} />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Memory Rush Arena</h1>
            <p className="text-gray-400 text-sm mt-2">
              Match 8 hidden pairs of software engineering concepts against the countdown clock.
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
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {lvl}
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                    {lvl === 'novice' ? '3m' : lvl === 'adept' ? '2m' : '1.5m'}
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
            className="liquid-btn w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all bg-gradient-to-r from-amber-600 to-orange-600 shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap size={16} /> Start Rush
          </button>
        </div>
      )}

      {gameState === 'loading' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
          <p className="text-gray-300 font-semibold text-sm">Shuffling card grid...</p>
        </div>
      )}

      {gameState === 'submitting' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
          <p className="text-gray-300 font-semibold text-sm">Calculating memory efficiency score...</p>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="max-w-xl mx-auto w-full space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-gray-300 px-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">Pairs:</span>
              <span className="text-white font-mono font-bold">{matchedCardIds.length} / 8</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">Moves:</span>
              <span className="text-white font-mono font-bold">{totalMoves}</span>
            </div>
          </div>

          {/* 4x4 Grid of Cards */}
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 p-3 rounded-3xl glass-panel vision-glass border border-amber-500/20">
            {deck.map((card) => {
              const isFlipped = flippedUids.includes(card.uid);
              const isMatched = matchedCardIds.includes(card.cardId);

              return (
                <button
                  key={card.uid}
                  onClick={() => handleCardClick(card)}
                  disabled={isMatched || isFlipped}
                  className={`aspect-square rounded-2xl border text-center flex flex-col items-center justify-center p-1.5 sm:p-2 transition-all duration-300 cursor-pointer ${
                    isMatched
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 opacity-80 cursor-default scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : isFlipped
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-amber-400/30 text-gray-400 active:scale-95'
                  }`}
                >
                  {isFlipped || isMatched ? (
                    <div className="animate-in zoom-in-50 duration-200 flex flex-col items-center justify-center">
                      <span className="text-2xl sm:text-3xl leading-none block mb-1">
                        {card.symbol}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-white truncate max-w-[65px] sm:max-w-none">
                        {card.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 font-mono text-xs font-bold">
                      ?
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Manual early submit button if stuck or time running low */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => handleSubmitGame()}
              className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold border border-white/5 transition-colors cursor-pointer"
            >
              Finish Challenge Now
            </button>
          </div>
        </div>
      )}
    </ChallengeGameShell>
  );
}
