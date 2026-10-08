import {
import { fmtFloor, fmtRoom, fmtZona } from "@/utils/locationFormatters";
    getAcOverdueStatus,
    getOverdueColor,
    getOverdueLabel,
} from "@/hooks/useAppSettings";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

const fmtPk = (val: string) => val ? `${val} PK` : "—";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AcUnitNode {
  id: string;
  ac_code: string;
  type: string;
  capacity_pk: string;
  last_cleaned_at: string | null;
  is_active: boolean;
  building_unit?: {
    id: string;
    floor?: string;
    room?: string;
    zone_label?: string;
    floor: string | null;
    room: string;
  } | null;
  brand?: { name: string } | null;
}

interface AcTreeSelectorProps {
  acUnits: AcUnitNode[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  cleaningIntervalDays: number;
  dueSoonDays: number;
  showDetailLink?: boolean;
}

// ── Overdue dot ───────────────────────────────────────────────────────────────

function OverdueDot({
  lastCleanedAt,
  intervalDays,
  dueSoonDays,
}: {
  lastCleanedAt: string | null | undefined;
  intervalDays: number;
  dueSoonDays: number;
}) {
  const status = getAcOverdueStatus(lastCleanedAt, intervalDays, dueSoonDays);
  const color = getOverdueColor(status);
  const label = getOverdueLabel(status);

  return (
    <span
      title={label}
      className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`}
    />
  );
}

// ── Checkbox with indeterminate support ───────────────────────────────────────

function TreeCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-600 shrink-0"
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AcTreeSelector({
  acUnits,
  selectedIds,
  onChange,
  cleaningIntervalDays,
  dueSoonDays,
  showDetailLink = true,
}: AcTreeSelectorProps) {
  // ── Build tree structure ──────────────────────────────────────────────────

  const tree = useMemo(() => {
    const floors: Record<
      string,
      {
        label: string;
        rooms: Record<
          string,
          {
            label: string;
            unitId: string;
            acUnits: AcUnitNode[];
          }
        >;
      }
    > = {};

    const noRoom: AcUnitNode[] = [];

    acUnits.forEach((ac) => {
      if (!ac.building_unit) {
        noRoom.push(ac);
        return;
      }

      const floorKey = ac.building_unit.floor ?? "__no_floor__";
      const floorLabel = fmtFloor(ac.building_unit.floor ?? "Umum");
      const roomKey = ac.building_unit.id;
      const roomLabel = fmtRoom(ac.building_unit.room);

      if (!floors[floorKey]) {
        floors[floorKey] = { label: floorLabel, rooms: {} };
      }
      if (!floors[floorKey].rooms[roomKey]) {
        floors[floorKey].rooms[roomKey] = {
          label: roomLabel,
          unitId: ac.building_unit.id,
          acUnits: [],
        };
      }
      floors[floorKey].rooms[roomKey].acUnits.push(ac);
    });

    return { floors, noRoom };
  }, [acUnits]);

  // ── Selection helpers ─────────────────────────────────────────────────────

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function selectAll() {
    onChange(acUnits.filter((ac) => ac.is_active).map((ac) => ac.id));
  }

  function deselectAll() {
    onChange([]);
  }

  function toggleAc(acId: string, checked: boolean) {
    onChange(
      checked
        ? [...selectedIds, acId]
        : selectedIds.filter((id) => id !== acId),
    );
  }

  function toggleRoom(acUnitIds: string[], checked: boolean) {
    if (checked) {
      const next = new Set(selectedIds);
      acUnitIds.forEach((id) => next.add(id));
      onChange([...next]);
    } else {
      const remove = new Set(acUnitIds);
      onChange(selectedIds.filter((id) => !remove.has(id)));
    }
  }

  function toggleFloor(allAcIds: string[], checked: boolean) {
    toggleRoom(allAcIds, checked);
  }

  function roomState(acUnitIds: string[]): {
    checked: boolean;
    indeterminate: boolean;
  } {
    const checkedCount = acUnitIds.filter((id) => selectedSet.has(id)).length;
    return {
      checked: checkedCount === acUnitIds.length && acUnitIds.length > 0,
      indeterminate: checkedCount > 0 && checkedCount < acUnitIds.length,
    };
  }

  function floorState(allAcIds: string[]): {
    checked: boolean;
    indeterminate: boolean;
  } {
    return roomState(allAcIds);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const activeCount = acUnits.filter((ac) => ac.is_active).length;
  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-1">
      {/* Select all header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
        <TreeCheckbox
          checked={selectedCount === activeCount && activeCount > 0}
          indeterminate={selectedCount > 0 && selectedCount < activeCount}
          onChange={(checked) => (checked ? selectAll() : deselectAll())}
          label={`Pilih Semua (${activeCount} unit aktif)`}
        />
        <span className="text-xs text-slate-500">{selectedCount} dipilih</span>
      </div>

      {/* Floor groups */}
      {Object.entries(tree.floors).map(([floorKey, floor]) => {
        const allFloorAcIds = Object.values(floor.rooms).flatMap((r) =>
          r.acUnits.filter((ac) => ac.is_active).map((ac) => ac.id),
        );
        const fState = floorState(allFloorAcIds);

        return (
          <div key={floorKey} className="mb-3">
            {/* Floor row */}
            <div className="flex items-center gap-2 py-2 px-3 bg-slate-100 rounded-lg mb-1">
              <TreeCheckbox
                checked={fState.checked}
                indeterminate={fState.indeterminate}
                onChange={(checked) => toggleFloor(allFloorAcIds, checked)}
                label={floor.label}
              />
            </div>

            {/* Room groups */}
            <div className="ml-4 space-y-1">
              {Object.entries(floor.rooms).map(([roomKey, room]) => {
                const roomAcIds = room.acUnits
                  .filter((ac) => ac.is_active)
                  .map((ac) => ac.id);
                const rState = roomState(roomAcIds);

                return (
                  <div key={roomKey}>
                    {/* Room row */}
                    <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 rounded-lg mb-1">
                      <TreeCheckbox
                        checked={rState.checked}
                        indeterminate={rState.indeterminate}
                        onChange={(checked) => toggleRoom(roomAcIds, checked)}
                        label={room.label}
                      />
                      <span className="text-xs text-slate-400 ml-auto">
                        {room.acUnits.length} unit
                      </span>
                    </div>

                    {/* AC unit rows */}
                    <div className="ml-4 space-y-1">
                      {room.acUnits.map((ac) => (
                        <div
                          key={ac.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                            !ac.is_active ? "opacity-40" : "hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSet.has(ac.id)}
                            disabled={!ac.is_active}
                            onChange={(e) => toggleAc(ac.id, e.target.checked)}
                            className="w-4 h-4 accent-blue-600 shrink-0"
                          />
                          <OverdueDot
                            lastCleanedAt={ac.last_cleaned_at}
                            intervalDays={cleaningIntervalDays}
                            dueSoonDays={dueSoonDays}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-700">
                              {ac.brand?.name ?? "—"}
                              {" · "}
                              {ac.type}
                              {" · "}
                              {fmtPk(ac.capacity_pk)}
                            </span>
                            <span className="text-xs text-slate-400 ml-2 font-mono">
                              {ac.ac_code}
                            </span>
                          </div>
                          {!ac.is_active && (
                            <span className="text-xs text-slate-400">
                              Nonaktif
                            </span>
                          )}
                          {showDetailLink && (
                            <Link
                              to="/ac-units/$acUnitId"
                              params={{ acUnitId: ac.id }}
                              className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Detail →
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* No room group */}
      {tree.noRoom.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="text-xs text-amber-600 mb-2">
            ⚠ {tree.noRoom.length} unit AC belum memiliki ruangan
          </p>
          {tree.noRoom.map((ac) => (
            <div
              key={ac.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(ac.id)}
                onChange={(e) => toggleAc(ac.id, e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <OverdueDot
                lastCleanedAt={ac.last_cleaned_at}
                intervalDays={cleaningIntervalDays}
                dueSoonDays={dueSoonDays}
              />
              <span className="text-sm text-slate-700 flex-1">
                {ac.brand?.name} · {ac.type} · {fmtPk(ac.capacity_pk)}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {ac.ac_code}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}