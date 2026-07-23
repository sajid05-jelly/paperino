"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Wrench, Trophy, Sparkles, RefreshCw, Star, AlertTriangle, ArrowRight, Play, Check, Flame } from "lucide-react";
import Logo from "@/components/Logo";

// Motivational tips to display
const MOTIVATIONAL_TIPS = [
  "Great things take time.",
  "Your next Paperino experience is loading.",
  "Building something amazing for SRM students.",
  "Updating database queries for lightning-fast speeds.",
  "Compiling survival notes from top seniors.",
  "Restructuring space-themed assets for you.",
  "Optimizing GPA calculators to keep your grades shining."
];

export default function VisitorMaintenancePage() {
  const [config, setConfig] = useState({
    maintenance: true,
    title: "System Maintenance Mode",
    message: "We are currently performing critical system upgrades. Please check back soon!",
    estimatedReturn: "A few hours",
    showProgress: true,
    game: "bookStack"
  });

  const [activeTipIndex, setActiveTipIndex] = useState(0);

  // Listen to Firestore document `settings/siteConfig`
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "siteConfig"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          maintenance: data.maintenance ?? true,
          title: data.title || "System Maintenance Mode",
          message: data.message || "We are currently performing critical system upgrades.",
          estimatedReturn: data.estimatedReturn || "A few hours",
          showProgress: data.showProgress ?? true,
          game: data.game || "none"
        });
      }
    }, (err) => {
      console.error("[Maintenance] Error loading siteConfig:", err);
    });
    return () => unsub();
  }, []);

  // Rotate motivational tips every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % MOTIVATIONAL_TIPS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 md:p-12 relative text-white bg-[#07050d] overflow-y-auto">
      {/* Background Gradient Blurs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 relative overflow-hidden rounded-full flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(167,139,250,0.4)]">
            <Logo className="w-full h-full object-cover scale-[1.3]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white text-glow">Paperino</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider animate-pulse">
          <Wrench size={12} /> Maintenance Mode
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-12 py-10 z-10">
        
        {/* Left Side: Status / Details */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 max-w-xl">
          <div className="h-14 w-14 bg-purple-600/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 shadow-[0_0_30px_rgba(139,92,246,0.25)]">
            <Wrench size={28} className="animate-spin duration-3000" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 leading-tight tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              {config.title}
            </h1>
            <p className="text-gray-300 text-base md:text-lg leading-relaxed font-light">
              {config.message}
            </p>
          </div>

          {/* Time & Progress Info */}
          <div className="w-full bg-[#110f1d]/60 border border-white/5 p-6 rounded-3xl space-y-4 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Estimated Return</span>
              <span className="text-sm text-purple-300 font-bold bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-lg">
                🚀 {config.estimatedReturn}
              </span>
            </div>

            {config.showProgress && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Upgrade Progress</span>
                  <span className="text-purple-400 font-bold">85% Complete</span>
                </div>
                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-500 animate-[loadingBar_3s_ease-in-out_infinite]" style={{ width: "85%" }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Rotating Motivational Tip */}
          <div className="w-full h-12 flex items-center justify-center lg:justify-start">
            <p className="text-xs italic text-gray-400/80 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <Sparkles size={13} className="text-purple-400 animate-pulse" />
              "{MOTIVATIONAL_TIPS[activeTipIndex]}"
            </p>
          </div>
        </div>

        {/* Right Side: Mini Game Area */}
        {config.game !== "none" && (
          <div className="w-full max-w-[420px] aspect-[4/5] sm:aspect-[4/4.5] flex flex-col justify-between p-6 rounded-[2.5rem] bg-[#110f1c]/90 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
            <div className="absolute -right-24 -bottom-24 w-48 h-48 bg-purple-600/10 rounded-full blur-[60px] pointer-events-none"></div>
            <GameConsole game={config.game} />
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500/80 z-10 pt-6 border-t border-white/5 w-full max-w-6xl mx-auto">
        &copy; {new Date().getFullYear()} Paperino SRM Study Hub. Built with love for SRM students.
      </div>
    </div>
  );
}

/* ── GAME CONSOLE WRAPPER ──────────────────────────────── */

function GameConsole({ game }: { game: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`paperino_game_high_${game}`);
      setHighScore(saved ? parseInt(saved) : 0);
    }
    setIsPlaying(false);
  }, [game]);

  const updateHighScore = (score: number) => {
    if (score > highScore) {
      setHighScore(score);
      if (typeof window !== "undefined") {
        localStorage.setItem(`paperino_game_high_${game}`, score.toString());
      }
    }
  };

  const getGameTitle = () => {
    if (game === "bookStack") return "Book Stack Challenge 📚";
    if (game === "memoryMatch") return "Memory Match 🧠";
    if (game === "quickQuiz") return "Quick Quiz Blitz ⚡";
    if (game === "colorTap") return "Color Tap Challenge 🎯";
    return "Mini Game";
  };

  const getGameInstructions = () => {
    if (game === "bookStack") return "Tap/Click or press Spacebar to drop the sliding book onto the stack. Keep alignment perfect!";
    if (game === "memoryMatch") return "Flip study cards to match pairs under time & move limits!";
    if (game === "quickQuiz") return "Answer as many fun SRM & general questions as possible in 30 seconds!";
    if (game === "colorTap") return "Tap the matching colored circle before the progress timer runs out!";
    return "";
  };

  return (
    <div className="h-full w-full flex flex-col justify-between relative">
      {/* Game Header */}
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            {getGameTitle()}
          </h3>
          <p className="text-[9px] text-gray-400 font-light">Play to pass time!</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded-full font-bold">
          <Trophy size={10} /> High: {highScore}
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 my-4 bg-black/60 border border-white/5 rounded-2xl overflow-hidden relative min-h-[240px] flex items-center justify-center">
        {isPlaying ? (
          <ActiveGameEngine game={game} onGameOver={updateHighScore} />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-purple-500/20 rounded-full border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Play size={24} className="ml-1" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Start microgame</p>
              <p className="text-xs text-gray-500 leading-relaxed mt-1 max-w-[280px]">
                {getGameInstructions()}
              </p>
            </div>
            <button
              onClick={() => setIsPlaying(true)}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 transition-colors font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Start Game
            </button>
          </div>
        )}
      </div>

      {/* Reset button inside instructions */}
      {isPlaying && (
        <button
          onClick={() => setIsPlaying(false)}
          className="text-center text-gray-500 hover:text-gray-300 transition-colors text-xs flex items-center justify-center gap-1 cursor-pointer"
        >
          <RefreshCw size={12} /> Reset Console
        </button>
      )}
    </div>
  );
}

function ActiveGameEngine({ game, onGameOver }: { game: string; onGameOver: (score: number) => void }) {
  if (game === "bookStack") return <BookStackGame onGameOver={onGameOver} />;
  if (game === "memoryMatch") return <MemoryMatchGame onGameOver={onGameOver} />;
  if (game === "quickQuiz") return <QuickQuizGame onGameOver={onGameOver} />;
  if (game === "colorTap") return <ColorTapGame onGameOver={onGameOver} />;
  return null;
}

/* ── 🎮 GAME 1: BOOK STACK CHALLENGE ─────────────────────── */

function BookStackGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  
  // Stacking coordinates (visual scaling)
  const [stack, setStack] = useState<Array<{ id: number; x: number; width: number; color: string }>>([
    { id: 0, x: 75, width: 150, color: "bg-purple-600 border-purple-400" }
  ]);
  
  const [currentBlock, setCurrentBlock] = useState({ x: 0, width: 150, dir: 1, speed: 2 });
  const gameLoopRef = useRef<any>(null);

  // Dropping action
  const handleDrop = useCallback(() => {
    if (isGameOver) return;

    setStack((prevStack) => {
      const topBlock = prevStack[prevStack.length - 1];
      const left = currentBlock.x;
      const right = currentBlock.x + currentBlock.width;
      
      const overlapMin = Math.max(left, topBlock.x);
      const overlapMax = Math.min(right, topBlock.x + topBlock.width);
      const overlapWidth = overlapMax - overlapMin;

      if (overlapWidth <= 0) {
        setIsGameOver(true);
        onGameOver(score);
        return prevStack;
      }

      // Success drop
      const newScore = score + 1;
      setScore(newScore);

      const colors = [
        "bg-purple-600 border-purple-400",
        "bg-violet-600 border-violet-400",
        "bg-fuchsia-600 border-fuchsia-400",
        "bg-indigo-600 border-indigo-400",
        "bg-pink-600 border-pink-400"
      ];
      const randomColor = colors[newScore % colors.length];

      // Spawn next block
      setCurrentBlock({
        x: 0,
        width: overlapWidth,
        dir: 1,
        speed: Math.min(6, 2 + newScore * 0.25)
      });

      return [
        ...prevStack,
        { id: newScore, x: overlapMin, width: overlapWidth, color: randomColor }
      ];
    });
  }, [currentBlock, score, isGameOver, onGameOver]);

  // Handle keys/clicks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        handleDrop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDrop]);

  // Sliding loop
  useEffect(() => {
    if (isGameOver) return;

    const tick = () => {
      setCurrentBlock((prev) => {
        let nextX = prev.x + prev.dir * prev.speed;
        let nextDir = prev.dir;
        
        const limit = 300 - prev.width;
        if (nextX >= limit) {
          nextX = limit;
          nextDir = -1;
        } else if (nextX <= 0) {
          nextX = 0;
          nextDir = 1;
        }

        return { ...prev, x: nextX, dir: nextDir };
      });
      gameLoopRef.current = requestAnimationFrame(tick);
    };

    gameLoopRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [isGameOver]);

  const handleRestart = () => {
    setScore(0);
    setIsGameOver(false);
    setStack([{ id: 0, x: 75, width: 150, color: "bg-purple-600 border-purple-400" }]);
    setCurrentBlock({ x: 0, width: 150, dir: 1, speed: 2 });
  };

  return (
    <div 
      onClick={handleDrop}
      className="w-full h-full flex flex-col justify-between p-3 select-none touch-none bg-gradient-to-b from-[#090812] to-[#121021] cursor-pointer"
    >
      <div className="flex justify-between items-center text-xs text-gray-400 font-bold mb-2">
        <span>Score: <span className="text-purple-400">{score}</span></span>
        <span className="text-[9px] text-gray-500">Tap / Space to drop book</span>
      </div>

      <div className="flex-1 w-full relative bg-black/50 border border-white/5 rounded-xl overflow-hidden min-h-[220px]">
        {isGameOver ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 bg-black/85 z-30">
            <h4 className="text-lg font-black text-rose-500 animate-bounce">Stack collapsed!</h4>
            <p className="text-xs text-gray-400">Total books stacked: {score}</p>
            <button
              onClick={(e) => { e.stopPropagation(); handleRestart(); }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Stack Again
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col justify-end p-2">
            {/* Sliding target block */}
            <div 
              className="absolute top-4 h-6 rounded-md bg-cyan-500 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] flex items-center justify-center text-xs text-black font-extrabold transition-all duration-75"
              style={{ left: `${currentBlock.x}px`, width: `${currentBlock.width}px` }}
            >
              📖
            </div>

            {/* Stack elements */}
            <div className="space-y-1 relative w-full flex flex-col items-start max-h-[160px] overflow-hidden justify-end">
              {stack.slice(-5).map((block) => (
                <div
                  key={block.id}
                  className={`h-5 rounded-md border flex items-center justify-center text-[10px] text-white font-bold shadow-md transition-all duration-300 ${block.color}`}
                  style={{ marginLeft: `${block.x}px`, width: `${block.width}px` }}
                >
                  {block.id === 0 ? "BASE" : `📚 Stack ${block.id}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 🎮 GAME 2: MEMORY MATCH ─────────────────────────────── */

function MemoryMatchGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const ICONS = ["📚", "🪐", "💡", "🎓", "👽", "🧬"];
  
  const [cards, setCards] = useState<Array<{ id: number; icon: string; flipped: boolean; matched: boolean }>>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(45);
  const [isWon, setIsWon] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const initGame = () => {
    const list = [...ICONS, ...ICONS]
      .map((icon, index) => ({ id: index, icon, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    
    setCards(list);
    setFlippedIds([]);
    setMoves(0);
    setTimeRemaining(45);
    setIsWon(false);
    setIsGameOver(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  // Timer loop
  useEffect(() => {
    if (isWon || isGameOver) return;
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsGameOver(true);
          onGameOver(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isWon, isGameOver]);

  const handleCardClick = (index: number) => {
    if (flippedIds.length >= 2 || cards[index].flipped || cards[index].matched || isGameOver) return;

    const updated = [...cards];
    updated[index].flipped = true;
    setCards(updated);

    const nextFlipped = [...flippedIds, index];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = nextFlipped;

      if (cards[first].icon === cards[second].icon) {
        setTimeout(() => {
          setCards(prev => {
            const copy = [...prev];
            copy[first].matched = true;
            copy[second].matched = true;
            
            // Check win condition
            if (copy.every(c => c.matched)) {
              setIsWon(true);
              const score = Math.max(10, timeRemaining * 10 - moves * 2);
              onGameOver(score);
            }
            return copy;
          });
          setFlippedIds([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => {
            const copy = [...prev];
            copy[first].flipped = false;
            copy[second].flipped = false;
            return copy;
          });
          setFlippedIds([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none bg-gradient-to-b from-[#090812] to-[#121021]">
      <div className="flex justify-between items-center text-xs text-gray-400 font-bold mb-2">
        <span>Moves: <span className="text-purple-400">{moves}</span></span>
        <span className={timeRemaining < 10 ? "text-rose-400 font-black animate-pulse" : "text-gray-400"}>
          Time: {timeRemaining}s
        </span>
      </div>

      <div className="flex-1 w-full grid grid-cols-4 gap-2 relative bg-black/40 p-2 rounded-xl border border-white/5 min-h-[200px]">
        {isWon ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 bg-black/85 z-20 rounded-xl">
            <h4 className="text-lg font-black text-emerald-400">Matched!</h4>
            <p className="text-xs text-gray-400">Matched in {moves} moves with {timeRemaining}s left.</p>
            <button onClick={initGame} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all cursor-pointer">Play Again</button>
          </div>
        ) : isGameOver ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 bg-black/85 z-20 rounded-xl">
            <h4 className="text-lg font-black text-rose-400">Time Out!</h4>
            <button onClick={initGame} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all cursor-pointer">Try Again</button>
          </div>
        ) : (
          cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              className={`aspect-square flex items-center justify-center rounded-xl border transition-all duration-300 ${
                card.flipped || card.matched
                  ? "bg-purple-600/20 border-purple-500/50 text-2xl"
                  : "bg-white/5 border-white/10 text-transparent hover:bg-white/10 hover:border-white/20"
              }`}
            >
              {(card.flipped || card.matched) && card.icon}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── 🎮 GAME 3: QUICK QUIZ BLITZ ─────────────────────────── */

const QUIZ_QUESTIONS = [
  { q: "What does SRM stand for?", a: ["Sri Ramasamy Memorial", "Sri Ramanuja Mission", "Srinivasa Ramanujan Memorial", "Sri Rama Mandir"], c: 0 },
  { q: "Which department is known for coding?", a: ["CSE", "ECE", "MECH", "CIVIL"], c: 0 },
  { q: "What is the passing grade limit point at SRM?", a: ["10", "9", "5", "0"], c: 2 },
  { q: "In programming, what represents a true/false value?", a: ["Integer", "String", "Boolean", "Float"], c: 2 },
  { q: "What is the capital city of India?", a: ["Mumbai", "Chennai", "New Delhi", "Kolkata"], c: 2 },
  { q: "Which language is used for web structure?", a: ["Python", "HTML", "C++", "VBA"], c: 1 },
  { q: "What is the hexadecimal representation of 10?", a: ["A", "B", "F", "X"], c: 0 },
  { q: "What does GPU stand for?", a: ["General Power Unit", "Graphics Processing Unit", "Gear Processing Unit", "Gigabit Port Utility"], c: 1 }
];

function QuickQuizGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const [score, setScore] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isGameOver, setIsGameOver] = useState(false);

  // Shuffle and set current question index
  const nextQuestion = () => {
    setCurrentIdx((prev) => (prev + 1) % QUIZ_QUESTIONS.length);
  };

  useEffect(() => {
    setTimeRemaining(30);
    setScore(0);
    setCurrentIdx(Math.floor(Math.random() * QUIZ_QUESTIONS.length));
    setIsGameOver(false);
  }, []);

  // Timer loop
  useEffect(() => {
    if (isGameOver) return;
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsGameOver(true);
          onGameOver(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameOver, score]);

  const handleOptionClick = (optionIdx: number) => {
    if (isGameOver) return;

    if (optionIdx === QUIZ_QUESTIONS[currentIdx].c) {
      setScore(s => s + 10);
    }
    nextQuestion();
  };

  const handleRestart = () => {
    setScore(0);
    setTimeRemaining(30);
    setCurrentIdx(Math.floor(Math.random() * QUIZ_QUESTIONS.length));
    setIsGameOver(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none bg-gradient-to-b from-[#090812] to-[#121021]">
      <div className="flex justify-between items-center text-xs text-gray-400 font-bold mb-2">
        <span>Score: <span className="text-purple-400">{score}</span></span>
        <span className={timeRemaining < 10 ? "text-rose-400 font-black animate-pulse" : "text-gray-400"}>
          Timer: {timeRemaining}s
        </span>
      </div>

      <div className="flex-1 w-full flex flex-col justify-center items-stretch relative bg-black/40 p-4 rounded-xl border border-white/5 min-h-[220px]">
        {isGameOver ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 bg-black/85 z-20 rounded-xl">
            <h4 className="text-lg font-black text-emerald-400">Quiz Finished!</h4>
            <p className="text-xs text-gray-400">You scored {score} points.</p>
            <button onClick={handleRestart} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all cursor-pointer">Restart Blitz</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white text-center leading-relaxed">
              {QUIZ_QUESTIONS[currentIdx].q}
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              {QUIZ_QUESTIONS[currentIdx].a.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(idx)}
                  className="px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-left text-gray-300 hover:bg-purple-600/20 hover:border-purple-500/40 hover:text-white transition-all cursor-pointer truncate"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 🎮 GAME 4: COLOR TAP CHALLENGE ──────────────────────── */

const COLORS = [
  { name: "Purple", hex: "bg-purple-500" },
  { name: "Cyan", hex: "bg-cyan-500" },
  { name: "Emerald", hex: "bg-emerald-500" },
  { name: "Rose", hex: "bg-rose-500" }
];

function ColorTapGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [targetColorIdx, setTargetColorIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1.5); // seconds per tap
  const [isGameOver, setIsGameOver] = useState(false);
  const maxTimeRef = useRef(1.5);

  const gameLoopRef = useRef<any>(null);

  const loadNextColor = () => {
    setTargetColorIdx(Math.floor(Math.random() * COLORS.length));
    maxTimeRef.current = Math.max(0.6, 1.5 - score * 0.05); // Speed up
    setTimeLeft(maxTimeRef.current);
  };

  useEffect(() => {
    setScore(0);
    setCombo(1);
    setIsGameOver(false);
    loadNextColor();
  }, []);

  // Frame tick for progress bar
  useEffect(() => {
    if (isGameOver) return;

    const tick = () => {
      setTimeLeft((prev) => {
        if (prev <= 0.016) {
          setIsGameOver(true);
          onGameOver(score);
          return 0;
        }
        return prev - 0.016;
      });
      gameLoopRef.current = requestAnimationFrame(tick);
    };

    gameLoopRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [isGameOver, score]);

  const handleCircleClick = (colorIdx: number) => {
    if (isGameOver) return;

    if (colorIdx === targetColorIdx) {
      const nextScore = score + 10 * combo;
      setScore(nextScore);
      setCombo(c => Math.min(5, c + 1));
      loadNextColor();
    } else {
      setIsGameOver(true);
      onGameOver(score);
    }
  };

  const handleRestart = () => {
    setScore(0);
    setCombo(1);
    setIsGameOver(false);
    loadNextColor();
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none bg-gradient-to-b from-[#090812] to-[#121021]">
      <div className="flex justify-between items-center text-xs text-gray-400 font-bold mb-2">
        <span>Score: <span className="text-purple-400">{score}</span></span>
        <span className="flex items-center gap-1 text-orange-400 font-bold">
          <Flame size={12} /> x{combo} Combo
        </span>
      </div>

      <div className="flex-1 w-full flex flex-col justify-between items-center relative bg-black/40 p-4 rounded-xl border border-white/5 min-h-[220px]">
        {isGameOver ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 bg-black/85 z-20 rounded-xl">
            <h4 className="text-lg font-black text-rose-500">Tap Failed!</h4>
            <p className="text-xs text-gray-400">Final score: {score}</p>
            <button onClick={handleRestart} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all cursor-pointer">Play Again</button>
          </div>
        ) : (
          <>
            {/* Target Display */}
            <div className="text-center py-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Tap this color</span>
              <p className="text-lg font-bold text-white mt-1 animate-pulse">
                {COLORS[targetColorIdx].name}
              </p>
            </div>

            {/* Time progress bar */}
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all"
                style={{ width: `${(timeLeft / maxTimeRef.current) * 100}%` }}
              ></div>
            </div>

            {/* Color circles */}
            <div className="grid grid-cols-2 gap-4 w-full pt-4">
              {COLORS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCircleClick(idx)}
                  className={`w-full h-10 rounded-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${color.hex} border border-white/10 shadow-lg`}
                ></button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
