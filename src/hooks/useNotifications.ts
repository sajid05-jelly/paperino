"use client";

import { usePulseNotifications } from "@/context/NotificationContext";

export function useNotifications() {
  const {
    notifications,
    notificationsUnreadCount: unreadCount,
    loadingNotifications: loading,
    markNotificationRead: markRead,
    markAllNotificationsRead: markAllRead,
    clearAllNotifications: clearMyNotifications,
    deleteSingleNotification
  } = usePulseNotifications();

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    clearMyNotifications,
    deleteSingleNotification
  };
}
