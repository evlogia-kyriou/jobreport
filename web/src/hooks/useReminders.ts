import {
  dismissReminder,
  fetchPendingReminderCount,
  fetchReminders,
  generateCleaningReminders,
  generateTemuanReminders,
  updateReminderPhase1,
  updateReminderPhase2,
} from "@/repositories/reminderRepository";
import type { Phase1Status, Phase2Status } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: fetchReminders,
  });
}

export function usePendingReminderCount() {
  return useQuery({
    queryKey: ["reminders-pending-count"],
    queryFn: fetchPendingReminderCount,
    refetchInterval: 60_000, // refresh every minute ✅
  });
}

export function useGenerateReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await generateCleaningReminders(userId);
      await generateTemuanReminders(userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders-pending-count"] });
    },
  });
}

export function useUpdateReminderPhase1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reminderId,
      phase1Status,
      updatedBy,
    }: {
      reminderId: string;
      phase1Status: Phase1Status;
      updatedBy: string;
    }) => updateReminderPhase1(reminderId, phase1Status, updatedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders-pending-count"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUpdateReminderPhase2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reminderId,
      ...payload
    }: {
      reminderId: string;
      phase2Status: Phase2Status;
      followUpDate?: string;
      reasonCode?: string;
      reasonNotes?: string;
      respondedAt?: string; // ← NEW ✅
      responseNotes?: string; // ← NEW ✅
      updatedBy: string;
    }) => updateReminderPhase2(reminderId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders-pending-count"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDismissReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reminderId,
      updatedBy,
    }: {
      reminderId: string;
      updatedBy: string;
    }) => dismissReminder(reminderId, updatedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}
