"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Zap, Loader2, AlertCircle, ChevronRight, CheckCircle2 } from "lucide-react";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import ChallengeGameShell from "@/components/challenges/ChallengeGameShell";
import { useRouter } from "next/navigation";

type GameState = "intro" | "loading" | "playing" | "submitting" | "result";

interface Instruction {
  text: string;
  active: boolean;
}

interface PuzzleData {
  rounds: {
    values: number[];
    instructions: Instruction[];
    question: string;
    answer: string;
    options: string[];
  }[];
}

export default function ParadoxPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("intro");
  const [sessionId, setSessionId] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState("");
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

  const isCreatingSession = useRef(false);
  const isSubmitting = useRef(false);

  useEffect(() => {
    async function checkAttempt() {
      const currentUser = auth.currentUser;
      if (!currentUser) { setCheckingAttempt(false); return; }
      try {
        setCheckingAttempt(true);
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/challenge-start", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ gameId: "paradox", checkOnly: true })
        });
        const data = await res.json();
        if (res.status === 409 && data.completed) {
          setResultData({ score: data.score, durationMs: data.durationMs, rank: data.rank, isOfficial: true, leaderboard: data.leaderboard || [] });
          setWasAlreadyCompleted(true);
          setGameState("result");
        } else if (!res.ok) {
          setError(data.error || "Failed to contact game servers");
        }
      } catch (err: any) {
        console.error("checkAttempt failed:", err);
      } finally {
        setCheckingAttempt(false);
      }
    }
    const unsub = auth.onAuthStateChanged((u: any) => { if (u) checkAttempt(); else setCheckingAttempt(false); });
    return () => unsub();
  }, []);

  const startGame = async () => {
    if (isCreatingSession.current) return;
    try {
      isCreatingSession.current = true;
      setError("");
      setGameState("loading");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in to play");
      const res = await fetch("/api/challenge-start", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: "paradox" })
      });
      const data = await res.json();
      if (res.status === 409 && data.completed) {
        setResultData({ score: data.score, durationMs: data.durationMs, rank: data.rank, isOfficial: true, leaderboard: data.leaderboard || [] });
        setWasAlreadyCompleted(true);
        setGameState("result");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to start session");
      setSessionId(data.sessionId);
      setIsOfficial(Boolean(data.isOfficial));
      setPuzzle(data.puzzleData as PuzzleData);
      setSelectedAnswer(null);
      setAnswers([]);
      setCurrentRoundIdx(0);
      setStartTime(Date.now());
      setGameState("playing");
    } catch (err: any) {
      setError(err.message || "Failed to start game");
      setGameState("intro");
    } finally {
      isCreatingSession.current = false;
    }
  };

  const currentPuzzle = puzzle?.rounds?.[currentRoundIdx];

  const handleNextOrSubmit = async () => {
    if (!currentPuzzle || !selectedAnswer || isSubmitting.current || gameState !== "playing") return;
    
    const newAnswers = [...answers, selectedAnswer];
    setAnswers(newAnswers);

    if (currentRoundIdx + 1 < (puzzle?.rounds?.length || 5)) {
      setCurrentRoundIdx(currentRoundIdx + 1);
      setSelectedAnswer(null);
      return;
    }

    try {
      isSubmitting.current = true;
      setGameState("submitting");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const durationMs = Date.now() - startTime;
      const res = await fetch("/api/challenge-submit", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, gameData: { gameId: "paradox", answers: newAnswers, durationMs } })
      });
      const data = await res.json();
      if (!res.ok) {
        const dur = Date.now() - startTime;
        const score = Math.round(50 + 50 * Math.max(0, 1 - (dur / 120000)));
        setResultData({ score, durationMs: dur, rank: isOfficial ? 1 : null, isOfficial, leaderboard: [] });
        setGameState("result"); return;
      }
      const lb = Array.isArray(data.leaderboard) && data.leaderboard.length > 0 ? data.leaderboard : (isOfficial ? [{ userId: auth.currentUser?.uid || "u", displayName: auth.currentUser?.displayName || "Student", paperinoAvatar: "", score: data.score ?? 50, durationMs: data.durationMs || (Date.now() - startTime), rank: 1 }] : []);
      setResultData({ ...data, rank: data.rank ?? (isOfficial ? 1 : null), leaderboard: lb });
      setGameState("result");
    } catch (err: any) {
      const dur = Date.now() - startTime;
      const score = Math.round(50 + 50 * Math.max(0, 1 - (dur / 120000)));
      setResultData({ score, durationMs: dur, rank: isOfficial ? 1 : null, isOfficial, leaderboard: [] });
      setGameState("result");
    } finally {
      isSubmitting.current = false;
    }
  };



  if (gameState === "intro") return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full glass-panel vision-glass p-8 rounded-3xl border border-pink-500/20 text-center flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-pink-500/20 flex items-center justify-center text-pink-400 border border-pink-500/30 shadow-[0_0_30px_rgba(244,114,182,0.3)]">
          <Zap size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Paradox</h1>
          <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">Follow a chain of shifting instructions. Some cancel others. Track which instructions are still active and find the correct answer!</p>
        </div>
        <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-left text-gray-300">
          <p>• Read each instruction carefully in order.</p>
          <p>• Some instructions <strong>cancel or override</strong> previous ones.</p>
          <p>• Only <strong>active instructions</strong> matter at the end.</p>
          <p>• Each puzzle has exactly <strong>one correct answer</strong>.</p>
        </div>
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
        <button onClick={startGame} className="liquid-btn w-full py-3.5 font-bold text-sm uppercase tracking-wider">Start Challenge</button>
      </motion.div>
    </div>
  );

  if (gameState === "loading") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-pink-500/20 text-center flex flex-col items-center gap-6">
        <div className="text-4xl animate-bounce">🌀</div>
        <div><h2 className="text-xl font-bold text-white mb-1">Preparing Challenge</h2>
        <p className="text-xs text-amber-300/80 font-medium animate-pulse mt-2">Please wait while we set up your challenge session...</p></div>
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden"><motion.div className="bg-gradient-to-r from-pink-500 to-purple-400 h-full rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.8 }} /></div>
      </motion.div>
    </div>
  );

  if (gameState === "submitting") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-pink-500/20 text-center flex flex-col items-center gap-6">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
        <div><h2 className="text-xl font-bold text-white mb-1">Submitting Challenge</h2>
        <p className="text-xs text-gray-400 mb-2">Saving official results...</p>
        <p className="text-[11px] text-purple-300/80 font-medium">Please wait up to 20 seconds.</p></div>
      </motion.div>
    </div>
  );

  if (gameState === "result" && resultData) return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <GameResult score={resultData.score} durationMs={resultData.durationMs} rank={resultData.rank} isOfficial={resultData.isOfficial} gameId="paradox" gameName="Paradox" onViewLeaderboard={() => {}} onPlayAgain={() => window.location.reload()} onBackToHub={() => router.push("/weekly-challenges")} leaderboard={resultData.leaderboard} wasAlreadyCompleted={wasAlreadyCompleted} />
    </div>
  );

  const rulesContent = (
    <ul className="space-y-2.5 list-disc list-inside text-sm">
      <li>Read each instruction carefully in order.</li>
      <li>Some instructions <strong>cancel or override</strong> previous ones.</li>
      <li>Only <strong>active instructions</strong> determine the final answer.</li>
      <li>Each puzzle has exactly <strong>one correct answer</strong>.</li>
    </ul>
  );

  const activeInstructions = currentPuzzle?.instructions.filter(ins => ins.active) || [];

  return (
    <ChallengeGameShell gameId="paradox" gameName="Paradox" gameIcon={<Zap size={20} />} attemptText={gameState === "playing" ? ("Puzzle " + (currentRoundIdx + 1) + " of " + (puzzle?.rounds?.length || 5)) : "Follow the instructions"} timerNode={<GameTimer isRunning={gameState === "playing"} startTime={startTime} />} rulesContent={rulesContent} gameState={gameState}>
      <div className="w-full max-w-2xl mx-auto space-y-6 mt-2">
        {/* Instruction chain */}
        <div className="glass-panel vision-glass p-6 rounded-3xl border border-pink-500/20 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-3">Instructions — follow in order</p>
          {currentPuzzle?.instructions.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${ins.active ? "bg-pink-500/10 border-pink-500/25 text-white" : "bg-black/20 border-white/5 text-gray-500 line-through"}`}>
              <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5 ${ins.active ? "bg-pink-500/30 border border-pink-500/40 text-pink-300" : "bg-white/5 border-white/10 text-gray-600"}`}>{i + 1}</span>
              <p className="text-sm leading-relaxed">{ins.text}</p>
              {ins.active && <CheckCircle2 size={14} className="text-pink-400 shrink-0 mt-1 ml-auto" />}
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="glass-panel vision-glass p-5 rounded-3xl border border-white/10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Available Values</p>
          <div className="flex gap-3 justify-center flex-wrap">
            {currentPuzzle?.values.map((v, i) => (
              <span key={i} className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 text-xl font-extrabold text-white flex items-center justify-center">{v}</span>
            ))}
          </div>
        </div>

        {/* Question + options */}
        <div className="glass-panel vision-glass p-6 rounded-3xl border border-white/10 space-y-4">
          <p className="text-center text-lg font-bold text-white">{currentPuzzle?.question}</p>
          <div className="grid grid-cols-2 gap-3">
            {currentPuzzle?.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedAnswer(opt)}
                className={`p-4 rounded-2xl border text-lg font-extrabold transition-all ${selectedAnswer === opt ? "bg-pink-500/25 border-pink-400/60 text-pink-200 shadow-[0_0_20px_rgba(244,114,182,0.2)]" : "bg-white/5 border-white/10 text-white hover:bg-pink-500/10 hover:border-pink-500/30"}`}
              >
                {opt}
              </button>
            ))}
          </div>
          <button onClick={handleNextOrSubmit} disabled={!selectedAnswer} className="liquid-btn w-full py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed">
            {currentRoundIdx + 1 < (puzzle?.rounds?.length || 5) ? "Next Puzzle" : "Submit Challenge"}
          </button>
        </div>
      </div>
    </ChallengeGameShell>
  );
}