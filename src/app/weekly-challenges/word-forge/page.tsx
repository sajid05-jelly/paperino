"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import { 
  Type, HelpCircle, Shuffle, CheckCircle2, AlertCircle, ArrowLeft, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "intro" | "playing" | "round_feedback" | "submitting" | "result";

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
  const [currentInput, setCurrentInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  
  const [lastRoundResult, setLastRoundResult] = useState<{ isCorrect: boolean; answer: string } | null>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = async () => {
    try {
      setError("");
      setGameState("submitting");
      
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
      
      if (!res.ok) throw new Error("Failed to start session");
      
      const data = await res.json();
      setSessionId(data.sessionId);
      setIsOfficial(data.isOfficial);
      
      setUserAnswers([]);
      setStartTime(Date.now());
      startRound(0);
    } catch (err: any) {
      setError(err.message || "Failed to start game");
      setGameState("intro");
    }
  };

  const startRound = (idx: number) => {
    setCurrentRoundIdx(idx);
    setCurrentInput("");
    setTimeLeft(30);
    setGameState("playing");
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    processAnswerSubmit("");
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (timerRef.current) clearInterval(timerRef.current);
    processAnswerSubmit(currentInput);
  };

  const processAnswerSubmit = (inputVal: string) => {
    const currentRound = FIXED_ROUNDS[currentRoundIdx];
    const isCorrect = inputVal.trim().toUpperCase() === currentRound.correctAnswer;
    
    const updatedAnswers = [...userAnswers, inputVal.trim().toUpperCase()];
    setUserAnswers(updatedAnswers);
    
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
      submitFinalAnswers(userAnswers);
    }
  };

  const submitFinalAnswers = async (finalAnswers: string[]) => {
    try {
      setGameState("submitting");
      const token = await user?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/challenge-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          gameData: {
            answers: finalAnswers
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit word forge results");

      setResultData(data);
      setGameState("result");
    } catch (err: any) {
      setError(err.message || "Failed to submit answers");
      setGameState("playing");
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

  if (gameState === "submitting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Shuffle className="w-10 h-10 text-purple-400 animate-spin" />
        <p className="text-sm text-purple-300 font-medium">Loading Word Forge puzzle...</p>
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
          gameId="word-forge"
          gameName="Word Forge"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => window.location.reload()}
          onBackToHub={() => router.push("/weekly-challenges")}
        />
      </div>
    );
  }

  const currentRound = FIXED_ROUNDS[currentRoundIdx];

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
          <h2 className="text-base font-bold text-white">Word Forge</h2>
          <p className="text-xs text-purple-300 font-semibold">{currentRound.title}</p>
        </div>

        <GameTimer isRunning={gameState === "playing" || gameState === "round_feedback"} startTime={startTime} />
      </div>

      {/* Main Puzzle Area */}
      <div className="glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center space-y-6">
        
        {/* Progress Bar */}
        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            className="bg-purple-500 h-full"
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / 30) * 100}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-gray-400 px-1">
          <span>Time Remaining: <strong className="text-purple-300">{timeLeft}s</strong></span>
          <span>Round {currentRoundIdx + 1} of 6</span>
        </div>

        {/* Question Header */}
        <div className="space-y-3 py-4 border-y border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            {currentRound.type.toUpperCase()} PUZZLE
          </span>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
            {currentRound.question}
          </h3>
          <p className="text-xs text-gray-400 italic max-w-md mx-auto">
            {currentRound.hint}
          </p>
        </div>

        {/* User Input Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4 max-w-md mx-auto">
          <input
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value.toUpperCase())}
            placeholder="Type your answer..."
            disabled={gameState !== "playing"}
            className="w-full bg-black/50 border border-purple-500/30 rounded-xl px-5 py-3.5 text-center text-lg font-bold text-white tracking-widest focus:outline-none focus:border-purple-400 uppercase"
            autoFocus
          />

          <button
            type="submit"
            disabled={gameState !== "playing" || !currentInput.trim()}
            className="liquid-btn w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            Submit Answer <Send size={14} />
          </button>
        </form>

      </div>

      {/* Round Feedback Modal */}
      {gameState === "round_feedback" && lastRoundResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel vision-glass p-6 rounded-3xl border border-purple-500/30 max-w-sm w-full text-center space-y-4">
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
              <div className="flex justify-between"><span className="text-gray-400">Score Earned</span><span className="text-emerald-400 font-bold">{lastRoundResult.isCorrect ? "+150" : "+0"}</span></div>
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

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold text-white">Abandon Word Forge?</h3>
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
