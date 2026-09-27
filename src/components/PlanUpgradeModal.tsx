"use client";

import { useEffect, useCallback } from "react";
import { usePlanGate, RequiredPlan } from "@/context/PlanGateContext";
import { Crown, X, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

const PLAN_CONFIG: Record<RequiredPlan, {
  label: string;
  gradient: string;
  glow: string;
  border: string;
  iconBg: string;
  accessText: string;
}> = {
  plus: {
    label: "Plus",
    gradient: "from-purple-600 to-pink-500",
    glow: "shadow-[0_0_60px_rgba(168,85,247,0.3)]",
    border: "border-purple-500/30",
    iconBg: "bg-purple-500/20",
    accessText: "Available with Plus, Pro, or Premium.",
  },
  pro: {
    label: "Pro",
    gradient: "from-blue-600 to-cyan-500",
    glow: "shadow-[0_0_60px_rgba(59,130,246,0.3)]",
    border: "border-blue-500/30",
    iconBg: "bg-blue-500/20",
    accessText: "Available with Pro or Premium.",
  },
  premium: {
    label: "Premium",
    gradient: "from-amber-500 to-yellow-400",
    glow: "shadow-[0_0_60px_rgba(245,158,11,0.3)]",
    border: "border-amber-500/30",
    iconBg: "bg-amber-500/20",
    accessText: "Available with Premium.",
  },
};

export default function PlanUpgradeModal() {
  const { gate, closePlanGate } = usePlanGate();
  const { isOpen, featureName, requiredPlan, description } = gate;
  const config = PLAN_CONFIG[requiredPlan];

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") closePlanGate();
  }, [closePlanGate]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={closePlanGate}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-[380px] rounded-2xl border ${config.border} bg-[#0d0820]/95 backdrop-blur-xl ${config.glow} animate-[modalIn_0.25s_ease-out]`}
      >
        {/* Close Button */}
        <button
          onClick={closePlanGate}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all z-10"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="px-6 pt-7 pb-6 text-center">
          {/* Lock Icon */}
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full ${config.iconBg} mb-4`}>
            <Lock size={24} className={`bg-gradient-to-r ${config.gradient} bg-clip-text`} style={{ color: requiredPlan === "plus" ? "#a855f7" : requiredPlan === "pro" ? "#3b82f6" : "#f59e0b" }} />
          </div>

          {/* Plan Badge */}
          <div className="mb-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${config.gradient} text-white text-xs font-bold`}>
              <Crown size={12} />
              Paperino {config.label}
            </span>
          </div>

          {/* Feature Name */}
          <h3 className="text-lg font-bold text-white mt-3 mb-1">
            {featureName}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed mb-1">
            {description || `${featureName} is a ${config.label}-tier feature.`}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {config.accessText}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={closePlanGate}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 hover:text-white font-medium transition-all"
            >
              Maybe Later
            </button>
            <Link
              href="/pricing"
              onClick={closePlanGate}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r ${config.gradient} text-white text-sm font-bold hover:opacity-90 transition-all`}
            >
              View Plans
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
