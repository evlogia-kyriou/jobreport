import { useRescheduleTicket } from "@/hooks/useProjectTickets";
import { useTechnicians } from "@/hooks/useTechnicians";
import { useAuthStore } from "@/stores/authStore";
import type { Technician, WorkTicket } from "@/types/app";
import { useEffect, useState } from "react";

export function RescheduleTicketModal({
  ticket,
  onClose,
  onSuccess,
}: {
  ticket: WorkTicket;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuthStore();
  const rescheduleMutation = useRescheduleTicket();
  const { data: allTechnicians } = useTechnicians();

  // ── Form state ────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    ticket.estimated_minutes,
  );
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Filter available technicians ──────────────────────────────────────────
  // Filter by skill match — overlap check done by DB trigger
  const skillMatch = (t: Technician) => t.skills.includes(ticket.type);

  const availableTechnicians = allTechnicians?.filter(skillMatch) ?? [];
  const displayTechnicians = showAll
    ? (allTechnicians ?? [])
    : availableTechnicians;

  // Reset technician when date/time changes
  useEffect(() => {
    setTechnicianId("");
  }, [date, time]);

  // ── Validation ────────────────────────────────────────────────────────────
  const canSubmit =
    date &&
    time &&
    technicianId &&
    estimatedMinutes > 0 &&
    !rescheduleMutation.isPending;

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await rescheduleMutation.mutateAsync({
        cancelledTicket: ticket,
        technicianId,
        scheduledDate: date,
        scheduledTime: time,
        estimatedMinutes,
        createdBy: user?.id ?? "",
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "Gagal menjadwalkan ulang.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Jadwalkan Ulang
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {ticket.ticket_number} · {ticket.ac_units?.length ?? 0} unit AC
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
          <p className="text-xs text-amber-700 font-medium">
            🚩 Tiket dibatalkan karena pelanggan tidak ada di lokasi.
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Unit AC, langkah kerja, dan lokasi akan disalin otomatis.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Tanggal Baru *
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Waktu Mulai *
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Estimated minutes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Estimasi Durasi (menit) *
            </label>
            <input
              type="number"
              value={estimatedMinutes}
              min={15}
              step={15}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400">
              Disalin dari tiket sebelumnya. Ubah jika perlu.
            </p>
          </div>

          {/* Technician */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Teknisi *
              </label>
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showAll
                  ? `Tampilkan tersedia (${availableTechnicians.length})`
                  : "Tampilkan semua"}
              </button>
            </div>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              required
              disabled={!date || !time}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {!date || !time
                  ? "Pilih tanggal dan waktu dulu..."
                  : "Pilih teknisi..."}
              </option>
              {displayTechnicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.technician_id}
                  {!skillMatch(t) ? " ⚠ skill tidak sesuai" : ""}
                </option>
              ))}
            </select>

            {date && time && availableTechnicians.length === 0 && !showAll && (
              <p className="text-xs text-amber-600">
                Tidak ada teknisi tersedia dengan skill {ticket.type}. Klik
                "Tampilkan semua" untuk pilih manual.
              </p>
            )}
          </div>

          {/* Copied ACs summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <p className="text-xs font-medium text-slate-600 mb-1">
              Unit AC yang disalin ({ticket.ac_units?.length ?? 0} unit):
            </p>
            <div className="flex flex-wrap gap-1">
              {ticket.ac_units?.slice(0, 5).map((u) => (
                <span
                  key={u.ac_unit_id}
                  className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono"
                >
                  {u.ac_unit?.ac_code ?? u.ac_unit_id.substring(0, 8)}
                </span>
              ))}
              {(ticket.ac_units?.length ?? 0) > 5 && (
                <span className="text-xs text-slate-400">
                  +{(ticket.ac_units?.length ?? 0) - 5} lainnya
                </span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {rescheduleMutation.isPending
                ? "Membuat tiket..."
                : "Jadwalkan Ulang"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
