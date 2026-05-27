"use client";

import { Star, Sparkles } from "lucide-react";

const REVIEWS = [
  { name: "Sanjay", text: "Paperino made finding PYQs and notes super easy before exams." },
  { name: "Mahalakshmi", text: "The UI feels premium and very student-friendly. Loved the experience." },
  { name: "Priya Dharshini", text: "ATS Analyzer and GPA tools are honestly very useful." },
  { name: "Sushmitha", text: "Best academic platform created for SRM students." },
  { name: "Daniel", text: "The dark futuristic design feels amazing while studying." },
  { name: "Sajitha", text: "Paperino saves so much time searching for materials." },
  { name: "Lenin", text: "Very clean platform with useful semester resources." },
  { name: "Francis", text: "Leaderboard and contributor system is a great motivation." },
  { name: "Kanishka", text: "One of the most creative student platforms I’ve used." },
  { name: "Aravind", text: "PYQ Analyzer predictions were surprisingly helpful." },
  { name: "Keerthana", text: "Everything is organized semester-wise perfectly." },
  { name: "Naveen", text: "The contributor certificates idea is brilliant." },
  { name: "Harini", text: "Feels like a professional student ecosystem." },
  { name: "Vignesh", text: "The animations and UI quality are next level." },
  { name: "Deepika", text: "Paperino genuinely helps students prepare smarter." }
];

export default function Testimonials() {
  return (
    <section className="w-full relative py-20 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-violet-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col items-center text-center mb-12 px-6 relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          <Sparkles size={14} className="text-violet-400" />
          <span>Loved by Students</span>
        </div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
          See what students are <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">saying about Paperino</span>
        </h2>
      </div>

      {/* Marquee Animation Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: scroll-left 60s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Marquee Container */}
      <div className="relative w-full overflow-hidden flex z-10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-16 md:before:w-32 before:bg-gradient-to-r before:from-[#05030a] before:to-transparent before:z-20 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-16 md:after:w-32 after:bg-gradient-to-l after:from-[#05030a] after:to-transparent after:z-20">
        <div className="flex w-max animate-marquee gap-6 px-3">
          {/* Duplicate the reviews array to create an infinite scroll illusion */}
          {[...REVIEWS, ...REVIEWS].map((review, i) => (
            <div 
              key={i} 
              className="w-[300px] md:w-[350px] shrink-0 p-6 rounded-3xl bg-[#0a0714]/95 backdrop-blur-xl border border-white/10 transition-all duration-500 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:z-20 hover:border-violet-500/50 hover:shadow-[0_0_40px_rgba(139,92,246,0.2)] hover:bg-[#120b29] group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="flex items-center mb-4">
                <div className="flex gap-1 text-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.2)] rounded-full px-2 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={12} fill="currentColor" />
                  ))}
                </div>
              </div>
              
              <p className="text-gray-300 group-hover:text-white transition-colors duration-500 text-sm md:text-base leading-relaxed mb-6 italic relative z-10">
                "{review.text}"
              </p>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_10px_rgba(139,92,246,0.4)]">
                  {review.name[0]}
                </div>
                <span className="font-semibold text-white tracking-wide">{review.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
