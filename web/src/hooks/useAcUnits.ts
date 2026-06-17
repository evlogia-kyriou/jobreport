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
    staleTime: Infinity, // brands rarely change
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
