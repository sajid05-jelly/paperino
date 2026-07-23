"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Wrench, Trophy, Sparkles, RefreshCw, Star, AlertTriangle, ArrowRight, Play } from "lucide-react";
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
    game: "paperCatch"
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
    <div className="min-h-screen w-full flex flex-col items-center justify-between p-6 md:p-12 relative text-white bg-[#07050d] overflow-y-auto">
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
      <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-12 py-10 z-10">
        
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
    if (game === "paperCatch") return "Paper Catch";
    if (game === "memoryFlip") return "Memory Flip";
    if (game === "paperPlane") return "Paper Plane";
    return "Mini Game";
  };

  const getGameInstructions = () => {
    if (game === "paperCatch") return "Use Mouse, Keyboard Left/Right, or Swipe to catch books & stars. Avoid rocks!";
    if (game === "memoryFlip") return "Click cards to flip them. Match pairs in the fewest moves possible!";
    if (game === "paperPlane") return "Click or press Spacebar to fly the paper plane through obstacle gaps!";
    return "";
  };

  return (
    <div className="h-full w-full flex flex-col justify-between relative">
      {/* Game Header */}
      <div className="flex justify-between items-center pb-4 border-b border-white/5">
        <div>
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {getGameTitle()}
          </h3>
          <p className="text-[10px] text-gray-400 font-light">Bunk study and pass time!</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full font-bold">
          <Trophy size={12} /> High: {highScore}
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 my-4 bg-black/60 border border-white/5 rounded-2xl overflow-hidden relative min-h-[220px] flex items-center justify-center">
        {isPlaying ? (
          <ActiveGameEngine game={game} onGameOver={updateHighScore} />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-purple-500/20 rounded-full border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Play size={24} className="ml-1" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Press Play to Start</p>
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

/* ── GAME ENGINE RENDERING ──────────────────────────────── */

function ActiveGameEngine({ game, onGameOver }: { game: string; onGameOver: (score: number) => void }) {
  if (game === "paperCatch") return <PaperCatchGame onGameOver={onGameOver} />;
  if (game === "memoryFlip") return <MemoryFlipGame onGameOver={onGameOver} />;
  if (game === "paperPlane") return <PaperPlaneGame onGameOver={onGameOver} />;
  return null;
}

/* ── 🎮 GAME 1: PAPER CATCH ──────────────────────────────── */

function PaperCatchGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [basketX, setBasketX] = useState(150); // Basket horizontal position (0 to 300)

  const [items, setItems] = useState<Array<{ id: number; x: number; y: number; type: "good" | "bad"; label: string }>>([]);

  const gameLoopRef = useRef<any>(null);
  const itemIdCounter = useRef(0);

  // Mouse / Touch movement inside container
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || isGameOver) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    setBasketX(Math.max(0, Math.min(270, relativeX - 30)));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || isGameOver) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const relativeX = touch.clientX - rect.left;
    setBasketX(Math.max(0, Math.min(270, relativeX - 30)));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (e.key === "ArrowLeft") {
        setBasketX(prev => Math.max(0, prev - 25));
      } else if (e.key === "ArrowRight") {
        setBasketX(prev => Math.min(270, prev + 25));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameOver]);

  // Main game tick (updates falling items)
  useEffect(() => {
    if (isGameOver) return;

    const gameTick = () => {
      setItems((prevItems) => {
        // 1. Move items down
        const updated = prevItems
          .map(item => ({ ...item, y: item.y + 4 }))
          .filter(item => {
            // Check if reached basket (Y = 230ish)
            if (item.y >= 210 && item.y <= 235) {
              const itemCenterX = item.x + 10;
              const basketCenterX = basketX + 30;
              
              if (Math.abs(itemCenterX - basketCenterX) < 40) {
                // Collided!
                if (item.type === "good") {
                  setScore(s => s + 1);
                } else {
                  setLives(l => {
                    const nextLives = l - 1;
                    if (nextLives <= 0) {
                      setIsGameOver(true);
                      onGameOver(score);
                    }
                    return nextLives;
                  });
                }
                return false; // Remove item
              }
            }

            // Missed basket and hit bottom
            if (item.y > 250) {
              if (item.type === "good") {
                setLives(l => {
                  const nextLives = l - 1;
                  if (nextLives <= 0) {
                    setIsGameOver(true);
                    onGameOver(score);
                  }
                  return nextLives;
                });
              }
              return false;
            }
            return true;
          });

        // 2. Randomly spawn new items (about 2% chance per frame)
        if (Math.random() < 0.025 && updated.length < 5) {
          const type = Math.random() < 0.25 ? "bad" : "good";
          const labels = type === "good" ? ["📚", "📝", "⭐️", "🎓"] : ["💣", "🪨"];
          const label = labels[Math.floor(Math.random() * labels.length)];
          itemIdCounter.current += 1;
          updated.push({
            id: itemIdCounter.current,
            x: Math.random() * 260 + 10,
            y: 0,
            type,
            label
          });
        }

        return updated;
      });

      gameLoopRef.current = requestAnimationFrame(gameTick);
    };

    gameLoopRef.current = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [isGameOver, basketX, score, onGameOver]);

  const handleRestart = () => {
    setScore(0);
    setLives(3);
    setIsGameOver(false);
    setItems([]);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className="w-full h-full flex flex-col justify-between select-none touch-none relative p-3 bg-gradient-to-b from-[#090812] to-[#121021]"
    >
      {/* Top dashboard */}
      <div className="flex justify-between items-center text-xs text-gray-400 font-bold z-20">
        <span>Score: <span className="text-purple-400">{score}</span></span>
        <span className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`text-sm ${i < lives ? "opacity-100" : "opacity-20"}`}>❤️</span>
          ))}
        </span>
      </div>

      {/* Screen Area */}
      <div className="flex-1 w-full relative mt-2 mb-2 overflow-hidden border border-white/5 rounded-xl bg-black/40">
        {isGameOver ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 z-30 bg-black/80">
            <h4 className="text-lg font-black text-rose-500">Game Over</h4>
            <p className="text-xs text-gray-400">You caught {score} materials!</p>
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Play Again
            </button>
          </div>
        ) : (
          <>
            {/* Falling items */}
            {items.map((item) => (
              <div
                key={item.id}
                className="absolute text-xl leading-none animate-in fade-in duration-100"
                style={{ left: item.x, top: item.y }}
              >
                {item.label}
              </div>
            ))}

            {/* Basket */}
            <div
              className="absolute bottom-1 w-[60px] h-4 bg-purple-600 rounded-full border border-purple-400 flex items-center justify-center shadow-lg"
              style={{ left: basketX }}
            >
              <div className="w-10 h-1 bg-white/50 rounded-full"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── 🎮 GAME 2: MEMORY FLIP ──────────────────────────────── */

function MemoryFlipGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const ICONS = ["🚀", "🪐", "📚", "🔮", "👽", "🧬"];
  
  const [cards, setCards] = useState<Array<{ id: number; icon: string; flipped: boolean; matched: boolean }>>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isWon, setIsWon] = useState(false);

  const initGame = () => {
    // Duplicate icons to create pairs
    const list = [...ICONS, ...ICONS]
      .map((icon, index) => ({
        id: index,
        icon,
        flipped: false,
        matched: false
      }))
      // Shuffle list
      .sort(() => Math.random() - 0.5);
    
    setCards(list);
    setFlippedIds([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsWon(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleCardClick = (id: number) => {
    if (flippedIds.length >= 2 || cards[id].flipped || cards[id].matched) return;

    // Flip card
    const updatedCards = [...cards];
    updatedCards[id].flipped = true;
    setCards(updatedCards);

    const nextFlipped = [...flippedIds, id];
    setFlippedIds(nextFlipped);

    // If two cards flipped, check match
    if (nextFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = nextFlipped;
      
      if (cards[firstId].icon === cards[secondId].icon) {
        // Matched!
        setTimeout(() => {
          setCards(prev => {
            const copy = [...prev];
            copy[firstId].matched = true;
            copy[secondId].matched = true;
            return copy;
          });
          setMatchedPairs(p => {
            const nextPairs = p + 1;
            if (nextPairs === ICONS.length) {
              setIsWon(true);
              // Score is inversely proportional to moves, e.g. Max score 100
              const finalScore = Math.max(10, 100 - (moves * 3));
              onGameOver(finalScore);
            }
            return nextPairs;
          });
          setFlippedIds([]);
        }, 600);
      } else {
        // Not a match - flip back
        setTimeout(() => {
          setCards(prev => {
            const copy = [...prev];
            copy[firstId].flipped = false;
            copy[secondId].flipped = false;
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
        <span>Matched: <span className="text-emerald-400">{matchedPairs}/{ICONS.length}</span></span>
      </div>

      <div className="flex-1 w-full grid grid-cols-4 gap-2 relative bg-black/40 p-2 rounded-xl border border-white/5 min-h-[200px]">
        {isWon ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 bg-black/85 z-20 rounded-xl">
            <h4 className="text-lg font-black text-emerald-400">✨ You Won! ✨</h4>
            <p className="text-xs text-gray-400">Matched all cards in {moves} moves.</p>
            <button
              onClick={initGame}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Play Again
            </button>
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

/* ── 🎮 GAME 3: PAPER PLANE ──────────────────────────────── */

function PaperPlaneGame({ onGameOver }: { onGameOver: (score: number) => void }) {
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [planeY, setPlaneY] = useState(100);
  const [velocity, setVelocity] = useState(0);

  // Obstacle coordinates
  const [obstacle, setObstacle] = useState({ x: 300, gapTop: 60, gapBottom: 150, width: 30 });

  const gameLoopRef = useRef<any>(null);
  const scoreIntervalRef = useRef<any>(null);

  // Spacebar or Click flap
  const handleFlap = () => {
    if (isGameOver) return;
    setVelocity(-4.5); // Lift the plane up
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameOver]);

  // Main game ticks
  useEffect(() => {
    if (isGameOver) return;

    const gameTick = () => {
      // 1. Gravity update
      setPlaneY((y) => {
        const nextY = y + velocity;
        // Collision with roof or floor
        if (nextY <= 0 || nextY >= 210) {
          setIsGameOver(true);
          onGameOver(score);
        }
        return nextY;
      });
      setVelocity((v) => v + 0.25); // Gravity acceleration

      // 2. Move obstacles left
      setObstacle((prev) => {
        const nextX = prev.x - 3;
        
        // Re-spawn obstacle on reaching left side
        if (nextX < -prev.width) {
          const gapSize = 80;
          const gapTop = Math.random() * 80 + 30; // Random height between 30 and 110
          return {
            x: 300,
            gapTop,
            gapBottom: gapTop + gapSize,
            width: 30
          };
        }

        // Collision Check: plane is at X = 50, Y = planeY (height ~ 15px)
        const planeX = 50;
        const planeHeight = 15;
        const planeWidth = 20;

        if (planeX + planeWidth > nextX && planeX < nextX + prev.width) {
          // Horizontal intersection exists. Check vertical gap bounds
          if (planeY < prev.gapTop || planeY + planeHeight > prev.gapBottom) {
            setIsGameOver(true);
            onGameOver(score);
          }
        }

        return { ...prev, x: nextX };
      });

      gameLoopRef.current = requestAnimationFrame(gameTick);
    };

    gameLoopRef.current = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [isGameOver, velocity, planeY, score, onGameOver]);

  // Score counter (increases with time survived)
  useEffect(() => {
    if (isGameOver) return;

    scoreIntervalRef.current = setInterval(() => {
      setScore(s => s + 1);
    }, 200);

    return () => clearInterval(scoreIntervalRef.current);
  }, [isGameOver]);

  const handleRestart = () => {
    setScore(0);
    setIsGameOver(false);
    setPlaneY(100);
    setVelocity(0);
    setObstacle({ x: 300, gapTop: 60, gapBottom: 140, width: 30 });
  };

  return (
    <div 
      onClick={handleFlap}
      className="w-full h-full flex flex-col justify-between select-none touch-none p-3 bg-gradient-to-b from-[#090812] to-[#121021] relative cursor-pointer"
    >
      {/* Top dashboard */}
      <div className="flex justify-between items-center text-xs text-gray-400 font-bold z-20">
        <span>Score: <span className="text-cyan-400">{score}</span></span>
        <span className="text-[10px] text-gray-500">Tap / Spacebar to Fly</span>
      </div>

      {/* Screen Area */}
      <div className="flex-1 w-full relative mt-2 border border-white/5 rounded-xl bg-black/40 overflow-hidden min-h-[220px]">
        {isGameOver ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 bg-black/85 z-30">
            <h4 className="text-lg font-black text-rose-500">Plane Crashed</h4>
            <p className="text-xs text-gray-400">Score: {score}</p>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Avoid triggering flap on play again click
                handleRestart();
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Play Again
            </button>
          </div>
        ) : (
          <>
            {/* Paper Plane */}
            <div
              className="absolute left-[50px] text-lg leading-none transform rotate-[-5deg]"
              style={{ top: planeY }}
            >
              ✈️
            </div>

            {/* Obstacles */}
            {/* Top obstacle block */}
            <div
              className="absolute bg-gradient-to-b from-purple-900 to-purple-700/60 border-l border-r border-purple-500/20 w-[30px] top-0"
              style={{ left: obstacle.x, height: obstacle.gapTop }}
            ></div>

            {/* Bottom obstacle block */}
            <div
              className="absolute bg-gradient-to-t from-purple-900 to-purple-700/60 border-l border-r border-purple-500/20 w-[30px] bottom-0"
              style={{ left: obstacle.x, top: obstacle.gapBottom }}
            ></div>
          </>
        )}
      </div>
    </div>
  );
}
