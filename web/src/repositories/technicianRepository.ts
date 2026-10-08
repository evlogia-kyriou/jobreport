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
    const { data: all, error } = await supabase
      .from("technicians")
      .select("*")
      .contains("skills", [skill])
      .eq("is_active", true)
      .order("name");
    if (error) throw error;

    let query = supabase
      .from("tickets")
      .select("technician_id, scheduled_time, estimated_minutes")
      .eq("scheduled_date", date)
      .neq("status", "cancelled");
    if (excludeTicketId) query = query.neq("id", excludeTicketId);

    const { data: busyTickets } = await query;

    const busyIds = new Set(
      (busyTickets ?? [])
        .filter((t) => {
          if (!time || !durationMinutes) return true;
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

  // ── UPDATE — new ✅ ───────────────────────────────────────────────────────
  async updateTechnician(payload: {
    id: string;
    name?: string;
    phone?: string;
    skills?: string[];
    is_active?: boolean;
    editedBy: string;
    reason: string;
    notes?: string;
  }): Promise<void> {
    // Fetch current values for audit diff ✅
    const { data: current } = await supabase
      .from("technicians")
      .select("name, phone, skills, is_active")
      .eq("id", payload.id)
      .single();

    const updates: Record<string, any> = {};
    const logRows: any[] = [];

    const base = {
      entity_type: "technician",
      entity_id: payload.id,
      edit_reason: payload.reason,
      edit_notes: payload.notes ?? null,
      edited_by: payload.editedBy,
    };

    if (payload.name !== undefined && payload.name !== current?.name) {
      updates.name = payload.name;
      logRows.push({
        ...base,
        field_changed: "name",
        old_value: current?.name,
        new_value: payload.name,
      });
    }
    if (payload.phone !== undefined && payload.phone !== current?.phone) {
      updates.phone = payload.phone;
      logRows.push({
        ...base,
        field_changed: "phone",
        old_value: current?.phone,
        new_value: payload.phone,
      });
    }
    if (payload.skills !== undefined) {
      const oldSkills = JSON.stringify(current?.skills ?? []);
      const newSkills = JSON.stringify(payload.skills);
      if (oldSkills !== newSkills) {
        updates.skills = payload.skills;
        logRows.push({
          ...base,
          field_changed: "skills",
          old_value: oldSkills,
          new_value: newSkills,
        });
      }
    }
    if (
      payload.is_active !== undefined &&
      payload.is_active !== current?.is_active
    ) {
      updates.is_active = payload.is_active;
      logRows.push({
        ...base,
        field_changed: "is_active",
        old_value: String(current?.is_active),
        new_value: String(payload.is_active),
      });
    }

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase
      .from("technicians")
      .update(updates)
      .eq("id", payload.id);
    if (error) throw error;

    if (logRows.length > 0) {
      await supabase.from("entity_edit_log").insert(logRows);
    }
  },

  // ── Quality metrics for date range ✅ ─────────────────────────────────────
  async getTechnicianQualityMetrics(
    technicianId: string,
    fromDate: string,
  ): Promise<{
    suhu_pass_rate: number;
    arus_pass_rate: number;
    temuan_rate: number;
    total: number;
  }> {
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, is_flagged")
      .eq("technician_id", technicianId)
      .eq("status", "approved")
      .gte("approved_at", fromDate);

    if (!tickets?.length)
      return { suhu_pass_rate: 0, arus_pass_rate: 0, temuan_rate: 0, total: 0 };

    const ticketIds = tickets.map((t) => t.id);
    const { data: units } = await supabase
      .from("ticket_ac_units")
      .select("suhu_passed, arus_passed")
      .in("ticket_id", ticketIds)
      .eq("is_approved", true);

    const suhuUnits = (units ?? []).filter((u) => u.suhu_passed !== null);
    const arusUnits = (units ?? []).filter((u) => u.arus_passed !== null);
    const suhuPassed = suhuUnits.filter((u) => u.suhu_passed).length;
    const arusPassed = arusUnits.filter((u) => u.arus_passed).length;
    const flagged = tickets.filter((t) => t.is_flagged).length;

    return {
      suhu_pass_rate: suhuUnits.length
        ? (suhuPassed / suhuUnits.length) * 100
        : 0,
      arus_pass_rate: arusUnits.length
        ? (arusPassed / arusUnits.length) * 100
        : 0,
      temuan_rate: tickets.length ? (flagged / tickets.length) * 100 : 0,
      total: tickets.length,
    };
  },
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
