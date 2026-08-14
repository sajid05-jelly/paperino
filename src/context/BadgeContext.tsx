"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { collection, query, limit, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

interface BadgeContextType {
  // Paperino Labs & Free Class Finder Badges
  freeClassUnreadCount: number;
  labsTotalUnreadCount: number;
  markFreeClassSeen: () => void;

  // Admin Badges
  adminSubjectRequestsCount: number;
  adminPendingReviewsCount: number;
  adminPendingCoursesCount: number;
  adminTotalUnreadCount: number;
  refreshAdminBadges: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextType>({
  freeClassUnreadCount: 0,
  labsTotalUnreadCount: 0,
  markFreeClassSeen: () => {},
  adminSubjectRequestsCount: 0,
  adminPendingReviewsCount: 0,
  adminPendingCoursesCount: 0,
  adminTotalUnreadCount: 0,
  refreshAdminBadges: async () => {},
});

export const useBadges = () => useContext(BadgeContext);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();

  // ─────────────────────────────────────────────────────────────
  // 1. FREE CLASS FINDER & PAPERINO LABS UNREAD BADGE LOGIC
  // ─────────────────────────────────────────────────────────────
  const [lastSeenFreeClassTime, setLastSeenFreeClassTime] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("paperino_last_seen_free_class");
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [activeReportsTimeList, setActiveReportsTimeList] = useState<{ id: string; createdAt: number; expiresAt: number }[]>([]);

  // Bounded real-time listener on free_class_reports (limit 25) with offline cache
  useEffect(() => {
    if (!user) {
      setActiveReportsTimeList([]);
      return;
    }

    let unsub: (() => void) | null = null;
    try {
      const q = query(collection(db, "free_class_reports"), limit(25));
      unsub = onSnapshot(
        q,
        (snap) => {
          const now = Date.now();
          const items: { id: string; createdAt: number; expiresAt: number }[] = [];
          snap.forEach((d) => {
            const data = d.data();
            const createdAt = data.createdAtMs || (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Number(data.createdAt) || now);
            const durationMin = data.expectedFreeDurationMinutes || 30;
            const expiresAt = data.expiresAtMs || (data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : createdAt + durationMin * 60 * 1000);
            
            // Only count if not marked deleted and not flagged
            if (!data.isDeleted && data.status !== "flagged" && (data.falseVotes || 0) < 5) {
              items.push({
                id: d.id,
                createdAt,
                expiresAt
              });
            }
          });
          setActiveReportsTimeList(items);
        },
        (err) => {
          console.warn("[BadgeContext] Free class reports listener fallback:", err.message);
        }
      );
    } catch (e) {
      console.warn("[BadgeContext] Listener setup error:", e);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // Compute unread count for Free Class Finder based on lastSeen timestamp
  const freeClassUnreadCount = useMemo(() => {
    if (!activeReportsTimeList.length) return 0;
    const now = Date.now();

    // If user has never opened Free Class Finder (lastSeen === 0), only count reports created in the last 24h
    const baseline = lastSeenFreeClassTime > 0 ? lastSeenFreeClassTime : now - (24 * 60 * 60 * 1000);

    const unread = activeReportsTimeList.filter((item) => {
      // Room was created after the user's last visit
      return item.createdAt > baseline;
    });

    return unread.length;
  }, [activeReportsTimeList, lastSeenFreeClassTime]);

  const markFreeClassSeen = useCallback(() => {
    const now = Date.now();
    setLastSeenFreeClassTime(now);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("paperino_last_seen_free_class", now.toString());
      } catch (e) {}
    }
  }, []);

  const labsTotalUnreadCount = freeClassUnreadCount; // Extensible for other Labs features

  // ─────────────────────────────────────────────────────────────
  // 2. ADMIN BADGES (Subject Requests, Pending Reviews, Pending Courses)
  // ─────────────────────────────────────────────────────────────
  const [adminSubjectRequestsCount, setAdminSubjectRequestsCount] = useState(0);
  const [adminPendingReviewsCount, setAdminPendingReviewsCount] = useState(0);
  const [adminPendingCoursesCount, setAdminPendingCoursesCount] = useState(0);

  const fetchAdminCounts = useCallback(async () => {
    if (!user || !isAdmin) {
      setAdminSubjectRequestsCount(0);
      setAdminPendingReviewsCount(0);
      setAdminPendingCoursesCount(0);
      return;
    }

    try {
      const token = await user.getIdToken();

      // 1. Fetch Subject Requests via existing admin endpoint
      const subRes = await fetch("/api/admin/data?collection=subject_requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (subRes.ok) {
        const list = await subRes.json();
        const pending = Array.isArray(list) ? list.filter((item: any) => item.status === "pending" || !item.status) : [];
        setAdminSubjectRequestsCount(pending.length);
      }
    } catch (e) {
      console.warn("[BadgeContext] Subject requests count notice:", e);
    }

    try {
      // 2. Pending Courses (departments & dynamic_subjects) via client getDocs with status == "pending"
      const [deptSnap, subSnap] = await Promise.all([
        getDocs(collection(db, "departments")).catch(() => ({ docs: [] })),
        getDocs(collection(db, "dynamic_subjects")).catch(() => ({ docs: [] }))
      ]);

      const pendingDepts = deptSnap.docs.filter((d: any) => d.data().status === "pending").length;
      const pendingSubs = subSnap.docs.filter((d: any) => d.data().status === "pending").length;
      setAdminPendingCoursesCount(pendingDepts + pendingSubs);
    } catch (e) {
      console.warn("[BadgeContext] Pending courses count notice:", e);
    }

    try {
      // 3. Pending Reviews (materials with status == "pending" + survival_notes with status == "pending")
      const [matSnap, notesSnap] = await Promise.all([
        getDocs(collection(db, "materials")).catch(() => ({ docs: [] })),
        getDocs(collection(db, "survival_notes")).catch(() => ({ docs: [] }))
      ]);

      const pendingMats = matSnap.docs.filter((d: any) => d.data().status === "pending").length;
      const pendingNotes = notesSnap.docs.filter((d: any) => d.data().status === "pending").length;
      setAdminPendingReviewsCount(pendingMats + pendingNotes);
    } catch (e) {
      console.warn("[BadgeContext] Pending reviews count notice:", e);
    }
  }, [user, isAdmin]);

  // Fetch admin badge counts periodically (every 2 minutes) only if admin is logged in
  useEffect(() => {
    if (!user || !isAdmin) return;

    fetchAdminCounts();
    const interval = setInterval(fetchAdminCounts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, isAdmin, fetchAdminCounts]);

  const adminTotalUnreadCount = useMemo(() => {
    return adminSubjectRequestsCount + adminPendingReviewsCount + adminPendingCoursesCount;
  }, [adminSubjectRequestsCount, adminPendingReviewsCount, adminPendingCoursesCount]);

  return (
    <BadgeContext.Provider
      value={{
        freeClassUnreadCount,
        labsTotalUnreadCount,
        markFreeClassSeen,
        adminSubjectRequestsCount,
        adminPendingReviewsCount,
        adminPendingCoursesCount,
        adminTotalUnreadCount,
        refreshAdminBadges: fetchAdminCounts,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}
