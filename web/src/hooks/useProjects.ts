import { useAuth } from "@/hooks/useAuth";
import { projectRepository } from "@/repositories/projectRepository";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Queries ───────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => projectRepository.getProjects(),
  });
}

export function useProjectById(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => projectRepository.getProjectById(projectId),
    enabled: !!projectId,
  });
}

export function useProjectWorkTickets(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "tickets"],
    queryFn: () => projectRepository.getProjectWorkTickets(projectId),
    enabled: !!projectId,
  });
}

// ── Ticket approval ───────────────────────────────────────────────────────────

export function useApproveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: string) => projectRepository.approveTicket(ticketId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useApproveAllTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      projectRepository.approveAllTickets(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      status,
    }: {
      projectId: string;
      status: string;
    }) => projectRepository.updateProjectStatus(projectId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ── Per-unit approval ─────────────────────────────────────────────────────────

export function useApproveAcUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      acUnitId,
      adminId,
    }: {
      ticketId: string;
      acUnitId: string;
      adminId: string;
    }) => projectRepository.approveAcUnit(ticketId, acUnitId, adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["ticket-steps"] });
    },
  });
}

// ── Unit replacement ──────────────────────────────────────────────────────────

export function useConfirmReplacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      acUnitId,
      adminId,
    }: {
      ticketId: string;
      acUnitId: string;
      adminId: string;
    }) => projectRepository.confirmReplacement(ticketId, acUnitId, adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRejectReplacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      adminId,
      reason,
    }: {
      ticketId: string;
      adminId: string;
      reason: string;
    }) => projectRepository.rejectReplacement(ticketId, adminId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ── Delete hooks ──────────────────────────────────────────────────────────────

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      deletedBy,
      reason,
      notes,
    }: {
      projectId: string;
      deletedBy: string;
      reason: string;
      notes?: string;
    }) => projectRepository.deleteProject(projectId, deletedBy, reason, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      deletedBy,
      reason,
      notes,
    }: {
      ticketId: string;
      deletedBy: string;
      reason: string;
      notes?: string;
    }) => projectRepository.deleteTicket(ticketId, deletedBy, reason, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ── Edit hooks ────────────────────────────────────────────────────────────────

export function useEditProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      projectId: string;
      locationId?: string;
      type?: string;
      editedBy: string;
      reason: string;
      notes?: string;
    }) => projectRepository.editProject(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", variables.projectId] });
    },
  });
}

export function useEditTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      ticketId: string;
      scheduledDate?: string;
      scheduledTime?: string;
      technicianId?: string;
      editedBy: string;
      reason: string;
      notes?: string;
    }) => projectRepository.editTicket(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ── Flag confirm/dismiss ─────────────────────────────────────────────────────

export function useConfirmFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      flagId,
      confirmedBy,
      notes,
    }: {
      flagId: string;
      confirmedBy: string;
      notes: string;
      ticketId: string; // used for invalidation ✅
    }) => projectRepository.confirmFlag(flagId, confirmedBy, notes),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ticket-flags", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDismissFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      flagId,
      dismissReason,
      dismissedBy,
      notes,
    }: {
      flagId: string;
      dismissReason: string;
      dismissedBy: string;
      notes?: string;
      ticketId: string; // used for invalidation ✅
    }) =>
      projectRepository.dismissFlag(flagId, dismissReason, dismissedBy, notes),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ticket-flags", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ── AC unit edit hooks ────────────────────────────────────────────────────────

export function useAvailableAcUnits(ticketId: string, locationId: string) {
  return useQuery({
    queryKey: ["available-ac-units", ticketId, locationId],
    queryFn: () => projectRepository.getAvailableAcUnits(ticketId, locationId),
    enabled: !!ticketId && !!locationId,
  });
}

export function useAddAcUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      ticketId: string;
      acUnitId: string;
      editedBy: string;
      reason: string;
      notes?: string;
    }) => projectRepository.addAcUnitToTicket(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ticket-steps", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      qc.invalidateQueries({
        queryKey: ["available-ac-units", variables.ticketId],
      });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRemoveAcUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      ticketId: string;
      acUnitId: string;
      editedBy: string;
      reason: string;
      notes?: string;
    }) => projectRepository.removeAcUnitFromTicket(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ticket-steps", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      qc.invalidateQueries({
        queryKey: ["available-ac-units", variables.ticketId],
      });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
