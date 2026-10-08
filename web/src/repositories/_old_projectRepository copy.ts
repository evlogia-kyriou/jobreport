import { supabase } from "@/lib/supabase";
import type {
  DashboardStats,
  ProjectTicket,
  WorkTicket,
  WorkTicketDraft,
} from "@/types/app";

export const projectRepository = {
  // ── Project Ticket List ───────────────────────────────────────────────────

  async getProjects(): Promise<ProjectTicket[]> {
    const { data, error } = await supabase
      .from("project_tickets")
      .select(
        `
                *,
                customer:customers!customer_id(name, pic_name),
                location:locations!location_id(name, address, kelurahan),
                created_by_user:users!created_by(name)
            `,
      )
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as ProjectTicket[];
  },

  async getProjectById(projectId: string): Promise<ProjectTicket> {
    const { data, error } = await supabase
      .from("project_tickets")
      .select(
        `
                *,
                customer:customers!customer_id(name, pic_name),
                location:locations!location_id(name, address, kelurahan),
                created_by_user:users!created_by(name)
            `,
      )
      .eq("id", projectId)
      .single();

    if (error) throw error;
    return data as unknown as ProjectTicket;
  },

  async getProjectWorkTickets(projectId: string): Promise<WorkTicket[]> {
    const { data, error } = await supabase
      .from("tickets")
      .select(
        `
                *,
                technician:technicians!technician_id(name, technician_id),
                location:locations!location_id(name, address),
                ac_units:ticket_ac_units(
                    ac_unit_id,
                    order_number,
                    ac_unit:ac_units!ac_unit_id(
                        id, ac_code, type, capacity_pk, unit_label,
                        building_unit:building_units!building_unit_id(floor,room,zone_label)
                    )
                )
            `,
      )
      .eq("project_ticket_id", projectId)
      .eq("is_deleted", false)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as WorkTicket[];
  },

  async getProjectAcUnits(projectId: string) {
    const { data, error } = await supabase
      .from("project_ticket_ac_units")
      .select(
        `
                project_ticket_id,
                ac_unit_id,
                ac_unit:ac_units!ac_unit_id(
                    id, ac_code, type, capacity_pk, unit_label,
                    access_notes, last_cleaned_at,
                    building_unit:building_units!building_unit_id(floor,room,zone_label),
                    brand:ac_brands!brand_id(name)
                )
            `,
      )
      .eq("project_ticket_id", projectId);

    if (error) throw error;
    return data ?? [];
  },

  // ── Create Project (full flow) ────────────────────────────────────────────
  // Creates: project_ticket + project_ticket_ac_units
  //        + tickets + ticket_ac_units + job_steps per AC

  async createProject(payload: {
    customer_id: string;
    location_id: string;
    type: string;
    ac_unit_ids: string[];
    work_tickets: WorkTicketDraft[];
    created_by: string;
  }): Promise<ProjectTicket> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // 1. Create project ticket
    const { data: project, error: projectError } = await supabase
      .from("project_tickets")
      .insert({
        customer_id: payload.customer_id,
        location_id: payload.location_id,
        type: payload.type,
        total_ac_units: payload.ac_unit_ids.length,
        created_by: payload.created_by,
        status: "in_progress",
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // 2. Insert project_ticket_ac_units (all ACs in scope)
    const projectAcRows = payload.ac_unit_ids.map((ac_unit_id) => ({
      project_ticket_id: project.id,
      ac_unit_id,
    }));

    const { error: pacError } = await supabase
      .from("project_ticket_ac_units")
      .insert(projectAcRows);

    if (pacError) throw pacError;

    // 3. Create work tickets + their AC units + job steps
    for (const draft of payload.work_tickets) {
      // Insert work ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          project_ticket_id: project.id,
          type: payload.type,
          customer_id: payload.customer_id,
          location_id: payload.location_id,
          technician_id: draft.technician_id,
          created_by: payload.created_by,
          scheduled_date: draft.scheduled_date,
          scheduled_time: draft.scheduled_time,
          estimated_minutes: draft.estimated_minutes,
          status: "assigned",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Insert ticket_ac_units for this work ticket
      const ticketAcRows = draft.ac_unit_ids.map((ac_unit_id, index) => ({
        ticket_id: ticket.id,
        ac_unit_id,
        order_number: index + 1,
      }));

      const { error: tacError } = await supabase
        .from("ticket_ac_units")
        .insert(ticketAcRows);

      if (tacError) throw tacError;

      // Insert job_steps per AC unit
      if (payload.type === "cleaning" || payload.type === "Cuci") {
        const stepRows = draft.ac_unit_ids.flatMap((ac_unit_id) =>
          cleaningSopSteps(ticket.id, ac_unit_id),
        );
        const { error: stepsError } = await supabase
          .from("ticket_steps")
          .insert(stepRows);

        if (stepsError) throw stepsError;
      } else {
        // install / service — generic placeholder per AC
        const placeholderRows = draft.ac_unit_ids.map((ac_unit_id) => ({
          ticket_id: ticket.id,
          ac_unit_id,
          section: "penyelesaian",
          order_number: 1,
          description:
            payload.type === "install"
              ? "Pekerjaan instalasi — detail menyusul"
              : "Pekerjaan servis — detail menyusul",
          step_type: "checklist_only",
        }));

        const { error: phError } = await supabase
          .from("ticket_steps")
          .insert(placeholderRows);

        if (phError) throw phError;
      }
    }

    return project as ProjectTicket;
  },

  // ── Report ────────────────────────────────────────────────────────────────

  async markReportSent(
    projectId: string,
    sentVia: "email" | "whatsapp" | "both",
    sentBy: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("project_tickets")
      .update({
        status: "reported",
        report_sent_at: new Date().toISOString(),
        report_sent_via: sentVia,
        report_sent_by: sentBy,
      })
      .eq("id", projectId);

    if (error) throw error;
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split("T")[0];

    // Active projects
    const { count: activeProjects } = await supabase
      .from("project_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress");

    // Submitted tickets needing approval
    const { count: submittedTickets } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted");

    // Flagged + submitted tickets (temuan)
    const { count: flaggedTickets } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted")
      .eq("is_flagged", true);

    // Technicians working today
    const { count: techniciansToday } = await supabase
      .from("tickets")
      .select("technician_id", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .neq("status", "cancelled");

    // In-progress tickets today
    const { count: inProgressToday } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("status", "in_progress");

    // Approved tickets today
    const { count: approvedToday } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("status", "approved");

    // Total tickets today
    const { count: totalToday } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .neq("status", "cancelled");

    // Overdue AC units (not cleaned in 90+ days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { count: overdueAcUnits } = await supabase
      .from("ac_units")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .lt("last_cleaned_at", cutoff.toISOString());

    return {
      active_projects: activeProjects ?? 0,
      submitted_tickets: submittedTickets ?? 0,
      flagged_tickets: flaggedTickets ?? 0,
      technicians_today: techniciansToday ?? 0,
      in_progress_today: inProgressToday ?? 0,
      approved_today: approvedToday ?? 0,
      total_today: totalToday ?? 0,
      overdue_ac_units: overdueAcUnits ?? 0,
    };
  },

  async approveTicket(ticketId: string): Promise<void> {
    const { error } = await supabase
      .from("tickets")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) throw error;
  },

  async approveAllTickets(projectId: string): Promise<void> {
    const { error } = await supabase
      .from("tickets")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("project_ticket_id", projectId)
      .eq("status", "submitted");
    if (error) throw error;
  },

  async updateProjectStatus(projectId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from("project_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) throw error;
  },

  // ── Per-unit approval ─────────────────────────────────────────────────────

  async approveAcUnit(
    ticketId: string,
    acUnitId: string,
    adminId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("ticket_ac_units")
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: adminId,
      })
      .eq("ticket_id", ticketId)
      .eq("ac_unit_id", acUnitId);
    if (error) throw error;

    // Auto-approve ticket if all units approved
    await this.autoApproveTicketIfComplete(ticketId, adminId);
  },

  async autoApproveTicketIfComplete(
    ticketId: string,
    adminId: string,
  ): Promise<void> {
    const { data } = await supabase
      .from("ticket_ac_units")
      .select("is_approved")
      .eq("ticket_id", ticketId);

    const allApproved = data?.every((u) => u.is_approved) ?? false;
    if (!allApproved) return;

    await supabase
      .from("tickets")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", ticketId);
  },

  // ── Unit replacement ───────────────────────────────────────────────────────

  async confirmReplacement(
    ticketId: string,
    acUnitId: string,
    adminId: string,
  ): Promise<void> {
    // 1. Get replacement data
    const { data: tau } = await supabase
      .from("ticket_ac_units")
      .select(
        "replacement_type, replacement_brand_id, replacement_capacity_pk, replacement_is_new, replacement_mfr_year, replacement_serial_number, replacement_photo_indoor_url, replacement_photo_outdoor_url",
      )
      .eq("ticket_id", ticketId)
      .eq("ac_unit_id", acUnitId)
      .single();
    if (!tau) throw new Error("No replacement data found");

    // 2. Get current AC unit to copy access_notes
    const { data: acUnit } = await supabase
      .from("ac_units")
      .select("location_id, building_unit_id, access_notes")
      .eq("id", acUnitId)
      .single();
    if (!acUnit) throw new Error("AC unit not found");

    // 3. Deactivate old unit
    await supabase
      .from("ac_units")
      .update({ is_active: false })
      .eq("id", acUnitId);

    // 4. Create new AC unit
    const { data: newUnit, error: insertError } = await supabase
      .from("ac_units")
      .insert({
        location_id: acUnit.location_id,
        building_unit_id: acUnit.building_unit_id,
        brand_id: tau.replacement_brand_id,
        type: tau.replacement_type,
        capacity_pk: tau.replacement_capacity_pk,
        access_notes: acUnit.access_notes,
        profile_photo_url:
          tau.replacement_photo_indoor_url ?? tau.replacement_photo_outdoor_url,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    // 5. Resolve the flag
    await supabase
      .from("ticket_flags")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
        notes: `Unit baru dibuat: ${newUnit.id}`,
      })
      .eq("ticket_id", ticketId)
      .eq("flag_type", "unit_replacement")
      .is("resolved_at", null);
  },

  async rejectReplacement(
    ticketId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("ticket_flags")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
        notes: reason,
      })
      .eq("ticket_id", ticketId)
      .eq("flag_type", "unit_replacement")
      .is("resolved_at", null);
    if (error) throw error;
  },

  // ── Edit project ──────────────────────────────────────────────────────────

  async editProject(payload: {
    projectId: string;
    locationId?: string;
    type?: string;
    editedBy: string;
    reason: string;
    notes?: string;
  }): Promise<void> {
    // Validate no submitted/approved tickets
    const { data: blocked } = await supabase
      .from("tickets")
      .select("id")
      .eq("project_ticket_id", payload.projectId)
      .in("status", ["submitted", "approved"])
      .eq("is_deleted", false);

    if (blocked && blocked.length > 0) {
      throw new Error(
        "Proyek tidak dapat diedit karena ada tiket yang sudah disubmit atau disetujui.",
      );
    }

    // Fetch current project for audit log
    const { data: current } = await supabase
      .from("project_tickets")
      .select("location_id, type")
      .eq("id", payload.projectId)
      .single();

    // Build update object
    const updates: Record<string, any> = {};
    const logRows: any[] = [];

    if (payload.locationId && payload.locationId !== current?.location_id) {
      updates.location_id = payload.locationId;
      logRows.push({
        entity_type: "project",
        entity_id: payload.projectId,
        field_changed: "location_id",
        old_value: current?.location_id ?? null,
        new_value: payload.locationId,
        edit_reason: payload.reason,
        edit_notes: payload.notes ?? null,
        edited_by: payload.editedBy,
      });
    }

    if (payload.type && payload.type !== current?.type) {
      updates.type = payload.type;
      logRows.push({
        entity_type: "project",
        entity_id: payload.projectId,
        field_changed: "type",
        old_value: current?.type ?? null,
        new_value: payload.type,
        edit_reason: payload.reason,
        edit_notes: payload.notes ?? null,
        edited_by: payload.editedBy,
      });
    }

    if (Object.keys(updates).length === 0) return;

    // Update project
    const { error: projErr } = await supabase
      .from("project_tickets")
      .update(updates)
      .eq("id", payload.projectId);
    if (projErr) throw projErr;

    // Cascade to all active tickets
    const ticketUpdates: Record<string, any> = {};
    if (updates.location_id) ticketUpdates.location_id = updates.location_id;
    if (updates.type) ticketUpdates.type = updates.type;

    if (Object.keys(ticketUpdates).length > 0) {
      const { error: tktErr } = await supabase
        .from("tickets")
        .update(ticketUpdates)
        .eq("project_ticket_id", payload.projectId)
        .eq("is_deleted", false);
      if (tktErr) throw tktErr;
    }

    // Write audit log
    if (logRows.length > 0) {
      await supabase.from("entity_edit_log").insert(logRows);
    }
  },

  // ── Edit ticket ───────────────────────────────────────────────────────────

  async editTicket(payload: {
    ticketId: string;
    scheduledDate?: string;
    scheduledTime?: string;
    technicianId?: string;
    editedBy: string;
    reason: string;
    notes?: string;
  }): Promise<void> {
    // Validate status
    const { data: ticket } = await supabase
      .from("tickets")
      .select("status, scheduled_date, scheduled_time, technician_id")
      .eq("id", payload.ticketId)
      .single();

    if (!ticket) throw new Error("Tiket tidak ditemukan.");
    if (["in_progress", "submitted", "approved"].includes(ticket.status)) {
      // ✅
      throw new Error(
        "Tiket yang sedang berlangsung atau sudah disubmit tidak dapat diedit.",
      );
    }

    const updates: Record<string, any> = {};
    const logRows: any[] = [];

    const base = {
      entity_type: "ticket",
      entity_id: payload.ticketId,
      edit_reason: payload.reason,
      edit_notes: payload.notes ?? null,
      edited_by: payload.editedBy,
    };

    if (
      payload.scheduledDate &&
      payload.scheduledDate !== ticket.scheduled_date
    ) {
      updates.scheduled_date = payload.scheduledDate;
      logRows.push({
        ...base,
        field_changed: "scheduled_date",
        old_value: ticket.scheduled_date,
        new_value: payload.scheduledDate,
      });
    }
    if (
      payload.scheduledTime &&
      payload.scheduledTime !== ticket.scheduled_time
    ) {
      updates.scheduled_time = payload.scheduledTime;
      logRows.push({
        ...base,
        field_changed: "scheduled_time",
        old_value: ticket.scheduled_time,
        new_value: payload.scheduledTime,
      });
    }
    if (payload.technicianId && payload.technicianId !== ticket.technician_id) {
      updates.technician_id = payload.technicianId;
      logRows.push({
        ...base,
        field_changed: "technician_id",
        old_value: ticket.technician_id,
        new_value: payload.technicianId,
      });
    }

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", payload.ticketId);
    if (error) throw error;

    if (logRows.length > 0) {
      await supabase.from("entity_edit_log").insert(logRows);
    }
  },

  // ── AC unit management on ticket ──────────────────────────────────────────

  async getAvailableAcUnits(
    ticketId: string,
    locationId: string,
  ): Promise<any[]> {
    // Get all active AC units at this location
    const { data: allUnits } = await supabase
      .from("ac_units")
      .select(
        `
        id, ac_code, type, capacity_pk, unit_label,
        building_unit:building_units!building_unit_id(floor, room, zone_label)
      `,
      )
      .eq("location_id", locationId)
      .eq("is_active", true)
      .order("ac_code");

    // Get already-assigned AC unit IDs for this ticket
    const { data: assigned } = await supabase
      .from("ticket_ac_units")
      .select("ac_unit_id, is_approved")
      .eq("ticket_id", ticketId);

    const assignedIds = new Set((assigned ?? []).map((a: any) => a.ac_unit_id));
    const approvedIds = new Set(
      (assigned ?? [])
        .filter((a: any) => a.is_approved)
        .map((a: any) => a.ac_unit_id),
    );

    return (allUnits ?? []).map((u: any) => ({
      ...u,
      isAssigned: assignedIds.has(u.id),
      isApproved: approvedIds.has(u.id),
    }));
  },

  async addAcUnitToTicket(payload: {
    ticketId: string;
    acUnitId: string;
    editedBy: string;
    reason: string;
    notes?: string;
  }): Promise<void> {
    // Get next order_number
    const { data: existing } = await supabase
      .from("ticket_ac_units")
      .select("order_number")
      .eq("ticket_id", payload.ticketId)
      .order("order_number", { ascending: false })
      .limit(1);

    const nextOrder = ((existing?.[0] as any)?.order_number ?? 0) + 1;

    // Insert ticket_ac_units row
    const { error: insertErr } = await supabase.from("ticket_ac_units").insert({
      ticket_id: payload.ticketId,
      ac_unit_id: payload.acUnitId,
      order_number: nextOrder,
    });
    if (insertErr) throw insertErr;

    // Seed 26 SOP steps for the new unit
    const stepRows = cleaningSopSteps(payload.ticketId, payload.acUnitId);
    const { error: stepsErr } = await supabase
      .from("ticket_steps")
      .insert(stepRows);
    if (stepsErr) throw stepsErr;

    // Audit log
    await supabase.from("entity_edit_log").insert({
      entity_type: "ticket",
      entity_id: payload.ticketId,
      field_changed: "ac_units_added",
      old_value: null,
      new_value: payload.acUnitId,
      edit_reason: payload.reason,
      edit_notes: payload.notes ?? null,
      edited_by: payload.editedBy,
    });
  },

  async removeAcUnitFromTicket(payload: {
    ticketId: string;
    acUnitId: string;
    editedBy: string;
    reason: string;
    notes?: string;
  }): Promise<void> {
    // Block if unit has completed steps
    const { data: completedSteps } = await supabase
      .from("ticket_steps")
      .select("id")
      .eq("ticket_id", payload.ticketId)
      .eq("ac_unit_id", payload.acUnitId)
      .eq("is_completed", true);

    if (completedSteps && completedSteps.length > 0) {
      throw new Error(
        "Unit ini tidak dapat dihapus karena sudah ada langkah yang diselesaikan.",
      );
    }

    // Delete all steps for this unit
    await supabase
      .from("ticket_steps")
      .delete()
      .eq("ticket_id", payload.ticketId)
      .eq("ac_unit_id", payload.acUnitId);

    // Delete ticket_ac_units row
    const { error } = await supabase
      .from("ticket_ac_units")
      .delete()
      .eq("ticket_id", payload.ticketId)
      .eq("ac_unit_id", payload.acUnitId);
    if (error) throw error;

    // Audit log
    await supabase.from("entity_edit_log").insert({
      entity_type: "ticket",
      entity_id: payload.ticketId,
      field_changed: "ac_units_removed",
      old_value: payload.acUnitId,
      new_value: null,
      edit_reason: payload.reason,
      edit_notes: payload.notes ?? null,
      edited_by: payload.editedBy,
    });
  },

  // ── Soft delete — Project ─────────────────────────────────────────────────

  async deleteProject(
    projectId: string,
    deletedBy: string,
    reason: string,
    notes?: string,
  ): Promise<void> {
    // Verify all tickets are already soft-deleted before allowing project deletion
    const { data: activeTickets } = await supabase
      .from("tickets")
      .select("id")
      .eq("project_ticket_id", projectId)
      .eq("is_deleted", false);

    if (activeTickets && activeTickets.length > 0) {
      throw new Error(
        `Masih ada ${activeTickets.length} tiket aktif. Hapus semua tiket terlebih dahulu.`,
      );
    }

    const { error } = await supabase
      .from("project_tickets")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
        deletion_reason: reason,
        deletion_notes: notes ?? null,
      })
      .eq("id", projectId);
    if (error) throw error;
  },

  // ── Soft delete — Ticket ──────────────────────────────────────────────────

  async deleteTicket(
    ticketId: string,
    deletedBy: string,
    reason: string,
    notes?: string,
  ): Promise<void> {
    // Verify ticket is not submitted/approved before deleting
    const { data: ticket } = await supabase
      .from("tickets")
      .select("status, project_ticket_id")
      .eq("id", ticketId)
      .single();

    if (!ticket) throw new Error("Tiket tidak ditemukan.");

    const blockedStatuses = ["in_progress", "submitted", "approved"]; // ✅
    if (blockedStatuses.includes(ticket.status)) {
      throw new Error(
        "Tiket yang sedang berlangsung, sudah disubmit, atau disetujui tidak dapat dihapus.",
      );
    }

    // Check if project is reported
    const { data: project } = await supabase
      .from("project_tickets")
      .select("status")
      .eq("id", ticket.project_ticket_id)
      .single();

    if (project?.status === "reported") {
      throw new Error(
        "Tiket dalam proyek yang sudah dilaporkan tidak dapat dihapus.",
      );
    }

    const { error } = await supabase
      .from("tickets")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
        deletion_reason: reason,
        deletion_notes: notes ?? null,
      })
      .eq("id", ticketId);
    if (error) throw error;
  },
};

// ── SOP Steps Generator (cleaning) ───────────────────────────────────────────

function cleaningSopSteps(ticketId: string, acUnitId: string) {
  const base = { ticket_id: ticketId, ac_unit_id: acUnitId };
  return [
    // ── 1. KEDATANGAN (unit identity photos) ─────────────────────────────
    {
      ...base,
      order_number: 1,
      section: "kedatangan",
      description: "Foto Unit Indoor",
      step_type: "photo_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 2,
      section: "kedatangan",
      description: "Foto Unit Outdoor",
      step_type: "photo_only",
      input_unit: null,
    },

    // ── 2. PENGECEKAN AC (measurements + function checks) ─────────────────
    {
      ...base,
      order_number: 3,
      section: "pengecekan_ac",
      description: "Suhu Awal",
      step_type: "numeric_form_photo",
      input_unit: "°C",
    },
    {
      ...base,
      order_number: 4,
      section: "pengecekan_ac",
      description: "Ampere Awal",
      step_type: "numeric_form_photo",
      input_unit: "A",
    },
    {
      ...base,
      order_number: 5,
      section: "pengecekan_ac",
      description: "Voltage Awal",
      step_type: "numeric_form_photo",
      input_unit: "V",
    },
    {
      ...base,
      order_number: 6,
      section: "pengecekan_ac",
      description: "Remote Normal",
      step_type: "checklist_conditional_photo",
      input_unit: null,
    },
    {
      ...base,
      order_number: 7,
      section: "pengecekan_ac",
      description: "Swing Normal",
      step_type: "checklist_conditional_photo",
      input_unit: null,
    },
    {
      ...base,
      order_number: 8,
      section: "pengecekan_ac",
      description: "Tidak ada suara abnormal",
      step_type: "checklist_conditional_photo",
      input_unit: null,
    },

    // ── 3. PERSIAPAN PENCUCIAN ────────────────────────────────────────────
    {
      ...base,
      order_number: 9,
      section: "persiapan_pencucian",
      description: "Listrik / MCB Off",
      step_type: "checklist_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 10,
      section: "persiapan_pencucian",
      description: "PCB Indoor terlindungi",
      step_type: "checklist_photo",
      input_unit: null,
    },
    {
      ...base,
      order_number: 11,
      section: "persiapan_pencucian",
      description: "PCB Outdoor terlindungi",
      step_type: "checklist_photo",
      input_unit: null,
    },

    // ── 4. PENCUCIAN INDOOR ───────────────────────────────────────────────
    {
      ...base,
      order_number: 12,
      section: "pencucian_indoor",
      description: "Filter dicuci",
      step_type: "checklist_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 13,
      section: "pencucian_indoor",
      description: "Evaporator dicuci",
      step_type: "checklist_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 14,
      section: "pencucian_indoor",
      description: "Blower dibersihkan",
      step_type: "checklist_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 15,
      section: "pencucian_indoor",
      description: "Drain dibersihkan",
      step_type: "checklist_only",
      input_unit: null,
    },

    // ── 5. PENCUCIAN OUTDOOR ──────────────────────────────────────────────
    {
      ...base,
      order_number: 16,
      section: "pencucian_outdoor",
      description: "Kondensor dicuci",
      step_type: "checklist_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 17,
      section: "pencucian_outdoor",
      description: "Fan Outdoor dibersihkan",
      step_type: "checklist_only",
      input_unit: null,
    },

    // ── 6. PENGECEKAN AKHIR ───────────────────────────────────────────────
    {
      ...base,
      order_number: 18,
      section: "pengecekan_akhir",
      description: "Suhu Akhir",
      step_type: "numeric_form_photo",
      input_unit: "°C",
    },
    {
      ...base,
      order_number: 19,
      section: "pengecekan_akhir",
      description: "Ampere Akhir",
      step_type: "numeric_form_photo",
      input_unit: "A",
    },
    {
      ...base,
      order_number: 20,
      section: "pengecekan_akhir",
      description: "Test run AC 5 menit",
      step_type: "checklist_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 21,
      section: "pengecekan_akhir",
      description: "Tidak bocor",
      step_type: "checklist_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 22,
      section: "pengecekan_akhir",
      description: "Tuang 1L Drain Lancar",
      step_type: "checklist_only",
      input_unit: null,
    },
    {
      ...base,
      order_number: 23,
      section: "pengecekan_akhir",
      description: "Tidak suara abnormal",
      step_type: "checklist_only",
      input_unit: null,
    },

    // ── 7. DOKUMENTASI AKHIR ──────────────────────────────────────────────
    {
      ...base,
      order_number: 24,
      section: "dokumentasi_akhir",
      description: "Area Indoor dirapikan",
      step_type: "checklist_photo",
      input_unit: null,
    },
    {
      ...base,
      order_number: 25,
      section: "dokumentasi_akhir",
      description: "Area Outdoor dirapikan",
      step_type: "checklist_photo",
      input_unit: null,
    },

    // ── 8. LAPORAN KERUSAKAN ──────────────────────────────────────────────
    {
      ...base,
      order_number: 26,
      section: "laporan_kerusakan",
      description: "Catatan temuan (jika ada)",
      step_type: "dynamic_finding",
      input_unit: null,
    },
  ];
}

// ── Blocking status queries (CreateProjectScreen) ─────────────────────────────

export type AcBlockStatus = {
  ac_unit_id: string;
  reason: "active_ticket" | "recently_cleaned";
  ticket_number?: string;
  ticket_id?: string;
  days_remaining?: number;
};

const CLEANING_INTERVAL_DAYS = 90;

export async function getAcBlockingStatus(
  locationId: string,
): Promise<AcBlockStatus[]> {
  const { data: acs } = await supabase
    .from("ac_units")
    .select("id, last_cleaned_at")
    .eq("location_id", locationId)
    .eq("is_active", true);

  if (!acs || acs.length === 0) return [];
  const acIds = acs.map((a: any) => a.id);

  // Find ACs with active tickets (not cancelled/approved)
  const { data: activeTickets } = await supabase
    .from("ticket_ac_units")
    .select("ac_unit_id, ticket:tickets!ticket_id(id, ticket_number, status)")
    .in("ac_unit_id", acIds);

  const ticketMap = new Map<
    string,
    { ticket_number: string; ticket_id: string }
  >();
  for (const link of activeTickets ?? []) {
    const t = (link as any).ticket;
    if (t && !["cancelled", "approved", "submitted"].includes(t.status)) {
      if (!ticketMap.has(link.ac_unit_id)) {
        ticketMap.set(link.ac_unit_id, {
          ticket_number: t.ticket_number,
          ticket_id: t.id,
        });
      }
    }
  }

  const result: AcBlockStatus[] = [];

  for (const ac of acs) {
    const ticketInfo = ticketMap.get(ac.id);
    if (ticketInfo) {
      result.push({
        ac_unit_id: ac.id,
        reason: "active_ticket",
        ...ticketInfo,
      });
      continue;
    }
    if (ac.last_cleaned_at) {
      const cleaned = new Date(ac.last_cleaned_at);
      const nextDue = new Date(cleaned);
      nextDue.setDate(nextDue.getDate() + CLEANING_INTERVAL_DAYS);
      const daysRemaining = Math.ceil(
        (nextDue.getTime() - Date.now()) / 86400000,
      );
      if (daysRemaining > 0) {
        result.push({
          ac_unit_id: ac.id,
          reason: "recently_cleaned",
          days_remaining: daysRemaining,
        });
      }
    }
  }

  return result;
}

export async function getTicketPopoverData(ticketId: string) {
  const { data } = await supabase
    .from("tickets")
    .select(
      [
        "id, ticket_number, scheduled_date, scheduled_time, status",
        "technician:technicians!technician_id(name)",
        "location:locations!location_id(name)",
        "project_ticket:project_tickets!project_ticket_id(project_number)",
      ].join(", "),
    )
    .eq("id", ticketId)
    .single();
  return data as any;
}

export async function getLocationPopoverData(locationId: string) {
  const { data } = await supabase
    .from("locations")
    .select("id, name, address, type, customer:customers!customer_id(name)")
    .eq("id", locationId)
    .single();
  const { count } = await supabase
    .from("ac_units")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("is_active", true);
  return { ...(data as any), total_ac: count ?? 0 };
}

export async function getCustomerPopoverData(customerId: string) {
  const { data } = await supabase
    .from("customers")
    .select("id, name, pic_name")
    .eq("id", customerId)
    .single();
  const { count: locCount } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("is_active", true);
  const { count: acCount } = await supabase
    .from("ac_units")
    .select("id", { count: "exact", head: true })
    .eq("location_id.customer_id", customerId)
    .eq("is_active", true);
  return {
    ...(data as any),
    total_locations: locCount ?? 0,
    total_ac: acCount ?? 0,
  };
}

// ── RPC availability checks ────────────────────────────────────────────────────

export type CustomerAvailability = {
  all_blocked: boolean;
  location_count: number;
  total_ac_count: number;
};

export type LocationAvailability = {
  all_blocked: boolean;
  total_ac_count: number;
};

// ── Approval ──────────────────────────────────────────────────────────────

export async function getCustomerAvailability(): Promise<
  Map<string, CustomerAvailability>
> {
  const { data, error } = await supabase.rpc("get_customer_availability");
  if (error) {
    console.error("getCustomerAvailability:", error);
    return new Map();
  }
  const map = new Map<string, CustomerAvailability>();
  for (const row of data ?? []) {
    map.set(row.customer_id, {
      all_blocked: row.all_blocked,
      location_count: row.location_count ?? 0,
      total_ac_count: row.total_ac_count ?? 0,
    });
  }
  return map;
}

export async function getLocationAvailability(
  customerId: string,
): Promise<Map<string, LocationAvailability>> {
  const { data, error } = await supabase.rpc("get_location_availability", {
    p_customer_id: customerId,
  });
  if (error) {
    console.error("getLocationAvailability:", error);
    return new Map();
  }
  const map = new Map<string, LocationAvailability>();
  for (const row of data ?? []) {
    map.set(row.location_id, {
      all_blocked: row.all_blocked,
      total_ac_count: row.total_ac_count ?? 0,
    });
  }
  return map;
}

export async function getProjectPopoverData(projectId: string) {
  const { data } = await supabase
    .from("project_tickets")
    .select(
      "id, project_number, type, status, total_ac_units, " +
        "created_at, updated_at, " +
        "customer:customers!customer_id(name), " +
        "location:locations!location_id(name)",
    )
    .eq("id", projectId)
    .single();
  return data as any;
}

// ── Customer Activity Log ──────────────────────────────────────────────────────

export type ActivityEventType =
  | "project_created"
  | "project_completed"
  | "report_sent"
  | "keluhan_pelanggan"
  | "pic_tidak_hadir"
  | "pembatalan"
  | "lainnya";

export interface CustomerActivity {
  id: string;
  customer_id: string;
  event_type: ActivityEventType;
  description: string;
  reference_id?: string;
  reference_type?: "project" | "ticket";
  author_user_id?: string;
  author?: { name: string };
  created_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  author_user_id: string;
  author?: { name: string };
  is_deleted: boolean;
  deleted_at?: string;
  created_at: string;
}

export interface CleaningStatus {
  location_id: string;
  needs_cleaning: boolean;
  min_days_remaining: number | null;
}

export async function getCustomerActivityLog(
  customerId: string,
): Promise<CustomerActivity[]> {
  const { data, error } = await supabase
    .from("customer_activity_log")
    .select("*, author:users!author_user_id(name)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerActivity[];
}

export async function addCustomerActivity(entry: {
  customer_id: string;
  event_type: ActivityEventType;
  description: string;
  reference_id?: string;
  reference_type?: "project" | "ticket";
  author_user_id: string;
}): Promise<void> {
  const { error } = await supabase.from("customer_activity_log").insert(entry);
  if (error) throw error;
}

export async function getCustomerNotes(
  customerId: string,
): Promise<CustomerNote[]> {
  const { data, error } = await supabase
    .from("customer_notes")
    .select("*, author:users!author_user_id(name)")
    .eq("customer_id", customerId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerNote[];
}

export async function addCustomerNote(
  customerId: string,
  content: string,
  authorId: string,
): Promise<void> {
  const { error } = await supabase
    .from("customer_notes")
    .insert({ customer_id: customerId, content, author_user_id: authorId });
  if (error) throw error;
}

export async function softDeleteCustomerNote(
  noteId: string,
  deletedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from("customer_notes")
    .update({
      is_deleted: true,
      deleted_by: deletedBy,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", noteId);
  if (error) throw error;
}

export async function getLocationCleaningStatus(
  customerId: string,
): Promise<Map<string, CleaningStatus>> {
  const { data, error } = await supabase.rpc("get_location_cleaning_status", {
    p_customer_id: customerId,
  });
  if (error) {
    console.error("getLocationCleaningStatus:", error);
    return new Map();
  }
  const map = new Map<string, CleaningStatus>();
  for (const row of data ?? []) {
    map.set(row.location_id, {
      location_id: row.location_id,
      needs_cleaning: row.needs_cleaning,
      min_days_remaining: row.min_days_remaining,
    });
  }
  return map;
}
