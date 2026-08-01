"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  FolderGit2,
  Sparkles,
  RefreshCw,
  Search,
  Zap,
  Code2,
  Star,
  ShieldCheck,
  TrendingUp,
  Award,
  Compass,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Users,
  AlertCircle,
  UserCheck,
  Layers,
  Cpu,
  Terminal,
  Activity,
  Boxes,
  FileText,
  Download,
  HelpCircle,
  X,
} from "lucide-react";
import { GitHubAnalysisResult } from "@/app/api/github-intelligence/route";

const AmbientOrbs = dynamic(() => import("@/components/AmbientOrbs"), { ssr: false });

export default function GitHubIntelligencePage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GitHubAnalysisResult | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleDownloadReport = async () => {
    if (!analysis) return;
    setPdfGenerating(true);
    try {
      const { generateDeveloperReportPdf } = await import("@/lib/pdfDeveloperReport");
      await generateDeveloperReportPdf(analysis);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setError("Failed to generate PDF report.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const fetchAnalysis = async (forceRefresh = false) => {
    if (!username.trim()) {
      setError("Please enter a valid GitHub username.");
      return;
    }

    setLoading(true);
    setError(null);
    setImgError(false);

    try {
      let cleanUser = username.trim().replace(/^@/, "");
      if (cleanUser.includes("github.com/")) {
        const parts = cleanUser.split("github.com/")[1].split("/").filter(Boolean);
        cleanUser = parts[0] || cleanUser;
      }

      const res = await fetch(`/api/github-intelligence?username=${encodeURIComponent(cleanUser)}${forceRefresh ? "&refresh=true" : ""}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze GitHub profile");
      }

      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUsername("");
    setAnalysis(null);
    setError(null);
    setImgError(false);
  };

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden font-sans selection:bg-purple-500/30"
      style={{
        background: `
          radial-gradient(ellipse at 20% 10%, rgba(139, 92, 246, 0.18) 0%, transparent 45%),
          radial-gradient(ellipse at 80% 20%, rgba(192, 132, 252, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 65%, rgba(109, 40, 217, 0.12) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 85%, rgba(147, 51, 234, 0.15) 0%, transparent 50%),
          linear-gradient(180deg, #090514 0%, #0a0618 35%, #070412 70%, #05030d 100%)
        `,
      }}
    >
      {/* ── JSON-LD STRUCTURED DATA FOR SEO ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "@id": "https://paperino-eta.vercel.app/github-intelligence#webapp",
                "name": "Paperino GitHub Intelligence",
                "url": "https://paperino-eta.vercel.app/github-intelligence",
                "applicationCategory": "DeveloperApplication",
                "operatingSystem": "All",
                "description":
                  "Analyze your public GitHub profile with Paperino GitHub Intelligence. Discover project quality, technical skills, repository health, developer score, portfolio strengths and improvement opportunities.",
                "browserRequirements": "Requires JavaScript. Requires HTML5."
              },
              {
                "@type": "BreadcrumbList",
                "@id": "https://paperino-eta.vercel.app/github-intelligence#breadcrumb",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Paperino",
                    "item": "https://paperino-eta.vercel.app"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Paperino Labs",
                    "item": "https://paperino-eta.vercel.app/#labs"
                  },
                  {
                    "@type": "ListItem",
                    "position": 3,
                    "name": "GitHub Intelligence",
                    "item": "https://paperino-eta.vercel.app/github-intelligence"
                  }
                ]
              },
              {
                "@type": "FAQPage",
                "@id": "https://paperino-eta.vercel.app/github-intelligence#faq",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "What is a GitHub profile analyzer?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "A GitHub profile analyzer inspects public GitHub repositories to evaluate code quality, technical depth, project completeness, documentation, and overall software engineering practices."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "How does Paperino GitHub Intelligence score a profile?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Paperino GitHub Intelligence evaluates profiles using an evidence-based engine across 8 categories: Best Project Quality (30%), Overall Project Quality (20%), Technical Depth (15%), Engineering Practices (10%), Portfolio Depth (10%), Documentation (5%), Maintenance & Consistency (5%), and Collaboration (5%)."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Does having more repositories increase my score?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "No. Raw repository counts, follower counts, and account age contribute ZERO direct points to the developer score. Quality of meaningful engineering work is prioritized over quantity."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Are GitHub followers used to determine developer skill?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "No. Followers and repository counts are treated purely as context metadata and do not directly inflate the Developer Score."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "What does GitHub Intelligence analyze?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "GitHub Intelligence inspects frontend, backend, database, testing, CI/CD pipelines, documentation quality, repository classifications, and engineering depth."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Can I download my GitHub developer report?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Yes! Students can generate and download a comprehensive multi-page PDF developer report containing their profile quality breakdown, strengths, and actionable growth plan."
                    }
                  }
                ]
              }
            ]
          })
        }}
      />

      <title>GitHub Profile Analyzer for Developers & Students | Paperino GitHub Intelligence</title>
      <meta name="description" content="Analyze your public GitHub profile with Paperino GitHub Intelligence. Discover project quality, technical skills, repository health, developer score, portfolio strengths and improvement opportunities." />
      <link rel="canonical" href="https://paperino-eta.vercel.app/github-intelligence" />
      <meta property="og:title" content="GitHub Profile Analyzer for Developers & Students | Paperino GitHub Intelligence" />
      <meta property="og:description" content="Analyze your public GitHub profile with Paperino GitHub Intelligence. Discover project quality, technical skills, repository health, developer score, portfolio strengths and improvement opportunities." />
      <meta property="og:url" content="https://paperino-eta.vercel.app/github-intelligence" />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="https://paperino-eta.vercel.app/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="GitHub Profile Analyzer for Developers & Students | Paperino GitHub Intelligence" />
      <meta name="twitter:description" content="Analyze your public GitHub profile with Paperino GitHub Intelligence. Discover project quality, technical skills, repository health, developer score, portfolio strengths and improvement opportunities." />

      <AmbientOrbs />

      {/* Subtle Soft Violet Ambient Glows */}
      <div className="absolute top-[5%] left-[25%] w-[35vw] h-[35vw] bg-purple-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[35%] right-[15%] w-[40vw] h-[40vw] bg-violet-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[70%] left-[15%] w-[38vw] h-[38vw] bg-fuchsia-900/12 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
        {/* ── HERO LANDING SECTION ── */}
        <header className="text-center space-y-6 max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              background: "rgba(109,40,217,0.1)",
              border: "1px solid rgba(139,92,246,0.28)",
              color: "#c4b5fd",
              backdropFilter: "blur(14px)",
              boxShadow: "0 0 24px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(167,139,250,0.9)" }} />
            <FolderGit2 size={13} className="text-purple-400" />
            <span>Paperino Labs • GitHub Intelligence</span>
          </div>

          <h1
            className="font-black leading-tight text-white tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontFamily: "'Outfit', 'Inter', sans-serif" }}
          >
            GitHub <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400">Intelligence</span>
          </h1>

          <p className="text-gray-300 text-base md:text-lg leading-relaxed font-light">
            Analyze your GitHub profile and discover your real developer strengths.
          </p>

          {/* Search Box Input */}
          <div className="max-w-xl mx-auto pt-4 space-y-3">
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-2 rounded-3xl bg-white/5 border border-purple-500/30 backdrop-blur-2xl shadow-[0_0_40px_rgba(109,40,217,0.15)]">
              <div className="relative flex-1 flex items-center pl-4">
                <Search size={18} className="text-gray-400 shrink-0 mr-2" />
                <span className="text-gray-400 text-sm font-semibold select-none mr-1">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchAnalysis(false)}
                  placeholder="Enter your GitHub username"
                  className="w-full py-3 bg-transparent text-white placeholder-gray-500 text-sm font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 px-2 pb-2 sm:pb-0">
                <button
                  onClick={() => fetchAnalysis(false)}
                  disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs text-white transition-all cursor-pointer disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, rgba(109,40,217,0.95) 0%, rgba(79,70,229,0.95) 100%)",
                    border: "1px solid rgba(167,139,250,0.5)",
                    boxShadow: "0 0 25px rgba(109,40,217,0.4)",
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Analyze Profile</span>
                  )}
                </button>

                {analysis && (
                  <button
                    onClick={() => fetchAnalysis(true)}
                    disabled={loading}
                    title="Refresh Analysis"
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                )}

                {analysis && (
                  <button
                    onClick={handleClear}
                    className="px-3.5 py-3 rounded-2xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-200">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </header>

        {/* ── ANALYSIS DASHBOARD ── */}
        {analysis ? (
          <main className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
            {/* ── HERO SECTION: AI DEVELOPER DASHBOARD CARD ── */}
            <section
              className="p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden space-y-8"
              style={{
                background: "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.22) 0%, rgba(17,15,28,0.92) 75%), #0c0919",
                border: "1px solid rgba(167,139,250,0.35)",
                backdropFilter: "blur(30px)",
                boxShadow: "0 0 60px rgba(109,40,217,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {/* Top Row: Profile info & Circular Score Gauge */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Left: Profile Meta & Rank Badges */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 flex-1">
                  {!imgError && analysis.avatarUrl ? (
                    <img
                      src={analysis.avatarUrl}
                      alt={analysis.username}
                      onError={() => setImgError(true)}
                      className="w-24 h-24 rounded-3xl border-2 border-purple-500/50 object-cover shrink-0 shadow-[0_0_30px_rgba(139,92,246,0.4)]"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 text-white font-black text-3xl shadow-lg">
                      {(analysis.name || analysis.username).charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-2xl md:text-3xl font-black text-white">{analysis.name || analysis.username}</h2>
                      <span className="text-xs text-purple-300 font-bold bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                        @{analysis.username}
                      </span>
                    </div>

                    {analysis.bio && <p className="text-xs md:text-sm text-gray-300 max-w-xl leading-relaxed">{analysis.bio}</p>}

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                      <span className="px-3 py-1 rounded-full text-xs font-black tracking-wide bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        {analysis.developerMetrics?.level || "Advanced Developer"}
                      </span>
                      <span className="text-amber-400 font-bold text-sm tracking-widest">
                        {analysis.developerMetrics?.stars || "★★★★★"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-400 pt-1 font-medium">
                      <span className="flex items-center gap-1.5">
                        <FolderGit2 size={14} className="text-purple-400" />
                        <strong className="text-white font-bold">{analysis.publicReposCount}</strong> Public Repos
                      </span>
                      <button
                        onClick={() => setShowVerifiedModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      >
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <strong className="font-bold">{(analysis.developerMetrics as any)?.transparencyAudit?.meaningfulProjectsCount ?? (analysis.developerMetrics as any)?.transparencyAudit?.meaningfulProjects ?? 0}</strong> Verified Projects →
                      </button>
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-cyan-400" />
                        <strong className="text-white font-bold">{analysis.followers}</strong> followers
                      </span>
                      <span>Joined {analysis.createdAt}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Circular Overall Developer Score Gauge */}
                <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white/[0.03] border border-white/10 shrink-0 text-center relative w-full lg:w-auto">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="url(#scoreGradient)"
                        strokeWidth="8"
                        strokeDasharray={264}
                        strokeDashoffset={264 - (264 * (analysis.developerMetrics?.score || 85)) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="50%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white leading-none">
                        {analysis.developerMetrics?.score || 85}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">/ 100</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-0.5">
                    <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-cyan-300 block">
                      Developer Score
                    </span>
                    {analysis.developerMetrics?.rankPercentile ? (
                      <span className="text-[11px] text-gray-400 font-semibold block">
                        Top <strong className="text-cyan-300">{analysis.developerMetrics.rankPercentile}%</strong> among developers
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-semibold block">
                        Evidence-Based Quality Rating
                      </span>
                    )}
                  </div>

                  {/* Download Report Button */}
                  <button
                    onClick={handleDownloadReport}
                    disabled={pdfGenerating}
                    className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-2xl font-bold text-xs text-white transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-purple-400/40 hover:scale-[1.02] disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)",
                    }}
                  >
                    <FileText size={14} className={pdfGenerating ? "animate-pulse text-cyan-300" : "text-white"} />
                    <span>{pdfGenerating ? "Generating Report..." : "Download Developer Report"}</span>
                  </button>
                </div>
              </div>

              {/* Developer XP & Level Progress Bar */}
              <div className="p-5 rounded-3xl bg-white/[0.025] border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-amber-400" />
                    <span className="text-sm font-black text-white">Developer Level {analysis.developerMetrics?.levelNum || 1}</span>
                    <span className="text-xs text-amber-300 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      XP {analysis.developerMetrics?.xpCurrent || 0} / {analysis.developerMetrics?.xpMax || 100}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                    <span>Next Reward:</span>
                    <span className="text-purple-300 font-bold bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                      {analysis.developerMetrics?.nextRewardBadge || "Elite Builder Badge"}
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-cyan-400 transition-all duration-1000 ease-out"
                    style={{ width: `${analysis.developerMetrics?.xpPercentage || 0}%` }}
                  />
                </div>

                {/* Next Level Requirements Checklist */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Next Level Requirements:</span>
                  {(analysis.developerMetrics?.nextLevelRequirements || ["+1 Repository", "+2 README Improvements"]).map((req, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/5 border border-white/10 text-cyan-200">
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── SCORE BREAKDOWN & REPOSITORY AUDIT SECTION ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Score Breakdown Box */}
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-300">Evidence-Based Score Breakdown</span>
                    <span className="text-xs font-mono font-bold text-white bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30">
                      {analysis.developerMetrics?.score || 0} / 100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: "Best Project Quality", item: (analysis.developerMetrics as any)?.scoreBreakdown?.bestProjectQuality, max: 30 },
                      { label: "Overall Projects", item: (analysis.developerMetrics as any)?.scoreBreakdown?.overallProjectQuality, max: 20 },
                      { label: "Technical Depth", item: (analysis.developerMetrics as any)?.scoreBreakdown?.technicalDepth, max: 15 },
                      { label: "Engineering Practices", item: (analysis.developerMetrics as any)?.scoreBreakdown?.engineeringPractices, max: 10 },
                      { label: "Portfolio Depth", item: (analysis.developerMetrics as any)?.scoreBreakdown?.portfolioDepth, max: 10 },
                      { label: "Documentation", item: (analysis.developerMetrics as any)?.scoreBreakdown?.documentation, max: 5 },
                      { label: "Maintenance", item: (analysis.developerMetrics as any)?.scoreBreakdown?.maintenanceConsistency, max: 5 },
                      { label: "Collaboration", item: (analysis.developerMetrics as any)?.scoreBreakdown?.collaborationOpenSource, max: 5 },
                    ].map((entry) => {
                      const scoreVal = typeof entry.item === "number" ? entry.item : (entry.item?.score ?? 0);
                      return (
                        <div key={entry.label} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                          <span className="text-gray-300 font-medium">{entry.label}</span>
                          <span className="font-mono font-bold text-cyan-300">{scoreVal} / {entry.max}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expandable Why this score? */}
                  <details className="group space-y-2 pt-2 border-t border-white/10 text-xs">
                    <summary className="cursor-pointer font-bold text-purple-300 hover:text-purple-200 flex items-center justify-between py-1 transition-colors">
                      <span className="text-[11px] uppercase tracking-wider">Why this score?</span>
                      <span className="text-[10px] text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="space-y-1.5 pt-1">
                      {analysis.developerMetrics?.scoreExplanation?.strengths?.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-emerald-300">
                          <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                          <span>{s}</span>
                        </div>
                      ))}
                      {analysis.developerMetrics?.scoreExplanation?.needsImprovement?.map((imp, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-amber-300">
                          <AlertCircle size={13} className="shrink-0 text-amber-400" />
                          <span>{imp}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>

                {/* Data Transparency Audit Box */}
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Portfolio & Repository Audit</span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      {(analysis.developerMetrics as any)?.transparencyAudit?.repositoriesInspected ?? analysis.publicReposCount} Public Repos
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                      <span className="text-emerald-200 font-medium">Meaningful Projects</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {(analysis.developerMetrics as any)?.transparencyAudit?.meaningfulProjects ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                      <span className="text-gray-300 font-medium">Academic Projects</span>
                      <span className="font-mono font-bold text-white">{(analysis.developerMetrics as any)?.transparencyAudit?.academicProjects ?? 0}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                      <span className="text-gray-300 font-medium">Assignments / Labs</span>
                      <span className="font-mono font-bold text-gray-300">{(analysis.developerMetrics as any)?.transparencyAudit?.assignments ?? 0}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                      <span className="text-gray-300 font-medium">Tutorials & Practice</span>
                      <span className="font-mono font-bold text-gray-300">
                        {((analysis.developerMetrics as any)?.transparencyAudit?.tutorials ?? 0) + ((analysis.developerMetrics as any)?.transparencyAudit?.practiceRepos ?? 0)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center">
                      <span className="text-amber-200 font-medium">Forks</span>
                      <span className="font-mono font-bold text-amber-300">{(analysis.developerMetrics as any)?.transparencyAudit?.forks ?? 0}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                      <span className="text-gray-300 font-medium">Minimal / Empty / Config</span>
                      <span className="font-mono font-bold text-gray-400">
                        {((analysis.developerMetrics as any)?.transparencyAudit?.minimalEmptyRepos ?? 0) + ((analysis.developerMetrics as any)?.transparencyAudit?.profileConfigRepos ?? 0)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-gray-400 leading-relaxed">
                    ℹ️ <strong>Data Transparency:</strong> {(analysis.developerMetrics as any)?.transparencyAudit?.disclaimer || "Assessment is based on publicly accessible GitHub evidence and should not be interpreted as a complete measurement of developer abilities."}
                  </div>
                </div>
              </div>

              {/* Bottom Row: 10 Animated Skill Progress Bars with Confidence Labels */}
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
                    <Zap size={14} className="text-amber-400 animate-pulse" />
                    <span>Evidence-Based Skill Matrix (10 Core Competencies)</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold">Strictly Verified from Code & Dependencies</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
                  {[
                    { label: "Frontend", key: "frontend", color: "from-purple-500 to-indigo-500" },
                    { label: "Backend", key: "backend", color: "from-blue-500 to-cyan-500" },
                    { label: "Database", key: "database", color: "from-emerald-500 to-teal-500" },
                    { label: "AI / ML", key: "aiMl", color: "from-fuchsia-500 to-pink-500" },
                    { label: "DevOps", key: "devOps", color: "from-amber-500 to-orange-500" },
                    { label: "Cloud", key: "cloud", color: "from-cyan-500 to-blue-500" },
                    { label: "Problem Solving", key: "problemSolving", color: "from-purple-500 to-fuchsia-500" },
                    { label: "Documentation", key: "documentation", color: "from-emerald-400 to-cyan-400" },
                    { label: "UI / UX", key: "uiUx", color: "from-pink-500 to-purple-500" },
                    { label: "Testing", key: "testing", color: "from-indigo-500 to-purple-500" },
                  ].map((item) => {
                    const confObj = (analysis.developerMetrics as any)?.skillsConfidence?.[item.key] || {
                      score: (analysis.developerMetrics?.skillsBreakdown as any)?.[item.key] || 0,
                      confidence: "INSUFFICIENT EVIDENCE",
                      reason: "No code implementation detected.",
                    };
                    const isInsufficient = confObj.confidence === "INSUFFICIENT EVIDENCE";

                    return (
                      <div key={item.label} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] font-semibold">
                            <span className="text-gray-300 font-bold">{item.label}</span>
                            <span className="text-white font-mono">{isInsufficient ? "N/A" : `${confObj.score}%`}</span>
                          </div>

                          <span
                            className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                              confObj.confidence === "HIGH CONFIDENCE"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : confObj.confidence === "MEDIUM CONFIDENCE"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : confObj.confidence === "LOW CONFIDENCE"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                            }`}
                          >
                            {confObj.confidence}
                          </span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-1000 ease-out`}
                            style={{ width: `${isInsufficient ? 0 : confObj.score}%` }}
                          />
                        </div>

                        <p className="text-[9.5px] text-gray-400 line-clamp-2 leading-tight font-medium pt-0.5">
                          {confObj.reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ── DEVELOPER ACHIEVEMENT BADGES SECTION ── */}
            <section className="space-y-5">
              {/* Progress Header & Progress Bar */}
              <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-sm uppercase tracking-wider">
                      <Award size={20} className="text-amber-400" />
                      <span>DEVELOPER ACHIEVEMENT BADGES</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Evidence-backed developer progression & milestone achievements</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      {(analysis.developerMetrics?.badges || []).filter(b => b.unlocked).length} / {(analysis.developerMetrics?.badges || []).length || 10} UNLOCKED
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-purple-300">
                      Next Achievement Goal:{" "}
                      <strong className="text-cyan-300">
                        {(analysis.developerMetrics?.badges || []).find(b => !b.unlocked)?.name || "Master Engineer"}
                      </strong>
                    </span>
                    <span className="text-gray-400 font-mono">
                      {Math.round(
                        (((analysis.developerMetrics?.badges || []).filter(b => b.unlocked).length || 0) /
                          ((analysis.developerMetrics?.badges || []).length || 10)) *
                          100
                      )}
                      % Completed
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                      style={{
                        width: `${Math.max(
                          10,
                          (((analysis.developerMetrics?.badges || []).filter(b => b.unlocked).length || 0) /
                            ((analysis.developerMetrics?.badges || []).length || 10)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 10 Badges Responsive Grid (Desktop: 5 per row x 2 rows, Mobile/Tablet: 2-3 cols) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {(analysis.developerMetrics?.badges || []).map((badge) => (
                  <div
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge)}
                    className={`p-4 rounded-3xl border transition-all duration-300 flex flex-col items-center text-center space-y-2.5 relative overflow-hidden cursor-pointer ${
                      badge.unlocked
                        ? "bg-white/[0.04] border-purple-500/40 hover:scale-[1.03] shadow-[0_0_25px_rgba(168,85,247,0.25)]"
                        : "bg-white/[0.015] border-white/5 opacity-55 hover:opacity-85 hover:border-white/20"
                    }`}
                    style={badge.unlocked ? { boxShadow: `0 0 25px ${badge.glowColor}` } : {}}
                  >
                    {/* Badge Icon */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300 ${
                        badge.unlocked ? "animate-bounce-subtle bg-white/10" : "grayscale opacity-60 bg-white/5"
                      }`}
                    >
                      {badge.icon}
                    </div>

                    {/* Title & Short Description */}
                    <div className="space-y-1">
                      <h5 className={`font-extrabold text-xs ${badge.unlocked ? "text-white" : "text-gray-400"}`}>
                        {badge.name}
                      </h5>
                      <p className="text-[10px] text-gray-400 leading-tight line-clamp-2">{badge.description}</p>
                    </div>

                    {/* Unlocked / Locked Pill */}
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mt-auto tracking-wider ${
                        badge.unlocked
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                      }`}
                    >
                      {badge.unlocked ? "✓ UNLOCKED" : "🔒 LOCKED"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Badge Details Modal Dialog */}
              {selectedBadge && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
                  onClick={() => setSelectedBadge(null)}
                >
                  <div
                    className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-purple-500/30 max-w-lg w-full space-y-5 relative shadow-[0_0_50px_rgba(168,85,247,0.3)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedBadge(null)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 text-lg font-bold"
                    >
                      ✕
                    </button>

                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-4xl border border-white/10 shrink-0">
                        {selectedBadge.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-white">{selectedBadge.name}</h4>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                              selectedBadge.unlocked
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                            }`}
                          >
                            {selectedBadge.unlocked ? "✓ UNLOCKED" : "🔒 LOCKED"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{selectedBadge.description}</p>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                        {selectedBadge.unlocked ? "Unlocked Reason" : "Lock Reason & Guidance"}
                      </span>
                      <p className="text-gray-200 leading-relaxed font-medium">{selectedBadge.unlockReason}</p>
                      {selectedBadge.suggestion && (
                        <p className="text-cyan-300 pt-1 text-[11px] leading-normal font-semibold">
                          💡 <strong>How to unlock:</strong> {selectedBadge.suggestion}
                        </p>
                      )}
                    </div>

                    {/* Evidence or Requirements Checklist */}
                    <div className="space-y-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                        {selectedBadge.unlocked ? "Evidence Detected in Repositories" : "Requirements Checklist"}
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {selectedBadge.unlocked
                          ? (selectedBadge.evidenceList || []).map((ev: string, idx: number) => (
                              <div key={idx} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                                {ev}
                              </div>
                            ))
                          : (selectedBadge.requirementsChecklist || []).map((req: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-[11px]">
                                <span className={req.satisfied ? "text-emerald-300" : "text-gray-400"}>{req.text}</span>
                                <span className={req.satisfied ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                  {req.satisfied ? "✓ Satisfied" : "✗ Missing"}
                                </span>
                              </div>
                            ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedBadge(null)}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white transition-colors"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* ── AI DEVELOPER PERSONALITY SECTION ── */}
            <section
              className="p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden space-y-6"
              style={{
                background: "linear-gradient(135deg, rgba(109,40,217,0.15) 0%, rgba(15,15,30,0.8) 100%)",
                border: "1px solid rgba(167,139,250,0.3)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 40px rgba(109,40,217,0.15)",
              }}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-fuchsia-400">
                    <Sparkles size={16} className="animate-spin-slow" />
                    <span>AI Developer Personality & Career Archetype</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    {analysis.developerPersonality?.archetype || "Full Stack Engineer & Builder"}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 text-purple-200 border border-purple-500/30">
                    💼 {analysis.developerPersonality?.bestCareerPath || "Full Stack Product Engineer"}
                  </span>
                </div>
              </div>

              {/* 4 Readiness Scores Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Startup Readiness */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-300">🚀 Startup Readiness</span>
                    <span className="text-purple-300 font-mono">{analysis.developerPersonality?.readinessScores?.startupReadiness || 85}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-1000"
                      style={{ width: `${analysis.developerPersonality?.readinessScores?.startupReadiness || 85}%` }}
                    />
                  </div>
                </div>

                {/* Enterprise Readiness */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-300">🏢 Enterprise Readiness</span>
                    <span className="text-cyan-300 font-mono">{analysis.developerPersonality?.readinessScores?.enterpriseReadiness || 75}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000"
                      style={{ width: `${analysis.developerPersonality?.readinessScores?.enterpriseReadiness || 75}%` }}
                    />
                  </div>
                </div>

                {/* Freelancer Potential */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-300">💼 Freelancer Potential</span>
                    <span className="text-emerald-300 font-mono">{analysis.developerPersonality?.readinessScores?.freelancerPotential || 80}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                      style={{ width: `${analysis.developerPersonality?.readinessScores?.freelancerPotential || 80}%` }}
                    />
                  </div>
                </div>

                {/* Leadership Potential */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-300">👑 Leadership Potential</span>
                    <span className="text-amber-300 font-mono">{analysis.developerPersonality?.readinessScores?.leadershipPotential || 70}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000"
                      style={{ width: `${analysis.developerPersonality?.readinessScores?.leadershipPotential || 70}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Developer Style Traits */}
              <div className="pt-2 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Observed Developer Style & Coding Habits</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(analysis.developerPersonality?.developerStyleTraits || []).map((trait: string, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-2.5 text-gray-200 leading-relaxed font-medium">
                      <Zap size={14} className="text-fuchsia-400 shrink-0 mt-0.5" />
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── DEVELOPER JOURNEY & PROJECT GROWTH SECTION ── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Interactive Timeline */}
              <div className="lg:col-span-2 p-6 md:p-8 rounded-[2.5rem] bg-white/[0.025] border border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-sm uppercase tracking-wider">
                    <TrendingUp size={18} className="text-purple-400" />
                    <span>Developer Journey & Career Milestones</span>
                  </div>
                  <span className="text-xs text-gray-400 font-semibold">GitHub History</span>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-fuchsia-500 before:to-cyan-400">
                  {(analysis.developerJourney?.timeline || []).map((m: any, idx: number) => (
                    <div key={idx} className="relative group flex items-start gap-4">
                      {/* Node Bullet */}
                      <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-[#07050e] border-2 border-purple-400 flex items-center justify-center text-xs shadow-[0_0_12px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform">
                        {m.icon}
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-purple-500/30 group-hover:bg-white/[0.07] transition-all flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors">
                            {m.title}
                          </h5>
                          {m.badgeText && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {m.badgeText}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-300 font-light">{m.subtitle}</p>
                        <span className="text-[10px] text-gray-500 font-mono block pt-1">{m.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 1 Col: Project Growth Metrics */}
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.025] border border-white/10 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm uppercase tracking-wider">
                    <Activity size={18} className="text-cyan-400" />
                    <span>Project Growth Metrics</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-gray-400 font-medium block">Activity Trend</span>
                      <span className="font-bold text-sm text-emerald-400">
                        {analysis.developerJourney?.growth?.activityTrend || "Consistent Project Growth 📈"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-gray-400 font-medium block">Most Productive Month</span>
                      <span className="font-bold text-sm text-purple-300">
                        {analysis.developerJourney?.growth?.mostProductiveMonth || "Recent Months"}
                      </span>
                    </div>

                    {analysis.developerJourney?.growth?.latestProject && (
                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <span className="text-gray-400 font-medium block">Latest Project</span>
                        <a
                          href={analysis.developerJourney.growth.latestProject.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-sm text-cyan-300 hover:underline flex items-center justify-between"
                        >
                          <span className="truncate">{analysis.developerJourney.growth.latestProject.name}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                      </div>
                    )}

                    {analysis.developerJourney?.growth?.mostSuccessfulProject && (
                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                        <span className="text-gray-400 font-medium block">Most Successful Project</span>
                        <a
                          href={analysis.developerJourney.growth.mostSuccessfulProject.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-sm text-amber-300 hover:underline flex items-center justify-between"
                        >
                          <span className="truncate">{analysis.developerJourney.growth.mostSuccessfulProject.name}</span>
                          <span className="flex items-center gap-0.5 text-xs text-amber-400 font-bold shrink-0">
                            ★ {analysis.developerJourney.growth.mostSuccessfulProject.stars}
                          </span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 text-center space-y-1">
                  <span className="text-xs font-bold text-white block">Career Journey Progress</span>
                  <span className="text-[10px] text-gray-400 block">
                    {analysis.publicReposCount} Published Repositories • {analysis.detectedSkills.length} Verified Tech Stacks
                  </span>
                </div>
              </div>
            </section>

            {/* ── HOW RECRUITERS SEE YOU SECTION ── */}
            <section
              className="p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden space-y-6"
              style={{
                background: "radial-gradient(ellipse at 50% 100%, rgba(6,182,212,0.12) 0%, rgba(15,15,30,0.85) 75%), #0a0715",
                border: "1px solid rgba(34,211,238,0.3)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 45px rgba(6,182,212,0.12)",
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-cyan-400">
                    <UserCheck size={16} />
                    <span>Recruiter Perspective & Profile Assessment</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-white">
                    How Tech Recruiters & Engineering Managers See You
                  </h3>
                </div>

                <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {analysis.recruiterPerspective?.readinessStatus || "READY: Ready for Frontend & Full-Stack Internships"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths Seen by Recruiters */}
                <div className="p-5 rounded-3xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 size={16} />
                    <span>Profile Strengths</span>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-200">
                    {(analysis.recruiterPerspective?.recruiterStrengths || []).map((s: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas to Improve */}
                <div className="p-5 rounded-3xl bg-amber-500/[0.04] border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <AlertCircle size={16} />
                    <span>Areas to Strengthen</span>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-200">
                    {(analysis.recruiterPerspective?.areasToImprove || []).map((imp: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Overall Impression Quote Card */}
              <div className="p-5 md:p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2 relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span>Overall Recruiter Impression</span>
                </div>
                <blockquote className="text-sm text-gray-200 font-medium italic leading-relaxed pt-1">
                  "{analysis.recruiterPerspective?.overallImpression || "Looks internship-ready with strong frontend skills. Building one production-grade backend project and improving documentation would significantly strengthen this profile."}"
                </blockquote>
              </div>
            </section>

            {/* SECTION 2: Technology Intelligence & Language Distribution */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detected Skills */}
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.025] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm uppercase tracking-wider">
                  <Code2 size={16} className="text-purple-400" />
                  <span>Technology Intelligence (Detected Skills)</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {analysis.detectedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3.5 py-1.5 rounded-2xl text-xs font-bold bg-purple-500/15 border border-purple-500/30 text-purple-200 shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Technology Distribution */}
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.025] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm uppercase tracking-wider">
                  <Sparkles size={16} className="text-cyan-400" />
                  <span>Most Used Languages & Distribution</span>
                </div>
                <div className="space-y-3 pt-2">
                  {analysis.mostUsedLanguages.map((item) => (
                    <div key={item.language} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white">{item.language}</span>
                        <span className="text-cyan-300 font-mono">{item.percentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 3: Top Projects */}
            {analysis.bestProjects.length > 0 && (
              <section className="space-y-5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm uppercase tracking-wider">
                  <Star size={16} className="text-amber-400" />
                  <span>Top 3 Repositories & Best Projects</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {analysis.bestProjects.map((repo) => (
                    <a
                      key={repo.name}
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-6 rounded-[2rem] bg-white/[0.025] border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.05] transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors truncate">
                            {repo.name}
                          </h4>
                          <ExternalLink size={14} className="text-gray-400 group-hover:text-white shrink-0" />
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed font-light">
                          {repo.description || "No description provided."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-white/5 font-medium">
                        {repo.language && <span className="font-bold text-purple-300">{repo.language}</span>}
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star size={12} fill="#fbbf24" />
                            {repo.stars}
                          </span>
                          <span>{repo.updatedAt}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 4 & 5: GitHub Health & Developer Activity */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GitHub Health */}
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.025] border border-white/10 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                    <ShieldCheck size={18} />
                    <span>GitHub Health Report</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {analysis.healthReport.score} / 100
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {analysis.healthReport.strengths.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-emerald-200 font-medium">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                  {analysis.healthReport.improvements.map((imp, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-amber-200 font-medium">
                      <TrendingUp size={15} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Developer Activity Insights */}
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.025] border border-white/10 space-y-5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm uppercase tracking-wider">
                  <Activity size={18} />
                  <span>Developer Activity Insights</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-gray-400 font-medium block">Public Repos</span>
                    <span className="font-bold text-base text-white">{analysis.publicReposCount}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                    <span className="text-gray-400 font-medium block">Most Active Tech</span>
                    <span className="font-bold text-base text-cyan-300">{analysis.activityInsights.mostActiveLanguage || "N/A"}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-1">
                  <span className="font-bold uppercase text-[10px] text-purple-300 tracking-wider block">Activity Status</span>
                  <p>{analysis.activityInsights.recentActivityStatus}</p>
                </div>
              </div>
            </section>

            {/* SECTION 6 & 7: Portfolio Readiness & Learning Roadmap */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Learning Roadmap */}
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.025] border border-white/10 space-y-5">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm uppercase tracking-wider">
                  <Compass size={18} />
                  <span>Personalized Learning Roadmap</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-200">
                  {analysis.detectedSkills.slice(0, 3).map((sk, idx) => (
                    <React.Fragment key={sk}>
                      <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-200">{sk}</span>
                      <ArrowRight size={12} className="text-purple-400" />
                    </React.Fragment>
                  ))}
                  <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-200">REST APIs & Backend</span>
                  <ArrowRight size={12} className="text-cyan-400" />
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200">Docker & Deployment</span>
                </div>
              </div>

              {/* Portfolio Readiness */}
              <div className="p-6 md:p-8 rounded-[2.5rem] bg-white/[0.025] border border-white/10 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm uppercase tracking-wider">
                    <Boxes size={18} />
                    <span>Portfolio Readiness Score</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {Math.min(95, analysis.healthReport.score + 5)}% Ready
                  </span>
                </div>

                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Public repositories published and accessible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Multiple technology stacks detected</span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 8 & 9: Best Developer Insights & AI Recommendations */}
            <section className="p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-purple-950/30 via-black/40 to-cyan-950/30 border border-purple-500/30 space-y-5">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm uppercase tracking-wider">
                <Sparkles size={18} />
                <span>AI Developer Insights & Growth Recommendations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {analysis.aiRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Recommendation #{idx + 1}</span>
                    <p className="text-xs text-gray-200 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 10: Future Ready Integrations Banner */}
            <section className="p-6 rounded-[2rem] bg-white/[0.015] border border-white/5 text-center space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Reserved Integrations Coming Soon</span>
              <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold text-gray-400">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">LeetCode Intelligence</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">HackerRank Intelligence</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">Codeforces Intelligence</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5">Kaggle Intelligence</span>
              </div>
            </section>
          </main>
        ) : null}

        {/* ── CRAWLABLE ELEGANT INFORMATIONAL & FAQ SECTION ── */}
        <section className="w-full mt-24 pt-12 border-t border-purple-500/20 space-y-12 relative z-10">
          <div className="text-center space-y-4 max-w-2xl mx-auto px-4">
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-purple-300 bg-purple-500/10 px-3.5 py-1 rounded-full border border-purple-500/20">
              Developer Knowledge & Overview
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug pt-1">
              GitHub Profile Analytics & Engineering Standards
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed max-w-lg mx-auto">
              Understanding evidence-based developer scoring, repository quality metrics, and portfolio optimization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1 */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3 hover:border-purple-500/30 transition-all">
              <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                <FolderGit2 size={16} className="text-purple-400" />
                What GitHub Intelligence Analyzes
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Paperino GitHub Intelligence inspects public GitHub repositories to evaluate code quality, technical depth (Frontend, Backend, Database), documentation (README completeness), engineering practices (CI/CD, unit tests), and repository categorizations.
              </p>
            </div>

            {/* Box 2 */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3 hover:border-purple-500/30 transition-all">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                Quality Over Quantity
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Raw repository counts, followers, and contribution streaks contribute ZERO direct points to the Developer Score. A single complete, well-architected full-stack application achieves a much higher quality rating than 100 empty or tutorial repos.
              </p>
            </div>

            {/* Box 3 */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3 hover:border-purple-500/30 transition-all">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                Developer Report Generation
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Students can generate a multi-page PDF developer report containing their overall profile score, project quality breakdown, verified strengths, technical gaps, and actionable step-by-step career growth recommendations.
              </p>
            </div>
          </div>

          {/* FAQs Grid */}
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle size={18} className="text-fuchsia-400" />
              Frequently Asked Questions (FAQ)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1.5">
                <h4 className="font-bold text-purple-300">What is a GitHub profile analyzer?</h4>
                <p className="text-gray-400 leading-relaxed">
                  A GitHub profile analyzer inspects public GitHub repositories to evaluate code quality, technical depth, project completeness, documentation, and overall software engineering practices.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-purple-300">How does Paperino GitHub Intelligence score a profile?</h4>
                <p className="text-gray-400 leading-relaxed">
                  Paperino evaluates profiles using an evidence engine across 8 weighted categories: Best Project Quality (30%), Overall Quality (20%), Technical Depth (15%), Engineering Practices (10%), Portfolio Depth (10%), Documentation (5%), Maintenance (5%), and Collaboration (5%).
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-purple-300">Does having more repositories increase my score?</h4>
                <p className="text-gray-400 leading-relaxed">
                  No. Raw repository counts and follower counts contribute ZERO direct points. Meaningful engineering evidence and project quality are prioritized over quantity.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-purple-300">Can I download my GitHub developer report?</h4>
                <p className="text-gray-400 leading-relaxed">
                  Yes! You can generate and download a comprehensive multi-page PDF report containing your profile quality breakdown, strengths, and actionable roadmap.
                </p>
              </div>
            </div>
          </div>

          {/* Internal Linking Banner */}
          <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">Build a complete career profile with Career DNA</h4>
              <p className="text-gray-400">Combine your GitHub intelligence with your resume, skills, and academic CGPA.</p>
            </div>
            <a href="/career-dna" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all shrink-0">
              Build Career DNA →
            </a>
          </div>
        </section>

        {/* ── VERIFIED & EXCLUDED PROJECTS TRANSPARENCY MODAL ── */}
        {showVerifiedModal && analysis && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#0d081f] border border-purple-500/40 p-6 md:p-8 space-y-6 shadow-[0_0_60px_rgba(109,40,217,0.3)]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <ShieldCheck size={16} />
                    <span>Verified vs Excluded Repositories</span>
                  </div>
                  <h3 className="text-xl font-black text-white">Repository Evidence Breakdown</h3>
                </div>
                <button
                  onClick={() => setShowVerifiedModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Verified Projects */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Verified Substantial / Meaningful Projects
                  </span>
                  <span className="text-emerald-400 font-mono">
                    {((analysis.developerMetrics as any)?.transparencyAudit?.verifiedProjectsList || []).length} Verified
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {((analysis.developerMetrics as any)?.transparencyAudit?.verifiedProjectsList || []).length > 0 ? (
                    ((analysis.developerMetrics as any)?.transparencyAudit?.verifiedProjectsList || []).map((p: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block">{p.name}</span>
                          <span className="text-[10px] text-emerald-300 font-semibold">{p.category}</span>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs border border-emerald-500/40">
                          RQS: {p.rqs}/100
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/5 text-xs text-gray-400 text-center">
                      No repositories met substantial or meaningful project quality threshold (RQS &ge; 45).
                    </div>
                  )}
                </div>
              </div>

              {/* Excluded Repositories */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-400" />
                    Excluded Repositories (0 Direct Score Bonus)
                  </span>
                  <span className="text-amber-400 font-mono">
                    {((analysis.developerMetrics as any)?.transparencyAudit?.excludedProjectsList || []).length} Excluded
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {((analysis.developerMetrics as any)?.transparencyAudit?.excludedProjectsList || []).length > 0 ? (
                    ((analysis.developerMetrics as any)?.transparencyAudit?.excludedProjectsList || []).map((p: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5 max-w-[70%]">
                          <span className="font-bold text-gray-200 block truncate">{p.name}</span>
                          <span className="text-[10px] text-gray-400 block">{p.reason}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 text-gray-400 text-[10px] font-mono shrink-0">
                          {p.category}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/5 text-xs text-gray-400 text-center">
                      No repositories excluded.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => setShowVerifiedModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Close Audit Transparency
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
