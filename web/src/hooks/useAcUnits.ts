import { supabase } from "@/lib/supabase";
import { acUnitRepository } from "@/repositories/acUnitRepository";
import type { AcUnit } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAcUnitsByLocation(locationId: string) {
  return useQuery({
    queryKey: ["ac-units", "location", locationId],
    queryFn: () => acUnitRepository.getAcUnitsByLocation(locationId),
    enabled: !!locationId,
  });
}

export function useAllAcUnits() {
  return useQuery({
    queryKey: ["ac-units", "all"],
    queryFn: () => acUnitRepository.getAllAcUnits(),
  });
}

export function useAcBrands() {
  return useQuery({
    queryKey: ["ac-brands"],
    queryFn: () => acUnitRepository.getBrands(),
    staleTime: Infinity,
  });
}

// ── NEW: single AC unit ✅ ─────────────────────────────────────────────────────
export function useAcUnitById(acUnitId: string) {
  return useQuery({
    queryKey: ["ac-unit", acUnitId],
    staleTime: 60_000, // don't refetch for 1 min ✅
    refetchOnWindowFocus: false, // don't reload on tab switch ✅
    queryFn: async () => {
      // Simplified join — avoid complex nested syntax ✅
      const { data, error } = await supabase
        .from("ac_units")
        .select(
          `
          *,
          brand:ac_brands(id, name),
          building_unit:building_units(id, floor, room, zone_label),
          location:locations(id, name, address, customer_id)
        `,
        )
        .eq("id", acUnitId)
        .single();
      if (error) {
        console.error("useAcUnitById error:", error);
        throw error;
      }
      return data as unknown as AcUnit & {
        brand?: { id: string; name: string } | null;
        building_unit?: {
          id: string;
          floor?: string;
          room?: string;
          zone_label?: string;
        } | null;
        location?: {
          id: string;
          name: string;
          address: string;
          customer_id: string;
        } | null;
      };
    },
    enabled: !!acUnitId,
  });
}

// ── NEW: medical record ✅ ─────────────────────────────────────────────────────
export interface AcMedicalRecord {
  ticket_id: string;
  ticket_number: string;
  approved_at: string;
  scheduled_date: string;
  technician_name: string;
  suhu_passed: boolean | null;
  arus_passed: boolean | null;
  suhu_awal: string | null;
  suhu_akhir: string | null;
  arus_awal: string | null;
  arus_akhir: string | null;
}

export function useAcMedicalRecord(acUnitId: string, limit?: number) {
  return useQuery({
    queryKey: ["ac-medical-record", acUnitId, limit],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch approved ticket_ac_units for this AC ✅
      let q = supabase
        .from("ticket_ac_units")
        .select(
          `
          ticket_id, suhu_passed, arus_passed,
          ticket:tickets!ticket_id(
            id, ticket_number, scheduled_date, approved_at,
            technician:technicians!technician_id(name)
          )
        `,
        )
        .eq("ac_unit_id", acUnitId)
        .eq("is_approved", true)
        .order("approved_at", { ascending: false, referencedTable: "tickets" });

      if (limit) q = q.limit(limit);
      const { data: units, error } = await q;
      if (error) throw error;
      if (!units?.length) return [];

      const ticketIds = units.map((u: any) => u.ticket_id);

      // Batch fetch suhu/arus steps ✅
      const { data: steps } = await supabase
        .from("ticket_steps")
        .select("ticket_id, description, input_value")
        .eq("ac_unit_id", acUnitId)
        .in("ticket_id", ticketIds)
        .in("description", [
          "Suhu Awal",
          "Suhu Akhir",
          "Ampere Awal",
          "Ampere Akhir",
        ]);

      const stepMap = new Map<string, Record<string, string>>();
      for (const s of steps ?? []) {
        if (!stepMap.has(s.ticket_id)) stepMap.set(s.ticket_id, {});
        stepMap.get(s.ticket_id)![s.description] = s.input_value;
      }

      return units.map((u: any): AcMedicalRecord => {
        const t = u.ticket ?? {};
        const m = stepMap.get(u.ticket_id) ?? {};
        return {
          ticket_id: u.ticket_id,
          ticket_number: t.ticket_number ?? "—",
          approved_at: t.approved_at ?? "",
          scheduled_date: t.scheduled_date ?? "",
          technician_name: t.technician?.name ?? "—",
          suhu_passed: u.suhu_passed,
          arus_passed: u.arus_passed,
          suhu_awal: m["Suhu Awal"] ?? null,
          suhu_akhir: m["Suhu Akhir"] ?? null,
          arus_awal: m["Ampere Awal"] ?? null,
          arus_akhir: m["Ampere Akhir"] ?? null,
        };
      });
    },
    enabled: !!acUnitId,
  });
}

export function useRegisterAcUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AcUnit>) =>
      acUnitRepository.registerAcUnit(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: ["ac-units", "location", payload.location_id],
      });
    },
  });
}
