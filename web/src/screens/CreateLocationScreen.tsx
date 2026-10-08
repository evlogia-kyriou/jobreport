import {
  AddressFields,
  type AddressValues,
} from "@/components/shared/AddressFields";
import {
  KategoriFungsiIcon,
  TipeBangunanIcon,
} from "@/components/shared/LocationIcons";
import { PageLayout } from "@/components/shared/PageLayout";
import { useAcBrands } from "@/hooks/useAcUnits";
import { useCustomer } from "@/hooks/useCustomers";
import {
  useCreateLocation,
  useKategoriFungsi,
  useSearchBuildings,
  useTipeBangunan,
  useTipeBangunanGroups,
} from "@/hooks/useLocations";
import { supabase } from "@/lib/supabase";
import { buildingRepository } from "@/repositories/locationRepository";
import type { LocationType } from "@/types/app";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";

// ── Location type options ─────────────────────────────────────────────────────

const LOCATION_TYPES: {
  value: LocationType;
  label: string;
  icon: string;
  hasBuilding: boolean;
}[] = [
  { value: "rumah", label: "Rumah", icon: "🏠", hasBuilding: false },
  { value: "ruko", label: "Ruko", icon: "🏪", hasBuilding: false },
  { value: "apartemen", label: "Apartemen", icon: "🏢", hasBuilding: true },
  {
    value: "lantai_kantor",
    label: "Lantai Kantor",
    icon: "🏬",
    hasBuilding: true,
  },
  {
    value: "gedung_kantor",
    label: "Gedung Kantor",
    icon: "🏛️",
    hasBuilding: true,
  },
  { value: "kios", label: "Kios", icon: "🛒", hasBuilding: false },
  { value: "pabrik", label: "Pabrik", icon: "🏭", hasBuilding: false },
  { value: "kosan", label: "Kosan", icon: "🛏️", hasBuilding: false },
  { value: "lainnya", label: "Lainnya", icon: "📍", hasBuilding: false },
];

// ── Draft hierarchy for nested building setup ────────────────────────────────

interface DraftZone {
  id: string;
  label: string;
  acType?: string;
  acCapacity?: string;
  acBrandId?: string;
}
interface DraftRoom {
  id: string;
  name: string;
  zones: DraftZone[];
}
interface DraftFloor {
  id: string;
  name: string;
  rooms: DraftRoom[];
}
interface DraftBuilding {
  id: string;
  name: string;
  floors: DraftFloor[];
}

function localId() {
  return Math.random().toString(36).slice(2);
}

const AC_TYPES = [
  "Split",
  "Cassette",
  "Standing",
  "Ducted",
  "Window",
  "Portable",
];
const AC_CAPS: string[] = ["0.5", "0.75", "1", "1.5", "2", "2.5", "3"];
const fmtPk = (v: string) => `${v} PK`;

// ── Main screen ───────────────────────────────────────────────────────────────

export function CreateLocationScreen() {
  const { customerId } = useParams({ strict: false });
  const navigate = useNavigate();
  const createLocation = useCreateLocation();

  const { data: customer } = useCustomer(customerId);

  // ── Form state ────────────────────────────────────────────────────────────

  // New type fields
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [tipeBangunanId, setTipeBangunanId] = useState<string | null>(null);
  const [kategoriFungsiId, setKategoriFungsiId] = useState<string | null>(null);
  const [tipeBangunanLabel, setTipeBangunanLabel] = useState<string>("");
  const [tipeBangunanCustom, setTipeBangunanCustom] = useState<string>("");
  const [kategoriFungsiCustom, setKategoriFungsiCustom] = useState<string>("");
  const [selectedGroupIsLainnya, setSelectedGroupIsLainnya] = useState(false);
  // Legacy — kept for fn_location_name fallback during transition
  const locType = "lainnya" as const;
  const [addressValues, setAddressValues] = useState<AddressValues>({});
  const [buildingSearch, setBuildingSearch] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<
    string | undefined
  >();
  const [buildingFloor, setBuildingFloor] = useState("");

  // Region cascade
  // Survey
  const [hasSurvey, setHasSurvey] = useState(false);
  const [surveyNotes, setSurveyNotes] = useState("");
  const [locNotes, setLocNotes] = useState("");

  // Nested building hierarchy draft state
  const [draftBuildings, setDraftBuildings] = useState<DraftBuilding[]>([]);
  const { data: brands } = useAcBrands();

  // Add building form
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  // Add floor form
  const [addingLantaiFor, setAddingLantaiFor] = useState<string | null>(null);
  const [newLantaiName, setNewLantaiName] = useState("");
  // Add room form
  const [addingRuanganFor, setAddingRuanganFor] = useState<{
    bid: string;
    fid: string;
  } | null>(null);
  const [newRuanganName, setNewRuanganName] = useState("");
  // Add zone form
  const [addingZonaFor, setAddingZonaFor] = useState<{
    bid: string;
    fid: string;
    rid: string;
  } | null>(null);
  const [newZonaLabel, setNewZonaLabel] = useState("A");
  // Add/edit AC on zone
  const [zonaAcFor, setZonaAcFor] = useState<{
    bid: string;
    fid: string;
    rid: string;
    zid: string;
  } | null>(null);
  const [zonaAcType, setZonaAcType] = useState("Split");
  const [zonaAcCapacity, setZonaAcCapacity] = useState("1");
  const [zonaAcBrandId, setZonaAcBrandId] = useState("");

  // Edit names in draft
  const [editingBld, setEditingBld] = useState<string | null>(null);
  const [editBldName, setEditBldName] = useState("");
  const [editingFl, setEditingFl] = useState<{
    bid: string;
    fid: string;
  } | null>(null);
  const [editFlName, setEditFlName] = useState("");
  const [editingRm, setEditingRm] = useState<{
    bid: string;
    fid: string;
    rid: string;
  } | null>(null);
  const [editRmName, setEditRmName] = useState("");

  // Draft helpers
  function getNextZoneLabel(
    rooms: DraftRoom[],
    roomId: string,
    label?: string,
  ): string {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return "A";
    const used = new Set(room.zones.map((z) => z.label));
    if (label && !used.has(label)) return label;
    for (let i = 0; i < 26; i++) {
      const l = String.fromCharCode(65 + i);
      if (!used.has(l)) return l;
    }
    return `Z${room.zones.length + 1}`;
  }

  function addDraftBuilding() {
    if (!newBuildingName.trim()) return;
    setDraftBuildings((prev) => [
      ...prev,
      { id: localId(), name: newBuildingName.trim(), floors: [] },
    ]);
    setNewBuildingName("");
    setShowAddBuilding(false);
  }

  function addDraftFloor(buildingId: string) {
    if (!newLantaiName.trim()) return;
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== buildingId
          ? b
          : {
              ...b,
              floors: [
                ...b.floors,
                { id: localId(), name: newLantaiName.trim(), rooms: [] },
              ],
            },
      ),
    );
    setNewLantaiName("");
    setAddingLantaiFor(null);
  }

  function addDraftRoom(buildingId: string, floorId: string) {
    if (!newRuanganName.trim()) return;
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== buildingId
          ? b
          : {
              ...b,
              floors: b.floors.map((f) =>
                f.id !== floorId
                  ? f
                  : {
                      ...f,
                      rooms: [
                        ...f.rooms,
                        {
                          id: localId(),
                          name: newRuanganName.trim(),
                          zones: [],
                        },
                      ],
                    },
              ),
            },
      ),
    );
    setNewRuanganName("");
    setAddingRuanganFor(null);
  }

  function addDraftZone(buildingId: string, floorId: string, roomId: string) {
    if (!newZonaLabel.trim()) return;
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== buildingId
          ? b
          : {
              ...b,
              floors: b.floors.map((f) =>
                f.id !== floorId
                  ? f
                  : {
                      ...f,
                      rooms: f.rooms.map((r) =>
                        r.id !== roomId
                          ? r
                          : {
                              ...r,
                              zones: [
                                ...r.zones,
                                { id: localId(), label: newZonaLabel.trim() },
                              ],
                            },
                      ),
                    },
              ),
            },
      ),
    );
    setNewZonaLabel("A");
    setAddingZonaFor(null);
  }

  function saveZoneAc(
    buildingId: string,
    floorId: string,
    roomId: string,
    zoneId: string,
    clear = false,
  ) {
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== buildingId
          ? b
          : {
              ...b,
              floors: b.floors.map((f) =>
                f.id !== floorId
                  ? f
                  : {
                      ...f,
                      rooms: f.rooms.map((r) =>
                        r.id !== roomId
                          ? r
                          : {
                              ...r,
                              zones: r.zones.map((z) =>
                                z.id !== zoneId
                                  ? z
                                  : clear
                                    ? {
                                        ...z,
                                        acType: undefined,
                                        acCapacity: undefined,
                                        acBrandId: undefined,
                                      }
                                    : {
                                        ...z,
                                        acType: zonaAcType,
                                        acCapacity: zonaAcCapacity,
                                        acBrandId: zonaAcBrandId || undefined,
                                      },
                              ),
                            },
                      ),
                    },
              ),
            },
      ),
    );
    setZonaAcFor(null);
  }

  function deleteZone(
    buildingId: string,
    floorId: string,
    roomId: string,
    zoneId: string,
  ) {
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== buildingId
          ? b
          : {
              ...b,
              floors: b.floors.map((f) =>
                f.id !== floorId
                  ? f
                  : {
                      ...f,
                      rooms: f.rooms.map((r) =>
                        r.id !== roomId
                          ? r
                          : {
                              ...r,
                              zones: r.zones.filter((z) => z.id !== zoneId),
                            },
                      ),
                    },
              ),
            },
      ),
    );
  }

  // Draft rename helpers
  function renameDraftBuilding(bid: string, name: string) {
    setDraftBuildings((prev) =>
      prev.map((b) => (b.id !== bid ? b : { ...b, name })),
    );
    setEditingBld(null);
  }
  function renameDraftFloor(bid: string, fid: string, name: string) {
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== bid
          ? b
          : {
              ...b,
              floors: b.floors.map((f) => (f.id !== fid ? f : { ...f, name })),
            },
      ),
    );
    setEditingFl(null);
  }
  function renameDraftRoom(
    bid: string,
    fid: string,
    rid: string,
    name: string,
  ) {
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== bid
          ? b
          : {
              ...b,
              floors: b.floors.map((f) =>
                f.id !== fid
                  ? f
                  : {
                      ...f,
                      rooms: f.rooms.map((r) =>
                        r.id !== rid ? r : { ...r, name },
                      ),
                    },
              ),
            },
      ),
    );
    setEditingRm(null);
  }
  function deleteDraftBuilding(bid: string) {
    setDraftBuildings((prev) => prev.filter((b) => b.id !== bid));
    setEditingBld(null);
  }
  function deleteDraftFloor(bid: string, fid: string) {
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== bid
          ? b
          : { ...b, floors: b.floors.filter((f) => f.id !== fid) },
      ),
    );
    setEditingFl(null);
  }
  function deleteDraftRoom(bid: string, fid: string, rid: string) {
    setDraftBuildings((prev) =>
      prev.map((b) =>
        b.id !== bid
          ? b
          : {
              ...b,
              floors: b.floors.map((f) =>
                f.id !== fid
                  ? f
                  : { ...f, rooms: f.rooms.filter((r) => r.id !== rid) },
              ),
            },
      ),
    );
    setEditingRm(null);
  }
  function draftBuildingHasZones(bid: string): boolean {
    const b = draftBuildings.find((b) => b.id === bid);
    return !!b?.floors.some((f) => f.rooms.some((r) => r.zones.length > 0));
  }
  function draftFloorHasZones(bid: string, fid: string): boolean {
    const b = draftBuildings.find((b) => b.id === bid);
    const f = b?.floors.find((f) => f.id === fid);
    return !!f?.rooms.some((r) => r.zones.length > 0);
  }
  function draftRoomHasZones(bid: string, fid: string, rid: string): boolean {
    const b = draftBuildings.find((b) => b.id === bid);
    const f = b?.floors.find((f) => f.id === fid);
    const r = f?.rooms.find((r) => r.id === rid);
    return (r?.zones.length ?? 0) > 0;
  }

  // Duplicate checks in draft state
  function draftFloorExists(buildingId: string, name: string): boolean {
    const b = draftBuildings.find((b) => b.id === buildingId);
    return !!b?.floors.some((f) => f.name === name);
  }
  function draftRoomExists(
    buildingId: string,
    floorId: string,
    name: string,
  ): boolean {
    const b = draftBuildings.find((b) => b.id === buildingId);
    const f = b?.floors.find((f) => f.id === floorId);
    return !!f?.rooms.some((r) => r.name === name);
  }
  function draftZoneExists(
    buildingId: string,
    floorId: string,
    roomId: string,
    label: string,
    excludeId?: string,
  ): boolean {
    const b = draftBuildings.find((b) => b.id === buildingId);
    const f = b?.floors.find((f) => f.id === floorId);
    const r = f?.rooms.find((r) => r.id === roomId);
    return !!r?.zones
      .filter((z) => z.id !== excludeId)
      .some((z) => z.label === label);
  }

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Region data ───────────────────────────────────────────────────────────

  // ── Building search ───────────────────────────────────────────────────────

  const { data: buildings } = useSearchBuildings(buildingSearch);
  // Reference data
  const { data: tipeBangunanGroups } = useTipeBangunanGroups();
  const { data: allTipeBangunan } = useTipeBangunan();
  const { data: kategoriFungsiList } = useKategoriFungsi();

  // Types in the selected group
  const typesInGroup = selectedGroupId
    ? (allTipeBangunan ?? []).filter((t) => t.group_id === selectedGroupId)
    : [];

  // Legacy compat
  const selectedType = null;

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      !addressValues.province ||
      !addressValues.kabupaten ||
      !addressValues.kecamatan ||
      !addressValues.kelurahan
    ) {
      setError("Lengkapi wilayah terlebih dahulu.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create location
      const location = await createLocation.mutateAsync({
        customer_id: customerId,
        type: locType,
        tipe_bangunan_id: tipeBangunanId ?? undefined,
        tipe_bangunan_custom: tipeBangunanCustom.trim() || undefined,
        kategori_fungsi_id: kategoriFungsiId ?? undefined,
        kategori_fungsi_custom: kategoriFungsiCustom.trim() || undefined,
        buildings_registry_id: selectedBuildingId,
        building_floor: buildingFloor || undefined,
        address: "", // rebuilt by DB trigger
        address_prefix: addressValues.address_prefix,
        address_street: addressValues.address_street,
        address_number: addressValues.address_number,
        address_rt: addressValues.address_rt,
        address_rw: addressValues.address_rw,
        address_block_unit: addressValues.address_block_unit,
        province: addressValues.province ?? "",
        kabupaten: addressValues.kabupaten ?? "",
        kecamatan: addressValues.kecamatan ?? "",
        kelurahan: addressValues.kelurahan ?? "",
        postal_code: addressValues.postal_code ?? "",
        has_survey: hasSurvey,
        survey_notes: surveyNotes.trim() || undefined,
        notes: locNotes.trim() || undefined,
      });

      // 2. Create nested buildings / zones / ACs from draft
      for (const db of draftBuildings) {
        const building = await buildingRepository.create(location.id, db.name);
        for (const fl of db.floors) {
          for (const rm of fl.rooms) {
            for (const zone of rm.zones) {
              const { data: bu, error: buErr } = await supabase
                .from("building_units")
                .insert({
                  location_id: location.id,
                  building_id: building.id,
                  floor: fl.name,
                  room: rm.name,
                  zone_label: zone.label,
                })
                .select()
                .single();
              if (buErr) throw buErr;
              if (zone.acType && zone.acCapacity) {
                await supabase.from("ac_units").insert({
                  location_id: location.id,
                  building_unit_id: bu.id,
                  type: zone.acType,
                  capacity_pk: zone.acCapacity,
                  brand_id: zone.acBrandId ?? null,
                  unit_label: "1",
                  is_active: true,
                });
              }
            }
          }
        }
      }

      navigate({
        to: "/customers/$customerId",
        params: { customerId },
      });
    } catch (err: any) {
      setError(err.message ?? "Gagal membuat lokasi.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="Tambah Lokasi"
      subtitle={customer ? `untuk ${customer.name}` : ""}
      action={
        <Link
          to="/customers/$customerId"
          params={{ customerId }}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          Batalkan
        </Link>
      }
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            (e.target as HTMLElement).tagName !== "BUTTON"
          )
            e.preventDefault();
        }}
      >
        <div className="grid grid-cols-3 gap-6">
          {/* Left — main form */}
          <div className="col-span-2 space-y-6">
            {/* Tipe Bangunan — Step 1: pick group */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-1">
                Tipe Bangunan
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Pilih kelompok bangunan, lalu tipe spesifik
              </p>

              {/* Step 1 — Group cards */}
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Langkah 1 — Kelompok
              </p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(tipeBangunanGroups ?? []).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      const isLainnya = g.label === "Lainnya";
                      setSelectedGroupId(g.id);
                      setSelectedGroupIsLainnya(isLainnya);
                      setTipeBangunanCustom("");
                      if (isLainnya) {
                        // Auto-select the Lainnya type in this group
                        const lainnyaType = (allTipeBangunan ?? []).find(
                          (t) => t.group_id === g.id && t.label === "Lainnya",
                        );
                        setTipeBangunanId(lainnyaType?.id ?? null);
                        setTipeBangunanLabel("Lainnya");
                      } else {
                        setTipeBangunanId(null);
                        setTipeBangunanLabel("");
                      }
                    }}
                    className={`px-3 py-3 rounded-xl border-2 text-left transition-colors ${
                      selectedGroupId === g.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p
                      className={`text-xs font-medium ${
                        selectedGroupId === g.id
                          ? "text-blue-700"
                          : "text-slate-700"
                      }`}
                    >
                      {g.label}
                    </p>
                  </button>
                ))}
              </div>

              {/* Step 2 — Types in selected group OR free text for Lainnya */}
              {selectedGroupId &&
                (selectedGroupIsLainnya ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Langkah 2 — Sebutkan tipe bangunan
                    </p>
                    <input
                      type="text"
                      value={tipeBangunanCustom}
                      onChange={(e) => setTipeBangunanCustom(e.target.value)}
                      placeholder="Contoh: Pesantren, Rusun, Asrama, Panti Asuhan..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      Tipe bangunan yang belum terdaftar dalam daftar yang ada
                    </p>
                  </div>
                ) : (
                  typesInGroup.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                        Langkah 2 — Tipe spesifik
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {typesInGroup.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTipeBangunanId(t.id);
                              setTipeBangunanLabel(t.label);
                            }}
                            className={`px-3 py-3 rounded-xl border-2 text-center transition-colors flex flex-col items-center gap-1 ${
                              tipeBangunanId === t.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <TipeBangunanIcon label={t.label} size={24} />
                            <p
                              className={`text-xs font-medium leading-tight ${
                                tipeBangunanId === t.id
                                  ? "text-blue-700"
                                  : "text-slate-700"
                              }`}
                            >
                              {t.label}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )
                ))}

              {tipeBangunanId && (
                <p className="text-xs text-blue-600 mt-3 font-medium">
                  ✓ Dipilih:{" "}
                  {selectedGroupIsLainnya && tipeBangunanCustom
                    ? `Lainnya — "${tipeBangunanCustom}"`
                    : tipeBangunanLabel}
                </p>
              )}
            </div>

            {/* Kategori Fungsi — single step, 4-column grid */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-1">
                Kategori Fungsi
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Kegunaan utama lokasi ini
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(kategoriFungsiList ?? []).map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKategoriFungsiId(k.id)}
                    className={`px-3 py-3 rounded-xl border-2 text-center transition-colors flex flex-col items-center gap-1 ${
                      kategoriFungsiId === k.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <KategoriFungsiIcon label={k.label} size={22} />
                    <p
                      className={`text-[11px] font-medium leading-tight ${
                        kategoriFungsiId === k.id
                          ? "text-blue-700"
                          : "text-slate-700"
                      }`}
                    >
                      {k.label}
                    </p>
                  </button>
                ))}
              </div>

              {/* Lainnya free text for Kategori Fungsi */}
              {kategoriFungsiList?.find((k) => k.id === kategoriFungsiId)
                ?.label === "Lainnya" && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={kategoriFungsiCustom}
                    onChange={(e) => setKategoriFungsiCustom(e.target.value)}
                    placeholder="Contoh: Sosial, Komunitas, Pertanian, Maritim..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    Kategori fungsi yang belum terdaftar dalam daftar yang ada
                  </p>
                </div>
              )}
            </div>

            {/* Building registry (legacy — hidden until needed) */}
            {false && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-800 mb-4">
                  Gedung / Kompleks
                  <span className="text-slate-400 font-normal ml-1 text-sm">
                    (opsional)
                  </span>
                </h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={buildingSearch}
                    onChange={(e) => setBuildingSearch(e.target.value)}
                    placeholder="Cari nama gedung..."
                    className={inputClass}
                  />

                  {buildings && buildings.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      {buildings.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBuildingId(b.id);
                            setBuildingSearch(b.name);
                            setAddressValues((prev) => ({
                              ...prev,
                              address_street: b.address,
                              province: b.province,
                              kabupaten: b.kabupaten,
                              kecamatan: b.kecamatan,
                              kelurahan: b.kelurahan,
                              postal_code: b.postal_code,
                            }));
                          }}
                          className={`w-full text-left px-4 py-3
                                                                  text-sm hover:bg-slate-50
                                                                  border-b border-slate-100
                                                                  last:border-0 ${
                                                                    selectedBuildingId ===
                                                                    b.id
                                                                      ? "bg-blue-50 text-blue-700"
                                                                      : "text-slate-700"
                                                                  }`}
                        >
                          <p className="font-medium">{b.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {b.address}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedBuildingId && (
                    <Field label="Lantai / Unit">
                      <input
                        type="text"
                        value={buildingFloor}
                        onChange={(e) => setBuildingFloor(e.target.value)}
                        placeholder="Lantai 3, Lantai B2"
                        className={inputClass}
                      />
                    </Field>
                  )}
                </div>
              </div>
            )}

            {/* Address — structured */}
            <AddressFields
              values={addressValues}
              onChange={(updated) =>
                setAddressValues((prev) => ({ ...prev, ...updated }))
              }
            />

            {/* Survey */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">
                Survey Lokasi
              </h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSurvey}
                  onChange={(e) => setHasSurvey(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700">
                  Lokasi sudah disurvey
                </span>
              </label>
              {hasSurvey && (
                <div className="mt-3">
                  <textarea
                    value={surveyNotes}
                    onChange={(e) => setSurveyNotes(e.target.value)}
                    placeholder="Catatan hasil survey..."
                    rows={3}
                    className={`${inputClass} resize-none mt-2`}
                  />
                </div>
              )}
            </div>

            {/* Building units */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    Gedung & Unit AC
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Opsional — bisa ditambahkan setelah lokasi tersimpan
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    {draftBuildings.length} gedung
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddBuilding(true)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                  >
                    + Gedung
                  </button>
                </div>
              </div>

              {/* Add Building form */}
              {showAddBuilding && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Nama gedung
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBuildingName}
                      onChange={(e) => setNewBuildingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addDraftBuilding()}
                      placeholder="e.g. Gedung Utama, Tower A"
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addDraftBuilding}
                      disabled={!newBuildingName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50"
                    >
                      Simpan
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

              {/* Draft buildings */}
              <div className="space-y-3">
                {draftBuildings.map((db) => {
                  const floorCount = db.floors.length;
                  const totalAc = db.floors
                    .flatMap((f) => f.rooms.flatMap((r) => r.zones))
                    .filter((z) => z.acType).length;
                  const lantaiDupe =
                    addingLantaiFor === db.id &&
                    newLantaiName.trim() &&
                    draftFloorExists(db.id, newLantaiName.trim());
                  const isBldEditing = editingBld === db.id;
                  const bldHasZones = draftBuildingHasZones(db.id);

                  return (
                    <div
                      key={db.id}
                      className="border border-slate-200 rounded-xl overflow-hidden"
                    >
                      {/* Building header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-slate-800">
                            {db.name}
                          </span>
                          <span
                            className={`text-[12px] px-2 py-0.5 rounded-full border ${floorCount === 0 ? "text-amber-600 border-amber-300 bg-amber-50" : "text-slate-500 border-slate-200 bg-white"}`}
                          >
                            {floorCount} lantai
                          </span>
                          {totalAc > 0 && (
                            <span className="text-[12px] text-slate-400">
                              {totalAc} unit AC
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAddingLantaiFor(db.id);
                              setNewLantaiName("");
                            }}
                            className="text-sm px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            + Lantai
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBld(db.id);
                              setEditBldName(db.name);
                            }}
                            className="text-sm px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                        </div>
                      </div>

                      {/* Edit building */}
                      {isBldEditing && (
                        <div className="mx-4 my-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-2">
                          <p className="text-xs font-medium text-slate-500 uppercase">
                            Edit Gedung
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editBldName}
                              onChange={(e) => setEditBldName(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                renameDraftBuilding(db.id, editBldName)
                              }
                              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                renameDraftBuilding(db.id, editBldName)
                              }
                              disabled={!editBldName.trim()}
                              className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg disabled:opacity-40"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBld(null)}
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
                                className="text-sm px-3 py-1 border border-slate-200 text-slate-400 rounded-lg cursor-not-allowed"
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
                              onClick={() => deleteDraftBuilding(db.id)}
                              className="text-sm px-3 py-1 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                            >
                              Hapus Gedung
                            </button>
                          )}
                        </div>
                      )}

                      {/* Add Lantai form */}
                      {addingLantaiFor === db.id && (
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
                                  e.key === "Enter" && addDraftFloor(db.id)
                                }
                                placeholder="e.g. Lantai 1, Rooftop"
                                className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${lantaiDupe ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                              />
                              {lantaiDupe && (
                                <p className="text-xs text-red-500 mt-1">
                                  ⚠ {newLantaiName.trim()} sudah ada
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => addDraftFloor(db.id)}
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

                      {db.floors.length === 0 && (
                        <div className="px-4 py-4 text-center text-sm text-slate-400">
                          Belum ada lantai.
                        </div>
                      )}

                      {/* Floors */}
                      {db.floors.map((fl) => {
                        const roomCount = fl.rooms.length;
                        const ruanganDupe =
                          addingRuanganFor?.bid === db.id &&
                          addingRuanganFor?.fid === fl.id &&
                          newRuanganName.trim() &&
                          draftRoomExists(db.id, fl.id, newRuanganName.trim());
                        const isFlEditing =
                          editingFl?.bid === db.id && editingFl?.fid === fl.id;
                        const flHasZones = draftFloorHasZones(db.id, fl.id);

                        return (
                          <div
                            key={fl.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-50/70">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-slate-600">
                                  {fl.name}
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
                                      bid: db.id,
                                      fid: fl.id,
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
                                    setEditingFl({ bid: db.id, fid: fl.id });
                                    setEditFlName(fl.name);
                                  }}
                                  className="text-sm px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>

                            {/* Edit floor */}
                            {isFlEditing && (
                              <div className="mx-4 my-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-2">
                                <p className="text-xs font-medium text-slate-500 uppercase">
                                  Edit Lantai
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={editFlName}
                                    onChange={(e) =>
                                      setEditFlName(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                      e.key === "Enter" &&
                                      renameDraftFloor(db.id, fl.id, editFlName)
                                    }
                                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      renameDraftFloor(db.id, fl.id, editFlName)
                                    }
                                    disabled={!editFlName.trim()}
                                    className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg disabled:opacity-40"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingFl(null)}
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
                                    onClick={() =>
                                      deleteDraftFloor(db.id, fl.id)
                                    }
                                    className="text-sm px-3 py-1 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                  >
                                    Hapus Lantai
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Add Ruangan form */}
                            {addingRuanganFor?.bid === db.id &&
                              addingRuanganFor?.fid === fl.id && (
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
                                          addDraftRoom(db.id, fl.id)
                                        }
                                        placeholder="e.g. Ruang Tamu, Kamar Utama"
                                        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${ruanganDupe ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                      />
                                      {ruanganDupe && (
                                        <p className="text-xs text-red-500 mt-1">
                                          ⚠ {newRuanganName.trim()} sudah ada
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => addDraftRoom(db.id, fl.id)}
                                      disabled={
                                        !newRuanganName.trim() || !!ruanganDupe
                                      }
                                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-40"
                                    >
                                      Simpan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAddingRuanganFor(null)}
                                      className="px-3 py-2 border border-slate-200 text-slate-500 text-sm rounded-lg"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}

                            {fl.rooms.length === 0 && (
                              <div className="px-6 py-3 text-sm text-slate-400">
                                Belum ada ruangan.
                              </div>
                            )}

                            {/* Rooms */}
                            {fl.rooms.map((rm) => {
                              const acCount = rm.zones.filter(
                                (z) => z.acType,
                              ).length;
                              const zonaDupe =
                                addingZonaFor?.bid === db.id &&
                                addingZonaFor?.fid === fl.id &&
                                addingZonaFor?.rid === rm.id &&
                                newZonaLabel.trim() &&
                                draftZoneExists(
                                  db.id,
                                  fl.id,
                                  rm.id,
                                  newZonaLabel.trim(),
                                );
                              const isRmEditing =
                                editingRm?.bid === db.id &&
                                editingRm?.fid === fl.id &&
                                editingRm?.rid === rm.id;
                              const rmHasZones = draftRoomHasZones(
                                db.id,
                                fl.id,
                                rm.id,
                              );

                              return (
                                <div
                                  key={rm.id}
                                  className="px-4 py-3 border-t border-slate-50"
                                >
                                  <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[13px] font-medium text-slate-700">
                                        {rm.name}
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
                                          const lbl = getNextZoneLabel(
                                            fl.rooms,
                                            rm.id,
                                          );
                                          setNewZonaLabel(lbl);
                                          setAddingZonaFor({
                                            bid: db.id,
                                            fid: fl.id,
                                            rid: rm.id,
                                          });
                                        }}
                                        className="text-sm px-2 py-0.5 rounded border border-slate-200 text-slate-500"
                                      >
                                        + Zona
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingRm({
                                            bid: db.id,
                                            fid: fl.id,
                                            rid: rm.id,
                                          });
                                          setEditRmName(rm.name);
                                        }}
                                        className="text-sm px-2 py-0.5 rounded border border-slate-200 text-slate-500"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>

                                  {/* Edit room */}
                                  {isRmEditing && (
                                    <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-2">
                                      <p className="text-xs font-medium text-slate-500 uppercase">
                                        Edit Ruangan
                                      </p>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={editRmName}
                                          onChange={(e) =>
                                            setEditRmName(e.target.value)
                                          }
                                          onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            renameDraftRoom(
                                              db.id,
                                              fl.id,
                                              rm.id,
                                              editRmName,
                                            )
                                          }
                                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            renameDraftRoom(
                                              db.id,
                                              fl.id,
                                              rm.id,
                                              editRmName,
                                            )
                                          }
                                          disabled={!editRmName.trim()}
                                          className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg disabled:opacity-40"
                                        >
                                          Simpan
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingRm(null)}
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
                                            zona di ruangan ini terlebih dahulu
                                          </p>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteDraftRoom(db.id, fl.id, rm.id)
                                          }
                                          className="text-sm px-3 py-1 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                        >
                                          Hapus Ruangan
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Zones */}
                                  <div className="space-y-2 ml-1">
                                    {rm.zones.map((zone) => {
                                      const isAddingAc =
                                        zonaAcFor?.bid === db.id &&
                                        zonaAcFor?.fid === fl.id &&
                                        zonaAcFor?.rid === rm.id &&
                                        zonaAcFor?.zid === zone.id;
                                      return (
                                        <div key={zone.id}>
                                          <div
                                            className={`flex items-center gap-3 px-3 py-[7px] rounded-lg border ${zone.acType ? "border-slate-100 bg-slate-50" : "border-dashed border-slate-200 bg-transparent"}`}
                                          >
                                            <span className="text-[13px] font-bold text-blue-600 w-5 text-center shrink-0">
                                              {zone.label}
                                            </span>
                                            <div className="w-px h-4 bg-slate-200 shrink-0" />
                                            {zone.acType ? (
                                              <>
                                                <span className="text-[13px] text-slate-600 flex-1">
                                                  {zone.acType} ·{" "}
                                                  {fmtPk(zone.acCapacity ?? "")}
                                                  {zone.acBrandId &&
                                                  brands?.find(
                                                    (b: any) =>
                                                      b.id === zone.acBrandId,
                                                  )?.name
                                                    ? ` · ${brands.find((b: any) => b.id === zone.acBrandId)?.name}`
                                                    : ""}
                                                </span>
                                                {/* Filled: Hapus AC (keep zone) or edit AC */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setZonaAcType(zone.acType!);
                                                    setZonaAcCapacity(
                                                      zone.acCapacity!,
                                                    );
                                                    setZonaAcBrandId(
                                                      zone.acBrandId ?? "",
                                                    );
                                                    setZonaAcFor({
                                                      bid: db.id,
                                                      fid: fl.id,
                                                      rid: rm.id,
                                                      zid: zone.id,
                                                    });
                                                  }}
                                                  className="text-[12px] px-2 py-0.5 rounded border border-slate-200 text-slate-500"
                                                >
                                                  Edit AC
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    saveZoneAc(
                                                      db.id,
                                                      fl.id,
                                                      rm.id,
                                                      zone.id,
                                                      true,
                                                    )
                                                  }
                                                  className="text-[12px] px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-500"
                                                >
                                                  Hapus AC
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <span className="text-[13px] text-slate-400 italic flex-1">
                                                  Belum ada unit AC
                                                </span>
                                                {!isAddingAc && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setZonaAcType("Split");
                                                      setZonaAcCapacity("1");
                                                      setZonaAcBrandId("");
                                                      setZonaAcFor({
                                                        bid: db.id,
                                                        fid: fl.id,
                                                        rid: rm.id,
                                                        zid: zone.id,
                                                      });
                                                    }}
                                                    className="text-[12px] px-2.5 py-1 rounded-lg border border-green-300 bg-green-50 text-green-700"
                                                  >
                                                    + Tambah AC
                                                  </button>
                                                )}
                                                {/* Empty: Hapus Zona */}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    deleteZone(
                                                      db.id,
                                                      fl.id,
                                                      rm.id,
                                                      zone.id,
                                                    )
                                                  }
                                                  className="text-[12px] px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-500"
                                                >
                                                  ✕ Zona
                                                </button>
                                              </>
                                            )}
                                          </div>

                                          {isAddingAc && (
                                            <div className="mt-1.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-2">
                                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                Zona {zone.label} — spesifikasi
                                                AC
                                              </p>
                                              <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                  <label className="text-[12px] text-slate-500 block mb-1">
                                                    Tipe *
                                                  </label>
                                                  <select
                                                    value={zonaAcType}
                                                    onChange={(e) =>
                                                      setZonaAcType(
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                                  >
                                                    {AC_TYPES.map((t) => (
                                                      <option key={t}>
                                                        {t}
                                                      </option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="text-[12px] text-slate-500 block mb-1">
                                                    Kapasitas *
                                                  </label>
                                                  <select
                                                    value={zonaAcCapacity}
                                                    onChange={(e) =>
                                                      setZonaAcCapacity(
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                                                  >
                                                    {AC_CAPS.map((c) => (
                                                      <option key={c} value={c}>
                                                        {fmtPk(c)}
                                                      </option>
                                                    ))}
                                                  </select>
                                                </div>
                                                <div>
                                                  <label className="text-[12px] text-slate-500 block mb-1">
                                                    Merek
                                                  </label>
                                                  <select
                                                    value={zonaAcBrandId}
                                                    onChange={(e) =>
                                                      setZonaAcBrandId(
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
                                                    saveZoneAc(
                                                      db.id,
                                                      fl.id,
                                                      rm.id,
                                                      zone.id,
                                                    )
                                                  }
                                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium"
                                                >
                                                  Simpan AC
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setZonaAcFor(null)
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
                                  {addingZonaFor?.bid === db.id &&
                                    addingZonaFor?.fid === fl.id &&
                                    addingZonaFor?.rid === rm.id && (
                                      <div className="mt-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                          + Zona baru di {rm.name}
                                        </p>
                                        <div className="flex gap-2 items-start">
                                          <div>
                                            <input
                                              type="text"
                                              value={newZonaLabel}
                                              onChange={(e) =>
                                                setNewZonaLabel(e.target.value)
                                              }
                                              onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                !zonaDupe &&
                                                addDraftZone(
                                                  db.id,
                                                  fl.id,
                                                  rm.id,
                                                )
                                              }
                                              placeholder="A, B, C..."
                                              className={`w-20 px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${zonaDupe ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                            />
                                            {zonaDupe && (
                                              <p className="text-xs text-red-500 mt-1">
                                                ⚠ Zona {newZonaLabel} sudah ada
                                              </p>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              addDraftZone(db.id, fl.id, rm.id)
                                            }
                                            disabled={
                                              !newZonaLabel.trim() || !!zonaDupe
                                            }
                                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-40"
                                          >
                                            Simpan Zona
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

                {draftBuildings.length === 0 && (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
                    <p className="text-sm text-slate-400 mb-2">
                      Belum ada gedung. Tambahkan opsional.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddBuilding(true)}
                      className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg"
                    >
                      + Tambah Gedung
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-3">
                Catatan Lokasi
                <span className="text-slate-400 font-normal ml-1 text-sm">
                  (opsional)
                </span>
              </h2>
              <textarea
                value={locNotes}
                onChange={(e) => setLocNotes(e.target.value)}
                placeholder="Akses khusus, jam operasional, dll..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Right — summary */}
          <div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6">
              <h2 className="font-semibold text-slate-800 mb-4">Ringkasan</h2>

              <div className="space-y-3 mb-6">
                <SummaryRow label="Pelanggan" value={customer?.name ?? "—"} />
                <SummaryRow
                  label="Tipe Bangunan"
                  value={tipeBangunanLabel || "—"}
                />
                <SummaryRow
                  label="Kategori"
                  value={
                    kategoriFungsiList?.find((k) => k.id === kategoriFungsiId)
                      ?.label ?? "—"
                  }
                />
                <SummaryRow
                  label="Alamat"
                  value={addressValues.address_street || "—"}
                />
                <SummaryRow
                  label="Kelurahan"
                  value={addressValues.kelurahan || "—"}
                />
                <SummaryRow
                  label="Kode Pos"
                  value={addressValues.postal_code || "—"}
                />
                <SummaryRow
                  label="Survey"
                  value={hasSurvey ? "Sudah" : "Belum"}
                />
                {draftBuildings.length > 0 && (
                  <SummaryRow
                    label="Gedung"
                    value={`${draftBuildings.length} gedung · ${draftBuildings.flatMap((b) => b.floors.flatMap((f) => f.rooms.flatMap((r) => r.zones))).filter((z) => z.acType).length} unit AC`}
                  />
                )}
              </div>

              {/* Hint */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-700">
                  Setelah menambah lokasi, daftarkan unit AC di lokasi ini
                  sebelum membuat proyek.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !tipeBangunanId || !kategoriFungsiId}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isLoading ? "Menyimpan..." : "Simpan Lokasi"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}

// ── Sub components ────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className="font-medium text-slate-800 text-right
                             max-w-36 truncate"
      >
        {value}
      </span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputClass = `
    w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
    disabled:bg-slate-50 disabled:text-slate-400
`.trim();
