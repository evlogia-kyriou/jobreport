import { supabase } from "@/lib/supabase";
import { projectRepository } from "@/repositories/projectRepository";
import type { WorkTicket, WorkTicketDraft } from "@/types/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ── Project Tickets ───────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => projectRepository.getProjects(),
  });
}

export function useProject(projectId: string) {
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

export function useProjectAcUnits(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "ac-units"],
    queryFn: () => projectRepository.getProjectAcUnits(projectId),
    enabled: !!projectId,
  });
}

// ── Create Project ────────────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      customer_id: string;
      location_id: string;
      type: string;
      ac_unit_ids: string[];
      work_tickets: WorkTicketDraft[];
      created_by: string;
    }) => projectRepository.createProject(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

// ── Mark Report Sent ──────────────────────────────────────────────────────────

export function useMarkReportSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      sentVia,
      sentBy,
    }: {
      projectId: string;
      sentVia: "email" | "whatsapp" | "both";
      sentBy: string;
    }) => projectRepository.markReportSent(projectId, sentVia, sentBy),

    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRescheduleTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cancelledTicket,
      technicianId,
      scheduledDate,
      scheduledTime,
      estimatedMinutes,
      createdBy,
    }: {
      cancelledTicket: WorkTicket;
      technicianId: string;
      scheduledDate: string;
      scheduledTime: string;
      estimatedMinutes: number;
      createdBy: string;
    }) => {
      // 1. Create new ticket
      const { data: newTicket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          project_ticket_id: cancelledTicket.project_ticket_id,
          type: cancelledTicket.type,
          customer_id: cancelledTicket.customer_id,
          location_id: cancelledTicket.location_id,
          technician_id: technicianId,
          created_by: createdBy,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          estimated_minutes: estimatedMinutes,
          status: "assigned",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 2. Copy ticket_ac_units from cancelled ticket
      const { data: acUnits, error: acError } = await supabase
        .from("ticket_ac_units")
        .select("ac_unit_id, order_number")
        .eq("ticket_id", cancelledTicket.id);

      if (acError) throw acError;

      if (acUnits && acUnits.length > 0) {
        const { error: acInsertError } = await supabase
          .from("ticket_ac_units")
          .insert(
            acUnits.map((u: { ac_unit_id: string; order_number: number }) => ({
              ticket_id: newTicket.id,
              ac_unit_id: u.ac_unit_id,
              order_number: u.order_number,
            })),
          );
        if (acInsertError) throw acInsertError;
      }

      // 3. Copy job_steps from cancelled ticket
      //    Reset completion state
      const { data: steps, error: stepsError } = await supabase
        .from("job_steps")
        .select("*")
        .eq("ticket_id", cancelledTicket.id)
        .order("order_number");

      if (stepsError) throw stepsError;

      if (steps && steps.length > 0) {
        const { error: stepsInsertError } = await supabase
          .from("job_steps")
          .insert(
            steps.map((s) => ({
              ticket_id: newTicket.id,
              ac_unit_id: s.ac_unit_id,
              section: s.section,
              order_number: s.order_number,
              description: s.description,
              step_type: s.step_type,
              input_unit: s.input_unit,
              // Reset completion state:
              input_value: null,
              is_checked: false,
              is_condition_abnormal: false,
              photo_url: null,
              is_completed: false,
              completed_by: null,
              completed_at: null,
            })),
          );
        if (stepsInsertError) throw stepsInsertError;
      }

      return newTicket;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({
        queryKey: [
          "project-tickets",
          variables.cancelledTicket.project_ticket_id,
        ],
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
