import { AcTreeSelector } from "@/components/shared/AcTreeSelector";
import { PageLayout } from "@/components/shared/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcUnitsByLocation } from "@/hooks/useAcUnits";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useBuildingUnits, useLocationsByCustomer } from "@/hooks/useLocations";
import { useProjects } from "@/hooks/useProjectTickets";
import { supabase } from "@/lib/supabase";
import { useProjectDraftStore } from "@/stores/projectDraftStore";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "ruangan" | "riwayat" | "info";

// ── Main screen ───────────────────────────────────────────────────────────────

export function AcUnitDetailScreen() {
  const { customerId, locationId } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setDraft = useProjectDraftStore((s) => s.setDraft);

  const [activeTab, setActiveTab] = useState<Tab>("ruangan");
  const [selectedAcIds, setSelectedAcIds] = useState<string[]>([]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: settings } = useAppSettings();
  const { data: locations } = useLocationsByCustomer(customerId);
  const { data: acUnits, isLoading: acLoading } =
    useAcUnitsByLocation(locationId);
  const { data: buildingUnits, isLoading: buLoading } =
    useBuildingUnits(locationId);
  const { data: projects } = useProjects();

  const location = locations?.find((l) => l.id === locationId);

  // ── Computed stats ────────────────────────────────────────────────────────
  const intervalDays = settings?.cleaningIntervalDays ?? 90;
  const dueSoonDays = settings?.dueSoonDays ?? 14;

  const totalAc = acUnits?.length ?? 0;
  const overdueAc =
    acUnits?.filter((ac) => {
      if (!ac.last_cleaned_at) return true;
      const days = Math.floor(
        (Date.now() - new Date(ac.last_cleaned_at).getTime()) / 86400000,
      );
      return days > intervalDays;
    }).length ?? 0;

  const locationProjects =
    projects?.filter((p) => p.location_id === locationId) ?? [];
  const activeProjects = locationProjects.filter(
    (p) => p.status === "in_progress",
  ).length;

  const lastService =
    acUnits
      ?.map((ac) => ac.last_cleaned_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  // ── Pre-select all active ACs on load ─────────────────────────────────────
  const allActiveIds = (acUnits ?? [])
    .filter((ac) => ac.is_active)
    .map((ac) => ac.id);

  // Initialize selection when ACs load
  useState(() => {
    if (acUnits && selectedAcIds.length === 0) {
      setSelectedAcIds(allActiveIds);
    }
  });

  // ── Add room state ────────────────────────────────────────────────────────
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newFloor, setNewFloor] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);

  async function handleAddRoom() {
    if (!newRoom.trim()) return;
    setAddingRoom(true);
    try {
      await supabase.from("building_units").insert({
        location_id: locationId,
        floor: newFloor.trim() || null,
        room: newRoom.trim(),
        display_name: "", // DB trigger sets this
      });
      queryClient.invalidateQueries({
        queryKey: ["building-units", locationId],
      });
      setNewFloor("");
      setNewRoom("");
      setShowAddRoom(false);
    } finally {
      setAddingRoom(false);
    }
  }

  // ── Handle Buat Proyek ────────────────────────────────────────────────────
  function handleBuatProyek() {
    if (!customerId || !locationId) return;
    setDraft(customerId, locationId, selectedAcIds);
    navigate({ to: "/projects/create" });
  }

  // ── Group building units by floor ─────────────────────────────────────────
  const floorGroups = (buildingUnits ?? []).reduce(
    (acc, bu) => {
      const floor = bu.floor ?? "Umum";
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(bu as any);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  if (!location && !acLoading) {
    return (
      <PageLayout title="Detail Lokasi">
        <p className="text-red-500 text-sm">Lokasi tidak ditemukan.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={location?.name ?? "—"}
      subtitle={`Pelanggan · ${(location as any)?.customer?.name ?? "—"}`}
      action={
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full capitalize">
            {location?.type?.replace("_", " ") ?? "—"}
          </span>
          <Link
            to="/ac-units/register"
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            + Daftarkan AC
          </Link>
          <Link
            to="/customers/$customerId"
            params={{ customerId }}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            ← Kembali
          </Link>
        </div>
      }
    >
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Unit AC" value={totalAc.toString()} icon="❄️" />
        <StatCard
          label="Overdue"
          value={overdueAc.toString()}
          icon="🔴"
          highlight={overdueAc > 0}
        />
        <StatCard
          label="Proyek Aktif"
          value={activeProjects.toString()}
          icon="📋"
        />
        <StatCard
          label="Terakhir Servis"
          value={
            lastService
              ? new Date(lastService).toLocaleDateString("id-ID")
              : "Belum ada"
          }
          icon="🔧"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — AC tree (col-span-2) */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">
              Pilih Unit AC untuk Proyek
            </h2>

            {acLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : (acUnits?.length ?? 0) === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm mb-3">
                  Belum ada unit AC di lokasi ini
                </p>
                <Link
                  to="/ac-units/register"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Daftarkan unit AC pertama
                </Link>
              </div>
            ) : (
              <AcTreeSelector
                acUnits={(acUnits as any[]) ?? []}
                selectedIds={selectedAcIds}
                onChange={setSelectedAcIds}
                cleaningIntervalDays={intervalDays}
                dueSoonDays={dueSoonDays}
                showDetailLink={true}
              />
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              {(
                [
                  { key: "ruangan", label: "Ruangan" },
                  { key: "riwayat", label: "Riwayat Proyek" },
                  { key: "info", label: "Info" },
                ] as { key: Tab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.key
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Ruangan tab */}
              {activeTab === "ruangan" && (
                <div className="space-y-4">
                  {buLoading ? (
                    <Skeleton className="h-24 w-full rounded-lg" />
                  ) : Object.keys(floorGroups).length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">
                      Belum ada ruangan terdaftar
                    </p>
                  ) : (
                    Object.entries(floorGroups).map(([floor, rooms]) => (
                      <div key={floor}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-700">
                            {floor === "Umum" ? "Umum" : `Lantai ${floor}`}
                          </p>
                          <button
                            onClick={() => {
                              setNewFloor(floor === "Umum" ? "" : floor);
                              setShowAddRoom(true);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            + Tambah Ruangan
                          </button>
                        </div>
                        <div className="space-y-1 ml-3">
                          {rooms?.map((bu) => {
                            const acCount = (acUnits ?? []).filter(
                              (ac) => (ac as any).building_unit_id === bu.id,
                            ).length;
                            return (
                              <div
                                key={bu.id}
                                className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
                              >
                                <p className="text-sm text-slate-700">
                                  {bu.display_name}
                                </p>
                                <span className="text-xs text-slate-400">
                                  {acCount} unit AC
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add room form */}
                  {showAddRoom && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-blue-800">
                        Tambah Ruangan
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">
                            Lantai (opsional)
                          </label>
                          <input
                            type="text"
                            value={newFloor}
                            onChange={(e) => setNewFloor(e.target.value)}
                            placeholder="3, B1, Rooftop..."
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 mb-1 block">
                            Nama Ruangan *
                          </label>
                          <input
                            type="text"
                            value={newRoom}
                            onChange={(e) => setNewRoom(e.target.value)}
                            placeholder="Ruang Rapat, Server Room..."
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddRoom}
                          disabled={!newRoom.trim() || addingRoom}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg"
                        >
                          {addingRoom ? "Menyimpan..." : "Simpan"}
                        </button>
                        <button
                          onClick={() => setShowAddRoom(false)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowAddRoom(true)}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    + Tambah Ruangan Baru
                  </button>
                </div>
              )}

              {/* Riwayat tab */}
              {activeTab === "riwayat" && (
                <div className="space-y-2">
                  {locationProjects.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">
                      Belum ada riwayat proyek
                    </p>
                  ) : (
                    locationProjects.map((project) => (
                      <Link
                        key={project.id}
                        to="/projects/$projectId"
                        params={{ projectId: project.id }}
                        className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {project.project_number}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {project.type} · {project.total_ac_units} unit AC
                          </p>
                        </div>
                        <StatusBadge status={project.status} />
                      </Link>
                    ))
                  )}
                </div>
              )}

              {/* Info tab */}
              {activeTab === "info" && (
                <div className="space-y-3">
                  <InfoRow label="Alamat" value={location?.address ?? "—"} />
                  <InfoRow
                    label="Kelurahan"
                    value={location?.kelurahan ?? "—"}
                  />
                  <InfoRow
                    label="Kecamatan"
                    value={location?.kecamatan ?? "—"}
                  />
                  <InfoRow
                    label="Kabupaten"
                    value={location?.kabupaten ?? "—"}
                  />
                  <InfoRow label="Provinsi" value={location?.province ?? "—"} />
                  <InfoRow
                    label="Kode Pos"
                    value={location?.postal_code ?? "—"}
                  />
                  <InfoRow
                    label="Survey"
                    value={
                      location?.has_survey ? "Sudah disurvey" : "Belum disurvey"
                    }
                  />
                  {location?.survey_notes && (
                    <InfoRow
                      label="Catatan Survey"
                      value={location.survey_notes}
                    />
                  )}
                  {location?.notes && (
                    <InfoRow label="Catatan" value={location.notes} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — summary */}
        <div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Pilihan Saat Ini</h2>
            <div className="space-y-2">
              <InfoRow label="Lokasi" value={location?.name ?? "—"} />
              <InfoRow
                label="Dipilih"
                value={`${selectedAcIds.length} unit AC`}
              />
            </div>

            {/* Overdue legend */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-slate-600 mb-2">
                Keterangan warna:
              </p>
              {[
                { color: "bg-green-500", label: "OK" },
                { color: "bg-yellow-400", label: "Segera" },
                { color: "bg-red-500", label: "Overdue" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-2">
                Interval: {intervalDays} hari
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      {selectedAcIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-6 py-4">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                {selectedAcIds.length}
              </span>{" "}
              unit AC dipilih
            </p>
            <button
              onClick={handleBuatProyek}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Buat Proyek →
            </button>
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
  highlight = false,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p
            className={`text-2xl font-bold mt-0.5 ${
              highlight ? "text-red-600" : "text-slate-800"
            }`}
          >
            {value}
          </p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right max-w-48 truncate">
        {value}
      </span>
    </div>
  );
}

const inputClass = `
    w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
`.trim();
