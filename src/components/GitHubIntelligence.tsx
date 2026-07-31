"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Zap,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { GitHubAnalysisResult } from "@/app/api/github-intelligence/route";

interface GitHubIntelligenceProps {
  initialUsername?: string;
  onAnalysisComplete?: (data: GitHubAnalysisResult) => void;
  onSkip?: () => void;
}

export default function GitHubIntelligence({
  initialUsername = "",
  onAnalysisComplete,
  onSkip,
}: GitHubIntelligenceProps) {
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GitHubAnalysisResult | null>(null);
  const [imgError, setImgError] = useState(false);

  const fetchAnalysis = async (forceRefresh = false) => {
    if (!username.trim()) {
      setError("Please enter a valid GitHub username.");
      return;
    }

    setLoading(true);
    setError(null);
    setImgError(false);

    try {
      const cleanUser = username.trim().replace(/^@/, "");
      const res = await fetch(`/api/github-intelligence?username=${encodeURIComponent(cleanUser)}${forceRefresh ? "&refresh=true" : ""}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze GitHub profile");
      }

      setAnalysis(data);
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── COMPACT GITHUB SUMMARY & CONNECT FORM CARD ── */}
      <div
        className="rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, rgba(15,12,28,0.85) 0%, rgba(20,10,35,0.75) 100%)",
          border: "1px solid rgba(139,92,246,0.25)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 0 35px rgba(109,40,217,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Background Ambient Glow */}
        <div
          className="absolute -top-32 -right-32 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(109,40,217,0.3) 0%, rgba(79,70,229,0.2) 100%)",
                border: "1px solid rgba(167,139,250,0.4)",
                boxShadow: "0 0 15px rgba(139,92,246,0.3)",
              }}
            >
              <FolderGit2 size={20} className="text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-wide">GitHub Integration</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {analysis ? "Connected ✓" : "Optional"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {analysis ? "Your GitHub profile is synced with Paperino AI mentor." : "Connect your GitHub username to preview your coding skills."}
              </p>
            </div>
          </div>
        </div>

        {/* Input Bar when not analyzed or updating */}
        <div className="space-y-4 relative z-10">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold select-none">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAnalysis(false)}
                placeholder="e.g. mohamedsajid"
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs font-medium focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAnalysis(false)}
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs text-white transition-all cursor-pointer disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, rgba(109,40,217,0.9) 0%, rgba(79,70,229,0.9) 100%)",
                  border: "1px solid rgba(167,139,250,0.4)",
                  boxShadow: "0 0 20px rgba(109,40,217,0.35)",
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} className="text-amber-300" />
                    <span>{analysis ? "Re-Analyze" : "Analyze GitHub"}</span>
                  </>
                )}
              </button>

              {onSkip && !analysis && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2.5 rounded-2xl font-semibold text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                >
                  Skip
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle size={14} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Compact Connected Summary Preview */}
        {analysis && (
          <div className="mt-5 pt-5 border-t border-white/10 relative z-10 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-3.5">
                {!imgError && analysis.avatarUrl ? (
                  <img
                    src={analysis.avatarUrl}
                    alt={analysis.username}
                    onError={() => setImgError(true)}
                    className="w-12 h-12 rounded-2xl border-2 border-purple-500/40 object-cover shrink-0 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 text-white font-black text-lg shadow-md">
                    {(analysis.name || analysis.username).charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-white">{analysis.name || analysis.username}</h4>
                    <span className="text-xs text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                      @{analysis.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                    <span><strong className="text-white font-bold">{analysis.publicReposCount}</strong> Repositories</span>
                    <span>•</span>
                    <span className="text-cyan-300 font-semibold">Analyzed {new Date(analysis.cachedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>

              {/* GitHub Health Score Badge */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 shrink-0 self-stretch sm:self-auto justify-center">
                <ShieldCheck size={16} className="text-emerald-400" />
                <div className="text-left">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Health Score</span>
                  <span className="text-xs font-black text-emerald-300">{analysis.healthReport?.score || 85} / 100</span>
                </div>
              </div>
            </div>

            {/* Top 5 Detected Technologies Chips */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Top 5 Detected Technologies</span>
              <div className="flex flex-wrap gap-2">
                {analysis.detectedSkills.slice(0, 5).map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-500/15 border border-purple-500/30 text-purple-200 shadow-sm"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── PREMIUM FEATURE CTA CARD: REDIRECT TO DEDICATED GITHUB INTELLIGENCE PAGE ── */}
      <div
        className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all duration-500 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(135deg, rgba(30,15,55,0.92) 0%, rgba(15,10,30,0.95) 100%)",
          border: "1px solid rgba(168,85,247,0.4)",
          backdropFilter: "blur(25px)",
          boxShadow: "0 0 40px rgba(139,92,246,0.22), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {/* Animated Background AI Particles & Neon Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-[70px] pointer-events-none group-hover:bg-fuchsia-500/25 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-cyan-500/15 rounded-full blur-[60px] pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles size={13} className="text-amber-400 animate-pulse" />
              <span>Full Developer Dashboard Preview</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              🚀 Want a complete AI-powered GitHub analysis?
            </h3>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-light">
              Explore your complete GitHub Intelligence dashboard to discover developer score, AI insights, badges, portfolio analysis, learning roadmap, project recommendations and much more.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <Link
              href="/github-intelligence"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-extrabold text-xs text-white transition-all duration-300 shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.7)] hover:scale-[1.03]"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.95) 0%, rgba(124,58,237,0.95) 100%)",
                border: "1px solid rgba(216,180,254,0.5)",
              }}
            >
              <span>Open GitHub Intelligence</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <button
              onClick={() => fetchAnalysis(true)}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Analyze Again</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
