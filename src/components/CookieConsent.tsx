"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, ShieldCheck } from "lucide-react";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("paperino_cookie_consent");
      if (!consent) {
        // Small delay so it animates in cleanly after initial render
        const timer = setTimeout(() => setShowBanner(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("paperino_cookie_consent", "accepted");
    } catch {}
    setShowBanner(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem("paperino_cookie_consent", "declined");
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="glass-panel p-5 rounded-2xl border border-violet-500/30 bg-[#0c0818]/95 backdrop-blur-xl shadow-[0_0_35px_rgba(139,92,246,0.25)] flex flex-col gap-3 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
            <Cookie size={18} />
          </div>
          <div className="flex-1 pr-6">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">
              Cookie &amp; Privacy Notice
            </h4>
            <p className="text-xs text-violet-200/75 leading-relaxed">
              We use cookies to enhance your experience, analyze student traffic, and support Google personalized services. Learn more in our{" "}
              <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                Privacy Policy
              </Link>.
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Dismiss cookie notice"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
          <button
            onClick={handleDecline}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Necessary Only
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-900/40 border border-violet-400/30"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
