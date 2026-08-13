"use client";

import { useState } from "react";
import { ArrowLeft, HelpCircle, X, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ChallengeGameShellProps {
  gameId: string;
  gameName: string;
  gameIcon: React.ReactNode;
  attemptText: string;
  timerNode: React.ReactNode;
  rulesContent: React.ReactNode;
  children: React.ReactNode;
  showRulesFirst?: boolean;
  onStartGame?: () => void;
  gameState: string;
}

export default function ChallengeGameShell({
  gameName,
  gameIcon,
  attemptText,
  timerNode,
  rulesContent,
  children,
  showRulesFirst = false,
  onStartGame,
  gameState,
}: ChallengeGameShellProps) {
  const router = useRouter();
  const [showRulesModal, setShowRulesModal] = useState(showRulesFirst && gameState === "playing");
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const isGameActive = ["playing", "memorizing", "recalling", "round_feedback"].includes(gameState);

  const handleStartGameClick = () => {
    setShowRulesModal(false);
    onStartGame?.();
  };

  const handleExitClick = () => {
    if (isGameActive) {
      setShowExitConfirm(true);
    } else {
      router.push("/weekly-challenges");
    }
  };

  return (
    <div className="min-h-screen w-full py-6 px-4 md:px-8 text-gray-200 bg-[var(--background)] flex flex-col justify-start items-center">
      
      {/* 1. Shell Game Header Container */}
      {isGameActive && (
        <div className="w-full max-w-6xl glass-panel p-4 md:px-6 rounded-2xl border border-purple-500/20 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in duration-300">
          {/* Header Row Left & Right for Mobile, unified horizontal row for Desktop */}
          <div className="w-full sm:w-auto flex justify-between sm:justify-start items-center gap-6">
            <button
              onClick={handleExitClick}
              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> <span>Leave</span>
            </button>
            <div className="flex items-center gap-2.5 sm:hidden">
              {timerNode}
            </div>
          </div>

          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
              {gameIcon}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">{gameName}</h2>
              <p className="text-xs text-purple-300 font-semibold">{attemptText}</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            {timerNode}
            <button
              onClick={() => setShowRulesModal(true)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 text-xs font-bold border border-white/5 cursor-pointer"
              title="View Rules"
            >
              <HelpCircle size={15} />
              <span>Rules</span>
            </button>
          </div>

          {/* Mobile Rules button */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="sm:hidden w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 text-xs font-bold border border-white/5 cursor-pointer"
          >
            <HelpCircle size={15} />
            <span>Rules</span>
          </button>
        </div>
      )}

      {/* 2. Interactive Game Content Container */}
      <div className="w-full max-w-6xl flex-1 flex flex-col justify-start items-center">
        {children}
      </div>

      {/* 3. Re-openable Rules / Instructions Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl glass-panel vision-glass p-8 rounded-3xl border border-purple-500/30 shadow-[0_0_50px_rgba(139,92,246,0.3)] relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute -right-16 -top-16 w-40 h-40 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                  {gameIcon}
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">{gameName} Rules</h3>
              </div>
              {/* Only show close X button if game is active, force start on start screen */}
              {!showRulesFirst && (
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-sm text-gray-300 leading-relaxed">
              {rulesContent}
            </div>

            <div className="mt-8">
              {showRulesFirst ? (
                <button
                  onClick={handleStartGameClick}
                  className="liquid-btn w-full py-4 font-bold text-sm uppercase tracking-wider cursor-pointer"
                >
                  Start Game
                </button>
              ) : (
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] cursor-pointer"
                >
                  Resume Game
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Exit Abandon Session Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="glass-panel p-6 rounded-3xl border border-red-500/20 max-w-sm w-full text-center space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Abandon {gameName}?</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Leaving now will forfeit your current weekly challenge attempt.</p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-white font-semibold border border-white/5 cursor-pointer"
              >
                Continue Game
              </button>
              <button
                onClick={() => router.push('/weekly-challenges')}
                className="flex-1 py-2.5 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
              >
                Abandon & Exit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
