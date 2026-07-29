"use client";

import React, { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { usePulseNotifications } from "@/context/NotificationContext";
import type { PaperinoNotification } from "@/lib/notifications";
import { Bell, CheckCheck, Trash2, X, Sparkles, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

/* ── Helpers ─────────────────────────────────────────── */

function timeAgo(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 1000);
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
  department_suggested: { dot: "bg-fuchsia-400", icon: "🏢" },
  subject_suggested: { dot: "bg-purple-400", icon: "📚" },
  feedback_submitted: { dot: "bg-amber-400", icon: "💬" },
  department_approved: { dot: "bg-emerald-400", icon: "🏢" },
  department_rejected: { dot: "bg-rose-400", icon: "🏢" },
  subject_approved: { dot: "bg-emerald-400", icon: "📚" },
  subject_rejected: { dot: "bg-rose-400", icon: "📚" },
  premium_unlocked: { dot: "bg-amber-400 animate-pulse", icon: "🚀" },
  free_class_reported: { dot: "bg-purple-400 animate-pulse", icon: "📢" },
  free_class_expired: { dot: "bg-amber-400", icon: "⏰" },
};

/* ── Component ────────────────────────────────────────── */

export function NotificationBell() {
  const router = useRouter();
  const { unreadUpdates, markAllAsRead: markAllPulseRead } = usePulseNotifications();
  const {
    notifications: standardNotifications,
    unreadCount: standardUnread,
    markRead: markStandardRead,
    markAllRead: markAllStandardRead,
    clearMyNotifications,
    deleteSingleNotification
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const totalUnread = unreadUpdates.length + standardUnread;
  const totalCount = unreadUpdates.length + standardNotifications.length;

  const handleMarkAllRead = async () => {
    await markAllPulseRead();
    await markAllStandardRead();
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearMyNotifications();
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  const handleNotificationClick = async (n: PaperinoNotification) => {
    await markStandardRead(n.id);
    setOpen(false);

    if (n.type === "free_class_reported" || n.type === "free_class_expired" || n.roomId) {
      router.push(`/free-class-finder${n.roomId ? `?room=${encodeURIComponent(n.roomId)}` : ""}`);
    }
  };

  const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSingleNotification(id);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all focus:outline-none"
      >
        <Bell size={20} />
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 text-[9px] font-bold text-white px-1 shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpen(false);
            setConfirmClear(false);
          }}
        />
      )}

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-[#0e091b]/95 backdrop-blur-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Notifications</span>
              {totalUnread > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {totalUnread} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {totalUnread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-violet-300 hover:bg-white/5 transition-colors text-xs flex items-center gap-1"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline text-[11px]">Read all</span>
                </button>
              )}

              {totalCount > 0 && (
                <button
                  onClick={() => setConfirmClear(true)}
                  title="Clear all"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors text-xs"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmClear(false);
                }}
                className="p-1 rounded-lg text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04]">
            {totalCount === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gray-500">
                  <Bell size={22} />
                </div>
                <p className="text-sm font-semibold text-gray-300">No notifications yet</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">
                  You'll see updates about free classrooms, material approvals, and contributions here.
                </p>
              </div>
            ) : (
              <div>
                {/* Pulse Updates Section */}
                {unreadUpdates.map((p) => {
                  return (
                    <button
                      key={`pulse-${p.id}`}
                      onClick={() => {
                        markAllPulseRead();
                        setOpen(false);
                        router.push("/pulse");
                      }}
                      className="w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors group hover:bg-white/[0.04] bg-cyan-500/[0.04]"
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
                  );
                })}

                {/* Standard Notifications Section */}
                {standardNotifications.map((n) => {
                  const meta = TYPE_META[n.type] ?? {
                    dot: "bg-gray-400",
                    icon: "🔔",
                  };
                  const isUnread = !n.read && !(n as any).isRead;

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors group hover:bg-white/[0.04] cursor-pointer ${
                        isUnread ? "bg-violet-500/[0.04]" : ""
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
                            isUnread ? "text-white font-semibold" : "text-gray-300 font-medium"
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>

                      {/* Right actions: Unread Dot + Individual Delete Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <div
                            className={`w-2 h-2 rounded-full ${meta.dot} shadow-[0_0_6px_currentColor]`}
                          />
                        )}
                        <button
                          onClick={(e) => handleDeleteSingle(e, n.id)}
                          title="Delete notification"
                          className="p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {totalCount > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.05] flex-shrink-0">
              {confirmClear ? (
                <div className="flex items-center justify-between gap-2 animate-in fade-in duration-200">
                  <p className="text-[10px] text-rose-400 font-bold">Clear all notifications?</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleClearAll}
                      disabled={clearing}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {clearing ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                      {clearing ? "Clearing..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="px-2 py-1 rounded-lg text-[10px] text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full text-center text-xs text-gray-400 hover:text-rose-300 py-1 transition-colors flex items-center justify-center gap-1.5 font-medium"
                >
                  <Trash2 size={13} /> Clear all notifications
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
