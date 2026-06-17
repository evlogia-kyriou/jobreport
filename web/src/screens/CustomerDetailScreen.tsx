import { PageLayout } from "@/components/shared/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCustomerWarningConfig,
  getCustomerWarningLevel,
  useCustomer,
  useCustomerPerformance,
} from "@/hooks/useCustomers";
import { useLocationsByCustomer } from "@/hooks/useLocations";
import { useProjects } from "@/hooks/useProjectTickets";
import { formatDateTime } from "@/lib/utils";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "overview" | "locations" | "history" | "notes";

// ── Main screen ───────────────────────────────────────────────────────────────

export function CustomerDetailScreen() {
  const { customerId } = useParams({ strict: false });
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: customer, isLoading: cLoading } = useCustomer(customerId);
  const { data: locations, isLoading: lLoading } =
    useLocationsByCustomer(customerId);
  const { data: projects } = useProjects();
  const { data: perf } = useCustomerPerformance(customerId);

  const totalAcUnits =
    locations?.reduce((sum, loc) => {
      return sum + ((loc as any).ac_unit_count ?? 0);
    }, 0) ?? 0;

  const warningLevel = perf ? getCustomerWarningLevel(perf) : "none";
  const warningConfig = perf
    ? getCustomerWarningConfig(warningLevel, perf)
    : null;

  const customerProjects =
    projects?.filter((p) => p.customer_id === customerId) ?? [];

  const isLoading = cLoading || lLoading;

  if (isLoading) {
    return (
      <PageLayout title="Detail Pelanggan">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!customer) {
    return (
      <PageLayout title="Detail Pelanggan">
        <p className="text-red-500 text-sm">Pelanggan tidak ditemukan.</p>
      </PageLayout>
    );
  }

  const primaryPhone =
    customer.phones?.find((p) => p.is_primary) ?? customer.phones?.[0];

  const otherPhones = customer.phones?.filter((p) => !p.is_primary) ?? [];

  // History stats
  const totalProjects = customerProjects.length;
  const completedProjects = customerProjects.filter(
    (p) => p.status === "completed" || p.status === "reported",
  ).length;

  return (
    <PageLayout
      title={customer.name}
      subtitle={customer.type === "company" ? "Perusahaan" : "Perorangan"}
      action={
        <div className="flex items-center gap-3">
          <StatusBadge status={customer.stage} />
          <Link
            to="/customers/$customerId/locations/create"
            params={{ customerId }}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            + Lokasi
          </Link>
          <Link
            to="/projects/create"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Buat Proyek
          </Link>
          <Link
            to="/customers"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            ← Kembali
          </Link>
        </div>
      }
    >
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Proyek"
          value={totalProjects.toString()}
          icon="📋"
        />
        <StatCard
          label="Selesai"
          value={completedProjects.toString()}
          icon="✅"
        />
        <StatCard
          label="Lokasi"
          value={(locations?.length ?? 0).toString()}
          icon="📍"
        />
        <StatCard label="Unit AC" value={totalAcUnits.toString()} icon="❄️" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(
          [
            { key: "overview", label: "Ringkasan" },
            { key: "locations", label: "Lokasi" },
            { key: "history", label: "Riwayat" },
            { key: "notes", label: "Catatan" },
          ] as { key: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2
                                      transition-colors -mb-px ${
                                        activeTab === tab.key
                                          ? "border-blue-600 text-blue-700"
                                          : "border-transparent text-slate-500 hover:text-slate-700"
                                      }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left — contact info */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">
                Informasi Kontak
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Nama" value={customer.name} />
                <InfoRow label="PIC" value={customer.pic_name} />
                <InfoRow
                  label="Telepon Utama"
                  value={primaryPhone?.phone ?? "—"}
                />
                <InfoRow label="Label" value={primaryPhone?.label ?? "—"} />
                {otherPhones.map((p, i) => (
                  <InfoRow
                    key={p.id}
                    label={`Telepon ${i + 2}`}
                    value={`${p.phone} (${p.label})`}
                  />
                ))}
                <InfoRow
                  label="Bergabung"
                  value={formatDateTime(customer.acquired_at)}
                />
                {customer.notes && (
                  <div className="col-span-2">
                    <InfoRow label="Catatan Umum" value={customer.notes} />
                  </div>
                )}
              </div>
            </div>

            {/* Recent projects */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div
                className="px-5 py-4 border-b border-slate-200
                                            flex items-center justify-between"
              >
                <h2 className="font-semibold text-slate-800">Proyek Terbaru</h2>
                <Link
                  to="/projects"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Lihat semua →
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {customerProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {project.project_number}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {project.location?.name ?? "—"}
                        {" · "}
                        {project.total_ac_units} unit AC
                      </p>
                    </div>
                    <StatusBadge status={project.status} />
                  </Link>
                ))}
                {customerProjects.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-slate-400 text-sm">Belum ada proyek</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — stage info */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">
                Status Pelanggan
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Stage</span>
                  <StatusBadge status={customer.stage} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Tipe</span>
                  <span className="text-sm font-medium text-slate-700">
                    {customer.type === "company" ? "Perusahaan" : "Perorangan"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Sumber</span>
                  <span className="text-sm font-medium text-slate-700">
                    {sourceLabel(customer.source)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-3">Performa</h2>

              {!perf || perf.total_lifetime < 2 ? (
                <p className="text-xs text-slate-400">
                  Minimal 2 proyek diperlukan untuk analisis.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Warning badge */}
                  {warningConfig && (
                    <div
                      className={`rounded-lg border px-3 py-2
                                                        ${warningConfig.className}`}
                    >
                      <p className="text-xs font-semibold">
                        {warningConfig.icon} {warningConfig.label}
                      </p>
                      <p className="text-xs mt-0.5">{warningConfig.detail}</p>
                    </div>
                  )}

                  {/* Lifetime stats */}
                  <div className="space-y-2">
                    <PerfRow
                      label="Total Proyek"
                      value={perf.total_lifetime.toString()}
                    />
                    <PerfRow
                      label="Selesai Normal"
                      value={`${perf.completed_lifetime}x`}
                      color="text-green-700"
                    />
                    <PerfRow
                      label="Dibatalkan"
                      value={`${perf.cancelled_lifetime}x`}
                      color={
                        perf.cancelled_lifetime > 0
                          ? "text-red-600"
                          : "text-slate-700"
                      }
                    />
                    <PerfRow
                      label="Sengketa TTD"
                      value={`${perf.disputed_lifetime}x`}
                      color={
                        perf.disputed_lifetime > 0
                          ? "text-amber-700"
                          : "text-slate-700"
                      }
                    />
                  </div>

                  {/* Recent 3 months */}
                  {perf.total_recent > 0 && (
                    <>
                      <div className="border-t border-slate-100 pt-3">
                        <p
                          className="text-xs font-semibold text-slate-500
                                                            uppercase tracking-wide mb-2"
                        >
                          3 Bulan Terakhir
                        </p>
                        <PerfRow
                          label="Total"
                          value={perf.total_recent.toString()}
                        />
                        <PerfRow
                          label="Dibatalkan"
                          value={perf.cancelled_recent.toString()}
                          color={
                            perf.cancelled_recent > 0
                              ? "text-red-600"
                              : "text-slate-700"
                          }
                        />
                      </div>
                    </>
                  )}

                  {/* Last project */}
                  {perf.last_project_date && (
                    <p className="text-xs text-slate-400 pt-1">
                      Proyek terakhir: {perf.last_project_date}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "locations" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-slate-500">
              {locations?.length ?? 0} lokasi terdaftar
            </p>
            <Link
              to="/customers/$customerId/locations/create"
              params={{ customerId }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
            >
              + Tambah Lokasi
            </Link>
          </div>

          {locations?.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  to="/customers/$customerId/locations/$locationId"
                  params={{ customerId, locationId: loc.id }}
                  className="flex-1 min-w-0"
                >
                  <p className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                    {loc.name}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">{loc.address}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {loc.kelurahan}
                    {" · "}
                    {loc.postal_code}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                      {loc.type.replace("_", " ")}
                    </span>
                    {loc.has_survey && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        Sudah survey
                      </span>
                    )}
                  </div>
                </Link>
                <Link
                  to="/projects/create"
                  className="text-sm text-blue-600 hover:text-blue-700 shrink-0 ml-4"
                >
                  Buat Proyek →
                </Link>
              </div>
            </div>
          ))}

          {locations?.length === 0 && (
            <div
              className="bg-white rounded-xl border border-slate-200
                                        p-12 text-center"
            >
              <p className="text-slate-400 text-sm">
                Belum ada lokasi terdaftar
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Riwayat Proyek</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {customerProjects.map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {project.project_number}
                    </p>
                    {project.is_flagged && (
                      <span className="text-xs text-red-500">🚩</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {project.location?.name ?? "—"}
                    {" · "}
                    {project.type}
                    {" · "}
                    {project.total_ac_units} unit AC
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={project.status} />
                </div>
              </Link>
            ))}
            {customerProjects.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-slate-400 text-sm">
                  Belum ada riwayat proyek
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="space-y-3">
          {customer.notes && (
            <div
              className="bg-amber-50 border border-amber-200
                                        rounded-xl p-4"
            >
              <p className="text-xs font-semibold text-amber-700 mb-1">
                Catatan Umum
              </p>
              <p className="text-sm text-amber-900">{customer.notes}</p>
            </div>
          )}
          <div
            className="bg-white rounded-xl border border-slate-200
                                    p-12 text-center"
          >
            <p className="text-slate-400 text-sm">
              Log catatan pelanggan akan tersedia di sini.
            </p>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// ── Sub components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function PerfRow({
  label,
  value,
  color = "text-slate-700",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

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
