import { toast } from "@/lib/toast";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useRef } from "react";

const TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useInactivityLogout() {
  const { user, logout } = useAuthStore();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!user) return;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await logout();
        toast.warning("Sesi berakhir karena tidak aktif.");
      }, TIMEOUT);
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user, logout]);
}
