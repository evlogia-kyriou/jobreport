import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const PROJECT_REASONS = ["Kesalahan input", "Lainnya"];

const SERVICE_TYPES = [
  { value: "cleaning", label: "Cuci AC" },
  { value: "service", label: "Servis" },
  { value: "installation", label: "Pasang" },
];

interface Location {
  id: string;
  name: string;
  address: string;
}

interface EditProjectModalProps {
  project: any;
  onClose: () => void;
  onConfirm: (changes: {
    locationId?: string;
    type?: string;
    reason: string;
    notes?: string;
  }) => Promise<void>;
  isPending: boolean;
}

export function EditProjectModal({
  project,
  onClose,
  onConfirm,
  isPending,
}: EditProjectModalProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>(
    project.location_id ?? "",
  );
  const [type, setType] = useState<string>(project.type ?? "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingLocs, setLoadingLocs] = useState(true);

  useEffect(() => {
    supabase
      .from("locations")
      .select("id, name, address")
      .eq("customer_id", project.customer_id)
      .eq("is_active", true)
      .then(({ data }) => {
        setLocations(data ?? []);
        setLoadingLocs(false);
      });
  }, [project.customer_id]);

  const isLainnya = reason === "Lainnya";
  const notesEmpty = isLainnya && !notes.trim();
  const hasChange =
    locationId !== (project.location_id ?? "") || type !== (project.type ?? "");
  const canSubmit = reason !== "" && !notesEmpty && hasChange && !isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await onConfirm({
        locationId: locationId !== project.location_id ? locationId : undefined,
        type: type !== project.type ? type : undefined,
        reason,
        notes: notes.trim() || undefined,
      });
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan. Coba lagi.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <i
              className="ti ti-edit text-blue-600"
              style={{ fontSize: 20 }}
              aria-hidden="true"
            />
          </div>
          <p className="text-base font-medium text-slate-800 mb-1">
            Edit proyek
          </p>
          <p className="text-sm text-slate-500">{project.project_number}</p>
        </div>

        {/* Form */}
        <div className="px-6 pt-4 pb-0 flex flex-col gap-4">
          {/* Location */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Lokasi
            </label>
            {loadingLocs ? (
              <div className="text-xs text-slate-400">Memuat lokasi...</div>
            ) : (
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-slate-400"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.address}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Service type */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Jenis layanan
            </label>
            <div className="flex gap-2">
              {SERVICE_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    type === t.value
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
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
                setError(null);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-slate-400"
            >
              <option value="">Pilih alasan...</option>
              {PROJECT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Catatan{isLainnya && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                isLainnya ? "Wajib diisi..." : "Tambahkan keterangan (opsional)"
              }
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 bg-white outline-none resize-none ${
                notesEmpty
                  ? "border-red-300"
                  : "border-slate-200 focus:border-slate-400"
              }`}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              "Menyimpan..."
            ) : (
              <>
                <i
                  className="ti ti-check"
                  style={{ fontSize: 13 }}
                  aria-hidden="true"
                />{" "}
                Simpan perubahan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
