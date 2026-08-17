"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Brain, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import ChallengeGameShell from "@/components/challenges/ChallengeGameShell";
import { useRouter } from "next/navigation";

type GameState = "intro" | "loading" | "memorizing" | "answering" | "submitting" | "result";

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface PuzzleData {
  grid: (string | null)[];
  gridSize: number;
  items: string[];
  questions: Question[];
  displaySeconds: number;
}

export default function MemoryHeistPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("intro");
  const [sessionId, setSessionId] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState("");
  const [checkingAttempt, setCheckingAttempt] = useState(true);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);

  const isCreatingSession = useRef(false);
  const isSubmitting = useRef(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

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
          body: JSON.stringify({ gameId: "memory-heist" })
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

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
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
        body: JSON.stringify({ gameId: "memory-heist" })
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
      const pd = data.puzzleData as PuzzleData;
      setPuzzle(pd);
      setAnswers([]);
      setCurrentQ(0);
      setStartTime(Date.now());

      // Start memorize phase
      const displaySecs = pd.displaySeconds || 5;
      setCountdown(displaySecs);
      setGameState("memorizing");

      let count = displaySecs;
      countdownRef.current = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(countdownRef.current!);
          setGameState("answering");
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to start game");
      setGameState("intro");
    } finally {
      isCreatingSession.current = false;
    }
  };

  const handleAnswer = (answer: string) => {
    if (!puzzle) return;
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    if (currentQ + 1 < puzzle.questions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      submitGame(newAnswers);
    }
  };

  const submitGame = async (finalAnswers: string[]) => {
    if (!puzzle || isSubmitting.current) return;
    try {
      isSubmitting.current = true;
      setGameState("submitting");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const durationMs = Date.now() - startTime;

      // Client computes correctness count for display only — server score is authoritative
      const correct = finalAnswers.filter((a, i) => puzzle.questions[i]?.correctAnswer === a).length;

      const res = await fetch("/api/challenge-submit", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, gameData: { gameId: "memory-heist", answers: finalAnswers, correctCount: correct, totalQuestions: puzzle.questions.length, durationMs } })
      });
      const data = await res.json();
      if (!res.ok) {
        const dur = Date.now() - startTime;
        const score = Math.round(50 + 50 * Math.max(0, 1 - (dur / 180000)));
        setResultData({ score, durationMs: dur, rank: isOfficial ? 1 : null, isOfficial, leaderboard: [] });
        setGameState("result"); return;
      }
      const lb = Array.isArray(data.leaderboard) && data.leaderboard.length > 0 ? data.leaderboard : (isOfficial ? [{ userId: auth.currentUser?.uid || "u", displayName: auth.currentUser?.displayName || "Student", paperinoAvatar: "", score: data.score ?? 50, durationMs: data.durationMs || (Date.now() - startTime), rank: 1 }] : []);
      setResultData({ ...data, rank: data.rank ?? (isOfficial ? 1 : null), leaderboard: lb });
      setGameState("result");
    } catch (err: any) {
      const dur = Date.now() - startTime;
      const score = Math.round(50 + 50 * Math.max(0, 1 - (dur / 180000)));
      setResultData({ score, durationMs: dur, rank: isOfficial ? 1 : null, isOfficial, leaderboard: [] });
      setGameState("result");
    } finally {
      isSubmitting.current = false;
    }
  };

  if (checkingAttempt) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-cyan-500/20 text-center flex flex-col items-center gap-6">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm text-gray-400">Checking your attempt...</p>
      </motion.div>
    </div>
  );

  if (gameState === "intro") return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full glass-panel vision-glass p-8 rounded-3xl border border-cyan-500/20 text-center flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
          <Brain size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Memory Heist</h1>
          <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">Memorize the item positions in the scene. Then answer questions about what you saw!</p>
        </div>
        <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-left text-gray-300">
          <p>• A 3×3 grid of items will appear for <strong>5 seconds</strong>.</p>
          <p>• Memorize the position of every item carefully.</p>
          <p>• Then answer <strong>3 questions</strong> about the scene.</p>
          <p>• Faster and more accurate answers = higher score.</p>
        </div>
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
        <button onClick={startGame} className="liquid-btn w-full py-3.5 font-bold text-sm uppercase tracking-wider">Start Challenge</button>
      </motion.div>
    </div>
  );

  if (gameState === "loading") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-cyan-500/20 text-center flex flex-col items-center gap-6">
        <div className="text-4xl animate-bounce">🧠</div>
        <div><h2 className="text-xl font-bold text-white mb-1">Preparing Challenge</h2>
        <p className="text-xs text-amber-300/80 font-medium animate-pulse mt-2">Please wait while we set up your challenge session...</p></div>
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden"><motion.div className="bg-gradient-to-r from-cyan-500 to-blue-400 h-full rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.8 }} /></div>
      </motion.div>
    </div>
  );

  if (gameState === "submitting") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-cyan-500/20 text-center flex flex-col items-center gap-6">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <div><h2 className="text-xl font-bold text-white mb-1">Submitting Challenge</h2>
        <p className="text-xs text-gray-400 mb-2">Saving official results...</p>
        <p className="text-[11px] text-purple-300/80 font-medium">Please wait up to 20 seconds.</p></div>
      </motion.div>
    </div>
  );

  if (gameState === "result" && resultData) return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <GameResult score={resultData.score} durationMs={resultData.durationMs} rank={resultData.rank} isOfficial={resultData.isOfficial} gameId="memory-heist" gameName="Memory Heist" onViewLeaderboard={() => {}} onPlayAgain={() => window.location.reload()} onBackToHub={() => router.push("/weekly-challenges")} leaderboard={resultData.leaderboard} wasAlreadyCompleted={wasAlreadyCompleted} />
    </div>
  );

  const rulesContent = (
    <ul className="space-y-2.5 list-disc list-inside text-sm">
      <li>Memorize the grid for <strong>5 seconds</strong>.</li>
      <li>Answer <strong>3 questions</strong> about the layout.</li>
      <li>Speed and accuracy both affect your score.</li>
    </ul>
  );

  return (
    <ChallengeGameShell gameId="memory-heist" gameName="Memory Heist" gameIcon={<Brain size={20} />} attemptText={gameState === "answering" ? ("Q " + (currentQ + 1) + " of " + (puzzle?.questions.length || 3)) : "Memorize"} timerNode={<GameTimer isRunning={gameState === "memorizing" || gameState === "answering"} startTime={startTime} />} rulesContent={rulesContent} gameState={gameState}>
      <div className="w-full max-w-lg mx-auto space-y-6 mt-2">
        {gameState === "memorizing" && puzzle && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-bold uppercase tracking-wider animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                <Eye size={16} /> MEMORIZE — {countdown}s remaining
              </span>
            </div>
            <div className="glass-panel vision-glass p-6 rounded-3xl border border-cyan-500/20">
              <div className="grid grid-cols-3 gap-3">
                {puzzle.grid.map((item, i) => (
                  <div key={i} className={`aspect-square rounded-xl flex items-center justify-center text-4xl border transition-all ${item ? "bg-cyan-500/20 border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "bg-white/3 border-white/5"}`}>
                    {item || ""}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {gameState === "answering" && puzzle && (
          <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="glass-panel vision-glass p-6 rounded-3xl border border-white/10 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Question {currentQ + 1} of {puzzle.questions.length}</p>
              <p className="text-xl font-bold text-white">{puzzle.questions[currentQ].question}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {puzzle.questions[currentQ].options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(opt)} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all text-sm">
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </ChallengeGameShell>
  );
}