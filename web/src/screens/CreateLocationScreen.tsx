import { PageLayout } from "@/components/shared/PageLayout";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { useCustomer } from "@/hooks/useCustomers";
import {
  useCreateLocation,
  useRegions,
  useSearchBuildings,
} from "@/hooks/useLocations";
import { supabase } from "@/lib/supabase";
import type { LocationType } from "@/types/app";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

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

// ── Building unit row ─────────────────────────────────────────────────────────

interface BuildingUnitRow {
  zone: string;
  floor: string;
  room: string;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function CreateLocationScreen() {
  const { customerId } = useParams({ strict: false });
  const navigate = useNavigate();
  const createLocation = useCreateLocation();

  const { data: customer } = useCustomer(customerId);

  // ── Form state ────────────────────────────────────────────────────────────

  const [locType, setLocType] = useState<LocationType>("lantai_kantor");
  const [address, setAddress] = useState("");
  const [buildingSearch, setBuildingSearch] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<
    string | undefined
  >();
  const [buildingFloor, setBuildingFloor] = useState("");

  // Region cascade
  const [province, setProvince] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Survey
  const [hasSurvey, setHasSurvey] = useState(false);
  const [surveyNotes, setSurveyNotes] = useState("");
  const [locNotes, setLocNotes] = useState("");

  // Building units
  const [addUnits, setAddUnits] = useState(false);
  const [units, setUnits] = useState<BuildingUnitRow[]>([
    { zone: "", floor: "", room: "" },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Region data ───────────────────────────────────────────────────────────

  const { data: provinces } = useRegions({});
  const { data: kabupatens } = useRegions({ province });
  const { data: kecamatans } = useRegions({ province, kabupaten });
  const { data: kelurahans } = useRegions({ province, kabupaten, kecamatan });

  const uniqueProvinces = useMemo(
    () => [...new Set(provinces?.map((r) => r.province) ?? [])].sort(),
    [provinces],
  );
  const uniqueKabupatens = useMemo(
    () => [...new Set(kabupatens?.map((r) => r.kabupaten) ?? [])].sort(),
    [kabupatens],
  );
  const uniqueKecamatans = useMemo(
    () => [...new Set(kecamatans?.map((r) => r.kecamatan) ?? [])].sort(),
    [kecamatans],
  );

  useEffect(() => {
    if (!kecamatan || !kelurahans) return;
    if (kelurahans.length === 1) {
      const only = kelurahans[0];
      setKelurahan(only.kelurahan);
      setPostalCode(only.postal_code);
    }
  }, [kecamatan, kelurahans]);

  // Auto-fill postal code when kelurahan selected
  function handleKelurahanChange(val: string) {
    setKelurahan(val);
    const region = kelurahans?.find((r) => r.kelurahan === val);
    if (region) setPostalCode(region.postal_code);
  }

  // ── Building search ───────────────────────────────────────────────────────

  const { data: buildings } = useSearchBuildings(buildingSearch);
  const selectedType = LOCATION_TYPES.find((t) => t.value === locType);

  // ── Unit management ───────────────────────────────────────────────────────

  function addUnit() {
    setUnits((prev) => [...prev, { zone: "", floor: "", room: "" }]);
  }

  function removeUnit(index: number) {
    setUnits((prev) => prev.filter((_, i) => i !== index));
  }

  function updateUnit(
    index: number,
    field: keyof BuildingUnitRow,
    value: string,
  ) {
    setUnits((prev) =>
      prev.map((u, i) => (i === index ? { ...u, [field]: value } : u)),
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!province || !kabupaten || !kecamatan || !kelurahan) {
      setError("Lengkapi wilayah terlebih dahulu.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create location
      const location = await createLocation.mutateAsync({
        customer_id: customerId,
        type: locType,
        buildings_registry_id: selectedBuildingId,
        building_floor: buildingFloor || undefined,
        address: address.trim(),
        province,
        kabupaten,
        kecamatan,
        kelurahan,
        postal_code: postalCode,
        has_survey: hasSurvey,
        survey_notes: surveyNotes.trim() || undefined,
        notes: locNotes.trim() || undefined,
      });

      // 2. Create building units if requested
      if (addUnits) {
        const validUnits = units.filter((u) => u.room.trim());
        if (validUnits.length > 0) {
          await supabase.from("building_units").insert(
            validUnits.map((u) => ({
              location_id: location.id,
              zone: u.zone.trim() || null,
              floor: u.floor.trim() || null,
              room: u.room.trim(),
              display_name: "", // DB trigger sets this
            })),
          );
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
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6">
          {/* Left — main form */}
          <div className="col-span-2 space-y-6">
            {/* Location type */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Tipe Lokasi</h2>
              <div className="grid grid-cols-3 gap-2">
                {LOCATION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setLocType(t.value);
                      if (!t.hasBuilding) {
                        setSelectedBuildingId(undefined);
                        setBuildingFloor("");
                        setBuildingSearch("");
                      }
                    }}
                    className={`px-3 py-3 rounded-xl border-2
                                                      text-left transition-colors ${
                                                        locType === t.value
                                                          ? "border-blue-500 bg-blue-50"
                                                          : "border-slate-200 hover:bg-slate-50"
                                                      }`}
                  >
                    <div className="text-xl mb-1">{t.icon}</div>
                    <p
                      className={`text-xs font-medium ${
                        locType === t.value ? "text-blue-700" : "text-slate-700"
                      }`}
                    >
                      {t.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Building registry (for types with hasBuilding) */}
            {selectedType?.hasBuilding && (
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
                            setAddress(b.address);
                            setProvince(b.province);
                            setKabupaten(b.kabupaten);
                            setKecamatan(b.kecamatan);
                            setKelurahan(b.kelurahan);
                            setPostalCode(b.postal_code);
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

            {/* Address */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Alamat</h2>
              <div className="space-y-4">
                <Field label="Alamat Lengkap *">
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jl. Sudirman No. 46"
                    rows={2}
                    required
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                {/* Region cascade */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Provinsi *">
                    <SearchableSelect
                      options={uniqueProvinces.map((p) => ({
                        value: p,
                        label: p,
                      }))}
                      value={province}
                      onChange={(val) => {
                        setProvince(val);
                        setKabupaten("");
                        setKecamatan("");
                        setKelurahan("");
                        setPostalCode("");
                      }}
                      placeholder="Pilih provinsi..."
                    />
                  </Field>

                  <Field label="Kabupaten / Kota *">
                    <SearchableSelect
                      options={uniqueKabupatens.map((k) => ({
                        value: k,
                        label: k,
                      }))}
                      value={kabupaten}
                      onChange={(val) => {
                        setKabupaten(val);
                        setKecamatan("");
                        setKelurahan("");
                        setPostalCode("");
                      }}
                      placeholder="Pilih kabupaten..."
                      disabled={!province}
                    />
                  </Field>

                  <Field label="Kecamatan *">
                    <SearchableSelect
                      options={uniqueKecamatans.map((k) => ({
                        value: k,
                        label: k,
                      }))}
                      value={kecamatan}
                      onChange={(val) => {
                        setKecamatan(val);
                        setKelurahan("");
                        setPostalCode("");
                      }}
                      placeholder="Pilih kecamatan..."
                      disabled={!kabupaten}
                    />
                  </Field>

                  <Field label="Kelurahan *">
                    <SearchableSelect
                      options={(kelurahans ?? []).map((r) => ({
                        value: r.kelurahan,
                        label: r.kelurahan,
                      }))}
                      value={kelurahan}
                      onChange={handleKelurahanChange}
                      placeholder="Pilih kelurahan..."
                      disabled={!kecamatan}
                    />
                  </Field>

                  <Field label="Kode Pos">
                    <input
                      type="text"
                      value={postalCode}
                      className={inputClass}
                      readOnly
                    />
                  </Field>
                </div>
              </div>
            </div>

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
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    Unit / Ruangan
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tambahkan sekarang atau nanti sebelum mendaftarkan unit AC
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addUnits}
                    onChange={(e) => setAddUnits(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-600">
                    Tambah sekarang
                  </span>
                </label>
              </div>

              {addUnits && (
                <div className="mt-4 space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-1">
                    <p
                      className="col-span-3 text-xs font-medium
                                                      text-slate-500 uppercase"
                    >
                      Zone
                    </p>
                    <p
                      className="col-span-3 text-xs font-medium
                                                      text-slate-500 uppercase"
                    >
                      Lantai
                    </p>
                    <p
                      className="col-span-5 text-xs font-medium
                                                      text-slate-500 uppercase"
                    >
                      Ruangan *
                    </p>
                  </div>

                  {units.map((unit, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={unit.zone}
                          onChange={(e) =>
                            updateUnit(index, "zone", e.target.value)
                          }
                          placeholder="A"
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={unit.floor}
                          onChange={(e) =>
                            updateUnit(index, "floor", e.target.value)
                          }
                          placeholder="L3"
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={unit.room}
                          onChange={(e) =>
                            updateUnit(index, "room", e.target.value)
                          }
                          placeholder="Ruang Rapat"
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {units.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUnit(index)}
                            className="text-red-400 hover:text-red-600 text-lg leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Display name preview */}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">
                      Preview nama unit:
                    </p>
                    {units.map(
                      (u, i) =>
                        u.room && (
                          <p
                            key={i}
                            className="text-xs font-mono
                                                                       text-slate-700"
                          >
                            {[u.zone, u.floor, u.room]
                              .filter(Boolean)
                              .join(" → ")}
                          </p>
                        ),
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={addUnit}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Tambah Unit
                  </button>
                </div>
              )}
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
                <SummaryRow label="Tipe" value={selectedType?.label ?? "—"} />
                <SummaryRow label="Alamat" value={address || "—"} />
                <SummaryRow label="Kelurahan" value={kelurahan || "—"} />
                <SummaryRow label="Kode Pos" value={postalCode || "—"} />
                <SummaryRow
                  label="Survey"
                  value={hasSurvey ? "Sudah" : "Belum"}
                />
                {addUnits && (
                  <SummaryRow
                    label="Unit / Ruangan"
                    value={`${units.filter((u) => u.room).length} unit`}
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
                disabled={isLoading}
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
