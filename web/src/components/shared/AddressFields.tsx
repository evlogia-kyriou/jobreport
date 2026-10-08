/**
 * AddressFields — shared structured address form
 * Used by CreateLocationScreen and EditLocationScreen
 */

import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { useRegions } from "@/hooks/useLocations";
import React, { useEffect, useMemo } from "react";

// ── Prefixes ───────────────────────────────────────────────────────────────────

const PREFIXES = [
  { value: "Jl.", label: "Jl. — Jalan" },
  { value: "Gg.", label: "Gg. — Gang" },
  { value: "Komp.", label: "Komp. — Komplek" },
  { value: "Kav.", label: "Kav. — Kavling" },
  { value: "Blok", label: "Blok" },
  { value: "Kawasan", label: "Kawasan" },
  { value: "Perumahan", label: "Perumahan" },
  { value: "Cluster", label: "Cluster" },
  { value: "Rukan", label: "Rukan" },
  { value: "Lainnya", label: "Lainnya" },
];

// Block/unit shown for these prefixes
const BLOCK_PREFIXES = new Set([
  "Blok",
  "Komp.",
  "Kawasan",
  "Perumahan",
  "Cluster",
  "Rukan",
]);

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AddressValues {
  address_prefix?: string;
  address_custom_prefix?: string; // when prefix = "Lainnya"
  address_street?: string;
  address_number?: string;
  address_rt?: string;
  address_rw?: string;
  address_block_unit?: string;
  province?: string;
  kabupaten?: string;
  kecamatan?: string;
  kelurahan?: string;
  postal_code?: string;
}

interface AddressFieldsProps {
  values: AddressValues;
  onChange: (updated: Partial<AddressValues>) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddressFields({ values, onChange }: AddressFieldsProps) {
  const showBlock = BLOCK_PREFIXES.has(values.address_prefix ?? "");
  const showCustom = values.address_prefix === "Lainnya";

  // Region cascade
  const { data: provinces } = useRegions({});
  const { data: kabupatens } = useRegions({ province: values.province });
  const { data: kecamatans } = useRegions({
    province: values.province,
    kabupaten: values.kabupaten,
  });
  const { data: kelurahans } = useRegions({
    province: values.province,
    kabupaten: values.kabupaten,
    kecamatan: values.kecamatan,
  });

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

  // Auto-fill postal code + single kelurahan
  useEffect(() => {
    if (!values.kecamatan || !kelurahans) return;
    if (kelurahans.length === 1) {
      const only = kelurahans[0];
      onChange({ kelurahan: only.kelurahan, postal_code: only.postal_code });
    }
  }, [values.kecamatan, kelurahans]);

  function handleKelurahanChange(val: string) {
    const region = kelurahans?.find((r) => r.kelurahan === val);
    onChange({
      kelurahan: val,
      postal_code: region?.postal_code ?? values.postal_code,
    });
  }

  // Build live preview of the full address string
  const preview = useMemo(() => {
    const parts: string[] = [];
    const effectivePrefix = showCustom
      ? (values.address_custom_prefix ?? "")
      : (values.address_prefix ?? "");

    if (effectivePrefix && values.address_street) {
      parts.push(`${effectivePrefix} ${values.address_street}`);
    } else if (values.address_street) {
      parts.push(values.address_street);
    }
    if (values.address_number) parts.push(values.address_number);
    if (showBlock && values.address_block_unit)
      parts.push(values.address_block_unit);

    let result = parts.join(" ");

    if (values.address_rt && values.address_rw) {
      const rt = values.address_rt.padStart(3, "0");
      const rw = values.address_rw.padStart(3, "0");
      result = result ? `${result}, RT ${rt}/RW ${rw}` : `RT ${rt}/RW ${rw}`;
    } else if (values.address_rt) {
      const rt = values.address_rt.padStart(3, "0");
      result = result ? `${result}, RT ${rt}` : `RT ${rt}`;
    }

    return result;
  }, [values, showBlock, showCustom]);

  return (
    <div className="space-y-5">
      {/* ── Street section ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-1">Alamat</h2>
        <p className="text-sm text-slate-500 mb-4">Isi detail alamat jalan</p>

        {/* Row 1: Prefix + street + number */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Prefix <span className="text-red-500">*</span>
            </label>
            <select
              value={values.address_prefix ?? ""}
              onChange={(e) =>
                onChange({
                  address_prefix: e.target.value,
                  address_custom_prefix: undefined,
                  address_block_unit: BLOCK_PREFIXES.has(e.target.value)
                    ? values.address_block_unit
                    : undefined,
                })
              }
              className={inputClass}
            >
              <option value="">— Pilih —</option>
              {PREFIXES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nama jalan / lokasi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={values.address_street ?? ""}
              onChange={(e) => onChange({ address_street: e.target.value })}
              placeholder="Sudirman Raya, Bintaro Jaya..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nomor
            </label>
            <input
              type="text"
              value={values.address_number ?? ""}
              onChange={(e) => onChange({ address_number: e.target.value })}
              placeholder="No. 45, Kav. 5"
              className={inputClass}
            />
          </div>
        </div>

        {/* Lainnya: custom prefix input */}
        {showCustom && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Prefix kustom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={values.address_custom_prefix ?? ""}
              onChange={(e) =>
                onChange({ address_custom_prefix: e.target.value })
              }
              placeholder='e.g. "Taman" atau "Komplek Ruko"'
              className={inputClass}
            />
          </div>
        )}

        {/* Block/unit (prefix-driven) */}
        {showBlock && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Blok / Unit
            </label>
            <input
              type="text"
              value={values.address_block_unit ?? ""}
              onChange={(e) => onChange({ address_block_unit: e.target.value })}
              placeholder="Blok A-5, Unit 2B, Kav. 10"
              className={inputClass}
            />
          </div>
        )}

        {/* RT / RW (always optional) */}
        <div className="border border-dashed border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2.5">
            RT / RW — opsional
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">RT</label>
              <input
                type="text"
                value={values.address_rt ?? ""}
                onChange={(e) =>
                  onChange({
                    address_rt: e.target.value.replace(/\D/g, "").slice(0, 3),
                  })
                }
                placeholder="003"
                maxLength={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">RW</label>
              <input
                type="text"
                value={values.address_rw ?? ""}
                onChange={(e) =>
                  onChange({
                    address_rw: e.target.value.replace(/\D/g, "").slice(0, 3),
                  })
                }
                placeholder="007"
                maxLength={3}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        {preview && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <p className="text-[11px] text-blue-500 font-medium uppercase tracking-wide mb-0.5">
              Pratinjau alamat
            </p>
            <p className="text-sm text-blue-700 font-medium">{preview}</p>
          </div>
        )}
      </div>

      {/* ── Region cascade ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Wilayah</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Provinsi <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={uniqueProvinces.map((p) => ({ value: p, label: p }))}
              value={values.province ?? ""}
              onChange={(val) =>
                onChange({
                  province: val,
                  kabupaten: "",
                  kecamatan: "",
                  kelurahan: "",
                  postal_code: "",
                })
              }
              placeholder="Pilih provinsi..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kabupaten / Kota <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={uniqueKabupatens.map((k) => ({ value: k, label: k }))}
              value={values.kabupaten ?? ""}
              onChange={(val) =>
                onChange({
                  kabupaten: val,
                  kecamatan: "",
                  kelurahan: "",
                  postal_code: "",
                })
              }
              placeholder="Pilih kabupaten..."
              disabled={!values.province}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kecamatan <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={uniqueKecamatans.map((k) => ({ value: k, label: k }))}
              value={values.kecamatan ?? ""}
              onChange={(val) =>
                onChange({ kecamatan: val, kelurahan: "", postal_code: "" })
              }
              placeholder="Pilih kecamatan..."
              disabled={!values.kabupaten}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kelurahan <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={(kelurahans ?? []).map((r) => ({
                value: r.kelurahan,
                label: r.kelurahan,
              }))}
              value={values.kelurahan ?? ""}
              onChange={handleKelurahanChange}
              placeholder="Pilih kelurahan..."
              disabled={!values.kecamatan}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kode Pos
            </label>
            <input
              type="text"
              value={values.postal_code ?? ""}
              className={`${inputClass} bg-slate-50 text-slate-400 cursor-not-allowed`}
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass = `
  w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
  disabled:bg-slate-50 disabled:text-slate-400
`.trim();
