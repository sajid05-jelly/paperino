"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp, doc, deleteDoc, limit } from "firebase/firestore";
import {
  Radio, Pin, ShieldCheck, Clock, Trash2, Share2, Bookmark, FileText,
  Download, ExternalLink, MapPin, Building2, Monitor, CalendarDays, Users,
  ClipboardList, Banknote, BookOpen,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import FormattedDescription from "@/components/FormattedDescription";

import { usePulseNotifications } from "@/context/NotificationContext";

interface PulseUpdate {
  id: string;
  title: string;
  description: string;
  category: string;
  link?: string;
  priority: "normal" | "important" | "pinned";
  createdAt: Timestamp;
  createdBy: string;
  createdByRole?: string;
  isCreatedByAdmin?: boolean;
  isPinned: boolean;
  verifiedSource?: boolean;
  sourceName?: string;
  organizer?: string;
  deadline?: Timestamp;
  location?: string;
  mode?: string;
  state?: string;
  imageUrl?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  pdfName?: string;
  source?: string;
  sources?: string[];
  officialEventUrl?: string;
  registrationUrl?: string;
  // Structured metadata fields for hackathon/event cards
  teamSize?: string;
  registrationFee?: string;
  eventDate?: string | Timestamp;
  about?: string;
}

const CATEGORIES = ["All", "Internships", "Hackathons", "Workshops", "Placements", "Events", "Out of Date"];

// Categories that use the COMPACT structured card layout
const STRUCTURED_CATEGORIES = ["Hackathons", "Workshops", "Events", "Placements"];

export default function PulsePage() {
  const [updates, setUpdates] = useState<PulseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const { categoryPulseUnreadCounts, markPulseCategoryAsRead } = usePulseNotifications();
  const { showToast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const isLoggedOut = !authLoading && !user;

  // Automatically mark current active category as read
  useEffect(() => {
    if (user && activeCategory) {
      markPulseCategoryAsRead(activeCategory);
    }
  }, [user, activeCategory, markPulseCategoryAsRead, updates]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("paperino_pulse_bookmarks");
      if (saved) setBookmarkedIds(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter(item => item !== id);
        showToast("Removed from bookmarks", "info");
      } else {
        next = [...prev, id];
        showToast("Saved to bookmarks!", "success");
      }
      try { localStorage.setItem("paperino_pulse_bookmarks", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const isBookmarked = (id: string) => bookmarkedIds.includes(id);
  const isExpanded = (id: string) => expandedIds.includes(id);
  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleShare = async (update: PulseUpdate) => {
    const shareUrl = update.link || (typeof window !== "undefined" ? window.location.href : "");
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: update.title, url: shareUrl }); return; } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied to clipboard!", "success");
    }
  };

  const isVerifiedResource = (update: PulseUpdate): boolean => {
    if (update.createdByRole === "admin" || update.createdByRole === "lead_admin") return true;
    if (update.isCreatedByAdmin) return true;
    if (update.verifiedSource) return true;
    if (update.createdBy && update.createdBy !== "knowafest_bot") return true;
    return false;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Internships": return "💼";
      case "Hackathons": return "🚀";
      case "Workshops": return "🛠️";
      case "Placements": return "🎓";
      case "Events": return "🎪";
      case "Out of Date": return "⌛";
      default: return "📢";
    }
  };

  const getApplyButtonText = (update: PulseUpdate) => {
    const cat = (update.category || "").toLowerCase();
    const link = (update.link || "").toLowerCase();
    if (cat.includes("internship") || cat.includes("hackathon") || cat.includes("placement")) {
      if (link.includes("register") || link.includes("form")) return "Register Now";
      return "Apply Now";
    }
    if (link.includes("apply")) return "Apply Now";
    if (link.includes("register") || link.includes("form")) return "Register Now";
    return "Visit Website";
  };

  const formatTimestamp = (ts?: Timestamp | string) => {
    if (!ts) return null;
    if (typeof ts === "string") return ts;
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  useEffect(() => {
    const q = query(collection(db, "pulse_updates"), orderBy("createdAt", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: PulseUpdate[] = [];
      snapshot.forEach(d => fetched.push({ id: d.id, ...d.data() } as PulseUpdate));
      fetched.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setUpdates(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Pulse fetch error:", error);
      showToast("Failed to load live updates.", "error");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "pulse_updates", id));
      showToast("Post deleted successfully", "success");
      setDeleteConfirmId(null);
    } catch {
      showToast("Failed to delete post", "error");
    }
  };

  const isNew = (ts?: Timestamp) => ts ? (Date.now() - ts.seconds * 1000) / 86400000 <= 3 : false;
  const isExpiredTs = (ts?: Timestamp) => ts ? Date.now() > ts.seconds * 1000 : false;

  // ─── CATEGORY & OUT OF DATE FILTERING LOGIC ──────────────────────────────────
  const filteredUpdates = updates.filter(u => {
    const expired = isExpiredTs(u.deadline);
    if (activeCategory === "Out of Date") {
      return expired;
    }
    // For active tabs (All, Hackathons, Internships, etc.), exclude expired events
    if (expired) return false;

    if (activeCategory === "All") return true;
    return u.category === activeCategory;
  });

  // ─── SHARED BADGE STYLE ────────────────────────────────────────────────────────
  const badgeStyle = (bg: string, border: string, color: string, glow?: string) => ({
    background: bg,
    border: `1px solid ${border}`,
    color,
    boxShadow: glow || "none",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  });

  // ─── SHARED CARD SHELL PROPS ───────────────────────────────────────────────────
  const getCardStyle = (pinned: boolean) => ({
    background: pinned
      ? "linear-gradient(145deg, rgba(88,28,220,0.14) 0%, rgba(67,56,202,0.1) 50%, rgba(37,99,235,0.07) 100%)"
      : "rgba(255,255,255,0.032)",
    border: pinned ? "1px solid rgba(139,92,246,0.42)" : "1px solid rgba(255,255,255,0.07)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    boxShadow: pinned
      ? "0 0 45px rgba(109,40,217,0.18), 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)"
      : "0 2px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
  });

  // ─── SHARED BADGE ROW ─────────────────────────────────────────────────────────
  const BadgeRow = ({ update, pinned }: { update: PulseUpdate; pinned: boolean }) => {
    const sourceList = Array.isArray(update.sources) && update.sources.length > 0
      ? update.sources
      : (update.sourceName || update.source) ? [(update.sourceName || update.source)!] : [];

    return (
      <div className={`flex flex-wrap items-center gap-1.5${isAdmin ? " pr-10" : ""}`}>
        {isNew(update.createdAt) && !pinned && (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest animate-pulse"
            style={badgeStyle("rgba(6,182,212,0.12)", "rgba(6,182,212,0.35)", "#67e8f9", "0 0 10px rgba(6,182,212,0.25)")}>
            NEW
          </span>
        )}

        {/* Source Badges (Knowafest, Unstop, etc.) */}
        {sourceList.map(src => {
          const s = src.toLowerCase();
          if (s === "knowafest") {
            return (
              <span key={src} className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
                style={badgeStyle("rgba(245,158,11,0.14)", "rgba(245,158,11,0.38)", "#fbbf24", "0 0 10px rgba(245,158,11,0.2)")}>
                <span>📍</span>
                <span>PAPERINO</span>
              </span>
            );
          }
          if (s === "unstop") {
            return (
              <span key={src} className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
                style={badgeStyle("rgba(37,99,235,0.14)", "rgba(59,130,246,0.38)", "#60a5fa", "0 0 10px rgba(59,130,246,0.2)")}>
                <span>🎯</span>
                <span>UNSTOP</span>
              </span>
            );
          }
          return (
            <span key={src} className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
              style={badgeStyle("rgba(139,92,246,0.14)", "rgba(139,92,246,0.38)", "#c4b5fd")}>
              <span>⚡</span>
              <span>{src.toUpperCase()}</span>
            </span>
          );
        })}

        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
          style={badgeStyle("rgba(109,40,217,0.14)", "rgba(139,92,246,0.32)", "#c4b5fd", "0 0 10px rgba(109,40,217,0.18)")}>
          <span>{getCategoryIcon(update.category)}</span>
          <span>{update.category}</span>
        </span>
        {update.mode && (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
            style={update.mode === "Offline"
              ? badgeStyle("rgba(16,185,129,0.1)", "rgba(16,185,129,0.3)", "#6ee7b7")
              : update.mode === "Hybrid"
                ? badgeStyle("rgba(14,165,233,0.1)", "rgba(14,165,233,0.3)", "#7dd3fc")
                : badgeStyle("rgba(99,102,241,0.1)", "rgba(99,102,241,0.3)", "#a5b4fc")}>
            <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
            {update.mode}
          </span>
        )}
        {isVerifiedResource(update) && (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
            style={badgeStyle(
              "linear-gradient(135deg, rgba(37,99,235,0.13) 0%, rgba(79,70,229,0.1) 50%, rgba(109,40,217,0.13) 100%)",
              "rgba(79,70,229,0.42)", "#93c5fd", "0 0 14px rgba(79,70,229,0.22)"
            )}>
            <ShieldCheck size={10} style={{ color: "#22d3ee", filter: "drop-shadow(0 0 5px rgba(34,211,238,0.8))" }} />
            Verified
          </span>
        )}
        {pinned && (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
            style={badgeStyle("rgba(245,158,11,0.12)", "rgba(245,158,11,0.3)", "#fcd34d", "0 0 8px rgba(245,158,11,0.15)")}>
            <Pin size={9} /> PINNED
          </span>
        )}
        {isExpiredTs(update.deadline) && (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
            style={badgeStyle("rgba(244,63,94,0.1)", "rgba(244,63,94,0.3)", "#fda4af")}>
            <Clock size={9} /> EXPIRED
          </span>
        )}
      </div>
    );
  };

  // ─── SHARED ACTIONS BAR ────────────────────────────────────────────────────────
  const ActionsBar = ({ update }: { update: PulseUpdate }) => {
    const targetUrl = update.registrationUrl || update.officialEventUrl || update.link;

    return !isLoggedOut ? (
      <div className="flex items-center justify-between gap-2 pt-4 mt-auto"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {targetUrl ? (
          <a href={targetUrl} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, rgba(109,40,217,0.88) 0%, rgba(79,70,229,0.88) 100%)",
              border: "1px solid rgba(167,139,250,0.42)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(109,40,217,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
            }}>
            {getApplyButtonText(update)}
            <ExternalLink size={12} className="shrink-0" />
          </a>
        ) : (
          <button disabled className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 bg-white/5 border border-white/10 opacity-60 cursor-not-allowed">
            Registration link unavailable
          </button>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={e => { e.stopPropagation(); handleShare(update); }}
            className="p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.85)" }}>
            <Share2 size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); toggleBookmark(update.id); }}
            className="p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all duration-300 cursor-pointer"
            style={isBookmarked(update.id) ? {
              background: "rgba(109,40,217,0.22)",
              border: "1px solid rgba(139,92,246,0.48)",
              color: "#c4b5fd",
              boxShadow: "0 0 14px rgba(109,40,217,0.28)",
            } : {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(148,163,184,0.85)",
            }}>
            <Bookmark size={13} style={isBookmarked(update.id) ? { fill: "#a78bfa", color: "#a78bfa" } : {}} />
          </button>
        </div>
      </div>
    ) : null;
  };

  // ─── META ROW HELPER ─────────────────────────────────────────────────────────
  const MetaRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-2.5 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="shrink-0 mt-0.5" style={{ color: "#8b5cf6" }}>{icon}</div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(148,163,184,0.55)" }}>{label}</span>
          <span className="text-sm font-medium text-white/90 leading-snug break-words">{value}</span>
        </div>
      </div>
    );
  };

  // ─── STRUCTURED CARD (Hackathon / Workshop / Event / Placement) ────────────────
  const StructuredCard = ({ update, idx }: { update: PulseUpdate; idx: number }) => {
    const pinned = update.isPinned;
    const desc = update.description || "";
    const LIMIT = 220; // ~3-4 lines of text
    const isTruncatable = desc.length > LIMIT;
    const expanded = isExpanded(update.id);
    const displayDesc = (!expanded && isTruncatable) ? desc.slice(0, LIMIT).trimEnd() + "…" : desc;

    return (
      <article
        key={update.id}
        onClick={() => isLoggedOut && router.push("/login")}
        className={`group relative rounded-3xl transition-all duration-500 overflow-hidden animate-in slide-in-from-bottom-4 fade-in fill-mode-both flex flex-col w-full max-w-full${isLoggedOut ? " cursor-pointer" : ""}`}
        style={{ animationDelay: `${idx * 55}ms`, ...getCardStyle(pinned) }}
        onMouseEnter={e => {
          if (!pinned) {
            const el = e.currentTarget as HTMLElement;
            el.style.border = "1px solid rgba(139,92,246,0.28)";
            el.style.boxShadow = "0 0 40px rgba(109,40,217,0.14), 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)";
            el.style.transform = "translateY(-2px)";
          }
        }}
        onMouseLeave={e => {
          if (!pinned) {
            const el = e.currentTarget as HTMLElement;
            el.style.border = "1px solid rgba(255,255,255,0.07)";
            el.style.boxShadow = "0 2px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)";
            el.style.transform = "translateY(0)";
          }
        }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl"
          style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.05) 0%, rgba(79,70,229,0.03) 50%, rgba(37,99,235,0.05) 100%)" }} />
        <div className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)" }} />

        {/* Admin delete */}
        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(update.id); }}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.6)" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(244,63,94,0.12)"; el.style.color = "#fb7185"; el.style.borderColor = "rgba(244,63,94,0.3)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.color = "rgba(148,163,184,0.6)"; el.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            <Trash2 size={13} />
          </button>
        )}

        <div className="p-5 flex flex-col gap-3.5 relative z-10 flex-1">
          {/* Badges */}
          <BadgeRow update={update} pinned={pinned} />

          {/* Title */}
          <h2 className="font-extrabold leading-tight transition-colors duration-300 group-hover:text-violet-300"
            style={{ color: "#f1f5f9", fontFamily: "'Outfit', 'Inter', sans-serif", fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
            {update.title}
          </h2>

          {/* Structured metadata grid */}
          <div className="flex flex-col" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
            <MetaRow icon={<MapPin size={14} />} label="Location" value={update.location} />
            <MetaRow icon={<Building2 size={14} />} label="Organizer" value={update.organizer} />
            <MetaRow icon={<Monitor size={14} />} label="Mode" value={update.mode} />
            <MetaRow icon={<CalendarDays size={14} />} label="Event Date" value={update.eventDate ? formatTimestamp(update.eventDate as Timestamp) : undefined} />
            <MetaRow icon={<ClipboardList size={14} />} label="Deadline" value={update.deadline ? formatTimestamp(update.deadline) : undefined} />
            <MetaRow icon={<Users size={14} />} label="Team Size" value={update.teamSize} />
            <MetaRow icon={<Banknote size={14} />} label="Registration Fee" value={update.registrationFee} />
          </div>

          {/* About / Description (truncated with Read More) */}
          {desc && (
            <div className="flex flex-col gap-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen size={13} style={{ color: "#8b5cf6" }} />
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(148,163,184,0.55)" }}>About</span>
              </div>
              <div className={isLoggedOut ? "blur-[3px] select-none pointer-events-none opacity-25" : ""}>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(203,213,225,0.85)", fontFamily: "'Inter', sans-serif", whiteSpace: "pre-line" }}>
                  {displayDesc}
                </p>
                {isTruncatable && (
                  <button
                    onClick={e => toggleExpand(update.id, e)}
                    className="mt-1.5 text-xs font-semibold cursor-pointer transition-colors"
                    style={{ color: "#a78bfa" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#c4b5fd"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#a78bfa"}>
                    {expanded ? "Show less ↑" : "Read more ↓"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PDF attachment */}
          {!isLoggedOut && (update.pdfUrl || update.pdfName) && (
            <div className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185" }}>
                  <FileText size={15} />
                </div>
                <span className="text-xs font-medium text-white truncate">{update.pdfName || "Attached Document"}</span>
              </div>
              {update.pdfUrl && (
                <a href={update.pdfUrl} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
                  <Download size={11} /> Download
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <ActionsBar update={update} />
        </div>
      </article>
    );
  };

  // ─── INTERNSHIP / PLATFORM CARD (Full dynamic description) ────────────────────
  const DynamicCard = ({ update, idx }: { update: PulseUpdate; idx: number }) => {
    const pinned = update.isPinned;
    return (
      <article
        key={update.id}
        onClick={() => isLoggedOut && router.push("/login")}
        className={`group relative rounded-3xl transition-all duration-500 overflow-hidden animate-in slide-in-from-bottom-4 fade-in fill-mode-both flex flex-col w-full max-w-full${isLoggedOut ? " cursor-pointer" : ""}`}
        style={{ animationDelay: `${idx * 55}ms`, ...getCardStyle(pinned) }}
        onMouseEnter={e => {
          if (!pinned) {
            const el = e.currentTarget as HTMLElement;
            el.style.border = "1px solid rgba(139,92,246,0.28)";
            el.style.boxShadow = "0 0 40px rgba(109,40,217,0.14), 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)";
            el.style.transform = "translateY(-2px)";
          }
        }}
        onMouseLeave={e => {
          if (!pinned) {
            const el = e.currentTarget as HTMLElement;
            el.style.border = "1px solid rgba(255,255,255,0.07)";
            el.style.boxShadow = "0 2px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)";
            el.style.transform = "translateY(0)";
          }
        }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl"
          style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.05) 0%, rgba(79,70,229,0.03) 50%, rgba(37,99,235,0.05) 100%)" }} />
        <div className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)" }} />

        {isAdmin && (
          <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(update.id); }}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(148,163,184,0.6)" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(244,63,94,0.12)"; el.style.color = "#fb7185"; el.style.borderColor = "rgba(244,63,94,0.3)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.color = "rgba(148,163,184,0.6)"; el.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            <Trash2 size={13} />
          </button>
        )}

        <div className="p-5 md:p-6 flex flex-col gap-4 relative z-10 flex-1">
          <BadgeRow update={update} pinned={pinned} />

          <h2 className="font-extrabold leading-tight transition-colors duration-300 group-hover:text-violet-300"
            style={{ color: "#f1f5f9", fontFamily: "'Outfit', 'Inter', sans-serif", fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
            {update.title}
          </h2>

          {/* Full Markdown description — no truncation for internships */}
          <div className={`flex-1 ${isLoggedOut ? "blur-[3px] select-none pointer-events-none opacity-25" : ""}`}
            style={{ fontFamily: "'Inter', sans-serif" }}>
            <FormattedDescription content={update.description} />
          </div>

          {/* Media */}
          {!isLoggedOut && (
            <>
              {update.imageUrl && (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <img src={update.imageUrl} alt={update.title}
                    className="w-full max-h-80 object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                </div>
              )}
              {(update.pdfUrl || update.pdfName) && (
                <div className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185" }}>
                      <FileText size={15} />
                    </div>
                    <span className="text-xs font-medium text-white truncate">{update.pdfName || "Attached Document"}</span>
                  </div>
                  {update.pdfUrl && (
                    <a href={update.pdfUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}>
                      <Download size={11} /> Download
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          <ActionsBar update={update} />
        </div>
      </article>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-white relative overflow-x-hidden"
      style={{
        background: "radial-gradient(ellipse 120% 60% at 50% -5%, rgba(88,28,220,0.22) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 20%, rgba(37,99,235,0.1) 0%, transparent 50%), #050310",
        fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
      }}
    >
      {/* ── AMBIENT ORBS ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.35) 0%, rgba(79,70,229,0.15) 45%, transparent 70%)", filter: "blur(70px)", opacity: 0.4 }} />
        <div className="absolute top-[40%] -right-48 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 65%)", filter: "blur(90px)", opacity: 0.25 }} />
        <div className="absolute bottom-[20%] -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)", filter: "blur(80px)", opacity: 0.2 }} />
      </div>

      {/* ── PAGE WRAPPER ── */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-10 overflow-hidden">

        {/* ── HERO HEADER ── */}
        <header className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              background: "rgba(109,40,217,0.1)",
              border: "1px solid rgba(139,92,246,0.28)",
              color: "#c4b5fd",
              backdropFilter: "blur(14px)",
              boxShadow: "0 0 24px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(167,139,250,0.9)" }} />
            <Radio size={12} className="text-violet-400" />
            <span>Paperino Live</span>
          </div>

          <h1 className="font-black leading-none"
            style={{ fontSize: "clamp(2.5rem, 7vw, 4.5rem)", letterSpacing: "-0.035em", fontFamily: "'Outfit', 'Inter', sans-serif" }}>
            <span className="text-white">Paperino </span>
            <span style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 45%, #60a5fa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Pulse</span>
          </h1>

          <p style={{ color: "rgba(148,163,184,0.85)", fontSize: "1rem", lineHeight: "1.75", fontFamily: "'Inter', sans-serif", maxWidth: "520px", margin: "0 auto" }}>
            Stay updated with internships, hackathons, workshops, and platform announcements curated for our community.
          </p>
        </header>

        {/* ── CATEGORY FILTER ── */}
        <nav className="flex flex-wrap items-center justify-center gap-2 max-w-full overflow-x-auto py-1" aria-label="Category filter">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat;
            const unreadCount = categoryPulseUnreadCounts[cat] || 0;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 whitespace-nowrap cursor-pointer shrink-0"
                style={active ? {
                  background: "linear-gradient(135deg, rgba(109,40,217,0.85) 0%, rgba(79,70,229,0.85) 100%)",
                  border: "1px solid rgba(167,139,250,0.45)",
                  color: "#fff",
                  boxShadow: "0 0 22px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(148,163,184,0.85)",
                  backdropFilter: "blur(8px)",
                }}>
                <span>{cat}</span>
                {unreadCount > 0 && (
                  <span className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold ${
                    active ? "bg-white text-purple-950" : "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── CARDS GRID ── */}
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start w-full max-w-full">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl p-6 animate-pulse space-y-4"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
                <div className="flex gap-2">
                  <div className="h-5 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <div className="h-5 w-28 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                </div>
                <div className="h-6 w-3/4 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="space-y-2 pt-2">
                  {[1, 0.85, 0.7, 0.9, 0.75].map((w, j) => (
                    <div key={j} className="h-3.5 rounded-lg" style={{ width: `${w * 100}%`, background: "rgba(255,255,255,0.04)" }} />
                  ))}
                </div>
              </div>
            ))
          ) : filteredUpdates.length === 0 ? (
            <div className="col-span-full text-center py-24 rounded-3xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
              <Radio className="mx-auto h-12 w-12 mb-4" style={{ color: "#7c3aed", opacity: 0.4 }} />
              <h3 className="text-xl font-bold text-white mb-2">No updates found</h3>
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.65)" }}>
                Check back later for new {activeCategory !== "All" ? activeCategory.toLowerCase() : "opportunities and announcements"}.
              </p>
            </div>
          ) : (
            filteredUpdates.map((update, idx) =>
              STRUCTURED_CATEGORIES.includes(update.category)
                ? <StructuredCard key={update.id} update={update} idx={idx} />
                : <DynamicCard key={update.id} update={update} idx={idx} />
            )
          )}
        </main>
      </div>

      {/* ── DELETE MODAL ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={() => setDeleteConfirmId(null)}>
          <div className="max-w-md w-full mx-4 p-7 rounded-3xl animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(10,5,24,0.97)",
              border: "1px solid rgba(244,63,94,0.32)",
              backdropFilter: "blur(28px)",
              boxShadow: "0 0 55px rgba(244,63,94,0.18), 0 24px 64px rgba(0,0,0,0.65)",
            }}>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>Delete Announcement</h3>
            <p className="text-sm mb-7" style={{ color: "rgba(148,163,184,0.8)" }}>Are you sure you want to permanently delete this post?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#cbd5e1" }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                style={{
                  background: "linear-gradient(135deg, #be123c, #dc2626)",
                  border: "1px solid rgba(244,63,94,0.5)",
                  color: "#fff",
                  boxShadow: "0 0 22px rgba(244,63,94,0.32)",
                }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
