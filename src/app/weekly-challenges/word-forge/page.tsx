"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import ChallengeGameShell from "@/components/challenges/ChallengeGameShell";
import { 
  Type, HelpCircle, Shuffle, CheckCircle2, AlertCircle, ArrowLeft, Send, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "intro" | "loading" | "playing" | "round_feedback" | "submitting" | "result";

interface Round {
  type: 'anagram' | 'missing' | 'clue';
  title: string;
  question: string;
  hint: string;
  correctAnswer: string;
}

const FIXED_ROUNDS: Round[] = [
  {
    type: 'anagram',
    title: 'Round 1 — Anagram',
    question: 'R T A E',
    hint: 'Unscramble the letters to form a word meaning speed or assessment.',
    correctAnswer: 'RATE'
  },
  {
    type: 'missing',
    title: 'Round 2 — Missing Letters',
    question: 'C O M P _ T E R',
    hint: 'Fill in the missing letter for the central processing machine.',
    correctAnswer: 'COMPUTER'
  },
  {
    type: 'clue',
    title: 'Round 3 — Word Clue',
    question: 'An organized, structured collection of data stored electronically.',
    hint: 'Starts with D, 8 letters.',
    correctAnswer: 'DATABASE'
  },
  {
    type: 'anagram',
    title: 'Round 4 — Anagram',
    question: 'Y N S A T X',
    hint: 'Unscramble the letters to form the grammatical rules of programming code.',
    correctAnswer: 'SYNTAX'
  },
  {
    type: 'missing',
    title: 'Round 5 — Missing Letters',
    question: 'A L G O R _ T H M',
    hint: 'Fill in the missing letter for a step-by-step problem-solving procedure.',
    correctAnswer: 'ALGORITHM'
  },
  {
    type: 'clue',
    title: 'Round 6 — Final Word Forge',
    question: 'A program that converts source code into machine code execution.',
    hint: 'Starts with C, 8 letters.',
    correctAnswer: 'COMPILER'
  }
];

export default function WordForgePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>("intro");
  
  const [sessionId, setSessionId] = useState<string>("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [userRoundTimes, setUserRoundTimes] = useState<number[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  
  const [lastRoundResult, setLastRoundResult] = useState<{ isCorrect: boolean; answer: string } | null>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState("");
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const roundStartTimeRef = useRef<number>(0);

  const [existingResult, setExistingResult] = useState<any>(null);
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

  useEffect(() => {
    async function checkAttempt() {
      if (!user) return;
      try {
        setCheckingAttempt(true);
        // Get challengeId settings config
        const configRes = await fetch("/api/challenge-start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`
          },
          body: JSON.stringify({ gameId: "word-forge" })
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
    checkAttempt();
  }, [user]);

  const isCreatingSession = useRef(false);

  const startGame = async () => {
    if (isCreatingSession.current) return;
    try {
      isCreatingSession.current = true;
      setError("");
      setGameState("loading");
      
      const token = await user?.getIdToken();
      if (!token) throw new Error("Please sign in to play");
      
      const res = await fetch("/api/challenge-start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameId: "word-forge" })
      });
      
      const data = await res.json();
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
      if (!res.ok) throw new Error(data.error || "Failed to start session");
      setSessionId(data.sessionId);
      setIsOfficial(data.isOfficial);
      
      setUserAnswers([]);
      setUserRoundTimes([]);
      setStartTime(Date.now());
      startRound(0);
    } catch (err: any) {
      setError(err.message || "Failed to start game");
      setGameState("intro");
    } finally {
      isCreatingSession.current = false;
    }
  };

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const startRound = (idx: number) => {
    setCurrentRoundIdx(idx);
    setCurrentInput("");
    setElapsedSeconds(0);
    setGameState("playing");
    roundStartTimeRef.current = Date.now();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (timerRef.current) clearInterval(timerRef.current);
    processAnswerSubmit(currentInput);
  };

  const processAnswerSubmit = (inputVal: string) => {
    const elapsedSeconds = Math.max(0.1, (Date.now() - roundStartTimeRef.current) / 1000);
    
    const currentRound = FIXED_ROUNDS[currentRoundIdx];
    const isCorrect = inputVal.trim().toUpperCase() === currentRound.correctAnswer;
    
    const updatedAnswers = [...userAnswers, inputVal.trim().toUpperCase()];
    setUserAnswers(updatedAnswers);

    const updatedTimes = [...userRoundTimes, elapsedSeconds];
    setUserRoundTimes(updatedTimes);
    
    setLastRoundResult({
      isCorrect,
      answer: currentRound.correctAnswer
    });
    
    setGameState("round_feedback");
  };

  const handleNextRound = () => {
    const nextIdx = currentRoundIdx + 1;
    if (nextIdx < FIXED_ROUNDS.length) {
      startRound(nextIdx);
    } else {
      submitFinalAnswers(userAnswers, userRoundTimes);
    }
  };

  const submitFinalAnswers = async (finalAnswers: string[], overrideTimes?: number[]) => {
    try {
      setGameState("submitting");
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const timesToSubmit = overrideTimes || userRoundTimes;

      // Local fallback score calculation:
      const FIXED_CORRECT_ANSWERS = ['RATE', 'COMPUTER', 'DATABASE', 'SYNTAX', 'ALGORITHM', 'COMPILER'];
      let correctCount = 0;
      let totalTimeSpeedBonusSum = 0;

      FIXED_CORRECT_ANSWERS.forEach((expectedAns, idx) => {
        const userAns = finalAnswers[idx];
        if (userAns && userAns.trim().toUpperCase() === expectedAns) {
          correctCount++;
          const roundTimeSpent = timesToSubmit[idx] !== undefined ? Number(timesToSubmit[idx]) : 15;
          let speedBonus = 0;
          if (roundTimeSpent < 5) speedBonus = 5;
          else if (roundTimeSpent < 10) speedBonus = 4;
          else if (roundTimeSpent < 18) speedBonus = 3;
          else if (roundTimeSpent < 25) speedBonus = 1;
          totalTimeSpeedBonusSum += speedBonus;
        }
      });

      const accuracyScore = (correctCount / 6) * 70;
      const speedScore = totalTimeSpeedBonusSum;
      const finalCalculatedScore = Math.max(0, Math.min(100, Math.round(accuracyScore + speedScore)));

      const totalTimeMs = timesToSubmit.reduce((acc, curr) => acc + curr, 0) * 1000;

      const res = await fetch("/api/challenge-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          gameData: {
            answers: finalAnswers,
            times: timesToSubmit,
            score: finalCalculatedScore,
            durationMs: totalTimeMs > 0 ? totalTimeMs : (startTime ? Date.now() - startTime : 0)
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Submit failed:', data.error);
        setResultData({
          score: finalCalculatedScore,
          durationMs: totalTimeMs > 0 ? totalTimeMs : (startTime ? Date.now() - startTime : 0),
          rank: isOfficial ? 1 : null,
          isOfficial: isOfficial,
          leaderboard: []
        });
        setGameState("result");
        return;
      }

      const officialLeaderboard = Array.isArray(data.leaderboard) && data.leaderboard.length > 0
        ? data.leaderboard
        : (isOfficial ? [{
            userId: user?.uid || 'user',
            displayName: user?.displayName || 'Student',
            paperinoAvatar: '',
            score: data.score ?? 0,
            durationMs: data.durationMs || (startTime ? Date.now() - startTime : 0),
            rank: 1
          }] : []);

      setResultData({
        ...data,
        rank: data.rank ?? (isOfficial ? 1 : null),
        leaderboard: officialLeaderboard
      });
      setGameState("result");
    } catch (err: any) {
      console.error('Submit error:', err);
      const timesToSubmit = overrideTimes || userRoundTimes;
      const FIXED_CORRECT_ANSWERS = ['RATE', 'COMPUTER', 'DATABASE', 'SYNTAX', 'ALGORITHM', 'COMPILER'];
      let correctCount = 0;
      let totalTimeSpeedBonusSum = 0;

      FIXED_CORRECT_ANSWERS.forEach((expectedAns, idx) => {
        const userAns = finalAnswers[idx];
        if (userAns && userAns.trim().toUpperCase() === expectedAns) {
          correctCount++;
          const roundTimeSpent = timesToSubmit[idx] !== undefined ? Number(timesToSubmit[idx]) : 15;
          let speedBonus = 0;
          if (roundTimeSpent < 5) speedBonus = 5;
          else if (roundTimeSpent < 10) speedBonus = 4;
          else if (roundTimeSpent < 18) speedBonus = 3;
          else if (roundTimeSpent < 25) speedBonus = 1;
          totalTimeSpeedBonusSum += speedBonus;
        }
      });

      const accuracyScore = (correctCount / 6) * 70;
      const speedScore = totalTimeSpeedBonusSum;
      const finalCalculatedScore = Math.max(0, Math.min(100, Math.round(accuracyScore + speedScore)));
      const totalTimeMs = timesToSubmit.reduce((acc, curr) => acc + curr, 0) * 1000;
      const fallbackDuration = totalTimeMs > 0 ? totalTimeMs : (startTime ? Date.now() - startTime : 0);

      setResultData({
        score: finalCalculatedScore,
        durationMs: fallbackDuration,
        rank: isOfficial ? 1 : null,
        isOfficial: isOfficial,
        leaderboard: isOfficial ? [{
          userId: user?.uid || 'user',
          displayName: user?.displayName || 'Student',
          paperinoAvatar: '',
          score: finalCalculatedScore,
          durationMs: fallbackDuration,
          rank: 1
        }] : []
      });
      setGameState("result");
    }
  };



  if (gameState === "intro") {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center max-w-xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center flex flex-col items-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <Type size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Word Forge</h1>
            <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
              Forge words under pressure across 6 technical vocabulary rounds: Anagrams, Missing Letters, and CS Definitions!
            </p>
          </div>

          <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-gray-400">
            <div className="flex justify-between"><span>Rounds</span><span className="text-purple-300 font-bold">6 Unique Rounds</span></div>
            <div className="flex justify-between"><span>Time per Round</span><span className="text-purple-300 font-bold">30 Seconds</span></div>
            <div className="flex justify-between"><span>Puzzle Types</span><span className="text-purple-300 font-bold">Anagram, Missing, Clue</span></div>
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

  if (gameState === "loading") {
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

  if (gameState === "submitting") {
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
            <h2 className="text-xl font-bold text-white mb-1">Submitting Challenge</h2>
            <p className="text-xs text-gray-400 mb-2">Saving official results...</p>
            <p className="text-[11px] text-purple-300/80 font-medium">Please wait up to 20 seconds to see your result.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === "result" && resultData) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <GameResult 
          score={resultData.score}
          durationMs={resultData.durationMs}
          rank={resultData.rank}
          isOfficial={resultData.isOfficial}
          wasAlreadyCompleted={wasAlreadyCompleted}
          gameId="word-forge"
          gameName="Word Forge"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => window.location.reload()}
          onBackToHub={() => router.push("/weekly-challenges")}
          leaderboard={resultData.leaderboard}
        />
      </div>
    );
  }

  const currentRound = FIXED_ROUNDS[currentRoundIdx];

  const rulesContent = (
    <ul className="space-y-2.5 list-disc list-inside text-sm">
      <li>Solve computer science terms across <strong>6 rapid rounds</strong>.</li>
      <li>Each round gives you <strong>30 seconds</strong> to submit.</li>
      <li><strong>Anagrams:</strong> Unscramble the letters into a word.</li>
      <li><strong>Missing Letters:</strong> Fill in the underscore placeholder.</li>
      <li><strong>Word Clues:</strong> Decipher the description context.</li>
    </ul>
  );

  return (
    <ChallengeGameShell
      gameId="word-forge"
      gameName="Word Forge"
      gameIcon={<Type size={20} />}
      attemptText={currentRound.title}
      timerNode={<GameTimer isRunning={gameState === "playing" || gameState === "round_feedback"} startTime={startTime} />}
      rulesContent={rulesContent}
      gameState={gameState}
    >
      {/* Main Puzzle Area */}
      <div className="glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center space-y-6 w-full mt-2">
        
        <div className="flex justify-between items-center text-xs text-gray-400 px-1 font-semibold border-b border-white/5 pb-4">
          <span className="flex items-center gap-1.5 font-mono text-purple-300">
            ⏱ {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
          </span>
          <span>Round {currentRoundIdx + 1} of 6</span>
        </div>

        {/* Question Header */}
        <div className="space-y-4 py-6 border-y border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 px-3.5 py-1.5 rounded-full border border-purple-500/20">
            {currentRound.type.toUpperCase()} PUZZLE
          </span>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-wide">
            {currentRound.question}
          </h3>
          <p className="text-sm text-gray-400 italic max-w-lg mx-auto">
            {currentRound.hint}
          </p>
        </div>

        {/* User Input Form */}
        <form onSubmit={handleManualSubmit} className="space-y-5 max-w-md mx-auto">
          <input
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value.toUpperCase())}
            placeholder="Type your answer..."
            disabled={gameState !== "playing"}
            className="w-full bg-black/50 border border-purple-500/30 rounded-xl px-5 py-4 text-center text-xl font-bold text-white tracking-widest focus:outline-none focus:border-purple-400 uppercase"
            autoFocus
          />

          <button
            type="submit"
            disabled={gameState !== "playing" || !currentInput.trim()}
            className="liquid-btn w-full py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Submit Answer <Send size={14} />
          </button>
        </form>

      </div>

      {/* Round Feedback Modal */}
      {gameState === "round_feedback" && lastRoundResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel vision-glass p-6 rounded-3xl border border-purple-500/30 max-w-sm w-full text-center space-y-4 shadow-[0_0_40px_rgba(139,92,246,0.25)]">
            <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center border ${
              lastRoundResult.isCorrect ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border-rose-500/40"
            }`}>
              {lastRoundResult.isCorrect ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            </div>
            
            <h3 className="text-xl font-bold text-white">
              {lastRoundResult.isCorrect ? "Correct!" : "Not Quite"}
            </h3>

            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-400">Correct Answer</span><span className="text-purple-300 font-bold">{lastRoundResult.answer}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Status</span><span className={lastRoundResult.isCorrect ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{lastRoundResult.isCorrect ? "Earned Points" : "0 Points"}</span></div>
            </div>

            <button 
              onClick={handleNextRound}
              className="liquid-btn w-full py-3 text-xs uppercase tracking-wider font-bold"
            >
              {currentRoundIdx < 5 ? `Continue to Round ${currentRoundIdx + 2}` : 'Complete Word Forge'}
            </button>
          </div>
        </div>
      )}
    </ChallengeGameShell>
  );
}
