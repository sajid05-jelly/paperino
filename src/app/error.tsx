"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Paperino App Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl space-y-5">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-xl">
          !
        </div>
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-sm text-gray-400">
          An unexpected error occurred. You can try refreshing the section.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-lg cursor-pointer"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 font-semibold text-sm transition-all cursor-pointer"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
