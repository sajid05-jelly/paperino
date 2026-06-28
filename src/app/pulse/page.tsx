"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { Radio, Pin, Link as LinkIcon, ExternalLink, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PulseUpdate {
  id: string;
  title: string;
  description: string;
  category: string;
  link?: string;
  priority: "normal" | "important" | "pinned";
  createdAt: Timestamp;
  createdBy: string;
  isPinned: boolean;
}

const CATEGORIES = [
  "All",
  "Announcements",
  "Internships",
  "Hackathons",
  "Placements",
  "Website Updates",
  "Events"
];

export default function PulsePage() {
  const [updates, setUpdates] = useState<PulseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "pulse_updates"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PulseUpdate));
      // Sort pinned to top
      data.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
      setUpdates(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUpdates = updates.filter(
    (update) => activeCategory === "All" || update.category === activeCategory
  );

  const isNew = (timestamp: Timestamp) => {
    if (!timestamp) return false;
    const now = new Date();
    const date = timestamp.toDate();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    return diffHours < 24;
  };

  return (
    <div className="min-h-screen pt-20 pb-24 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-1/4 w-[40rem] h-[40rem] bg-violet-500/10 rounded-full blur-[120px] mix-blend-screen hidden md:block"></div>
        <div className="absolute bottom-0 left-1/4 w-[40rem] h-[40rem] bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen hidden md:block"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 z-10 relative">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14 animate-in slide-in-from-bottom-4 duration-500 fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 mb-6 backdrop-blur-md">
            <Radio size={14} className="text-violet-400" />
            <span className="text-xs font-bold text-violet-200 uppercase tracking-widest">Community Hub</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-violet-200 to-cyan-300 mb-6 drop-shadow-sm">
            Paperino Pulse
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Stay updated with the latest opportunities, internships, hackathons, and platform announcements curated for our community.
          </p>
        </div>

        {/* Categories Filter */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 pb-2 -mx-4 px-4 md:mx-0 md:px-0 animate-in slide-in-from-bottom-4 duration-500 delay-100 fade-in">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex-shrink-0 ${
                activeCategory === cat 
                ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] border border-transparent'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="space-y-4 md:space-y-6">
          {loading ? (
            // Skeleton Loaders
            [1, 2, 3].map(i => (
              <div key={i} className="glass-panel p-6 rounded-3xl animate-pulse flex flex-col gap-4">
                <div className="flex gap-2"><div className="h-5 w-24 bg-white/10 rounded-md"></div></div>
                <div className="h-8 w-3/4 bg-white/10 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-white/10 rounded-md"></div>
                  <div className="h-4 w-5/6 bg-white/10 rounded-md"></div>
                </div>
              </div>
            ))
          ) : filteredUpdates.length === 0 ? (
            <div className="text-center py-20 px-6 glass-panel rounded-3xl border border-white/10 animate-in fade-in zoom-in-95">
              <Radio className="mx-auto h-12 w-12 text-gray-500 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white mb-2">No updates found</h3>
              <p className="text-gray-400 text-sm">Check back later for new {activeCategory !== 'All' ? activeCategory.toLowerCase() : 'opportunities and announcements'}.</p>
            </div>
          ) : (
            filteredUpdates.map((update, idx) => (
              <div 
                key={update.id} 
                className={`group relative p-6 md:p-8 rounded-[2rem] border transition-all duration-500 overflow-hidden animate-in slide-in-from-bottom-8 fade-in fill-mode-both ${
                  update.isPinned 
                  ? 'bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.1)]' 
                  : 'bg-black/40 backdrop-blur-xl border-white/10 hover:bg-white/[0.03] hover:border-white/20 hover:shadow-xl hover:-translate-y-1'
                }`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Glowing border effect on hover for normal cards */}
                {!update.isPinned && (
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/0 to-cyan-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"></div>
                )}

                <div className="relative z-10">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-white/10 text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10">
                      {update.category}
                    </span>
                    
                    {update.isPinned && (
                      <span className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-violet-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                        <Pin size={10} /> PINNED
                      </span>
                    )}

                    {isNew(update.createdAt) && !update.isPinned && (
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-3 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all duration-300">
                    {update.title}
                  </h2>
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-6 whitespace-pre-wrap">
                    {update.description}
                  </p>

                  {/* Footer (Date & Link) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <Calendar size={14} />
                      {update.createdAt?.toDate().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    
                    {update.link && (
                      <a 
                        href={update.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold transition-all duration-300 border border-white/5 w-full sm:w-auto text-center cursor-pointer hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-400 hover:border-blue-400/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:-translate-y-0.5"
                      >
                        🔗 Open Link <ExternalLink size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
