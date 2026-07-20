"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Copy, Check, X } from "lucide-react";

export default function ErrorSniffer() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    // Intercept console.error to catch Firebase permission errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      const errorString = args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.message}\n${arg.stack}`;
        }
        if (typeof arg === "object") {
          return JSON.stringify(arg);
        }
        return String(arg);
      }).join(" ");

      if ((errorString.toLowerCase().includes("permission") || errorString.toLowerCase().includes("firebaseerror")) && !errorString.toLowerCase().includes("quota")) {
        setErrorMsg(errorString);
      }
    };

    // Catch unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason);
      if ((msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("firebaseerror")) && !msg.toLowerCase().includes("quota")) {
        setErrorMsg(msg);
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (!errorMsg) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(errorMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-28 left-4 right-4 sm:left-auto sm:right-6 z-[99999] max-w-lg w-full animate-in slide-in-from-bottom-5">
      <div className="bg-[#1a0e1c]/95 backdrop-blur-xl border border-red-500/40 p-5 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.25)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertCircle size={16} />
            <span>Developer Permission Sniffer</span>
          </div>
          <button 
            onClick={() => setErrorMsg(null)}
            className="text-gray-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        
        <p className="text-xs text-gray-300">
          The following Firestore permission error occurred:
        </p>

        <pre className="bg-black/60 p-3 rounded-lg text-[10px] text-red-300 font-mono overflow-auto max-h-48 whitespace-pre-wrap select-all">
          {errorMsg}
        </pre>

        <button
          onClick={copyToClipboard}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-xs font-bold rounded-xl transition-all"
        >
          {copied ? (
            <>
              <Check size={14} /> Copied!
            </>
          ) : (
            <>
              <Copy size={14} /> Copy Error Details
            </>
          )}
        </button>
      </div>
    </div>
  );
}
