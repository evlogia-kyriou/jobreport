import { PageLayout } from "@/components/shared/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getCustomerWarningConfig,
    getCustomerWarningLevel,
    useAllCustomerPerformance,
    useCustomers,
    type CustomerPerformance,
} from "@/hooks/useCustomers";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

// ── Filters ───────────────────────────────────────────────────────────────────

const STAGE_FILTERS = [
  { value: undefined, label: "Semua" },
  { value: "prospect", label: "Prospek" },
  { value: "active", label: "Aktif" },
  { value: "suggested_dormant", label: "Perlu Ditinjau" },
  { value: "dormant", label: "Tidak Aktif" },
  { value: "churned", label: "Berhenti" },
];

const TYPE_FILTERS = [
  { value: undefined, label: "Semua Tipe" },
  { value: "company", label: "Perusahaan" },
  { value: "person", label: "Perorangan" },
];

// ── Warning badge ─────────────────────────────────────────────────────────────
// Computed from customer history — no DB column needed

function WarningBadge({ kpi }: { kpi?: CustomerPerformance }) {
  if (!kpi) return null;

  const level = getCustomerWarningLevel(kpi);
  const config = getCustomerWarningConfig(level, kpi);

  if (!config) return null;

  return (
    <span
      title={config.detail}
      className={`text-xs font-medium px-2 py-0.5
                          rounded-full border cursor-help
                          ${config.className}`}
    >
      {config.icon} {config.label}
    </span>
  );
}
// ── Main screen ───────────────────────────────────────────────────────────────

export function CustomerListScreen() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const { data: customers, isLoading, error, refetch } = useCustomers();

  const { data: performances } = useAllCustomerPerformance();

  const filtered = useMemo(
    () =>
      customers?.filter((c) => {
        if (stageFilter && c.stage !== stageFilter) return false;
        if (typeFilter && c.type !== typeFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.pic_name.toLowerCase().includes(q)
          );
        }
        return true;
      }) ?? [],
    [customers, stageFilter, typeFilter, search],
  );

  // Stage counts for filter tabs
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customers?.forEach((c) => {
      counts[c.stage] = (counts[c.stage] ?? 0) + 1;
    });
    return counts;
  }, [customers]);

  // Build a lookup map for O(1) access per row:
  const perfMap = useMemo(() => {
    const map: Record<string, CustomerPerformance> = {};
    performances?.forEach((p) => {
      map[p.customer_id] = p;
    });
    return map;
  }, [performances]);

  return (
    <PageLayout
      title="Pelanggan"
      subtitle={`${filtered.length} pelanggan`}
      action={
        <Link
          to="/customers/create"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Tambah Pelanggan
        </Link>
      }
    >
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari nama pelanggan atau PIC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Stage filter tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STAGE_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStageFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium
                                    transition-colors ${
                                      stageFilter === f.value
                                        ? "bg-blue-600 text-white"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
          >
            {f.label}
            {f.value && stageCounts[f.value]
              ? ` (${stageCounts[f.value]})`
              : ""}
          </button>
        ))}

        <div className="w-px bg-slate-200 mx-1" />

        {TYPE_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setTypeFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium
                                    transition-colors ${
                                      typeFilter === f.value
                                        ? "bg-slate-800 text-white"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
          >
            {f.label}
          </button>
        ))}

        <button
          onClick={() => refetch()}
          className="ml-auto px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div
          className="grid grid-cols-12 gap-4 px-5 py-3
                                border-b border-slate-200 bg-slate-50"
        >
          <div
            className="col-span-3 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Nama
          </div>
          <div
            className="col-span-2 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            PIC
          </div>
          <div
            className="col-span-2 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Telepon
          </div>
          <div
            className="col-span-1 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Tipe
          </div>
          <div
            className="col-span-2 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Status
          </div>
          <div
            className="col-span-1 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            Sumber
          </div>
          <div
            className="col-span-1 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide"
          >
            ⚠
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-8 text-center">
            <p className="text-red-500 text-sm">
              Gagal memuat data. Coba refresh.
            </p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">
              {search ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}
            </p>
          </div>
        )}

        {/* Rows */}
        {!isLoading &&
          filtered.map((customer) => {
            const primaryPhone =
              customer.phones?.find((p) => p.is_primary) ??
              customer.phones?.[0];

            return (
              <Link
                key={customer.id}
                to="/customers/$customerId"
                params={{ customerId: customer.id }}
                className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center"
              >
                {/* Name */}
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full bg-blue-100
                                                    flex items-center justify-center
                                                    shrink-0"
                    >
                      <span className="text-xs font-semibold text-blue-600">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {customer.name}
                    </p>
                  </div>
                </div>

                {/* PIC */}
                <div className="col-span-2">
                  <p className="text-sm text-slate-600 truncate">
                    {customer.pic_name}
                  </p>
                </div>

                {/* Phone */}
                <div className="col-span-2">
                  <p className="text-sm text-slate-500">
                    {primaryPhone?.phone ?? "—"}
                  </p>
                </div>

                {/* Type */}
                <div className="col-span-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5
                                                  rounded-full ${
                                                    customer.type === "company"
                                                      ? "bg-blue-50 text-blue-700"
                                                      : "bg-slate-100 text-slate-600"
                                                  }`}
                  >
                    {customer.type === "company" ? "Perusahaan" : "Perorangan"}
                  </span>
                </div>

                {/* Stage */}
                <div className="col-span-2">
                  <StatusBadge status={customer.stage} />
                </div>

                {/* Source */}
                <div className="col-span-1">
                  <p className="text-xs text-slate-400 capitalize">
                    {sourceLabel(customer.source)}
                  </p>
                </div>

                {/* Warning — Phase 19 */}
                <div className="col-span-1">
                  <WarningBadge kpi={perfMap[customer.id]} />
                </div>
              </Link>
            );
          })}
      </div>

      {/* Summary footer */}
      {!isLoading && customers && (
        <div className="mt-4 flex gap-6 text-sm text-slate-500">
          <span>
            Total:{" "}
            <span className="font-medium text-slate-700">
              {customers.length}
            </span>
          </span>
          <span>
            Aktif:{" "}
            <span className="font-medium text-green-700">
              {stageCounts["active"] ?? 0}
            </span>
          </span>
          <span>
            Perlu Ditinjau:{" "}
            <span className="font-medium text-amber-700">
              {stageCounts["suggested_dormant"] ?? 0}
            </span>
          </span>
        </div>
      )}
    </PageLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceLabel(source: string): string {
  return (
    {
      existing: "Existing",
      referral: "Referral",
      canvassing: "Canvassing",
      social_media: "Sosmed",
      walk_in: "Walk-in",
    }[source] ?? source
  );
}
