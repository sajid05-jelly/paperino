import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, CheckCircle2, ShieldCheck, FileText, Zap } from "lucide-react";
import { SITE_CONFIG } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Mastering ATS Resumes for College Campus Placements & Tech Internships | Paperino",
  description: "An actionable guide for engineering students to optimize resumes for Applicant Tracking Systems (ATS), target keyword density, and secure placement shortlists.",
  alternates: {
    canonical: `${SITE_CONFIG.baseUrl}/blog/mastering-ats-resumes-for-campus-placements`,
  },
};

export default function AtsGuidePage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
            Career &amp; Placements
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mt-4 mb-4">
            Mastering ATS Resumes for College Campus Placements &amp; Tech Internships
          </h1>
          <div className="flex items-center gap-4 text-xs text-gray-400 border-b border-white/10 pb-6">
            <span className="flex items-center gap-1.5"><Calendar size={13} className="text-violet-400" /> November 25, 2026</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><Clock size={13} className="text-violet-400" /> 7 min read</span>
            <span>•</span>
            <span>By Paperino Career Insights</span>
          </div>
        </div>

        <div className="space-y-8 text-violet-200/80 leading-relaxed text-base sm:text-lg">
          <p>
            When top tech companies like Amazon, Microsoft, TCS, and Zoho visit college campuses, they receive thousands of applications. Before a human recruiter ever sees your resume, an automated <strong>Applicant Tracking System (ATS)</strong> parses your PDF and ranks you based on relevance.
          </p>

          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 pt-4">
            <FileText className="text-emerald-400" size={22} />
            1. Why 75% of Student Resumes Get Rejected by ATS
          </h2>
          <p>
            Most students design fancy two-column resumes using graphic templates with icons, tables, text boxes, and skill progress bars. ATS algorithms cannot parse complex columns or graphical elements, leading to garbled text and immediate disqualification.
          </p>
          <ul className="space-y-2.5 pl-4 border-l-2 border-emerald-500/40">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-1" />
              <span><strong>Use Clean Single-Column Layouts:</strong> Standard fonts like Arial, Calibri, or Roboto guarantee 100% parser compatibility.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-1" />
              <span><strong>Avoid Graphic Bars for Skills:</strong> Instead of &quot;Java ★★★★☆&quot;, list exact frameworks and keywords: &quot;Java, Spring Boot, JUnit, REST APIs&quot;.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 pt-4">
            <Zap className="text-amber-400" size={22} />
            2. The Google X-Y-Z Formula for Project Bullet Points
          </h2>
          <p>
            Avoid passive project descriptions like <em>&quot;Built an e-commerce website using React&quot;</em>. Use Google&apos;s proven formula:
          </p>
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-white/5 my-4 text-sm font-mono text-emerald-300">
            &quot;Accomplished [X] as measured by [Y], by doing [Z]&quot;
          </div>
          <p>
            <em>Example:</em> &quot;Architected an e-commerce platform serving 1,200 concurrent student users with sub-200ms API latency by implementing Redis caching and Next.js server components.&quot;
          </p>

          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 pt-4">
            <ShieldCheck className="text-violet-400" size={22} />
            3. Test Your Resume with Paperino ATS
          </h2>
          <p>
            Before sending your resume to recruiters, upload it to the free <strong>Paperino ATS Resume Analyzer</strong>. Our system evaluates formatting score, section completeness, keyword matching, and word count to ensure your resume scores in the top 90th percentile of applicants.
          </p>
        </div>
      </div>
    </article>
  );
}
