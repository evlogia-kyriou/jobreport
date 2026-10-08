/**
 * LocationListSection
 * Replaces the SearchableSelect for location picking in CreateProjectScreen.
 *
 * Layout: 1-column card list
 * Each card: name, street, kabupaten, type pill + AC count, availability
 * Blocked cards: grayed + reason + EntityPopover trigger
 */

import { EntityPopover } from "@/components/shared/EntityPopover";
import type { LocationAvailability } from "@/repositories/projectRepository";
import type { Location } from "@/types/app";

const LOCATION_TYPE_LABELS: Record<string, string> = {
  gedung_kantor: "Gedung Kantor",
  lantai_kantor: "Lantai Kantor",
  rumah: "Rumah",
  ruko: "Ruko",
  apartemen: "Apartemen",
  pabrik: "Pabrik",
  kios: "Kios",
  kosan: "Kosan",
  lainnya: "Lainnya",
};

interface Props {
  locations: Location[];
  blockMap: Map<string, LocationAvailability>;
  selectedId: string;
  onChange: (location: Location) => void;
}

export function LocationListSection({
  locations,
  blockMap,
  selectedId,
  onChange,
}: Props) {
  if (locations.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        Belum ada lokasi untuk pelanggan ini.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
      {locations.map((loc) => {
        const avail = blockMap.get(loc.id);
        const isBlocked = avail?.all_blocked === true;
        const isSelected = loc.id === selectedId;
        const acCount = avail?.total_ac_count ?? "—";
        const typeLabel = LOCATION_TYPE_LABELS[loc.type] ?? loc.type;

        return (
          <div
            key={loc.id}
            onClick={() => !isBlocked && onChange(loc)}
            className={[
              "flex items-start gap-3 px-4 py-3 border rounded-xl transition-colors",
              isSelected
                ? "border-blue-500 bg-blue-50"
                : isBlocked
                  ? "border-slate-100 bg-slate-50 cursor-not-allowed opacity-65"
                  : "border-slate-200 bg-white cursor-pointer hover:border-blue-300 hover:bg-blue-50/40",
            ].join(" ")}
          >
            {/* Radio */}
            <div
              className={[
                "mt-1 w-3.5 h-3.5 min-w-[14px] rounded-full border-[1.5px] flex items-center justify-center",
                isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300",
              ].join(" ")}
            >
              {isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>

            {/* Card body */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Location name */}
              <p
                className={`text-sm font-medium ${isBlocked ? "text-slate-400" : "text-slate-800"}`}
              >
                {loc.name}
              </p>

              {/* Street */}
              {loc.address && (
                <p
                  className={`text-xs truncate ${isBlocked ? "text-slate-400" : "text-slate-500"}`}
                >
                  {loc.address}
                </p>
              )}

              {/* Kabupaten */}
              {loc.kabupaten && (
                <p className="text-xs text-slate-400">{loc.kabupaten}</p>
              )}

              {/* Type + AC count */}
              <div className="flex items-center gap-2">
                <span className="inline-flex text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  {typeLabel}
                </span>
                <span className="text-xs text-slate-400">
                  {acCount} unit AC
                </span>
              </div>

              {/* Availability */}
              {!isBlocked ? (
                <p className="text-xs font-medium text-green-600">Tersedia ✓</p>
              ) : (
                <p className="text-xs text-red-500">
                  Tidak tersedia · Unit AC dalam pekerjaan aktif dan/atau sudah
                  dibersihkan ·{" "}
                  <EntityPopover
                    trigger={
                      <button
                        type="button"
                        className="underline decoration-dotted hover:text-red-600"
                      >
                        Lihat detail ↗
                      </button>
                    }
                    config={{ kind: "location", locationId: loc.id }}
                  />
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
