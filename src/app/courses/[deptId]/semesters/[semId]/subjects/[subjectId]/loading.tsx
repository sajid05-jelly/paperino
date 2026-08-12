"use client";

import { Loader2 } from "lucide-react";

export default function SubjectLoading() {
  return (
    <div className="min-h-screen bg-[#050308] text-white">
      {/* Top bar skeleton */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-5 w-48 rounded bg-white/5 animate-pulse" />
      </div>

      {/* Subject title skeleton */}
      <div className="px-6 pb-4 space-y-3">
        <div className="h-8 w-72 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-4 w-56 rounded bg-white/5 animate-pulse" />
      </div>

      {/* Tab bar skeleton */}
      <div className="px-6 pb-6 flex gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 w-28 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>

      {/* Content area */}
      <div className="flex flex-col items-center justify-center pt-16 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)]">
          <Loader2 size={28} className="text-purple-400 animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium animate-pulse">Loading study materials...</p>
      </div>

      {/* Material card skeletons */}
      <div className="px-6 pt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
