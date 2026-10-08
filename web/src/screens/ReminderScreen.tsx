import { PageLayout } from "@/components/shared/PageLayout";
import {
  useDismissReminder,
  useGenerateReminders,
  useReminders,
  useUpdateReminderPhase1,
  useUpdateReminderPhase2,
} from "@/hooks/useReminders";
import {
  buildReminderCSV,
  downloadCSV,
} from "@/repositories/reminderRepository";
import { useAuthStore } from "@/stores/authStore";
import type { Phase1Status, Phase2Status, ReminderRow } from "@/types/app";
import { DIUNDUR_REASONS, TIDAK_TERTARIK_REASONS } from "@/types/app";
import { useState } from "react";

// ── Label helpers ─────────────────────────────────────────────────────────────

function phase1Label(s: Phase1Status) {
  return s === "belum_dikirim"
    ? "Belum dikirim"
    : s === "belum_terkirim"
      ? "Belum terkirim"
      : "Terkirim";
}

function phase1Class(s: Phase1Status) {
  return s === "terkirim"
    ? "bg-green-50 text-green-700 border-green-200"
    : s === "belum_terkirim"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-slate-50 text-slate-500 border-slate-200";
}

function phase2Label(s: Phase2Status | null) {
  if (!s) return null;
  return (
    {
      menunggu_respons: "Menunggu respons",
      pelanggan_setuju: "Pelanggan setuju",
      pelanggan_belum_merespons: "Belum merespons",
      diundur: "Diundur",
      tidak_tertarik: "Tidak tertarik",
    }[s] ?? s
  );
}

function phase2Class(s: Phase2Status | null) {
  if (!s) return "";
  return s === "pelanggan_setuju"
    ? "bg-green-50 text-green-700 border-green-200"
    : s === "diundur"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : s === "tidak_tertarik"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
}

// ── Phase 2 update modal ──────────────────────────────────────────────────────

function Phase2Modal({
  reminder,
  onClose,
  onSave,
  isPending,
}: {
  reminder: ReminderRow;
  onClose: () => void;
  onSave: (payload: {
    phase2Status: Phase2Status;
    followUpDate?: string;
    reasonCode?: string;
    reasonNotes?: string;
    respondedAt?: string; // ← NEW ✅
    responseNotes?: string; // ← NEW ✅
  }) => void;
  isPending: boolean;
}) {
  const [status, setStatus] = useState<Phase2Status>("menunggu_respons");
  const [followUp, setFollowUp] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [respondedAt, setRespondedAt] = useState(""); // ← NEW ✅
  const [responseNotes, setResponseNotes] = useState(""); // ← NEW ✅
  const [notes, setNotes] = useState("");

  // Default follow-up date: +1 month
  const defaultFollowUp = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  })();

  const needsReason = status === "diundur" || status === "tidak_tertarik";
  const needsDate = status === "diundur";
  const reasons =
    status === "diundur" ? DIUNDUR_REASONS : TIDAK_TERTARIK_REASONS;
  const isLainnya = reasonCode === "Lainnya";
  const notesEmpty = isLainnya && !notes.trim();
  const canSave =
    !notesEmpty && (needsReason ? reasonCode !== "" : true) && !isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-0">
          <p className="text-base font-medium text-slate-800 mb-1">
            Update respons pelanggan
          </p>
          <p className="text-sm text-slate-500 truncate">
            {reminder.customer?.name} · {reminder.location?.name}
          </p>
        </div>

        <div className="px-6 pt-4 pb-0 flex flex-col gap-4">
          {/* Status */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">
              Respons pelanggan <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as Phase2Status);
                setReasonCode("");
                setNotes("");
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-slate-400"
            >
              <option value="menunggu_respons">Menunggu respons</option>
              <option value="pelanggan_belum_merespons">
                Pelanggan belum merespons
              </option>
              <option value="pelanggan_setuju">Pelanggan setuju ✅</option>
              <option value="diundur">Diundur</option>
              <option value="tidak_tertarik">Tidak tertarik</option>
            </select>
          </div>

          {/* Follow-up date (diundur) */}
          {needsDate && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">
                Ingatkan kembali pada
              </label>
              <input
                type="date"
                value={followUp || defaultFollowUp}
                onChange={(e) => setFollowUp(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-slate-400"
              />
              <p className="text-xs text-slate-400 mt-1">
                Default: 1 bulan dari sekarang
              </p>
            </div>
          )}

          {/* Reason (diundur + tidak_tertarik) */}
          {needsReason && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">
                Alasan <span className="text-red-500">*</span>
              </label>
              <select
                value={reasonCode}
                onChange={(e) => {
                  setReasonCode(e.target.value);
                  setNotes("");
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-slate-400"
              >
                <option value="">Pilih alasan...</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes for Lainnya */}
          {isLainnya && (
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">
                Keterangan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Wajib diisi..."
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none resize-none ${
                  notesEmpty
                    ? "border-red-300"
                    : "border-slate-200 focus:border-slate-400"
                }`}
              />
            </div>
          )}

          {/* Tanggal respons + catatan — shown when customer has responded ✅ */}
          {(status === "pelanggan_setuju" ||
            status === "diundur" ||
            status === "tidak_tertarik") && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Tanggal respons customer (opsional)
                </label>
                <input
                  type="date"
                  value={respondedAt}
                  onChange={(e) => setRespondedAt(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">
                  Catatan respons (opsional)
                </label>
                <textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={2}
                  placeholder="Detail respons customer, komitmen, dll."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none resize-none focus:border-slate-400"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 p-6 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() =>
              onSave({
                phase2Status: status,
                followUpDate: followUp || defaultFollowUp,
                reasonCode: reasonCode || undefined,
                reasonNotes: notes.trim() || undefined,
                respondedAt: respondedAt || undefined, // ← NEW ✅
                responseNotes: responseNotes.trim() || undefined, // ← NEW ✅
              })
            }
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            {isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reminder row ──────────────────────────────────────────────────────────────

function ReminderItem({
  reminder,
  onPhase1Change,
  onPhase2Open,
  onDismiss,
  isPending,
}: {
  reminder: ReminderRow;
  onPhase1Change: (id: string, status: Phase1Status) => void;
  onPhase2Open: (reminder: ReminderRow) => void;
  onDismiss: (id: string) => void;
  isPending: boolean;
}) {
  const isCleaning = reminder.reminder_type === "cleaning_cycle";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            {reminder.customer?.name ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {reminder.location?.name ?? "—"} ·{" "}
            {reminder.location?.address ?? "—"}
          </p>
          {!isCleaning && reminder.ticket?.ticket_number && (
            <p className="text-xs text-blue-600 font-mono mt-0.5">
              {reminder.ticket.ticket_number}
              {reminder.ticket.is_flagged && " · ⚠ Temuan"}
            </p>
          )}
          {isCleaning && reminder.days_overdue && (
            <p className="text-xs text-amber-600 mt-0.5">
              {reminder.days_overdue} hari terlewat
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              isCleaning
                ? "bg-sky-50 text-sky-700 border-sky-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {isCleaning ? "Perlu Cuci" : "Temuan"}
          </span>
          <button
            onClick={() => onDismiss(reminder.id)}
            className="p-1 text-slate-300 hover:text-slate-500 transition-colors"
            title="Dismiss"
          >
            <i
              className="ti ti-x"
              style={{ fontSize: 12 }}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Phase 1 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-slate-500 w-20 shrink-0">
          Pengiriman:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            ["belum_dikirim", "belum_terkirim", "terkirim"] as Phase1Status[]
          ).map((s) => (
            <button
              key={s}
              onClick={() => onPhase1Change(reminder.id, s)}
              disabled={isPending}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                reminder.phase1_status === s
                  ? phase1Class(s) + " font-medium"
                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"
              }`}
            >
              {phase1Label(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Phase 2 */}
      {reminder.phase1_status === "terkirim" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-20 shrink-0">Respons:</span>
          <div className="flex items-center gap-2">
            {reminder.phase2_status && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${phase2Class(reminder.phase2_status)}`}
              >
                {phase2Label(reminder.phase2_status)}
                {reminder.phase2_status === "diundur" &&
                  reminder.follow_up_date &&
                  ` · ${reminder.follow_up_date}`}
              </span>
            )}
            <button
              onClick={() => onPhase2Open(reminder)}
              className="text-xs text-blue-600 hover:text-blue-700 underline decoration-dotted"
            >
              {reminder.phase2_status ? "Ubah" : "Update respons"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ReminderScreen() {
  const { user } = useAuthStore();
  const { data: reminders = [], isLoading } = useReminders();
  const generateReminders = useGenerateReminders();
  const updatePhase1 = useUpdateReminderPhase1();
  const updatePhase2 = useUpdateReminderPhase2();
  const dismiss = useDismissReminder();

  const [phase2Modal, setPhase2Modal] = useState<ReminderRow | null>(null);
  const [activeTab, setActiveTab] = useState<"cleaning_cycle" | "temuan">(
    "cleaning_cycle",
  );

  const cleaning = reminders.filter(
    (r) => r.reminder_type === "cleaning_cycle",
  );
  const temuan = reminders.filter((r) => r.reminder_type === "temuan");
  const current = activeTab === "cleaning_cycle" ? cleaning : temuan;

  function handleDownloadCSV() {
    const csv = buildReminderCSV(reminders);
    const filename = `reminder-${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csv, filename);
  }

  return (
    <PageLayout title="Reminder Salesperson">
      <div className="flex flex-col gap-5">
        {/* ── Header actions ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => generateReminders.mutate(user?.id ?? "")}
              disabled={generateReminders.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <i
                className="ti ti-refresh"
                style={{ fontSize: 14 }}
                aria-hidden="true"
              />
              {generateReminders.isPending ? "Memuat..." : "Buat reminder"}
            </button>
            <p className="text-xs text-slate-400">
              Memuat data AC overdue + temuan yang belum terselesaikan
            </p>
          </div>
          <button
            onClick={handleDownloadCSV}
            disabled={reminders.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <i
              className="ti ti-download"
              style={{ fontSize: 14 }}
              aria-hidden="true"
            />
            Download CSV
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {(
            [
              {
                key: "cleaning_cycle",
                label: "Perlu Cuci",
                count: cleaning.length,
              },
              {
                key: "temuan",
                label: "Perlu Tindak Lanjut",
                count: temuan.length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            Memuat...
          </div>
        ) : current.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">
              {reminders.length === 0
                ? 'Klik "Buat reminder" untuk memuat data terbaru'
                : "Tidak ada reminder di kategori ini"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {current.map((r) => (
              <ReminderItem
                key={r.id}
                reminder={r}
                isPending={updatePhase1.isPending || dismiss.isPending}
                onPhase1Change={(id, status) =>
                  updatePhase1.mutate({
                    reminderId: id,
                    phase1Status: status,
                    updatedBy: user?.id ?? "",
                  })
                }
                onPhase2Open={setPhase2Modal}
                onDismiss={(id) =>
                  dismiss.mutate({ reminderId: id, updatedBy: user?.id ?? "" })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Phase 2 modal ── */}
      {phase2Modal && (
        <Phase2Modal
          reminder={phase2Modal}
          isPending={updatePhase2.isPending}
          onClose={() => setPhase2Modal(null)}
          onSave={(payload) => {
            updatePhase2.mutate({
              reminderId: phase2Modal.id,
              updatedBy: user?.id ?? "",
              ...payload,
            });
            setPhase2Modal(null);
          }}
        />
      )}
    </PageLayout>
  );
}
