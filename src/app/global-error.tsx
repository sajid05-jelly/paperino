"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Paperino Global Error Boundary]", error);
  }, [error]);

  return (
    <html>
      <body className="bg-[#07050e] text-white flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Application Error</h2>
          <p className="text-sm text-gray-400">
            A critical error occurred. Please try reloading the page.
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
