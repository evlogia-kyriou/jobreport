import { PageLayout } from "@/components/shared/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getKpiColor,
    getKpiColorLevel,
    getKpiLabel,
    useTechnicianHistoryEntries,
    useTechnicianKpi,
    type KpiColorLevel,
} from "@/hooks/useTechnicians";
import { Link, useParams } from "@tanstack/react-router";

// ── Quality rate helper ───────────────────────────────────────────────────────

function qualityRate(
  completed: number,
  total: number,
  cancelled: number,
  custIssue: number,
): string {
  const denom = total - cancelled - custIssue;
  if (denom <= 0) return "—";
  return `${Math.round((completed / denom) * 100)}%`;
}

// ── Color level badge ─────────────────────────────────────────────────────────

function ColorLevelBadge({ level }: { level: KpiColorLevel }) {
  const color = getKpiColor(level);
  const label = getKpiLabel(level);
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full ${color}`} />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "good" | "bad" | "neutral";
}) {
  const valueColor = {
    good: "text-green-700",
    bad: "text-red-600",
    neutral: "text-slate-800",
  }[highlight ?? "neutral"];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Outcome badge ─────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: "Selesai", className: "bg-green-50 text-green-700" },
    customer_issue: {
      label: "Masalah Pelanggan",
      className: "bg-amber-50 text-amber-700",
    },
    rework_required: {
      label: "Perlu Perbaikan",
      className: "bg-red-50 text-red-700",
    },
    cancelled: {
      label: "Dibatalkan",
      className: "bg-slate-100 text-slate-500",
    },
  };
  const c = config[outcome] ?? {
    label: outcome,
    className: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5
                          rounded-full ${c.className}`}
    >
      {c.label}
    </span>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function KpiScreen() {
  const { technicianId } = useParams({ strict: false });

  const { data: kpi, isLoading: kpiLoading } = useTechnicianKpi(technicianId);
  const { data: history, isLoading: histLoading } =
    useTechnicianHistoryEntries(technicianId);

  const isLoading = kpiLoading || histLoading;

  if (isLoading) {
    return (
      <PageLayout title="KPI Teknisi">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!kpi) {
    return (
      <PageLayout title="KPI Teknisi">
        <p className="text-red-500 text-sm">Data tidak ditemukan.</p>
      </PageLayout>
    );
  }

  const level = getKpiColorLevel(kpi);

  return (
    <PageLayout
      title={kpi.name}
      subtitle={`ID: ${kpi.technician_code}`}
      action={
        <Link
          to="/technicians"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          ← Kembali
        </Link>
      }
    >
      {/* KPI level header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs text-slate-500 mb-2 uppercase
                                      tracking-wide font-semibold"
            >
              Level Performa
            </p>
            <ColorLevelBadge level={level} />
            <p className="text-xs text-slate-400 mt-2">
              Berdasarkan 3 bulan terakhir · {kpi.total_recent} tiket
            </p>
          </div>

          {/* Color scale */}
          <div className="flex items-center gap-1.5">
            {([1, 2, 3, 4, 5] as KpiColorLevel[]).map((l) => (
              <div
                key={l}
                title={getKpiLabel(l)}
                className={`rounded-full transition-all ${getKpiColor(l)} ${
                  l === level
                    ? "w-6 h-6 ring-2 ring-offset-2 ring-slate-400"
                    : "w-4 h-4 opacity-30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Recent 3 months */}
      <div className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">3 Bulan Terakhir</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Tiket"
            value={kpi.total_recent.toString()}
            sub="ditugaskan"
            highlight="neutral"
          />
          <StatCard
            label="Quality Rate"
            value={qualityRate(
              kpi.completed_recent,
              kpi.total_recent,
              kpi.cancelled_recent,
              kpi.customer_issue_recent,
            )}
            sub="selesai tanpa masalah"
            highlight={level >= 4 ? "good" : level <= 2 ? "bad" : "neutral"}
          />
          <StatCard
            label="Avg. Durasi / AC"
            value={
              kpi.avg_min_per_ac_recent
                ? `${kpi.avg_min_per_ac_recent} menit`
                : "—"
            }
            sub="per unit AC"
            highlight="neutral"
          />
          <StatCard
            label="Total Unit AC"
            value={kpi.total_ac_recent.toString()}
            sub="dikerjakan"
            highlight="neutral"
          />
        </div>

        {/* Flag breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Perlu Perbaikan</p>
            <p className="text-2xl font-bold text-red-600">
              {kpi.rework_recent}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">kesalahan teknisi</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Masalah Pelanggan</p>
            <p className="text-2xl font-bold text-amber-600">
              {kpi.customer_issue_recent}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              bukan kesalahan teknisi
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">Dibatalkan</p>
            <p className="text-2xl font-bold text-slate-600">
              {kpi.cancelled_recent}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              tidak dihitung dalam KPI
            </p>
          </div>
        </div>
      </div>

      {/* Lifetime */}
      <div className="mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">Sepanjang Waktu</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Tiket"
            value={kpi.total_lifetime.toString()}
            sub="sejak bergabung"
          />
          <StatCard
            label="Quality Rate"
            value={qualityRate(
              kpi.completed_lifetime,
              kpi.total_lifetime,
              kpi.cancelled_lifetime,
              kpi.customer_issue_lifetime,
            )}
            sub="selesai tanpa masalah"
          />
          <StatCard
            label="Avg. Durasi / AC"
            value={
              kpi.avg_min_per_ac_lifetime
                ? `${kpi.avg_min_per_ac_lifetime} menit`
                : "—"
            }
            sub="per unit AC"
          />
          <StatCard
            label="Total Unit AC"
            value={kpi.total_ac_lifetime.toString()}
            sub="dikerjakan"
          />
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3">
          Riwayat Terbaru (20 tiket)
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-200 bg-slate-50">
            <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tanggal
            </div>
            <div
              className="col-span-4 text-xs font-semibold
                                        text-slate-500 uppercase tracking-wide"
            >
              Lokasi
            </div>
            <div
              className="col-span-1 text-xs font-semibold
                                        text-slate-500 uppercase tracking-wide"
            >
              AC
            </div>
            <div
              className="col-span-2 text-xs font-semibold
                                        text-slate-500 uppercase tracking-wide"
            >
              Durasi
            </div>
            <div
              className="col-span-3 text-xs font-semibold
                                        text-slate-500 uppercase tracking-wide"
            >
              Hasil
            </div>
          </div>

          {/* Rows */}
          {history?.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-slate-100 items-center hover:bg-slate-50 transition-colors"
            >
              <div className="col-span-2">
                <p className="text-sm text-slate-600">{entry.event_date}</p>
                <p className="text-xs text-slate-400 capitalize mt-0.5">
                  {entry.type}
                </p>
              </div>
              <div className="col-span-4">
                <p className="text-sm text-slate-700 truncate">
                  {entry.location?.name ?? "—"}
                </p>
              </div>
              <div className="col-span-1">
                <p className="text-sm text-slate-600">{entry.ac_units_count}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-600">
                  {entry.duration_minutes
                    ? `${entry.duration_minutes} mnt`
                    : "—"}
                </p>
                {entry.duration_minutes && entry.ac_units_count > 0 && (
                  <p className="text-xs text-slate-400">
                    {Math.round(entry.duration_minutes / entry.ac_units_count)}{" "}
                    mnt/AC
                  </p>
                )}
              </div>
              <div className="col-span-3">
                <OutcomeBadge outcome={entry.outcome} />
                {entry.flag_type && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {entry.flag_type}
                  </p>
                )}
              </div>
            </div>
          ))}

          {(!history || history.length === 0) && (
            <div className="p-12 text-center">
              <p className="text-slate-400 text-sm">Belum ada riwayat tiket</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
