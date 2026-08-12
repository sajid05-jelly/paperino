"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GameTimer from "@/components/challenges/GameTimer";
import GameResult from "@/components/challenges/GameResult";
import {
  Image as ImageIcon,
  Clock,
  BookOpen,
  Lock,
  Sparkles,
  Flower2,
  Monitor,
  Sun,
  Square,
  Lightbulb,
  Unlock,
  Key,
  Search,
  ArrowRight
} from "lucide-react";

type GameState = "intro" | "playing" | "result";

interface RoomElement {
  id: string;
  type: string;
  description: string;
  hasClue: boolean;
  clueData?: {
    hint: string;
    digitPosition: number;
    digitValue: number;
  };
}

export default function ImpossibleRoomPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>("intro");
  
  // Game session data
  const [sessionId, setSessionId] = useState<string>("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Room data
  const [roomElements, setRoomElements] = useState<RoomElement[]>([]);
  const [totalClues, setTotalClues] = useState(0);
  const [inspectedIds, setInspectedIds] = useState<Set<string>>(new Set());
  const [cluesFoundIds, setCluesFoundIds] = useState<Set<string>>(new Set());
  
  // Lock code
  const [lockCode, setLockCode] = useState(["", "", "", ""]);
  
  // Result data
  const [resultData, setResultData] = useState<any>(null);

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
        body: JSON.stringify({ gameId: "impossible-room" })
      });
      
      if (!res.ok) throw new Error("Failed to start game");
      
      const data = await res.json();
      setSessionId(data.sessionId);
      setIsOfficial(data.isOfficial);
      setRoomElements(data.puzzleData.roomElements);
      setTotalClues(data.puzzleData.totalClues);
      
      setStartTime(Date.now());
      setGameState("playing");
    } catch (err) {
      console.error(err);
      alert("Error starting game.");
    }
  };

  const handleInspect = (element: RoomElement) => {
    if (inspectedIds.has(element.id)) return;
    
    setInspectedIds((prev) => {
      const next = new Set(prev);
      next.add(element.id);
      return next;
    });
    
    if (element.hasClue) {
      setCluesFoundIds((prev) => {
        const next = new Set(prev);
        next.add(element.id);
        return next;
      });
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    
    setLockCode(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const submitGame = async () => {
    const code = lockCode.join("");
    if (code.length < 4) {
      alert("Please enter a 4-digit code");
      return;
    }
    
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
          gameData: {
            cluesFound: Array.from(cluesFoundIds),
            lockCode: code
          }
        })
      });
      
      if (!res.ok) throw new Error("Submission failed");
      const data = await res.json();
      setResultData(data);
    } catch (err) {
      console.error(err);
      alert("Submission error. Showing practice result.");
      setResultData({
        score: 0,
        durationMs: Date.now() - (startTime || Date.now()),
        rank: null,
        isOfficial: false,
        gameId: "impossible-room"
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'painting': return <ImageIcon className="w-8 h-8" />;
      case 'clock': return <Clock className="w-8 h-8" />;
      case 'bookshelf': return <BookOpen className="w-8 h-8" />;
      case 'safe': return <Lock className="w-8 h-8" />;
      case 'mirror': return <Sparkles className="w-8 h-8" />;
      case 'plant': return <Flower2 className="w-8 h-8" />;
      case 'desk': return <Monitor className="w-8 h-8" />;
      case 'window': return <Sun className="w-8 h-8" />;
      case 'rug': return <Square className="w-8 h-8" />;
      case 'lamp': return <Lightbulb className="w-8 h-8" />;
      default: return <Search className="w-8 h-8" />;
    }
  };

  if (gameState === "intro") {
    return (
      <div className="min-h-screen bg-[#050308] text-white p-6 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full glass-panel vision-glass p-8 rounded-3xl border border-purple-500/20 text-center">
          <Key className="w-16 h-16 text-purple-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-purple-400">
            The Impossible Room
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            You are trapped in a mysterious room. To escape, you must examine the items around you. 
            Find the hidden clues that reveal the 4-digit code to the electronic lock. 
            Beware: not everything you see is helpful, and time is ticking!
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
          gameId="impossible-room"
          gameName="The Impossible Room"
          onViewLeaderboard={() => {}}
          onPlayAgain={() => {
            setGameState("intro");
            setInspectedIds(new Set());
            setCluesFoundIds(new Set());
            setLockCode(["", "", "", ""]);
            setResultData(null);
          }}
          onBackToHub={() => router.push("/weekly-challenges")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050308] text-white p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel vision-glass p-4 rounded-2xl border border-purple-500/20">
          <div>
            <h2 className="text-xl font-bold">The Impossible Room</h2>
            <p className="text-sm text-purple-300">
              Clues Found: <span className="font-bold">{cluesFoundIds.size}</span> / {totalClues}
            </p>
          </div>
          <GameTimer isRunning={gameState === "playing"} startTime={startTime} />
        </div>

        {/* Room Elements Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {roomElements.map(el => {
            const isInspected = inspectedIds.has(el.id);
            const isClue = isInspected && el.hasClue;

            return (
              <button
                key={el.id}
                onClick={() => handleInspect(el)}
                className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${
                  isClue 
                    ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
                    : isInspected 
                      ? "bg-white/5 border-white/10 opacity-70"
                      : "bg-purple-950/20 border-purple-500/20 hover:bg-purple-900/30 hover:border-purple-500/40"
                }`}
              >
                <div className={`mb-3 ${isClue ? "text-amber-400" : isInspected ? "text-gray-500" : "text-purple-300"}`}>
                  {getIcon(el.type)}
                </div>
                <h3 className="font-bold mb-1 capitalize">{el.type}</h3>
                <p className="text-xs text-gray-400 mb-3">{el.description}</p>
                
                {isInspected && (
                  <div className={`mt-auto text-sm p-2 rounded-lg w-full ${isClue ? "bg-amber-500/20 text-amber-200" : "bg-black/40 text-gray-400"}`}>
                    {isClue && el.clueData ? (
                      <div>
                        <span className="font-bold block mb-1">Clue found!</span>
                        <span className="italic">"{el.clueData.hint}"</span>
                      </div>
                    ) : (
                      "Nothing of interest here."
                    )}
                  </div>
                )}
                {!isInspected && (
                  <div className="mt-auto text-xs text-purple-400/50 uppercase tracking-widest flex items-center gap-1">
                    <Search className="w-3 h-3" /> Inspect
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Code Input */}
        <div className="glass-panel vision-glass p-6 rounded-3xl border border-purple-500/20 flex flex-col items-center mt-8">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Unlock className="w-5 h-5 text-purple-400" /> Enter 4-Digit Exit Code
          </h3>
          <div className="flex gap-4 mb-6">
            {lockCode.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                value={digit}
                onChange={(e) => handleCodeChange(idx, e.target.value)}
                className="w-16 h-20 bg-black/40 border border-purple-500/30 rounded-xl text-center text-3xl font-mono text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
                placeholder="-"
              />
            ))}
          </div>
          <button
            onClick={submitGame}
            disabled={lockCode.join("").length < 4}
            className="liquid-btn px-8 py-3 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Unlock Door
          </button>
        </div>
      </div>
    </div>
  );
}
