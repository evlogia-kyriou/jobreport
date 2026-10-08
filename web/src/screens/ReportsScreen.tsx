import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/shared/PageLayout";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportTicket {
  id: string;
  ticket_number: string;
  type: string;
  status: string;
  scheduled_date: string;
  submitted_at: string | null;
  approved_at: string | null;
  is_flagged: boolean;
  technician: { name: string } | null;
  location: { name: string } | null;
  customer: { name: string } | null;
  _ac_unit_count: number;
}

interface Technician {
  id: string;
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeLabel(t: string) {
  return (
    { cleaning: "Cuci", service: "Servis", installation: "Pasang" }[t] ?? t
  );
}

function statusLabel(s: string) {
  return { submitted: "Terkirim", approved: "Disetujui" }[s] ?? s;
}

function statusColor(s: string) {
  return s === "approved"
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchReportTickets(filters: {
  dateFrom: string;
  dateTo: string;
  technicianId: string;
  status: string;
  search: string;
}) {
  let q = supabase
    .from("tickets")
    .select(
      `
      id, ticket_number, type, status,
      scheduled_date, submitted_at, approved_at, is_flagged,
      technician:technicians!technician_id(name),
      location:locations!location_id(name),
      customer:customers!customer_id(name)
    `,
    )
    .in("status", ["submitted", "approved"])
    .gte("scheduled_date", filters.dateFrom)
    .lte("scheduled_date", filters.dateTo)
    .order("scheduled_date", { ascending: false });

  if (filters.technicianId) q = q.eq("technician_id", filters.technicianId);
  if (filters.status) q = q.eq("status", filters.status);

  const { data, error } = await q;
  if (error) throw error;

  let results = (data ?? []) as unknown as ReportTicket[];

  if (filters.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (t) =>
        t.ticket_number.toLowerCase().includes(s) ||
        (t.location?.name ?? "").toLowerCase().includes(s) ||
        (t.customer?.name ?? "").toLowerCase().includes(s),
    );
  }
  return results;
}

async function fetchTechnicians() {
  const { data } = await supabase
    .from("technicians")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return (data ?? []) as Technician[];
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0];
}
function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ReportsScreen() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [technicianId, setTechnicianId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const filters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      technicianId,
      status,
      search,
    }),
    [dateFrom, dateTo, technicianId, status, search],
  );

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["report-tickets", filters],
    queryFn: () => fetchReportTickets(filters),
    staleTime: 5 * 60 * 1000,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians-list"],
    queryFn: fetchTechnicians,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <PageLayout title="Laporan" subtitle="Daftar tiket yang telah dikerjakan">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {/* Date from */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">
              Dari tanggal
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Date to */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">
              Sampai tanggal
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {/* Technician */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">
              Teknisi
            </label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Semua teknisi</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {/* Status */}
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Semua status</option>
              <option value="submitted">Terkirim</option>
              <option value="approved">Disetujui</option>
            </select>
          </div>
        </div>
        {/* Search */}
        <div className="mt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tiket, lokasi, atau pelanggan..."
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total tiket", value: tickets.length },
          {
            label: "Disetujui",
            value: tickets.filter((t) => t.status === "approved").length,
          },
          {
            label: "Menunggu",
            value: tickets.filter((t) => t.status === "submitted").length,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            <p className="text-2xl font-semibold text-slate-800 mt-1">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Ticket list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Memuat...
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Tidak ada tiket untuk filter yang dipilih.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {[
                  "Tiket",
                  "Tipe",
                  "Lokasi",
                  "Teknisi",
                  "Tanggal",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">
                      {t.ticket_number}
                    </p>
                    {t.is_flagged && (
                      <span className="text-xs text-red-500">⚠ Temuan</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                      {typeLabel(t.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">
                      {t.location?.name ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t.customer?.name ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {t.technician?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {fmtDate(t.scheduled_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(t.status)}`}
                    >
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/tickets/${t.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Lihat →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageLayout>
  );
}
