import { supabase } from "@/lib/supabase";
import type { Technician } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── KPI types ──────────────────────────────────────────────────────────────

export interface TechnicianKpi {
  technician_id: string;
  name: string;
  technician_code: string;
  skills: string[];
  // Lifetime
  total_lifetime: number;
  completed_lifetime: number;
  rework_lifetime: number;
  customer_issue_lifetime: number;
  cancelled_lifetime: number;
  avg_min_per_ac_lifetime: number | null;
  total_ac_lifetime: number;
  // Recent
  total_recent: number;
  completed_recent: number;
  rework_recent: number;
  customer_issue_recent: number;
  cancelled_recent: number;
  avg_min_per_ac_recent: number | null;
  total_ac_recent: number;
}

export interface TechnicianHistoryEntry {
  id: string;
  ticket_id: string;
  event_date: string;
  type: string;
  outcome: string;
  ac_units_count: number;
  duration_minutes: number | null;
  flag_type: string | null;
  cancellation_reason: string | null;
  location: { name: string } | null;
}

export type KpiColorLevel = 1 | 2 | 3 | 4 | 5;

// ── Color level computation ───────────────────────────────────────────────────

export function getKpiColorLevel(kpi: TechnicianKpi): KpiColorLevel {
  const denominator =
    kpi.total_recent - kpi.cancelled_recent - kpi.customer_issue_recent;

  if (denominator <= 0) return 3;

  const qualityRate = kpi.completed_recent / denominator;

  if (qualityRate >= 0.9) return 5;
  if (qualityRate >= 0.75) return 4;
  if (qualityRate >= 0.6) return 3;
  if (qualityRate >= 0.4) return 2;
  return 1;
}

export function getKpiColor(level: KpiColorLevel): string {
  return {
    5: "bg-green-500",
    4: "bg-blue-500",
    3: "bg-yellow-400",
    2: "bg-orange-500",
    1: "bg-red-500",
  }[level];
}

export function getKpiLabel(level: KpiColorLevel): string {
  return {
    5: "Sangat Baik",
    4: "Baik",
    3: "Cukup",
    2: "Perlu Perhatian",
    1: "Bermasalah",
  }[level];
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Technician[];
    },
  });
}

export function useNextTechnicianId() {
  return useQuery({
    queryKey: ["technician-next-id"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technicians")
        .select("technician_id")
        .order("technician_id", { ascending: false })
        .limit(1);
      if (error) throw error;
      const last = data?.[0]?.technician_id ?? "0000000";
      const next = (parseInt(last, 10) + 1).toString().padStart(7, "0");
      return next;
    },
  });
}

export function useDeactivateTechnician() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (technicianId: string) => {
      const { error } = await supabase
        .from("technicians")
        .update({ is_active: false })
        .eq("id", technicianId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
  });
}

export function useTechnicianKpi(technicianId: string) {
  return useQuery({
    queryKey: ["technician-kpi", technicianId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_technician_performance")
        .select("*")
        .eq("technician_id", technicianId)
        .single();
      if (error) throw error;
      return data as TechnicianKpi;
    },
    enabled: !!technicianId,
  });
}

export function useTechnicianHistoryEntries(technicianId: string) {
  return useQuery({
    queryKey: ["technician-history", technicianId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technician_history")
        .select(
          `
                    id, ticket_id, event_date, type,
                    outcome, ac_units_count, duration_minutes,
                    flag_type, cancellation_reason,
                    location:locations!location_id(name)
                `,
        )
        .eq("technician_id", technicianId)
        .order("event_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as TechnicianHistoryEntry[];
    },
    enabled: !!technicianId,
  });
}
