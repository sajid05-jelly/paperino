"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import { 
  Keyboard, 
  HelpCircle, 
  Type, 
  Shuffle, 
  CheckCircle2, 
  XCircle,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "intro" | "playing" | "round_feedback" | "result";

interface Round {
  type: 'anagram' | 'missing' | 'clue';
  letters?: string;
  clue?: string;
  answerLength: number;
  correctAnswer: string;
}

export default function WordForgePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>("intro");
  
  // Game session data
  const [sessionId, setSessionId] = useState<string>("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Puzzle data
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  
  // Round state
  const [currentInput, setCurrentInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isCurrentRoundCorrect, setIsCurrentRoundCorrect] = useState(false);
  
  // Result
  const [resultData, setResultData] = useState<any>(null);
  
  // Timer ref for the 30s countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = async () => {
    try {
      if (!user) {
        alert("Please sign in to play");
        return;
      }
      
      const token = await user.getIdToken();
      const res = await fetch("/api/challenge-start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameId: "word-forge" })
      });
      
      if (!res.ok) throw new Error("Failed to start game");
      
      const data = await res.json();
      setSessionId(data.sessionId);
      setIsOfficial(data.isOfficial);
      setRounds(data.puzzleData.rounds);
      
      setStartTime(Date.now());
      startRound(0);
    } catch (err) {
      console.error(err);
      alert("Error starting game.");
    }
  };

  const startRound = (idx: number) => {
    setCurrentRoundIdx(idx);
    setCurrentInput("");
    setTimeLeft(30);
    setGameState("playing");
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
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
    submitAnswer(currentInput);
  };

  const submitAnswer = (answer: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const isCorrect = answer.trim().toLowerCase() === rounds[currentRoundIdx].correctAnswer.toLowerCase();
    setIsCurrentRoundCorrect(isCorrect);
    
    const newAnswers = [...answers];
    newAnswers[currentRoundIdx] = answer;
    setAnswers(newAnswers);
    
    setGameState("round_feedback");
    
    setTimeout(() => {
      if (currentRoundIdx + 1 < rounds.length) {
        startRound(currentRoundIdx + 1);
      } else {
        finishGame(newAnswers);
      }
    }, 2500);
  };

  const finishGame = async (finalAnswers: string[]) => {
    setGameState("result");
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/challenge-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          gameData: { answers: finalAnswers }
        })
      });
      
      if (!res.ok) throw new Error("Submission failed");
      const data = await res.json();
      setResultData(data);
    } catch (err) {
      console.error(err);
      setResultData({
        score: finalAnswers.filter((a, i) => a.toLowerCase() === rounds[i]?.correctAnswer.toLowerCase()).length * 1000,
        durationMs: Date.now() - (startTime || Date.now()),
        rank: null,
        isOfficial: false,
        gameId: "word-forge"
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitAnswer(currentInput);
  };

  if (gameState === "intro") {
    return (
      <div className="min-h-screen bg-[#050308] text-white p-6 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center">
          <Keyboard className="w-16 h-16 text-purple-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-purple-400">
            Word Forge
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Test your vocabulary in 6 rapid-fire rounds! Solve anagrams, fill in missing letters, and deduce words from clues.
            You have 30 seconds per round. Forge words accurately and quickly to maximize your score!
          </p>
          <button 
            onClick={startGame}
            className="liquid-btn w-full py-4 rounded-2xl font-bold bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
          >
            Start Challenge <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "result" && resultData) {
    return (
      <div className="min-h-screen bg-[#050308] text-white p-6 flex items-center justify-center">
        <GameResult 
          score={resultData.score}
          durationMs={resultData.durationMs}
          rank={resultData.rank}
          isOfficial={resultData.isOfficial}
          gameId="word-forge"
          gameName="Word Forge"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => {
            setGameState("intro");
            setAnswers([]);
            setResultData(null);
          }}
          onBackToHub={() => router.push("/weekly-challenges")}
        />
      </div>
    );
  }

  const currentRound = rounds[currentRoundIdx];

  const getRoundIcon = (type: string) => {
    switch (type) {
      case 'anagram': return <Shuffle className="w-5 h-5" />;
      case 'missing': return <Type className="w-5 h-5" />;
      case 'clue': return <HelpCircle className="w-5 h-5" />;
      default: return <Keyboard className="w-5 h-5" />;
    }
  };

  const getRoundLabel = (type: string) => {
    switch (type) {
      case 'anagram': return "Anagram";
      case 'missing': return "Missing Letters";
      case 'clue': return "Clue";
      default: return "Word Puzzle";
    }
  };

  return (
    <div className="min-h-screen bg-[#050308] text-white p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel vision-glass p-4 rounded-2xl border border-purple-500/20">
          <div>
            <h2 className="text-xl font-bold">Word Forge</h2>
          </div>
          <GameTimer isRunning={gameState === "playing" || gameState === "round_feedback"} startTime={startTime} />
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-3 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < currentRoundIdx ? (answers[i] && rounds[i] && answers[i].toLowerCase() === rounds[i].correctAnswer.toLowerCase() ? "bg-green-500" : "bg-red-500")
                : i === currentRoundIdx ? "bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.6)] animate-pulse" 
                : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Game Area */}
        <AnimatePresence mode="wait">
          {gameState === "playing" && currentRound && (
            <motion.div 
              key={`round-${currentRoundIdx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel vision-glass p-6 md:p-10 rounded-3xl border border-purple-500/20 flex flex-col items-center"
            >
              <div className="w-full flex justify-between items-center mb-8">
                <span className="text-gray-400 font-semibold uppercase tracking-wider text-sm">
                  Round {currentRoundIdx + 1} of 6
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-semibold flex items-center gap-2">
                  {getRoundIcon(currentRound?.type)}
                  {getRoundLabel(currentRound?.type)}
                </span>
              </div>

              {/* Puzzle Content */}
              <div className="min-h-[160px] flex flex-col items-center justify-center w-full mb-8">
                {currentRound.type === 'anagram' && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {currentRound.letters?.split('').map((char, i) => (
                      <div key={i} className="w-12 h-14 md:w-16 md:h-20 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center justify-center text-3xl font-bold uppercase shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                        {char}
                      </div>
                    ))}
                  </div>
                )}
                
                {currentRound.type === 'missing' && (
                  <div className="text-center w-full">
                    <p className="text-gray-400 mb-6 text-sm uppercase tracking-widest">{currentRound.clue}</p>
                    <div className="text-4xl md:text-5xl font-mono tracking-[0.3em] font-bold">
                      {currentRound.letters}
                    </div>
                  </div>
                )}
                
                {currentRound.type === 'clue' && (
                  <div className="text-center w-full max-w-md mx-auto">
                    <HelpCircle className="w-10 h-10 text-purple-400/50 mx-auto mb-4" />
                    <h3 className="text-2xl md:text-3xl font-medium leading-relaxed">
                      "{currentRound.clue}"
                    </h3>
                    <div className="mt-4 text-purple-300 font-semibold">
                      {currentRound.answerLength} letters
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleFormSubmit} className="w-full max-w-md">
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Type your answer..."
                  className="w-full bg-black/40 border border-purple-500/30 rounded-xl p-4 text-center text-2xl font-bold text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all mb-4 uppercase"
                  autoFocus
                  autoComplete="off"
                  maxLength={currentRound.answerLength}
                />
                <button
                  type="submit"
                  disabled={!currentInput.trim()}
                  className="liquid-btn w-full py-3 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors"
                >
                  Submit Answer
                </button>
              </form>

              {/* Timer Bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-8 overflow-hidden">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / 30) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                  className={`h-full rounded-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-purple-500'}`}
                />
              </div>
              <div className={`mt-2 text-sm font-mono font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                {timeLeft}s
              </div>
            </motion.div>
          )}

          {gameState === "round_feedback" && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`glass-panel vision-glass p-10 rounded-3xl border w-full max-w-md flex flex-col items-center text-center ${
                isCurrentRoundCorrect 
                  ? 'border-green-500/40 bg-green-950/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]' 
                  : 'border-red-500/40 bg-red-950/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
              }`}
            >
              {isCurrentRoundCorrect ? (
                <CheckCircle2 className="w-20 h-20 text-green-400 mb-6" />
              ) : (
                <XCircle className="w-20 h-20 text-red-400 mb-6" />
              )}
              
              <h2 className="text-3xl font-bold mb-2">
                {isCurrentRoundCorrect ? "Correct!" : "Incorrect"}
              </h2>
              
              <p className="text-gray-300 text-lg mb-4">
                The answer was <span className="font-bold text-white uppercase">{currentRound?.correctAnswer}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
