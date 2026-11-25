import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, CheckCircle2, TrendingUp, HelpCircle } from "lucide-react";
import { SITE_CONFIG } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "The Ultimate Guide to Engineering Exam Preparation: Why PYQs Are Your Secret Weapon | Paperino",
  description: "Learn how systematic previous year question paper (PYQ) analysis unlocks higher semester grades, predicts repeated derivation patterns, and reduces exam anxiety.",
  alternates: {
    canonical: `${SITE_CONFIG.baseUrl}/blog/engineering-exam-pyq-preparation-guide`,
  },
};

export default function PyqGuidePage() {
  return (
    <article className="min-h-screen bg-[#05030a] relative overflow-hidden py-20 px-6 sm:px-12 selection:bg-violet-500/30">
      <div className="max-w-3xl mx-auto relative z-10">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Guides</span>
        </Link>

        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 rounded-full">
            Exam Strategy
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mt-4 mb-4">
            The Ultimate Guide to Engineering Exam Preparation: Why PYQs Are Your Secret Weapon
          </h1>
          <div className="flex items-center gap-4 text-xs text-gray-400 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Calendar size={13} className="text-violet-400" /> November 25, 2026</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><Clock size={13} className="text-violet-400" /> 7 min read</span>
            <span>•</span>
            <span>By Paperino Editorial Team</span>
          </div>
        </div>

        <div className="space-y-8 text-violet-200/80 leading-relaxed text-base sm:text-lg">
          <p>
            Every semester, engineering students face a mountain of course material just two weeks before finals. While some students read textbooks cover-to-cover, top rankers rely on a far more effective technique: <strong>Reverse Engineering Previous Year Question Papers (PYQs)</strong>.
          </p>

          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 pt-4">
            <TrendingUp className="text-cyan-400" size={22} />
            1. Pattern Recognition &amp; Repeated Derivations
          </h2>
          <p>
            University question papers are curated by professors adhering to specific curriculum benchmarks. In subjects like Circuit Theory, Signals and Systems, Database Management, and Operating Systems, certain classic derivations and architectural comparisons recur every 2 to 3 exam cycles.
          </p>
          <ul className="space-y-2.5 pl-4 border-l-2 border-cyan-500/40">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-cyan-400 shrink-0 mt-1" />
              <span><strong>Identify Recurring 16-Mark Questions:</strong> Long-answer questions almost always target the same fundamental pillars of a unit.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-cyan-400 shrink-0 mt-1" />
              <span><strong>Uncover Common Numerical Variants:</strong> Numerical problems often repeat the exact same formula with updated constants.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 pt-4">
            <HelpCircle className="text-purple-400" size={22} />
            2. The 3-Step PYQ Mastery Framework
          </h2>
          <ol className="space-y-4 list-decimal pl-6">
            <li>
              <strong>Gather the Past 5 Exam Cycles:</strong> Download the verified semester question papers directly from Paperino for your department.
            </li>
            <li>
              <strong>Tally Unit-by-Unit Frequency:</strong> Mark which topics appeared in Section B and Section C across all 5 years.
            </li>
            <li>
              <strong>Solve Under Timed Conditions:</strong> Attempt one full past paper in 3 hours without notes. This builds exam stamina and eliminates time-management panic.
            </li>
          </ol>

          <p>
            By centering your study sessions around authentic question patterns, you dramatically reduce study fatigue and enter the exam hall with unshakable confidence.
          </p>
        </div>
      </div>
    </article>
  );
}
