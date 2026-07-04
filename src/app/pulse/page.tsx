"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { Radio, Pin, Link as LinkIcon, ExternalLink, Calendar, ChevronRight, Lock, ShieldCheck, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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
  verifiedSource?: boolean;
  sourceName?: string;
  organizer?: string;
  deadline?: Timestamp;
  location?: string;
  mode?: string;
  state?: string;
}

interface ExtractedDetails {
  date: string;
  location: string;
  organizer: string;
  fee: string;
  teamSize: string;
  prizePool: string;
  deadline: string;
  highlights: string[];
  summary: string;
}

function parseHackathonDetails(update: PulseUpdate): ExtractedDetails {
  const desc = update.description || "";
  
  const organizer = update.organizer || "Check Website";
  
  let location = update.location || "Location Unknown";
  if (update.state && !location.toLowerCase().includes(update.state.toLowerCase()) && location !== "Location Unknown") {
    location = `${location}, ${update.state}`;
  }

  const deadline = update.deadline
    ? new Date(update.deadline.seconds * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Check Website";

  let date = "Check Website";
  const dateRegex = /\b(\d{1,2}(?:-\d{1,2})?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{4})?)\b/i;
  const dateMatch = desc.match(dateRegex);
  if (dateMatch) {
    date = dateMatch[1];
  }

  let fee = "Free / Check Website";
  if (desc.toLowerCase().includes("free")) {
    fee = "Free";
  } else {
    const feeMatch = desc.match(/(?:fee|rs|inr|registration)\.?\s*[:\-\s]*₹?\s*(\d+)/i);
    if (feeMatch) {
      fee = `₹${feeMatch[1]}`;
    }
  }

  let teamSize = "Check Website";
  const teamMatch = desc.match(/(?:team size|members|team of)\s*[:\-\s]*(\d+(?:-\d+)?)/i);
  if (teamMatch) {
    teamSize = `${teamMatch[1]} Members`;
  } else if (desc.toLowerCase().includes("solo") || desc.toLowerCase().includes("individual")) {
    teamSize = "1 Member (Solo)";
  }

  let prizePool = "Check Website";
  const prizeMatch = desc.match(/(?:prize pool|prizes worth|cash prize|prizes of)\s*[:\-\s]*₹?\s*(\d+(?:,\d+)*(?:\s*k|\s*lakh)?)/i);
  if (prizeMatch) {
    prizePool = `₹${prizeMatch[1]}`;
  } else {
    const moneyMatch = desc.match(/₹\s*(\d+(?:,\d+)*(?:\s*k|\s*lakh)?)/i);
    if (moneyMatch) {
      prizePool = moneyMatch[0];
    }
  }

  const highlights: string[] = [];
  const lines = desc.split("\n");
  for (const line of lines) {
    const cleanLine = line.trim().replace(/^[\u2022\-\*\d\.\s]+/, "").trim();
    if (cleanLine && (line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*")) && cleanLine.length < 50) {
      highlights.push(cleanLine);
    }
  }

  if (highlights.length === 0) {
    if (update.mode === "Offline") {
      highlights.push("Offline Hackathon Experience");
    } else if (update.mode === "Hybrid") {
      highlights.push("Hybrid Event Structure");
    } else {
      highlights.push("100% Online Hackathon");
    }
    
    if (fee === "Free") {
      highlights.push("Free Registration");
    }
    
    if (prizePool !== "Check Website") {
      highlights.push(`Win from ${prizePool} Prize Pool`);
    }

    highlights.push("Certificates for all participants");
    highlights.push("Networking & Mentorship");
  }

  const finalHighlights = highlights.slice(0, 5);

  let summary = desc;
  const sentenceMatch = desc.match(/^[^.!?]+[.!?]+[^.!?]+[.!?]+/);
  if (sentenceMatch) {
    summary = sentenceMatch[0];
  } else if (desc.length > 140) {
    summary = desc.substring(0, 140) + "...";
  }

  return {
    date,
    location,
    organizer,
    fee,
    teamSize,
    prizePool,
    deadline,
    highlights: finalHighlights,
    summary,
  };
}

const CATEGORIES = [
  "All",
  "Announcements",
  "Internships",
  "Hackathons",
  "Placements",
  "Website Updates",
  "Events",
  "Archived"
];

export default function PulsePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [updates, setUpdates] = useState<PulseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "pulse_updates"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PulseUpdate));
      
      const getSortScore = (update: PulseUpdate) => {
        if (update.isPinned) return 1000;
        
        const locationLower = (update.location || "").toLowerCase();
        const stateLower = (update.state || "").toLowerCase();
        const titleLower = (update.title || "").toLowerCase();
        const modeLower = (update.mode || "Offline").toLowerCase();
        
        const isTN = 
          stateLower.includes("tamil nadu") || 
          stateLower.includes("tamilnadu") ||
          locationLower.includes("tamil nadu") ||
          locationLower.includes("chennai") ||
          locationLower.includes("coimbatore") ||
          locationLower.includes("trichy") ||
          locationLower.includes("tiruchirappalli") ||
          locationLower.includes("madurai") ||
          locationLower.includes("salem") ||
          locationLower.includes("erode") ||
          locationLower.includes("vellore") ||
          locationLower.includes("tirunelveli") ||
          locationLower.includes("thanjavur") ||
          locationLower.includes("kanchipuram") ||
          locationLower.includes("hosur") ||
          titleLower.match(/srm|sathyabama|vit chennai|anna university|ssn|psg|kumaraguru|cit|sastra|amrita|thiagarajar|kct|licet|joseph/);

        const isSouthIndia = 
          stateLower.includes("karnataka") || 
          stateLower.includes("kerala") || 
          stateLower.includes("andhra pradesh") || 
          stateLower.includes("telangana") ||
          locationLower.includes("bangalore") ||
          locationLower.includes("bengaluru") ||
          locationLower.includes("kochi") ||
          locationLower.includes("hyderabad") ||
          locationLower.includes("thiruvananthapuram") ||
          locationLower.includes("amaravati") ||
          locationLower.includes("warangal") ||
          locationLower.includes("visakhapatnam") ||
          locationLower.includes("cochin") ||
          locationLower.includes("trivandrum");

        if (modeLower === "offline") {
          if (isTN) return 100;        // Level 1: Tamil Nadu Offline
          if (isSouthIndia) return 80; // Level 3: South India Offline
          return 70;                   // India Offline
        }
        
        if (modeLower === "hybrid") {
          if (isTN) return 90;         // Level 2: Tamil Nadu Hybrid
          return 60;                   // Other Hybrid
        }
        
        if (modeLower === "online") {
          return 50;                   // Online
        }
        
        return 40;                     // Location Unknown / Others
      };

      data.sort((a, b) => {
        const scoreA = getSortScore(a);
        const scoreB = getSortScore(b);
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0);
      });

      setUpdates(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pulse updates:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isExpired = (deadline?: Timestamp) => {
    if (!deadline) return false;
    return deadline.toDate() < new Date();
  };

  const filteredUpdates = updates.filter(
    (u) => {
      const expired = isExpired(u.deadline);
      if (activeCategory === "Archived") {
        return expired;
      }
      
      if (expired) return false; // Hide expired items from other tabs
      
      return activeCategory === "All" || u.category === activeCategory;
    }
  );

  const isNew = (timestamp: Timestamp) => {
    if (!timestamp) return false;
    const now = new Date();
    const date = timestamp.toDate();
    const diffHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    return diffHours < 24;
  };

  const isLoggedOut = !authLoading && !user;

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

        {/* Global Freemium Lock */}
        {isLoggedOut && (
          <div className="mb-12 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-violet-500/30 shadow-[0_0_40px_rgba(139,92,246,0.15)] flex flex-col md:flex-row items-center gap-6 md:gap-8 backdrop-blur-xl bg-black/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 blur-[50px] rounded-full pointer-events-none transition-all duration-700 group-hover:bg-violet-500/20"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex flex-shrink-0 items-center justify-center text-violet-400 border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <Lock size={28} />
              </div>
              
              <div className="flex-1 text-center md:text-left z-10">
                <h3 className="text-xl font-bold text-white mb-2">🔒 Login Required</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6 md:mb-0">
                  To access full hackathon details, internship opportunities, registration links and exclusive updates, please login.
                </p>
              </div>
              
              <div className="w-full md:w-auto z-10">
                <Link href="/login" className="inline-flex w-full md:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap">
                  Login to Unlock Pulse
                </Link>
              </div>
            </div>
          </div>
        )}

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
        <div className={loading ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
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
            <div className="col-span-full text-center py-20 px-6 glass-panel rounded-3xl border border-white/10 animate-in fade-in zoom-in-95">
              <Radio className="mx-auto h-12 w-12 text-gray-500 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white mb-2">No updates found</h3>
              <p className="text-gray-400 text-sm">Check back later for new {activeCategory !== 'All' ? activeCategory.toLowerCase() : 'opportunities and announcements'}.</p>
            </div>
          ) : (
            filteredUpdates.map((update, idx) => {
              const parsed = parseHackathonDetails(update);
              return (
                <div 
                  key={update.id} 
                  onClick={() => isLoggedOut && router.push("/login")}
                  className={`group relative p-6 md:p-8 rounded-[2rem] border transition-all duration-500 overflow-hidden animate-in slide-in-from-bottom-8 fade-in fill-mode-both flex flex-col justify-between ${isLoggedOut ? "cursor-pointer" : ""} ${
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

                  <div className="relative z-10 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-white/10 text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10">
                          {update.category}
                        </span>
                        
                        {update.mode && (
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1 ${
                            update.mode === "Offline" 
                              ? "bg-green-500/20 text-green-400 border-green-500/30" 
                              : update.mode === "Hybrid"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }`}>
                            {update.mode === "Offline" ? "🟢" : update.mode === "Hybrid" ? "🔵" : "⚪"} {update.mode}
                          </span>
                        )}

                        {update.location && (
                          <span className="px-3 py-1 bg-white/5 text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 flex items-center gap-1">
                            📍 {update.location}
                          </span>
                        )}
                        
                        {update.verifiedSource && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-green-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(34,197,94,0.3)]" title="Scraped and verified from authentic sources">
                            <ShieldCheck size={12} /> VERIFIED SOURCE
                          </span>
                        )}

                        {isExpired(update.deadline) && (
                          <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-red-500/30 flex items-center gap-1">
                            <Clock size={12} /> EXPIRED
                          </span>
                        )}
                        
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
                      <h2 className="text-xl md:text-2xl font-bold text-white mb-1 leading-tight group-hover:text-violet-400 transition-colors">
                        {update.title}
                      </h2>
                      
                      {update.organizer && (
                        <p className="text-sm font-medium text-gray-500 mb-4">By {update.organizer}</p>
                      )}

                      {/* Short 2-line summary */}
                      <p className="text-sm text-gray-400 line-clamp-2 mb-6 leading-relaxed">
                        {parsed.summary}
                      </p>
                    </div>

                    <div className={`relative ${isLoggedOut ? "blur-[3px] select-none pointer-events-none opacity-30" : ""}`}>
                      <hr className="border-white/5 mb-6" />

                      {/* Premium Details Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex gap-3 items-center">
                          <span className="text-lg">📅</span>
                          <div className="min-w-0">
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Date</div>
                            <div className="text-xs text-white font-medium truncate">{parsed.date}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex gap-3 items-center">
                          <span className="text-lg">📍</span>
                          <div className="min-w-0">
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Location</div>
                            <div className="text-xs text-white font-medium truncate">{parsed.location}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex gap-3 items-center col-span-2">
                          <span className="text-lg">🏫</span>
                          <div className="min-w-0">
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Organizer</div>
                            <div className="text-xs text-white font-medium truncate">{parsed.organizer}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex gap-3 items-center">
                          <span className="text-lg">💰</span>
                          <div className="min-w-0">
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Fee</div>
                            <div className="text-xs text-white font-medium truncate">{parsed.fee}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex gap-3 items-center">
                          <span className="text-lg">👥</span>
                          <div className="min-w-0">
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Team Size</div>
                            <div className="text-xs text-white font-medium truncate">{parsed.teamSize}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex gap-3 items-center">
                          <span className="text-lg">🏆</span>
                          <div className="min-w-0">
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Prize Pool</div>
                            <div className="text-xs text-emerald-400 font-bold truncate">{parsed.prizePool}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 flex gap-3 items-center">
                          <span className="text-lg">⏰</span>
                          <div className="min-w-0">
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Deadline</div>
                            <div className="text-xs text-red-400 font-medium truncate">{parsed.deadline}</div>
                          </div>
                        </div>
                      </div>

                      <hr className="border-white/5 mb-6" />

                      {/* Key Highlights */}
                      <div className="mb-6">
                        <div className="text-[10px] text-gray-400 font-bold mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                          <span>✨</span> Key Highlights
                        </div>
                        <ul className="space-y-2 text-xs text-gray-400">
                          {parsed.highlights.map((h, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-violet-400 mt-0.5">•</span>
                              <span className="line-clamp-1">{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {!isLoggedOut && update.link && (
                      <div className="pt-4 border-t border-white/5 mt-auto">
                        <a 
                          href={update.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-violet-600/20 text-white hover:text-violet-300 text-sm font-bold transition-all duration-300 border border-white/10 hover:border-violet-500/30 w-full text-center cursor-pointer"
                        >
                          🔗 Open Link <ExternalLink size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
