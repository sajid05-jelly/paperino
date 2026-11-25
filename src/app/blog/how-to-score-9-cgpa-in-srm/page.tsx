import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, BookOpen, Target, CheckCircle2, Award } from "lucide-react";
import { SITE_CONFIG } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "How to Score 9+ CGPA in SRM University: Proven Semester Study Strategies | Paperino",
  description: "A comprehensive guide for SRM engineering students on balancing internal marks, semester exams, credit distribution, and practical study routines to achieve a 9+ CGPA.",
  alternates: {
    canonical: `${SITE_CONFIG.baseUrl}/blog/how-to-score-9-cgpa-in-srm`,
  },
};

export default function CgpaGuidePage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/30 px-3 py-1 rounded-full">
            Academic Success
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mt-4 mb-4">
            How to Score 9+ CGPA in SRM University: Proven Semester Study Strategies
          </h1>
          <div className="flex items-center gap-4 text-xs text-gray-400 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Calendar size={13} className="text-violet-400" /> November 25, 2026</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><Clock size={13} className="text-violet-400" /> 8 min read</span>
            <span>•</span>
            <span>By Paperino Academic Team</span>
          </div>
        </div>

        <div className="space-y-8 text-violet-200/80 leading-relaxed text-base sm:text-lg">
          <p>
            Securing a cumulative grade point average (CGPA) above 9.0 in engineering at SRM Institute of Science and Technology is one of the highest leverage milestones for a student. A 9+ CGPA not only qualifies you for Tier-1 dream company placements and top overseas master&apos;s programs but also opens doors to academic scholarships and research fellowships.
          </p>

          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 pt-4">
            <Target className="text-fuchsia-400" size={22} />
            1. Master the Internal Assessment Blueprint (CLA &amp; Cycle Tests)
          </h2>
          <p>
            Many students mistakenly believe that semester end examinations decide their grade. In SRM&apos;s curriculum, continuous internal evaluation (Continuous Learning Assessments, Assignments, and Cycle Tests) carries significant weight. Scoring full marks in internals relieves immense pressure during final exams.
          </p>
          <ul className="space-y-2.5 pl-4 border-l-2 border-fuchsia-500/40">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-fuchsia-400 shrink-0 mt-1" />
              <span><strong>Never miss CLA deadlines:</strong> Submission timeliness often determines whether you get top-tier assignment marks.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-fuchsia-400 shrink-0 mt-1" />
              <span><strong>Aim for 90%+ in Cycle Tests:</strong> Internal test questions are typically direct applications of classroom examples. Solving tutorial sheets guarantees high scores.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 pt-4">
            <BookOpen className="text-violet-400" size={22} />
            2. The 80/20 Rule for Engineering Syllabi
          </h2>
          <p>
            Engineering courses have extensive course outcomes. However, the Pareto Principle strongly applies: roughly 80% of university exam marks originate from 20% of core concepts, derivations, and problem types.
          </p>
          <p>
            Using Paperino&apos;s curated subject notes and semester materials allows you to pinpoint these high-yield topics without getting overwhelmed by 600-page foreign author textbooks.
          </p>

          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 pt-4">
            <Award className="text-cyan-400" size={22} />
            3. Prioritize High-Credit Courses
          </h2>
          <p>
            Your GPA is a credit-weighted average. A 4-credit mathematics or data structures course impacts your GPA twice as much as a 2-credit elective. Calculate your semester goals using the Paperino GPA Calculator before the semester begins to visualize where to invest your daily study hours.
          </p>

          <div className="glass-panel p-6 rounded-2xl border border-violet-500/30 bg-violet-950/20 my-8">
            <h3 className="text-lg font-bold text-white mb-2">Key Takeaway</h3>
            <p className="text-sm text-violet-200/80">
              Consistency outperforms cramming. Spending 45 minutes every evening reviewing lecture slides and solving one previous year question paper is all it takes to maintain a 9+ CGPA throughout your 4 years at SRM.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
