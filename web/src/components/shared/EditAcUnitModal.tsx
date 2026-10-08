import { useAcBrands } from "@/hooks/useAcUnits";
import { useBuildingUnits } from "@/hooks/useLocations";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { AcCapacity, AcType, AcUnit } from "@/types/app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const AC_TYPES: AcType[] = [
  "Split",
  "Cassette",
  "Standing",
  "Ducted",
  "Window",
  "Portable",
];
const AC_CAPACITIES: AcCapacity[] = [
  "0.5",
  "0.75",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
];
const REASONS = [
  "Koreksi data",
  "Penggantian komponen",
  "Perubahan lokasi unit",
  "Lainnya",
];

export function EditAcUnitModal({
  acUnit,
  onClose,
}: {
  acUnit: AcUnit & {
    brand?: { id: string; name: string };
    building_unit?: any;
    location?: any;
  };
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: brands = [] } = useAcBrands();
  const { data: buildingUnits = [] } = useBuildingUnits(acUnit.location_id);

  const [type, setType] = useState<AcType>(acUnit.type);
  const [capacity, setCapacity] = useState<AcCapacity>(acUnit.capacity_pk);
  const [brandId, setBrandId] = useState(acUnit.brand_id ?? "");
  const [buildingUnitId, setBuildingUnitId] = useState(
    acUnit.building_unit_id ?? "",
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      // Fetch current for audit ✅
      const { data: current } = await supabase
        .from("ac_units")
        .select("type, capacity_pk, brand_id, building_unit_id")
        .eq("id", acUnit.id)
        .single();

      const updates: Record<string, any> = {};
      const logRows: any[] = [];
      const base = {
        entity_type: "ac_unit",
        entity_id: acUnit.id,
        edit_reason: reason,
        edit_notes: notes.trim() || null,
        edited_by: user?.id ?? "",
      };

      if (type !== current?.type) {
        updates.type = type;
        logRows.push({
          ...base,
          field_changed: "type",
          old_value: current?.type,
          new_value: type,
        });
      }
      if (capacity !== current?.capacity_pk) {
        updates.capacity_pk = capacity;
        logRows.push({
          ...base,
          field_changed: "capacity_pk",
          old_value: current?.capacity_pk,
          new_value: capacity,
        });
      }
      if (brandId && brandId !== current?.brand_id) {
        updates.brand_id = brandId;
        logRows.push({
          ...base,
          field_changed: "brand_id",
          old_value: current?.brand_id,
          new_value: brandId,
        });
      }
      if (buildingUnitId && buildingUnitId !== current?.building_unit_id) {
        updates.building_unit_id = buildingUnitId;
        logRows.push({
          ...base,
          field_changed: "building_unit_id",
          old_value: current?.building_unit_id,
          new_value: buildingUnitId,
        });
      }

      if (Object.keys(updates).length === 0) return;

      const { error: updateErr } = await supabase
        .from("ac_units")
        .update(updates)
        .eq("id", acUnit.id);
      if (updateErr) throw updateErr;

      if (logRows.length > 0) {
        await supabase.from("entity_edit_log").insert(logRows);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ac-unit", acUnit.id] });
      qc.invalidateQueries({
        queryKey: ["ac-units", "location", acUnit.location_id],
      });
      onClose();
    },
    onError: (e: any) => setError(e?.message ?? "Gagal menyimpan perubahan."),
  });

  const canSave =
    reason !== "" &&
    (reason !== "Lainnya" || notes.trim()) &&
    !mutation.isPending;

  // Group building units by floor
  const floorGroups = buildingUnits.reduce(
    (acc: Record<string, any[]>, bu: any) => {
      const floor = bu.floor ?? "Umum";
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(bu);
      return acc;
    },
    {},
  );

  const inputClass =
    "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-slate-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm mx-4 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-0">
          <p className="text-base font-medium text-slate-800 mb-0.5">
            Edit unit AC
          </p>
          <p className="text-xs font-mono text-slate-400 mb-5">
            {acUnit.ac_code}
          </p>
        </div>

        <div className="px-6 pb-0 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Tipe
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AcType)}
              className={inputClass}
            >
              {AC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Capacity */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Kapasitas (PK)
            </label>
            <select
              value={capacity}
              onChange={(e) => setCapacity(e.target.value as AcCapacity)}
              className={inputClass}
            >
              {AC_CAPACITIES.map((c) => (
                <option key={c} value={c}>
                  {c} PK
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Merek
            </label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={inputClass}
            >
              <option value="">Pilih merek...</option>
              {(brands as any[]).map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Building unit */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Ruangan
            </label>
            <select
              value={buildingUnitId}
              onChange={(e) => setBuildingUnitId(e.target.value)}
              className={inputClass}
            >
              <option value="">Pilih ruangan...</option>
              {Object.entries(floorGroups).map(
                ([floor, rooms]: [string, any[]]) => (
                  <optgroup
                    key={floor}
                    label={floor === "Umum" ? "Umum" : `Lantai ${floor}`}
                  >
                    {rooms.map((bu: any) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.display_name}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Alasan perubahan <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setNotes("");
              }}
              className={inputClass}
            >
              <option value="">Pilih alasan...</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === "Lainnya" && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">
                Keterangan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Wajib diisi..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none resize-none focus:border-slate-400"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 p-6 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            {mutation.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
