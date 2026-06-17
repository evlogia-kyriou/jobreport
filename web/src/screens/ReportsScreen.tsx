import { PageLayout } from "@/components/shared/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TicketReport {
  id: string;
  ticket_number: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  is_flagged: boolean;
  flag_type: string | null;
  arrival_at: string | null;
  departure_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  technician: { name: string; technician_id: string } | null;
  location: { name: string } | null;
  customer: { name: string } | null;
  project_ticket: { project_number: string } | null;
  ac_units: { ac_unit_id: string }[];
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchTicketReports(
  from: string,
  to: string,
): Promise<TicketReport[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
            id, ticket_number, scheduled_date, scheduled_time,
            status, is_flagged, flag_type,
            arrival_at, departure_at, submitted_at, approved_at,
            technician:technicians!technician_id(name, technician_id),
            location:locations!location_id(name),
            customer:customers!customer_id(name),
            project_ticket:project_tickets!project_ticket_id(project_number),
            ac_units:ticket_ac_units(ac_unit_id)
        `,
    )
    .in("status", ["submitted", "approved"])
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as TicketReport[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateRange(period: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (period) {
    case "today": {
      return { from: today, to: today };
    }
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: start.toISOString().split("T")[0], to: today };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString().split("T")[0], to: today };
    }
    default:
      return { from: today, to: today };
  }
}

function calcDurationMinutes(
  arrivalAt?: string | null,
  departureAt?: string | null,
): number | null {
  if (!arrivalAt || !departureAt) return null;
  const diff = new Date(departureAt).getTime() - new Date(arrivalAt).getTime();
  return Math.round(diff / 60000);
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ReportsScreen() {
  const [period, setPeriod] = useState("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const range =
    fromDate && toDate ? { from: fromDate, to: toDate } : getDateRange(period);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["reports", range.from, range.to],
    queryFn: () => fetchTicketReports(range.from, range.to),
  });

  // Summary stats
  const totalTickets = tickets?.length ?? 0;
  const approvedCount =
    tickets?.filter((t) => t.status === "approved").length ?? 0;
  const flaggedCount = tickets?.filter((t) => t.is_flagged).length ?? 0;
  const totalAcUnits =
    tickets?.reduce((sum, t) => sum + (t.ac_units?.length ?? 0), 0) ?? 0;

  return (
    <PageLayout title="Laporan" subtitle="Ringkasan tiket kerja selesai">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {[
          { value: "today", label: "Hari ini" },
          { value: "week", label: "Minggu ini" },
          { value: "month", label: "Bulan ini" },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => {
              setPeriod(p.value);
              setFromDate("");
              setToDate("");
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium
                                      transition-colors ${
                                        period === p.value && !fromDate
                                          ? "bg-blue-600 text-white"
                                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                      }`}
          >
            {p.label}
          </button>
        ))}

        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400 text-sm">s/d</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Tiket"
          value={totalTickets.toString()}
          icon="🎫"
        />
        <SummaryCard
          label="Disetujui"
          value={approvedCount.toString()}
          icon="✅"
        />
        <SummaryCard
          label="Total Unit AC"
          value={totalAcUnits.toString()}
          icon="❄️"
        />
        <SummaryCard
          label="Bermasalah"
          value={flaggedCount.toString()}
          icon="🚩"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div
          className="flex items-center justify-between
                                px-5 py-4 border-b border-slate-200"
        >
          <h2 className="font-semibold text-slate-800">Detail Tiket Kerja</h2>
          <button
            onClick={() => exportToCSV(tickets ?? [], range)}
            disabled={!tickets?.length}
            className="px-4 py-1.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50  disabled:opacity-40 transition-colors"
          >
            ↓ Export CSV
          </button>
        </div>

        {/* Table header */}
        <div
          className="grid grid-cols-12 gap-4 px-5 py-3
                                border-b border-slate-200 bg-slate-50"
        >
          <div
            className="col-span-2 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            No. Tiket
          </div>
          <div
            className="col-span-2 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Tanggal
          </div>
          <div
            className="col-span-3 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Lokasi
          </div>
          <div
            className="col-span-2 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Teknisi
          </div>
          <div
            className="col-span-1 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            AC
          </div>
          <div
            className="col-span-1 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Durasi
          </div>
          <div
            className="col-span-1 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Status
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && tickets?.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">
              Tidak ada tiket pada periode ini
            </p>
          </div>
        )}

        {/* Rows */}
        {!isLoading &&
          tickets?.map((ticket) => {
            const durationMins = calcDurationMinutes(
              ticket.arrival_at,
              ticket.departure_at,
            );
            return (
              <div
                key={ticket.id}
                className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors"
              >
                <div className="col-span-2">
                  <p className="text-xs font-mono text-slate-700 truncate">
                    {ticket.ticket_number}
                  </p>
                  {ticket.is_flagged && (
                    <span className="text-xs text-red-500">
                      🚩 {ticket.flag_type}
                    </span>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">
                    {ticket.scheduled_date}
                  </p>
                  <p className="text-xs text-slate-400">
                    {ticket.scheduled_time?.substring(0, 5)}
                  </p>
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-slate-700 truncate">
                    {ticket.location?.name ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {ticket.customer?.name}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600 truncate">
                    {ticket.technician?.name ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {ticket.technician?.technician_id}
                  </p>
                </div>
                <div className="col-span-1">
                  <p className="text-sm text-slate-600">
                    {ticket.ac_units?.length ?? 0}
                  </p>
                </div>
                <div className="col-span-1">
                  <p className="text-sm text-slate-500">
                    {formatDuration(durationMins)}
                  </p>
                </div>
                <div className="col-span-1">
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
            );
          })}
      </div>
    </PageLayout>
  );
}

// ── Sub components ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportToCSV(
  tickets: TicketReport[],
  range: { from: string; to: string },
) {
  const headers = [
    "No. Tiket",
    "No. Proyek",
    "Tanggal",
    "Waktu",
    "Pelanggan",
    "Lokasi",
    "Teknisi",
    "ID Teknisi",
    "Total AC",
    "Status",
    "Flag",
    "Tiba",
    "Berangkat",
    "Durasi (menit)",
    "Dikirim",
    "Disetujui",
  ];

  const rows = tickets.map((t) => {
    const durationMins = calcDurationMinutes(t.arrival_at, t.departure_at);
    return [
      t.ticket_number,
      t.project_ticket?.project_number ?? "",
      t.scheduled_date,
      t.scheduled_time?.substring(0, 5) ?? "",
      t.customer?.name ?? "",
      t.location?.name ?? "",
      t.technician?.name ?? "",
      t.technician?.technician_id ?? "",
      t.ac_units?.length.toString() ?? "0",
      t.status,
      t.is_flagged ? (t.flag_type ?? "flagged") : "",
      t.arrival_at ? t.arrival_at.substring(0, 16).replace("T", " ") : "",
      t.departure_at ? t.departure_at.substring(0, 16).replace("T", " ") : "",
      durationMins?.toString() ?? "",
      t.submitted_at ? t.submitted_at.substring(0, 16).replace("T", " ") : "",
      t.approved_at ? t.approved_at.substring(0, 16).replace("T", " ") : "",
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `laporan_tiket_${range.from}_${range.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
