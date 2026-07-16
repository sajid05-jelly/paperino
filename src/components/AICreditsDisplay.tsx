"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Zap } from "lucide-react";

interface AICreditsDisplayProps {
  tool: "pyq" | "ats";
}

export default function AICreditsDisplay({ tool }: AICreditsDisplayProps) {
  const { user, isContributor, isAdmin, isPremiumActive } = useAuth();
  const [used, setUsed] = useState(0);

  // Premium / Admins get 1000 credits/day, contributors get 9, students get 3
  const limit = isAdmin || isPremiumActive ? 1000 : isContributor ? 9 : 3;

  useEffect(() => {
    if (!user) return;

    const creditsRef = doc(db, "user_credits", user.uid);
    const unsubscribe = onSnapshot(
      creditsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const date = new Date();
          const istOffset = 5.5 * 60 * 60 * 1000;
          const istDate = new Date(date.getTime() + istOffset);
          const todayIST = istDate.toISOString().split("T")[0];

          if (data.lastResetDate === todayIST) {
            setUsed(tool === "pyq" ? (data.pyqUsed || 0) : (data.atsUsed || 0));
          } else {
            setUsed(0);
          }
        } else {
          setUsed(0);
        }
      },
      (error) => {
        console.warn("[AICreditsDisplay] Firestore snapshot error:", error);
      }
    );

    return () => unsubscribe();
  }, [user, tool]);

  if (!user) return null;

  const remaining = Math.max(0, limit - used);
  const isOutOfCredits = remaining === 0;

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 backdrop-blur-xl border border-violet-500/25 text-violet-300 font-bold text-xs shadow-[0_0_20px_rgba(139,92,246,0.15)] w-fit mx-auto mt-4">
        <Zap size={14} className="text-violet-400 drop-shadow-[0_0_4px_rgba(139,92,246,0.6)]" />
        Admin: Unlimited AI Credits
      </div>
    );
  }

  if (isPremiumActive) {
    return (
      <div className="flex flex-col items-center mt-4 space-y-1">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/15 to-amber-500/15 backdrop-blur-xl border border-yellow-500/25 text-yellow-300 font-bold text-xs shadow-[0_0_20px_rgba(234,179,8,0.15)] w-fit mx-auto">
          <Zap size={14} className="text-yellow-400 animate-pulse drop-shadow-[0_0_4px_rgba(234,179,8,0.6)]" />
          AI Credits Available — {remaining} remaining
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-4 space-y-2">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border text-xs font-bold transition-all ${
        isOutOfCredits 
          ? "bg-red-500/10 border-red-500/25 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]" 
          : "bg-violet-500/10 border-violet-500/25 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
      }`}>
        <Zap size={14} className={isOutOfCredits ? "text-red-400" : "text-violet-400 drop-shadow-[0_0_4px_rgba(139,92,246,0.6)]"} />
        AI Credits Available — {remaining}/{limit}
      </div>
      
      {isOutOfCredits && (
        <p className="text-xs text-red-400/80 font-medium">
          You have used all your AI credits for today. Credits will reset at midnight (IST).
        </p>
      )}
    </div>
  );
}
