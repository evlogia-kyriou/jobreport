// src/screens/AcUnitListScreen.tsx
import { PageLayout } from "@/components/shared/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLocationMaintenance,
  useLocationMaintenanceStats,
  type MaintenanceFilter,
} from "@/hooks/useLocations";
import { supabase } from "@/lib/supabase";
import { useProjectDraftStore } from "@/stores/projectDraftStore";
import type { LocationMaintenanceRow } from "@/types/app";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

// ── Urgency helpers ───────────────────────────────────────────────────────────

function getUrgency(
  row: LocationMaintenanceRow,
): "overdue" | "due_soon" | "never" | "ok" {
  if (row.total_ac === 0) return "never";
  if (row.last_service_date === null) return "never"; // ← never cleaned first
  if (row.overdue_count > 0) return "overdue"; // ← then overdue
  if (row.due_soon_count > 0) return "due_soon";
  return "ok";
}

const URGENCY_DOT: Record<string, string> = {
  overdue: "bg-red-500",
  due_soon: "bg-yellow-400",
  never: "bg-slate-300",
  ok: "bg-green-500",
};

const URGENCY_LABEL: Record<string, string> = {
  overdue: "Overdue",
  due_soon: "Segera",
  never: "Belum Pernah",
  ok: "OK",
};

const URGENCY_TEXT: Record<string, string> = {
  overdue: "text-red-600",
  due_soon: "text-yellow-600",
  never: "text-slate-500",
  ok: "text-green-600",
};

function formatDaysAgo(days: number | null): string {
  if (days === null) return "Belum pernah";
  if (days === 0) return "Hari ini";
  if (days === 1) return "1 hari lalu";
  if (days < 30) return `${days} hari lalu`;
  if (days < 60) return "1 bulan lalu";
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  dot,
  active,
  onClick,
}: {
  label: string;
  value: number;
  dot: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border-2 p-4 text-left transition-all w-full ${
        active
          ? "border-blue-500 shadow-sm"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-3 h-3 rounded-full ${dot}`} />
        {active && (
          <span className="text-xs text-blue-600 font-medium">Aktif</span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </button>
  );
}

// ── Location card ─────────────────────────────────────────────────────────────

function LocationCard({
  row,
  onBuatProyek,
}: {
  row: LocationMaintenanceRow;
  onBuatProyek: (row: LocationMaintenanceRow) => void;
}) {
  const urgency = getUrgency(row);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        {/* Urgency dot */}
        <div
          className={`w-3 h-3 rounded-full mt-1 shrink-0 ${URGENCY_DOT[urgency]}`}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Customer + Location names */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="min-w-0">
              <Link
                to="/customers/$customerId"
                params={{ customerId: row.customer_id }}
                className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {row.customer_name}
              </Link>
              <Link
                to="/customers/$customerId/locations/$locationId"
                params={{
                  customerId: row.customer_id,
                  locationId: row.location_id,
                }}
                className="block font-semibold text-slate-800 hover:text-blue-700 transition-colors truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {row.location_name}
              </Link>
              <p className="text-xs text-slate-400 mt-0.5">
                {row.kabupaten ?? "—"}
                {row.province ? `, ${row.province}` : ""}
              </p>
            </div>

            {/* Urgency badge */}
            <span
              className={`text-xs font-semibold shrink-0 ${URGENCY_TEXT[urgency]}`}
            >
              {URGENCY_LABEL[urgency]}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 mb-3">
            <span className="text-xs text-slate-600">
              <span className="font-semibold">{row.total_ac}</span> unit AC
            </span>
            {row.overdue_count > 0 && (
              <span className="text-xs text-red-600 font-medium">
                {row.overdue_count} overdue
              </span>
            )}
            {row.due_soon_count > 0 && (
              <span className="text-xs text-yellow-600 font-medium">
                {row.due_soon_count} segera
              </span>
            )}
            {row.ok_count > 0 && (
              <span className="text-xs text-green-600">{row.ok_count} ok</span>
            )}
          </div>

          {/* Last service + action */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Terakhir servis:{" "}
              <span
                className={
                  (row.days_since_service ?? 999) > 90
                    ? "text-red-500 font-medium"
                    : "text-slate-600"
                }
              >
                {formatDaysAgo(row.days_since_service)}
              </span>
            </p>
            {row.total_ac > 0 && (
              <button
                onClick={() => onBuatProyek(row)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Buat Proyek →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const FILTER_TABS: { key: MaintenanceFilter; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Segera" },
  { key: "ok", label: "OK" },
  { key: "never", label: "Belum Pernah" },
  { key: "all", label: "Semua" },
];

const PAGE_SIZE = 20;

export function AcUnitListScreen() {
  const navigate = useNavigate();
  const setDraft = useProjectDraftStore((s) => s.setDraft);

  const [filter, setFilter] = useState<MaintenanceFilter>("overdue");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Stats (separate query — all rows, no filter)
  const { data: stats } = useLocationMaintenanceStats();

  // Paginated filtered data
  const { data, isLoading } = useLocationMaintenance({
    filter,
    search,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = data?.rows ?? [];
  const totalCount = data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function handleFilterChange(f: MaintenanceFilter) {
    setFilter(f);
    setSearch("");
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  const handleBuatProyek = useCallback(
    async (row: LocationMaintenanceRow) => {
      setLoading(true);
      try {
        const { data: acData, error } = await supabase
          .from("ac_units")
          .select("id")
          .eq("location_id", row.location_id)
          .eq("is_active", true);

        if (error) throw error;

        const acIds = (acData ?? []).map((ac) => ac.id);
        setDraft(row.customer_id, row.location_id, acIds);
        navigate({ to: "/projects/create" });
      } catch (err) {
        console.error("Failed to fetch AC ids:", err);
      } finally {
        setLoading(false);
      }
    },
    [setDraft, navigate],
  );

  return (
    <PageLayout
      title="Overview Perawatan"
      subtitle="Status servis seluruh lokasi"
    >
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Lokasi Overdue"
          value={stats?.overdueCount ?? 0}
          dot="bg-red-500"
          active={filter === "overdue"}
          onClick={() => handleFilterChange("overdue")}
        />
        <StatCard
          label="Lokasi Segera"
          value={stats?.dueSoonCount ?? 0}
          dot="bg-yellow-400"
          active={filter === "due_soon"}
          onClick={() => handleFilterChange("due_soon")}
        />
        <StatCard
          label="Lokasi OK"
          value={stats?.okCount ?? 0}
          dot="bg-green-500"
          active={filter === "ok"}
          onClick={() => handleFilterChange("ok")}
        />
        <StatCard
          label="Belum Pernah"
          value={stats?.neverCount ?? 0}
          dot="bg-slate-300"
          active={filter === "never"}
          onClick={() => handleFilterChange("never")}
        />
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center gap-4 mb-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === tab.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari pelanggan, lokasi, kota..."
          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-400 mb-3">
        {totalCount} lokasi ditemukan
        {search && ` untuk "${search}"`}
      </p>

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">
            {search
              ? `Tidak ada hasil untuk "${search}"`
              : filter === "overdue"
                ? "🎉 Tidak ada lokasi overdue saat ini"
                : "Tidak ada data"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <LocationCard
              key={row.location_id}
              row={row}
              onBuatProyek={handleBuatProyek}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <p className="text-sm text-slate-500">
            Halaman <span className="font-semibold text-slate-800">{page}</span>{" "}
            dari{" "}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </p>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Loading overlay for Buat Proyek */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl px-6 py-4 shadow-lg">
            <p className="text-sm text-slate-700">Memuat unit AC...</p>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
