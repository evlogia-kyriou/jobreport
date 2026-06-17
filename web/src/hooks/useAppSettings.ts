import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

interface AppSettings {
  cleaningIntervalDays: number;
  dueSoonDays: number;
  dormantThresholdDays: number;
  sessionIdleMinutes: number;
  maxPinAttempts: number;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (error) throw error;

      const map: Record<string, string> = {};
      (data ?? []).forEach((row) => {
        map[row.key] = row.value;
      });

      return {
        cleaningIntervalDays: parseInt(map["cleaning_interval_days"] ?? "90"),
        dueSoonDays: parseInt(map["due_soon_days"] ?? "14"),
        dormantThresholdDays: parseInt(map["dormant_threshold_days"] ?? "180"),
        sessionIdleMinutes: parseInt(map["session_idle_minutes"] ?? "60"),
        maxPinAttempts: parseInt(map["max_pin_attempts"] ?? "5"),
      };
    },
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });
}

// ── Helper — compute AC overdue status ────────────────────────────────────────

export type AcOverdueStatus = "ok" | "due_soon" | "overdue";

export function getAcOverdueStatus(
  lastCleanedAt: string | null | undefined,
  cleaningIntervalDays: number,
  dueSoonDays: number,
): AcOverdueStatus {
  if (!lastCleanedAt) return "overdue";

  const daysSince = Math.floor(
    (Date.now() - new Date(lastCleanedAt).getTime()) / 86400000,
  );

  if (daysSince > cleaningIntervalDays) return "overdue";
  if (daysSince > cleaningIntervalDays - dueSoonDays) return "due_soon";
  return "ok";
}

export function getOverdueColor(status: AcOverdueStatus): string {
  return {
    ok: "bg-green-500",
    due_soon: "bg-yellow-400",
    overdue: "bg-red-500",
  }[status];
}

export function getOverdueLabel(status: AcOverdueStatus): string {
  return {
    ok: "OK",
    due_soon: "Segera",
    overdue: "Overdue",
  }[status];
}
