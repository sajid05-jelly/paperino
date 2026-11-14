"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  Zap, 
  ChevronRight, 
  ToggleLeft, 
  ToggleRight, 
  Activity 
} from 'lucide-react';
import GameTimer from '@/components/challenges/GameTimer';
import GameResult from '@/components/challenges/GameResult';
import ChallengeGameShell from '@/components/challenges/ChallengeGameShell';
import { useRouter } from 'next/navigation';

type GameState = 'intro' | 'loading' | 'playing' | 'submitting' | 'result';

interface CircuitItem {
  id: string;
  title: string;
  expression: string;
  inputs: string[];
  targetOutput: number;
}

export default function CircuitMasterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>('intro');
  const [sessionId, setSessionId] = useState<string>('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [difficulty, setDifficulty] = useState<'novice' | 'adept' | 'master'>('adept');
  
  const [circuits, setCircuits] = useState<CircuitItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [circuitInputs, setCircuitInputs] = useState<Record<string, Record<string, number>>>({});

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
          body: JSON.stringify({ gameId: "circuit-master" })
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
        body: JSON.stringify({ gameId: "circuit-master", difficulty })
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
      if (data.puzzleData?.circuits) {
        setCircuits(data.puzzleData.circuits);
        // Initialize all inputs to 0
        const initInputs: Record<string, Record<string, number>> = {};
        data.puzzleData.circuits.forEach((c: CircuitItem) => {
          initInputs[c.id] = {};
          c.inputs.forEach((inp: string) => {
            initInputs[c.id][inp] = 0;
          });
        });
        setCircuitInputs(initInputs);
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

  const currentCircuit = circuits[currentIndex];
  const currentInputs = currentCircuit ? (circuitInputs[currentCircuit.id] || {}) : {};

  // Compute live local output for simulation
  const evaluateCircuitOutput = (circuit: CircuitItem, inputs: Record<string, number>) => {
    if (circuit.id === 'cm-1') {
      return (inputs.A === 1 && inputs.B === 1) ? 1 : 0;
    } else if (circuit.id === 'cm-2') {
      const b1 = (inputs.A === 1 || inputs.B === 1) ? 1 : 0;
      const b2 = (inputs.C === 0) ? 1 : 0;
      return (b1 === 1 && b2 === 1) ? 1 : 0;
    } else if (circuit.id === 'cm-3') {
      const xor = (inputs.A !== inputs.B) ? 1 : 0;
      return (xor === 1 && inputs.C === 1) ? 1 : 0;
    } else if (circuit.id === 'cm-4') {
      const nand = !(inputs.A === 1 && inputs.B === 1) ? 1 : 0;
      const or = (inputs.B === 1 || inputs.C === 1) ? 1 : 0;
      return (nand === 1 && or === 1) ? 1 : 0;
    }
    return 0;
  };

  const currentLiveOutput = currentCircuit ? evaluateCircuitOutput(currentCircuit, currentInputs) : 0;
  const isCurrentlyTargetMet = currentCircuit ? (currentLiveOutput === currentCircuit.targetOutput) : false;

  const toggleSwitch = (inputKey: string) => {
    if (!currentCircuit) return;
    setCircuitInputs(prev => {
      const cur = { ...(prev[currentCircuit.id] || {}) };
      cur[inputKey] = cur[inputKey] === 1 ? 0 : 1;
      return { ...prev, [currentCircuit.id]: cur };
    });
  };

  const handleNextCircuit = () => {
    if (currentIndex < circuits.length - 1) {
      setCurrentIndex(currentIndex + 1);
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
            gameId: "circuit-master",
            circuitInputs,
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
          <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin" />
          <p className="text-gray-400 font-medium text-sm">Energizing logic gate simulation...</p>
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
          gameId="circuit-master"
          gameName="Circuit Master"
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
      gameId="circuit-master"
      gameName="Circuit Master"
      gameIcon={<Cpu className="w-5 h-5 text-fuchsia-400" />}
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
          <p>• Toggle the binary input switches (0 or 1) for pins A, B, and C.</p>
          <p>• Observe the logic gate equation (AND, OR, NOT, XOR, NAND) to generate the target Output (1 or 0).</p>
          <p>• Progress through all 4 logic gate circuits before time runs out.</p>
          <p>• Review full boolean truth tables and logic circuit diagrams upon game completion.</p>
        </div>
      }
    >
      {gameState === 'intro' && (
        <div className="max-w-xl mx-auto w-full glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-fuchsia-500/20 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center mx-auto text-fuchsia-400">
            <Cpu size={32} />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Circuit Master Arena</h1>
            <p className="text-gray-400 text-sm mt-2">
              Interactive logic gate simulation. Toggle digital inputs to solve compound boolean circuits.
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
                      ? 'bg-fuchsia-500/20 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]'
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
            className="liquid-btn w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider text-white transition-all bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-[0_0_25px_rgba(217,70,239,0.3)] hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap size={16} /> Power Up Circuits
          </button>
        </div>
      )}

      {gameState === 'loading' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin mx-auto" />
          <p className="text-gray-300 font-semibold text-sm">Simulating semiconductor circuit paths...</p>
        </div>
      )}

      {gameState === 'submitting' && (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
          <p className="text-gray-300 font-semibold text-sm">Validating truth tables and circuit state...</p>
        </div>
      )}

      {gameState === 'playing' && currentCircuit && (
        <div className="max-w-2xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Circuit {currentIndex + 1} of {circuits.length}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 font-semibold">
              Target Output: {currentCircuit.targetOutput}
            </span>
          </div>

          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-fuchsia-500 to-purple-500 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / circuits.length) * 100}%` }}
            />
          </div>

          {/* Circuit Interactive Board */}
          <div className="glass-panel vision-glass rounded-3xl p-6 sm:p-8 border border-fuchsia-500/20 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-white">
                {currentCircuit.title}
              </h2>
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-base sm:text-lg text-fuchsia-300 tracking-wider">
                {currentCircuit.expression}
              </div>
            </div>

            {/* Input Switches */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Toggle Digital Input Pins (0 or 1):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currentCircuit.inputs.map((inp) => {
                  const val = currentInputs[inp] || 0;
                  const isHigh = val === 1;

                  return (
                    <button
                      key={inp}
                      onClick={() => toggleSwitch(inp)}
                      className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                        isHigh
                          ? 'bg-fuchsia-500/20 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                          : 'bg-white/[0.03] border-white/10 text-gray-400 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold text-gray-300">
                        Pin {inp}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-xl font-black">
                        {isHigh ? (
                          <span className="text-fuchsia-300">1 (HIGH)</span>
                        ) : (
                          <span className="text-gray-500">0 (LOW)</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                        Click to Toggle
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Output Status Indicator */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              isCurrentlyTargetMet
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-white/[0.02] border-white/10 text-gray-300'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full animate-ping ${isCurrentlyTargetMet ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <div>
                  <span className="text-xs font-bold block">Current Circuit Output:</span>
                  <span className="font-mono text-sm font-bold">
                    Output = {currentLiveOutput} (Target: {currentCircuit.targetOutput})
                  </span>
                </div>
              </div>

              {isCurrentlyTargetMet ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Solved
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs font-semibold">
                  Awaiting Logic
                </span>
              )}
            </div>

            {/* Next / Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleNextCircuit}
                className="liquid-btn px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:brightness-110 flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(217,70,239,0.25)]"
              >
                <span>{currentIndex === circuits.length - 1 ? 'Finish & Review' : 'Next Circuit'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </ChallengeGameShell>
  );
}
