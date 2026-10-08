import { EditTechnicianModal } from "@/components/shared/EditTechnicianModal";
import { PageLayout } from "@/components/shared/PageLayout";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  getKpiColorLevel,
  getKpiLabel,
  useTechnician,
  useTechnicianHistoryEntries,
  useTechnicianKpi,
  type TechnicianHistoryEntry,
} from "@/hooks/useTechnician";
import { technicianRepository } from "@/repositories/technicianRepository";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function skillLabel(s: string) {
  return { cleaning: "Cuci AC", service: "Servis", install: "Pasang" }[s] ?? s;
}
function skillClass(s: string) {
  return s === "cleaning"
    ? "bg-sky-50 text-sky-700 border-sky-200"
    : s === "service"
      ? "bg-violet-50 text-violet-700 border-violet-200"
      : "bg-orange-50 text-orange-700 border-orange-200";
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function pct(n: number) {
  return `${n.toFixed(1)}%`;
}
function qualityColor(n: number) {
  return n >= 80
    ? "text-green-600"
    : n >= 60
      ? "text-amber-600"
      : "text-red-600";
}
function qualityBg(n: number) {
  return n >= 80
    ? "bg-green-50 border-green-200"
    : n >= 60
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";
}

// ── Range options ─────────────────────────────────────────────────────────────

const RANGES = [
  { label: "7 hari", days: 7 },
  { label: "30 hari", days: 30 },
  { label: "90 hari", days: 90 },
];

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ── Outcome badge ─────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cfg =
    outcome === "completed"
      ? "bg-green-50 text-green-700 border-green-200"
      : outcome === "rework"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  const label =
    outcome === "completed"
      ? "Selesai"
      : outcome === "rework"
        ? "Rework"
        : outcome;
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg}`}
    >
      {label}
    </span>
  );
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: TechnicianHistoryEntry }) {
  return (
    <Link
      to={`/tickets/${entry.ticket_id}`}
      className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-5 px-5 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {entry.location?.name ?? "—"}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {fmtDate(entry.event_date)} · {entry.ac_units_count} unit AC
          {entry.duration_minutes ? ` · ${entry.duration_minutes} menit` : ""}
        </p>
      </div>
      <OutcomeBadge outcome={entry.outcome} />
      <i
        className="ti ti-chevron-right text-slate-300"
        style={{ fontSize: 14 }}
        aria-hidden="true"
      />
    </Link>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function TechnicianDetailScreen() {
  const { technicianId } = useParams({ strict: false }) as {
    technicianId: string;
  };
  const [showEdit, setShowEdit] = useState(false);
  const [rangeDays, setRangeDays] = useState(30);

  const { data: tech, isLoading: lt } = useTechnician(technicianId);
  const { data: kpi } = useTechnicianKpi(technicianId);
  const { data: history = [] } = useTechnicianHistoryEntries(technicianId);

  const fromDate = daysAgo(rangeDays);

  const { data: settings } = useAppSettings();
  const globalAvg = settings?.avgMinutesPerAcUnit ?? 60;

  const { data: quality } = useQuery({
    queryKey: ["technician-quality", technicianId, rangeDays],
    queryFn: () =>
      technicianRepository.getTechnicianQualityMetrics(technicianId, fromDate),
    enabled: !!technicianId,
  });

  if (lt)
    return (
      <PageLayout title="Detail teknisi">
        <div className="text-center py-16 text-slate-400">Memuat...</div>
      </PageLayout>
    );
  if (!tech)
    return (
      <PageLayout title="Detail teknisi">
        <div className="text-center py-16 text-slate-400">
          Teknisi tidak ditemukan.
        </div>
      </PageLayout>
    );

  const kpiLevel = kpi ? getKpiColorLevel(kpi) : null;

  return (
    <PageLayout title="Detail teknisi">
      {showEdit && (
        <EditTechnicianModal
          technician={tech}
          onClose={() => setShowEdit(false)}
        />
      )}

      <div className="flex flex-col gap-5">
        {/* ── Info card ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-bold">
                {tech.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-lg font-semibold text-slate-900">
                  {tech.name}
                </p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tech.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                >
                  {tech.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {tech.technician_id}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <i
                className="ti ti-phone"
                style={{ fontSize: 14 }}
                aria-hidden="true"
              />
              <span>{tech.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <i
                className="ti ti-tools"
                style={{ fontSize: 14, color: "var(--color-slate-400)" }}
                aria-hidden="true"
              />
              <div className="flex gap-1.5 flex-wrap">
                {tech.skills.map((s) => (
                  <span
                    key={s}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${skillClass(s)}`}
                  >
                    {skillLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-end">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <i
                className="ti ti-edit"
                style={{ fontSize: 14 }}
                aria-hidden="true"
              />
              Edit teknisi
            </button>
          </div>
        </div>

        {/* ── Performance ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Performa
            </p>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  onClick={() => setRangeDays(r.days)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    rangeDays === r.days
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* KPI block */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500 mb-4">
                Operasional
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total tiket", value: kpi?.total_recent ?? "—" },
                  { label: "Selesai", value: kpi?.completed_recent ?? "—" },
                  { label: "Rework", value: kpi?.rework_recent ?? "—" },
                  {
                    label: "Menit/unit (aktual)",
                    value: kpi?.avg_min_per_ac_recent
                      ? `${kpi.avg_min_per_ac_recent.toFixed(0)} mnt`
                      : "—",
                    sub: kpi?.avg_min_per_ac_recent
                      ? `rata-rata sistem: ${globalAvg} mnt`
                      : undefined,
                    highlight: kpi?.avg_min_per_ac_recent
                      ? kpi.avg_min_per_ac_recent < globalAvg * 0.9
                        ? "green"
                        : kpi.avg_min_per_ac_recent > globalAvg * 1.1
                          ? "red"
                          : "amber"
                      : undefined,
                  },
                ].map(({ label, value, sub, highlight }: any) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-3">
                    <p
                      className={`text-lg font-bold ${
                        highlight === "green"
                          ? "text-green-600"
                          : highlight === "red"
                            ? "text-red-600"
                            : highlight === "amber"
                              ? "text-amber-600"
                              : "text-slate-800"
                      }`}
                    >
                      {value}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                    {sub && <p className="text-xs text-slate-400">{sub}</p>}
                  </div>
                ))}
              </div>
              {kpiLevel && (
                <div className="mt-3 text-xs text-slate-500">
                  Rating:{" "}
                  <span className="font-medium">{getKpiLabel(kpiLevel)}</span>
                </div>
              )}
            </div>

            {/* Quality block */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500 mb-4">
                Kualitas — {rangeDays} hari terakhir
              </p>
              <div className="flex flex-col gap-3">
                {[
                  {
                    label: "Suhu pass rate",
                    value: quality?.suhu_pass_rate ?? 0,
                  },
                  {
                    label: "Arus pass rate",
                    value: quality?.arus_pass_rate ?? 0,
                  },
                  { label: "Temuan rate", value: quality?.temuan_rate ?? 0 },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 border ${qualityBg(value)}`}
                  >
                    <span className="text-xs text-slate-600">{label}</span>
                    <span
                      className={`text-sm font-semibold ${qualityColor(value)}`}
                    >
                      {pct(value)}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-slate-400">
                  {quality?.total ?? 0} tiket dalam periode ini
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Work log ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Riwayat kerja
            </p>
            <Link
              to={`/technicians/${technicianId}/history`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Lihat semua →
            </Link>
          </div>
          <div className="px-5">
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 italic">
                Belum ada riwayat kerja
              </p>
            ) : (
              history
                .slice(0, 10)
                .map((entry) => <HistoryRow key={entry.id} entry={entry} />)
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
