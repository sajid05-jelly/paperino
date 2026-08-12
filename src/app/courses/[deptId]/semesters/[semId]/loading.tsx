"use client";

import { Loader2 } from "lucide-react";

export default function SemesterLoading() {
  return (
    <div className="min-h-screen bg-[#050308] text-white">
      {/* Title skeleton */}
      <div className="px-6 pt-8 pb-2 space-y-3">
        <div className="h-9 w-80 rounded-lg bg-white/5 animate-pulse" />
        <div className="h-5 w-32 rounded bg-purple-500/10 animate-pulse" />
        <div className="h-4 w-64 rounded bg-white/5 animate-pulse" />
      </div>

      {/* Subject cards skeleton grid */}
      <div className="px-6 pt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse p-5 flex flex-col justify-between"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-3/4 rounded bg-white/5 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Center loader */}
      <div className="flex justify-center pt-8">
        <Loader2 size={20} className="text-purple-400/50 animate-spin" />
      </div>
    </div>
  );
}
