"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Infinity as InfinityIcon } from "lucide-react";

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
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold text-xs shadow-sm w-fit mx-auto mt-4">
        <Sparkles size={14} className="text-violet-400" />
        Admin: Unlimited Credits
      </div>
    );
  }

  if (isPremiumActive) {
    return (
      <div className="flex flex-col items-center mt-4 space-y-1">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-yellow-300 font-bold text-xs shadow-sm w-fit mx-auto">
          <Sparkles size={14} className="text-yellow-400 animate-pulse" />
          Premium Unlimited ({remaining} left)
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-4 space-y-2">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shadow-sm transition-colors ${
        isOutOfCredits 
          ? "bg-red-500/10 border-red-500/20 text-red-400" 
          : "bg-violet-500/10 border-violet-500/20 text-violet-300"
      }`}>
        <Sparkles size={14} className={isOutOfCredits ? "text-red-400" : "text-violet-400"} />
        Credits Remaining: {remaining}/{limit}
      </div>
      
      {isOutOfCredits && (
        <p className="text-xs text-red-400/80 font-medium">
          You have used all your AI credits for today. Credits will reset at midnight (IST).
        </p>
      )}
    </div>
  );
}
