import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { Bell, LogOut, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

function ConnectionStatus() {
  const [status, setStatus] = useState<"connected" | "disconnected">(
    "connected",
  );

  useEffect(() => {
    const channel = supabase.channel("connection-check").subscribe((s) => {
      setStatus(s === "SUBSCRIBED" ? "connected" : "disconnected");
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (status === "connected") return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs">
      <WifiOff className="w-3 h-3" />
      Koneksi terputus
    </div>
  );
}

export function Header() {
  const { user, logout } = useAuthStore();
  const { unreadCount, resetUnread } = useNotificationStore();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <ConnectionStatus />

        {/* Unread indicator */}
        {unreadCount > 0 && (
          <button
            onClick={resetUnread}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </button>
        )}

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Keluar"
            className="text-slate-500 hover:text-slate-700"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
