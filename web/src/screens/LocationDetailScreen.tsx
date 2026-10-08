import { EntityPopover } from "@/components/shared/EntityPopover";
import {
  KategoriFungsiIcon,
  TipeBangunanIcon,
} from "@/components/shared/LocationIcons";
import { LocationMapPicker } from "@/components/shared/LocationMapPicker";
import { PageLayout } from "@/components/shared/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Toast, type ToastState } from "@/components/shared/Toast";
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
import {
  buildingRepository,
  locationRepository,
} from "@/repositories/locationRepository";
import { useProjectDraftStore } from "@/stores/projectDraftStore";
import type { Location } from "@/types/app";
import { fmtFloor, fmtRoom, fmtZona } from "@/utils/locationFormatters";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

const LOCATION_PROJECT_LIMIT = 8;

// ── Constants ─────────────────────────────────────────────────────────────────

const AC_TYPES = [
  "Split",
  "Cassette",
  "Standing",
  "Ducted",
  "Window",
  "Portable",
];
const AC_CAPACITIES = ["0.5", "0.75", "1", "1.5", "2", "2.5", "3"];
// Display helper: adds "PK" for human-readable labels
const fmtPk = (val: string) => `${val} PK`;

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
  buildingUnits: {
    id: string;
    floor?: string;
    room?: string;
    zone_label?: string;
  }[];
  preselectedRoomId?: string;
  onClose: () => void;
  onSuccess: (newAcId: string) => void;
}) {
  const { data: brands } = useAcBrands();
  const [buildingUnitId, setBuildingUnitId] = useState(preselectedRoomId ?? "");
  const [brandId, setBrandId] = useState("");
  const [acType, setAcType] = useState("Split");
  const [capacity, setCapacity] = useState("1");
  const [unitLabel, setUnitLabel] = useState("1");
  const [accessNotes, setAccessNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
                {(() => {
                  const bu = buildingUnits.find(
                    (bu) => bu.id === preselectedRoomId,
                  );
                  return bu
                    ? fmtBuildingUnit(bu.floor, bu.room, bu.zone_label)
                    : "—";
                })()}
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
                    {fmtBuildingUnit(bu.floor, bu.room, bu.zone_label)}
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
                    {fmtPk(c)}
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
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [addAcRoomId, setAddAcRoomId] = useState<string | null>(null);
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "location" | "floor" | "room" | "zone";
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

  // ── Buildings (nested hierarchy) ─────────────────────────────────────────────
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  // Pending local state: floors & rooms not yet in DB
  const [pendingFloors, setPendingFloors] = useState<Record<string, string[]>>(
    {},
  );
  const [pendingRooms, setPendingRooms] = useState<Record<string, string[]>>(
    {},
  );

  // Add Building
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [savingBuilding, setSavingBuilding] = useState(false);

  // Add Lantai (floor)
  const [addingLantaiFor, setAddingLantaiFor] = useState<string | null>(null); // buildingId
  const [newLantaiName, setNewLantaiName] = useState("");

  // Add Ruangan (room)
  const [addingRuanganFor, setAddingRuanganFor] = useState<{
    buildingId: string;
    floor: string;
  } | null>(null);
  const [newRuanganName, setNewRuanganName] = useState("");

  // Add Zona
  const [addingZonaFor, setAddingZonaFor] = useState<{
    buildingId: string;
    floor: string;
    room: string;
  } | null>(null);
  const [newZonaLabel, setNewZonaLabel] = useState("A");
  const [savingZona, setSavingZona] = useState(false);

  // Add AC to zone
  const [addingAcFor, setAddingAcFor] = useState<string | null>(null); // buildingUnitId
  const [newAcType, setNewAcType] = useState("Split");
  const [newAcCapacity, setNewAcCapacity] = useState("1");
  const [newAcBrandId, setNewAcBrandId] = useState("");
  const [savingAc, setSavingAc] = useState(false);

  function fetchBuildings() {
    if (!locationId) return;
    setBuildingsLoading(true);
    buildingRepository
      .getByLocation(locationId)
      .then(setBuildings)
      .catch(() => {})
      .finally(() => setBuildingsLoading(false));
  }

  useEffect(() => {
    fetchBuildings();
  }, [locationId]);

  async function handleAddBuilding() {
    if (!locationId || !newBuildingName.trim()) return;
    setSavingBuilding(true);
    try {
      await buildingRepository.create(locationId, newBuildingName.trim());
      setNewBuildingName("");
      setShowAddBuilding(false);
      fetchBuildings();
    } catch {
    } finally {
      setSavingBuilding(false);
    }
  }

  function handleAddLantai(buildingId: string) {
    if (!newLantaiName.trim()) return;
    setPendingFloors((prev) => ({
      ...prev,
      [buildingId]: [...(prev[buildingId] ?? []), newLantaiName.trim()],
    }));
    setNewLantaiName("");
    setAddingLantaiFor(null);
  }

  function handleAddRuangan(buildingId: string, floor: string) {
    if (!newRuanganName.trim()) return;
    const key = `${buildingId}::${floor}`;
    setPendingRooms((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), newRuanganName.trim()],
    }));
    setNewRuanganName("");
    setAddingRuanganFor(null);
  }

  function getNextZoneLabelLocal(
    buildingId: string,
    floor: string,
    room: string,
  ): string {
    const bld = buildings.find((b: any) => b.id === buildingId);
    if (!bld) return "A";
    const used = new Set(
      (bld.building_units ?? [])
        .filter((bu: any) => bu.floor === floor && bu.room === room)
        .map((bu: any) => bu.zone_label ?? ""),
    );
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (!used.has(letter)) return letter;
    }
    return "Z" + (bld.building_units?.length ?? 0 + 1);
  }

  async function handleAddZona(
    buildingId: string,
    floor: string,
    room: string,
    label: string,
  ) {
    if (!locationId || !label.trim()) return;
    setSavingZona(true);
    try {
      await buildingRepository.addZone({
        location_id: locationId,
        building_id: buildingId,
        floor,
        room,
        zone_label: label.trim(),
      });
      // Remove from pending if this floor/room was pending
      const floorKey = `${buildingId}::${floor}`;
      setPendingRooms((prev) => {
        const rooms = (prev[floorKey] ?? []).filter((r) => r !== room);
        return { ...prev, [floorKey]: rooms };
      });
      setAddingZonaFor(null);
      fetchBuildings();
    } catch {
    } finally {
      setSavingZona(false);
    }
  }

  async function handleAddAc(buildingUnitId: string) {
    if (!locationId || !newAcType || !newAcCapacity) return;
    setSavingAc(true);
    try {
      await buildingRepository.addAcToZone({
        location_id: locationId,
        building_unit_id: buildingUnitId,
        ac_type: newAcType,
        ac_capacity: newAcCapacity,
        ac_brand_id: newAcBrandId || undefined,
      });
      setAddingAcFor(null);
      setNewAcType("Split");
      setNewAcCapacity("1");
      setNewAcBrandId("");
      fetchBuildings();
    } catch {
    } finally {
      setSavingAc(false);
    }
  }

  // ── Edit building/floor/room state ────────────────────────────────────────
  const [editingBuilding, setEditingBuilding] = useState<string | null>(null);
  const [editBuildingName, setEditBuildingName] = useState("");
  const [editingFloor, setEditingFloor] = useState<{
    bid: string;
    floor: string;
  } | null>(null);
  const [editFloorName, setEditFloorName] = useState("");
  const [editingRoom, setEditingRoom] = useState<{
    bid: string;
    floor: string;
    room: string;
  } | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [savingStructure, setSavingStructure] = useState(false);

  async function handleRenameBuilding(buildingId: string) {
    if (!editBuildingName.trim()) return;
    setSavingStructure(true);
    try {
      await buildingRepository.renameBuilding(
        buildingId,
        editBuildingName.trim(),
      );
      setEditingBuilding(null);
      fetchBuildings();
      setToast({ message: "Gedung berhasil diperbarui", type: "success" });
    } catch (e: any) {
      setToast({ message: e.message ?? "Gagal memperbarui", type: "error" });
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleDeleteBuilding(buildingId: string) {
    setSavingStructure(true);
    try {
      await buildingRepository.deleteBuilding(buildingId);
      setEditingBuilding(null);
      fetchBuildings();
      setToast({ message: "Gedung berhasil dihapus", type: "success" });
    } catch (e: any) {
      setToast({ message: e.message ?? "Gagal menghapus", type: "error" });
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleRenameFloor(buildingId: string, oldFloor: string) {
    if (!editFloorName.trim()) return;
    setSavingStructure(true);
    try {
      await buildingRepository.renameFloor(
        buildingId,
        oldFloor,
        editFloorName.trim(),
      );
      setEditingFloor(null);
      fetchBuildings();
      setToast({ message: "Lantai berhasil diperbarui", type: "success" });
    } catch (e: any) {
      setToast({ message: e.message ?? "Gagal memperbarui", type: "error" });
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleDeleteFloor(
    buildingId: string,
    floor: string,
    zoneCount: number,
  ) {
    if (zoneCount > 0) {
      setToast({
        message: "Hapus semua zona di lantai ini terlebih dahulu",
        type: "error",
      });
      return;
    }
    setSavingStructure(true);
    try {
      await buildingRepository.deleteFloor(buildingId, floor);
      setEditingFloor(null);
      fetchBuildings();
      setToast({ message: "Lantai berhasil dihapus", type: "success" });
    } catch (e: any) {
      setToast({ message: e.message ?? "Gagal menghapus", type: "error" });
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleRenameRoom(
    buildingId: string,
    floor: string,
    oldRoom: string,
  ) {
    if (!editRoomName.trim()) return;
    setSavingStructure(true);
    try {
      await buildingRepository.renameRoom(
        buildingId,
        floor,
        oldRoom,
        editRoomName.trim(),
      );
      setEditingRoom(null);
      fetchBuildings();
      setToast({ message: "Ruangan berhasil diperbarui", type: "success" });
    } catch (e: any) {
      setToast({ message: e.message ?? "Gagal memperbarui", type: "error" });
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleDeleteRoom(
    buildingId: string,
    floor: string,
    room: string,
    zoneCount: number,
  ) {
    if (zoneCount > 0) {
      setToast({
        message: "Hapus semua zona di ruangan ini terlebih dahulu",
        type: "error",
      });
      return;
    }
    setSavingStructure(true);
    try {
      await buildingRepository.deleteRoom(buildingId, floor, room);
      setEditingRoom(null);
      fetchBuildings();
      setToast({ message: "Ruangan berhasil dihapus", type: "success" });
    } catch (e: any) {
      setToast({ message: e.message ?? "Gagal menghapus", type: "error" });
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleRemoveAcFromZone(buildingUnitId: string) {
    try {
      await buildingRepository.removeAcFromZone(buildingUnitId);
      setEditingZone(null);
      fetchBuildings();
      setToast({
        message: "Unit AC berhasil dihapus dari zona",
        type: "success",
      });
    } catch (e: any) {
      setToast({ message: e.message ?? "Gagal menghapus", type: "error" });
    }
  }
  const [editingZone, setEditingZone] = useState<string | null>(null); // buildingUnitId
  const [editZonaLabel, setEditZonaLabel] = useState("");
  const [editAcType, setEditAcType] = useState("Split");
  const [editAcCapacity, setEditAcCapacity] = useState("1");
  const [editAcBrandId, setEditAcBrandId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function openEditZone(zone: any) {
    setEditingZone(zone.id);
    setEditZonaLabel(zone.zone_label ?? "");
    setEditAcType(zone.ac_unit?.type ?? "Split");
    setEditAcCapacity(zone.ac_unit?.capacity_pk ?? "1");
    setEditAcBrandId(zone.ac_unit?.brand?.id ?? "");
  }

  async function handleSaveEditZone(zone: any) {
    if (!editZonaLabel.trim()) return;
    setSavingEdit(true);
    try {
      await supabase
        .from("building_units")
        .update({ zone_label: editZonaLabel.trim() })
        .eq("id", zone.id);
      if (zone.ac_unit) {
        await supabase
          .from("ac_units")
          .update({
            type: editAcType,
            capacity_pk: editAcCapacity,
            brand_id: editAcBrandId || null,
          })
          .eq("id", zone.ac_unit.id);
      }
      setEditingZone(null);
      fetchBuildings();
    } catch {
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteZone(zoneId: string) {
    await buildingRepository.deleteZone(zoneId);
    if (editingZone === zoneId) setEditingZone(null);
    fetchBuildings();
  }

  // ── Zone existence helpers (for blocking deletion) ────────────────────────────
  function buildingHasZones(bid: string): boolean {
    const b = buildings.find((b: any) => b.id === bid);
    return (b?.building_units ?? []).length > 0;
  }
  function floorHasZones(bid: string, floor: string): boolean {
    const b = buildings.find((b: any) => b.id === bid);
    return (b?.building_units ?? []).some((bu: any) => bu.floor === floor);
  }
  function roomHasZones(bid: string, floor: string, room: string): boolean {
    const b = buildings.find((b: any) => b.id === bid);
    return (b?.building_units ?? []).some(
      (bu: any) => bu.floor === floor && bu.room === room,
    );
  }

  // ── Duplicate validation helpers ───────────────────────────────────────────
  function floorExists(buildingId: string, floor: string): boolean {
    const bld = buildings.find((b: any) => b.id === buildingId);
    if (!bld) return false;
    const existing = new Set(
      (bld.building_units ?? []).map((bu: any) => bu.floor ?? ""),
    );
    // Also check pending
    return (
      existing.has(floor) || (pendingFloors[buildingId] ?? []).includes(floor)
    );
  }

  function roomExists(
    buildingId: string,
    floor: string,
    room: string,
  ): boolean {
    const bld = buildings.find((b: any) => b.id === buildingId);
    if (!bld) return false;
    const existing = new Set(
      (bld.building_units ?? [])
        .filter((bu: any) => bu.floor === floor)
        .map((bu: any) => bu.room ?? ""),
    );
    const key = `${buildingId}::${floor}`;
    return existing.has(room) || (pendingRooms[key] ?? []).includes(room);
  }

  function zoneExists(
    buildingId: string,
    floor: string,
    room: string,
    label: string,
    excludeId?: string,
  ): boolean {
    const bld = buildings.find((b: any) => b.id === buildingId);
    if (!bld) return false;
    return (bld.building_units ?? [])
      .filter(
        (bu: any) =>
          bu.floor === floor && bu.room === room && bu.id !== excludeId,
      )
      .some((bu: any) => (bu.zone_label ?? "") === label);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const softDeleteLocation = useSoftDeleteLocation();
  const deleteBuildingUnit = useDeleteBuildingUnit();
  const renameBuildingUnit = useRenameBuildingUnit();
  const renameFloorMutation = useRenameFloor();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: settings } = useAppSettings();
  const { data: brands } = useAcBrands();
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

  // Block deletion if ANY project exists (any status)
  const hasAnyProject = locationProjects.length > 0;

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
        // TODO PRODUCTION: replace with softDeleteLocation.mutateAsync(locationId)
        await locationRepository.hardDeleteLocation(locationId);
        setToast({
          message: `Lokasi "${location?.name}" berhasil dihapus`,
          type: "success",
        });
        setTimeout(() => {
          navigate({ to: "/customers/$customerId", params: { customerId } });
        }, 1500);
      } else if (confirmDelete.type === "room") {
        await deleteBuildingUnit.mutateAsync(confirmDelete.id);
        queryClient.invalidateQueries({
          queryKey: ["building-units", locationId],
        });
        setToast({ message: "Ruangan berhasil dihapus", type: "success" });
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
        setToast({ message: "Lantai berhasil dihapus", type: "success" });
      } else if (confirmDelete.type === "zone") {
        if (confirmDelete.label.startsWith("AC di Zona")) {
          // Hapus AC only — keep zone slot
          await handleDeleteAcFromZone(confirmDelete.id);
        } else {
          // Hapus Zona — remove entire slot
          await handleDeleteZone(confirmDelete.id);
          setToast({ message: "Zona berhasil dihapus", type: "success" });
        }
      }
    } catch (err: any) {
      setToast({
        message: `Gagal menghapus: ${err?.message ?? "terjadi kesalahan"}`,
        type: "error",
      });
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
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span>{location?.name ?? "—"}</span>
          {(location as any)?.kategori_fungsi?.label && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
              <KategoriFungsiIcon
                label={(location as any).kategori_fungsi.label}
                size={13}
              />
              {(location as any).kategori_fungsi.label}
            </span>
          )}
        </div>
      }
      subtitle={
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {(location as any)?.location_number && (
            <span className="text-xs font-mono text-slate-400">
              {(location as any).location_number}
            </span>
          )}
          {(location as any)?.tipe_bangunan?.label && (
            <div className="flex items-center gap-1.5">
              <TipeBangunanIcon
                label={(location as any).tipe_bangunan.label}
                size={15}
              />
              <span className="text-sm text-slate-500">
                {(location as any).tipe_bangunan.label}
              </span>
            </div>
          )}
          {!(location as any)?.tipe_bangunan?.label && location?.type && (
            <span className="text-sm text-slate-500">
              {location.type.replace(/_/g, " ")}
            </span>
          )}
        </div>
      }
      action={
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-end gap-0.5">
            {hasAnyProject ? (
              <button
                disabled
                className="px-4 py-2 border border-slate-200 text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                Hapus Lokasi
              </button>
            ) : (
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
                Hapus Lokasi
              </button>
            )}
            {hasAnyProject && (
              <span className="text-xs text-slate-400">
                Ada {locationProjects.length} proyek — tidak bisa dihapus
              </span>
            )}
          </div>
          <Link
            to="/customers/$customerId/locations/$locationId/edit"
            params={{ customerId, locationId }}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            Edit Lokasi
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
              {/* ── LOKASI TAB — Building > Floor > Room > Zone > AC ── */}
              {activeTab === "lokasi" && (
                <div className="space-y-4">
                  {/* Location summary + add building */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                        {buildings.length} gedung
                      </span>
                      <span className="text-sm px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                        {buildings.reduce(
                          (s, b) =>
                            s +
                            (b.building_units ?? []).filter(
                              (bu: any) => bu.ac_unit,
                            ).length,
                          0,
                        )}{" "}
                        unit AC
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddBuilding(true)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                    >
                      + Gedung
                    </button>
                  </div>

                  {/* Add Building form */}
                  {showAddBuilding && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Nama gedung
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newBuildingName}
                          onChange={(e) => setNewBuildingName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddBuilding()
                          }
                          placeholder="e.g. Gedung Utama, Tower A"
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddBuilding}
                          disabled={savingBuilding || !newBuildingName.trim()}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50"
                        >
                          {savingBuilding ? "..." : "Simpan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddBuilding(false)}
                          className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {buildingsLoading && (
                    <div className="space-y-3">
                      {[...Array(2)].map((_, i) => (
                        <div
                          key={i}
                          className="h-20 bg-slate-100 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  )}

                  {/* Buildings */}
                  {buildings.map((building: any) => {
                    const byFloor: Record<string, Record<string, any[]>> = {};
                    for (const bu of building.building_units ?? []) {
                      const fl = fmtFloor(bu.floor);
                      const rm = bu.room || "—";
                      if (!byFloor[fl]) byFloor[fl] = {};
                      if (!byFloor[fl][rm]) byFloor[fl][rm] = [];
                      byFloor[fl][rm].push(bu);
                    }
                    for (const pf of pendingFloors[building.id] ?? []) {
                      if (!byFloor[pf]) byFloor[pf] = {};
                    }
                    for (const [key, rooms] of Object.entries(pendingRooms)) {
                      const [bid, fl] = key.split("::");
                      if (bid !== building.id || !byFloor[fl]) continue;
                      for (const rm of rooms) {
                        if (!byFloor[fl][rm]) byFloor[fl][rm] = [];
                      }
                    }
                    const floors = Object.keys(byFloor).sort();
                    const floorCount = floors.length;
                    const totalAcInBuilding = (
                      building.building_units ?? []
                    ).filter((bu: any) => bu.ac_unit).length;
                    const lantaiDupe =
                      addingLantaiFor === building.id &&
                      newLantaiName.trim() &&
                      floorExists(building.id, newLantaiName.trim());
                    const isBldEditing = editingBuilding === building.id;
                    const bldHasZones = buildingHasZones(building.id);

                    return (
                      <div
                        key={building.id}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                      >
                        {/* Building header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[15px] font-semibold text-slate-800">
                              {building.name}
                            </span>
                            <span
                              className={`text-[12px] px-2.5 py-0.5 rounded-full border ${floorCount === 0 ? "text-amber-600 border-amber-300 bg-amber-50" : "text-slate-500 border-slate-200 bg-white"}`}
                            >
                              {floorCount} lantai
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAddingLantaiFor(building.id);
                                setNewLantaiName("");
                              }}
                              className="text-sm px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                            >
                              + Lantai
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBuilding(building.id);
                                setEditBuildingName(building.name);
                              }}
                              className="text-sm px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        {/* Edit building form */}
                        {isBldEditing && (
                          <div className="mx-4 my-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-3">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Edit Gedung
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editBuildingName}
                                onChange={(e) =>
                                  setEditBuildingName(e.target.value)
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" &&
                                  handleRenameBuilding(building.id)
                                }
                                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleRenameBuilding(building.id)
                                }
                                disabled={!editBuildingName.trim()}
                                className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg disabled:opacity-40"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBuilding(null)}
                                className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                              >
                                Batal
                              </button>
                            </div>
                            {bldHasZones ? (
                              <div>
                                <button
                                  type="button"
                                  disabled
                                  className="text-sm px-3 py-1.5 border border-slate-200 text-slate-400 rounded-lg cursor-not-allowed"
                                >
                                  Hapus Gedung
                                </button>
                                <p className="text-xs text-slate-400 mt-1">
                                  Tidak bisa dihapus — hapus semua zona terlebih
                                  dahulu
                                </p>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete({
                                    type: "location" as any,
                                    id: building.id,
                                    label: building.name,
                                  })
                                }
                                className="text-sm px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                              >
                                Hapus Gedung
                              </button>
                            )}
                          </div>
                        )}

                        {/* Add Lantai form */}
                        {addingLantaiFor === building.id && (
                          <div className="mx-4 my-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 space-y-1">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Nama lantai
                            </p>
                            <div className="flex gap-2 items-start">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={newLantaiName}
                                  onChange={(e) =>
                                    setNewLantaiName(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    !lantaiDupe &&
                                    handleAddLantai(building.id)
                                  }
                                  placeholder="e.g. Lantai 1, Lantai 2, Rooftop"
                                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${lantaiDupe ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                />
                                {lantaiDupe && (
                                  <p className="text-xs text-red-500 mt-1">
                                    ⚠ {newLantaiName.trim()} sudah ada di gedung
                                    ini
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddLantai(building.id)}
                                disabled={!newLantaiName.trim() || !!lantaiDupe}
                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-40"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddingLantaiFor(null)}
                                className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}

                        {floors.length === 0 && (
                          <div className="px-4 py-5 text-center">
                            <p className="text-sm text-slate-400 mb-2">
                              Belum ada lantai.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingLantaiFor(building.id);
                                setNewLantaiName("");
                              }}
                              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg"
                            >
                              + Tambah lantai pertama
                            </button>
                          </div>
                        )}

                        {/* Floors */}
                        {floors.map((floor) => {
                          const roomCount = Object.keys(byFloor[floor]).length;
                          const ruanganDupe =
                            addingRuanganFor?.buildingId === building.id &&
                            addingRuanganFor?.floor === floor &&
                            newRuanganName.trim() &&
                            roomExists(
                              building.id,
                              floor,
                              newRuanganName.trim(),
                            );
                          const isFloorEditing =
                            editingFloor?.bid === building.id &&
                            editingFloor?.floor === floor;
                          const flHasZones = floorHasZones(building.id, floor);

                          return (
                            <div
                              key={floor}
                              className="border-b border-slate-100 last:border-0"
                            >
                              {/* Floor header */}
                              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold text-slate-600">
                                    {fmtFloor(floor)}
                                  </span>
                                  <span
                                    className={`text-[12px] ${roomCount === 0 ? "text-amber-600" : "text-slate-400"}`}
                                  >
                                    {roomCount} ruangan
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingRuanganFor({
                                        buildingId: building.id,
                                        floor,
                                      });
                                      setNewRuanganName("");
                                    }}
                                    className="text-sm px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                                  >
                                    + Ruangan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFloor({
                                        bid: building.id,
                                        floor,
                                      });
                                      setEditFloorName(floor);
                                    }}
                                    className="text-sm px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>

                              {/* Edit floor form */}
                              {isFloorEditing && (
                                <div className="mx-4 my-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-2">
                                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Edit Lantai
                                  </p>
                                  <div className="flex gap-2 items-start">
                                    <input
                                      type="text"
                                      value={editFloorName}
                                      onChange={(e) =>
                                        setEditFloorName(e.target.value)
                                      }
                                      onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        handleRenameFloor(building.id, floor)
                                      }
                                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRenameFloor(building.id, floor)
                                      }
                                      disabled={!editFloorName.trim()}
                                      className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg disabled:opacity-40"
                                    >
                                      Simpan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingFloor(null)}
                                      className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                  {flHasZones ? (
                                    <div>
                                      <button
                                        type="button"
                                        disabled
                                        className="text-sm px-3 py-1 border border-slate-200 text-slate-400 rounded-lg cursor-not-allowed"
                                      >
                                        Hapus Lantai
                                      </button>
                                      <p className="text-xs text-slate-400 mt-1">
                                        Tidak bisa dihapus — hapus semua zona di
                                        lantai ini terlebih dahulu
                                      </p>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingFloor(null);
                                        /* floors auto-disappear when no zones */ setToast(
                                          {
                                            message: `${fmtFloor(floor)} dihapus`,
                                            type: "success",
                                          },
                                        );
                                        fetchBuildings();
                                      }}
                                      className="text-sm px-3 py-1 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                    >
                                      Hapus Lantai
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Add Ruangan form */}
                              {addingRuanganFor?.buildingId === building.id &&
                                addingRuanganFor?.floor === floor && (
                                  <div className="mx-4 my-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 space-y-1">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                      Nama ruangan
                                    </p>
                                    <div className="flex gap-2 items-start">
                                      <div className="flex-1">
                                        <input
                                          type="text"
                                          value={newRuanganName}
                                          onChange={(e) =>
                                            setNewRuanganName(e.target.value)
                                          }
                                          onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            !ruanganDupe &&
                                            handleAddRuangan(building.id, floor)
                                          }
                                          placeholder="e.g. Ruang Cafe, Lobby, Server Room"
                                          className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${ruanganDupe ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                        />
                                        {ruanganDupe && (
                                          <p className="text-xs text-red-500 mt-1">
                                            ⚠ {newRuanganName.trim()} sudah ada
                                            di lantai ini
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAddRuangan(building.id, floor)
                                        }
                                        disabled={
                                          !newRuanganName.trim() ||
                                          !!ruanganDupe
                                        }
                                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-40"
                                      >
                                        Simpan
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAddingRuanganFor(null)
                                        }
                                        className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  </div>
                                )}

                              {roomCount === 0 && (
                                <div className="px-6 py-3 text-sm text-slate-400">
                                  Belum ada ruangan.
                                </div>
                              )}

                              {/* Rooms */}
                              {Object.entries(byFloor[floor])
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([room, zones]) => {
                                  const acCount = (zones as any[]).filter(
                                    (z: any) => z.ac_unit,
                                  ).length;
                                  const zonaDupe =
                                    addingZonaFor?.buildingId === building.id &&
                                    addingZonaFor?.floor === floor &&
                                    addingZonaFor?.room === room &&
                                    newZonaLabel.trim() &&
                                    zoneExists(
                                      building.id,
                                      floor,
                                      room,
                                      newZonaLabel.trim(),
                                    );
                                  const isRoomEditing =
                                    editingRoom?.bid === building.id &&
                                    editingRoom?.floor === floor &&
                                    editingRoom?.room === room;
                                  const rmHasZones = roomHasZones(
                                    building.id,
                                    floor,
                                    room,
                                  );

                                  return (
                                    <div
                                      key={room}
                                      className="px-4 py-3 border-t border-slate-50"
                                    >
                                      {/* Room header */}
                                      <div className="flex items-center justify-between mb-2.5">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[13px] font-medium text-slate-700">
                                            {fmtRoom(room)}
                                          </span>
                                          <span
                                            className={`text-[12px] ${acCount === 0 ? "text-amber-600" : "text-slate-400"}`}
                                          >
                                            {acCount} unit AC
                                          </span>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const label =
                                                getNextZoneLabelLocal(
                                                  building.id,
                                                  floor,
                                                  room,
                                                );
                                              setNewZonaLabel(label);
                                              setAddingZonaFor({
                                                buildingId: building.id,
                                                floor,
                                                room,
                                              });
                                            }}
                                            className="text-sm px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                                          >
                                            + Zona
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingRoom({
                                                bid: building.id,
                                                floor,
                                                room,
                                              });
                                              setEditRoomName(room);
                                            }}
                                            className="text-sm px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
                                          >
                                            Edit
                                          </button>
                                        </div>
                                      </div>

                                      {/* Edit room form */}
                                      {isRoomEditing && (
                                        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-2">
                                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Edit Ruangan
                                          </p>
                                          <div className="flex gap-2 items-start">
                                            <input
                                              type="text"
                                              value={editRoomName}
                                              onChange={(e) =>
                                                setEditRoomName(e.target.value)
                                              }
                                              onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                handleRenameRoom(
                                                  building.id,
                                                  floor,
                                                  room,
                                                )
                                              }
                                              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleRenameRoom(
                                                  building.id,
                                                  floor,
                                                  room,
                                                )
                                              }
                                              disabled={!editRoomName.trim()}
                                              className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg disabled:opacity-40"
                                            >
                                              Simpan
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditingRoom(null)
                                              }
                                              className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                                            >
                                              Batal
                                            </button>
                                          </div>
                                          {rmHasZones ? (
                                            <div>
                                              <button
                                                type="button"
                                                disabled
                                                className="text-sm px-3 py-1 border border-slate-200 text-slate-400 rounded-lg cursor-not-allowed"
                                              >
                                                Hapus Ruangan
                                              </button>
                                              <p className="text-xs text-slate-400 mt-1">
                                                Tidak bisa dihapus — hapus semua
                                                zona di ruangan ini terlebih
                                                dahulu
                                              </p>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingRoom(null);
                                                setToast({
                                                  message: `${fmtRoom(room)} dihapus`,
                                                  type: "success",
                                                });
                                                fetchBuildings();
                                              }}
                                              className="text-sm px-3 py-1 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                            >
                                              Hapus Ruangan
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {/* Zones */}
                                      <div className="space-y-2 ml-1">
                                        {(zones as any[])
                                          .sort((a, b) =>
                                            (a.zone_label ?? "").localeCompare(
                                              b.zone_label ?? "",
                                            ),
                                          )
                                          .map((zone: any) => {
                                            const ac = zone.ac_unit;
                                            const isEditing =
                                              editingZone === zone.id;
                                            const isAddingAcHere =
                                              addingAcFor === zone.id;
                                            const editLabelDupe =
                                              isEditing &&
                                              editZonaLabel.trim() &&
                                              editZonaLabel.trim() !==
                                                zone.zone_label &&
                                              zoneExists(
                                                building.id,
                                                floor,
                                                room,
                                                editZonaLabel.trim(),
                                                zone.id,
                                              );

                                            return (
                                              <div key={zone.id}>
                                                <div
                                                  className={`flex items-center gap-3 px-3 py-[7px] rounded-lg border transition-colors ${isEditing ? "border-amber-300 bg-amber-50" : !ac ? "border-dashed border-slate-200 bg-slate-50/50" : "border-slate-100 bg-slate-50"}`}
                                                >
                                                  <span className="text-[13px] font-bold text-blue-600 w-5 text-center shrink-0">
                                                    {fmtZona(zone.zone_label)}
                                                  </span>
                                                  <div className="w-px h-4 bg-slate-200 shrink-0" />
                                                  {ac ? (
                                                    <>
                                                      <span className="text-[13px] text-slate-600 flex-1">
                                                        {ac.type} ·{" "}
                                                        {fmtPk(
                                                          ac.capacity_pk ?? "",
                                                        )}
                                                        {ac.brand?.name
                                                          ? ` · ${ac.brand.name}`
                                                          : ""}
                                                      </span>
                                                      <span className="text-[12px] text-slate-400 font-mono shrink-0">
                                                        {ac.ac_code}
                                                      </span>
                                                      {!isEditing && (
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            openEditZone(zone)
                                                          }
                                                          className="text-[12px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 shrink-0"
                                                        >
                                                          Edit
                                                        </button>
                                                      )}
                                                    </>
                                                  ) : (
                                                    <>
                                                      <span className="text-[13px] text-slate-400 italic flex-1">
                                                        Belum ada unit AC
                                                      </span>
                                                      {!isAddingAcHere &&
                                                        !isEditing && (
                                                          <button
                                                            type="button"
                                                            onClick={() => {
                                                              setAddingAcFor(
                                                                zone.id,
                                                              );
                                                              setNewAcType(
                                                                "Split",
                                                              );
                                                              setNewAcCapacity(
                                                                "1",
                                                              );
                                                              setNewAcBrandId(
                                                                "",
                                                              );
                                                            }}
                                                            className="text-[12px] px-2.5 py-1 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 shrink-0"
                                                          >
                                                            + Tambah AC
                                                          </button>
                                                        )}
                                                      {!isEditing && (
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            openEditZone(zone)
                                                          }
                                                          className="text-[12px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 shrink-0"
                                                        >
                                                          Edit
                                                        </button>
                                                      )}
                                                    </>
                                                  )}
                                                </div>

                                                {/* Zone edit form — split behavior */}
                                                {isEditing && (
                                                  <div className="mt-1.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-3">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                      Edit Zona{" "}
                                                      {zone.zone_label}
                                                    </p>
                                                    <div>
                                                      <label className="text-[12px] text-slate-500 block mb-1">
                                                        Label zona
                                                      </label>
                                                      <input
                                                        type="text"
                                                        value={editZonaLabel}
                                                        onChange={(e) =>
                                                          setEditZonaLabel(
                                                            e.target.value,
                                                          )
                                                        }
                                                        className={`w-24 px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 ${editLabelDupe ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                                      />
                                                      {editLabelDupe && (
                                                        <p className="text-xs text-red-500 mt-1">
                                                          ⚠ Zona{" "}
                                                          {editZonaLabel.trim()}{" "}
                                                          sudah ada
                                                        </p>
                                                      )}
                                                    </div>
                                                    {ac && (
                                                      <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                                          Spesifikasi AC
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-2">
                                                          <div>
                                                            <label className="text-[12px] text-slate-500 block mb-1">
                                                              Tipe
                                                            </label>
                                                            <select
                                                              value={editAcType}
                                                              onChange={(e) =>
                                                                setEditAcType(
                                                                  e.target
                                                                    .value,
                                                                )
                                                              }
                                                              className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                                            >
                                                              {[
                                                                "Split",
                                                                "Cassette",
                                                                "Standing",
                                                                "Ducted",
                                                                "Window",
                                                                "Portable",
                                                              ].map((t) => (
                                                                <option key={t}>
                                                                  {t}
                                                                </option>
                                                              ))}
                                                            </select>
                                                          </div>
                                                          <div>
                                                            <label className="text-[12px] text-slate-500 block mb-1">
                                                              Kapasitas
                                                            </label>
                                                            <select
                                                              value={
                                                                editAcCapacity
                                                              }
                                                              onChange={(e) =>
                                                                setEditAcCapacity(
                                                                  e.target
                                                                    .value,
                                                                )
                                                              }
                                                              className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                                            >
                                                              {AC_CAPACITIES.map(
                                                                (c) => (
                                                                  <option
                                                                    key={c}
                                                                    value={c}
                                                                  >
                                                                    {fmtPk(c)}
                                                                  </option>
                                                                ),
                                                              )}
                                                            </select>
                                                          </div>
                                                          <div>
                                                            <label className="text-[12px] text-slate-500 block mb-1">
                                                              Merek
                                                            </label>
                                                            <select
                                                              value={
                                                                editAcBrandId
                                                              }
                                                              onChange={(e) =>
                                                                setEditAcBrandId(
                                                                  e.target
                                                                    .value,
                                                                )
                                                              }
                                                              className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                                            >
                                                              <option value="">
                                                                — Pilih —
                                                              </option>
                                                              {(
                                                                brands ?? []
                                                              ).map(
                                                                (b: any) => (
                                                                  <option
                                                                    key={b.id}
                                                                    value={b.id}
                                                                  >
                                                                    {b.name}
                                                                  </option>
                                                                ),
                                                              )}
                                                            </select>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    )}
                                                    <div className="flex gap-2 items-center flex-wrap">
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleSaveEditZone(
                                                            zone,
                                                          )
                                                        }
                                                        disabled={
                                                          savingEdit ||
                                                          !editZonaLabel.trim() ||
                                                          !!editLabelDupe
                                                        }
                                                        className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg disabled:opacity-40 font-medium"
                                                      >
                                                        {savingEdit
                                                          ? "Menyimpan..."
                                                          : "Simpan"}
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setEditingZone(null)
                                                        }
                                                        className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                                                      >
                                                        Batal
                                                      </button>
                                                      {ac ? (
                                                        /* Filled zone: Hapus AC only (zone stays) */
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setConfirmDelete({
                                                              type: "zone" as any,
                                                              id: zone.id,
                                                              label: `AC di Zona ${zone.zone_label ?? "?"}`,
                                                            })
                                                          }
                                                          className="ml-auto px-3 py-2 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100"
                                                        >
                                                          Hapus AC
                                                        </button>
                                                      ) : (
                                                        /* Empty zone: Hapus Zona */
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            setConfirmDelete({
                                                              type: "zone",
                                                              id: zone.id,
                                                              label: `Zona ${zone.zone_label ?? "?"}`,
                                                            })
                                                          }
                                                          className="ml-auto px-3 py-2 border border-red-200 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100"
                                                        >
                                                          Hapus Zona
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Add AC form */}
                                                {isAddingAcHere && !ac && (
                                                  <div className="mt-1.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-2">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                      Zona {zone.zone_label} —
                                                      tambah unit AC
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                      {[
                                                        {
                                                          label: "Tipe *",
                                                          val: newAcType,
                                                          set: setNewAcType,
                                                          opts: [
                                                            "Split",
                                                            "Cassette",
                                                            "Standing",
                                                            "Ducted",
                                                            "Window",
                                                            "Portable",
                                                          ].map((t) => ({
                                                            v: t,
                                                            l: t,
                                                          })),
                                                        },
                                                        {
                                                          label: "Kapasitas *",
                                                          val: newAcCapacity,
                                                          set: setNewAcCapacity,
                                                          opts: AC_CAPACITIES.map(
                                                            (c: string) => ({
                                                              v: c,
                                                              l: fmtPk(c),
                                                            }),
                                                          ),
                                                        },
                                                      ].map(
                                                        ({
                                                          label,
                                                          val,
                                                          set,
                                                          opts,
                                                        }) => (
                                                          <div key={label}>
                                                            <label className="text-[12px] text-slate-500 block mb-1">
                                                              {label}
                                                            </label>
                                                            <select
                                                              value={val}
                                                              onChange={(e) =>
                                                                set(
                                                                  e.target
                                                                    .value,
                                                                )
                                                              }
                                                              className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                                            >
                                                              {opts.map((o) => (
                                                                <option
                                                                  key={o.v}
                                                                  value={o.v}
                                                                >
                                                                  {o.l}
                                                                </option>
                                                              ))}
                                                            </select>
                                                          </div>
                                                        ),
                                                      )}
                                                      <div>
                                                        <label className="text-[12px] text-slate-500 block mb-1">
                                                          Merek
                                                        </label>
                                                        <select
                                                          value={newAcBrandId}
                                                          onChange={(e) =>
                                                            setNewAcBrandId(
                                                              e.target.value,
                                                            )
                                                          }
                                                          className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                                        >
                                                          <option value="">
                                                            — Pilih —
                                                          </option>
                                                          {(brands ?? []).map(
                                                            (b: any) => (
                                                              <option
                                                                key={b.id}
                                                                value={b.id}
                                                              >
                                                                {b.name}
                                                              </option>
                                                            ),
                                                          )}
                                                        </select>
                                                      </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleAddAc(zone.id)
                                                        }
                                                        disabled={savingAc}
                                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg disabled:opacity-50 font-medium"
                                                      >
                                                        {savingAc
                                                          ? "Menyimpan..."
                                                          : "Simpan AC"}
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setAddingAcFor(null)
                                                        }
                                                        className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                                                      >
                                                        Batal
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>

                                      {/* Add Zona form */}
                                      {addingZonaFor?.buildingId ===
                                        building.id &&
                                        addingZonaFor?.floor === floor &&
                                        addingZonaFor?.room === room && (
                                          <div className="mt-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                              + Zona baru di {fmtRoom(room)}
                                            </p>
                                            <div className="flex gap-2 items-start">
                                              <div>
                                                <input
                                                  type="text"
                                                  value={newZonaLabel}
                                                  onChange={(e) =>
                                                    setNewZonaLabel(
                                                      e.target.value,
                                                    )
                                                  }
                                                  onKeyDown={(e) =>
                                                    e.key === "Enter" &&
                                                    !zonaDupe &&
                                                    handleAddZona(
                                                      building.id,
                                                      floor,
                                                      room,
                                                      newZonaLabel,
                                                    )
                                                  }
                                                  placeholder="A, B, C..."
                                                  className={`w-20 px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${zonaDupe ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                                />
                                                {zonaDupe && (
                                                  <p className="text-xs text-red-500 mt-1">
                                                    ⚠ Zona {newZonaLabel.trim()}{" "}
                                                    sudah ada
                                                  </p>
                                                )}
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleAddZona(
                                                    building.id,
                                                    floor,
                                                    room,
                                                    newZonaLabel,
                                                  )
                                                }
                                                disabled={
                                                  savingZona ||
                                                  !newZonaLabel.trim() ||
                                                  !!zonaDupe
                                                }
                                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-40"
                                              >
                                                {savingZona
                                                  ? "..."
                                                  : "Simpan Zona"}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setAddingZonaFor(null)
                                                }
                                                className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                                              >
                                                Batal
                                              </button>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                              Zona dibuat tanpa AC. Tambahkan AC
                                              setelah tersimpan.
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {buildings.length === 0 && !buildingsLoading && (
                    <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
                      <p className="text-slate-400 text-sm mb-3">
                        Belum ada gedung terdaftar.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddBuilding(true)}
                        className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        + Tambah gedung pertama
                      </button>
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
                    <>
                      {locationProjects
                        .slice(0, LOCATION_PROJECT_LIMIT)
                        .map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl"
                          >
                            <EntityPopover
                              trigger={
                                <button
                                  type="button"
                                  className="flex flex-col items-start hover:opacity-75 transition-opacity text-left"
                                >
                                  <p className="text-sm font-medium text-blue-600 underline decoration-dotted">
                                    {project.project_number}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {project.type} · {project.total_ac_units}{" "}
                                    unit AC
                                  </p>
                                </button>
                              }
                              config={{
                                kind: "project",
                                entityTitle: location?.name ?? "",
                                projectId: project.id,
                              }}
                            />
                            <StatusBadge status={project.status} />
                          </div>
                        ))}
                      {locationProjects.length > LOCATION_PROJECT_LIMIT && (
                        <Link
                          to="/projects"
                          className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2"
                        >
                          Lihat semua ({locationProjects.length} proyek) →
                        </Link>
                      )}
                    </>
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
                  {/* ── Map picker ── */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Koordinat lokasi
                    </p>
                    <LocationMapPicker
                      lat={location?.lat}
                      lng={location?.lng}
                      address={location?.address}
                      height="240px"
                      readonly={false}
                      onChange={async (lat, lng) => {
                        await locationRepository.updateLocation(locationId, {
                          lat,
                          lng,
                        });
                        queryClient.invalidateQueries({
                          queryKey: ["locations", "customer", customerId],
                        });
                      }}
                    />
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

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {confirmDelete && (
        <ConfirmDialog
          title={
            confirmDelete.type === "location"
              ? "Hapus Lokasi"
              : confirmDelete.type === "floor"
                ? "Hapus Lantai"
                : confirmDelete.type === "zone"
                  ? confirmDelete.id.startsWith("ac:")
                    ? "Hapus Unit AC"
                    : "Hapus Zona"
                  : "Hapus Ruangan"
          }
          message={
            confirmDelete.type === "location"
              ? `Lokasi "${confirmDelete.label}" dan semua gedung, lantai, ruangan, zona, serta unit AC di dalamnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
              : confirmDelete.type === "zone" &&
                  confirmDelete.label.startsWith("AC di Zona")
                ? `Unit AC di ${confirmDelete.label} akan dihapus. Zona tetap tersimpan sebagai slot kosong.`
                : confirmDelete.type === "zone"
                  ? `"${confirmDelete.label}" dan unit AC terkait akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
                  : `"${confirmDelete.label}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
          }
          confirmLabel={
            confirmDelete.type === "location" ? "Hapus Lokasi" : "Hapus"
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
