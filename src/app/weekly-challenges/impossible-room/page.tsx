"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import ChallengeGameShell from "@/components/challenges/ChallengeGameShell";
import {
  Clock, BookOpen, Lock, Sparkles, Flower2, Monitor, Sun, Lightbulb, Unlock, Key, Search, ArrowLeft, Check, AlertCircle, X, Shield, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "intro" | "loading" | "playing" | "submitting" | "result";

interface RoomObject {
  id: string;
  name: string;
  icon: any;
  category: string;
  description: string;
  clueText?: string;
  isClue: boolean;
  digitInfo?: {
    position: number;
    value: number;
    hint: string;
  };
}

const ROOM_OBJECTS: RoomObject[] = [
  {
    id: "wall-clock",
    name: "Ancient Wall Clock",
    icon: Clock,
    category: "Timepiece",
    description: "The hands are frozen permanently pointing directly at a specific numeral.",
    isClue: true,
    digitInfo: { position: 1, value: 4, hint: "1st Digit is 4" }
  },
  {
    id: "bookshelf",
    name: "Grand Bookshelf",
    icon: BookOpen,
    category: "Furniture",
    description: "A leather-bound tome on Cyber Security has an etched bookmark code.",
    isClue: true,
    digitInfo: { position: 2, value: 9, hint: "2nd Digit is 9" }
  },
  {
    id: "oil-painting",
    name: "Renaissance Painting",
    icon: Sun,
    category: "Art",
    description: "Examining the brushwork reveals tiny gold leaf numbers tucked in the canvas corner.",
    isClue: true,
    digitInfo: { position: 3, value: 2, hint: "3rd Digit is 2" }
  },
  {
    id: "desk-lamp",
    name: "Brass Desk Lamp",
    icon: Lightbulb,
    category: "Fixture",
    description: "Flicking the UV toggle illuminates ultraviolet numbers written on the felt base.",
    isClue: true,
    digitInfo: { position: 4, value: 7, hint: "4th Digit is 7" }
  },
  {
    id: "terminal-screen",
    name: "Vintage Terminal",
    icon: Monitor,
    category: "Electronics",
    description: "A glowing CRT screen renders a encrypted system diagnostic checksum.",
    isClue: true,
    digitInfo: { position: 0, value: 0, hint: "Combine digits in order [1st..4th]" }
  },
  {
    id: "mysterious-safe",
    name: "Steel Wall Safe",
    icon: Lock,
    category: "Security",
    description: "Heavy reinforced safe dial requiring a 4-digit master authorization combination.",
    isClue: false
  },
  {
    id: "potted-plant",
    name: "Ficus Plant",
    icon: Flower2,
    category: "Decor",
    description: "Healthy green leaves. A small silver key ribbon hangs from the main stem.",
    isClue: false
  },
  {
    id: "brass-key",
    name: "Engraved Key",
    icon: Key,
    category: "Item",
    description: "A heavy brass skeleton key stamped with the emblem of the Paperino Labs.",
    isClue: false
  }
];

export default function ImpossibleRoomPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>("intro");
  
  const [sessionId, setSessionId] = useState<string>("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const [inspectedIds, setInspectedIds] = useState<Set<string>>(new Set());
  const [foundClues, setFoundClues] = useState<Set<string>>(new Set());
  const [selectedObj, setSelectedObj] = useState<RoomObject | null>(null);
  
  const [userLockCode, setUserLockCode] = useState(["", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState("");

  const [checkingAttempt, setCheckingAttempt] = useState(true);

  const isCreatingSession = useRef(false);

  useEffect(() => {
    async function checkAttempt() {
      if (!user) return;
      try {
        setCheckingAttempt(true);
        const token = await user.getIdToken();
        const configRes = await fetch("/api/challenge-start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ gameId: "impossible-room" })
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
        body: JSON.stringify({ gameId: "impossible-room" })
      });
      
      if (!res.ok) throw new Error("Failed to start session");
      
      const data = await res.json();
      setSessionId(data.sessionId);
      setIsOfficial(data.isOfficial);
      
      setInspectedIds(new Set());
      setFoundClues(new Set());
      setUserLockCode(["", "", "", ""]);
      setStartTime(Date.now());
      setGameState("playing");
    } catch (err: any) {
      setError(err.message || "Failed to start room");
      setGameState("intro");
    } finally {
      isCreatingSession.current = false;
    }
  };

  const handleInspect = (obj: RoomObject) => {
    setSelectedObj(obj);
    setInspectedIds((prev) => new Set(prev).add(obj.id));
    if (obj.isClue) {
      setFoundClues((prev) => new Set(prev).add(obj.id));
    }
  };

  const handleDigitInput = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const nextCode = [...userLockCode];
    nextCode[index] = val;
    setUserLockCode(nextCode);
    setCodeError("");

    if (val && index < 3) {
      const nextInput = document.getElementById(`ir-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !userLockCode[index] && index > 0) {
      const prevInput = document.getElementById(`ir-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmitEscape = async () => {
    const enteredCode = userLockCode.join("");
    if (enteredCode.length !== 4) {
      setCodeError("Please enter all 4 digits");
      return;
    }

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
            cluesFound: Array.from(foundClues),
            lockCode: enteredCode
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Submit failed:', data.error);
        setResultData({
          score: 0,
          durationMs: startTime ? Date.now() - startTime : 0,
          rank: isOfficial ? 1 : null,
          isOfficial: isOfficial,
          leaderboard: []
        });
        setGameState("result");
        return;
      }

      setResultData({
        ...data,
        rank: data.rank ?? (data.isOfficial ? 1 : null),
        leaderboard: Array.isArray(data.leaderboard) ? data.leaderboard : []
      });
      setGameState("result");
    } catch (err: any) {
      console.error('Submit error:', err);
      setResultData({
        score: 0,
        durationMs: startTime ? Date.now() - startTime : 0,
        rank: isOfficial ? 1 : null,
        isOfficial: isOfficial,
        leaderboard: []
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
            <Unlock size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">The Impossible Room</h1>
            <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
              Explore 8 interactive room objects, decipher hidden numerical clues, and crack the 4-digit vault master lock to escape!
            </p>
          </div>

          <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs text-gray-400">
            <div className="flex justify-between"><span>Objects to Inspect</span><span className="text-purple-300 font-bold">8 Interactive Items</span></div>
            <div className="flex justify-between"><span>Clues Required</span><span className="text-purple-300 font-bold">5 Hidden Clues</span></div>
            <div className="flex justify-between"><span>Final Lock</span><span className="text-purple-300 font-bold">4-Digit Master Code</span></div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button onClick={startGame} className="liquid-btn w-full py-3.5 font-bold text-sm uppercase tracking-wider">
            Enter Room
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
            <p className="text-xs text-gray-400">Saving official results...</p>
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
          gameId="impossible-room"
          gameName="The Impossible Room"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => window.location.reload()}
          onBackToHub={() => router.push("/weekly-challenges")}
          leaderboard={resultData.leaderboard}
        />
      </div>
    );
  }

  const rulesContent = (
    <ul className="space-y-2.5 list-disc list-inside text-sm">
      <li>Inspect interactive objects scattered in the room.</li>
      <li>Find the <strong>5 critical clues</strong> to resolve the lock digits.</li>
      <li>Enter the combination in the Vault Master Lock interface.</li>
      <li>Your escape time is recorded for the challenge leaderboards.</li>
    </ul>
  );

  return (
    <ChallengeGameShell
      gameId="impossible-room"
      gameName="The Impossible Room"
      gameIcon={<Unlock size={20} />}
      attemptText={`Clues Discovered: ${foundClues.size} / 5`}
      timerNode={<GameTimer isRunning={gameState === "playing"} startTime={startTime} />}
      rulesContent={rulesContent}
      gameState={gameState}
    >
      <div className="w-full space-y-8 mt-2">
        {/* Main Room Layout Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {ROOM_OBJECTS.map((obj) => {
            const IconComp = obj.icon;
            const isInspected = inspectedIds.has(obj.id);
            const isFound = foundClues.has(obj.id);

            return (
              <motion.button
                key={obj.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleInspect(obj)}
                className={`glass-panel vision-glass p-5 rounded-2xl border transition-all text-left flex flex-col justify-between h-36 cursor-pointer relative overflow-hidden ${
                  isFound 
                    ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]" 
                    : isInspected 
                    ? "border-purple-500/30 bg-purple-500/5" 
                    : "border-white/10 hover:border-purple-500/30"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 rounded-xl ${isFound ? "bg-emerald-500/20 text-emerald-300" : "bg-purple-500/20 text-purple-300"}`}>
                    <IconComp size={20} />
                  </div>
                  {isFound && (
                    <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={10} /> Clue
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">{obj.category}</span>
                  <h3 className="text-xs font-bold text-white truncate">{obj.name}</h3>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Master Lock Input Card */}
        <div className="glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 max-w-xl mx-auto w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-purple-300">
            <Shield size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Vault Master Lock</h3>
          </div>

          <div className="flex justify-center gap-4">
            {userLockCode.map((digit, idx) => (
              <input
                key={idx}
                id={`ir-input-${idx}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitInput(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-14 h-16 bg-black/60 border border-purple-500/30 rounded-xl text-center text-2xl font-black text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 shadow-inner"
                placeholder="—"
              />
            ))}
          </div>

          {codeError && (
            <p className="text-xs text-rose-400 font-medium">{codeError}</p>
          )}

          <button
            onClick={handleSubmitEscape}
            className="liquid-btn w-full py-4 text-xs font-bold uppercase tracking-wider"
          >
            Submit Combination & Escape
          </button>
        </div>
      </div>

      {/* Inspection Dialog Modal */}
      <AnimatePresence>
        {selectedObj && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel vision-glass p-8 rounded-3xl border border-purple-500/30 max-w-md w-full relative space-y-5"
            >
              <button 
                onClick={() => setSelectedObj(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <selectedObj.icon size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">{selectedObj.category}</span>
                  <h3 className="text-lg font-bold text-white">{selectedObj.name}</h3>
                </div>
              </div>

              <p className="text-xs text-gray-350 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">
                {selectedObj.description}
              </p>

              {selectedObj.isClue && selectedObj.digitInfo && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                    <Check size={12} /> Discovered Clue Element
                  </span>
                  <p className="text-sm font-bold text-emerald-200">{selectedObj.digitInfo.hint}</p>
                </div>
              )}

              <button 
                onClick={() => setSelectedObj(null)}
                className="liquid-btn w-full py-3 text-xs font-bold uppercase"
              >
                Close Inspection
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ChallengeGameShell>
  );
}
