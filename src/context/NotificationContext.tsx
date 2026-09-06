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
  createdBy?: string;
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
  const { user, lastPulseReadAt } = useAuth();
  const [updates, setUpdates] = useState<PulseUpdate[]>([]);
  const [localReadTime, setLocalReadTime] = useState<number>(0);
  const [readPulseIds, setReadPulseIds] = useState<Set<string>>(new Set());

  // Sync LocalStorage Pulse Read State on Mount / User change
  useEffect(() => {
    if (!user) return;
    try {
      const readPulseSaved = localStorage.getItem(`paperino_read_pulse_${user.uid}`);
      if (readPulseSaved) {
        setReadPulseIds(new Set(JSON.parse(readPulseSaved)));
      }
    } catch (e) {
      console.warn("Error loading pulse cache:", e);
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

  // 1. One-time Fetch for Pulse Updates (Replaces Real-time Listener)
  const fetchPulseUpdates = useCallback(async () => {
    if (!user) {
      setUpdates([]);
      return;
    }
    
    try {
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
      setUpdates(newUpdates);
    } catch (err: any) {
      console.warn("[NotificationContext] pulse_updates getDocs notice:", err?.message || err);
    }
  }, [user]);

  useEffect(() => {
    fetchPulseUpdates();
  }, [fetchPulseUpdates]);

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
      if (u.createdBy && u.createdBy === user.uid) return false;
      const createdDate = (u.createdAt && typeof u.createdAt.toDate === "function") 
        ? u.createdAt.toDate() 
        : new Date(u.createdAt as any);
      return createdDate > lastRead;
    });
  }, [updates, lastPulseReadAt, user]);

  // Calculate per-item and per-category unread Pulse updates per user
  const unreadPulseItems = useMemo(() => {
    if (!user) return [];
    return updates.filter((u) => {
      // Do not show notifications for content created by the current user
      if (u.createdBy && u.createdBy === user.uid) return false;
      return !readPulseIds.has(u.id);
    });
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
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    markRead: async () => {},
    markAllRead: async () => {},
    clearMyNotifications: async () => {},
    deleteSingleNotification: async () => {},
  };
}
