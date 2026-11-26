"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useId,
} from "react";
import { AdPlacementId, PublicActiveAd, PublicAdsManifest } from "@/lib/adTypes";
import { useAuth } from "./AuthContext";

interface AdsContextType {
  manifest: PublicAdsManifest | null;
  loading: boolean;
  registerSlot: (slotId: string) => void;
  unregisterSlot: (slotId: string) => void;
  getEligibleAd: (placementId: AdPlacementId) => PublicActiveAd | null;
  refreshManifest: () => Promise<void>;
  requestVideoPlay: (slotId: string) => boolean;
  releaseVideoPlay: (slotId: string) => void;
  activePlayingSlotId: string | null;
}

const AdsContext = createContext<AdsContextType>({
  manifest: null,
  loading: false,
  registerSlot: () => {},
  unregisterSlot: () => {},
  getEligibleAd: () => null,
  refreshManifest: async () => {},
  requestVideoPlay: () => false,
  releaseVideoPlay: () => {},
  activePlayingSlotId: null,
});

// Module-level deduplication cache for in-flight requests
let inFlightFetchPromise: Promise<PublicAdsManifest | null> | null = null;
let lastFetchTimestamp = 0;

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const { plan } = useAuth();
  const [manifest, setManifest] = useState<PublicAdsManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredSlots, setRegisteredSlots] = useState<Set<string>>(() => new Set());
  const [boundaryTime, setBoundaryTime] = useState(() => Date.now());
  const [activePlayingSlotId, setActivePlayingSlotId] = useState<string | null>(null);

  const boundaryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeCount = registeredSlots.size;

  // Single deduplicated manifest fetcher
  const fetchManifest = useCallback(async (): Promise<PublicAdsManifest | null> => {
    // Re-use in-flight request if one is already pending
    if (inFlightFetchPromise) {
      return inFlightFetchPromise;
    }

    inFlightFetchPromise = (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/campaigns/active", { cache: "default" });
        lastFetchTimestamp = Date.now();
        if (!res.ok) {
          setManifest(null);
          return null;
        }
        const data: PublicAdsManifest = await res.json();
        setManifest(data);
        return data;
      } catch {
        setManifest(null);
        return null;
      } finally {
        setLoading(false);
        inFlightFetchPromise = null;
      }
    })();

    return inFlightFetchPromise;
  }, []);

  const refreshManifest = useCallback(async () => {
    await fetchManifest();
  }, [fetchManifest]);

  // Slot registration handlers
  const registerSlot = useCallback((slotId: string) => {
    setRegisteredSlots((prev) => {
      if (prev.has(slotId)) return prev;
      const next = new Set(prev);
      next.add(slotId);
      return next;
    });
  }, []);

  const unregisterSlot = useCallback((slotId: string) => {
    setRegisteredSlots((prev) => {
      if (!prev.has(slotId)) return prev;
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
    // Release playing video if the unmounting slot was playing
    setActivePlayingSlotId((current) => (current === slotId ? null : current));
  }, []);

  // On-Demand Fetching: only fetch and poll when at least one advertisement slot is mounted
  useEffect(() => {
    if (activeCount === 0) {
      return; // No advertisement placements on this page — completely skip fetching!
    }

    // Fetch immediately if not yet fetched or stale (>60s)
    if (!manifest || Date.now() - lastFetchTimestamp > 60000) {
      fetchManifest();
    }

    // Bounded polling sync (60s) only when active slots exist and tab is visible
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchManifest();
      }
    }, 60000);

    const onVisibilityChange = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        Date.now() - lastFetchTimestamp >= 60000
      ) {
        fetchManifest();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [activeCount, manifest, fetchManifest]);

  // Campaign Boundary Timers: replaces continuous 15s polling with precise event timers
  useEffect(() => {
    if (boundaryTimerRef.current) {
      clearTimeout(boundaryTimerRef.current);
      boundaryTimerRef.current = null;
    }

    if (!manifest || !manifest.enabled || !manifest.campaigns || manifest.campaigns.length === 0) {
      return;
    }

    const now = Date.now();
    let nextBoundaryDeltaMs = Infinity;

    for (const ad of manifest.campaigns) {
      const startMs = new Date(ad.startAt).getTime();
      const expireMs = new Date(ad.expiresAt).getTime();

      // Future start boundary
      if (!isNaN(startMs) && startMs > now) {
        const delta = startMs - now;
        if (delta < nextBoundaryDeltaMs) {
          nextBoundaryDeltaMs = delta;
        }
      }
      // Future expiry boundary
      if (!isNaN(expireMs) && expireMs > now) {
        const delta = expireMs - now;
        if (delta < nextBoundaryDeltaMs) {
          nextBoundaryDeltaMs = delta;
        }
      }
    }

    // If an upcoming transition exists within 24 hours, schedule an exact timer
    if (nextBoundaryDeltaMs < 86400000) {
      boundaryTimerRef.current = setTimeout(() => {
        setBoundaryTime(Date.now());
      }, nextBoundaryDeltaMs + 100); // 100ms buffer past boundary
    }

    return () => {
      if (boundaryTimerRef.current) {
        clearTimeout(boundaryTimerRef.current);
        boundaryTimerRef.current = null;
      }
    };
  }, [manifest, boundaryTime]);

  // Video Autoplay Coordination: Ensure ONLY one video advertisement plays at a time
  const requestVideoPlay = useCallback((slotId: string): boolean => {
    if (activePlayingSlotId === null || activePlayingSlotId === slotId) {
      setActivePlayingSlotId(slotId);
      return true;
    }
    return false;
  }, [activePlayingSlotId]);

  const releaseVideoPlay = useCallback((slotId: string) => {
    setActivePlayingSlotId((current) => (current === slotId ? null : current));
  }, []);

  // Compute single highest priority eligible campaign for a given placement
  const getEligibleAd = useCallback(
    (placementId: AdPlacementId): PublicActiveAd | null => {
      if (!manifest || !manifest.enabled || !manifest.campaigns || manifest.campaigns.length === 0) {
        return null;
      }

      const matching = manifest.campaigns.filter((ad) => {
        if (ad.placementId !== placementId) return false;

        // Schedule check against current wall-clock boundary time
        const startMs = new Date(ad.startAt).getTime();
        const expireMs = new Date(ad.expiresAt).getTime();
        if (isNaN(startMs) || isNaN(expireMs)) return false;
        if (boundaryTime < startMs || boundaryTime > expireMs) return false;

        // Audience tier check
        const tier = ad.targetAudience?.userTier;
        const isPaidUser = plan === "plus" || plan === "premium" || plan === "pro";
        if (tier === "free_only" && isPaidUser) return false;
        if (tier === "paid_only" && !isPaidUser) return false;

        return true;
      });

      if (matching.length === 0) return null;

      // Sort by priority descending (highest priority wins); tie-break by earliest expiry
      matching.sort((a, b) => {
        const pDiff = (b.priority || 50) - (a.priority || 50);
        if (pDiff !== 0) return pDiff;
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      });

      return matching[0];
    },
    [manifest, boundaryTime, plan]
  );

  const value = useMemo(
    () => ({
      manifest,
      loading,
      registerSlot,
      unregisterSlot,
      getEligibleAd,
      refreshManifest,
      requestVideoPlay,
      releaseVideoPlay,
      activePlayingSlotId,
    }),
    [
      manifest,
      loading,
      registerSlot,
      unregisterSlot,
      getEligibleAd,
      refreshManifest,
      requestVideoPlay,
      releaseVideoPlay,
      activePlayingSlotId,
    ]
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds() {
  return useContext(AdsContext);
}

/**
 * Isolated hook for individual advertisement placements.
 * Registers slot mount/unmount and isolates rerenders strictly to placement consumers.
 */
export function useAdSlot(placementId: AdPlacementId) {
  const {
    manifest,
    loading,
    registerSlot,
    unregisterSlot,
    getEligibleAd,
    requestVideoPlay,
    releaseVideoPlay,
    activePlayingSlotId,
  } = useAds();

  const uniqueId = useId();
  const slotInstanceId = useMemo(() => `${placementId}_${uniqueId}`, [placementId, uniqueId]);

  useEffect(() => {
    registerSlot(slotInstanceId);
    return () => {
      unregisterSlot(slotInstanceId);
    };
  }, [slotInstanceId, registerSlot, unregisterSlot]);

  const ad = useMemo(() => getEligibleAd(placementId), [getEligibleAd, placementId]);

  const isVideoPlaying = activePlayingSlotId === slotInstanceId;

  const requestPlay = useCallback(() => {
    return requestVideoPlay(slotInstanceId);
  }, [requestVideoPlay, slotInstanceId]);

  const releasePlay = useCallback(() => {
    releaseVideoPlay(slotInstanceId);
  }, [releaseVideoPlay, slotInstanceId]);

  return {
    ad,
    loading,
    enabled: manifest?.enabled ?? false,
    isVideoPlaying,
    requestPlay,
    releasePlay,
    slotInstanceId,
  };
}
