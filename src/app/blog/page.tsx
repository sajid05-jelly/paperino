import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Calendar, Clock, ArrowRight, Sparkles, GraduationCap } from "lucide-react";
import { SITE_CONFIG } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Engineering Blog & Study Guides | Paperino",
  description: "Comprehensive guides, exam preparation tips, GPA scoring strategies, and study materials for engineering students at SRM University.",
  alternates: {
    canonical: `${SITE_CONFIG.baseUrl}/blog`,
  },
};

export const BLOG_POSTS = [
  {
    slug: "paperino-srm-study-hub",
    title: "Paperino: Your All-in-One SRM Study Hub for Notes, PYQs, and Smarter Learning",
    summary: "Discover how Paperino empowers SRM students with semester-wise notes, previous year question papers, AI study tools, and GPA calculators.",
    date: "October 10, 2026",
    readTime: "6 min read",
    category: "Platform Guide",
    tagColor: "violet",
  },
  {
    slug: "how-to-score-9-cgpa-in-srm",
    title: "How to Score 9+ CGPA in SRM University: Proven Semester Study Strategies",
    summary: "A practical roadmap for engineering students to master internal assessments, semester exams, credit weightage, and high-scoring study habits.",
    date: "November 25, 2026",
    readTime: "8 min read",
    category: "Academic Success",
    tagColor: "fuchsia",
  },
  {
    slug: "engineering-exam-pyq-preparation-guide",
    title: "The Ultimate Guide to Engineering Exam Preparation: Why PYQs Are Your Secret Weapon",
    summary: "Learn how analyzing previous year question papers helps predict repeated exam patterns, optimize revision time, and score top grades.",
    date: "November 25, 2026",
    readTime: "7 min read",
    category: "Exam Strategy",
    tagColor: "cyan",
  },
  {
    slug: "mastering-ats-resumes-for-campus-placements",
    title: "Mastering ATS Resumes for College Campus Placements & Tech Internships",
    summary: "Step-by-step techniques to format engineering resumes, incorporate keyword density, beat Applicant Tracking Systems, and land interview calls.",
    date: "November 25, 2026",
    readTime: "7 min read",
    category: "Career & Placements",
    tagColor: "emerald",
  },
];

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-[#05030a] relative overflow-hidden py-20 px-6 sm:px-12 selection:bg-violet-500/30">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[20%] w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-widest mb-6">
            <BookOpen size={14} className="text-violet-400" />
            <span>Academic Knowledge Base</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
            Engineering Insights &amp; Study Guides
          </h1>
          <p className="text-base sm:text-lg text-violet-200/60 max-w-2xl mx-auto">
            Practical strategies, exam roadmaps, and career insights designed to help engineering students excel at SRM University.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="glass-panel p-7 rounded-3xl border border-white/10 hover:border-violet-500/40 bg-[#0d071a]/80 hover:bg-[#120a24] transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.2)]"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300 bg-violet-500/15 border border-violet-500/30 px-3 py-1 rounded-full">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-violet-400" /> {post.readTime}
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white group-hover:text-violet-200 transition-colors line-clamp-2 mb-3">
                  {post.title}
                </h2>
                <p className="text-sm text-violet-200/65 line-clamp-3 leading-relaxed mb-6">
                  {post.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Calendar size={13} /> {post.date}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-400 group-hover:text-violet-300 group-hover:translate-x-1 transition-all">
                  <span>Read Article</span>
                  <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
