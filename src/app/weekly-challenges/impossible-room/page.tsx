"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import {
  Clock, BookOpen, Lock, Sparkles, Flower2, Monitor, Sun, Lightbulb, Unlock, Key, Search, ArrowLeft, Check, AlertCircle, X, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GameState = "intro" | "playing" | "submitting" | "result";

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
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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
      if (!res.ok) throw new Error(data.error || "Failed to submit escape attempt");

      setResultData(data);
      setGameState("result");
    } catch (err: any) {
      setCodeError(err.message || "Escape failed");
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
            <Lock size={32} />
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

  if (gameState === "submitting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Sparkles className="w-10 h-10 text-purple-400 animate-spin" />
        <p className="text-sm text-purple-300 font-medium">Verifying room session...</p>
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
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto flex flex-col justify-between">
      
      {/* Header bar */}
      <div className="w-full flex justify-between items-center glass-panel p-4 rounded-2xl border border-purple-500/20 mb-6">
        <button 
          onClick={() => setShowExitConfirm(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Leave
        </button>

        <div className="text-center">
          <h2 className="text-base font-bold text-white">The Impossible Room</h2>
          <p className="text-xs text-purple-300 font-semibold">Clues Discovered: {foundClues.size} / 5</p>
        </div>

        <GameTimer isRunning={gameState === "playing"} startTime={startTime} />
      </div>

      {/* Main Room Layout Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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
      <div className="glass-panel vision-glass p-6 rounded-3xl border border-purple-500/20 max-w-lg mx-auto w-full text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-purple-300">
          <Shield size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Vault Master Lock</h3>
        </div>

        <div className="flex justify-center gap-3">
          {userLockCode.map((digit, idx) => (
            <input
              key={idx}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitInput(idx, e.target.value)}
              className="w-12 h-14 bg-black/60 border border-purple-500/30 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-purple-400 shadow-inner"
              placeholder="•"
            />
          ))}
        </div>

        {codeError && (
          <p className="text-xs text-rose-400 font-medium">{codeError}</p>
        )}

        <button
          onClick={handleSubmitEscape}
          className="liquid-btn w-full py-3 text-xs font-bold uppercase tracking-wider"
        >
          Submit Combination & Escape
        </button>
      </div>

      {/* Inspection Dialog Modal */}
      <AnimatePresence>
        {selectedObj && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel vision-glass p-6 rounded-3xl border border-purple-500/30 max-w-md w-full relative space-y-4"
            >
              <button 
                onClick={() => setSelectedObj(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white"
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

              <p className="text-xs text-gray-300 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">
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
                className="liquid-btn w-full py-2.5 text-xs font-bold uppercase"
              >
                Close Inspection
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold text-white">Abandon Escape Attempt?</h3>
            <p className="text-xs text-gray-400">Leaving will forfeit your current attempt session.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="px-4 py-2 rounded-xl text-xs bg-white/10 text-white font-semibold">Stay in Room</button>
              <button onClick={() => router.push('/weekly-challenges')} className="px-4 py-2 rounded-xl text-xs bg-rose-600 text-white font-semibold">Abandon & Exit</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
