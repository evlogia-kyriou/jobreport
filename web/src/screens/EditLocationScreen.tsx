import {
  AddressFields,
  type AddressValues,
} from "@/components/shared/AddressFields";
import {
  KategoriFungsiIcon,
  TipeBangunanIcon,
} from "@/components/shared/LocationIcons";
import { PageLayout } from "@/components/shared/PageLayout";
import { Toast, type ToastState } from "@/components/shared/Toast";
import {
  useKategoriFungsi,
  useLocationsByCustomer,
  useTipeBangunan,
  useTipeBangunanGroups,
  useUpdateLocation,
} from "@/hooks/useLocations";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function EditLocationScreen() {
  const { customerId, locationId } = useParams({ strict: false }) as {
    customerId: string;
    locationId: string;
  };
  const navigate = useNavigate();

  const { data: locations } = useLocationsByCustomer(customerId);
  const location = locations?.find((l) => l.id === locationId);
  const { data: tipeBangunanGroups } = useTipeBangunanGroups();
  const { data: allTipeBangunan } = useTipeBangunan();
  const { data: kategoriFungsiList } = useKategoriFungsi();
  const updateLocation = useUpdateLocation();

  // Tipe Bangunan state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [tipeBangunanId, setTipeBangunanId] = useState<string | null>(null);
  const [tipeBangunanLabel, setTipeBangunanLabel] = useState<string>("");
  const [tipeBangunanCustom, setTipeBangunanCustom] = useState<string>("");
  const [selectedGroupIsLainnya, setSelectedGroupIsLainnya] = useState(false);

  // Kategori Fungsi state
  const [kategoriFungsiId, setKategoriFungsiId] = useState<string | null>(null);
  const [kategoriFungsiCustom, setKategoriFungsiCustom] = useState<string>("");

  // Address + notes state
  const [addressValues, setAddressValues] = useState<AddressValues>({});
  const [notes, setNotes] = useState("");
  const [surveyNotes, setSurveyNotes] = useState("");
  const [accessRegulations, setAccessRegulations] = useState(""); // ← NEW ✅

  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Seed form when location loads
  useEffect(() => {
    if (!location || !allTipeBangunan || seeded) return;

    if (location.tipe_bangunan_id) {
      const tb = allTipeBangunan.find(
        (t) => t.id === location.tipe_bangunan_id,
      );
      if (tb) {
        setTipeBangunanId(tb.id);
        setTipeBangunanLabel(tb.label);
        setSelectedGroupId(tb.group_id);
        const isLainnya = tb.label === "Lainnya";
        setSelectedGroupIsLainnya(isLainnya);
        if (isLainnya)
          setTipeBangunanCustom((location as any).tipe_bangunan_custom ?? "");
      }
    }
    if (location.kategori_fungsi_id) {
      setKategoriFungsiId(location.kategori_fungsi_id);
      setKategoriFungsiCustom((location as any).kategori_fungsi_custom ?? "");
    }
    setAddressValues({
      address_prefix: (location as any).address_prefix ?? undefined,
      address_street:
        (location as any).address_street ?? location.address ?? "",
      address_number: (location as any).address_number ?? undefined,
      address_rt: (location as any).address_rt ?? undefined,
      address_rw: (location as any).address_rw ?? undefined,
      address_block_unit: (location as any).address_block_unit ?? undefined,
      province: location.province ?? "",
      kabupaten: location.kabupaten ?? "",
      kecamatan: location.kecamatan ?? "",
      kelurahan: location.kelurahan ?? "",
      postal_code: location.postal_code ?? "",
    });
    setNotes(location.notes ?? "");
    setSurveyNotes(location.survey_notes ?? "");
    setAccessRegulations((location as any).access_regulations ?? ""); // ← NEW ✅
    setSeeded(true);
  }, [location, allTipeBangunan, seeded]);

  const typesInGroup = selectedGroupId
    ? (allTipeBangunan ?? []).filter((t) => t.group_id === selectedGroupId)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tipeBangunanId || !kategoriFungsiId) {
      setError("Tipe Bangunan dan Kategori Fungsi wajib dipilih.");
      return;
    }
    try {
      await updateLocation.mutateAsync({
        locationId,
        payload: {
          tipe_bangunan_id: tipeBangunanId,
          tipe_bangunan_custom: tipeBangunanCustom.trim() || undefined,
          kategori_fungsi_id: kategoriFungsiId,
          kategori_fungsi_custom: kategoriFungsiCustom.trim() || undefined,
          address: "",
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
          notes: notes.trim() || undefined,
          survey_notes: surveyNotes.trim() || undefined,
          access_regulations: accessRegulations.trim() || undefined, // ← NEW ✅
        },
      });
      setToast({ message: "Lokasi berhasil diperbarui", type: "success" });
      setTimeout(() => {
        navigate({
          to: "/customers/$customerId/locations/$locationId",
          params: { customerId, locationId },
        });
      }, 1200);
    } catch (err: any) {
      setError(err?.message ?? "Gagal menyimpan perubahan.");
    }
  }

  if (!location || !seeded) {
    return (
      <PageLayout title="Edit Lokasi">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-slate-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </PageLayout>
    );
  }

  const isSaving = updateLocation.isPending;

  return (
    <PageLayout
      title="Edit Lokasi"
      subtitle={location.name}
      action={
        <Link
          to="/customers/$customerId/locations/$locationId"
          params={{ customerId, locationId }}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          Batalkan
        </Link>
      }
    >
      <Toast toast={toast} onDismiss={() => setToast(null)} />

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
          <div className="col-span-2 space-y-6">
            {/* Tipe Bangunan */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-1">
                Tipe Bangunan
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Pilih kelompok, lalu tipe spesifik
              </p>
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
                        const lt = (allTipeBangunan ?? []).find(
                          (t) => t.group_id === g.id && t.label === "Lainnya",
                        );
                        setTipeBangunanId(lt?.id ?? null);
                        setTipeBangunanLabel("Lainnya");
                      } else {
                        setTipeBangunanId(null);
                        setTipeBangunanLabel("");
                      }
                    }}
                    className={`px-3 py-3 rounded-xl border-2 text-left transition-colors ${selectedGroupId === g.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <p
                      className={`text-xs font-medium ${selectedGroupId === g.id ? "text-blue-700" : "text-slate-700"}`}
                    >
                      {g.label}
                    </p>
                  </button>
                ))}
              </div>
              {selectedGroupId &&
                (selectedGroupIsLainnya ? (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Langkah 2 — Sebutkan tipe bangunan
                    </p>
                    <input
                      type="text"
                      value={tipeBangunanCustom}
                      onChange={(e) => setTipeBangunanCustom(e.target.value)}
                      placeholder="Contoh: Pesantren, Rusun, Asrama..."
                      className={inputClass}
                    />
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
                            className={`px-3 py-3 rounded-xl border-2 text-center transition-colors flex flex-col items-center gap-1 ${tipeBangunanId === t.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                          >
                            <TipeBangunanIcon label={t.label} size={24} />
                            <p
                              className={`text-xs font-medium leading-tight ${tipeBangunanId === t.id ? "text-blue-700" : "text-slate-700"}`}
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

            {/* Kategori Fungsi */}
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
                    className={`px-3 py-3 rounded-xl border-2 text-center transition-colors flex flex-col items-center gap-1 ${kategoriFungsiId === k.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <KategoriFungsiIcon label={k.label} size={22} />
                    <p
                      className={`text-[11px] font-medium leading-tight ${kategoriFungsiId === k.id ? "text-blue-700" : "text-slate-700"}`}
                    >
                      {k.label}
                    </p>
                  </button>
                ))}
              </div>
              {kategoriFungsiList?.find((k) => k.id === kategoriFungsiId)
                ?.label === "Lainnya" && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={kategoriFungsiCustom}
                    onChange={(e) => setKategoriFungsiCustom(e.target.value)}
                    placeholder="Contoh: Sosial, Komunitas..."
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Address */}
            <AddressFields
              values={addressValues}
              onChange={(updated) =>
                setAddressValues((prev) => ({ ...prev, ...updated }))
              }
            />

            {/* Notes + Regulations */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">
                Catatan & Regulasi
              </h2>
              <div className="space-y-4">
                {/* ── NEW: Access Regulations ── */}
                <Field label="Regulasi & aturan akses">
                  <textarea
                    value={accessRegulations}
                    onChange={(e) => setAccessRegulations(e.target.value)}
                    rows={3}
                    placeholder="Contoh: Wajib menunjukkan KTP di lobby · Dilarang masuk tanpa escort · Jam akses 08.00–17.00 · Wajib melapor ke satpam..."
                    className={`${inputClass} resize-none`}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Ditampilkan kepada teknisi sebelum memulai pekerjaan ✅
                  </p>
                </Field>

                <Field label="Catatan lokasi">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Akses khusus, jam operasional, dll..."
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <Field label="Catatan survei">
                  <textarea
                    value={surveyNotes}
                    onChange={(e) => setSurveyNotes(e.target.value)}
                    rows={2}
                    placeholder="Hasil survei lapangan..."
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Right — summary */}
          <div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6">
              <h2 className="font-semibold text-slate-800 mb-4">Ringkasan</h2>
              <div className="space-y-3 mb-6">
                {tipeBangunanId && (
                  <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                    <TipeBangunanIcon label={tipeBangunanLabel} size={28} />
                    <div>
                      <p className="text-xs text-slate-400">Tipe Bangunan</p>
                      <p className="text-sm font-medium text-slate-800">
                        {tipeBangunanLabel}
                      </p>
                    </div>
                  </div>
                )}
                {kategoriFungsiId && (
                  <div className="flex items-center gap-3 py-2 border-b border-slate-100">
                    <KategoriFungsiIcon
                      label={
                        kategoriFungsiList?.find(
                          (k) => k.id === kategoriFungsiId,
                        )?.label ?? ""
                      }
                      size={28}
                    />
                    <div>
                      <p className="text-xs text-slate-400">Kategori Fungsi</p>
                      <p className="text-sm font-medium text-slate-800">
                        {kategoriFungsiList?.find(
                          (k) => k.id === kategoriFungsiId,
                        )?.label ?? "—"}
                      </p>
                    </div>
                  </div>
                )}
                {accessRegulations.trim() && (
                  <div className="py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-400 mb-0.5">
                      Regulasi akses
                    </p>
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 leading-relaxed line-clamp-3">
                      {accessRegulations}
                    </p>
                  </div>
                )}
                {addressValues.address_street && (
                  <div className="py-1.5 border-b border-slate-100">
                    <p className="text-xs text-slate-400 mb-0.5">Alamat</p>
                    <p className="text-sm text-slate-700 truncate">
                      {[
                        addressValues.address_prefix,
                        addressValues.address_street,
                        addressValues.address_number,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isSaving ||
                  !tipeBangunanId ||
                  !kategoriFungsiId ||
                  !addressValues.address_street?.trim()
                }
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}

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

const inputClass = `
  w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
  focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
  disabled:bg-slate-50 disabled:text-slate-400
`.trim();
