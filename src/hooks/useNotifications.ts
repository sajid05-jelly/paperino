"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { PaperinoNotification } from "@/lib/notifications";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PaperinoNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // No orderBy here — avoids requiring a composite Firestore index.
    // We sort client-side instead (newest first by createdAt).
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const notifs: PaperinoNotification[] = [];
        snap.forEach((d) =>
          notifs.push({ id: d.id, ...d.data() } as PaperinoNotification)
        );
        // Sort newest first on the client — no index required
        notifs.sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(notifs);
        setLoading(false);
      },
      (err) => {
        console.error("[useNotifications] snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error("[useNotifications] markRead error:", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("read", "==", false)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
    } catch (err) {
      console.error("[useNotifications] markAllRead error:", err);
    }
  }, [user]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
