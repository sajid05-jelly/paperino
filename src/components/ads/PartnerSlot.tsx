"use client";

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { AdPlacementId } from "@/lib/adTypes";
import { useAdSlot } from "@/context/AdsContext";
import { ExternalLink, Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";

interface PartnerSlotProps {
  placement: AdPlacementId;
  className?: string;
}

function subscribeToReducedData(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotionQuery.addEventListener("change", callback);
  return () => reducedMotionQuery.removeEventListener("change", callback);
}

function getReducedDataSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  const saveData = nav.connection?.saveData === true;
  return reducedMotion || saveData;
}

export default function PartnerSlot({ placement, className = "" }: PartnerSlotProps) {
  const { ad, loading, enabled, isVideoPlaying, requestPlay, releasePlay } = useAdSlot(placement);

  const [failedCampaignId, setFailedCampaignId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasEnded, setHasEnded] = useState(false);

  const prefersReducedData = useSyncExternalStore(
    subscribeToReducedData,
    getReducedDataSnapshot,
    () => false
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const impressionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRecordedImpressionRef = useRef(false);
  const lastClickTimeRef = useRef<number>(0);

  // Derived media error state
  const hasMediaError = Boolean(ad?.id && failedCampaignId === ad.id);

  // 1-Second Continuous 50% Visibility Impression & Video Visibility Observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ad || !enabled || hasMediaError) return;

    // Check session deduplication
    const sessionKey = `paperino_imp_${ad.id}_${placement}`;
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) {
        hasRecordedImpressionRef.current = true;
      } else {
        hasRecordedImpressionRef.current = false;
      }
    } catch {
      hasRecordedImpressionRef.current = false;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isAtLeast50PercentVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;

          // ── Impression Tracking Logic ──
          if (isAtLeast50PercentVisible && !hasRecordedImpressionRef.current) {
            // Start 1-second continuous visibility timer
            if (!impressionTimerRef.current) {
              impressionTimerRef.current = setTimeout(() => {
                try {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(sessionKey, "1");
                  }
                } catch {
                  // Fallback for private browsing where storage access is blocked
                }
                hasRecordedImpressionRef.current = true;

                // Send lightweight analytics beacon with replay token
                const payload = JSON.stringify({
                  campaignId: ad.id,
                  placementId: placement,
                  event: "impression",
                  timestamp: Date.now(),
                  eventToken: `${ad.id}_${placement}_imp_${Date.now()}`,
                });

                if (navigator.sendBeacon) {
                  navigator.sendBeacon("/api/campaigns/analytics", payload);
                } else {
                  fetch("/api/campaigns/analytics", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                    keepalive: true,
                  }).catch(() => {});
                }
              }, 1000);
            }
          } else {
            // Cancel timer if ad leaves 50% visibility before 1 full second
            if (impressionTimerRef.current) {
              clearTimeout(impressionTimerRef.current);
              impressionTimerRef.current = null;
            }
          }

          // ── Video Playback Visibility Coordination ──
          if (ad.mediaType === "video" && videoRef.current && !prefersReducedData) {
            if (isAtLeast50PercentVisible && !hasEnded) {
              const canPlay = requestPlay();
              if (canPlay) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
              releasePlay();
            }
          }
        });
      },
      { threshold: [0.0, 0.5, 1.0] }
    );

    observer.observe(container);

    // Pause on tab visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        if (impressionTimerRef.current) {
          clearTimeout(impressionTimerRef.current);
          impressionTimerRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
          releasePlay();
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (impressionTimerRef.current) {
        clearTimeout(impressionTimerRef.current);
        impressionTimerRef.current = null;
      }
      releasePlay();
    };
  }, [ad, enabled, hasMediaError, placement, prefersReducedData, hasEnded, requestPlay, releasePlay]);

  // Handle single-playing coordination: if another video claims playback, pause this one
  useEffect(() => {
    if (ad?.mediaType === "video" && !isVideoPlaying && isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isVideoPlaying, isPlaying, ad?.mediaType]);

  // Click Handler for Destination URL with Analytics
  const handleAdClick = useCallback(() => {
    if (!ad) return;

    // 1-second debounce to eliminate rapid duplicate clicks from double-taps
    const now = Date.now();
    if (now - lastClickTimeRef.current < 1000) {
      return;
    }
    lastClickTimeRef.current = now;

    const payload = JSON.stringify({
      campaignId: ad.id,
      placementId: placement,
      event: "click",
      timestamp: now,
      eventToken: `${ad.id}_${placement}_click_${now}`,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/campaigns/analytics", payload);
    } else {
      fetch("/api/campaigns/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [ad, placement]);

  // Video Manual Toggle Handlers
  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      releasePlay();
    } else {
      if (hasEnded) {
        video.currentTime = 0;
        setHasEnded(false);
      }
      const canPlay = requestPlay();
      if (canPlay) {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setHasEnded(true);
    releasePlay();
  };

  // ── Critical Zero-Ad, Zero-Box Invariant ──────────────────────────────────
  // If loading, no eligible ad, or media error: return null (0px, 0 DOM wrapper)
  if (loading || !enabled || !ad || hasMediaError) {
    return null;
  }

  // ── Placement Layout & Styling Variants ─────────────────────────────────────
  let containerStyles = "relative overflow-hidden group transition-all duration-300";
  let aspectWrapper = "relative w-full overflow-hidden";

  switch (placement) {
    case "home_top":
      containerStyles +=
        " w-full max-w-6xl mx-auto my-4 sm:my-6 rounded-2xl border border-purple-500/20 bg-[#0d071a]/80 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:border-purple-500/40";
      aspectWrapper += " aspect-[6/1] sm:aspect-[8/1] min-h-[70px] max-h-[140px]";
      break;

    case "home_featured":
      containerStyles +=
        " w-full max-w-4xl mx-auto my-8 sm:my-12 rounded-[2rem] border border-purple-500/30 bg-[#0f0a1d]/90 shadow-[0_0_35px_rgba(147,51,234,0.15)] hover:border-purple-500/60 hover:shadow-[0_0_50px_rgba(147,51,234,0.25)]";
      aspectWrapper += " aspect-[16/7] sm:aspect-[21/9] min-h-[160px] max-h-[360px]";
      break;

    case "study_materials":
      containerStyles +=
        " w-full my-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-purple-500/30";
      aspectWrapper += " aspect-[16/6] sm:aspect-[7/2] min-h-[110px] max-h-[200px]";
      break;

    case "desktop_sidebar":
      containerStyles +=
        " hidden lg:block w-full rounded-2xl border border-white/10 bg-white/[0.02] my-4 sticky top-24 hover:border-purple-500/30";
      aspectWrapper += " aspect-[1/2] min-h-[400px]";
      break;

    case "pulse_feed":
      containerStyles +=
        " w-full my-4 rounded-2xl border border-purple-500/20 bg-white/[0.02] hover:border-purple-500/40";
      aspectWrapper += " aspect-[16/7] sm:aspect-[3/1] min-h-[120px] max-h-[220px]";
      break;
  }

  return (
    <div
      ref={containerRef}
      className={`${containerStyles} ${className}`.trim()}
      data-placement={placement}
      data-campaign-id={ad.id}
    >
      <a
        href={ad.destinationUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleAdClick}
        className="block w-full h-full relative cursor-pointer"
        aria-label={`${ad.brandName} - ${ad.accessibleDescription || "Sponsored Link"}`}
      >
        <div className={aspectWrapper}>
          {ad.mediaType === "video" ? (
            <div className="relative w-full h-full">
              {/* Poster image fallback when video has ended or data-saver is active */}
              {(hasEnded || prefersReducedData) && ad.videoPosterUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ad.videoPosterUrl}
                  alt={ad.accessibleDescription || ad.brandName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={ad.desktopCreativeUrl}
                  poster={ad.videoPosterUrl}
                  muted={isMuted}
                  playsInline
                  preload="none"
                  onEnded={handleVideoEnded}
                  onError={() => ad?.id && setFailedCampaignId(ad.id)}
                  className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
                />
              )}

              {/* Accessible Video Controls Overlay */}
              <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                {hasEnded ? (
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label="Replay advertisement video"
                    className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-md transition-colors"
                  >
                    <RotateCcw size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause advertisement video" : "Play advertisement video"}
                    className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-md transition-colors"
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute advertisement video" : "Mute advertisement video"}
                  className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-md transition-colors"
                >
                  {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
              </div>
            </div>
          ) : (
            <picture>
              {ad.mobileCreativeUrl && (
                <source media="(max-width: 640px)" srcSet={ad.mobileCreativeUrl} />
              )}
              <img
                src={ad.desktopCreativeUrl}
                alt={ad.accessibleDescription || ad.brandName}
                loading="lazy"
                onError={() => ad?.id && setFailedCampaignId(ad.id)}
                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
              />
            </picture>
          )}

          {/* Micro Sponsorship Badge */}
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[9px] uppercase tracking-wider font-extrabold text-gray-300 shadow-sm pointer-events-none">
            <span>Sponsored</span>
            <ExternalLink size={9} className="text-gray-400" />
          </div>

          {/* Subtle Brand Watermark */}
          <div className="absolute bottom-2 left-3 z-20 text-[10px] font-semibold text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none">
            {ad.brandName}
          </div>
        </div>
      </a>
    </div>
  );
}
