"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Play, Search, MonitorPlay, Globe, Loader2, ChevronDown,
  BookOpen, Sparkles, X, ExternalLink, Clock, Award,
  CheckCircle2, Info, ArrowLeft
} from "lucide-react";
import dynamic from "next/dynamic";
import { SUBJECTS } from "@/lib/subjects";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";

const AmbientOrbs = dynamic(() => import("@/components/AmbientOrbs"), { ssr: false });

// Build a flat subject list from the existing SUBJECTS constant
const ALL_SUBJECTS = (() => {
  const seen = new Set<string>();
  const list: { id: string; name: string }[] = [];
  Object.values(SUBJECTS).forEach((subs) => {
    subs.forEach((s) => {
      if (!seen.has(s.name)) {
        seen.add(s.name);
        list.push(s);
      }
    });
  });
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
})();

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  durationFormatted: string;
  durationMinutes: number;
  detectedLanguage: string;
  embeddable?: boolean;
  score: number;
  reasons: string[];
  rankLabel: string;
}

type LanguageOption = "both" | "tamil" | "english";

const VideoThumbnail = ({ video }: { video: VideoResult }) => {
  const [imgSrc, setImgSrc] = useState(
    video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
  );
  const [errorCount, setErrorCount] = useState(0);

  const handleError = () => {
    if (errorCount === 0) {
      setImgSrc(`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`);
      setErrorCount(1);
    } else if (errorCount === 1) {
      setImgSrc(`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`);
      setErrorCount(2);
    } else {
      setImgSrc(""); // trigger fallback UI
    }
  };

  return (
    <div className="w-full aspect-video bg-black flex items-center justify-center relative overflow-hidden">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={video.title}
          className="w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-600">
          <MonitorPlay size={32} className="mb-2 opacity-50" />
          <span className="text-[10px] font-bold">NO THUMBNAIL</span>
        </div>
      )}
    </div>
  );
};

export default function YouTubeStudyPage() {
  const { showToast } = useToast();
  const { user } = useAuth();

  // Form state
  const [subject, setSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<LanguageOption>("both");
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Feature flag state
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConfig = () => {
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem("paperino_site_config_maint");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.youtubeStudy !== undefined) {
              setFeatureEnabled(parsed.youtubeStudy);
            } else {
              setFeatureEnabled(true);
            }
          } catch (e) {
            setFeatureEnabled(true);
          }
        }
      }
    };
    checkConfig();
    const interval = setInterval(checkConfig, 2000);
    return () => clearInterval(interval);
  }, []);

  // Results state
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [normalizedTopic, setNormalizedTopic] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Player state
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Reset iframe state when active video changes
  useEffect(() => {
    if (activeVideo) {
      setIframeLoaded(false);
    }
  }, [activeVideo]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSubjects = ALL_SUBJECTS.filter((s) =>
    s.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const getSelectedSubjectName = () => {
    if (customSubject) return customSubject;
    const found = ALL_SUBJECTS.find((s) => s.id === subject);
    return found ? found.name : "";
  };

  const handleSearch = useCallback(async () => {
    const subjectName = getSelectedSubjectName();
    if (!subjectName) {
      showToast("Please select a subject.", "error");
      return;
    }
    if (!topic.trim() || topic.trim().length < 2) {
      showToast("Please enter a topic (at least 2 characters).", "error");
      return;
    }

    setLoading(true);
    setError(null);
    setVideos([]);
    setHasSearched(true);

    try {
      const res = await fetch("/api/youtube-study/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectName,
          topic: topic.trim(),
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setVideos(data.videos || []);
      setNormalizedTopic(data.normalizedTopic || topic.trim());

      if ((data.videos || []).length === 0) {
        setError("No relevant videos found. Try a different topic or language.");
      }
    } catch (err) {
      setError("Unable to load videos right now. Please try again.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, customSubject, topic, language]);

  const getRankColor = (label: string) => {
    if (label === "Best Match") return "from-amber-500 to-yellow-400";
    if (label === "Highly Relevant") return "from-violet-500 to-purple-400";
    return "from-cyan-500 to-blue-400";
  };

  const getRankIcon = (label: string) => {
    if (label === "Best Match") return "🥇";
    if (label === "Highly Relevant") return "🥈";
    return "✓";
  };

  // Player modal
  if (activeVideo) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-[rgba(var(--primary-rgb),0.15)] via-[var(--background)] to-[var(--background)] text-white relative overflow-hidden">
        <AmbientOrbs />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:45px_45px]" />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8">
          {/* Back button */}
          <button
            onClick={() => setActiveVideo(null)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm font-semibold group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to results
          </button>

          {/* Video title */}
          <div className="mb-6">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-1">
              {getSelectedSubjectName()}
            </p>
            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
              {activeVideo.title}
            </h1>
            <p className="text-sm text-gray-400 mt-1">{activeVideo.channelTitle}</p>
          </div>

          {/* YouTube Player */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(139,92,246,0.15)] bg-black/50">
            {activeVideo.embeddable === false ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-white/5 rounded-2xl bg-black" style={{ minHeight: "400px" }}>
                <MonitorPlay size={48} className="text-gray-500 mb-4" />
                <h3 className="text-lg font-bold text-gray-300 mb-2">This video can&apos;t be played inside Paperino.</h3>
                <p className="text-sm text-gray-500 max-w-md mb-6">
                  The creator has disabled embedding for this video. You can still watch it directly on YouTube.
                </p>
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                >
                  <MonitorPlay size={16} />
                  Open on YouTube
                  <ExternalLink size={14} />
                </a>
              </div>
            ) : (
              <div className="relative w-full bg-black" style={{ paddingTop: "56.25%" }}>
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                    <Loader2 size={32} className="text-red-500 animate-spin mb-3" />
                    <p className="text-gray-400 text-sm animate-pulse font-medium">Loading player...</p>
                  </div>
                )}
                <iframe
                  className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
                  src={`https://www.youtube.com/embed/${activeVideo.videoId}?rel=0`}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <a
              href={`https://www.youtube.com/watch?v=${activeVideo.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 text-sm font-bold hover:bg-red-600/30 transition-all"
            >
              <MonitorPlay size={16} />
              Open on YouTube
              <ExternalLink size={12} />
            </a>
            <button
              onClick={() => setActiveVideo(null)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-bold hover:bg-white/10 transition-all"
            >
              <X size={14} />
              Close Player
            </button>
          </div>

          {/* Video info */}
          <div className="mt-6 flex flex-wrap gap-3">
            {activeVideo.durationFormatted && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <Clock size={12} /> {activeVideo.durationFormatted}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <Globe size={12} /> {activeVideo.detectedLanguage}
            </span>
            {activeVideo.reasons.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={12} /> {activeVideo.reasons[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[rgba(var(--primary-rgb),0.15)] via-[var(--background)] to-[var(--background)] text-white py-8 relative overflow-hidden">
      <AmbientOrbs />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:45px_45px]" />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4">
        {featureEnabled === false && (
          <div className="mb-8 p-6 backdrop-blur-md bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col items-center justify-center text-center">
            <MonitorPlay size={40} className="text-rose-400 mb-3" />
            <h2 className="text-xl font-bold text-rose-200 mb-2">Feature Disabled</h2>
            <p className="text-rose-200/70 text-sm max-w-md">
              YouTube Study is currently disabled by the administrators. Please check back later or explore other Paperino Labs features.
            </p>
          </div>
        )}

        {featureEnabled !== false && (
          <>
            {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-300 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4">
            <MonitorPlay size={14} className="text-red-400" />
            <span>Paperino Labs</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-red-100 to-red-200 mb-3 tracking-tight">
            YouTube Study
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
            Tell us what you want to learn. We&apos;ll find the right video.
          </p>
        </div>

        {/* Search Form */}
        <div className="backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_0_55px_rgba(139,92,246,0.08)] mb-8">

          {/* Subject Select */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Subject
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-left hover:border-violet-500/40 focus:border-violet-500/50 focus:outline-none transition-colors"
              >
                <span className={getSelectedSubjectName() ? "text-white" : "text-gray-500"}>
                  {getSelectedSubjectName() || "Select a subject..."}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${isSubjectDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isSubjectDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#0d0820]/98 backdrop-blur-2xl border border-violet-500/20 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-h-72 overflow-hidden">
                  <div className="p-2 border-b border-white/5">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search subjects..."
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/40"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-52 p-1">
                    {/* Custom subject option */}
                    <button
                      onClick={() => {
                        setSubject("");
                        setCustomSubject("");
                        setIsSubjectDropdownOpen(false);
                        setSubjectSearch("");
                        // Show custom input
                        const input = document.getElementById("custom-subject-input");
                        if (input) input.focus();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-violet-300 hover:bg-violet-500/10 transition-colors"
                    >
                      <Sparkles size={12} />
                      <span>Type a custom subject...</span>
                    </button>
                    {filteredSubjects.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSubject(s.id);
                          setCustomSubject("");
                          setIsSubjectDropdownOpen(false);
                          setSubjectSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          subject === s.id
                            ? "bg-violet-500/15 text-violet-300 font-semibold"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Custom subject input (shown when "Type a custom subject" is selected) */}
            {!subject && !customSubject && (
              <input
                id="custom-subject-input"
                type="text"
                placeholder="Or type any subject name..."
                value={customSubject}
                onChange={(e) => {
                  setCustomSubject(e.target.value);
                  setSubject("");
                }}
                className="w-full mt-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/40 transition-colors"
              />
            )}
          </div>

          {/* Topic Input */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              What do you want to learn?
            </label>
            <input
              type="text"
              placeholder="e.g., Laplace Transform, Eigenvalues, Context Free Grammar..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) handleSearch();
              }}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-500/40 transition-colors"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              You can type in English, Tamil, or Tanglish — we&apos;ll understand the intent.
            </p>
          </div>

          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Language Preference
            </label>
            <div className="flex gap-2">
              {(["both", "tamil", "english"] as LanguageOption[]).map((lang_option) => (
                <button
                  key={lang_option}
                  onClick={() => setLanguage(lang_option)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                    language === lang_option
                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                      : "bg-white/[0.04] border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <Globe size={12} />
                  {lang_option === "both" ? "Both" : lang_option === "tamil" ? "Tamil" : "English"}
                </button>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(239,68,68,0.3)] hover:shadow-[0_0_35px_rgba(239,68,68,0.45)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Finding the best videos...
              </>
            ) : (
              <>
                <Search size={16} />
                Find Best Videos
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
              <MonitorPlay size={20} className="absolute inset-0 m-auto text-red-400" />
            </div>
            <p className="text-gray-400 text-sm mt-4 animate-pulse">Searching for the best study videos...</p>
          </div>
        )}

        {!loading && error && hasSearched && (
          <div className="backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
            <BookOpen size={40} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-sm">{error}</p>
            <p className="text-gray-600 text-xs mt-2">Try a different topic or language.</p>
          </div>
        )}

        {!loading && !error && hasSearched && videos.length > 0 && (
          <div className="space-y-6">
            {/* Results header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Results for &quot;{normalizedTopic}&quot;
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {videos.length} video{videos.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            {/* Video Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video, idx) => (
                <div
                  key={video.videoId}
                  className="group backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]"
                >
                  {/* Thumbnail */}
                  <div className="relative cursor-pointer" onClick={() => setActiveVideo(video)}>
                    <VideoThumbnail video={video} />
                    
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                        <Play size={24} className="text-white ml-1" fill="white" />
                      </div>
                    </div>
                    {/* Rank badge */}
                    <div className={`absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r ${getRankColor(video.rankLabel)} text-white text-[10px] font-bold shadow-lg`}>
                      <span>{getRankIcon(video.rankLabel)}</span>
                      <span>{video.rankLabel}</span>
                    </div>
                    {/* Duration */}
                    {video.durationFormatted && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-bold">
                        {video.durationFormatted}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3
                      className="text-sm font-bold text-white line-clamp-2 mb-1.5 cursor-pointer hover:text-violet-300 transition-colors"
                      onClick={() => setActiveVideo(video)}
                    >
                      {video.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">{video.channelTitle}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        <Globe size={10} /> {video.detectedLanguage}
                      </span>
                      {video.durationFormatted && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          <Clock size={10} /> {video.durationFormatted}
                        </span>
                      )}
                    </div>

                    {/* Why recommended */}
                    {video.reasons.length > 0 && (
                      <details className="group/details">
                        <summary className="flex items-center gap-1 text-[10px] text-violet-400 cursor-pointer hover:text-violet-300 transition-colors">
                          <Info size={10} />
                          Why recommended?
                        </summary>
                        <div className="mt-2 space-y-1 pl-3.5">
                          {video.reasons.map((reason, ri) => (
                            <div key={ri} className="flex items-center gap-1.5 text-[10px] text-emerald-400/80">
                              <CheckCircle2 size={10} className="shrink-0" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Watch button */}
                    <button
                      onClick={() => setActiveVideo(video)}
                      className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2.5 rounded-xl bg-red-600/15 border border-red-500/25 text-red-300 text-xs font-bold hover:bg-red-600/25 hover:border-red-500/40 transition-all"
                    >
                      <Play size={14} fill="currentColor" />
                      Watch Video
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Initial state */}
        {!loading && !hasSearched && (
          <div className="backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <MonitorPlay size={28} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Search for a topic you want to learn</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Select a subject, type the topic, choose your language, and we&apos;ll find the best YouTube study videos for you.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {["Laplace Transform", "Eigenvalues", "Context Free Grammar", "Three Address Code", "Semiconductor Physics"].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTopic(ex)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400 hover:text-white hover:border-violet-500/30 transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
