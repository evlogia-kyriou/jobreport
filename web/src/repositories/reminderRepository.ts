import { supabase } from "@/lib/supabase";
import type { Phase1Status, Phase2Status, ReminderRow } from "@/types/app";

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchReminders(): Promise<ReminderRow[]> {
  // Cleaning cycle reminders — grouped by location
  const { data: cleaningRows } = await supabase
    .from("reminder_sends")
    .select(
      `
      id, reminder_type, customer_id, location_id, ticket_id,
      phase1_status, sent_at, phase2_status,
      follow_up_date, reason_code, reason_notes, is_dismissed,
      created_at, updated_at,
      customer:customers!customer_id(name),
      location:locations!location_id(name, address),
      ticket:tickets!ticket_id(ticket_number, is_flagged)
    `,
    )
    .eq("is_dismissed", false)
    .order("updated_at", { ascending: false });

  return (cleaningRows ?? []) as ReminderRow[];
}

export async function fetchPendingReminderCount(): Promise<number> {
  // Count reminders that need updating today
  // (sent but phase2 = menunggu or not updated yet)
  const { count } = await supabase
    .from("reminder_sends")
    .select("*", { count: "exact", head: true })
    .eq("is_dismissed", false)
    .eq("phase1_status", "terkirim")
    .eq("phase2_status", "menunggu_respons");
  return count ?? 0;
}

// ── Generate reminders ────────────────────────────────────────────────────────

export async function generateCleaningReminders(
  createdBy: string,
): Promise<void> {
  // Find locations with overdue AC units (90+ days since last clean)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const { data: overdueAc } = await supabase
    .from("ac_units")
    .select(
      "id, location_id, last_cleaned_at, locations!location_id(customer_id)",
    )
    .eq("is_active", true)
    .lt("last_cleaned_at", cutoff.toISOString());

  if (!overdueAc?.length) return;

  // Group by location
  const locationMap = new Map<string, { customer_id: string; count: number }>();
  for (const ac of overdueAc) {
    const locId = ac.location_id;
    const custId = (ac as any).locations?.customer_id;
    if (!locId || !custId) continue;
    const existing = locationMap.get(locId);
    if (existing) existing.count++;
    else locationMap.set(locId, { customer_id: custId, count: 1 });
  }

  // For each location, upsert a reminder if none exists yet
  // (check existing non-dismissed cleaning reminders)
  const { data: existingReminders } = await supabase
    .from("reminder_sends")
    .select("location_id")
    .eq("reminder_type", "cleaning_cycle")
    .eq("is_dismissed", false)
    .in("location_id", [...locationMap.keys()]);

  const existingLocIds = new Set(
    (existingReminders ?? []).map((r: any) => r.location_id),
  );

  const toInsert = [...locationMap.entries()]
    .filter(([locId]) => !existingLocIds.has(locId))
    .map(([locId, { customer_id }]) => ({
      reminder_type: "cleaning_cycle",
      customer_id,
      location_id: locId,
      phase1_status: "belum_dikirim",
      created_by: createdBy,
    }));

  if (toInsert.length > 0) {
    await supabase.from("reminder_sends").insert(toInsert);
  }
}

export async function generateTemuanReminders(
  createdBy: string,
): Promise<void> {
  // Find approved tickets with unresolved flags (ticket_flags.resolved_at IS NULL)
  const { data: flags } = await supabase
    .from("ticket_flags")
    .select(
      `
      ticket_id,
      tickets!ticket_id(
        id, ticket_number, is_flagged, status,
        location_id, customer_id,
        locations!location_id(customer_id)
      )
    `,
    )
    .is("resolved_at", null)
    .eq("flag_type", "unit_replacement");

  if (!flags?.length) return;

  // Check which tickets already have a temuan reminder
  const ticketIds = flags.map((f: any) => f.ticket_id);
  const { data: existingReminders } = await supabase
    .from("reminder_sends")
    .select("ticket_id")
    .eq("reminder_type", "temuan")
    .eq("is_dismissed", false)
    .in("ticket_id", ticketIds);

  const existingTicketIds = new Set(
    (existingReminders ?? []).map((r: any) => r.ticket_id),
  );

  const toInsert = flags
    .filter((f: any) => !existingTicketIds.has(f.ticket_id))
    .map((f: any) => ({
      reminder_type: "temuan",
      customer_id: (f.tickets as any)?.locations?.customer_id ?? null,
      location_id: (f.tickets as any)?.location_id ?? null,
      ticket_id: f.ticket_id,
      phase1_status: "belum_dikirim",
      created_by: createdBy,
    }));

  if (toInsert.length > 0) {
    await supabase.from("reminder_sends").insert(toInsert);
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateReminderPhase1(
  reminderId: string,
  phase1Status: Phase1Status,
  updatedBy: string,
): Promise<void> {
  const updates: Record<string, any> = {
    phase1_status: phase1Status,
    updated_by: updatedBy,
  };

  if (phase1Status === "terkirim") {
    updates.sent_at = new Date().toISOString();
    updates.phase2_status = "menunggu_respons"; // auto-advance ✅
  }

  const { error } = await supabase
    .from("reminder_sends")
    .update(updates)
    .eq("id", reminderId);
  if (error) throw error;
}

export async function updateReminderPhase2(
  reminderId: string,
  payload: {
    phase2Status: Phase2Status;
    followUpDate?: string; // for "diundur"
    reasonCode?: string;
    reasonNotes?: string;
    respondedAt?: string; // ← NEW ✅
    responseNotes?: string; // ← NEW ✅
    updatedBy: string;
  },
): Promise<void> {
  const updates: Record<string, any> = {
    phase2_status: payload.phase2Status,
    updated_by: payload.updatedBy,
  };

  if (payload.reasonCode) updates.reason_code = payload.reasonCode;
  if (payload.reasonNotes) updates.reason_notes = payload.reasonNotes;
  if (payload.respondedAt) updates.responded_at = payload.respondedAt; // ← NEW ✅
  if (payload.responseNotes) updates.response_notes = payload.responseNotes; // ← NEW ✅
  if (payload.reasonNotes) updates.reason_notes = payload.reasonNotes;

  if (payload.phase2Status === "diundur") {
    // Default follow-up: +1 month from today ✅
    const followUp = payload.followUpDate
      ? new Date(payload.followUpDate)
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d;
        })();
    updates.follow_up_date = followUp.toISOString().split("T")[0];
    updates.is_dismissed = true; // dismiss current — follow_up_date resurfaces it ✅
  }

  if (
    payload.phase2Status === "pelanggan_setuju" ||
    payload.phase2Status === "tidak_tertarik"
  ) {
    updates.is_dismissed = true; // close the loop ✅
  }

  const { error } = await supabase
    .from("reminder_sends")
    .update(updates)
    .eq("id", reminderId);
  if (error) throw error;
}

export async function dismissReminder(
  reminderId: string,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from("reminder_sends")
    .update({ is_dismissed: true, updated_by: updatedBy })
    .eq("id", reminderId);
  if (error) throw error;
}

// ── Download helpers ──────────────────────────────────────────────────────────

export function buildReminderCSV(reminders: ReminderRow[]): string {
  const cleaning = reminders.filter(
    (r) => r.reminder_type === "cleaning_cycle",
  );
  const temuan = reminders.filter((r) => r.reminder_type === "temuan");

  const rows: string[] = [
    "Tipe,Pelanggan,Lokasi,Alamat,Info,Status Fase 1,Status Fase 2",
  ];

  for (const r of cleaning) {
    rows.push(
      [
        "Perlu Cuci",
        r.customer?.name ?? "—",
        r.location?.name ?? "—",
        r.location?.address ?? "—",
        `${r.days_overdue ?? "—"} hari terlewat`,
        r.phase1_status,
        r.phase2_status ?? "—",
      ]
        .map((v) => `"${v}"`)
        .join(","),
    );
  }

  for (const r of temuan) {
    rows.push(
      [
        "Perlu Tindak Lanjut",
        r.customer?.name ?? "—",
        r.location?.name ?? "—",
        r.location?.address ?? "—",
        r.ticket?.ticket_number ?? "—",
        r.phase1_status,
        r.phase2_status ?? "—",
      ]
        .map((v) => `"${v}"`)
        .join(","),
    );
  }

  return rows.join("\n");
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
