"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { collection, query, limit, onSnapshot, getDocs, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export interface UserStatusUpdate {
  id: string;
  type: "material" | "subject" | "course" | "insight";
  title: string;
  subtitle?: string;
  status: "approved" | "rejected";
  updatedAt: number;
}

interface BadgeContextType {
  // Paperino Labs & Free Class Finder Badges
  freeClassUnreadCount: number;
  labsTotalUnreadCount: number;
  markFreeClassSeen: () => void;

  // Contributor / User Dashboard Status Notifications & Badge
  userStatusUpdates: UserStatusUpdate[];
  dashboardUnreadCount: number;
  markDashboardSeen: () => void;
  refreshUserStatusUpdates: () => Promise<void>;

  // Admin Badges & Section Reads
  adminSubjectRequestsCount: number;
  adminPendingReviewsCount: number;
  adminPendingCoursesCount: number;
  adminTotalUnreadCount: number;
  markAdminSectionSeen: (section: "subject_requests" | "reviews" | "courses") => void;
  refreshAdminBadges: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextType>({
  freeClassUnreadCount: 0,
  labsTotalUnreadCount: 0,
  markFreeClassSeen: () => {},
  userStatusUpdates: [],
  dashboardUnreadCount: 0,
  markDashboardSeen: () => {},
  refreshUserStatusUpdates: async () => {},
  adminSubjectRequestsCount: 0,
  adminPendingReviewsCount: 0,
  adminPendingCoursesCount: 0,
  adminTotalUnreadCount: 0,
  markAdminSectionSeen: () => {},
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
            
            if (!data.isDeleted && data.status !== "flagged" && (data.falseVotes || 0) < 5) {
              items.push({ id: d.id, createdAt, expiresAt });
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

  const freeClassUnreadCount = useMemo(() => {
    if (!activeReportsTimeList.length) return 0;
    const now = Date.now();
    const baseline = lastSeenFreeClassTime > 0 ? lastSeenFreeClassTime : now - (24 * 60 * 60 * 1000);

    return activeReportsTimeList.filter((item) => item.createdAt > baseline).length;
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

  const labsTotalUnreadCount = freeClassUnreadCount;

  // ─────────────────────────────────────────────────────────────
  // 2. USER DASHBOARD STATUS NOTIFICATIONS (Material, Subject, Course, Senior Insights)
  // ─────────────────────────────────────────────────────────────
  const [userStatusUpdates, setUserStatusUpdates] = useState<UserStatusUpdate[]>([]);
  const [lastSeenDashboardStatusTime, setLastSeenDashboardStatusTime] = useState<number>(() => {
    if (typeof window !== "undefined" && user) {
      const saved = localStorage.getItem(`paperino_last_seen_dashboard_status_${user.uid}`);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  // Re-load lastSeen from localStorage whenever user changes
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const saved = localStorage.getItem(`paperino_last_seen_dashboard_status_${user.uid}`);
      setLastSeenDashboardStatusTime(saved ? parseInt(saved, 10) : 0);
    }
  }, [user]);

  const fetchUserStatusUpdates = useCallback(async () => {
    if (!user) {
      setUserStatusUpdates([]);
      return;
    }

    try {
      const updates: UserStatusUpdate[] = [];

      // 1. Materials submitted by this user (where status is approved or rejected)
      const matsQuery = query(
        collection(db, "materials"),
        where("uploaderId", "==", user.uid),
        limit(30)
      );
      const matsSnap = await getDocs(matsQuery).catch(() => ({ docs: [] } as any));
      matsSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.status === "approved" || data.status === "rejected") {
          const updatedAt = data.rejectedAt || data.approvedAt || (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Number(data.createdAt) || Date.now());
          updates.push({
            id: `mat_${d.id}`,
            type: "material",
            title: data.title || data.fileName || "Study Material",
            subtitle: `Semester ${data.semesterId || "?"} • ${data.category?.toUpperCase() || "MATERIAL"}`,
            status: data.status,
            updatedAt
          });
        }
      });

      // 2. Subject Requests submitted by this user (where status is approved or rejected)
      const subsQuery = query(
        collection(db, "dynamic_subjects"),
        where("contributorId", "==", user.uid),
        limit(20)
      );
      const subsSnap = await getDocs(subsQuery).catch(() => ({ docs: [] } as any));
      subsSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.status === "approved" || data.status === "rejected") {
          const updatedAt = data.updatedAt || (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Number(data.createdAt) || Date.now());
          updates.push({
            id: `sub_${d.id}`,
            type: "subject",
            title: data.name || "Subject Request",
            subtitle: `Department: ${data.departmentId || "General"}`,
            status: data.status,
            updatedAt
          });
        }
      });

      // 3. Department / Course Requests submitted by this user (where status is approved or rejected)
      const deptsQuery = query(
        collection(db, "departments"),
        where("createdBy", "==", user.uid),
        limit(20)
      );
      const deptsSnap = await getDocs(deptsQuery).catch(() => ({ docs: [] } as any));
      deptsSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.status === "approved" || data.status === "rejected") {
          const updatedAt = data.updatedAt || (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Number(data.createdAt) || Date.now());
          updates.push({
            id: `dept_${d.id}`,
            type: "course",
            title: data.name || "Course Request",
            subtitle: `Code: ${data.code || "N/A"}`,
            status: data.status,
            updatedAt
          });
        }
      });

      // 4. Senior Insights / Survival Notes submitted by this user (where status is approved)
      const notesQuery = query(
        collection(db, "survival_notes"),
        where("contributorId", "==", user.uid),
        limit(20)
      );
      const notesSnap = await getDocs(notesQuery).catch(() => ({ docs: [] } as any));
      notesSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.status === "approved" || data.status === "rejected") {
          const updatedAt = data.updatedAt || (data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Number(data.createdAt) || Date.now());
          updates.push({
            id: `insight_${d.id}`,
            type: "insight",
            title: data.title || "Senior Insight",
            subtitle: "Community Advice",
            status: data.status,
            updatedAt
          });
        }
      });

      // Sort newest first
      updates.sort((a, b) => b.updatedAt - a.updatedAt);
      setUserStatusUpdates(updates);
    } catch (e) {
      console.warn("[BadgeContext] Error fetching user status updates:", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserStatusUpdates();
    }
  }, [user, fetchUserStatusUpdates]);

  const dashboardUnreadCount = useMemo(() => {
    if (!userStatusUpdates.length) return 0;
    // Count items updated after the user last viewed the status/notifications tab
    return userStatusUpdates.filter((u) => u.updatedAt > lastSeenDashboardStatusTime).length;
  }, [userStatusUpdates, lastSeenDashboardStatusTime]);

  const markDashboardSeen = useCallback(() => {
    const now = Date.now();
    setLastSeenDashboardStatusTime(now);
    if (user && typeof window !== "undefined") {
      try {
        localStorage.setItem(`paperino_last_seen_dashboard_status_${user.uid}`, now.toString());
      } catch (e) {}
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────────
  // 3. ADMIN BADGES (Subject Requests, Pending Reviews, Pending Courses)
  // ─────────────────────────────────────────────────────────────
  const [adminSubjectRequestsRaw, setAdminSubjectRequestsRaw] = useState<{ id: string; createdAt: number }[]>([]);
  const [adminPendingReviewsRaw, setAdminPendingReviewsRaw] = useState<{ id: string; createdAt: number }[]>([]);
  const [adminPendingCoursesRaw, setAdminPendingCoursesRaw] = useState<{ id: string; createdAt: number }[]>([]);

  // Per-section last-seen timestamps to support section-specific read clearing
  const [lastSeenAdminSections, setLastSeenAdminSections] = useState<{
    subject_requests: number;
    reviews: number;
    courses: number;
  }>(() => {
    if (typeof window !== "undefined") {
      return {
        subject_requests: parseInt(localStorage.getItem("paperino_admin_seen_subject_requests") || "0", 10),
        reviews: parseInt(localStorage.getItem("paperino_admin_seen_reviews") || "0", 10),
        courses: parseInt(localStorage.getItem("paperino_admin_seen_courses") || "0", 10),
      };
    }
    return { subject_requests: 0, reviews: 0, courses: 0 };
  });

  const fetchAdminCounts = useCallback(async () => {
    if (!user || !isAdmin) {
      setAdminSubjectRequestsRaw([]);
      setAdminPendingReviewsRaw([]);
      setAdminPendingCoursesRaw([]);
      return;
    }

    try {
      const token = await user.getIdToken();

      // 1. Fetch Subject Requests via admin endpoint
      const subRes = await fetch("/api/admin/data?collection=subject_requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (subRes.ok) {
        const list = await subRes.json();
        const pending = Array.isArray(list)
          ? list
              .filter((item: any) => item.status === "pending" || !item.status)
              .map((item: any) => ({
                id: item.id,
                createdAt: item.createdAt || Date.now()
              }))
          : [];
        setAdminSubjectRequestsRaw(pending);
      }
    } catch (e) {
      console.warn("[BadgeContext] Subject requests count notice:", e);
    }

    try {
      // 2. Pending Courses (departments & dynamic_subjects)
      const [deptSnap, subSnap] = await Promise.all([
        getDocs(collection(db, "departments")).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, "dynamic_subjects")).catch(() => ({ docs: [] } as any))
      ]);

      const pendingDepts = deptSnap.docs
        .filter((d: any) => d.data().status === "pending")
        .map((d: any) => ({
          id: d.id,
          createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : Number(d.data().createdAt) || Date.now()
        }));

      const pendingSubs = subSnap.docs
        .filter((d: any) => d.data().status === "pending")
        .map((d: any) => ({
          id: d.id,
          createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : Number(d.data().createdAt) || Date.now()
        }));

      setAdminPendingCoursesRaw([...pendingDepts, ...pendingSubs]);
    } catch (e) {
      console.warn("[BadgeContext] Pending courses count notice:", e);
    }

    try {
      // 3. Pending Reviews (materials + survival_notes)
      const [matSnap, notesSnap] = await Promise.all([
        getDocs(collection(db, "materials")).catch(() => ({ docs: [] } as any)),
        getDocs(collection(db, "survival_notes")).catch(() => ({ docs: [] } as any))
      ]);

      const pendingMats = matSnap.docs
        .filter((d: any) => d.data().status === "pending")
        .map((d: any) => ({
          id: d.id,
          createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : Number(d.data().createdAt) || Date.now()
        }));

      const pendingNotes = notesSnap.docs
        .filter((d: any) => d.data().status === "pending")
        .map((d: any) => ({
          id: d.id,
          createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : Number(d.data().createdAt) || Date.now()
        }));

      setAdminPendingReviewsRaw([...pendingMats, ...pendingNotes]);
    } catch (e) {
      console.warn("[BadgeContext] Pending reviews count notice:", e);
    }
  }, [user, isAdmin]);

  // Fetch admin badge counts periodically (every 2 minutes) for admins
  useEffect(() => {
    if (!user || !isAdmin) return;

    fetchAdminCounts();
    const interval = setInterval(fetchAdminCounts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, isAdmin, fetchAdminCounts]);

  const markAdminSectionSeen = useCallback((section: "subject_requests" | "reviews" | "courses") => {
    const now = Date.now();
    setLastSeenAdminSections((prev) => {
      const updated = { ...prev, [section]: now };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`paperino_admin_seen_${section}`, now.toString());
        } catch (e) {}
      }
      return updated;
    });
  }, []);

  // Compute unread badges for each section based on last seen timestamp
  const adminSubjectRequestsCount = useMemo(() => {
    const baseline = lastSeenAdminSections.subject_requests;
    return adminSubjectRequestsRaw.filter((r) => r.createdAt > baseline).length;
  }, [adminSubjectRequestsRaw, lastSeenAdminSections.subject_requests]);

  const adminPendingReviewsCount = useMemo(() => {
    const baseline = lastSeenAdminSections.reviews;
    return adminPendingReviewsRaw.filter((r) => r.createdAt > baseline).length;
  }, [adminPendingReviewsRaw, lastSeenAdminSections.reviews]);

  const adminPendingCoursesCount = useMemo(() => {
    const baseline = lastSeenAdminSections.courses;
    return adminPendingCoursesRaw.filter((r) => r.createdAt > baseline).length;
  }, [adminPendingCoursesRaw, lastSeenAdminSections.courses]);

  const adminTotalUnreadCount = useMemo(() => {
    return adminSubjectRequestsCount + adminPendingReviewsCount + adminPendingCoursesCount;
  }, [adminSubjectRequestsCount, adminPendingReviewsCount, adminPendingCoursesCount]);

  return (
    <BadgeContext.Provider
      value={{
        freeClassUnreadCount,
        labsTotalUnreadCount,
        markFreeClassSeen,
        userStatusUpdates,
        dashboardUnreadCount,
        markDashboardSeen,
        refreshUserStatusUpdates: fetchUserStatusUpdates,
        adminSubjectRequestsCount,
        adminPendingReviewsCount,
        adminPendingCoursesCount,
        adminTotalUnreadCount,
        markAdminSectionSeen,
        refreshAdminBadges: fetchAdminCounts,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}
