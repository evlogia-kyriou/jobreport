/**
 * Toast — lightweight in-app notification
 * Auto-dismisses after `duration` ms (default 3000).
 * Renders fixed at top-center, above all content.
 *
 * Usage:
 *   const [toast, setToast] = useState<ToastState | null>(null);
 *   setToast({ message: "Berhasil disimpan", type: "success" });
 *   <Toast toast={toast} onDismiss={() => setToast(null)} />
 */

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastState {
  message: string;
  type?: ToastType;
  duration?: number; // ms, default 3000
}

interface Props {
  toast: ToastState | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, toast.duration ?? 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const styles: Record<ToastType, string> = {
    success: "bg-green-600 text-white",
    error: "bg-red-600   text-white",
    info: "bg-slate-800 text-white",
  };

  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  const type = toast.type ?? "success";

  return (
    <div
      className={`
        fixed top-5 left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-3
        px-5 py-3 rounded-xl shadow-xl
        text-sm font-medium
        animate-in fade-in slide-in-from-top-2
        duration-200
        ${styles[type]}
      `}
      role="status"
      aria-live="polite"
    >
      <span className="text-base leading-none">{icons[type]}</span>
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-2 opacity-70 hover:opacity-100 leading-none text-base"
        aria-label="Tutup"
      >
        ×
      </button>
    </div>
  );
}
