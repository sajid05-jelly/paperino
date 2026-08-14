"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  writeBatch,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logFirestoreRead, logFirestoreCacheHit } from "@/lib/firestoreDiagnostics";

let globalPulseCache: PulseUpdate[] | null = null;
let lastPulseFetchTime = 0;
import { useAuth } from "@/context/AuthContext";
import type { PaperinoNotification } from "@/lib/notifications";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";

export interface PulseUpdate {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: any;
}

interface NotificationContextType {
  unreadUpdates: PulseUpdate[];
  updates: PulseUpdate[];
  lastPulseReadAt: any;
  unreadCount: number;
  markAllAsRead: () => Promise<void>;
  
  // Independent Paperino Pulse Unread Tracking System
  pulseUnreadCount: number;
  categoryPulseUnreadCounts: Record<string, number>;
  markPulseCategoryAsRead: (category: string) => Promise<void>;
  
  // Unified Realtime User Notifications
  notifications: PaperinoNotification[];
  notificationsUnreadCount: number;
  loadingNotifications: boolean;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  deleteSingleNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadUpdates: [],
  updates: [],
  lastPulseReadAt: null,
  unreadCount: 0,
  markAllAsRead: async () => {},
  pulseUnreadCount: 0,
  categoryPulseUnreadCounts: {},
  markPulseCategoryAsRead: async () => {},
  notifications: [],
  notificationsUnreadCount: 0,
  loadingNotifications: true,
  markNotificationRead: async () => {},
  markAllNotificationsRead: async () => {},
  clearAllNotifications: async () => {},
  deleteSingleNotification: async () => {},
});

export const usePulseNotifications = () => useContext(NotificationContext);

export function parseNotificationTimestamp(raw: any): number {
  if (!raw) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw.toMillis === "function") return raw.toMillis();
  if (typeof raw.seconds === "number") return raw.seconds * 1000;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === "string") {
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, role, lastPulseReadAt } = useAuth();
  const [updates, setUpdates] = useState<PulseUpdate[]>([]);
  const [latestToast, setLatestToast] = useState<PulseUpdate | null>(null);
  const [localReadTime, setLocalReadTime] = useState<number>(0);
  const [nowTicker, setNowTicker] = useState<number>(Date.now());
  const router = useRouter();

  // Role check to preserve Admin & Lead Admin notifications permanently
  const isUserAdminRole = useMemo(() => {
    if (isAdmin) return true;
    if (!role) return false;
    const r = role.toLowerCase().trim();
    return r === "admin" || r === "lead-admin" || r === "lead_admin" || r === "super-admin" || r === "super_admin";
  }, [isAdmin, role]);

  // Live 60s ticker for dynamic real-time expiry without page refresh (Normal users only)
  useEffect(() => {
    if (!user || isUserAdminRole) return;
    const interval = setInterval(() => {
      setNowTicker(Date.now());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, isUserAdminRole]);

  // Raw Firestore Notifications
  const [rawNotifications, setRawNotifications] = useState<PaperinoNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Local Read & Cleared Sets (Synced to LocalStorage for instant error-free UX)
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const [clearedNotifIds, setClearedNotifIds] = useState<Set<string>>(new Set());
  const [readPulseIds, setReadPulseIds] = useState<Set<string>>(new Set());

  // Sync LocalStorage Read & Cleared State on Mount / User change
  useEffect(() => {
    if (!user) return;
    try {
      const readSaved = localStorage.getItem(`paperino_read_notifs_${user.uid}`);
      if (readSaved) {
        setReadNotifIds(new Set(JSON.parse(readSaved)));
      }
      const clearedSaved = localStorage.getItem(`paperino_cleared_notifs_${user.uid}`);
      if (clearedSaved) {
        setClearedNotifIds(new Set(JSON.parse(clearedSaved)));
      }
      const readPulseSaved = localStorage.getItem(`paperino_read_pulse_${user.uid}`);
      if (readPulseSaved) {
        setReadPulseIds(new Set(JSON.parse(readPulseSaved)));
      }
    } catch (e) {
      console.warn("Error loading notification cache:", e);
    }
  }, [user]);

  const persistReadPulseIds = (newSet: Set<string>) => {
    setReadPulseIds(newSet);
    if (user && typeof window !== "undefined") {
      try {
        localStorage.setItem(`paperino_read_pulse_${user.uid}`, JSON.stringify(Array.from(newSet)));
      } catch (e) {}
    }
  };

  // Helper to persist Read IDs
  const persistReadIds = (newSet: Set<string>) => {
    setReadNotifIds(newSet);
    if (user && typeof window !== "undefined") {
      try {
        localStorage.setItem(`paperino_read_notifs_${user.uid}`, JSON.stringify(Array.from(newSet)));
      } catch (e) {}
    }
  };

  // Helper to persist Cleared IDs
  const persistClearedIds = (newSet: Set<string>) => {
    setClearedNotifIds(newSet);
    if (user && typeof window !== "undefined") {
      try {
        localStorage.setItem(`paperino_cleared_notifs_${user.uid}`, JSON.stringify(Array.from(newSet)));
      } catch (e) {}
    }
  };

  // 1. Single Global TTL Cached Fetch for Pulse Updates (5-min TTL to eliminate realtime read multiplication)
  useEffect(() => {
    if (!user) {
      setUpdates([]);
      return;
    }

    let isMounted = true;
    const fetchPulseUpdates = async () => {
      const now = Date.now();
      if (globalPulseCache && (now - lastPulseFetchTime) < 5 * 60 * 1000) {
        logFirestoreCacheHit("pulse_updates", "Serving 10 pulse items from 5m client TTL cache");
        if (isMounted) setUpdates(globalPulseCache);
        return;
      }

      try {
        logFirestoreRead("pulse_updates", "getDocs(limit(10)) - 5m TTL cache miss");
        const q = query(
          collection(db, "pulse_updates"), 
          orderBy("createdAt", "desc"), 
          limit(10)
        );
        const snapshot = await getDocs(q);
        const newUpdates: PulseUpdate[] = [];
        snapshot.forEach((d) => {
          newUpdates.push({ id: d.id, ...d.data() } as PulseUpdate);
        });

        globalPulseCache = newUpdates;
        lastPulseFetchTime = now;
        if (isMounted) setUpdates(newUpdates);
      } catch (err: any) {
        console.warn("[NotificationContext] pulse_updates fetch notice:", err?.message || err);
      }
    };

    fetchPulseUpdates();
    return () => { isMounted = false; };
  }, [user]);

  // 2. Bounded Cached Fetch for User & Public Notifications (limit(15), 5-min TTL, sessionStorage backed)
  useEffect(() => {
    if (!user) {
      setRawNotifications([]);
      setLoadingNotifications(false);
      return;
    }

    let isMounted = true;
    const cacheKey = `paperino_notifs_${user.uid}`;
    const cacheTimeKey = `paperino_notifs_time_${user.uid}`;

    // Check sessionStorage cache
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(cacheKey);
      const cachedTime = sessionStorage.getItem(cacheTimeKey);
      const now = Date.now();

      if (cached && cachedTime && (now - parseInt(cachedTime, 10)) < 5 * 60 * 1000) {
        try {
          const parsed = JSON.parse(cached);
          logFirestoreCacheHit("notifications", `Serving ${parsed.length} notifications from 5m session cache`);
          setRawNotifications(parsed);
          setLoadingNotifications(false);
          return;
        } catch (e) {
          // Cache parse error, proceed to fetch
        }
      }
    }

    const fetchNotifications = async () => {
      try {
        logFirestoreRead("notifications", `getDocs(limit(15)) for uid: ${user.uid}`);
        const q = query(
          collection(db, "notifications"),
          where("userId", "in", [user.uid, "ALL", ...(isUserAdminRole ? ["ADMIN"] : [])]),
          limit(15)
        );

        const snap = await getDocs(q);
        const notifs: PaperinoNotification[] = [];
        snap.forEach((d) => {
          const data = d.data();
          notifs.push({ id: d.id, ...data } as PaperinoNotification);
        });
        notifs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (isMounted) {
          setRawNotifications(notifs);
          setLoadingNotifications(false);

          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(notifs));
              sessionStorage.setItem(cacheTimeKey, Date.now().toString());
            } catch (e) {}
          }
        }
      } catch (err: any) {
        console.warn("[NotificationContext] notifications fetch notice:", err?.message || err);
        if (isMounted) setLoadingNotifications(false);
      }
    };

    fetchNotifications();
    return () => { isMounted = false; };
  }, [user, isUserAdminRole]);

  // Background cleanup for expired normal user notifications in Firestore (Scoped strictly to user's own docs)
  useEffect(() => {
    if (!user || isUserAdminRole || rawNotifications.length === 0) return;

    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const expiredDocs = rawNotifications.filter((n) => {
      if (n.userId !== user.uid) return false;
      const createdMs = parseNotificationTimestamp(n.createdAt);
      return createdMs > 0 && (now - createdMs) >= TWENTY_FOUR_HOURS_MS;
    });

    if (expiredDocs.length > 0) {
      expiredDocs.forEach((n) => {
        deleteDoc(doc(db, "notifications", n.id)).catch(() => {});
      });
    }
  }, [user, isUserAdminRole, rawNotifications]);

  // Computed Processed Notifications (Filtered by cleared set, read state merged, and 24h user expiry)
  const notifications = useMemo(() => {
    const now = nowTicker;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    return rawNotifications
      .filter((n) => {
        // 1. Filter out manually cleared notifications
        if (clearedNotifIds.has(n.id)) return false;

        // 2. Do not show notifications to the user who created them
        if (user && (n as any).creatorUid && (n as any).creatorUid === user.uid) {
          return false;
        }

        // 2. 24-hour auto expiry FOR NORMAL USERS ONLY (Admins & Lead Admins are EXEMPT)
        if (!isUserAdminRole) {
          const createdMs = parseNotificationTimestamp(n.createdAt);
          if (createdMs > 0 && (now - createdMs) >= TWENTY_FOUR_HOURS_MS) {
            return false;
          }
        }

        return true;
      })
      .map((n) => {
        const isLocallyRead = readNotifIds.has(n.id);
        const isServerRead = n.read || (n as any).isRead;
        return {
          ...n,
          read: Boolean(isServerRead || isLocallyRead),
          isRead: Boolean(isServerRead || isLocallyRead)
        };
      });
  }, [rawNotifications, readNotifIds, clearedNotifIds, isUserAdminRole, nowTicker]);

  // Compute unreadUpdates in-memory
  const unreadUpdates = useMemo(() => {
    if (!user) return [];

    const firebaseLastRead = lastPulseReadAt 
      ? (typeof lastPulseReadAt.toDate === "function" ? lastPulseReadAt.toDate() : new Date(lastPulseReadAt))
      : new Date(0);

    const localLastReadStr = typeof window !== "undefined" ? localStorage.getItem(`paperino_last_pulse_read_at_${user.uid}`) : null;
    const localLastRead = localLastReadStr ? new Date(parseInt(localLastReadStr)) : new Date(0);

    const lastRead = firebaseLastRead > localLastRead ? firebaseLastRead : localLastRead;

    return updates.filter(u => {
      if (!u.createdAt) return false;
      const createdDate = (u.createdAt && typeof u.createdAt.toDate === "function") 
        ? u.createdAt.toDate() 
        : new Date(u.createdAt as any);
      return createdDate > lastRead;
    });
  }, [updates, lastPulseReadAt, localReadTime, user]);

  // Calculate per-item and per-category unread Pulse updates per user
  const unreadPulseItems = useMemo(() => {
    if (!user) return [];
    return updates.filter((u) => !readPulseIds.has(u.id));
  }, [updates, readPulseIds, user]);

  const categoryPulseUnreadCounts = useMemo(() => {
    if (!user) return {};
    const counts: Record<string, number> = {};
    let totalActiveUnread = 0;

    const isExpiredTs = (ts?: any) => {
      if (!ts) return false;
      const ms = typeof ts.toMillis === "function" ? ts.toMillis() : typeof ts.seconds === "number" ? ts.seconds * 1000 : new Date(ts).getTime();
      return ms > 0 ? Date.now() > ms : false;
    };

    unreadPulseItems.forEach((u) => {
      const expired = isExpiredTs((u as any).deadline);
      if (expired) {
        counts["Out of Date"] = (counts["Out of Date"] || 0) + 1;
      } else {
        totalActiveUnread++;
        if (u.category) {
          counts[u.category] = (counts[u.category] || 0) + 1;
        }
      }
    });

    counts["All"] = totalActiveUnread;
    return counts;
  }, [unreadPulseItems, user]);

  const pulseUnreadCount = useMemo(() => {
    if (!user) return 0;
    return categoryPulseUnreadCounts["All"] || 0;
  }, [categoryPulseUnreadCounts, user]);

  const markPulseCategoryAsRead = useCallback(async (category: string) => {
    if (!user) return;
    const isExpiredTs = (ts?: any) => {
      if (!ts) return false;
      const ms = typeof ts.toMillis === "function" ? ts.toMillis() : typeof ts.seconds === "number" ? ts.seconds * 1000 : new Date(ts).getTime();
      return ms > 0 ? Date.now() > ms : false;
    };

    const newSet = new Set(readPulseIds);
    let countChanged = 0;

    updates.forEach((u) => {
      const expired = isExpiredTs((u as any).deadline);
      let match = false;
      if (category === "Out of Date") {
        match = expired;
      } else if (category === "All") {
        match = !expired;
      } else {
        match = !expired && u.category === category;
      }

      if (match && !newSet.has(u.id)) {
        newSet.add(u.id);
        countChanged++;
      }
    });

    if (countChanged > 0) {
      persistReadPulseIds(newSet);
    }
  }, [user, updates, readPulseIds]);

  const markAllAsRead = async () => {
    if (!user) return;
    const now = Date.now();
    setLocalReadTime(now);
    if (typeof window !== "undefined") {
      localStorage.setItem(`paperino_last_pulse_read_at_${user.uid}`, now.toString());
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastPulseReadAt: serverTimestamp()
      }).catch(() => {});
    } catch (error) {
      console.warn("Error marking updates as read:", error);
    }
  };

  const notificationsUnreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read && !(n as any).isRead).length;
  }, [notifications]);

  // Mark single notification as read (Instant UI update + Safe Firestore Sync)
  const markNotificationRead = useCallback(async (id: string) => {
    if (!user) return;
    const targetNotif = rawNotifications.find((n) => n.id === id);
    const ownerUid = targetNotif?.ownerUid || targetNotif?.userId || "ALL";

    console.log(`Current UID: ${user.uid}`);
    console.log(`Notification ownerUid: ${ownerUid}`);
    console.log(`Document ID: ${id}`);
    console.log(`Firestore path: notifications/${id}`);

    // 1. Instant local read update (Badge decreases immediately)
    const newSet = new Set(readNotifIds);
    newSet.add(id);
    persistReadIds(newSet);

    // 2. Safe Firestore Sync (Silently handles any permission boundary)
    try {
      await updateDoc(doc(db, "notifications", id), { 
        read: true, 
        isRead: true,
        readAt: serverTimestamp()
      }).catch((e) => {
        console.warn("[NotificationContext] Firestore read sync notice:", e.message);
      });
    } catch (err: any) {
      console.warn("[NotificationContext] markNotificationRead notice:", err.message);
    }
  }, [user, rawNotifications, readNotifIds]);

  // Mark all notifications as read (Instant UI update + Safe Firestore Batch Sync)
  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return;

    // 1. Instant local read update for all notifications
    const newSet = new Set(readNotifIds);
    rawNotifications.forEach((n) => newSet.add(n.id));
    persistReadIds(newSet);

    // 2. Safe Firestore Batch Update for owned docs
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((d) => {
        const data = d.data();
        if (!data.read || !data.isRead) {
          batch.update(d.ref, { 
            read: true, 
            isRead: true, 
            readAt: serverTimestamp() 
          });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit().catch((e) => {
          console.warn("[NotificationContext] Batch commit notice:", e.message);
        });
      }
    } catch (err: any) {
      console.warn("[NotificationContext] markAllNotificationsRead notice:", err.message);
    }
  }, [user, rawNotifications, readNotifIds]);

  // Clear all notifications permanently (Instant UI clear + Safe Firestore Delete)
  const clearAllNotifications = useCallback(async () => {
    if (!user) return;

    // 1. Instant local cleared update
    const newCleared = new Set(clearedNotifIds);
    rawNotifications.forEach((n) => newCleared.add(n.id));
    persistClearedIds(newCleared);

    // 2. Safe Firestore Delete for owned docs
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const batchSize = 500;
      for (let i = 0; i < snap.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
        await batch.commit().catch(() => {});
      }
    } catch (err: any) {
      console.warn("[NotificationContext] clearAllNotifications notice:", err.message);
    }
  }, [user, rawNotifications, clearedNotifIds]);

  // Delete single notification (Instant UI delete + Safe Firestore Delete)
  const deleteSingleNotification = useCallback(async (id: string) => {
    const newCleared = new Set(clearedNotifIds);
    newCleared.add(id);
    persistClearedIds(newCleared);

    try {
      await deleteDoc(doc(db, "notifications", id)).catch(() => {});
    } catch (err: any) {
      console.warn("[NotificationContext] deleteSingleNotification notice:", err.message);
    }
  }, [clearedNotifIds]);

  return (
    <NotificationContext.Provider 
      value={{ 
        unreadUpdates, 
        updates,
        lastPulseReadAt,
        unreadCount: unreadUpdates.length, 
        markAllAsRead,
        pulseUnreadCount,
        categoryPulseUnreadCounts,
        markPulseCategoryAsRead,
        notifications,
        notificationsUnreadCount,
        loadingNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        clearAllNotifications,
        deleteSingleNotification
      }}
    >
      {children}
      
      {/* Custom Real-Time Toast for Pulse Updates */}
      {latestToast && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#0f0c1b]/95 backdrop-blur-2xl border border-cyan-500/30 p-4 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex-shrink-0 border border-cyan-500/30">
                <Radio className="text-cyan-400" size={20} />
              </div>
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    New Update
                  </span>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300 truncate max-w-[100px]">
                    {latestToast.category}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white truncate">
                  {latestToast.title}
                </h4>
                <p className="text-xs text-gray-300 line-clamp-2 mt-0.5">
                  {latestToast.content}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => {
                  markAllAsRead();
                  setLatestToast(null);
                  router.push("/pulse");
                }}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View in Pulse →
              </button>
              <button
                onClick={() => setLatestToast(null)}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  return {
    notifications: ctx.notifications,
    unreadCount: ctx.notificationsUnreadCount,
    loading: ctx.loadingNotifications,
    markRead: ctx.markNotificationRead,
    markAllRead: ctx.markAllNotificationsRead,
    clearMyNotifications: ctx.clearAllNotifications,
    deleteSingleNotification: ctx.deleteSingleNotification,
  };
}
