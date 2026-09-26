"use client";

import { useAuth } from "@/context/AuthContext";
import { Sparkles, Zap, Lock } from "lucide-react";
import Link from "next/link";
import { getMonthlyLimit, getCurrentMonthKey } from "@/lib/subscription";

interface AICreditsDisplayProps {
  tool: "pyq" | "ats";
}

export default function AICreditsDisplay({ tool }: AICreditsDisplayProps) {
  const { user, isAdmin, plan, userCredits } = useAuth();

  if (!user) return null;

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 backdrop-blur-xl border border-violet-500/25 text-violet-300 font-bold text-xs shadow-[0_0_20px_rgba(139,92,246,0.15)] w-fit mx-auto mt-4">
        <Zap size={14} className="text-violet-400 drop-shadow-[0_0_4px_rgba(139,92,246,0.6)]" />
        Admin: Unlimited AI Credits
      </div>
    );
  }

  const featureKey = tool === "pyq" ? "pyqAnalyzer" : "ats";
  const limit = getMonthlyLimit(plan, featureKey);

  // Unlimited plans (Pro/Premium)
  if (limit === Infinity) {
    return (
      <div className="flex flex-col items-center mt-4 space-y-1">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/15 to-amber-500/15 backdrop-blur-xl border border-yellow-500/25 text-yellow-300 font-bold text-xs shadow-[0_0_20px_rgba(234,179,8,0.15)] w-fit mx-auto">
          <Zap size={14} className="text-yellow-400 animate-pulse drop-shadow-[0_0_4px_rgba(234,179,8,0.6)]" />
          {plan.toUpperCase()}: Unlimited Monthly Credits
        </div>
      </div>
    );
  }

  // Feature disabled for plan (e.g. PYQ on Free)
  if (limit <= 0) {
    return (
      <div className="flex flex-col items-center mt-4 space-y-2">
        <Link
          href="/pricing"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all group"
        >
          <Lock size={13} className="text-purple-400 group-hover:scale-110 transition-transform" />
          <span>Locked on Free — Upgrade to Plus to Unlock (4/mo)</span>
        </Link>
      </div>
    );
  }

  let used = 0;
  if (userCredits) {
    const currentMonth = getCurrentMonthKey();
    if (userCredits.lastResetDate === currentMonth) {
      used = tool === "pyq" ? (userCredits.pyqUsed || 0) : (userCredits.atsUsed || 0);
    }
  }

  const remaining = Math.max(0, limit - used);
  const isOutOfCredits = remaining === 0;

  return (
    <div className="flex flex-col items-center mt-4 space-y-2">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border text-xs font-bold transition-all ${
          isOutOfCredits
            ? "bg-red-500/10 border-red-500/25 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
            : "bg-cyan-500/10 border-cyan-500/25 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
        }`}
      >
        <Sparkles size={14} className={isOutOfCredits ? "text-red-400" : "text-cyan-400"} />
        <span>
          {remaining} of {limit} monthly uses remaining ({plan.toUpperCase()})
        </span>
      </div>

      {isOutOfCredits && (
        <Link
          href="/pricing"
          className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium"
        >
          Need more uses? Upgrade to Pro or Premium
        </Link>
      )}
    </div>
  );
}
