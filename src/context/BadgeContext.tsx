"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { collection, query, limit, onSnapshot, getDocs, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";


interface BadgeContextType {
  // Admin Badges & Section Reads
  adminSubjectRequestsCount: number;
  adminPendingReviewsCount: number;
  adminPendingCoursesCount: number;
  adminTotalUnreadCount: number;
  markAdminSectionSeen: (section: "subject_requests" | "reviews" | "courses") => void;
  refreshAdminBadges: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextType>({
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
  // ADMIN BADGES (Subject Requests, Pending Reviews, Pending Courses)
  // ─────────────────────────────────────────────────────────────
  const [adminSubjectRequestsRaw, setAdminSubjectRequestsRaw] = useState<{ id: string; createdAt: number }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("paperino_admin_badges_data");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.subjectRequests)) return parsed.subjectRequests;
        }
      } catch {}
    }
    return [];
  });
  const [adminPendingReviewsRaw, setAdminPendingReviewsRaw] = useState<{ id: string; createdAt: number }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("paperino_admin_badges_data");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.reviews)) return parsed.reviews;
        }
      } catch {}
    }
    return [];
  });
  const [adminPendingCoursesRaw, setAdminPendingCoursesRaw] = useState<{ id: string; createdAt: number }[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("paperino_admin_badges_data");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.courses)) return parsed.courses;
        }
      } catch {}
    }
    return [];
  });

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

  // Sync persistent last-seen timestamps from Firestore for this admin user (cached per session)
  useEffect(() => {
    if (!user || !isAdmin) return;

    let isMounted = true;
    const fetchAdminSeenFromFirestore = async () => {
      try {
        const now = Date.now();
        const cachedTs = typeof window !== "undefined" ? sessionStorage.getItem("paperino_admin_seen_synced_ts") : null;
        if (cachedTs && (now - parseInt(cachedTs, 10)) < 15 * 60 * 1000) {
          return; // Use locally cached seen timestamps for 15 mins
        }

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
                  sessionStorage.setItem("paperino_admin_seen_synced_ts", now.toString());
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

  const lastAdminBadgesFetchTimeRef = useRef<number>(0);

  // 3. Admin Pending Items Badge Logic (Optimized from Real-time Listeners to One-time Fetch with 5m cache)
  const fetchAdminBadges = useCallback(async (forceRefresh: boolean = false) => {
    const isOnAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    if (!user || !isAdmin || !isOnAdminRoute) return;

    const now = Date.now();
    let cachedAdminTs = 0;
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("paperino_admin_badges_ts");
        if (stored) cachedAdminTs = parseInt(stored, 10);
      } catch {}
    }
    const lastCheck = Math.max(lastAdminBadgesFetchTimeRef.current, cachedAdminTs);
    if (!forceRefresh && (now - lastCheck) < 5 * 60 * 1000) {
      return;
    }

    try {
      const queries = [
        { type: "subject_requests", q: query(collection(db, "subject_requests"), limit(50)) },
        { type: "courses", q: query(collection(db, "departments"), where("status", "==", "pending"), limit(30)) },
        { type: "courses", q: query(collection(db, "dynamic_subjects"), where("status", "==", "pending"), limit(30)) },
        { type: "reviews", q: query(collection(db, "materials"), where("status", "==", "pending"), limit(30)) }
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
      const subjectReqs = allItems.filter(i => i.type === "subject_requests");
      const pendingCourses = allItems.filter(i => i.type === "courses");
      const pendingReviews = allItems.filter(i => i.type === "reviews");

      setAdminSubjectRequestsRaw(subjectReqs);
      setAdminPendingCoursesRaw(pendingCourses);
      setAdminPendingReviewsRaw(pendingReviews);
      lastAdminBadgesFetchTimeRef.current = now;

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("paperino_admin_badges_ts", now.toString());
          sessionStorage.setItem("paperino_admin_badges_data", JSON.stringify({
            subjectRequests: subjectReqs,
            courses: pendingCourses,
            reviews: pendingReviews,
          }));
        } catch {}
      }
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
    await fetchAdminBadges(true);
  }, [fetchAdminBadges]);

  return (
    <BadgeContext.Provider
      value={{
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
