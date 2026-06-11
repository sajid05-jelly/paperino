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
  const row1 = REVIEWS.slice(0, 8);
  const row2 = REVIEWS.slice(8, 15);

  const TestimonialCard = ({ review }: { review: { name: string, text: string } }) => (
    <div className="w-[300px] md:w-[420px] shrink-0 p-6 md:p-8 rounded-[2rem] bg-[#0a0714]/80 backdrop-blur-xl border border-white/5 transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:z-20 hover:border-violet-500/40 hover:shadow-[0_0_50px_rgba(139,92,246,0.15)] hover:bg-[#120b29]/90 group relative overflow-hidden flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
      
      <div>
        <div className="flex items-center mb-6">
          <div className="flex gap-1 text-fuchsia-400 shadow-[0_0_15px_rgba(232,121,249,0.15)] rounded-full px-2.5 py-1 bg-fuchsia-500/5 border border-fuchsia-500/10">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={14} fill="currentColor" aria-hidden="true" />
            ))}
          </div>
        </div>
        
        <p className="text-gray-300 group-hover:text-white transition-colors duration-500 text-base md:text-lg leading-relaxed mb-8 relative z-10 font-light">
          &quot;{review.text}&quot;
        </p>
      </div>
      
      <div className="flex items-center gap-4 relative z-10 mt-auto pt-6 border-t border-white/5">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm md:text-base shadow-[0_0_15px_rgba(139,92,246,0.3)] shrink-0">
          {review.name[0]}
        </div>
        <div className="flex flex-col justify-center">
          <span className="font-bold text-white tracking-wide text-sm md:text-base">{review.name}</span>
        </div>
      </div>
    </div>
  );

  return (
    <section className="w-screen relative py-24 md:py-32 overflow-hidden left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-[#05030a]/50">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-fuchsia-500/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col items-center text-center mb-16 px-6 relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          <Sparkles size={14} className="text-violet-400" aria-hidden="true" />
          <span>Loved by Students</span>
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
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
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: scroll-left 50s linear infinite;
          will-change: transform;
          transform: translateZ(0);
        }
        .animate-marquee-right {
          animation: scroll-right 60s linear infinite;
          will-change: transform;
          transform: translateZ(0);
        }
        .animate-marquee-left:hover, .animate-marquee-right:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Marquee Container */}
      <div className="relative w-full overflow-hidden flex flex-col gap-6 md:gap-8 z-10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-6 md:before:w-24 lg:before:w-64 before:bg-gradient-to-r before:from-[#05030a] before:to-transparent before:z-20 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-6 md:after:w-24 lg:after:w-64 after:bg-gradient-to-l after:from-[#05030a] after:to-transparent after:z-20">
        
        {/* Top Row - Scrolls Right */}
        <div className="flex w-max animate-marquee-right gap-6 md:gap-8 pr-6 md:pr-8 items-stretch">
          {[...row1, ...row1, ...row1, ...row1].map((review, i) => (
            <TestimonialCard key={`top-${i}`} review={review} />
          ))}
        </div>

        {/* Bottom Row - Scrolls Left */}
        <div className="hidden md:flex w-max animate-marquee-left gap-6 md:gap-8 pr-6 md:pr-8 items-stretch">
          {[...row2, ...row2, ...row2, ...row2].map((review, i) => (
            <TestimonialCard key={`bottom-${i}`} review={review} />
          ))}
        </div>

      </div>
    </section>
  );
}
