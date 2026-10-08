import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/shared/PageLayout";
import { useAuthStore } from "@/stores/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DateRange {
  from: string;
  to: string;
}

interface VolumeStats {
  total: number;
  cleaning: number;
  service: number;
  installation: number;
  pending: number;
  overdue: number;
}

interface QualityStats {
  suhuPassRate: number;
  arusPassRate: number;
  temuanRate: number;
  replacementRate: number;
}

interface SpeedStats {
  avgDaysToSubmit: number;
  avgDaysToApprove: number;
}

interface TechnicianStat {
  id: string;
  name: string;
  ticketsThisPeriod: number;
  ticketsLastPeriod: number;
  passRateThisPeriod: number;
  passRateLastPeriod: number;
  lastActiveDate: string | null;
  totalAllTime: number;
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
function nMonthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d.toISOString().split("T")[0];
}
function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// ── Fetch functions ───────────────────────────────────────────────────────────

async function fetchVolume(range: DateRange): Promise<VolumeStats> {
  const { data } = await supabase
    .from("tickets")
    .select("type, status, scheduled_date")
    .gte("scheduled_date", range.from)
    .lte("scheduled_date", range.to)
    .in("status", ["submitted", "approved", "in_progress", "assigned"]);
  const tickets = data ?? [];
  const done = tickets.filter((t) =>
    ["submitted", "approved"].includes(t.status),
  );
  return {
    total: done.length,
    cleaning: done.filter((t) => t.type === "cleaning").length,
    service: done.filter((t) => t.type === "service").length,
    installation: done.filter((t) => t.type === "installation").length,
    pending: tickets.filter((t) => t.status === "submitted").length,
    overdue: tickets.filter(
      (t) =>
        ["assigned", "in_progress"].includes(t.status) &&
        t.scheduled_date < today(),
    ).length,
  };
}

async function fetchQuality(range: DateRange): Promise<QualityStats> {
  const { data: steps } = await supabase
    .from("ticket_steps")
    .select("description, input_value, is_completed, ticket_id")
    .in("description", ["Suhu Akhir", "Ampere Awal", "Ampere Akhir"])
    .eq("is_completed", true);

  const { data: allSteps } = await supabase
    .from("ticket_steps")
    .select("ticket_id")
    .gte("created_at", range.from)
    .lte("created_at", range.to);

  const { data: flags } = await supabase
    .from("ticket_flags")
    .select("ticket_id, flag_type")
    .gte("created_at", range.from)
    .lte("created_at", range.to);

  const s = steps ?? [];
  const suhuAkhir = s.filter((x) => x.description === "Suhu Akhir");
  const suhuPass = suhuAkhir.filter(
    (x) => parseFloat(x.input_value ?? "99") < 12,
  );

  const ticketIds = [...new Set((allSteps ?? []).map((x) => x.ticket_id))];
  const flagTickets = (flags ?? []).filter(
    (f) => f.flag_type === "unit_replacement",
  );
  const temuanTickets = flags ?? [];

  const arusGroups: Record<string, { awal?: number; akhir?: number }> = {};
  s.filter((x) => x.description === "Ampere Awal").forEach((x) => {
    arusGroups[x.ticket_id] = {
      ...arusGroups[x.ticket_id],
      awal: parseFloat(x.input_value ?? "0"),
    };
  });
  s.filter((x) => x.description === "Ampere Akhir").forEach((x) => {
    arusGroups[x.ticket_id] = {
      ...arusGroups[x.ticket_id],
      akhir: parseFloat(x.input_value ?? "0"),
    };
  });
  const arusEntries = Object.values(arusGroups).filter(
    (g) => g.awal && g.akhir,
  );
  const arusPass = arusEntries.filter(
    (g) => ((g.awal! - g.akhir!) / g.awal!) * 100 >= 3,
  );

  return {
    suhuPassRate: suhuAkhir.length
      ? Math.round((suhuPass.length / suhuAkhir.length) * 100)
      : 0,
    arusPassRate: arusEntries.length
      ? Math.round((arusPass.length / arusEntries.length) * 100)
      : 0,
    temuanRate: ticketIds.length
      ? Math.round((temuanTickets.length / ticketIds.length) * 100)
      : 0,
    replacementRate: ticketIds.length
      ? Math.round((flagTickets.length / ticketIds.length) * 100)
      : 0,
  };
}

async function fetchSpeed(range: DateRange): Promise<SpeedStats> {
  const { data } = await supabase
    .from("tickets")
    .select("scheduled_date, submitted_at, approved_at")
    .in("status", ["submitted", "approved"])
    .gte("scheduled_date", range.from)
    .lte("scheduled_date", range.to);
  const tickets = data ?? [];
  const submitDays = tickets
    .filter((t) => t.submitted_at)
    .map((t) => daysBetween(t.scheduled_date, t.submitted_at!));
  const approveDays = tickets
    .filter((t) => t.submitted_at && t.approved_at)
    .map((t) => daysBetween(t.submitted_at!, t.approved_at!));
  const avg = (arr: number[]) =>
    arr.length
      ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1))
      : 0;
  return {
    avgDaysToSubmit: avg(submitDays),
    avgDaysToApprove: avg(approveDays),
  };
}

async function fetchTechnicianStats(
  range: DateRange,
): Promise<TechnicianStat[]> {
  const lastFrom = (() => {
    const diff = daysBetween(range.from, range.to);
    const d = new Date(range.from);
    d.setDate(d.getDate() - diff - 1);
    return d.toISOString().split("T")[0];
  })();

  const { data: technicians } = await supabase
    .from("technicians")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("technician_id, status, scheduled_date, submitted_at")
    .in("status", ["submitted", "approved"]);

  const { data: steps } = await supabase
    .from("ticket_steps")
    .select("ticket_id, description, input_value")
    .in("description", ["Suhu Akhir", "Ampere Awal", "Ampere Akhir"])
    .eq("is_completed", true);

  const techs = technicians ?? [];
  const tix = tickets ?? [];
  const stps = steps ?? [];

  return techs.map((tech) => {
    const techTix = tix.filter((t) => t.technician_id === tech.id);
    const thisPeriod = techTix.filter(
      (t) => t.scheduled_date >= range.from && t.scheduled_date <= range.to,
    );
    const lastPeriod = techTix.filter(
      (t) => t.scheduled_date >= lastFrom && t.scheduled_date < range.from,
    );
    const allSubmitted = techTix.filter((t) => t.submitted_at);
    const lastActive = allSubmitted.length
      ? allSubmitted.sort((a, b) =>
          b.submitted_at!.localeCompare(a.submitted_at!),
        )[0].submitted_at
      : null;

    const thisTixIds = new Set(thisPeriod.map((t: any) => t.id));
    const suhuThis = stps.filter(
      (s) => thisTixIds.has(s.ticket_id) && s.description === "Suhu Akhir",
    );
    const passThis = suhuThis.filter(
      (s) => parseFloat(s.input_value ?? "99") < 12,
    );

    const lastTixIds = new Set(lastPeriod.map((t: any) => t.id));
    const suhuLast = stps.filter(
      (s) => lastTixIds.has(s.ticket_id) && s.description === "Suhu Akhir",
    );
    const passLast = suhuLast.filter(
      (s) => parseFloat(s.input_value ?? "99") < 12,
    );

    return {
      id: tech.id,
      name: tech.name,
      ticketsThisPeriod: thisPeriod.length,
      ticketsLastPeriod: lastPeriod.length,
      passRateThisPeriod: suhuThis.length
        ? Math.round((passThis.length / suhuThis.length) * 100)
        : 0,
      passRateLastPeriod: suhuLast.length
        ? Math.round((passLast.length / suhuLast.length) * 100)
        : 0,
      lastActiveDate: lastActive ? lastActive.split("T")[0] : null,
      totalAllTime: techTix.length,
    };
  });
}

// ── Trend helpers ─────────────────────────────────────────────────────────────

function trend(
  current: number,
  previous: number,
  threshold: number,
): "up" | "down" | "neutral" {
  if (!previous) return "neutral";
  const diff = ((current - previous) / previous) * 100;
  if (diff >= threshold) return "up";
  if (diff <= -threshold) return "down";
  return "neutral";
}

function trendIcon(
  t: "up" | "down" | "neutral",
  goodDir: "up" | "down" = "up",
) {
  if (t === "neutral") return "→";
  if (t === "up") return goodDir === "up" ? "↑" : "↑";
  return "↓";
}

function trendColor(
  t: "up" | "down" | "neutral",
  goodDir: "up" | "down" = "up",
) {
  if (t === "neutral") return "text-slate-400";
  if ((t === "up" && goodDir === "up") || (t === "down" && goodDir === "down"))
    return "text-green-600";
  return "text-red-600";
}

// ── Screen ────────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Bulan ini", from: monthStart(), to: today() },
  { label: "3 bulan terakhir", from: nMonthsAgo(3), to: today() },
  { label: "Tahun ini", from: yearStart(), to: today() },
];

export function AnalyticsScreen() {
  const { hasPermission } = useAuthStore();
  if (!hasPermission("view_reports")) return <Navigate to="/dashboard" />;

  const [preset, setPreset] = useState(0);
  const [custom, setCustom] = useState(false);
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());

  const range: DateRange = custom
    ? { from: fromDate, to: toDate }
    : PRESETS[preset];

  const { data: volume, isLoading: lv } = useQuery({
    queryKey: ["analytics-volume", range],
    queryFn: () => fetchVolume(range),
    staleTime: 10 * 60 * 1000,
  });
  const { data: quality, isLoading: lq } = useQuery({
    queryKey: ["analytics-quality", range],
    queryFn: () => fetchQuality(range),
    staleTime: 10 * 60 * 1000,
  });
  const { data: speed, isLoading: ls } = useQuery({
    queryKey: ["analytics-speed", range],
    queryFn: () => fetchSpeed(range),
    staleTime: 10 * 60 * 1000,
  });
  const { data: techs = [] } = useQuery({
    queryKey: ["analytics-techs", range],
    queryFn: () => fetchTechnicianStats(range),
    staleTime: 10 * 60 * 1000,
  });

  const loading = lv || lq || ls;
  const active = techs.filter((t) => t.ticketsThisPeriod > 0);
  const inactive = techs.filter((t) => t.ticketsThisPeriod === 0);

  return (
    <PageLayout title="Analitik" subtitle="Performa bisnis MILBA">
      {/* Date range selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => {
              setPreset(i);
              setCustom(false);
            }}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
              !custom && preset === i
                ? "bg-blue-50 text-blue-700 border-blue-300 font-medium"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustom(true)}
          className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
            custom
              ? "bg-blue-50 text-blue-700 border-blue-300 font-medium"
              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Custom
        </button>
        {custom && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">
          Menghitung data...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Volume ── */}
          <Section label="Volume pekerjaan">
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {[
                {
                  label: "Total selesai",
                  value: volume?.total ?? 0,
                  color: "text-slate-800",
                },
                {
                  label: "Cuci",
                  value: volume?.cleaning ?? 0,
                  color: "text-blue-600",
                },
                {
                  label: "Servis",
                  value: volume?.service ?? 0,
                  color: "text-purple-600",
                },
                {
                  label: "Pasang",
                  value: volume?.installation ?? 0,
                  color: "text-green-600",
                },
                {
                  label: "Menunggu",
                  value: volume?.pending ?? 0,
                  color: "text-amber-600",
                },
                {
                  label: "Terlambat",
                  value: volume?.overdue ?? 0,
                  color: "text-red-600",
                },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-medium">
                    {s.label}
                  </p>
                  <p className={`text-2xl font-semibold mt-1 ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Quality ── */}
          <Section label="Kualitas pengerjaan">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                {
                  label: "Suhu pass rate",
                  value: quality?.suhuPassRate ?? 0,
                  good: true,
                },
                {
                  label: "Arus pass rate",
                  value: quality?.arusPassRate ?? 0,
                  good: true,
                },
                {
                  label: "Tiket ada temuan",
                  value: quality?.temuanRate ?? 0,
                  good: false,
                },
                {
                  label: "Pergantian unit",
                  value: quality?.replacementRate ?? 0,
                  good: false,
                },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-medium">
                    {s.label}
                  </p>
                  <p
                    className={`text-2xl font-semibold mt-1 ${
                      s.good
                        ? s.value >= 80
                          ? "text-green-600"
                          : s.value >= 60
                            ? "text-amber-600"
                            : "text-red-600"
                        : s.value <= 10
                          ? "text-green-600"
                          : s.value <= 25
                            ? "text-amber-600"
                            : "text-red-600"
                    }`}
                  >
                    {s.value}%
                  </p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Speed ── */}
          <Section label="Kecepatan penyelesaian">
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Rata-rata hari teknisi selesai",
                  value: speed?.avgDaysToSubmit ?? 0,
                  unit: "hari",
                },
                {
                  label: "Rata-rata hari admin setujui",
                  value: speed?.avgDaysToApprove ?? 0,
                  unit: "hari",
                },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-medium">
                    {s.label}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <p className="text-2xl font-semibold text-slate-800">
                      {s.value}
                    </p>
                    <p className="text-sm text-slate-400">{s.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── People — Active ── */}
          <Section label="Performa teknisi aktif">
            {active.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                Tidak ada teknisi aktif pada periode ini.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {active.map((t) => {
                  const volTrend = trend(
                    t.ticketsThisPeriod,
                    t.ticketsLastPeriod,
                    20,
                  );
                  const qualTrend = trend(
                    t.passRateThisPeriod,
                    t.passRateLastPeriod,
                    5,
                  );
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between py-3"
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {t.name}
                      </p>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <p className="text-xs text-slate-400">Tiket</p>
                          <p
                            className={`text-sm font-semibold ${trendColor(volTrend)}`}
                          >
                            {t.ticketsThisPeriod}{" "}
                            <span className="text-xs">
                              {trendIcon(volTrend)}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Pass rate</p>
                          <p
                            className={`text-sm font-semibold ${trendColor(qualTrend)}`}
                          >
                            {t.passRateThisPeriod}%{" "}
                            <span className="text-xs">
                              {trendIcon(qualTrend)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── People — Inactive ── */}
          {inactive.length > 0 && (
            <Section label="Teknisi tidak aktif pada periode ini">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 mb-4">
                Teknisi berikut tidak memiliki tiket pada periode yang dipilih.
              </div>
              <div className="divide-y divide-slate-100">
                {inactive.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-3"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {t.name}
                    </p>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-xs text-slate-400">Terakhir aktif</p>
                        <p className="text-sm text-slate-600">
                          {t.lastActiveDate
                            ? new Date(t.lastActiveDate).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "Belum pernah"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">
                          Total semua waktu
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {t.totalAllTime} tiket
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </PageLayout>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
