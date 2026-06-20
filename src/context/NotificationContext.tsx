"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { Radio, X, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export interface PulseUpdate {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "normal" | "important" | "pinned";
  createdAt: Timestamp;
}

interface NotificationContextType {
  unreadUpdates: PulseUpdate[];
  unreadCount: number;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadUpdates: [],
  unreadCount: 0,
  markAllAsRead: async () => {},
});

export const usePulseNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, lastPulseReadAt } = useAuth();
  const [unreadUpdates, setUnreadUpdates] = useState<PulseUpdate[]>([]);
  const [latestToast, setLatestToast] = useState<PulseUpdate | null>(null);
  const router = useRouter();

  // Firestore listener
  useEffect(() => {
    if (!user) {
      setUnreadUpdates([]);
      return;
    }

    // Default to far past if null
    const lastRead = lastPulseReadAt ? lastPulseReadAt.toDate() : new Date(0);

    const q = query(collection(db, "pulse_updates"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PulseUpdate));
      
      const unread = updates.filter(u => {
        if (!u.createdAt) return false;
        return u.createdAt.toDate() > lastRead;
      });

      setUnreadUpdates(unread);

      // Check for newly added documents to trigger toast
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const update = { id: change.doc.id, ...change.doc.data() } as PulseUpdate;
          if (update.createdAt && update.createdAt.toDate() > lastRead) {
            // Only show toast if it was created within the last 5 minutes (truly 'real-time')
            // Otherwise, initial load will toast everything
            const now = new Date();
            const diffMs = now.getTime() - update.createdAt.toDate().getTime();
            if (diffMs < 5 * 60 * 1000) {
              setLatestToast(update);
              setTimeout(() => setLatestToast(null), 8000); // Auto dismiss after 8s
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, lastPulseReadAt]);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        lastPulseReadAt: serverTimestamp()
      });
      setUnreadUpdates([]);
    } catch (error) {
      console.error("Error marking updates as read:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{ unreadUpdates, unreadCount: unreadUpdates.length, markAllAsRead }}>
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
                <h4 className="text-white font-bold text-sm truncate">{latestToast.title}</h4>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{latestToast.description}</p>
                
                <div className="mt-3 flex items-center gap-3">
                  <button 
                    onClick={() => {
                      markAllAsRead();
                      setLatestToast(null);
                      router.push("/pulse");
                    }}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 transition-colors"
                  >
                    View Details <ExternalLink size={12} />
                  </button>
                  <button 
                    onClick={() => {
                      markAllAsRead();
                      setLatestToast(null);
                    }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-300 px-2 py-1.5"
                  >
                    Mark as read
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setLatestToast(null)}
                className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
