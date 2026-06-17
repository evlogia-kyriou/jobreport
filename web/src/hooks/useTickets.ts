import { ticketRepository } from "@/repositories/ticketRepository";
import type { CancellationReason, FlagType } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ["tickets", ticketId],
    queryFn: () => ticketRepository.getTicketById(ticketId),
    enabled: !!ticketId,
  });
}

export function useApproveTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: string) => ticketRepository.approveTicket(ticketId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useCancelTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      reason,
      notes,
    }: {
      ticketId: string;
      reason: CancellationReason;
      notes?: string;
    }) => ticketRepository.cancelTicket(ticketId, reason, notes),

    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useApproveWithFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      flagType,
      flagNotes,
    }: {
      ticketId: string;
      flagType: FlagType;
      flagNotes: string;
    }) => ticketRepository.approveWithFlag(ticketId, flagType, flagNotes),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useReopenTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      reason,
      reopenedBy,
    }: {
      ticketId: string;
      reason: string;
      reopenedBy: string;
    }) => ticketRepository.reopenTicket(ticketId, reason, reopenedBy),

    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
    },
  });
}
