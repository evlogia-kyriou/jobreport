import { PageLayout } from "@/components/shared/PageLayout";
import { projectRepository } from "@/repositories/projectRepository";
import { useProjectDraftStore } from "@/stores/projectDraftStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// ── Decline modal ─────────────────────────────────────────────────────────────

const DECLINE_REASONS = [
  "Customer membatalkan",
  "Jadwal tidak cocok",
  "Lokasi tidak dapat dilayani",
  "Tidak ada teknisi tersedia",
  "Lainnya",
];

function DeclineModal({
  projectId,
  onClose,
  onDeclined,
}: {
  projectId: string;
  onClose: () => void;
  onDeclined: () => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleDecline() {
    if (!reason) return;
    setSaving(true);
    try {
      const fullReason = reason === "Lainnya" ? notes.trim() : reason;
      await projectRepository.declineBooking(projectId, fullReason);
      onDeclined();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-slate-800 mb-4">
          Tolak permintaan booking
        </p>
        <div className="space-y-3">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="">Pilih alasan...</option>
            {DECLINE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {reason === "Lainnya" && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Keterangan..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white resize-none"
            />
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={handleDecline}
            disabled={
              !reason || saving || (reason === "Lainnya" && !notes.trim())
            }
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg"
          >
            {saving ? "Menolak..." : "Tolak"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onConfirm,
  onDecline,
}: {
  booking: any;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const days = daysSince(booking.created_at);
  const isOverdue = days >= 1;
  const firstDate = booking.proposed_dates?.[0];
  const dateCount = booking.proposed_dates?.length ?? 0;

  return (
    <div
      className={`bg-white rounded-xl border p-5 ${isOverdue ? "border-amber-300" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isOverdue && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                ⏰ {days} hari menunggu
              </span>
            )}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">
              {booking.type}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {booking.customer?.name ?? "—"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {booking.location?.name ?? "—"}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-mono text-slate-400">
            {booking.project_number}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {booking.total_ac_units} unit AC
          </p>
        </div>
      </div>

      {/* Proposed dates */}
      {firstDate && (
        <div className="bg-slate-50 rounded-lg p-3 mb-3">
          <p className="text-xs font-medium text-slate-500 mb-1">
            Usulan jadwal ({dateCount} opsi):
          </p>
          {booking.proposed_dates.slice(0, 3).map((d: any, i: number) => (
            <p key={d.id} className="text-xs text-slate-700">
              {i + 1}. {fmtDate(d.proposed_date)}
              {d.proposed_time && ` · ${d.proposed_time.slice(0, 5)}`}
              {d.notes && ` — ${d.notes}`}
            </p>
          ))}
          {dateCount > 3 && (
            <p className="text-xs text-slate-400 mt-0.5">
              +{dateCount - 3} opsi lainnya
            </p>
          )}
        </div>
      )}

      {booking.notes && (
        <p className="text-xs text-slate-500 italic mb-3">"{booking.notes}"</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onDecline}
          className="flex-1 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
        >
          Tolak
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Konfirmasi →
        </button>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function BookingRequestListScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setDraft = useProjectDraftStore((s) => s.setDraft);

  const [decliningId, setDecliningId] = useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["booking-requests"],
    queryFn: () => projectRepository.getBookingRequests(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const pending = bookings.filter((b: any) => b.status === "pending_confirm");
  const drafts = bookings.filter((b: any) => b.status === "draft");

  async function handleConfirm(booking: any) {
    // Mark as in_progress ✅
    await projectRepository.confirmBooking(booking.id);
    qc.invalidateQueries({ queryKey: ["booking-requests"] });
    qc.invalidateQueries({ queryKey: ["projects"] });

    // Pre-fill CreateProjectScreen ✅
    const firstDate = booking.proposed_dates?.[0];
    const acIds = (booking.project_ticket_ac_units ?? []).map(
      (u: any) => u.ac_unit_id,
    );

    setDraft(
      booking.customer_id,
      booking.location_id,
      acIds,
      booking.type,
      firstDate?.proposed_date ?? null,
      firstDate?.proposed_time?.slice(0, 5) ?? null,
    );
    navigate({ to: "/projects/create" });
  }

  return (
    <PageLayout
      title="Permintaan Booking"
      subtitle={`${pending.length} menunggu konfirmasi`}
      action={
        <Link
          to="/projects/bookings/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Buat Permintaan
        </Link>
      }
    >
      {isLoading && (
        <div className="text-center py-16 text-slate-400">Memuat...</div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm mb-4">
            Tidak ada permintaan booking.
          </p>
          <Link
            to="/projects/bookings/new"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            + Buat permintaan pertama
          </Link>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 bg-amber-50 border-amber-200 text-amber-700">
            <span>⏳</span>
            <span className="text-sm font-semibold">
              Menunggu Konfirmasi Customer
            </span>
            <span className="ml-auto text-xs font-medium opacity-70">
              {pending.length} permintaan
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pending.map((b: any) => (
              <BookingCard
                key={b.id}
                booking={b}
                onConfirm={() => handleConfirm(b)}
                onDecline={() => setDecliningId(b.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 bg-slate-50 border-slate-200 text-slate-600">
            <span>📝</span>
            <span className="text-sm font-semibold">Draft</span>
            <span className="ml-auto text-xs font-medium opacity-70">
              {drafts.length} draft
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {drafts.map((b: any) => (
              <BookingCard
                key={b.id}
                booking={b}
                onConfirm={() => handleConfirm(b)}
                onDecline={() => setDecliningId(b.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Decline modal */}
      {decliningId && (
        <DeclineModal
          projectId={decliningId}
          onClose={() => setDecliningId(null)}
          onDeclined={() => {
            setDecliningId(null);
            qc.invalidateQueries({ queryKey: ["booking-requests"] });
            qc.invalidateQueries({ queryKey: ["projects"] });
          }}
        />
      )}
    </PageLayout>
  );
}
