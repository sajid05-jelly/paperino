import { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Mail, ShieldCheck, ArrowRight, Layout, Sparkles, CheckCircle2 } from "lucide-react";
import AmbientOrbs from "@/components/AmbientOrbs";

export const metadata: Metadata = {
  title: "Advertise With Us | Paperino",
  description: "Promote your brand, educational programs, and developer tools directly to thousands of engineering students across SRM University and partner colleges on Paperino.",
};

export default function AdvertisePage() {
  const placements = [
    {
      code: "AD 01",
      name: "Homepage Top Banner",
      ratio: "8:1 ratio (Desktop & Mobile)",
      desc: "Prime horizontal placement positioned immediately beneath the main navigation bar, greeting every visitor upon arrival.",
    },
    {
      code: "AD 02",
      name: "Homepage Featured Showcase",
      ratio: "3:1 or 4:1 ratio (Image & Video)",
      desc: "High-impact visual showcase below the semester stats, perfect for brand storytelling, product launches, or hackathon drives.",
    },
    {
      code: "AD 03",
      name: "Study Materials Grid Slot",
      ratio: "3.5:1 ratio",
      desc: "Non-intrusive placement integrated cleanly between subject material categories for contextual relevance.",
    },
    {
      code: "AD 04",
      name: "Desktop Sidebar Placement",
      ratio: "1:2 vertical ratio",
      desc: "Dedicated desktop sidebar position visible alongside course directories and catalog pages.",
    },
    {
      code: "AD 05",
      name: "Paperino Pulse Feed Placement",
      ratio: "3:1 ratio",
      desc: "Contextual showcase embedded inside the live opportunity feed among internships, hackathons, and announcements.",
    },
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden py-16 md:py-24 px-4 sm:px-6">
      <AmbientOrbs />

      <div className="w-full max-w-5xl mx-auto relative z-10 space-y-16">
        {/* Header Hero */}
        <section className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Megaphone size={14} className="text-purple-400" />
            <span>Direct Brand Partnerships</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Connect Directly With <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-cyan-400">
              Future Engineers
            </span>
          </h1>

          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            Paperino provides educational institutions, tech startups, developer platforms, and student-focused brands
            with direct, premium sponsorship placements across our academic ecosystem.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:paperino.study@gmail.com?subject=Paperino%20Sponsorship%20Inquiry"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all active:scale-95 cursor-pointer"
            >
              <Mail size={16} />
              <span>Contact Sponsorship Team</span>
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-sm transition-all"
            >
              <span>Explore Platform</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Available Placements Grid */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Curated Advertisement Placements</h2>
            <p className="text-xs md:text-sm text-gray-400">
              Every placement is engineered to preserve student reading flow while ensuring maximum brand distinction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {placements.map((slot) => (
              <div
                key={slot.code}
                className="vision-glass p-6 rounded-3xl border border-white/10 bg-[#0f0a1d]/60 hover:border-purple-500/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {slot.code}
                    </span>
                    <Layout size={16} className="text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                    {slot.name}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-light">{slot.desc}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-white/5 text-[11px] text-purple-300 font-mono">
                  {slot.ratio}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Editorial & Security Guidelines */}
        <section className="vision-glass p-8 md:p-10 rounded-[2.5rem] border border-white/10 bg-[#0a0614]/80 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">Direct Sponsorship Standards</h2>
              <p className="text-xs text-gray-400">We maintain uncompromising standards for our student community.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <CheckCircle2 size={16} />
                <span>Zero Third-Party Ad Networks</span>
              </div>
              <p className="text-gray-400 leading-relaxed font-light">
                We do not use invasive ad networks, popups, or tracking pixels. Every campaign is vetted and directly booked.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-fuchsia-400 font-bold">
                <CheckCircle2 size={16} />
                <span>Educational Alignment</span>
              </div>
              <p className="text-gray-400 leading-relaxed font-light">
                Priority is granted to hackathons, student software discounts, internships, tech hiring, and academic tools.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <CheckCircle2 size={16} />
                <span>Zero Page Layout Shift</span>
              </div>
              <p className="text-gray-400 leading-relaxed font-light">
                Placements are engineered with bounded aspect ratios so student reading and download flows remain frictionless.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-400 text-center sm:text-left">
              <span>Ready to book a sponsorship slot? Email us at </span>
              <a href="mailto:paperino.study@gmail.com" className="text-purple-300 font-semibold underline underline-offset-2">
                paperino.study@gmail.com
              </a>
            </div>
            <a
              href="mailto:paperino.study@gmail.com?subject=Paperino%20Sponsorship%20Inquiry"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
            >
              <Sparkles size={14} />
              <span>Inquire via Email</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
