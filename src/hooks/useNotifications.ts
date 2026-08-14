"use client";

export function useNotifications() {
  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    markRead: async () => {},
    markAllRead: async () => {},
    clearMyNotifications: async () => {},
    deleteSingleNotification: async () => {}
  };
}
