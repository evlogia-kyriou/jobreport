import { supabase } from "@/lib/supabase";
import { customerRepository } from "@/repositories/customerRepository";
import type { Customer } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CustomerPerformance {
  customer_id: string;
  name: string;
  stage: string;
  // Lifetime
  total_lifetime: number;
  completed_lifetime: number;
  disputed_lifetime: number;
  cancelled_lifetime: number;
  flagged_lifetime: number;
  // Recent
  total_recent: number;
  completed_recent: number;
  cancelled_recent: number;
  disputed_recent: number;
  // Last project
  last_project_date: string | null;
}

export type CustomerWarningLevel = "none" | "low" | "high";

export interface CustomerWarningConfig {
  icon: string;
  label: string;
  className: string;
  detail: string;
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => customerRepository.getCustomers(),
  });
}

export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: ["customers", customerId],
    queryFn: () => customerRepository.getCustomerById(customerId),
    enabled: !!customerId,
  });
}

export function useSearchCustomers(query: string) {
  return useQuery({
    queryKey: ["customers", "search", query],
    queryFn: () => customerRepository.searchCustomers(query),
    enabled: query.length >= 2,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Customer>) =>
      customerRepository.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// ── Warning logic (Option C — TypeScript computation) ─────────────────────────

export function getCustomerWarningLevel(
  kpi: CustomerPerformance,
): CustomerWarningLevel {
  if (kpi.total_lifetime < 2) return "none";

  const cancelRate = kpi.cancelled_lifetime / kpi.total_lifetime;
  const disputeRate = kpi.disputed_lifetime / kpi.total_lifetime;

  if (cancelRate >= 0.3 || disputeRate >= 0.3) return "high";
  if (cancelRate >= 0.15 || disputeRate >= 0.15) return "low";

  return "none";
}

export function getCustomerWarningConfig(
  level: CustomerWarningLevel,
  kpi: CustomerPerformance,
): CustomerWarningConfig | null {
  if (level === "none") return null;

  const cancelRate = Math.round(
    (kpi.cancelled_lifetime / kpi.total_lifetime) * 100,
  );
  const disputeRate = Math.round(
    (kpi.disputed_lifetime / kpi.total_lifetime) * 100,
  );

  const parts: string[] = [];
  if (kpi.cancelled_lifetime > 0)
    parts.push(`${cancelRate}% batalkan (${kpi.cancelled_lifetime}x)`);
  if (kpi.disputed_lifetime > 0)
    parts.push(`${disputeRate}% sengketa (${kpi.disputed_lifetime}x)`);

  return {
    low: {
      icon: "⚠️",
      label: "Perlu Perhatian",
      className: "text-amber-700 bg-amber-50 border-amber-200",
      detail: parts.join(" · "),
    },
    high: {
      icon: "🚨",
      label: "Risiko Tinggi",
      className: "text-red-700 bg-red-50 border-red-200",
      detail: parts.join(" · "),
    },
  }[level]!;
}

export function useCustomerPerformance(customerId: string) {
  return useQuery({
    queryKey: ["customer-performance", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_customer_performance")
        .select("*")
        .eq("customer_id", customerId)
        .single();
      if (error) throw error;
      return data as CustomerPerformance;
    },
    enabled: !!customerId,
  });
}

export function useAllCustomerPerformance() {
  return useQuery({
    queryKey: ["customer-performance-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_customer_performance")
        .select("*");
      if (error) throw error;
      return (data ?? []) as CustomerPerformance[];
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerId,
      customerName,
      reason,
      notes,
    }: {
      customerId: string;
      customerName: string;
      reason: string;
      notes?: string;
    }) =>
      customerRepository.hardDeleteCustomer(
        customerId,
        customerName,
        reason,
        notes,
      ),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      customerId,
      payload,
    }: {
      customerId: string;
      payload: Partial<{
        type: string;
        name: string;
        pic_name: string;
        stage: string;
        source: string;
        notes: string;
      }>;
    }) => {
      const { error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", customerId);
      if (error) throw error;
    },
    onSuccess: (_data, { customerId }) => {
      // Use refetchQueries (not invalidateQueries) to force immediate refresh
      // regardless of the global staleTime: 30s in queryClient.ts
      queryClient.refetchQueries({ queryKey: ["customers"] });
      queryClient.refetchQueries({ queryKey: ["customers", customerId] });
      queryClient.refetchQueries({
        queryKey: ["locations", "customer", customerId],
      });
      queryClient.refetchQueries({ queryKey: ["location-maintenance"] });
      queryClient.refetchQueries({ queryKey: ["projects"] });
    },
  });
}
