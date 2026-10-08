import { PageLayout } from "@/components/shared/PageLayout";
import {
    useDateRange,
    usePeopleMetrics,
    useQualityMetrics,
    useSpeedMetrics,
    useVolumeChart,
    useVolumeMetrics,
} from "@/hooks/useLaporan";
import {
    buildLaporanCSV,
    downloadCSV,
    type PendingTicket,
    type TechnicianMetric,
    type TimeFilter,
} from "@/repositories/laporanRepository";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(val: number) {
  return `${val.toFixed(1)}%`;
}
function days(val: number | null) {
  return val !== null ? `${val.toFixed(1)} hr` : "—";
}
function trend(
  curr: number | null,
  prev: number | null,
): "better" | "worse" | "same" | null {
  if (curr === null || prev === null) return null;
  if (curr < prev) return "better";
  if (curr > prev) return "worse";
  return "same";
}
function trendArrow(t: "better" | "worse" | "same" | null) {
  if (t === "better")
    return <span className="text-green-600 font-bold ml-1">↓</span>;
  if (t === "worse")
    return <span className="text-red-600 font-bold ml-1">↑</span>;
  return null;
}
function qualityColor(rate: number) {
  if (rate >= 80) return "text-green-600";
  if (rate >= 60) return "text-amber-600";
  return "text-red-600";
}
function qualityBg(rate: number) {
  if (rate >= 80) return "bg-green-50 border-green-200";
  if (rate >= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function QualityCard({
  label,
  rate,
  total,
}: {
  label: string;
  rate: number;
  total: number;
}) {
  return (
    <div className={`border rounded-xl p-5 ${qualityBg(rate)}`}>
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${qualityColor(rate)}`}>{pct(rate)}</p>
      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1.5">{total} unit diukur</p>
    </div>
  );
}

function SpeedCard({
  label,
  value,
  prevValue,
}: {
  label: string;
  value: number | null;
  prevValue: number | null;
}) {
  const t = trend(value, prevValue);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold text-slate-800">{days(value)}</p>
        {trendArrow(t)}
      </div>
      {prevValue !== null && (
        <p className="text-xs text-slate-400 mt-1">
          Periode lalu: {days(prevValue)}
        </p>
      )}
    </div>
  );
}

function PendingRow({
  ticket,
  index,
}: {
  ticket: PendingTicket;
  index: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 w-5">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono font-medium text-blue-600">
          {ticket.ticket_number}
        </p>
        <p className="text-xs text-slate-400 truncate">
          {ticket.project_number} · {ticket.technician_name}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-amber-600">
          {ticket.days_waiting} hr
        </p>
        <p className="text-xs text-slate-400">menunggu</p>
      </div>
    </div>
  );
}

function TechRow({ tech, index }: { tech: TechnicianMetric; index: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span
        className={`text-xs font-bold w-5 ${index === 0 ? "text-amber-500" : "text-slate-400"}`}
      >
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {tech.name}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs text-right flex-shrink-0">
        <div>
          <p className="font-semibold text-slate-800">
            {tech.tickets_approved}
          </p>
          <p className="text-slate-400">tiket</p>
        </div>
        <div>
          <p
            className={`font-semibold ${tech.temuan_rate > 20 ? "text-red-600" : "text-green-600"}`}
          >
            {pct(tech.temuan_rate)}
          </p>
          <p className="text-slate-400">temuan</p>
        </div>
        <div>
          <p className={`font-semibold ${qualityColor(tech.suhu_pass_rate)}`}>
            {pct(tech.suhu_pass_rate)}
          </p>
          <p className="text-slate-400">suhu</p>
        </div>
        <div>
          <p className={`font-semibold ${qualityColor(tech.arus_pass_rate)}`}>
            {pct(tech.arus_pass_rate)}
          </p>
          <p className="text-slate-400">arus</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function LaporanScreen() {
  const [filter, setFilter] = useState<TimeFilter>("bulan_ini");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [showPicker, setShowPicker] = useState(false);

  const range = useDateRange(filter, customFrom, customTo);
  const volume = useVolumeMetrics(range);
  const quality = useQualityMetrics(range);
  const speed = useSpeedMetrics(range);
  const people = usePeopleMetrics(range);
  const chart = useVolumeChart(range);

  function handleDownload() {
    if (!volume.data || !quality.data || !speed.data || !people.data) return;
    const csv = buildLaporanCSV(
      range,
      volume.data,
      quality.data,
      speed.data,
      people.data,
    );
    downloadCSV(
      csv,
      `laporan-${range.label}-${new Date().toISOString().split("T")[0]}.csv`,
    );
  }

  const tabs: { key: TimeFilter; label: string }[] = [
    { key: "hari_ini", label: "Hari ini" },
    { key: "minggu_ini", label: "Minggu ini" },
    { key: "bulan_ini", label: "Bulan ini" },
    { key: "custom", label: "Kustom" },
  ];

  return (
    <PageLayout
      title="Analitik Bisnis"
      subtitle={range.label}
      action={
        <button
          onClick={handleDownload}
          disabled={!volume.data || !quality.data}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          <i
            className="ti ti-download"
            style={{ fontSize: 14 }}
            aria-hidden="true"
          />
          Download CSV
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* ── Time filter tabs ── */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key);
                  setShowPicker(tab.key === "custom");
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom date picker popover */}
          {filter === "custom" && showPicker && (
            <div className="relative">
              <div className="absolute top-2 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4">
                <DayPicker
                  mode="range"
                  selected={{
                    from: customFrom ? new Date(customFrom) : undefined,
                    to: customTo ? new Date(customTo) : undefined,
                  }}
                  onSelect={(r) => {
                    if (r?.from)
                      setCustomFrom(r.from.toISOString().split("T")[0]);
                    if (r?.to) {
                      setCustomTo(r.to.toISOString().split("T")[0]);
                      setShowPicker(false);
                    }
                  }}
                />
              </div>
            </div>
          )}
          {filter === "custom" && customFrom && customTo && (
            <span className="text-sm text-slate-500">
              {customFrom} → {customTo}
            </span>
          )}
        </div>

        {/* ── Section 1: Volume ── */}
        <div>
          <SectionLabel>Volume</SectionLabel>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <StatCard
              label="Total disetujui"
              value={volume.data?.total_approved ?? "…"}
              sub="tiket dalam periode ini"
            />
            <StatCard
              label="Cuci AC"
              value={volume.data?.by_type.cleaning ?? "…"}
            />
            <StatCard
              label="Menunggu persetujuan"
              value={volume.data?.awaiting_approval ?? "…"}
              sub="tiket terkirim"
            />
            <StatCard
              label="Overdue"
              value={volume.data?.overdue ?? "…"}
              sub="belum terkirim, jadwal terlewat"
            />
          </div>

          {/* Bar chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500 mb-4">
              Tiket disetujui per{" "}
              {range.granularity === "hour"
                ? "jam"
                : range.granularity === "day"
                  ? "hari"
                  : "minggu"}
            </p>
            {!chart.data?.length ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Tidak ada data untuk periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chart.data}
                  margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="cleaning"
                    name="Cuci AC"
                    stackId="a"
                    fill="#38BDF8"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="service"
                    name="Servis"
                    stackId="a"
                    fill="#818CF8"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="installation"
                    name="Pasang"
                    stackId="a"
                    fill="#FB923C"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Section 2: Quality ── */}
        <div>
          <SectionLabel>Kualitas</SectionLabel>
          <div className="grid grid-cols-4 gap-4">
            <QualityCard
              label="Suhu pass rate"
              rate={quality.data?.suhu_pass_rate ?? 0}
              total={quality.data?.suhu_total ?? 0}
            />
            <QualityCard
              label="Arus pass rate"
              rate={quality.data?.arus_pass_rate ?? 0}
              total={quality.data?.arus_total ?? 0}
            />
            <QualityCard
              label="Temuan rate"
              rate={quality.data?.temuan_rate ?? 0}
              total={quality.data?.temuan_total ?? 0}
            />
            <QualityCard
              label="Penggantian unit"
              rate={quality.data?.replacement_rate ?? 0}
              total={quality.data?.replacement_total ?? 0}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Hijau ≥ 80% · Kuning 60–79% · Merah &lt; 60%
          </p>
        </div>

        {/* ── Section 3: Speed ── */}
        <div>
          <SectionLabel>Kecepatan</SectionLabel>
          <div className="grid grid-cols-3 gap-4">
            <SpeedCard
              label="Rata-rata: jadwal → terkirim"
              value={speed.data?.avg_submit_days ?? null}
              prevValue={speed.data?.prev_avg_submit_days ?? null}
            />
            <SpeedCard
              label="Rata-rata: terkirim → disetujui"
              value={speed.data?.avg_approve_days ?? null}
              prevValue={speed.data?.prev_avg_approve_days ?? null}
            />

            {/* Longest pending */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 mb-3">
                Terlama menunggu persetujuan
              </p>
              {!speed.data?.longest_pending?.length ? (
                <p className="text-xs text-slate-400 italic">
                  Tidak ada tiket menunggu ✅
                </p>
              ) : (
                <div>
                  {speed.data.longest_pending.map((t, i) => (
                    <PendingRow key={t.id} ticket={t} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            ↓ lebih cepat dari periode lalu · ↑ lebih lambat
          </p>
        </div>

        {/* ── Section 4: People ── */}
        <div>
          <SectionLabel>Teknisi (top 10 aktif)</SectionLabel>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-400 w-5">#</span>
              <span className="flex-1 text-xs font-semibold text-slate-500">
                Nama
              </span>
              <div className="flex items-center gap-4 text-xs text-slate-500 text-right flex-shrink-0">
                <span className="w-10">Tiket</span>
                <span className="w-14">Temuan</span>
                <span className="w-14">Suhu</span>
                <span className="w-14">Arus</span>
              </div>
            </div>

            <div className="px-5">
              {!people.data?.length ? (
                <p className="text-sm text-slate-400 text-center py-8 italic">
                  Tidak ada data teknisi untuk periode ini
                </p>
              ) : (
                people.data.map((tech, i) => (
                  <TechRow key={tech.technician_id} tech={tech} index={i} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
