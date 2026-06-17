import { supabase } from "@/lib/supabase";
import type { Technician } from "@/types/app";

export const technicianRepository = {
  async getTechnicians(): Promise<Technician[]> {
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return (data ?? []) as Technician[];
  },

  async getTechnicianById(id: string): Promise<Technician> {
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Technician;
  },

  async getAvailableTechnicians(
    skill: string,
    date: string,
    time?: string,
    durationMinutes?: number,
    excludeTicketId?: string,
  ): Promise<Technician[]> {
    // Get all active technicians with required skill
    const { data: all, error } = await supabase
      .from("technicians")
      .select("*")
      .contains("skills", [skill])
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    // Get technicians with overlapping tickets that day
    let query = supabase
      .from("tickets")
      .select("technician_id, scheduled_time, estimated_minutes")
      .eq("scheduled_date", date)
      .neq("status", "cancelled");

    if (excludeTicketId) {
      query = query.neq("id", excludeTicketId);
    }

    const { data: busyTickets } = await query;

    // If time + duration provided, check actual time overlap
    const busyIds = new Set(
      (busyTickets ?? [])
        .filter((t) => {
          if (!time || !durationMinutes) return true; // exclude all if no time given
          const newStart = timeToMinutes(time);
          const newEnd = newStart + durationMinutes;
          const busyStart = timeToMinutes(t.scheduled_time);
          const busyEnd = busyStart + (t.estimated_minutes ?? 0);
          return newStart < busyEnd && newEnd > busyStart;
        })
        .map((t) => t.technician_id),
    );

    return (all ?? []).filter((t) => !busyIds.has(t.id)) as Technician[];
  },

  async createTechnician(payload: Partial<Technician>): Promise<Technician> {
    const { data, error } = await supabase
      .from("technicians")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Technician;
  },

  async getNextTechnicianId(): Promise<string> {
    const { data, error } = await supabase
      .from("technicians")
      .select("technician_id")
      .order("technician_id", { ascending: false })
      .limit(1);

    if (error) throw error;

    const last = data?.[0]?.technician_id ?? "0000000";
    const next = (parseInt(last, 10) + 1).toString().padStart(7, "0");
    return next;
  },

  async deactivateTechnician(id: string): Promise<void> {
    const { error } = await supabase
      .from("technicians")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
  },
};

// ── Helper ────────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
