import { supabase } from "@/lib/supabase";
import { locationRepository } from "@/repositories/locationRepository";
import type { Location, LocationMaintenanceRow } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useLocationsByCustomer(customerId: string) {
  return useQuery({
    queryKey: ["locations", "customer", customerId],
    queryFn: () => locationRepository.getLocationsByCustomer(customerId),
    enabled: !!customerId,
  });
}

export type MaintenanceFilter = "overdue" | "due_soon" | "ok" | "never" | "all";

export function useBuildingUnits(locationId: string) {
  return useQuery({
    queryKey: ["building-units", locationId],
    queryFn: () => locationRepository.getBuildingUnits(locationId),
    enabled: !!locationId,
  });
}

export function useSearchBuildings(query: string) {
  return useQuery({
    queryKey: ["buildings", "search", query],
    queryFn: () => locationRepository.searchBuildings(query),
    enabled: query.length >= 2,
  });
}

export function useRegions(filters: {
  province?: string;
  kabupaten?: string;
  kecamatan?: string;
}) {
  return useQuery({
    queryKey: ["regions", filters],
    queryFn: () => locationRepository.getRegions(filters),
    enabled: filters.kecamatan
      ? !!filters.kabupaten
      : filters.kabupaten
        ? !!filters.province
        : true,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<Location>) =>
      locationRepository.createLocation(payload),

    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: ["locations", "customer", payload.customer_id],
      });
    },
  });
}

export function useSoftDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) =>
      locationRepository.softDeleteLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useReactivateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) =>
      locationRepository.reactivateLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      payload,
    }: {
      locationId: string;
      payload: Partial<Location>;
    }) => locationRepository.updateLocation(locationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteBuildingUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (buildingUnitId: string) =>
      locationRepository.deleteBuildingUnit(buildingUnitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-units"] });
    },
  });
}

export function useRenameBuildingUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      buildingUnitId,
      room,
    }: {
      buildingUnitId: string;
      room: string;
    }) => locationRepository.renameBuildingUnit(buildingUnitId, room),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-units"] });
    },
  });
}

export function useRenameFloor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      oldFloor,
      newFloor,
    }: {
      locationId: string;
      oldFloor: string;
      newFloor: string;
    }) => locationRepository.renameFloor(locationId, oldFloor, newFloor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["building-units"] });
    },
  });
}

export function useLocationMaintenance({
  filter = "overdue",
  search = "",
  page = 1,
  pageSize = 20,
}: {
  filter?: MaintenanceFilter;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["location-maintenance", filter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("v_location_maintenance")
        .select("*", { count: "exact" });

      // Apply filter
      if (filter === "overdue") {
        query = query
          .gt("overdue_count", 0)
          .not("last_service_date", "is", null);
      } else if (filter === "due_soon") {
        query = query.eq("overdue_count", 0).gt("due_soon_count", 0);
      } else if (filter === "ok") {
        query = query
          .eq("overdue_count", 0)
          .eq("due_soon_count", 0)
          .gt("ok_count", 0);
      } else if (filter === "never") {
        query = query.is("last_service_date", null).gt("total_ac", 0);
      }

      // Apply search
      if (search.trim()) {
        query = query.or(
          `customer_name.ilike.%${search}%,` +
            `location_name.ilike.%${search}%,` +
            `kabupaten.ilike.%${search}%`,
        );
      }

      // Apply sort
      if (filter === "overdue" || filter === "all") {
        query = query.order("overdue_count", { ascending: false });
      } else if (filter === "due_soon") {
        query = query.order("due_soon_count", { ascending: false });
      } else if (filter === "ok") {
        query = query.order("last_service_date", { ascending: true });
      } else if (filter === "never") {
        query = query.order("location_name", { ascending: true });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        rows: (data ?? []) as LocationMaintenanceRow[],
        total: count ?? 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute cache
  });
}

export function useLocationMaintenanceStats() {
  return useQuery({
    queryKey: ["location-maintenance-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_location_maintenance")
        .select(
          "overdue_count, due_soon_count, ok_count, last_service_date, total_ac",
        );

      if (error) throw error;

      const rows = data ?? [];
      return {
        overdueCount: rows.filter(
          (r) => r.overdue_count > 0 && r.last_service_date !== null,
        ).length,
        dueSoonCount: rows.filter(
          (r) => r.overdue_count === 0 && r.due_soon_count > 0,
        ).length,
        okCount: rows.filter(
          (r) =>
            r.overdue_count === 0 && r.due_soon_count === 0 && r.ok_count > 0,
        ).length,
        neverCount: rows.filter(
          (r) => r.last_service_date === null && r.total_ac > 0,
        ).length,
      };
    },
    staleTime: 60 * 1000,
  });
}
