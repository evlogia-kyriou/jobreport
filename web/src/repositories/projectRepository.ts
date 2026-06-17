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
                location:locations!location_id(name, address)
            `,
      )
      .eq("project_ticket_id", projectId)
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
                    building_unit:building_units!building_unit_id(display_name),
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
      if (payload.type === "cleaning") {
        const stepRows = draft.ac_unit_ids.flatMap((ac_unit_id) =>
          cleaningSopSteps(ticket.id, ac_unit_id),
        );
        const { error: stepsError } = await supabase
          .from("job_steps")
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
          .from("job_steps")
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

    // Submitted tickets (technician finished)
    const { count: submittedTickets } = await supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted");

    // Technicians working today
    const { count: techniciansToday } = await supabase
      .from("tickets")
      .select("technician_id", { count: "exact", head: true })
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
      technicians_today: techniciansToday ?? 0,
      overdue_ac_units: overdueAcUnits ?? 0,
    };
  },
};

// ── SOP Steps Generator (cleaning) ───────────────────────────────────────────

function cleaningSopSteps(ticketId: string, acUnitId: string) {
  return [
    // Kedatangan
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "kedatangan",
      order_number: 1,
      description: "Foto kondisi awal AC",
      step_type: "checklist_photo",
    },
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "kedatangan",
      order_number: 2,
      description: "Ukur suhu ruangan",
      step_type: "numeric_form_photo",
      input_unit: "°C",
    },
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "kedatangan",
      order_number: 3,
      description: "Cek kondisi umum AC",
      step_type: "text_conditional_photo",
    },
    // Pencucian indoor
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "pencucian_indoor",
      order_number: 4,
      description: "Bersihkan filter indoor",
      step_type: "checklist_conditional_photo",
    },
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "pencucian_indoor",
      order_number: 5,
      description: "Semprot evaporator dengan cairan",
      step_type: "checklist_photo",
    },
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "pencucian_indoor",
      order_number: 6,
      description: "Bersihkan bak penampung",
      step_type: "checklist_only",
    },
    // Pencucian outdoor
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "pencucian_outdoor",
      order_number: 7,
      description: "Foto kondisi unit outdoor",
      step_type: "checklist_photo",
    },
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "pencucian_outdoor",
      order_number: 8,
      description: "Semprot kondensor outdoor",
      step_type: "checklist_photo",
    },
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "pencucian_outdoor",
      order_number: 9,
      description: "Cek kondisi kondensor",
      step_type: "checklist_conditional_photo",
    },
    // Penyelesaian
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "penyelesaian",
      order_number: 10,
      description: "Ukur suhu keluaran AC",
      step_type: "numeric_form_photo",
      input_unit: "°C",
    },
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "penyelesaian",
      order_number: 11,
      description: "Cek tekanan refrigeran",
      step_type: "numeric_form_photo",
      input_unit: "bar",
    },
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "penyelesaian",
      order_number: 12,
      description: "Foto kondisi akhir AC (bersih)",
      step_type: "checklist_photo",
    },
    // Laporan kerusakan
    {
      ticket_id: ticketId,
      ac_unit_id: acUnitId,
      section: "laporan_kerusakan",
      order_number: 13,
      description: "Catatan temuan (jika ada)",
      step_type: "dynamic_finding",
    },
  ];
}
