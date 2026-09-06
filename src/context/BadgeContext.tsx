"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
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

  const lastFreeClassCheckRef = useRef<number>(0);

  const fetchActiveReportsForBadge = useCallback(async (forceRefresh: boolean = false) => {
    if (!user) {
      setActiveReportsTimeList([]);
      return;
    }

    const now = Date.now();
    // Cache for 3 minutes per session - NO global background setInterval
    if (!forceRefresh && (now - lastFreeClassCheckRef.current) < 3 * 60 * 1000 && activeReportsTimeList.length > 0) {
      return;
    }

    try {
      const q = query(collection(db, "free_class_reports"), limit(25));
      const snap = await getDocs(q);
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
      lastFreeClassCheckRef.current = now;
    } catch (e: any) {
      console.warn("[BadgeContext] Free class badge count fallback:", e?.message || e);
    }
  }, [user, activeReportsTimeList.length]);

  // Check badge once on mount/login, without continuous polling
  useEffect(() => {
    if (user) {
      fetchActiveReportsForBadge();
    } else {
      setActiveReportsTimeList([]);
    }
  }, [user, fetchActiveReportsForBadge]);

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

  const lastUserStatusFetchTimeRef = useRef<number>(0);

  const fetchUserStatusUpdates = useCallback(async (forceRefresh: boolean = false) => {
    if (!user) {
      setUserStatusUpdates([]);
      return;
    }

    const now = Date.now();
    // Cache for 3 minutes per session to prevent repeated sweeps across 4 collections on rapid navigation
    if (!forceRefresh && (now - lastUserStatusFetchTimeRef.current) < 3 * 60 * 1000 && userStatusUpdates.length > 0) {
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
      lastUserStatusFetchTimeRef.current = now;
    } catch (e) {
      console.warn("[BadgeContext] Error fetching user status updates:", e);
    }
  }, [user, userStatusUpdates.length]);

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

  // Sync persistent last-seen timestamps from Firestore for this admin user
  useEffect(() => {
    if (!user || !isAdmin) return;

    let isMounted = true;
    const fetchAdminSeenFromFirestore = async () => {
      try {
        const adminDocRef = doc(db, "users", user.uid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          const data = adminDocSnap.data();
          const adminSeen = data?.adminSeenSections || {};
          if (isMounted) {
            setLastSeenAdminSections((prev) => {
              const updated = {
                subject_requests: Math.max(prev.subject_requests, Number(adminSeen.subject_requests) || 0),
                reviews: Math.max(prev.reviews, Number(adminSeen.reviews) || 0),
                courses: Math.max(prev.courses, Number(adminSeen.courses) || 0),
              };
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("paperino_admin_seen_subject_requests", updated.subject_requests.toString());
                  localStorage.setItem("paperino_admin_seen_reviews", updated.reviews.toString());
                  localStorage.setItem("paperino_admin_seen_courses", updated.courses.toString());
                } catch (e) {}
              }
              return updated;
            });
          }
        }
      } catch (e) {
        console.warn("[BadgeContext] Error syncing admin seen timestamps:", e);
      }
    };

    fetchAdminSeenFromFirestore();
    return () => {
      isMounted = false;
    };
  }, [user, isAdmin]);

  const pathname = usePathname();

  // 3. Admin Pending Items Badge Logic (Optimized from Real-time Listeners to One-time Fetch)
  const fetchAdminBadges = useCallback(async () => {
    const isOnAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    if (!user || !isAdmin || !isOnAdminRoute) return;

    try {
      const pendingItemsList: { type: string; id: string; createdAt: number }[] = [];
      const queries = [
        { type: "subject_requests", q: query(collection(db, "subject_requests"), limit(50)) },
        { type: "courses", q: query(collection(db, "departments"), where("status", "==", "pending"), limit(30)) },
        { type: "courses", q: query(collection(db, "dynamic_subjects"), where("status", "==", "pending"), limit(30)) },
        { type: "reviews", q: query(collection(db, "materials"), where("status", "==", "pending"), limit(30)) },
        { type: "reviews", q: query(collection(db, "survival_notes"), where("status", "==", "pending"), limit(30)) }
      ];

      const results = await Promise.all(
        queries.map(async (item) => {
          try {
            const snap = await getDocs(item.q);
            const items: any[] = [];
            snap.forEach(d => {
              const data = d.data();
              if (item.type === "subject_requests" && data.status && data.status !== "pending") return;
              const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Number(data.createdAt) || Date.now();
              items.push({ type: item.type, id: d.id, createdAt });
            });
            return items;
          } catch (e) { 
            console.warn(`[BadgeContext] Error fetching ${item.type}:`, e);
            return []; 
          }
        })
      );

      const allItems = results.flat();
      setAdminSubjectRequestsRaw(allItems.filter(i => i.type === "subject_requests"));
      setAdminPendingCoursesRaw(allItems.filter(i => i.type === "courses"));
      setAdminPendingReviewsRaw(allItems.filter(i => i.type === "reviews"));
    } catch (e) {
      console.warn("[BadgeContext] Error fetching admin pending badges:", e);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchAdminBadges();
  }, [fetchAdminBadges, pathname]);

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

    // Also persist seen timestamp to user document in Firestore asynchronously
    if (user && isAdmin) {
      try {
        const userRef = doc(db, "users", user.uid);
        getDoc(userRef).then((snap) => {
          const currentSeen = snap.exists() ? snap.data()?.adminSeenSections || {} : {};
          import("firebase/firestore").then(({ updateDoc, setDoc }) => {
            if (snap.exists()) {
              updateDoc(userRef, {
                [`adminSeenSections.${section}`]: now,
              }).catch(() => {});
            } else {
              setDoc(userRef, {
                adminSeenSections: { ...currentSeen, [section]: now },
              }, { merge: true }).catch(() => {});
            }
          });
        }).catch(() => {});
      } catch (e) {}
    }
  }, [user, isAdmin]);

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

  const refreshAdminBadges = useCallback(async () => {
    await fetchAdminBadges();
  }, [fetchAdminBadges]);

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
        refreshAdminBadges,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}
