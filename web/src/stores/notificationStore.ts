// src/stores/notificationStore.ts
import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  incrementUnread: () => void;
  resetUnread: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
}));
