import { useState } from "react";

interface DeleteConfirmModalProps {
  title: string;
  description: string;
  itemLabel: string;
  reasons: string[];
  confirmLabel?: string;
  onConfirm: (reason: string, notes?: string) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
}

export function DeleteConfirmModal({
  title,
  description,
  itemLabel,
  reasons,
  confirmLabel = "Ya, hapus",
  onConfirm,
  onClose,
  isPending,
}: DeleteConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isLainnya = reason === "Lainnya";
  const notesRequired = isLainnya && !notes.trim();
  const canSubmit = reason !== "" && !notesRequired && !isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await onConfirm(reason, notes.trim() || undefined);
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
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
            <i
              className="ti ti-trash text-red-600"
              style={{ fontSize: 20 }}
              aria-hidden="true"
            />
          </div>
          <p className="text-base font-medium text-slate-800 mb-1">{title}</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Item label */}
        <div className="mx-6 mt-4 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <p className="text-sm text-red-800 font-medium">{itemLabel}</p>
        </div>

        {/* Form */}
        <div className="px-6 pt-4 pb-0 flex flex-col gap-4">
          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Alasan penghapusan <span className="text-red-500">*</span>
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
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Catatan tambahan
              {isLainnya && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={
                isLainnya
                  ? "Wajib diisi — jelaskan alasan penghapusan..."
                  : "Tambahkan keterangan jika diperlukan..."
              }
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 bg-white outline-none resize-none leading-relaxed ${
                isLainnya && !notes.trim()
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-slate-400"
              }`}
            />
            {isLainnya && !notes.trim() && (
              <p className="text-xs text-red-500 mt-1">
                Catatan wajib diisi jika memilih "Lainnya"
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
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
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {isPending ? (
              "Menghapus..."
            ) : (
              <>
                <i
                  className="ti ti-trash"
                  style={{ fontSize: 13 }}
                  aria-hidden="true"
                />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
