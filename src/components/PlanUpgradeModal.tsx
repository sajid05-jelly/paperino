"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Lock, ArrowRight, X, ShieldAlert } from "lucide-react";
import { PlanType } from "@/lib/subscription";

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredPlan?: PlanType;
  description?: string;
}

export default function PlanUpgradeModal({
  isOpen,
  onClose,
  featureName,
  requiredPlan = "plus",
  description,
}: PlanUpgradeModalProps) {
  if (!isOpen) return null;

  const planLabel =
    requiredPlan === "premium"
      ? "Paperino Premium"
      : requiredPlan === "pro"
      ? "Paperino Pro"
      : "Paperino Plus";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0d0a1a] border border-purple-500/25 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(168,85,247,0.2)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center mx-auto mb-5 text-purple-400">
          <Lock size={26} className="text-purple-400" />
        </div>

        <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 mb-3 inline-block">
          Requires {planLabel}
        </span>

        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
          Unlock {featureName}
        </h3>

        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          {description ||
            `This feature is available on ${planLabel} and above. Upgrade your plan to get access and unlock higher limits.`}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/pricing"
            onClick={onClose}
            className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles size={16} /> View Plans & Upgrade
          </Link>
          <button
            onClick={onClose}
            className="py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-sm font-medium transition-all"
          >
            Maybe Later
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-white/5 text-[11px] text-gray-500">
          🎁 Contributors who share 10+ approved materials get Plus for FREE!
        </div>
      </div>
    </div>
  );
}
