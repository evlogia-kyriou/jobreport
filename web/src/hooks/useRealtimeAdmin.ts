import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { useNotificationStore } from "@/stores/notificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useRealtimeAdmin() {
  const queryClient = useQueryClient();
  const { incrementUnread } = useNotificationStore();

  useEffect(() => {
    const ticketChannel = supabase
      .channel("admin-ticket-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        (payload) => {
          const ticket = payload.new as Record<string, unknown>;

          queryClient.invalidateQueries({ queryKey: ["tickets", ticket.id] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

          if (ticket.status === "submitted") {
            incrementUnread();
            toast.info(`Laporan baru masuk: ${ticket.ticket_number}`);
            queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
          }

          if (ticket.status === "approved") {
            queryClient.invalidateQueries({ queryKey: ["approval-queue"] });
          }
        },
      )
      .subscribe();

    const projectChannel = supabase
      .channel("admin-project-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "project_tickets" },
        (payload) => {
          const project = payload.new as Record<string, unknown>;

          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["projects", project.id] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

          if (project.status === "completed") {
            toast.success(
              `Proyek ${project.project_number} selesai. Laporan siap diunduh.`,
            );
          }
        },
      )
      .subscribe();

    // Synchronous cleanup — no async
    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(projectChannel);
    };
  }, [queryClient, incrementUnread]);
}

export function useRealtimeTicketDetail(ticketId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-detail-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "job_steps",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["tickets", ticketId],
          });
        },
      )
      .subscribe();

    // Synchronous cleanup — no async
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);
}
