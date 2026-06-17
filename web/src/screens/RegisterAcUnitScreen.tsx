import { PageLayout } from "@/components/shared/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcBrands } from "@/hooks/useAcUnits";
import { useCustomers } from "@/hooks/useCustomers";
import { useBuildingUnits, useLocationsByCustomer } from "@/hooks/useLocations";
import { supabase } from "@/lib/supabase";
import type { AcCapacity, AcType } from "@/types/app";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────

const AC_TYPES: AcType[] = [
  "Split",
  "Cassette",
  "Standing",
  "Ducted",
  "Window",
  "Portable",
];

const AC_CAPACITIES: AcCapacity[] = [
  "0.5 PK",
  "0.75 PK",
  "1 PK",
  "1.5 PK",
  "2 PK",
  "2.5 PK",
  "3 PK",
];

// ── AC unit draft ─────────────────────────────────────────────────────────────

interface AcUnitDraft {
  id: string; // local temp id
  building_unit_id: string;
  brand_id: string;
  type: AcType;
  capacity_pk: AcCapacity;
  unit_label: string;
  access_notes: string;
  notes: string;
}

function newDraft(): AcUnitDraft {
  return {
    id: `draft-${Date.now()}-${Math.random()}`,
    building_unit_id: "",
    brand_id: "",
    type: "Split",
    capacity_pk: "1 PK",
    unit_label: "1",
    access_notes: "",
    notes: "",
  };
}

// ── Draft card ────────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  index,
  buildingUnits,
  brands,
  onUpdate,
  onRemove,
  canRemove,
}: {
  draft: AcUnitDraft;
  index: number;
  buildingUnits: { id: string; display_name: string }[];
  brands: { id: string; name: string }[];
  onUpdate: (field: keyof AcUnitDraft, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-800 text-sm">
          Unit AC #{index + 1}
        </h3>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Hapus
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Room / Building unit */}
        <div className="col-span-2">
          <label className={labelClass}>Ruangan / Unit *</label>
          <select
            value={draft.building_unit_id}
            onChange={(e) => onUpdate("building_unit_id", e.target.value)}
            required
            className={selectClass}
          >
            <option value="">Pilih ruangan...</option>
            {buildingUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name}
              </option>
            ))}
          </select>
          {buildingUnits.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠ Belum ada unit/ruangan di lokasi ini. Tambahkan dulu di halaman
              lokasi.
            </p>
          )}
        </div>

        {/* Brand */}
        <div>
          <label className={labelClass}>Merek *</label>
          <select
            value={draft.brand_id}
            onChange={(e) => onUpdate("brand_id", e.target.value)}
            required
            className={selectClass}
          >
            <option value="">Pilih merek...</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className={labelClass}>Tipe *</label>
          <select
            value={draft.type}
            onChange={(e) => onUpdate("type", e.target.value)}
            className={selectClass}
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
          <label className={labelClass}>Kapasitas *</label>
          <select
            value={draft.capacity_pk}
            onChange={(e) => onUpdate("capacity_pk", e.target.value)}
            className={selectClass}
          >
            {AC_CAPACITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Unit label */}
        <div>
          <label className={labelClass}>
            Label Unit
            <span className="text-slate-400 font-normal ml-1">
              (jika ada 2+ AC sejenis di ruangan ini)
            </span>
          </label>
          <input
            type="text"
            value={draft.unit_label}
            onChange={(e) => onUpdate("unit_label", e.target.value)}
            placeholder="1"
            className={inputClass}
          />
        </div>

        {/* Access notes */}
        <div className="col-span-2">
          <label className={labelClass}>
            Catatan Akses
            <span className="text-slate-400 font-normal ml-1">(opsional)</span>
          </label>
          <input
            type="text"
            value={draft.access_notes}
            onChange={(e) => onUpdate("access_notes", e.target.value)}
            placeholder="Kunci ada di satpam, akses via tangga belakang..."
            className={inputClass}
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className={labelClass}>
            Catatan Teknis
            <span className="text-slate-400 font-normal ml-1">(opsional)</span>
          </label>
          <input
            type="text"
            value={draft.notes}
            onChange={(e) => onUpdate("notes", e.target.value)}
            placeholder="Kondisi khusus, riwayat kerusakan, dll..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Preview */}
      {draft.building_unit_id && draft.brand_id && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-1">Preview label AC:</p>
          <p className="text-xs font-mono text-slate-700">
            {brands.find((b) => b.id === draft.brand_id)?.name ?? "?"}
            {" · "}
            {draft.type}
            {" · "}
            {draft.capacity_pk}
            {draft.unit_label !== "1" && ` · Unit ${draft.unit_label}`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Kode AC akan dibuat otomatis oleh sistem
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function RegisterAcUnitScreen() {
  const navigate = useNavigate();

  // ── Selection state ───────────────────────────────────────────────────────

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  // ── Draft state ───────────────────────────────────────────────────────────

  const [drafts, setDrafts] = useState<AcUnitDraft[]>([newDraft()]);

  // ── UI state ──────────────────────────────────────────────────────────────

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(0); // count registered

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: customers, isLoading: cLoading } = useCustomers();
  const { data: locations, isLoading: lLoading } =
    useLocationsByCustomer(selectedCustomerId);
  const { data: buildingUnits } = useBuildingUnits(selectedLocationId);
  const { data: brands } = useAcBrands();

  // ── Draft management ──────────────────────────────────────────────────────

  function addDraft() {
    setDrafts((prev) => [...prev, newDraft()]);
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function updateDraft(id: string, field: keyof AcUnitDraft, value: string) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const canSubmit = useMemo(() => {
    if (!selectedLocationId) return false;
    return drafts.every(
      (d) => d.building_unit_id && d.brand_id && d.type && d.capacity_pk,
    );
  }, [selectedLocationId, drafts]);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsLoading(true);

    try {
      let registered = 0;

      for (const draft of drafts) {
        const { error: insertError } = await supabase.from("ac_units").insert({
          location_id: selectedLocationId,
          building_unit_id: draft.building_unit_id,
          brand_id: draft.brand_id,
          type: draft.type,
          capacity_pk: draft.capacity_pk,
          unit_label: draft.unit_label || "1",
          access_notes: draft.access_notes.trim() || null,
          notes: draft.notes.trim() || null,
          is_active: true,
          // ac_code set by DB trigger
        });

        if (insertError) throw insertError;
        registered++;
      }

      setSuccess(registered);

      // Navigate back to AC unit list after short delay
      setTimeout(() => {
        navigate({ to: "/ac-units" });
      }, 1500);
    } catch (err: any) {
      setError(err.message ?? "Gagal mendaftarkan unit AC.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="Daftarkan Unit AC"
      subtitle="Tambahkan unit AC ke lokasi pelanggan"
      action={
        <Link
          to="/ac-units"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          Batalkan
        </Link>
      }
    >
      {/* Success state */}
      {success > 0 && (
        <div
          className="bg-green-50 border border-green-200 rounded-xl
                                p-5 mb-6 text-center"
        >
          <div className="text-3xl mb-2">✅</div>
          <p className="font-semibold text-green-800">
            {success} unit AC berhasil didaftarkan
          </p>
          <p className="text-sm text-green-600 mt-1">
            Mengalihkan ke daftar unit AC...
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6">
          {/* Left — selection + drafts */}
          <div className="col-span-2 space-y-6">
            {/* Customer + Location selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">
                Pilih Lokasi
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Customer */}
                <div>
                  <label className={labelClass}>Pelanggan *</label>
                  {cLoading ? (
                    <Skeleton className="h-9 w-full rounded-lg" />
                  ) : (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedLocationId("");
                      }}
                      required
                      className={selectClass}
                    >
                      <option value="">Pilih pelanggan...</option>
                      {customers?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className={labelClass}>Lokasi *</label>
                  {lLoading ? (
                    <Skeleton className="h-9 w-full rounded-lg" />
                  ) : (
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      required
                      disabled={!selectedCustomerId}
                      className={selectClass}
                    >
                      <option value="">Pilih lokasi...</option>
                      {locations?.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Building units warning */}
              {selectedLocationId &&
                buildingUnits !== undefined &&
                buildingUnits.length === 0 && (
                  <div
                    className="mt-4 bg-amber-50 border border-amber-200
                                                rounded-lg p-3"
                  >
                    <p className="text-sm text-amber-700">
                      ⚠ Lokasi ini belum memiliki unit/ruangan. Tambahkan
                      unit/ruangan terlebih dahulu.
                    </p>
                    <Link
                      to="/customers/$customerId/locations/create"
                      params={{ customerId: selectedCustomerId }}
                      className="text-sm text-amber-700 font-medium underline mt-1 inline-block"
                    >
                      → Kelola lokasi
                    </Link>
                  </div>
                )}
            </div>

            {/* AC unit drafts */}
            {selectedLocationId && (
              <>
                {drafts.map((draft, index) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    index={index}
                    buildingUnits={buildingUnits ?? []}
                    brands={brands ?? []}
                    onUpdate={(field, value) =>
                      updateDraft(draft.id, field, value)
                    }
                    onRemove={() => removeDraft(draft.id)}
                    canRemove={drafts.length > 1}
                  />
                ))}

                {/* Add another */}
                <button
                  type="button"
                  onClick={addDraft}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors font-medium"
                >
                  + Tambah Unit AC Lagi
                </button>
              </>
            )}

            {/* No location selected yet */}
            {!selectedLocationId && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-16 text-center">
                <div className="text-4xl mb-3">❄️</div>
                <p className="text-slate-500 text-sm font-medium">
                  Pilih pelanggan dan lokasi
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  untuk mulai mendaftarkan unit AC
                </p>
              </div>
            )}
          </div>

          {/* Right — summary + submit */}
          <div>
            <div
              className="bg-white rounded-xl border border-slate-200
                                        p-5 sticky top-6 space-y-4"
            >
              <h2 className="font-semibold text-slate-800">Ringkasan</h2>

              {/* Location info */}
              <div className="space-y-2">
                <SummaryRow
                  label="Pelanggan"
                  value={
                    customers?.find((c) => c.id === selectedCustomerId)?.name ??
                    "—"
                  }
                />
                <SummaryRow
                  label="Lokasi"
                  value={
                    locations?.find((l) => l.id === selectedLocationId)?.name ??
                    "—"
                  }
                />
                <SummaryRow label="Jumlah AC" value={`${drafts.length} unit`} />
              </div>

              {/* Draft list preview */}
              {drafts.some((d) => d.brand_id) && (
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase">
                    Unit yang akan didaftarkan
                  </p>
                  {drafts.map((draft, i) => {
                    const brand = brands?.find(
                      (b: { id: string; name: string }) =>
                        b.id === draft.brand_id,
                    );
                    const unit = buildingUnits?.find(
                      (u) => u.id === draft.building_unit_id,
                    );
                    return (
                      <div
                        key={draft.id}
                        className="bg-slate-50 rounded-lg px-3 py-2"
                      >
                        <p
                          className="text-xs font-medium
                                                               text-slate-700"
                        >
                          #{i + 1} · {draft.type} {draft.capacity_pk}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {brand?.name ?? "—"}
                          {unit ? ` · ${unit.display_name}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hint */}
              <div
                className="bg-blue-50 border border-blue-100
                                            rounded-lg p-3"
              >
                <p className="text-xs text-blue-700">
                  Kode AC (AC-YYYY-XXXXXXX) akan dibuat otomatis oleh sistem
                  untuk setiap unit.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isLoading
                  ? "Mendaftarkan..."
                  : `Daftarkan ${drafts.length} Unit AC`}
              </button>

              <Link
                to="/ac-units"
                className="block text-center text-sm text-slate-400 hover:text-slate-600"
              >
                Batalkan
              </Link>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}

// ── Sub components ────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
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
`.trim();

const selectClass = `
    w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
    disabled:bg-slate-50 disabled:text-slate-400
`.trim();

const labelClass = `
    text-sm font-medium text-slate-700 mb-1.5 block
`.trim();
