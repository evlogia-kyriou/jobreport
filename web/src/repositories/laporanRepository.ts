import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimeFilter = "hari_ini" | "minggu_ini" | "bulan_ini" | "custom";
export type Granularity = "hour" | "day" | "week";

export interface DateRange {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  granularity: Granularity;
  label: string;
}

export interface VolumeMetrics {
  total_approved: number;
  by_type: { cleaning: number; service: number; installation: number };
  awaiting_approval: number;
  overdue: number;
}

export interface QualityMetrics {
  suhu_pass_rate: number; // 0–100
  arus_pass_rate: number;
  temuan_rate: number;
  replacement_rate: number;
  suhu_total: number; // denominator (non-null only) ✅
  arus_total: number;
  temuan_total: number;
  replacement_total: number;
}

export interface SpeedMetrics {
  avg_submit_days: number | null;
  avg_approve_days: number | null;
  prev_avg_submit_days: number | null;
  prev_avg_approve_days: number | null;
  longest_pending: PendingTicket[];
}

export interface PendingTicket {
  id: string;
  ticket_number: string;
  submitted_at: string;
  days_waiting: number;
  project_number: string;
  technician_name: string;
}

export interface TechnicianMetric {
  technician_id: string;
  name: string;
  tickets_approved: number;
  temuan_rate: number;
  suhu_pass_rate: number;
  arus_pass_rate: number;
}

export interface ChartDataPoint {
  label: string;
  cleaning: number;
  service: number;
  installation: number;
}

// ── Date range helpers ────────────────────────────────────────────────────────

export function buildDateRange(
  filter: TimeFilter,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "hari_ini": {
      const from = today.toISOString();
      const to = new Date(today.getTime() + 86_400_000).toISOString();
      const prevFrom = new Date(today.getTime() - 86_400_000).toISOString();
      return {
        from,
        to,
        prevFrom,
        prevTo: from,
        granularity: "hour",
        label: "Hari ini",
      };
    }
    case "minggu_ini": {
      const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
      const monday = new Date(today.getTime() - dow * 86_400_000);
      const from = monday.toISOString();
      const to = new Date(monday.getTime() + 7 * 86_400_000).toISOString();
      const prevFrom = new Date(
        monday.getTime() - 7 * 86_400_000,
      ).toISOString();
      return {
        from,
        to,
        prevFrom,
        prevTo: from,
        granularity: "day",
        label: "Minggu ini",
      };
    }
    case "bulan_ini": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const to = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      ).toISOString();
      const prevFrom = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      ).toISOString();
      return {
        from,
        to,
        prevFrom,
        prevTo: from,
        granularity: "week",
        label: "Bulan ini",
      };
    }
    case "custom": {
      const from = customFrom!;
      const to = customTo!;
      const diffDays =
        (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
      const granularity: Granularity =
        diffDays <= 1 ? "hour" : diffDays <= 14 ? "day" : "week";
      const prevFrom = new Date(
        new Date(from).getTime() - diffDays * 86_400_000,
      ).toISOString();
      return {
        from,
        to,
        prevFrom,
        prevTo: from,
        granularity,
        label: "Periode kustom",
      };
    }
  }
}

// ── Volume metrics ────────────────────────────────────────────────────────────

export async function getVolumeMetrics(
  range: DateRange,
): Promise<VolumeMetrics> {
  const today = new Date().toISOString().split("T")[0];

  // Approved in range
  const { data: approved } = await supabase
    .from("tickets")
    .select("type")
    .eq("status", "approved")
    .gte("approved_at", range.from)
    .lt("approved_at", range.to);

  const byType = { cleaning: 0, service: 0, installation: 0 };
  for (const t of approved ?? []) {
    if (t.type === "cleaning") byType.cleaning++;
    if (t.type === "service") byType.service++;
    if (t.type === "installation") byType.installation++;
  }

  // Awaiting approval
  const { count: awaiting } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "submitted");

  // Overdue (scheduled but not started/submitted)
  const { count: overdue } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .lt("scheduled_date", today)
    .not("status", "in", '("submitted","approved","cancelled")');

  return {
    total_approved: approved?.length ?? 0,
    by_type: byType,
    awaiting_approval: awaiting ?? 0,
    overdue: overdue ?? 0,
  };
}

// ── Quality metrics ───────────────────────────────────────────────────────────

export async function getQualityMetrics(
  range: DateRange,
): Promise<QualityMetrics> {
  // Fetch approved ticket_ac_units in range (with suhu/arus pass) ✅
  const { data: units } = await supabase
    .from("ticket_ac_units")
    .select(
      `
      suhu_passed, arus_passed,
      ticket:tickets!ticket_id(
        is_flagged, approved_at
      )
    `,
    )
    .eq("is_approved", true)
    .gte("approved_at", range.from)
    .lt("approved_at", range.to);

  const suhuUnits = (units ?? []).filter((u) => u.suhu_passed !== null);
  const arusUnits = (units ?? []).filter((u) => u.arus_passed !== null);
  const suhuPassed = suhuUnits.filter((u) => u.suhu_passed === true).length;
  const arusPassed = arusUnits.filter((u) => u.arus_passed === true).length;

  // Temuan rate — per ticket
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, is_flagged")
    .eq("status", "approved")
    .gte("approved_at", range.from)
    .lt("approved_at", range.to);

  const totalTickets = tickets?.length ?? 0;
  const flaggedCount = (tickets ?? []).filter((t) => t.is_flagged).length;

  // Replacement rate — tickets with unit_replacement flag
  const { data: replacements } = await supabase
    .from("ticket_flags")
    .select("ticket_id, tickets!ticket_id(approved_at, status)")
    .eq("flag_type", "unit_replacement")
    .in(
      "ticket_id",
      (tickets ?? []).map((t) => t.id),
    );

  const replacementCount = new Set((replacements ?? []).map((r) => r.ticket_id))
    .size;

  return {
    suhu_pass_rate:
      suhuUnits.length > 0 ? (suhuPassed / suhuUnits.length) * 100 : 0,
    arus_pass_rate:
      arusUnits.length > 0 ? (arusPassed / arusUnits.length) * 100 : 0,
    temuan_rate: totalTickets > 0 ? (flaggedCount / totalTickets) * 100 : 0,
    replacement_rate:
      totalTickets > 0 ? (replacementCount / totalTickets) * 100 : 0,
    suhu_total: suhuUnits.length,
    arus_total: arusUnits.length,
    temuan_total: totalTickets,
    replacement_total: totalTickets,
  };
}

// ── Speed metrics ─────────────────────────────────────────────────────────────

function avgDays(
  tickets: any[],
  fromField: string,
  toField: string,
): number | null {
  const diffs = tickets
    .filter((t) => t[fromField] && t[toField])
    .map(
      (t) =>
        (new Date(t[toField]).getTime() - new Date(t[fromField]).getTime()) /
        86_400_000,
    );
  if (!diffs.length) return null;
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

export async function getSpeedMetrics(range: DateRange): Promise<SpeedMetrics> {
  // Current period: submitted tickets
  const { data: current } = await supabase
    .from("tickets")
    .select("id, scheduled_date, scheduled_time, submitted_at, approved_at")
    .in("status", ["submitted", "approved"])
    .gte("scheduled_date", range.from.split("T")[0])
    .lt("scheduled_date", range.to.split("T")[0]);

  // Previous period
  const { data: prev } = await supabase
    .from("tickets")
    .select("id, scheduled_date, scheduled_time, submitted_at, approved_at")
    .in("status", ["submitted", "approved"])
    .gte("scheduled_date", range.prevFrom.split("T")[0])
    .lt("scheduled_date", range.prevTo.split("T")[0]);

  // Longest pending — submitted but not approved ✅
  const { data: pending } = await supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, submitted_at,
      technician:technicians!technician_id(name),
      project_ticket:project_tickets!project_ticket_id(project_number)
    `,
    )
    .eq("status", "submitted")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: true })
    .limit(5);

  const now = Date.now();
  const longestPending: PendingTicket[] = (pending ?? []).map((t) => ({
    id: t.id,
    ticket_number: t.ticket_number,
    submitted_at: t.submitted_at,
    days_waiting: Math.floor(
      (now - new Date(t.submitted_at).getTime()) / 86_400_000,
    ),
    project_number: (t.project_ticket as any)?.project_number ?? "—",
    technician_name: (t.technician as any)?.name ?? "—",
  }));

  // Add scheduled datetime for submit calculation
  const withScheduled = (rows: any[]) =>
    rows.map((t) => ({
      ...t,
      scheduled_datetime: `${t.scheduled_date}T${t.scheduled_time ?? "00:00:00"}`,
    }));

  const cur = withScheduled(current ?? []);
  const prv = withScheduled(prev ?? []);

  return {
    avg_submit_days: avgDays(cur, "scheduled_datetime", "submitted_at"),
    avg_approve_days: avgDays(
      cur.filter((t) => t.approved_at),
      "submitted_at",
      "approved_at",
    ),
    prev_avg_submit_days: avgDays(prv, "scheduled_datetime", "submitted_at"),
    prev_avg_approve_days: avgDays(
      prv.filter((t) => t.approved_at),
      "submitted_at",
      "approved_at",
    ),
    longest_pending: longestPending,
  };
}

// ── People metrics ────────────────────────────────────────────────────────────

export async function getPeopleMetrics(
  range: DateRange,
): Promise<TechnicianMetric[]> {
  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      `
      id, is_flagged, technician_id,
      technician:technicians!technician_id(name),
      ticket_ac_units(suhu_passed, arus_passed)
    `,
    )
    .eq("status", "approved")
    .gte("approved_at", range.from)
    .lt("approved_at", range.to);

  if (!tickets?.length) return [];

  // Group by technician
  const map = new Map<
    string,
    {
      name: string;
      tickets: any[];
    }
  >();

  for (const t of tickets) {
    const id = t.technician_id;
    if (!id) continue;
    if (!map.has(id))
      map.set(id, { name: (t.technician as any)?.name ?? "—", tickets: [] });
    map.get(id)!.tickets.push(t);
  }

  const result: TechnicianMetric[] = [...map.entries()].map(
    ([id, { name, tickets: tix }]) => {
      const total = tix.length;
      const flagged = tix.filter((t) => t.is_flagged).length;
      const allUnits = tix.flatMap((t: any) => t.ticket_ac_units ?? []);
      const suhuTotal = allUnits.filter(
        (u: any) => u.suhu_passed !== null,
      ).length;
      const arusTotal = allUnits.filter(
        (u: any) => u.arus_passed !== null,
      ).length;

      return {
        technician_id: id,
        name,
        tickets_approved: total,
        temuan_rate: total > 0 ? (flagged / total) * 100 : 0,
        suhu_pass_rate:
          suhuTotal > 0
            ? (allUnits.filter((u: any) => u.suhu_passed).length / suhuTotal) *
              100
            : 0,
        arus_pass_rate:
          arusTotal > 0
            ? (allUnits.filter((u: any) => u.arus_passed).length / arusTotal) *
              100
            : 0,
      };
    },
  );

  return result
    .sort((a, b) => b.tickets_approved - a.tickets_approved)
    .slice(0, 10);
}

// ── Volume chart data ─────────────────────────────────────────────────────────

export async function getVolumeChart(
  range: DateRange,
): Promise<ChartDataPoint[]> {
  const { data: tickets } = await supabase
    .from("tickets")
    .select("type, approved_at")
    .eq("status", "approved")
    .gte("approved_at", range.from)
    .lt("approved_at", range.to);

  if (!tickets?.length) return [];

  // Bucket by granularity ✅
  function getBucket(iso: string): string {
    const d = new Date(iso);
    if (range.granularity === "hour") {
      return `${String(d.getHours()).padStart(2, "0")}:00`;
    }
    if (range.granularity === "day") {
      return d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
    // week — return Monday of that week
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const monday = new Date(d.getTime() - dow * 86_400_000);
    return monday.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  }

  const buckets = new Map<string, ChartDataPoint>();
  for (const t of tickets) {
    const label = getBucket(t.approved_at);
    if (!buckets.has(label)) {
      buckets.set(label, { label, cleaning: 0, service: 0, installation: 0 });
    }
    const b = buckets.get(label)!;
    if (t.type === "cleaning") b.cleaning++;
    if (t.type === "service") b.service++;
    if (t.type === "installation") b.installation++;
  }

  return [...buckets.values()];
}

// ── CSV export ────────────────────────────────────────────────────────────────

export function buildLaporanCSV(
  range: DateRange,
  volume: VolumeMetrics,
  quality: QualityMetrics,
  speed: SpeedMetrics,
  people: TechnicianMetric[],
): string {
  const rows: string[] = [`JobReport — Analitik Bisnis — ${range.label}`, ""];

  // Volume
  rows.push("=== VOLUME ===");
  rows.push(`Total disetujui,${volume.total_approved}`);
  rows.push(`Cuci AC,${volume.by_type.cleaning}`);
  rows.push(`Servis,${volume.by_type.service}`);
  rows.push(`Pasang,${volume.by_type.installation}`);
  rows.push(`Menunggu persetujuan,${volume.awaiting_approval}`);
  rows.push(`Overdue,${volume.overdue}`);
  rows.push("");

  // Quality
  rows.push("=== KUALITAS ===");
  rows.push(`Suhu pass rate,${quality.suhu_pass_rate.toFixed(1)}%`);
  rows.push(`Arus pass rate,${quality.arus_pass_rate.toFixed(1)}%`);
  rows.push(`Temuan rate,${quality.temuan_rate.toFixed(1)}%`);
  rows.push(`Penggantian unit,${quality.replacement_rate.toFixed(1)}%`);
  rows.push("");

  // Speed
  rows.push("=== KECEPATAN ===");
  rows.push(
    `Rata-rata jadwal→terkirim,${speed.avg_submit_days?.toFixed(1) ?? "—"} hari`,
  );
  rows.push(
    `Rata-rata terkirim→disetujui,${speed.avg_approve_days?.toFixed(1) ?? "—"} hari`,
  );
  rows.push("");

  // People
  rows.push("=== TEKNISI (top 10) ===");
  rows.push("Nama,Tiket Disetujui,Temuan%,Suhu Pass%,Arus Pass%");
  for (const t of people) {
    rows.push(
      [
        t.name,
        t.tickets_approved,
        t.temuan_rate.toFixed(1) + "%",
        t.suhu_pass_rate.toFixed(1) + "%",
        t.arus_pass_rate.toFixed(1) + "%",
      ].join(","),
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
