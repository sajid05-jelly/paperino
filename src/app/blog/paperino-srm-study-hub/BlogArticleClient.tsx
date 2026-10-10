"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Calculator,
  FileText,
  Search,
  MonitorPlay,
  Shield,
  Gamepad2,
  Zap,
  Globe,
  FolderGit2,
  Briefcase,
  Upload,
  Clock,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Star,
  Users,
  Crown,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

/* ────────────────────────────────────────────────
   TABLE OF CONTENTS
   ──────────────────────────────────────────────── */

const TOC = [
  { id: "what-is-paperino", label: "What is Paperino?" },
  { id: "study-materials", label: "Study Materials & PYQs" },
  { id: "gpa-calculator", label: "GPA & CGPA Calculator" },
  { id: "ai-tools", label: "AI-Powered Study Tools" },
  { id: "youtube-study", label: "YouTube Study" },
  { id: "labs", label: "Paperino Labs" },
  { id: "pulse", label: "Paperino Pulse" },
  { id: "challenges", label: "Weekly Challenges" },
  { id: "community", label: "Community & Contributors" },
  { id: "avatar-studio", label: "Avatar Studio" },
  { id: "plans", label: "Plans & Pricing" },
  { id: "get-started", label: "Get Started" },
];

const TAGS = [
  "SRM Study Materials",
  "Previous Year Questions",
  "AI Exam Tools",
  "GPA Calculator",
  "YouTube Study",
  "Career Guidance",
  "Student Platform",
  "Engineering Notes",
  "Exam Preparation",
];

/* ────────────────────────────────────────────────
   SECTION COMPONENT
   ──────────────────────────────────────────────── */

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-14 md:mb-16">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10">{icon}</div>
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="text-gray-300 leading-relaxed space-y-4 text-[15px] md:text-base">{children}</div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   FEATURE CARD
   ──────────────────────────────────────────────── */

function FeatureCard({
  href,
  icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group block p-5 rounded-2xl bg-white/[0.025] border border-white/10 hover:border-violet-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]"
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-white/[0.05] shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
              {title}
            </h3>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </div>
        <ChevronRight
          size={14}
          className="text-gray-600 group-hover:text-violet-400 transition-colors shrink-0 mt-1"
        />
      </div>
    </Link>
  );
}

/* ────────────────────────────────────────────────
   MAIN CLIENT COMPONENT
   ──────────────────────────────────────────────── */

export default function BlogArticleClient() {
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#05030a] relative overflow-hidden selection:bg-violet-500/30">
      {/* Ambient background */}
      <div className="absolute top-[-10%] left-[20%] w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.12)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[120px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(var(--secondary-rgb),0.08)_0%,transparent_70%)] rounded-full mix-blend-screen filter blur-[140px] animate-[pulse_10s_ease-in-out_infinite_reverse] pointer-events-none" />

      <article className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 pt-16 pb-24">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-1.5 text-xs text-gray-500">
            <li>
              <Link href="/" className="hover:text-violet-300 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight size={10} />
            </li>
            <li className="text-violet-300 font-medium">Blog</li>
          </ol>
        </nav>

        {/* ─── HERO ─── */}
        <header className="mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/[0.06] border border-violet-500/[0.15] backdrop-blur-3xl mb-6 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] font-bold text-violet-200 uppercase tracking-[0.2em]">
              Platform Guide
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5 tracking-tight">
            Paperino: Your All-in-One SRM Study Hub for Notes, PYQs, AI Tools and Smarter Learning
          </h1>

          <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-3xl">
            A comprehensive guide to every study resource, academic calculator, AI-powered tool, and
            campus utility available on Paperino — built for SRM students, by SRM students.
          </p>

          {/* Meta line */}
          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <GraduationCap size={13} />
              <span>By S. Mohamed Sajid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={13} />
              <span>15 min read</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText size={13} />
              <span>October 10, 2026</span>
            </div>
          </div>
        </header>

        {/* ─── TABLE OF CONTENTS ─── */}
        <div className="mb-12 md:mb-16 backdrop-blur-3xl bg-white/[0.025] border border-white/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <div className="flex items-center gap-2.5">
              <Menu size={16} className="text-violet-400" />
              <span className="text-sm font-bold text-white">Table of Contents</span>
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-500 transition-transform duration-200 ${tocOpen ? "rotate-180" : ""}`}
            />
          </button>
          {tocOpen && (
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOC.map((item, idx) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={() => setTocOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-violet-300 hover:bg-white/[0.03] transition-all"
                    >
                      <span className="text-[10px] text-violet-500 font-bold w-5">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────
            ARTICLE BODY
            ──────────────────────────────────────────── */}

        <Section id="what-is-paperino" icon={<BookOpen size={20} className="text-violet-400" />} title="What is Paperino?">
          <p>
            Paperino is an academic platform designed specifically for students at SRM Institute of Science and Technology. It brings together study materials, AI-powered preparation tools, campus utilities, and career guidance into a single, cohesive experience.
          </p>
          <p>
            Rather than juggling between scattered WhatsApp groups, random Google Drive links, and multiple websites, Paperino gives you one reliable place where you can find semester-wise notes, previous year question papers, GPA calculators, and much more — organized by your exact course and semester.
          </p>
          <p>
            The platform is built and maintained by SRM students who understand the academic ecosystem firsthand. Every feature addresses a real problem that students face during their university life.
          </p>
        </Section>

        <Section id="study-materials" icon={<FileText size={20} className="text-cyan-400" />} title="Semester-Wise Study Materials & Previous Year Questions">
          <p>
            The core of Paperino is its organized library of academic resources. Materials are arranged by department (B.Tech, MCA, B.Com, B.Sc, and more), semester, and subject — so you can navigate directly to what you need without searching through unrelated files.
          </p>
          <p>For each subject, you can find:</p>
          <ul className="list-none space-y-2 ml-1">
            <li className="flex items-start gap-2"><span className="text-violet-400 mt-1.5">•</span><span><strong className="text-white">Previous Year Question Papers (PYQs)</strong> — actual exam papers from past semesters, useful for understanding question patterns and expected difficulty levels.</span></li>
            <li className="flex items-start gap-2"><span className="text-violet-400 mt-1.5">•</span><span><strong className="text-white">Lecture Notes</strong> — comprehensive notes covering syllabus topics, shared by students and verified by the community.</span></li>
            <li className="flex items-start gap-2"><span className="text-violet-400 mt-1.5">•</span><span><strong className="text-white">Lab Manuals</strong> — practical experiment documentation and lab procedures for laboratory courses.</span></li>
            <li className="flex items-start gap-2"><span className="text-violet-400 mt-1.5">•</span><span><strong className="text-white">Important Questions</strong> — curated sets of high-weightage questions frequently appearing in exams.</span></li>
          </ul>
          <p>
            The subject catalog covers semesters 1 through 8, with subjects ranging from Calculus and Linear Algebra in the first semester to advanced specialization electives in later semesters. New subjects are continuously added through community contributions and student requests.
          </p>
          <p>
            Free-tier users get 5 material downloads per month. <Link href="/pricing" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Paid plans</Link> increase this to 10 (Plus) or unlimited (Pro and Premium).
          </p>

          <div className="mt-6">
            <FeatureCard
              href="/courses"
              icon={<BookOpen size={16} className="text-cyan-400" />}
              title="Browse Study Materials"
              description="Navigate by department, semester, and subject to find notes, PYQs, and lab manuals."
            />
          </div>
        </Section>

        <Section id="gpa-calculator" icon={<Calculator size={20} className="text-emerald-400" />} title="GPA & CGPA Calculator">
          <p>
            Paperino includes a built-in academic calculator that follows the university grading system. You can calculate your Semester GPA (SGPA) by entering subject credits and grades, or compute your Cumulative GPA (CGPA) across multiple semesters.
          </p>
          <p>
            The calculator uses the official 10-point grading scale: O (10), A+ (9), A (8), B+ (7), B (6), C (5), and F (0). It accounts for credit weighting to give you an accurate GPA that matches your official transcript.
          </p>
          <p>
            Plus subscribers and above also get access to the <strong className="text-white">Semester Target Calculator</strong>, which works in reverse — you enter your current internal marks and desired final grade, and it calculates the minimum marks you need in the semester exam to hit your target.
          </p>
          <p>
            Paperino also has a dedicated <Link href="/grades" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Grading System</Link> reference page that shows the complete university evaluation scale, percentage thresholds, and result statuses.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard
              href="/gpa"
              icon={<Calculator size={16} className="text-emerald-400" />}
              title="GPA Calculator"
              description="Calculate SGPA and CGPA with the official university grading scale."
            />
            <FeatureCard
              href="/grades"
              icon={<Star size={16} className="text-yellow-400" />}
              title="Grading System"
              description="View the complete university evaluation scale and grade boundaries."
            />
          </div>
        </Section>

        <Section id="ai-tools" icon={<Zap size={20} className="text-amber-400" />} title="AI-Powered Study Tools">
          <p>
            Paperino integrates AI capabilities to help students prepare more efficiently. These tools use large language models to analyze academic content and generate actionable insights.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-2">PYQ Analyzer & Exam Predictor</h3>
          <p>
            The PYQ Analyzer lets you upload multiple past question papers for a subject. It uses client-side OCR to extract text from scanned PDFs, then sends the content to an AI model that identifies recurring topics, frequently tested concepts, and potential high-weightage questions for upcoming exams.
          </p>
          <p>
            This is particularly useful when you have limited preparation time and need to prioritize which topics to study first. Available on Plus (4 uses/month), Pro (11 uses/month), and Premium (unlimited).
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-2">ATS Resume Analyzer</h3>
          <p>
            When preparing for placements and internships, having an ATS-compatible resume matters. The ATS Analyzer scans your resume (PDF or Word format), evaluates it against Applicant Tracking System standards, and provides a compatibility score along with specific suggestions for improvement — such as missing keywords, formatting issues, or structural problems.
          </p>
          <p>
            Free users get 2 analyses per month, with higher limits on paid plans.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-2">Exam Emergency Mode</h3>
          <p>
            For those last-minute preparation sessions, Exam Emergency Mode provides rapid access to essential study packets — formula sheets, key concepts, and top-priority questions filtered for maximum exam coverage in minimum time. Available on Pro and Premium plans.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard
              href="/pyq"
              icon={<Search size={16} className="text-amber-400" />}
              title="PYQ Analyzer"
              description="Upload past papers and let AI predict high-weightage topics for your next exam."
              badge="AI"
            />
            <FeatureCard
              href="/ats"
              icon={<Briefcase size={16} className="text-blue-400" />}
              title="ATS Resume Analyzer"
              description="Check your resume against ATS standards and get actionable improvement tips."
              badge="AI"
            />
          </div>
        </Section>

        <Section id="youtube-study" icon={<MonitorPlay size={20} className="text-red-400" />} title="YouTube Study — Video Learning Inside Paperino">
          <p>
            YouTube Study is Paperino&apos;s integrated video learning feature. Instead of searching YouTube manually and getting distracted by unrelated recommendations, you can search for specific syllabus topics directly within Paperino.
          </p>
          <p>
            The tool uses AI to understand your topic — even if you type in Tamil, Tanglish, or informal phrasing — and translates it into optimized YouTube search queries. It then ranks the results based on educational relevance, suitable video duration (prioritizing 5–30 minute lectures), language preference (Tamil or English), and content quality signals.
          </p>
          <p>
            Each result card shows the video title, channel name, duration, detected language, and an AI relevance score. You can watch the selected video directly inside Paperino&apos;s embedded player without leaving the platform.
          </p>
          <p>
            YouTube Study is available on Pro and Premium plans.
          </p>

          <div className="mt-6">
            <FeatureCard
              href="/youtube-study"
              icon={<MonitorPlay size={16} className="text-red-400" />}
              title="YouTube Study"
              description="Search for topic-specific educational videos in Tamil or English and watch them inside Paperino."
              badge="PRO"
            />
          </div>
        </Section>

        <Section id="labs" icon={<Sparkles size={20} className="text-purple-400" />} title="Paperino Labs — Campus Utilities & Career Tools">
          <p>
            Paperino Labs is a collection of specialized tools designed around the practical needs of university students. These go beyond study materials to address day-to-day campus life and career preparation.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-2">Attendance Shield</h3>
          <p>
            The Attendance Shield (also known as the &quot;75% Calculator&quot;) helps you manage your attendance percentage. Enter your current attendance data, and it calculates exactly how many classes you can safely skip — or how many consecutive lectures you need to attend to recover above the 75% threshold. Free for all users.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-2">Free Class Finder</h3>
          <p>
            A crowdsourced tool that shows which classrooms are currently vacant across campus. Filter by building, floor, and amenities (like AC or seating capacity). Students can validate or update classroom availability in real time. Free for all users.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-2">Senior Insights</h3>
          <p>
            Verified course survival guides written by seniors who have already completed the subject. Get practical tips on teacher scoring patterns, preparation strategies, important chapters, and difficulty levels. Available on Plus plans and above.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-2">Career DNA</h3>
          <p>
            Career DNA maps your technical profile — CGPA, programming skills, and GitHub experience — against live internship opportunities. It generates a tailored career roadmap and matches you with relevant opportunities from platforms like Unstop. Available on Pro and Premium plans.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-2">GitHub Intelligence</h3>
          <p>
            A deep audit of your public GitHub profile and repositories. It evaluates code quality, documentation, testing practices, and project complexity, then generates a downloadable PDF developer report card. Free users get 2 audits per month, with higher limits on paid plans.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard
              href="/attendance-mafia"
              icon={<Shield size={16} className="text-green-400" />}
              title="Attendance Shield"
              description="Calculate exactly how many classes you can skip or need to attend."
            />
            <FeatureCard
              href="/free-class-finder"
              icon={<Search size={16} className="text-teal-400" />}
              title="Free Class Finder"
              description="Find vacant classrooms across campus in real time."
            />
            <FeatureCard
              href="/career-dna"
              icon={<Briefcase size={16} className="text-orange-400" />}
              title="Career DNA"
              description="Get AI-matched career roadmaps and internship recommendations."
              badge="PRO"
            />
            <FeatureCard
              href="/github-intelligence"
              icon={<FolderGit2 size={16} className="text-purple-400" />}
              title="GitHub Intelligence"
              description="Deep audit your GitHub profile and generate a developer report card."
              badge="AI"
            />
          </div>
        </Section>

        <Section id="pulse" icon={<Globe size={20} className="text-pink-400" />} title="Paperino Pulse — Campus Opportunity Radar">
          <p>
            Paperino Pulse is a real-time feed that aggregates verified student opportunities — hackathons, internships, technical workshops, coding competitions, and placement drives. Instead of monitoring dozens of WhatsApp groups and social media pages, you get a single, curated stream of relevant opportunities.
          </p>
          <p>
            Each listing is verified and includes relevant details like deadlines, eligibility, and direct application links. Pulse also features unread notification counters so you can quickly catch up on new opportunities since your last visit.
          </p>
          <p>
            Paperino Pulse is free for all users.
          </p>

          <div className="mt-6">
            <FeatureCard
              href="/pulse"
              icon={<Globe size={16} className="text-pink-400" />}
              title="Paperino Pulse"
              description="Real-time feed of hackathons, internships, workshops, and placement opportunities."
            />
          </div>
        </Section>

        <Section id="challenges" icon={<Gamepad2 size={20} className="text-yellow-400" />} title="Weekly Challenges — Gamified Brain Training">
          <p>
            Every week, Paperino hosts a series of brain-training challenges that test logic, memory, vocabulary, and cognitive reflexes. These aren&apos;t academic quizzes — they&apos;re fun, competitive mini-games designed to sharpen your thinking skills.
          </p>
          <p>The current challenge lineup includes:</p>
          <ul className="list-none space-y-2 ml-1">
            <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1.5">•</span><span><strong className="text-white">Code Breaker</strong> — crack hidden numerical passcodes through logic deduction.</span></li>
            <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1.5">•</span><span><strong className="text-white">Memory Matrix</strong> — recall flashing grid patterns in a visual memory test.</span></li>
            <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1.5">•</span><span><strong className="text-white">Impossible Room</strong> — solve lateral thinking escape room puzzles.</span></li>
            <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1.5">•</span><span><strong className="text-white">Word Forge</strong> — assemble valid words from letter sets under time pressure.</span></li>
            <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1.5">•</span><span><strong className="text-white">Target Number</strong> — hit target numbers using given arithmetic operations.</span></li>
            <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1.5">•</span><span><strong className="text-white">Memory Heist</strong> — a timed visual recall challenge testing attention to detail.</span></li>
            <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1.5">•</span><span><strong className="text-white">The Impostor</strong> — a clue-based elimination game.</span></li>
            <li className="flex items-start gap-2"><span className="text-yellow-400 mt-1.5">•</span><span><strong className="text-white">Paradox</strong> — a high-speed cognitive reflex challenge.</span></li>
          </ul>
          <p>
            Each student gets one official attempt per challenge. Scores are ranked on a live weekly leaderboard. Challenges are scheduled on Tuesdays, Thursdays, and Fridays.
          </p>
          <p>Weekly Challenges are free for all users.</p>

          <div className="mt-6">
            <FeatureCard
              href="/weekly-challenges"
              icon={<Gamepad2 size={16} className="text-yellow-400" />}
              title="Weekly Challenges"
              description="Test your logic, memory, and reflexes in competitive brain-training mini-games."
            />
          </div>
        </Section>

        <Section id="community" icon={<Users size={20} className="text-rose-400" />} title="Community Contributions & Contributor Rewards">
          <p>
            Paperino grows through its community. Any registered student can upload study materials — notes, question papers, lab manuals — through the <Link href="/contributor/upload" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Contributor Upload</Link> page. Submitted materials go through a review process before being published.
          </p>
          <p>
            There&apos;s a genuine incentive to contribute: students who get <strong className="text-white">10 or more uploads approved</strong> automatically unlock <strong className="text-white">Paperino Plus for free</strong> — no subscription payment required. This includes benefits like PDF preview, Senior Insights, Semester Calculator, and increased monthly usage limits.
          </p>
          <p>
            Contributors can track their upload history, approval statuses, and earned benefits from their <Link href="/contributor" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Contributor Dashboard</Link>. Students can also suggest new subjects or courses they want to see on the platform.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard
              href="/contributor/upload"
              icon={<Upload size={16} className="text-rose-400" />}
              title="Upload Materials"
              description="Share your notes, PYQs, and lab manuals with the community."
            />
            <FeatureCard
              href="/team"
              icon={<Users size={16} className="text-emerald-400" />}
              title="Become a Contributor"
              description="Learn how contributing helps you and earns free Plus access."
            />
          </div>
        </Section>

        <Section id="avatar-studio" icon={<Crown size={20} className="text-fuchsia-400" />} title="Avatar Studio & Profile Customization">
          <p>
            Your Paperino profile is more than just a name. The Avatar Studio lets you personalize your identity on the platform with custom avatars, animated neon profile frames, floating companion mascots, and collectible badges.
          </p>
          <p>
            Different customization tiers unlock at different subscription levels — avatar changes start at Plus, profile frames at Pro, and animated companions at Premium. You also earn XP points through platform activity and challenge participation.
          </p>

          <div className="mt-6">
            <FeatureCard
              href="/avatar-studio"
              icon={<Crown size={16} className="text-fuchsia-400" />}
              title="Avatar Studio"
              description="Customize your profile with avatars, frames, companions, and badges."
            />
          </div>
        </Section>

        <Section id="plans" icon={<Star size={20} className="text-violet-400" />} title="Plans & Pricing">
          <p>
            Paperino offers a generous free tier that covers essential academic tools. Paid plans unlock advanced AI features, higher usage limits, and profile customizations.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-3 text-gray-500 font-bold uppercase tracking-wider">Plan</th>
                  <th className="text-center py-3 px-3 text-gray-500 font-bold uppercase tracking-wider">Free</th>
                  <th className="text-center py-3 px-3 text-gray-500 font-bold uppercase tracking-wider">Plus ₹29</th>
                  <th className="text-center py-3 px-3 text-violet-400 font-bold uppercase tracking-wider">Pro ₹59</th>
                  <th className="text-center py-3 px-3 text-gray-500 font-bold uppercase tracking-wider">Premium ₹99</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                <tr className="border-b border-white/5"><td className="py-2 px-3 text-white font-medium">Downloads</td><td className="text-center py-2">5/mo</td><td className="text-center py-2">10/mo</td><td className="text-center py-2">Unlimited</td><td className="text-center py-2">Unlimited</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3 text-white font-medium">GPA Calculator</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3 text-white font-medium">Challenges & Pulse</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3 text-white font-medium">PDF Preview</td><td className="text-center py-2">—</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3 text-white font-medium">PYQ Analyzer</td><td className="text-center py-2">—</td><td className="text-center py-2">4/mo</td><td className="text-center py-2">11/mo</td><td className="text-center py-2">Unlimited</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3 text-white font-medium">Career DNA</td><td className="text-center py-2">—</td><td className="text-center py-2">—</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3 text-white font-medium">YouTube Study</td><td className="text-center py-2">—</td><td className="text-center py-2">—</td><td className="text-center py-2">✓</td><td className="text-center py-2">✓</td></tr>
                <tr><td className="py-2 px-3 text-white font-medium">Exam Emergency</td><td className="text-center py-2">—</td><td className="text-center py-2">—</td><td className="text-center py-2">11/mo</td><td className="text-center py-2">Unlimited</td></tr>
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Students who contribute 10 or more approved uploads automatically receive Paperino Plus at no cost.
          </p>

          <div className="mt-6">
            <FeatureCard
              href="/pricing"
              icon={<Star size={16} className="text-violet-400" />}
              title="View All Plans"
              description="Compare features across Free, Plus, Pro, and Premium plans."
            />
          </div>
        </Section>

        <Section id="get-started" icon={<ArrowRight size={20} className="text-green-400" />} title="Getting Started with Paperino">
          <p>
            Getting started takes about 30 seconds. Sign in with your Google account, and you immediately have access to all free-tier features — study materials, GPA calculator, Attendance Shield, Paperino Pulse, Weekly Challenges, and more.
          </p>
          <p>
            If you want to contribute, head to the <Link href="/contributor/upload" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">upload page</Link> and start sharing your notes. Ten approved uploads unlock Plus for free.
          </p>
          <p>
            For advanced AI tools like PYQ Analyzer, YouTube Study, and Career DNA, check the <Link href="/pricing" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">pricing page</Link> to find a plan that fits your needs. All paid plans are monthly subscriptions with no long-term commitment.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/courses"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.45)] transition-all"
            >
              <BookOpen size={16} />
              Explore Study Materials
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-violet-500/30 text-gray-300 hover:text-white font-bold text-sm transition-all"
            >
              <Crown size={16} />
              View Plans
            </Link>
          </div>
        </Section>

        {/* ─── TAGS ─── */}
        <div className="mt-16 pt-8 border-t border-white/5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Tags</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] text-gray-400 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ─── AUTHOR ─── */}
        <div className="mt-10 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">S</div>
            <div>
              <p className="text-sm font-bold text-white">S. Mohamed Sajid</p>
              <p className="text-xs text-gray-500">B.Tech Computer Science, SRM University • Lead Developer, Paperino</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
