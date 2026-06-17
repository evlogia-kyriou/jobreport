import { supabase } from "@/lib/supabase";
import type { CancellationReason, FlagType, WorkTicket } from "@/types/app";

export const ticketRepository = {

    async getApprovalQueue(): Promise<WorkTicket[]> {
        const { data, error } = await supabase
            .from("tickets")
            .select(`
                *,
                technician:technicians!technician_id(name, technician_id),
                location:locations!location_id(name, address),
                customer:customers!customer_id(name, pic_name),
                project_ticket:project_tickets!project_ticket_id(project_number)
            `)
            .eq("status", "submitted")
            .order("submitted_at", { ascending: true });

        if (error) throw error;
        return (data ?? []) as unknown as WorkTicket[];
    },

    async getTicketById(ticketId: string): Promise<WorkTicket> {
        const { data, error } = await supabase
            .from("tickets")
            .select(`
                *,
                technician:technicians!technician_id(name, technician_id),
                location:locations!location_id(name, address),
                customer:customers!customer_id(name, pic_name),
                project_ticket:project_tickets!project_ticket_id(project_number),
                ac_units:ticket_ac_units(
                    ticket_id, ac_unit_id, order_number,
                    ac_unit:ac_units!ac_unit_id(
                        id, ac_code, type, capacity_pk, unit_label,
                        building_unit:building_units!building_unit_id(display_name),
                        brand:ac_brands!brand_id(name)
                    )
                )
            `)
            .eq("id", ticketId)
            .single();

        if (error) throw error;
        return data as unknown as WorkTicket;
    },

    async approveTicket(ticketId: string): Promise<void> {
        const { error } = await supabase
            .from("tickets")
            .update({ status: "approved" })
            .eq("id", ticketId);

        if (error) throw error;
    },

    async cancelTicket(
        ticketId: string,
        cancellationReason: CancellationReason,
        cancellationNotes?: string,
    ): Promise<void> {
        const { error } = await supabase
            .from("tickets")
            .update({
                status: "cancelled",
                cancellation_reason: cancellationReason,
                cancellation_notes: cancellationNotes,
            })
            .eq("id", ticketId);

        if (error) throw error;
    },

    async approveWithFlag(
        ticketId: string,
        flagType: FlagType,
        flagNotes: string,
    ): Promise<void> {
        const { error } = await supabase
            .from("tickets")
            .update({
                status: "approved",
                is_flagged: true,
                flag_type: flagType,
                flag_notes: flagNotes,
            })
            .eq("id", ticketId);

        if (error) throw error;
    },

    async reopenTicket(
        ticketId: string,
        reopenReason: string,
        reopenedBy: string,
    ): Promise<void> {
        const { error } = await supabase
            .from("tickets")
            .update({
                status: "in_progress",
                is_flagged: true,
                flag_type: "work_reopened",
                reopen_reason: reopenReason,
                reopened_by: reopenedBy,
                reopened_at: new Date().toISOString(),
            })
            .eq("id", ticketId);

        if (error) throw error;
    },
};