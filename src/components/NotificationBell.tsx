"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { usePulseNotifications } from "@/context/NotificationContext";
import type { PaperinoNotification } from "@/lib/notifications";
import { useRouter } from "next/navigation";

/* ── Helpers ──────────────────────────────────────────── */

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_META: Record<
  PaperinoNotification["type"],
  { dot: string; icon: string }
> = {
  application_submitted: { dot: "bg-violet-400", icon: "📋" },
  application_approved: { dot: "bg-emerald-400", icon: "✅" },
  application_rejected: { dot: "bg-rose-400", icon: "❌" },
  material_uploaded: { dot: "bg-cyan-400", icon: "📤" },
  material_approved: { dot: "bg-emerald-400", icon: "✅" },
  material_rejected: { dot: "bg-rose-400", icon: "❌" },
};

/* ── Component ────────────────────────────────────────── */

export default function NotificationBell() {
  const { notifications: standardNotifications, unreadCount: standardUnread, markRead: markStandardRead, markAllRead: markAllStandardRead } = useNotifications();
  const { unreadUpdates: pulseUpdates, unreadCount: pulseUnread, markAllAsRead: markAllPulseRead } = usePulseNotifications();
  const router = useRouter();

  const unreadCount = standardUnread + pulseUnread;

  const markAllRead = useCallback(async () => {
    await markAllStandardRead();
    await markAllPulseRead();
  }, [markAllStandardRead, markAllPulseRead]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleOpen = useCallback(() => setOpen((v) => !v), []);

  const handleMarkRead = useCallback(
    (id: string) => {
      markStandardRead(id);
    },
    [markStandardRead]
  );

  return (
    <div className="relative flex-shrink-0">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={handleOpen}
        title="Notifications"
        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 border
          ${open
            ? "bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.3)]"
            : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20"
          }`}
      >
        <Bell size={16} className={unreadCount > 0 ? "text-violet-300" : ""} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(139,92,246,0.6)] animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+10px)] w-[340px] sm:w-[380px] max-h-[500px] flex flex-col z-[9999] rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ background: "rgba(8,6,18,0.97)", backdropFilter: "blur(20px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-violet-400" />
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {standardNotifications.length === 0 && pulseUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-600">
                <Inbox size={32} className="opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {pulseUpdates.map((p) => (
                  <button
                    key={`pulse-${p.id}`}
                    onClick={() => {
                      markAllPulseRead();
                      setOpen(false);
                      router.push("/pulse");
                    }}
                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors group hover:bg-white/[0.04] bg-cyan-500/[0.04]`}
                  >
                    <div className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-base bg-white/5 border border-white/5 mt-0.5 text-cyan-400">
                      📻
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">New Update</span>
                      </div>
                      <p className="text-sm leading-snug mb-0.5 text-white font-semibold">
                        {p.title}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1.5">
                        {p.createdAt ? timeAgo(p.createdAt.toDate().getTime()) : "just now"}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-cyan-400 shadow-[0_0_6px_currentColor]" />
                  </button>
                ))}
                {standardNotifications.map((n) => {
                  const meta = TYPE_META[n.type] ?? {
                    dot: "bg-gray-400",
                    icon: "🔔",
                  };
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors group hover:bg-white/[0.04] ${
                        !n.read ? "bg-violet-500/[0.04]" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-base bg-white/5 border border-white/5 mt-0.5">
                        {meta.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-snug mb-0.5 ${
                            !n.read ? "text-white font-semibold" : "text-gray-300 font-medium"
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!n.read && (
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${meta.dot} shadow-[0_0_6px_currentColor]`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {(standardNotifications.length > 0 || pulseUpdates.length > 0) && (
            <div className="px-4 py-2.5 border-t border-white/[0.05] flex-shrink-0">
              <p className="text-[10px] text-gray-600 text-center">
                Showing {standardNotifications.length + pulseUpdates.length} notification{(standardNotifications.length + pulseUpdates.length) !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
