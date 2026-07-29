"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Building2, Plus, Search, Filter, Check, X as IconX, 
  Sparkles, Clock, ShieldCheck, Zap, Award, CheckCircle2,
  X, Wind, Users, AlertCircle, Loader2, MapPin, GraduationCap, Timer, Info, Lightbulb, Trash2, UserCheck, Radio
} from "lucide-react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { 
  FreeClassReport, FreeClassConfig, DEFAULT_FREE_CLASS_CONFIG, 
  calculateCommunityConfidence, getRemainingTimeText, formatTimeAgo 
} from "@/lib/freeClassFinder";

function FreeClassFinderContent() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  const [reports, setReports] = useState<FreeClassReport[]>([]);
  const [config, setConfig] = useState<FreeClassConfig>(DEFAULT_FREE_CLASS_CONFIG);
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("ALL");
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL");
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [filterAC, setFilterAC] = useState(false);

  // Deep Link Room Search Param Handling
  useEffect(() => {
    const roomParam = searchParams.get("room");
    if (roomParam) {
      setSearchQuery(roomParam);
      setSelectedCollege("ALL");
      setSelectedFloor("ALL");
      setFilterAC(false);
      setMinCapacity(0);
    }
  }, [searchParams]);

  // Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTimerReport, setSelectedTimerReport] = useState<FreeClassReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form Fields (Empty Defaults for Pure Placeholder UX)
  const [formCollege, setFormCollege] = useState("");
  const [formBlock, setFormBlock] = useState("");
  const [formFloor, setFormFloor] = useState("3");
  const [formRoomNumber, setFormRoomNumber] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formHasAC, setFormHasAC] = useState(false);
  const [formExpectedDuration, setFormExpectedDuration] = useState("30");

  // Live Timer Tick (Updates remaining time display every 30s)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Run Backend Background Cleanup Trigger
  useEffect(() => {
    fetch("/api/free-class-finder").catch(() => {});
  }, []);

  // Fetch Admin Configuration & Module Feature Toggle
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "platform_config", "free_class_finder"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsEnabled(data.enabled ?? false);
          setConfig({
            expiryMinutes: data.expiryMinutes || 30,
            minConfidenceThreshold: data.minConfidenceThreshold || 60,
            reportRateLimitMinutes: data.reportRateLimitMinutes || 5
          });
        } else {
          setIsEnabled(false);
        }
      },
      (err) => {
        console.warn("Free class finder config listener notice:", err.message);
        setIsEnabled(false);
      }
    );
    return () => unsub();
  }, []);

  // Fetch Reports Real-time from exact collection: freeClassrooms
  useEffect(() => {
    if (isEnabled === false) return;

    const collectionName = "freeClassrooms";
    const unsub = onSnapshot(
      collection(db, collectionName),
      (snap) => {
        const list: FreeClassReport[] = [];
        const currentTime = Date.now();

        snap.forEach((d) => {
          const data = d.data();
          const createdAt = data.createdAtMs || (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (Number(data.createdAt) || currentTime));
          const durationMin = data.expectedFreeDurationMinutes || 30;
          const expiresAtMs = data.expiresAtMs || (data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : (createdAt + durationMin * 60 * 1000));
          const trueVotes = data.trueVotes || 0;
          const falseVotes = data.falseVotes || 0;

          // ── Lifecycle Filtering Rules ─────────────────────────────────────
          if (expiresAtMs <= currentTime) return;
          if (falseVotes >= 5 || (falseVotes > trueVotes && falseVotes > 0)) return;
          if (data.status === "flagged") return;

          const rep: FreeClassReport = {
            id: d.id,
            collegeName: data.collegeName || "SRM IST",
            block: data.block || "Tech Park (TP)",
            floor: data.floor || 1,
            roomNumber: data.roomNumber || d.id,
            capacity: data.capacity,
            hasAC: data.hasAC,
            reporterUid: data.reporterUid,
            reporterName: data.reporterName,
            createdAt,
            createdAtMs: createdAt,
            expiresAt: expiresAtMs,
            expiresAtMs: expiresAtMs,
            expectedFreeDurationMinutes: durationMin,
            trueVotes,
            falseVotes,
            voters: data.voters || {},
            reporterCount: data.reporterCount || 1,
            status: data.status || "active"
          };

          const conf = calculateCommunityConfidence(trueVotes, falseVotes);
          rep.confidenceScore = conf.score ?? 0;
          list.push(rep);
        });

        list.sort((a, b) => b.createdAt - a.createdAt);
        setReports(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Free class reports listener notice:", err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [config.expiryMinutes, isEnabled]);

  // Dynamic Live Filter for Reports (Automatically purges expired cards)
  const activeLiveReports = useMemo(() => {
    const currentTime = Date.now();
    return reports.filter((r) => {
      const targetExpiry = r.expiresAtMs || (r.createdAt + (r.expectedFreeDurationMinutes || 30) * 60 * 1000);
      return targetExpiry > currentTime;
    });
  }, [reports, now]);

  // Dynamic Colleges / Buildings created by users in active reports
  const dynamicColleges = useMemo(() => {
    const set = new Set<string>();
    activeLiveReports.forEach((r) => {
      if (r.collegeName?.trim()) set.add(r.collegeName.trim());
      if (r.block?.trim()) set.add(r.block.trim());
    });
    return Array.from(set).sort();
  }, [activeLiveReports]);

  // Compute My Active Reports (LEFT PANEL)
  const myActiveReports = useMemo(() => {
    if (!user) return [];
    return activeLiveReports.filter((r) => r.reporterUid === user.uid);
  }, [activeLiveReports, user]);

  // Compute Recommended Rooms
  const recommendedRooms = useMemo(() => {
    return activeLiveReports
      .filter((r) => (r.confidenceScore || 0) >= config.minConfidenceThreshold)
      .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));
  }, [activeLiveReports, config.minConfidenceThreshold]);

  // Compute Filtered Community Reports (RIGHT PANEL)
  const filteredReports = useMemo(() => {
    return activeLiveReports.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRoom = r.roomNumber.toLowerCase().includes(q);
        const matchBlock = r.block.toLowerCase().includes(q);
        const matchCollege = (r.collegeName || "").toLowerCase().includes(q);
        if (!matchRoom && !matchBlock && !matchCollege) return false;
      }
      if (
        selectedCollege !== "ALL" && 
        !r.collegeName?.toLowerCase().includes(selectedCollege.toLowerCase()) &&
        !r.block?.toLowerCase().includes(selectedCollege.toLowerCase())
      ) return false;
      if (selectedFloor !== "ALL" && String(r.floor) !== selectedFloor) return false;
      if (minCapacity > 0 && (r.capacity || 0) < minCapacity) return false;
      if (filterAC && !r.hasAC) return false;
      return true;
    });
  }, [activeLiveReports, searchQuery, selectedCollege, selectedFloor, minCapacity, filterAC]);

  // Submit Free Classroom Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to report a free classroom.", "error");
      return;
    }

    if (!formCollege.trim()) {
      showToast("Please enter a college / institution name.", "error");
      return;
    }

    if (!formBlock.trim()) {
      showToast("Please enter a block / building name.", "error");
      return;
    }

    if (!formRoomNumber.trim()) {
      showToast("Please enter a valid room number.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const currentTime = Date.now();
      const cleanCollege = formCollege.trim();
      const cleanBlock = formBlock.trim();
      const durationNum = formExpectedDuration === "until_next_period" 
        ? 60 
        : (formExpectedDuration === "not_sure" ? 60 : parseInt(formExpectedDuration, 10) || 30);
      const formattedRoom = formRoomNumber.toUpperCase().includes(cleanBlock.toUpperCase())
        ? formRoomNumber.trim().toUpperCase()
        : `${cleanBlock.toUpperCase()}-${formRoomNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;

      // Construct Optimistic UI Card
      const optimisticReport: FreeClassReport = {
        id: formattedRoom,
        collegeName: cleanCollege,
        block: cleanBlock,
        floor: formFloor === "10" ? "10+" : (parseInt(formFloor, 10) || 1),
        roomNumber: formattedRoom,
        capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
        hasAC: formHasAC,
        expectedFreeDurationMinutes: durationNum,
        reporterUid: user.uid,
        reporterName: user.displayName || user.email?.split("@")[0] || "Student",
        createdAt: currentTime,
        createdAtMs: currentTime,
        expiresAt: currentTime + durationNum * 60 * 1000,
        expiresAtMs: currentTime + durationNum * 60 * 1000,
        trueVotes: 0,
        falseVotes: 0,
        voters: {},
        reporterCount: 1,
        status: "active",
        confidenceScore: 0
      };

      setReports((prev) => [
        optimisticReport,
        ...prev.filter((r) => r.id !== optimisticReport.id)
      ]);

      // Reset filters so new room is visible
      setSelectedCollege("ALL");
      setSelectedFloor("ALL");
      setSearchQuery("");
      setFilterAC(false);
      setMinCapacity(0);

      // Send payload to API
      const token = await user.getIdToken();
      const payload = {
        action: "create",
        collegeName: cleanCollege,
        block: cleanBlock,
        floor: formFloor,
        roomNumber: formRoomNumber,
        capacity: formCapacity,
        hasAC: formHasAC,
        expectedFreeDurationMinutes: formExpectedDuration
      };

      const res = await fetch("/api/free-class-finder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to submit classroom report.");
      }

      showToast(`⚡ Room ${formattedRoom} added to live free classroom list!`, "success");
      setIsReportModalOpen(false);
      setFormCollege("");
      setFormBlock("");
      setFormRoomNumber("");
      setFormCapacity("");
    } catch (err: any) {
      console.error("[Free Class Finder Submit Error]:", err);
      showToast("Failed to report classroom: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Reporter Delete Report Handler
  const handleDeleteRoomReport = async (report: FreeClassReport) => {
    if (!user) return;
    if (!confirm(`Delete this free classroom report for Room ${report.roomNumber}?`)) return;

    setActionLoading(`${report.id}-delete`);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/free-class-finder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "delete",
          reportId: report.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to delete classroom report.");
      }

      // Optimistically remove from local state
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      showToast(`🗑 Room ${report.roomNumber} report deleted successfully.`, "success");
    } catch (err: any) {
      console.error("Delete report error:", err);
      showToast("Failed to delete report: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Community Vote Handler
  const handleVote = async (report: FreeClassReport, voteType: "true" | "false") => {
    if (!user) {
      showToast("Please login to vote on classroom status.", "error");
      return;
    }

    if (report.reporterUid === user.uid) {
      showToast("You cannot vote on your own classroom report.", "error");
      return;
    }

    setActionLoading(`${report.id}-${voteType}`);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/free-class-finder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          action: "vote",
          reportId: report.id,
          voteType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to register vote.");
      }
    } catch (err: any) {
      console.error("Vote error:", err);
      showToast(err.message || "Failed to register vote.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── UNDER DEVELOPMENT MAINTENANCE SCREEN (If Admin Toggle is OFF) ─────────
  if (isEnabled === false) {
    return (
      <div className="min-h-screen bg-[#050308] text-white pt-28 pb-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border border-purple-500/30 text-center space-y-6 shadow-[0_0_50px_rgba(139,92,246,0.2)] animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto shadow-[0_0_20px_rgba(139,92,246,0.2)]">
            <Building2 size={32} />
          </div>

          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              🚧 Free Class Finder is Under Development
            </h2>
            <div className="text-xs sm:text-sm text-gray-300 space-y-2.5 leading-relaxed">
              <p>We're building something amazing for you! 💜</p>
              <p>The Free Class Finder is currently being improved with smarter community features and a better experience.</p>
              <p>It will be available very soon.</p>
              <p>Until then, explore other awesome features inside Paperino.</p>
              <p className="text-purple-300 font-semibold pt-1">Thank you for your patience ❤️</p>
            </div>
          </div>

          <a
            href="/"
            className="inline-flex items-center justify-center w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-all cursor-pointer border border-purple-400/30"
          >
            Explore Paperino
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050308] text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Paperino Style Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 border border-purple-500/25 bg-gradient-to-r from-[#120924] via-[#0d071a] to-[#050308] shadow-[0_0_50px_rgba(139,92,246,0.15)]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} className="text-purple-400" /> Paperino Labs · Free Class Finder
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Campus <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">Free Class Finder</span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                Community-driven free classroom reports. Vote whether rooms are free, track live countdown timers, and discover open study spaces across campuses.
              </p>
            </div>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 border border-purple-400/30 flex-shrink-0"
            >
              <Plus size={18} />
              <span>Report Free Classroom</span>
            </button>
          </div>
        </div>

        {/* 🏆 Recommended Free Rooms Section */}
        {recommendedRooms.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                <Award size={18} />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Top Recommended Free Rooms</h2>
              <span className="text-xs text-purple-400 font-mono">Confidence &gt;= {config.minConfidenceThreshold}%</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedRooms.slice(0, 3).map((room, idx) => {
                const medals = ["🥇", "🥈", "🥉"];
                const conf = calculateCommunityConfidence(room.trueVotes, room.falseVotes);
                const timerState = getRemainingTimeText(room.createdAt, room.expectedFreeDurationMinutes || 30, room.expiresAtMs || room.expiresAt);

                return (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl bg-gradient-to-b from-[#130b28] to-[#0a0614] border border-purple-500/30 hover:border-purple-500/50 transition-all flex items-center justify-between shadow-[0_0_20px_rgba(139,92,246,0.12)] relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{medals[idx] || "🏆"}</span>
                      <div>
                        <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                          <MapPin size={11} /> {room.collegeName || "SRM IST"}
                        </div>
                        <h3 className="text-lg font-bold text-white">{room.roomNumber}</h3>
                        <p className="text-xs text-gray-400">
                          {room.block} · Floor {room.floor}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-extrabold text-purple-300 font-mono">
                        {conf.label}
                      </span>
                      <p className="text-[10px] text-purple-400/80 font-semibold uppercase">{timerState.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Controls Bar: Search & Filters */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18} />
              <input
                type="text"
                placeholder="Search college, building or room number (e.g. SRM IST, TP-305, E Block)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500/60 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Dynamic College / Building Filter */}
            <div className="w-full md:w-52">
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="w-full bg-[#0d0818] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
              >
                <option value="ALL">All Colleges / Buildings</option>
                {dynamicColleges.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Floor Filter */}
            <div className="w-full md:w-36">
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="w-full bg-[#0d0818] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 transition-colors cursor-pointer"
              >
                <option value="ALL">All Floors</option>
                <option value="0">Ground</option>
                <option value="1">Floor 1</option>
                <option value="2">Floor 2</option>
                <option value="3">Floor 3</option>
                <option value="4">Floor 4</option>
                <option value="5">Floor 5</option>
                <option value="6">Floor 6</option>
                <option value="7">Floor 7</option>
                <option value="8">Floor 8</option>
                <option value="9">Floor 9</option>
                <option value="10+">Floor 10+</option>
              </select>
            </div>
          </div>

          {/* Quick Toggles */}
          <div className="flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-white/5">
            <button
              onClick={() => setFilterAC(!filterAC)}
              className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                filterAC ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-white/5 border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Wind size={14} /> AC Only
            </button>

            <div className="flex items-center gap-2 ml-auto text-gray-400">
              <span>Min Capacity:</span>
              <select
                value={minCapacity}
                onChange={(e) => setMinCapacity(parseInt(e.target.value, 10))}
                className="bg-[#0d0818] border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 cursor-pointer"
              >
                <option value={0}>Any</option>
                <option value={30}>30+ Seats</option>
                <option value={60}>60+ Seats</option>
                <option value={100}>100+ Seats</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── TWO-PANEL REALTIME DASHBOARD ── */}
        {loading || isEnabled === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-400" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ── LEFT PANEL: My Active Reports ── */}
            {user && (
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                      <UserCheck size={16} />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide">My Active Reports</h2>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/25">
                    {myActiveReports.length} {myActiveReports.length === 1 ? "room" : "rooms"}
                  </span>
                </div>

                {myActiveReports.length === 0 ? (
                  <div className="p-6 rounded-3xl glass-panel border border-white/10 text-center space-y-3 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                    <Building2 size={32} className="mx-auto text-purple-400/40" />
                    <p className="text-xs text-gray-400">You haven't reported any free classrooms yet.</p>
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Report Free Room
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myActiveReports.map((report) => {
                      const timerState = getRemainingTimeText(report.createdAt, report.expectedFreeDurationMinutes || 30, report.expiresAtMs || report.expiresAt);
                      return (
                        <div
                          key={`my-${report.id}`}
                          className="glass-panel p-5 rounded-3xl border border-purple-500/40 bg-gradient-to-b from-[#160d2e] to-[#0a0614] shadow-[0_0_25px_rgba(139,92,246,0.15)] space-y-4 relative group"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-bold text-purple-300">
                                <GraduationCap size={13} className="text-purple-400" />
                                <span>{report.collegeName || "SRM IST"}</span>
                              </div>
                              <h3 className="text-xl font-black text-white mt-0.5 tracking-wide">{report.roomNumber}</h3>
                              <p className="text-xs text-gray-400 font-medium">{report.block} • Floor {report.floor}</p>
                            </div>
                            <span className="text-[10px] font-bold text-purple-200 bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                              Your Report
                            </span>
                          </div>

                          {/* Expected Free Timer */}
                          <div 
                            onClick={() => setSelectedTimerReport(report)}
                            className="p-3 rounded-2xl bg-black/50 border border-white/10 cursor-pointer flex items-center justify-between hover:border-purple-500/40 transition-colors"
                          >
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                              <Timer size={14} className="text-purple-400" /> Expected Free:
                            </span>
                            <span className="text-xs font-bold text-purple-300 font-mono">
                              {timerState.text}
                            </span>
                          </div>

                          {/* Details & Delete Report Button */}
                          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                            <span className="text-gray-400 text-[11px]">
                              Reported {formatTimeAgo(report.createdAt)}
                            </span>
                            <button
                              onClick={() => handleDeleteRoomReport(report)}
                              disabled={actionLoading === `${report.id}-delete`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                            >
                              {actionLoading === `${report.id}-delete` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
                              <span>Delete Report</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── RIGHT PANEL: Live Community Free Classrooms ── */}
            <div className={user ? "lg:col-span-8 space-y-4" : "lg:col-span-12 space-y-4"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                    <Radio size={16} className="text-purple-400 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-wide">Live Community Free Classrooms</h2>
                </div>
                <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/25">
                  {filteredReports.length} {filteredReports.length === 1 ? "room" : "rooms"}
                </span>
              </div>

              {filteredReports.length === 0 ? (
                <div className="text-center py-16 px-4 glass-panel rounded-3xl border border-white/5 border-dashed space-y-4">
                  <Building2 size={48} className="mx-auto text-gray-600 mb-2" />
                  <h3 className="text-lg font-bold text-white mb-1">No Free Classrooms Found</h3>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto">
                    Be the first to report an available classroom to help your fellow students!
                  </p>
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus size={16} /> Report Classroom
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredReports.map((report) => {
                      const myVote = user ? report.voters?.[user.uid] : undefined;
                      const conf = calculateCommunityConfidence(report.trueVotes, report.falseVotes);
                      const timerState = getRemainingTimeText(report.createdAt, report.expectedFreeDurationMinutes || 30, report.expiresAtMs || report.expiresAt);
                      const isReporter = user?.uid === report.reporterUid;
                      const isTargetRoom = searchParams.get("room") === report.roomNumber;

                      return (
                        <div
                          key={report.id}
                          className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col justify-between gap-5 relative group shadow-[0_0_20px_rgba(0,0,0,0.4)] ${
                            isTargetRoom
                              ? "border-purple-500 ring-2 ring-purple-500/50 shadow-[0_0_30px_rgba(139,92,246,0.4)] bg-purple-950/20"
                              : "border-white/10 hover:border-purple-500/40"
                          }`}
                        >
                          {/* Card Section 1: Header */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                                <GraduationCap size={15} className="text-purple-400" />
                                <span>{report.collegeName || "SRM IST"}</span>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400 font-medium">
                                {report.block} • Floor {report.floor}
                              </p>
                              <h3 className="text-2xl font-black text-white tracking-wide mt-0.5">{report.roomNumber}</h3>
                            </div>

                            {/* Reported Relative Time */}
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 pt-1">
                              <Clock size={12} className="text-gray-500" />
                              <span>Reported by <strong className="text-gray-200 font-semibold">{report.reporterName || "Student"}</strong> ({formatTimeAgo(report.createdAt)})</span>
                              {isReporter && (
                                <span className="ml-auto text-[10px] text-purple-300/80 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full font-semibold">
                                  Your Report
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Section 2: Expected Free Timer Container */}
                          <div 
                            onClick={() => setSelectedTimerReport(report)}
                            className="p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-purple-500/30 hover:bg-black/60 transition-all cursor-pointer flex items-center justify-between group/timer shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                            title="Click to view detailed expected time remaining"
                          >
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium group-hover/timer:text-gray-200 transition-colors">
                              <Timer size={15} className={timerState.isExpired ? "text-amber-400" : "text-purple-400"} />
                              <span>Expected Free:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                timerState.isExpired
                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse"
                                  : "bg-purple-500/15 border-purple-500/30 text-purple-300 group-hover/timer:border-purple-400/50"
                              }`}>
                                {timerState.text}
                              </span>
                              <Info size={14} className="text-gray-500 group-hover/timer:text-purple-400 transition-colors" />
                            </div>
                          </div>

                          {/* Card Section 3: Community Status & Voting */}
                          <div className="space-y-3 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-300">Community Status</span>
                              <span className="text-xs font-extrabold font-mono text-purple-300">
                                Confidence: {conf.label}
                              </span>
                            </div>

                            {/* Voting Buttons: True / False */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* True */}
                              <button
                                onClick={() => handleVote(report, "true")}
                                disabled={actionLoading !== null || isReporter}
                                title={isReporter ? "You cannot vote on your own report" : "Vote True"}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                  isReporter
                                    ? "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed opacity-60"
                                    : myVote === "true"
                                    ? "bg-purple-500/25 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                                    : "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
                                }`}
                              >
                                {actionLoading === `${report.id}-true` ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} className={myVote === "true" ? "text-purple-300" : "text-emerald-400"} />
                                )}
                                <span>{report.trueVotes} True</span>
                              </button>

                              {/* False */}
                              <button
                                onClick={() => handleVote(report, "false")}
                                disabled={actionLoading !== null || isReporter}
                                title={isReporter ? "You cannot vote on your own report" : "Vote False"}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                  isReporter
                                    ? "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed opacity-60"
                                    : myVote === "false"
                                    ? "bg-rose-500/25 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                                    : "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
                                }`}
                              >
                                {actionLoading === `${report.id}-false` ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <IconX size={14} className={myVote === "false" ? "text-rose-300" : "text-rose-400"} />
                                )}
                                <span>{report.falseVotes} False</span>
                              </button>
                            </div>
                          </div>

                          {/* Card Section 4: Amenities */}
                          {(report.hasAC || report.capacity) && (
                            <div className="flex items-center gap-3 text-xs pt-1 border-t border-white/5">
                              {report.hasAC && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold">
                                  <Wind size={13} /> AC Room
                                </span>
                              )}
                              {report.capacity && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-medium ml-auto">
                                  <Users size={13} className="text-purple-400" /> {report.capacity} Seats
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 💡 Community Note */}
                  <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-purple-900/10 to-transparent flex items-start sm:items-center gap-3.5 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                      <Lightbulb size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>💡 Community Note</span>
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        This classroom is community-reported. If you have seen this room recently, please mark it as True or False. Your verification helps other students find genuinely available classrooms.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expected Free Time Details Modal */}
      {selectedTimerReport && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedTimerReport(null)}></div>
          <div className="relative w-full max-w-md bg-[#0e091b] border border-purple-500/40 p-6 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.3)] z-10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Timer size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Expected Free Details</h3>
                  <p className="text-xs text-gray-400">Room {selectedTimerReport.roomNumber}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTimerReport(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <span className="font-semibold text-gray-400">Estimated Duration:</span>
                <span className="font-bold text-purple-300 font-mono">{selectedTimerReport.expectedFreeDurationMinutes || 30} mins</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <span className="font-semibold text-gray-400">Time Remaining:</span>
                <span className="font-extrabold text-white font-mono">
                  {getRemainingTimeText(selectedTimerReport.createdAt, selectedTimerReport.expectedFreeDurationMinutes || 30, selectedTimerReport.expiresAtMs || selectedTimerReport.expiresAt).text}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
                <span className="font-semibold text-gray-400">Reported By:</span>
                <span className="font-medium text-gray-200">{selectedTimerReport.reporterName || "Student"} ({formatTimeAgo(selectedTimerReport.createdAt)})</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTimerReport(null)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Classroom Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsReportModalOpen(false)}></div>

          <div className="relative w-full max-w-lg bg-[#0e091b] border border-purple-500/30 p-6 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.25)] z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Report Free Classroom</h3>
                  <p className="text-xs text-gray-400">Help students find an available room</p>
                </div>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              {/* Field 1: College / Institution */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">College / Institution *</label>
                <input
                  type="text"
                  placeholder="e.g. SRM IST Trichy, Anna University, PSG Tech"
                  value={formCollege}
                  onChange={(e) => setFormCollege(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500/60 focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Field 2: Block / Building */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Block / Building *</label>
                  <input
                    type="text"
                    placeholder="e.g. Tech Park (TP), Main Block, Academic Block"
                    value={formBlock}
                    onChange={(e) => setFormBlock(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500/60 focus:outline-none focus:border-purple-500/50"
                    required
                  />
                </div>

                {/* Field 3: Floor */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Floor *</label>
                  <select
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    <option value="0" className="bg-[#0e091b]">Ground Floor</option>
                    <option value="1" className="bg-[#0e091b]">Floor 1</option>
                    <option value="2" className="bg-[#0e091b]">Floor 2</option>
                    <option value="3" className="bg-[#0e091b]">Floor 3</option>
                    <option value="4" className="bg-[#0e091b]">Floor 4</option>
                    <option value="5" className="bg-[#0e091b]">Floor 5</option>
                    <option value="6" className="bg-[#0e091b]">Floor 6</option>
                    <option value="7" className="bg-[#0e091b]">Floor 7</option>
                    <option value="8" className="bg-[#0e091b]">Floor 8</option>
                    <option value="9" className="bg-[#0e091b]">Floor 9</option>
                    <option value="10" className="bg-[#0e091b]">Floor 10+</option>
                  </select>
                </div>
              </div>

              {/* Field 4: Room Number */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Room Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 305 or TP-305"
                  value={formRoomNumber}
                  onChange={(e) => setFormRoomNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500/60 focus:outline-none focus:border-purple-500/50"
                  required
                />
              </div>

              {/* Field 5: Expected Free Duration Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">How long do you think this room will remain free? *</label>
                <select
                  value={formExpectedDuration}
                  onChange={(e) => setFormExpectedDuration(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  <option value="10" className="bg-[#0e091b] text-white py-2">10 mins</option>
                  <option value="20" className="bg-[#0e091b] text-white py-2">20 mins</option>
                  <option value="30" className="bg-[#0e091b] text-white py-2">30 mins</option>
                  <option value="45" className="bg-[#0e091b] text-white py-2">45 mins</option>
                  <option value="60" className="bg-[#0e091b] text-white py-2">1 hour</option>
                  <option value="120" className="bg-[#0e091b] text-white py-2">2 hours</option>
                  <option value="180" className="bg-[#0e091b] text-white py-2">3 hours</option>
                  <option value="until_next_period" className="bg-[#0e091b] text-white py-2">Until next period</option>
                  <option value="not_sure" className="bg-[#0e091b] text-white py-2">Not sure</option>
                </select>
              </div>

              {/* Field 6: Seating Capacity (Optional) */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Seating Capacity (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 60"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500/60 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Field 7: Air Conditioned (AC) Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formHasAC}
                    onChange={(e) => setFormHasAC(e.target.checked)}
                    className="rounded bg-white/5 border-white/10 text-purple-500 focus:ring-0"
                  />
                  <span>Air Conditioned (AC)</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Submit Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FreeClassFinderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050308] flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={40} />
      </div>
    }>
      <FreeClassFinderContent />
    </Suspense>
  );
}
