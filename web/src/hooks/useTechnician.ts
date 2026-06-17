import { toast } from "@/lib/toast";
import { technicianRepository } from "@/repositories/technicianRepository";
import type { Technician } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: () => technicianRepository.getTechnicians(),
  });
}

export function useTechnician(id: string) {
  return useQuery({
    queryKey: ["technicians", id],
    queryFn: () => technicianRepository.getTechnicianById(id),
    enabled: !!id,
  });
}

export function useAvailableTechnicians(params: {
  skill: string;
  date: string;
  time: string;
  durationMinutes: number;
  excludeTicketId?: string;
}) {
  return useQuery({
    queryKey: ["technicians", "available", params],
    queryFn: () =>
      technicianRepository.getAvailableTechnicians(
        params.skill,
        params.date,
        params.time,
        params.durationMinutes,
        params.excludeTicketId,
      ),
    enabled: !!(params.skill && params.date && params.time),
  });
}

export function useCreateTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<Technician>) =>
      technicianRepository.createTechnician(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      toast.success("Teknisi berhasil ditambahkan.");
    },
    onError: () => {
      toast.error("Gagal menambahkan teknisi.");
    },
  });
}

export function useNextTechnicianId() {
  return useQuery({
    queryKey: ["technicians", "next-id"],
    queryFn: () => technicianRepository.getNextTechnicianId(),
    staleTime: 0, // always fresh
  });
}

export function useDeactivateTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => technicianRepository.deactivateTechnician(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      toast.success("Teknisi berhasil dinonaktifkan.");
    },
    onError: () => {
      toast.error("Gagal menonaktifkan teknisi.");
    },
  });
}
