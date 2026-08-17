"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Target, Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import ChallengeGameShell from "@/components/challenges/ChallengeGameShell";
import { useRouter } from "next/navigation";

type GameState = "intro" | "loading" | "playing" | "submitting" | "result";

interface PuzzleData {
  target: number;
  availableNumbers: number[];
  allowedOperators: string[];
}

/** Safe recursive descent parser — no eval(), validates tokens strictly */
function safeEval(expr: string, allowed: number[]): number | null {
  const cleaned = expr.replace(/\s+/g, "").replace(/x/gi, "*").replace(/÷/g, "/");
  if (!/^[\d+\-*/().]+$/.test(cleaned)) return null;
  const tokens = cleaned.match(/(\d+|[+\-*/()])/g);
  if (!tokens) return null;

  const usedNums = tokens.filter(t => /^\d+$/.test(t)).map(Number);
  const poolCopy = [...allowed];
  for (const n of usedNums) {
    const idx = poolCopy.indexOf(n);
    if (idx === -1) return null;
    poolCopy.splice(idx, 1);
  }

  let pos = 0;

  function parseExpr(): number {
    let left = parseTerm();
    while (pos < tokens!.length && (tokens![pos] === "+" || tokens![pos] === "-")) {
      const op = tokens![pos++];
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < tokens!.length && (tokens![pos] === "*" || tokens![pos] === "/")) {
      const op = tokens![pos++];
      const right = parseFactor();
      if (op === "/" && right === 0) throw new Error("Division by zero");
      left = op === "*" ? left * right : Math.round((left / right) * 1e9) / 1e9;
    }
    return left;
  }

  function parseFactor(): number {
    if (pos >= tokens!.length) throw new Error("Unexpected end");
    if (tokens![pos] === "(") {
      pos++;
      const val = parseExpr();
      if (tokens![pos] !== ")") throw new Error("Mismatched parentheses");
      pos++;
      return val;
    }
    if (/^\d+$/.test(tokens![pos] || "")) {
      return Number(tokens![pos++]);
    }
    throw new Error("Unexpected token: " + tokens![pos]);
  }

  try {
    const result = parseExpr();
    if (pos !== tokens.length) return null;
    return Math.round(result * 1e9) / 1e9;
  } catch {
    return null;
  }
}

export default function TargetNumberPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("intro");
  const [sessionId, setSessionId] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [expression, setExpression] = useState("");
  const [evalResult, setEvalResult] = useState<number | null | "invalid">(null);
  const [validationMsg, setValidationMsg] = useState("");
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
          body: JSON.stringify({ gameId: "target-number" })
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
        body: JSON.stringify({ gameId: "target-number" })
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
      setPuzzle(data.puzzleData);
      setExpression("");
      setEvalResult(null);
      setValidationMsg("");
      setStartTime(Date.now());
      setGameState("playing");
    } catch (err: any) {
      setError(err.message || "Failed to start game");
      setGameState("intro");
    } finally {
      isCreatingSession.current = false;
    }
  };

  const handleExpressionChange = (val: string) => {
    setExpression(val);
    setValidationMsg("");
    if (!puzzle || val.trim() === "") { setEvalResult(null); return; }
    const result = safeEval(val, puzzle.availableNumbers);
    setEvalResult(result !== null ? result : "invalid");
  };

  const appendToExpression = (token: string) => {
    handleExpressionChange(expression + token);
  };

  const handleSubmit = async () => {
    if (!puzzle || isSubmitting.current || gameState !== "playing") return;
    if (!expression.trim()) { setValidationMsg("Enter an expression first."); return; }
    const result = safeEval(expression, puzzle.availableNumbers);
    if (result === null) { setValidationMsg("Invalid expression or unauthorised numbers used."); return; }
    if (result !== puzzle.target) { setValidationMsg("= " + result + " — that is not the target (" + puzzle.target + "). Try again!"); return; }

    try {
      isSubmitting.current = true;
      setGameState("submitting");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const durationMs = Date.now() - startTime;
      const res = await fetch("/api/challenge-submit", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, gameData: { gameId: "target-number", expression, result, durationMs } })
      });
      const data = await res.json();
      if (!res.ok) {
        const dur = Date.now() - startTime;
        const score = Math.round(50 + 50 * Math.max(0, 1 - (dur / 240000)));
        setResultData({ score, durationMs: dur, rank: isOfficial ? 1 : null, isOfficial, leaderboard: [] });
        setGameState("result"); return;
      }
      const lb = Array.isArray(data.leaderboard) && data.leaderboard.length > 0 ? data.leaderboard : (isOfficial ? [{ userId: auth.currentUser?.uid || "u", displayName: auth.currentUser?.displayName || "Student", paperinoAvatar: "", score: data.score ?? 50, durationMs: data.durationMs || (Date.now() - startTime), rank: 1 }] : []);
      setResultData({ ...data, rank: data.rank ?? (isOfficial ? 1 : null), leaderboard: lb });
      setGameState("result");
    } catch (err: any) {
      const dur = Date.now() - startTime;
      const score = Math.round(50 + 50 * Math.max(0, 1 - (dur / 240000)));
      setResultData({ score, durationMs: dur, rank: isOfficial ? 1 : null, isOfficial, leaderboard: [] });
      setGameState("result");
    } finally {
      isSubmitting.current = false;
    }
  };

  if (checkingAttempt) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-red-500/20 text-center flex flex-col items-center gap-6">
        <Loader2 className="w-8 h-8 animate-spin text-red-400" />
        <p className="text-sm text-gray-400">Checking your attempt...</p>
      </motion.div>
    </div>
  );

  if (gameState === "intro") return (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full glass-panel vision-glass p-8 rounded-3xl border border-red-500/20 text-center flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
          <Target size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Target Number</h1>
          <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">Use the given numbers and operators to reach the exact target. Every puzzle has a valid solution!</p>
        </div>
        <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-left text-gray-300">
          <p>• You are given <strong>6 numbers</strong> and a <strong>target</strong>.</p>
          <p>• Use <strong>any or all</strong> numbers with <strong>+, −, ×, ÷</strong> to hit the target.</p>
          <p>• Each number can only be used <strong>once</strong>.</p>
          <p>• Parentheses are allowed for grouping.</p>
        </div>
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
        <button onClick={startGame} className="liquid-btn w-full py-3.5 font-bold text-sm uppercase tracking-wider">Start Challenge</button>
      </motion.div>
    </div>
  );

  if (gameState === "loading") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-red-500/20 text-center flex flex-col items-center gap-6">
        <div className="text-4xl animate-bounce">🎯</div>
        <div><h2 className="text-xl font-bold text-white mb-1">Preparing Challenge</h2>
        <p className="text-xs text-amber-300/80 font-medium animate-pulse mt-2">Please wait while we set up your challenge session...</p></div>
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden"><motion.div className="bg-gradient-to-r from-red-500 to-orange-400 h-full rounded-full" animate={{ x: ["-100%", "200%"] }} transition={{ repeat: Infinity, duration: 1.8 }} /></div>
      </motion.div>
    </div>
  );

  if (gameState === "submitting") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full glass-panel vision-glass p-8 rounded-3xl border border-red-500/20 text-center flex flex-col items-center gap-6">
        <Loader2 className="w-8 h-8 animate-spin text-red-400" />
        <div><h2 className="text-xl font-bold text-white mb-1">Submitting Challenge</h2>
        <p className="text-xs text-gray-400 mb-2">Saving official results...</p>
        <p className="text-[11px] text-purple-300/80 font-medium">Please wait up to 20 seconds.</p></div>
      </motion.div>
    </div>
  );

  if (gameState === "result" && resultData) return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <GameResult score={resultData.score} durationMs={resultData.durationMs} rank={resultData.rank} isOfficial={resultData.isOfficial} gameId="target-number" gameName="Target Number" onViewLeaderboard={() => {}} onPlayAgain={() => window.location.reload()} onBackToHub={() => router.push("/weekly-challenges")} leaderboard={resultData.leaderboard} wasAlreadyCompleted={wasAlreadyCompleted} />
    </div>
  );

  const rulesContent = (
    <ul className="space-y-2.5 list-disc list-inside text-sm">
      <li>Use the given numbers with +, −, ×, ÷ to reach the <strong>exact target</strong>.</li>
      <li>Each number may only be used <strong>once</strong>.</li>
      <li>Parentheses are allowed: e.g. <code className="text-xs bg-white/10 px-1 rounded">(3+5)*4</code></li>
      <li>You do not need to use all 6 numbers.</li>
      <li>Every puzzle has at least one valid solution.</li>
    </ul>
  );

  return (
    <ChallengeGameShell gameId="target-number" gameName="Target Number" gameIcon={<Target size={20} />} attemptText="Find the expression" timerNode={<GameTimer isRunning={gameState === "playing"} startTime={startTime} />} rulesContent={rulesContent} gameState={gameState}>
      <div className="w-full max-w-2xl mx-auto space-y-6 mt-2">
        <div className="glass-panel vision-glass p-6 rounded-3xl border border-red-500/20 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">TARGET</p>
          <p className="text-7xl font-black text-white">{puzzle?.target}</p>
        </div>

        <div className="glass-panel vision-glass p-6 rounded-3xl border border-white/10">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 text-center">Available Numbers — tap to add</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {puzzle?.availableNumbers.map((n, i) => (
              <button key={i} onClick={() => appendToExpression(String(n))} className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-2xl font-extrabold text-white hover:bg-red-500/20 hover:border-red-400/40 transition-all active:scale-95">
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            {["+", "-", "*", "/", "(", ")"].map(op => (
              <button key={op} onClick={() => appendToExpression(op)} className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-lg font-bold text-red-300 hover:bg-red-500/25 transition-all active:scale-95">
                {op === "*" ? "×" : op === "/" ? "÷" : op}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel vision-glass p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex gap-3">
            <input type="text" value={expression} onChange={e => handleExpressionChange(e.target.value)} placeholder="Type or tap numbers/operators..." className="flex-1 bg-black/60 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-red-400/50" />
            <button onClick={() => { setExpression(""); setEvalResult(null); setValidationMsg(""); }} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm font-bold">Clear</button>
          </div>

          {evalResult !== null && (
            <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl ${evalResult === "invalid" ? "text-rose-400 bg-rose-500/10 border border-rose-500/20" : evalResult === puzzle?.target ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"}`}>
              {evalResult === "invalid" ? <XCircle size={16} /> : evalResult === puzzle?.target ? <CheckCircle2 size={16} /> : null}
              {evalResult === "invalid" ? "Invalid expression or unauthorised number used" : evalResult === puzzle?.target ? ("Correct! = " + evalResult) : ("= " + evalResult + " — need " + puzzle?.target)}
            </div>
          )}

          {validationMsg && <p className="text-sm text-rose-400 font-medium">{validationMsg}</p>}

          <button onClick={handleSubmit} disabled={evalResult !== puzzle?.target} className="liquid-btn w-full py-4 text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed">
            Submit Answer
          </button>
        </div>
      </div>
    </ChallengeGameShell>
  );
}