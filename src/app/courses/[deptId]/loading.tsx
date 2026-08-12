"use client";

import { Loader2 } from "lucide-react";

export default function DeptLoading() {
  return (
    <div className="min-h-screen bg-[#050308] text-white flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.15)]">
        <Loader2 size={28} className="text-purple-400 animate-spin" />
      </div>
      <p className="text-sm text-gray-400 font-medium mt-4 animate-pulse">Loading...</p>
    </div>
  );
}
