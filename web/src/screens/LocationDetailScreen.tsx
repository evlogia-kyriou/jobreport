import { PageLayout } from "@/components/shared/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcBrands, useAcUnitsByLocation } from "@/hooks/useAcUnits";
import {
  getAcOverdueStatus,
  getOverdueColor,
  useAppSettings,
} from "@/hooks/useAppSettings";
import {
  useBuildingUnits,
  useDeleteBuildingUnit,
  useLocationsByCustomer,
  useRenameBuildingUnit,
  useRenameFloor,
  useSoftDeleteLocation,
  useUpdateLocation,
} from "@/hooks/useLocations";
import { useProjects } from "@/hooks/useProjectTickets";
import { supabase } from "@/lib/supabase";
import { useProjectDraftStore } from "@/stores/projectDraftStore";
import type { Location } from "@/types/app";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

const AC_TYPES = [
  "Split",
  "Cassette",
  "Standing",
  "Ducted",
  "Window",
  "Portable",
];
const AC_CAPACITIES = [
  "0.5 PK",
  "0.75 PK",
  "1 PK",
  "1.5 PK",
  "2 PK",
  "2.5 PK",
  "3 PK",
];

type Tab = "lokasi" | "riwayat" | "info";

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Hapus",
  confirmClass = "bg-red-600 hover:bg-red-700 text-white",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Location Modal ───────────────────────────────────────────────────────

function EditLocationModal({
  location,
  onClose,
  onSuccess,
}: {
  location: Location;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const updateLocation = useUpdateLocation();
  const [address, setAddress] = useState(location.address ?? "");
  const [surveyNotes, setSurveyNotes] = useState(location.survey_notes ?? "");
  const [notes, setNotes] = useState(location.notes ?? "");
  const [hasSurvey, setHasSurvey] = useState(location.has_survey ?? false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await updateLocation.mutateAsync({
        locationId: location.id,
        payload: {
          address: address.trim(),
          has_survey: hasSurvey,
          survey_notes: surveyNotes.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "Gagal menyimpan.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">
            Edit Informasi Lokasi
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Alamat *</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              required
              className={`${inputClass} resize-none`}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasSurvey}
              onChange={(e) => setHasSurvey(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm font-medium text-slate-700">
              Sudah disurvey
            </span>
          </label>
          {hasSurvey && (
            <div className="space-y-1.5">
              <label className={labelClass}>Catatan Survey</label>
              <textarea
                value={surveyNotes}
                onChange={(e) => setSurveyNotes(e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className={labelClass}>Catatan Lokasi</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateLocation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg"
            >
              {updateLocation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add AC Modal ──────────────────────────────────────────────────────────────

function AddAcModal({
  locationId,
  buildingUnits,
  preselectedRoomId,
  onClose,
  onSuccess,
}: {
  locationId: string;
  buildingUnits: { id: string; display_name: string }[];
  preselectedRoomId?: string;
  onClose: () => void;
  onSuccess: (newAcId: string) => void;
}) {
  const { data: brands } = useAcBrands();
  const [buildingUnitId, setBuildingUnitId] = useState(preselectedRoomId ?? "");
  const [brandId, setBrandId] = useState("");
  const [acType, setAcType] = useState("Split");
  const [capacity, setCapacity] = useState("1 PK");
  const [unitLabel, setUnitLabel] = useState("1");
  const [accessNotes, setAccessNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!buildingUnitId || !brandId) {
      setError("Pilih ruangan dan merek terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("ac_units")
        .insert({
          location_id: locationId,
          building_unit_id: buildingUnitId,
          brand_id: brandId,
          type: acType,
          capacity_pk: capacity,
          unit_label: unitLabel || "1",
          access_notes: accessNotes.trim() || null,
          is_active: true,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      onSuccess(data.id);
    } catch (err: any) {
      setError(err.message ?? "Gagal mendaftarkan unit AC.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">
            Daftarkan Unit AC
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Ruangan *</label>
            {preselectedRoomId ? (
              <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700">
                {buildingUnits.find((bu) => bu.id === preselectedRoomId)
                  ?.display_name ?? "—"}
              </div>
            ) : (
              <select
                value={buildingUnitId}
                onChange={(e) => setBuildingUnitId(e.target.value)}
                required
                className={selectClass}
              >
                <option value="">Pilih ruangan...</option>
                {buildingUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>
                    {bu.display_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Merek *</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                required
                className={selectClass}
              >
                <option value="">Pilih merek...</option>
                {brands?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Tipe *</label>
              <select
                value={acType}
                onChange={(e) => setAcType(e.target.value)}
                className={selectClass}
              >
                {AC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Kapasitas *</label>
              <select
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={selectClass}
              >
                {AC_CAPACITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Label Unit</label>
              <input
                type="text"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder="1"
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>
              Catatan Akses{" "}
              <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              placeholder="Kunci di satpam..."
              className={inputClass}
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLoading ? "Mendaftarkan..." : "Daftarkan AC"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function LocationDetailScreen() {
  const { customerId, locationId } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setDraft = useProjectDraftStore((s) => s.setDraft);

  const [activeTab, setActiveTab] = useState<Tab>("lokasi");
  const [selectedAcIds, setSelectedAcIds] = useState<string[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [addAcRoomId, setAddAcRoomId] = useState<string | null>(null);
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "location" | "floor" | "room";
    id: string;
    label: string;
    floorKey?: string;
  } | null>(null);

  // Inline rename state
  const [renamingFloor, setRenamingFloor] = useState<string | null>(null);
  const [renameFloorVal, setRenameFloorVal] = useState("");
  const [renamingRoom, setRenamingRoom] = useState<string | null>(null);
  const [renameRoomVal, setRenameRoomVal] = useState("");

  // Add floor/room state
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [addingFloor, setAddingFloor] = useState(false);
  const [addRoomFloor, setAddRoomFloor] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const softDeleteLocation = useSoftDeleteLocation();
  const deleteBuildingUnit = useDeleteBuildingUnit();
  const renameBuildingUnit = useRenameBuildingUnit();
  const renameFloorMutation = useRenameFloor();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: settings } = useAppSettings();
  const { data: locations } = useLocationsByCustomer(customerId);
  const { data: acUnits, isLoading: acLoading } =
    useAcUnitsByLocation(locationId);
  const { data: buildingUnits, isLoading: buLoading } =
    useBuildingUnits(locationId);
  const { data: projects } = useProjects();

  const location = locations?.find((l) => l.id === locationId);

  // ── Settings ──────────────────────────────────────────────────────────────
  const intervalDays = settings?.cleaningIntervalDays ?? 90;
  const dueSoonDays = settings?.dueSoonDays ?? 14;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalAc = (acUnits ?? []).filter((ac) => ac.is_active).length;
  const overdueAc = (acUnits ?? []).filter((ac) => {
    if (!ac.is_active) return false;
    return (
      getAcOverdueStatus(ac.last_cleaned_at, intervalDays, dueSoonDays) ===
      "overdue"
    );
  }).length;

  const locationProjects =
    projects?.filter((p) => p.location_id === locationId) ?? [];
  const activeProjects = locationProjects.filter(
    (p) => p.status === "in_progress",
  ).length;
  const lastService =
    (acUnits ?? [])
      .map((ac) => ac.last_cleaned_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

  // ── Pre-select all active ACs on load ─────────────────────────────────────
  useEffect(() => {
    if (acUnits && selectedAcIds.length === 0) {
      setSelectedAcIds(acUnits.filter((ac) => ac.is_active).map((ac) => ac.id));
    }
  }, [acUnits]);

  // ── Filtered ACs (show/hide inactive) ────────────────────────────────────
  const visibleAcUnits = useMemo(
    () =>
      showInactive
        ? (acUnits ?? [])
        : (acUnits ?? []).filter((ac) => ac.is_active),
    [acUnits, showInactive],
  );

  // ── Build tree ────────────────────────────────────────────────────────────
  const tree = useMemo(() => {
    const floors: Record<
      string,
      {
        label: string;
        rooms: Record<string, { id: string; label: string; acUnits: any[] }>;
      }
    > = {};

    (buildingUnits ?? []).forEach((bu) => {
      const fk = bu.floor ?? "__no_floor__";
      const fl = bu.floor ?? "Umum";
      if (!floors[fk]) floors[fk] = { label: fl, rooms: {} };
      floors[fk].rooms[bu.id] = { id: bu.id, label: bu.room, acUnits: [] };
    });

    visibleAcUnits.forEach((ac) => {
      const buId = (ac as any).building_unit_id;
      if (!buId) return;
      const fk = Object.keys(floors).find((k) => floors[k].rooms[buId]);
      if (fk) floors[fk].rooms[buId].acUnits.push(ac);
    });

    return floors;
  }, [buildingUnits, visibleAcUnits]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const selectedSet = useMemo(() => new Set(selectedAcIds), [selectedAcIds]);
  const activeAcCount = (acUnits ?? []).filter((ac) => ac.is_active).length;

  function toggleAc(acId: string, checked: boolean) {
    setSelectedAcIds((prev) =>
      checked ? [...prev, acId] : prev.filter((id) => id !== acId),
    );
  }

  function toggleRoom(roomAcIds: string[], checked: boolean) {
    const active = roomAcIds.filter(
      (id) => (acUnits ?? []).find((ac) => ac.id === id)?.is_active,
    );
    if (checked) {
      const next = new Set(selectedAcIds);
      active.forEach((id) => next.add(id));
      setSelectedAcIds([...next]);
    } else {
      const remove = new Set(active);
      setSelectedAcIds((prev) => prev.filter((id) => !remove.has(id)));
    }
  }

  function toggleFloor(ids: string[], checked: boolean) {
    toggleRoom(ids, checked);
  }

  function toggleAll(checked: boolean) {
    setSelectedAcIds(
      checked
        ? (acUnits ?? []).filter((ac) => ac.is_active).map((ac) => ac.id)
        : [],
    );
  }

  function checkedState(ids: string[]) {
    const active = ids.filter(
      (id) => (acUnits ?? []).find((ac) => ac.id === id)?.is_active,
    );
    const checked = active.filter((id) => selectedSet.has(id)).length;
    return {
      checked: checked === active.length && active.length > 0,
      indeterminate: checked > 0 && checked < active.length,
    };
  }

  // ── Add floor ─────────────────────────────────────────────────────────────
  async function handleAddFloor() {
    if (!newFloorName.trim()) return;
    setAddingFloor(true);
    try {
      await supabase.from("building_units").insert({
        location_id: locationId,
        floor: newFloorName.trim(),
        room: "Umum",
        display_name: "",
      });
      queryClient.invalidateQueries({
        queryKey: ["building-units", locationId],
      });
      setNewFloorName("");
      setShowAddFloor(false);
    } finally {
      setAddingFloor(false);
    }
  }

  // ── Add room ──────────────────────────────────────────────────────────────
  async function handleAddRoom() {
    if (!newRoomName.trim() || !addRoomFloor) return;
    setAddingRoom(true);
    try {
      await supabase.from("building_units").insert({
        location_id: locationId,
        floor: addRoomFloor === "__no_floor__" ? null : addRoomFloor,
        room: newRoomName.trim(),
        display_name: "",
      });
      queryClient.invalidateQueries({
        queryKey: ["building-units", locationId],
      });
      setNewRoomName("");
      setAddRoomFloor(null);
    } finally {
      setAddingRoom(false);
    }
  }

  // ── Rename floor ──────────────────────────────────────────────────────────
  async function handleRenameFloor(floorKey: string, floorLabel: string) {
    if (!renameFloorVal.trim() || renameFloorVal === floorLabel) {
      setRenamingFloor(null);
      return;
    }
    await renameFloorMutation.mutateAsync({
      locationId,
      oldFloor: floorKey === "__no_floor__" ? "" : floorLabel,
      newFloor: renameFloorVal.trim(),
    });
    setRenamingFloor(null);
  }

  // ── Rename room ───────────────────────────────────────────────────────────
  async function handleRenameRoom(roomId: string) {
    if (!renameRoomVal.trim()) {
      setRenamingRoom(null);
      return;
    }
    await renameBuildingUnit.mutateAsync({
      buildingUnitId: roomId,
      room: renameRoomVal.trim(),
    });
    setRenamingRoom(null);
  }

  // ── Delete helpers ────────────────────────────────────────────────────────
  function canDeleteRoom(roomId: string): boolean {
    const room = Object.values(tree)
      .flatMap((f) => Object.values(f.rooms))
      .find((r) => r.id === roomId);
    return (room?.acUnits ?? []).filter((ac: any) => ac.is_active).length === 0;
  }

  function canDeleteFloor(floorKey: string): boolean {
    return Object.values(tree[floorKey]?.rooms ?? {}).every(
      (room) => room.acUnits.filter((ac: any) => ac.is_active).length === 0,
    );
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "location") {
        await softDeleteLocation.mutateAsync(locationId);
        navigate({ to: "/customers/$customerId", params: { customerId } });
      } else if (confirmDelete.type === "room") {
        await deleteBuildingUnit.mutateAsync(confirmDelete.id);
        queryClient.invalidateQueries({
          queryKey: ["building-units", locationId],
        });
      } else if (confirmDelete.type === "floor") {
        const rooms = Object.values(
          tree[confirmDelete.floorKey ?? ""]?.rooms ?? {},
        );
        for (const room of rooms) {
          await deleteBuildingUnit.mutateAsync(room.id);
        }
        queryClient.invalidateQueries({
          queryKey: ["building-units", locationId],
        });
      }
    } finally {
      setConfirmDelete(null);
    }
  }

  // ── Buat Proyek ───────────────────────────────────────────────────────────
  function handleBuatProyek() {
    if (!customerId || !locationId) return;
    setDraft(customerId, locationId, selectedAcIds);
    navigate({ to: "/projects/create" });
  }

  if (!location && !acLoading && !buLoading) {
    return (
      <PageLayout title="Detail Lokasi">
        <p className="text-red-500 text-sm">Lokasi tidak ditemukan.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={location?.name ?? "—"}
      subtitle={location?.type?.replace(/_/g, " ") ?? "—"}
      action={
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setConfirmDelete({
                type: "location",
                id: locationId,
                label: location?.name ?? "lokasi ini",
              })
            }
            className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"
          >
            Nonaktifkan
          </button>
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
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200">
              {(
                [
                  { key: "lokasi", label: "Lokasi" },
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
              {/* ── LOKASI TAB ── */}
              {activeTab === "lokasi" && (
                <div>
                  {buLoading || acLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Header row */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={
                              selectedAcIds.length === activeAcCount &&
                              activeAcCount > 0
                            }
                            ref={(el) => {
                              if (el)
                                el.indeterminate =
                                  selectedAcIds.length > 0 &&
                                  selectedAcIds.length < activeAcCount;
                            }}
                            onChange={(e) => toggleAll(e.target.checked)}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-semibold text-slate-800">
                            {location?.name ?? "—"}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({activeAcCount} unit aktif)
                          </span>
                        </label>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-slate-400">
                            {selectedAcIds.length} dipilih
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showInactive}
                              onChange={(e) =>
                                setShowInactive(e.target.checked)
                              }
                              className="w-3.5 h-3.5 accent-slate-500"
                            />
                            <span className="text-xs text-slate-400">
                              Nonaktif
                            </span>
                          </label>
                          <button
                            onClick={() => setShowAddFloor(true)}
                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            + Tambah Lantai
                          </button>
                        </div>
                      </div>

                      {/* Add floor form */}
                      {showAddFloor && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3 mb-3">
                          <p className="text-sm font-medium text-green-800">
                            Tambah Lantai
                          </p>
                          <input
                            type="text"
                            value={newFloorName}
                            onChange={(e) => setNewFloorName(e.target.value)}
                            placeholder="L1, L2, B1, Rooftop..."
                            className={inputClass}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddFloor();
                              if (e.key === "Escape") {
                                setShowAddFloor(false);
                                setNewFloorName("");
                              }
                            }}
                          />
                          <p className="text-xs text-slate-400">
                            Akan membuat ruangan "Umum" sebagai default
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddFloor}
                              disabled={!newFloorName.trim() || addingFloor}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg"
                            >
                              {addingFloor ? "Menyimpan..." : "Simpan"}
                            </button>
                            <button
                              onClick={() => {
                                setShowAddFloor(false);
                                setNewFloorName("");
                              }}
                              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {Object.keys(tree).length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-slate-400 text-sm mb-1">
                            Belum ada lantai atau ruangan
                          </p>
                          <p className="text-xs text-slate-400">
                            Klik "+ Tambah Lantai" untuk memulai
                          </p>
                        </div>
                      )}

                      {/* Floor list */}
                      {Object.entries(tree).map(([floorKey, floor]) => {
                        const allFloorAcIds = Object.values(
                          floor.rooms,
                        ).flatMap((r) => r.acUnits.map((ac: any) => ac.id));
                        const fState = checkedState(allFloorAcIds);
                        const canDelete = canDeleteFloor(floorKey);

                        return (
                          <div key={floorKey} className="mb-4">
                            {/* Floor header */}
                            <div className="flex items-center gap-2 py-2 px-3 bg-slate-100 rounded-lg mb-2">
                              <input
                                type="checkbox"
                                checked={fState.checked}
                                ref={(el) => {
                                  if (el)
                                    el.indeterminate = fState.indeterminate;
                                }}
                                onChange={(e) =>
                                  toggleFloor(allFloorAcIds, e.target.checked)
                                }
                                className="w-4 h-4 accent-blue-600 shrink-0"
                              />

                              {/* Floor rename or label */}
                              {renamingFloor === floorKey ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={renameFloorVal}
                                    onChange={(e) =>
                                      setRenameFloorVal(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleRenameFloor(
                                          floorKey,
                                          floor.label,
                                        );
                                      if (e.key === "Escape")
                                        setRenamingFloor(null);
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() =>
                                      handleRenameFloor(floorKey, floor.label)
                                    }
                                    className="text-xs text-blue-600 font-medium"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    onClick={() => setRenamingFloor(null)}
                                    className="text-xs text-slate-400"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm font-semibold text-slate-700 flex-1">
                                  {floorKey === "__no_floor__"
                                    ? "Umum"
                                    : floor.label}
                                </span>
                              )}

                              {/* Floor actions */}
                              {renamingFloor !== floorKey && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      setAddRoomFloor(floorKey);
                                      setNewRoomName("");
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    + Ruangan
                                  </button>
                                  {floorKey !== "__no_floor__" && (
                                    <button
                                      onClick={() => {
                                        setRenamingFloor(floorKey);
                                        setRenameFloorVal(floor.label);
                                      }}
                                      className="text-xs text-slate-500 hover:text-slate-700"
                                      title="Rename"
                                    >
                                      ✏
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      canDelete
                                        ? setConfirmDelete({
                                            type: "floor",
                                            id: floorKey,
                                            label: floor.label,
                                            floorKey,
                                          })
                                        : alert(
                                            "Nonaktifkan semua unit AC di lantai ini terlebih dahulu.",
                                          )
                                    }
                                    className={`text-xs ${canDelete ? "text-red-500 hover:text-red-700" : "text-slate-300 cursor-not-allowed"}`}
                                    title="Hapus lantai"
                                  >
                                    🗑
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Add room form for this floor */}
                            {addRoomFloor === floorKey && (
                              <div className="ml-4 mb-2 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                                <p className="text-xs font-medium text-blue-800">
                                  Tambah Ruangan di{" "}
                                  {floorKey === "__no_floor__"
                                    ? "Umum"
                                    : floor.label}
                                </p>
                                <input
                                  type="text"
                                  value={newRoomName}
                                  onChange={(e) =>
                                    setNewRoomName(e.target.value)
                                  }
                                  placeholder="Ruang Rapat, Bar, Server Room..."
                                  className={inputClass}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddRoom();
                                    if (e.key === "Escape")
                                      setAddRoomFloor(null);
                                  }}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleAddRoom}
                                    disabled={!newRoomName.trim() || addingRoom}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-lg"
                                  >
                                    {addingRoom ? "Menyimpan..." : "Simpan"}
                                  </button>
                                  <button
                                    onClick={() => setAddRoomFloor(null)}
                                    className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-lg"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Rooms */}
                            <div className="ml-4 space-y-2">
                              {Object.values(floor.rooms).map((room) => {
                                const roomAcIds = room.acUnits.map(
                                  (ac: any) => ac.id,
                                );
                                const rState = checkedState(roomAcIds);
                                const canDelRoom = canDeleteRoom(room.id);

                                return (
                                  <div key={room.id}>
                                    {/* Room header */}
                                    <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-lg mb-1">
                                      <input
                                        type="checkbox"
                                        checked={rState.checked}
                                        ref={(el) => {
                                          if (el)
                                            el.indeterminate =
                                              rState.indeterminate;
                                        }}
                                        onChange={(e) =>
                                          toggleRoom(
                                            roomAcIds,
                                            e.target.checked,
                                          )
                                        }
                                        className="w-4 h-4 accent-blue-600 shrink-0"
                                      />

                                      {/* Room rename or label */}
                                      {renamingRoom === room.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                          <input
                                            type="text"
                                            value={renameRoomVal}
                                            onChange={(e) =>
                                              setRenameRoomVal(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter")
                                                handleRenameRoom(room.id);
                                              if (e.key === "Escape")
                                                setRenamingRoom(null);
                                            }}
                                            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() =>
                                              handleRenameRoom(room.id)
                                            }
                                            className="text-xs text-blue-600 font-medium"
                                          >
                                            Simpan
                                          </button>
                                          <button
                                            onClick={() =>
                                              setRenamingRoom(null)
                                            }
                                            className="text-xs text-slate-400"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="text-sm font-medium text-slate-700 flex-1">
                                            {room.label}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            ({room.acUnits.length} AC)
                                          </span>
                                        </>
                                      )}

                                      {/* Room actions */}
                                      {renamingRoom !== room.id && (
                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            onClick={() =>
                                              setAddAcRoomId(room.id)
                                            }
                                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                                          >
                                            + AC
                                          </button>
                                          <button
                                            onClick={() => {
                                              setRenamingRoom(room.id);
                                              setRenameRoomVal(room.label);
                                            }}
                                            className="text-xs text-slate-500 hover:text-slate-700"
                                            title="Rename"
                                          >
                                            ✏
                                          </button>
                                          <button
                                            onClick={() =>
                                              canDelRoom
                                                ? setConfirmDelete({
                                                    type: "room",
                                                    id: room.id,
                                                    label: room.label,
                                                  })
                                                : alert(
                                                    "Nonaktifkan semua unit AC di ruangan ini terlebih dahulu.",
                                                  )
                                            }
                                            className={`text-xs ${canDelRoom ? "text-red-500 hover:text-red-700" : "text-slate-300 cursor-not-allowed"}`}
                                            title="Hapus ruangan"
                                          >
                                            🗑
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* AC units */}
                                    <div className="ml-4 space-y-1">
                                      {room.acUnits.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-1 px-2">
                                          Belum ada unit AC
                                        </p>
                                      ) : (
                                        room.acUnits.map((ac: any) => {
                                          const status = getAcOverdueStatus(
                                            ac.last_cleaned_at,
                                            intervalDays,
                                            dueSoonDays,
                                          );
                                          const dotColor =
                                            getOverdueColor(status);
                                          return (
                                            <div
                                              key={ac.id}
                                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                                                !ac.is_active
                                                  ? "opacity-40 bg-slate-50"
                                                  : "hover:bg-slate-50"
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={selectedSet.has(ac.id)}
                                                disabled={!ac.is_active}
                                                onChange={(e) =>
                                                  toggleAc(
                                                    ac.id,
                                                    e.target.checked,
                                                  )
                                                }
                                                className="w-4 h-4 accent-blue-600 shrink-0"
                                              />
                                              <div
                                                title={status}
                                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`}
                                              />
                                              <div className="flex-1 min-w-0">
                                                <span className="text-sm text-slate-700">
                                                  {ac.brand?.name ?? "—"} ·{" "}
                                                  {ac.type} · {ac.capacity_pk}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-2 font-mono">
                                                  {ac.ac_code}
                                                </span>
                                              </div>
                                              {!ac.is_active && (
                                                <span className="text-xs text-slate-400 shrink-0">
                                                  Nonaktif
                                                </span>
                                              )}
                                              <Link
                                                to="/ac-units/$acUnitId"
                                                params={{ acUnitId: ac.id }}
                                                className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                Detail →
                                              </Link>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── RIWAYAT TAB ── */}
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

              {/* ── INFO TAB ── */}
              {activeTab === "info" && (
                <div className="space-y-3">
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setShowEditLocation(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      ✏ Edit
                    </button>
                  </div>
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

        {/* Right sidebar */}
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

      {/* Modals */}
      {addAcRoomId && (
        <AddAcModal
          locationId={locationId}
          buildingUnits={buildingUnits ?? []}
          preselectedRoomId={addAcRoomId}
          onClose={() => setAddAcRoomId(null)}
          onSuccess={(newAcId) => {
            queryClient.invalidateQueries({
              queryKey: ["ac-units", "location", locationId],
            });
            setSelectedAcIds((prev) => [...prev, newAcId]);
            setAddAcRoomId(null);
          }}
        />
      )}

      {showEditLocation && location && (
        <EditLocationModal
          location={location as Location}
          onClose={() => setShowEditLocation(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["locations", "customer", customerId],
            });
            setShowEditLocation(false);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={
            confirmDelete.type === "location"
              ? "Nonaktifkan Lokasi"
              : confirmDelete.type === "floor"
                ? "Hapus Lantai"
                : "Hapus Ruangan"
          }
          message={
            confirmDelete.type === "location"
              ? `Lokasi "${confirmDelete.label}" akan disembunyikan. Dapat diaktifkan kembali nanti.`
              : `"${confirmDelete.label}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
          }
          confirmLabel={
            confirmDelete.type === "location" ? "Nonaktifkan" : "Hapus"
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
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
            className={`text-2xl font-bold mt-0.5 ${highlight ? "text-red-600" : "text-slate-800"}`}
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

const inputClass =
  `w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`.trim();
const selectClass =
  `w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`.trim();
const labelClass = `text-sm font-medium text-slate-700 mb-1.5 block`.trim();
