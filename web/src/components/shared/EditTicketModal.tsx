import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const TICKET_REASONS = [
  "Kesalahan input",
  "Perubahan jadwal pelanggan",
  "Perubahan teknisi",
  "Lainnya",
];

interface Technician {
  id: string;
  name: string;
  technician_id: string;
}

interface EditTicketModalProps {
  ticket: any;
  onClose: () => void;
  onConfirm: (changes: {
    scheduledDate?: string;
    scheduledTime?: string;
    technicianId?: string;
    reason: string;
    notes?: string;
  }) => Promise<void>;
  isPending: boolean;
}

export function EditTicketModal({
  ticket,
  onClose,
  onConfirm,
  isPending,
}: EditTicketModalProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>(
    ticket.scheduled_date ?? "",
  );
  const [scheduledTime, setScheduledTime] = useState<string>(
    ticket.scheduled_time?.substring(0, 5) ?? "",
  );
  const [technicianId, setTechnicianId] = useState<string>(
    ticket.technician?.id ?? "",
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingTechs, setLoadingTechs] = useState(true);

  useEffect(() => {
    supabase
      .from("technicians")
      .select("id, name, technician_id")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setTechnicians(data ?? []);
        setLoadingTechs(false);
      });
  }, []);

  const isLainnya = reason === "Lainnya";
  const notesEmpty = isLainnya && !notes.trim();
  const hasChange =
    scheduledDate !== (ticket.scheduled_date ?? "") ||
    scheduledTime !== (ticket.scheduled_time?.substring(0, 5) ?? "") ||
    technicianId !== (ticket.technician?.id ?? "");
  const canSubmit = reason !== "" && !notesEmpty && hasChange && !isPending;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await onConfirm({
        scheduledDate:
          scheduledDate !== ticket.scheduled_date ? scheduledDate : undefined,
        scheduledTime:
          scheduledTime !== ticket.scheduled_time?.substring(0, 5)
            ? scheduledTime
            : undefined,
        technicianId:
          technicianId !== (ticket.technician?.id ?? "")
            ? technicianId
            : undefined,
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
            Edit tiket
          </p>
          <p className="text-sm text-slate-500">{ticket.ticket_number}</p>
        </div>

        {/* Form */}
        <div className="px-6 pt-4 pb-0 flex flex-col gap-4">
          {/* Date */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Tanggal
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-slate-400"
            />
          </div>

          {/* Time */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Waktu
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-slate-400"
            />
          </div>

          {/* Technician */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Teknisi
            </label>
            {loadingTechs ? (
              <div className="text-xs text-slate-400">Memuat teknisi...</div>
            ) : (
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-slate-400"
              >
                <option value="">Pilih teknisi...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.technician_id})
                  </option>
                ))}
              </select>
            )}
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
              {TICKET_REASONS.map((r) => (
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
