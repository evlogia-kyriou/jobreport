import { DeleteConfirmModal } from "@/components/shared/DeleteConfirmModal";
import { EditAcUnitsModal } from "@/components/shared/EditAcUnitsModal";
import { EditTicketModal } from "@/components/shared/EditTicketModal";
import { PageLayout } from "@/components/shared/PageLayout";
import {
  useApproveAcUnit,
  useConfirmFlag,
  useConfirmReplacement,
  useDeleteTicket,
  useDismissFlag,
  useEditTicket,
  useRejectReplacement,
} from "@/hooks/useProjects";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { fmtBuildingUnit } from "@/utils/locationFormatters";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AcUnitStep {
  id: string;
  ac_unit_id: string;
  section: string;
  order_number: number;
  description: string;
  step_type: string;
  input_unit: string | null;
  input_value: string | null;
  is_checked: boolean;
  is_condition_abnormal: boolean;
  photo_url: string | null;
  is_completed: boolean;
  ac_unit: {
    id: string;
    ac_code: string;
    type: string;
    capacity_pk: string;
    building_unit: {
      floor: string | null;
      room: string | null;
      zone_label: string | null;
    } | null;
  };
}

interface TicketFlag {
  id: string;
  flag_type: string;
  is_confirmed: boolean | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  dismiss_reason: string | null;
  notes: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUHU_MAX = 12;
const ARUS_MIN_PCT = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function deltaStatus(
  before: number,
  after: number,
  type: "suhu" | "arus",
): "good" | "warn" | "bad" {
  if (type === "suhu") return after < SUHU_MAX ? "good" : "bad";
  const drop = ((before - after) / before) * 100;
  if (drop >= ARUS_MIN_PCT) return "good";
  if (drop > 0) return "warn";
  return "bad";
}

function typeLabel(type: string) {
  return (
    { cleaning: "Cuci AC", service: "Servis", installation: "Pasang" }[type] ??
    type
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(t: string) {
  return t ? t.substring(0, 5) + " WIB" : "";
}

function statusLabel(s: string) {
  return (
    {
      submitted: "Terkirim",
      approved: "Disetujui",
      in_progress: "Berlangsung",
      assigned: "Belum Mulai",
    }[s] ?? s
  );
}

function statusBadgeClass(s: string) {
  return s === "approved"
    ? "bg-green-50 text-green-700 border-green-200"
    : s === "submitted"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : s === "in_progress"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-slate-50 text-slate-500 border-slate-200";
}

function flagTypeLabel(type: string): string {
  return (
    (
      {
        no_client: "Pelanggan Tidak Ada",
        no_pic_signature: "Tidak Ada Tanda Tangan",
        unit_replacement: "Penggantian Unit",
        work_reopened: "Pekerjaan Dibuka Ulang",
      } as Record<string, string>
    )[type] ?? type
  );
}

const DISMISS_REASONS = [
  "Salah diagnosis",
  "Customer tangani sendiri",
  "Lainnya",
] as const;

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchTicket(ticketId: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `id, ticket_number, type, status, scheduled_date, scheduled_time, is_flagged,
             project_ticket_id, location_id,
             technician:technicians!technician_id(name),
             location:locations!location_id(name, address, access_regulations),
             project_ticket:project_tickets!project_ticket_id(id, project_number)`,
    )
    .eq("id", ticketId)
    .single();
  if (error) throw error;
  return data as any;
}

async function fetchSteps(ticketId: string) {
  const { data, error } = await supabase
    .from("ticket_steps")
    .select(
      `id, ac_unit_id, section, order_number, description, step_type,
             input_unit, input_value, is_checked, is_condition_abnormal,
             photo_url, is_completed,
             ac_unit:ac_units!ac_unit_id(
               id, ac_code, type, capacity_pk,
               building_unit:building_units!building_unit_id(floor, room, zone_label)
             )`,
    )
    .eq("ticket_id", ticketId)
    .order("ac_unit_id")
    .order("order_number");
  if (error) throw error;
  return (data ?? []) as unknown as AcUnitStep[];
}

async function fetchUnitApprovals(ticketId: string) {
  const { data, error } = await supabase
    .from("ticket_ac_units")
    .select(
      `ac_unit_id, is_approved, photo_unit_indoor_url, photo_unit_outdoor_url,
             replacement_type, replacement_brand_id, replacement_capacity_pk,
             replacement_is_new, replacement_mfr_year, replacement_photo_indoor_url`,
    )
    .eq("ticket_id", ticketId);
  if (error) throw error;
  return (data ?? []) as any[];
}

async function fetchTicketFlags(ticketId: string): Promise<TicketFlag[]> {
  const { data, error } = await supabase
    .from("ticket_flags")
    .select(
      "id, flag_type, is_confirmed, confirmed_by, confirmed_at, dismiss_reason, notes",
    )
    .eq("ticket_id", ticketId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as TicketFlag[];
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────

function ConfirmModal({
  flagType,
  isPending,
  onClose,
  onConfirm,
}: {
  flagType: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const canSave = notes.trim().length >= 10 && !isPending;
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
        <div className="p-6 pb-4">
          <p className="text-base font-semibold text-slate-800 mb-1">
            Konfirmasi temuan
          </p>
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 mb-3">
            {flagTypeLabel(flagType)}
          </span>
          <p className="text-sm text-slate-500 mb-4">
            Konfirmasi bahwa masalah ini benar terjadi. Tiket dapat disetujui
            setelah konfirmasi.
          </p>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">
            Catatan berdasarkan laporan teknisi{" "}
            <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Deskripsikan situasi yang dilaporkan teknisi..."
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none resize-none ${
              notes.trim().length > 0 && notes.trim().length < 10
                ? "border-red-300"
                : "border-slate-200 focus:border-slate-400"
            }`}
          />
          {notes.trim().length > 0 && notes.trim().length < 10 && (
            <p className="text-xs text-red-500 mt-1">Minimal 10 karakter</p>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(notes.trim())}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium"
          >
            {isPending ? "Menyimpan..." : "Konfirmasi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DismissModal ──────────────────────────────────────────────────────────────

function DismissModal({
  flagType,
  isPending,
  onClose,
  onDismiss,
}: {
  flagType: string;
  isPending: boolean;
  onClose: () => void;
  onDismiss: (reason: string, notes?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const isLainnya = reason === "Lainnya";
  const canSave =
    reason !== "" && (!isLainnya || notes.trim().length > 0) && !isPending;
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
        <div className="p-6 pb-4">
          <p className="text-base font-semibold text-slate-800 mb-1">
            Abaikan temuan ini?
          </p>
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200 mb-3">
            {flagTypeLabel(flagType)}
          </span>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">
            Alasan <span className="text-red-500">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setNotes("");
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none mb-3"
          >
            <option value="">Pilih alasan...</option>
            {DISMISS_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {isLainnya && (
            <>
              <label className="text-xs font-medium text-slate-500 block mb-1.5">
                Keterangan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Wajib diisi..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none resize-none"
              />
            </>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={() =>
              onDismiss(reason, isLainnya ? notes.trim() : undefined)
            }
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-medium"
          >
            {isPending ? "Menyimpan..." : "Abaikan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FlagActionBar ─────────────────────────────────────────────────────────────

function FlagActionBar({
  flags,
  canConfirm,
  onConfirmClick,
  onDismissClick,
}: {
  flags: TicketFlag[];
  canConfirm: boolean;
  onConfirmClick: (flagId: string) => void;
  onDismissClick: (flagId: string) => void;
}) {
  if (!flags.length) return null;
  return (
    <div className="mt-3 mb-2 flex flex-col gap-2">
      {flags.map((flag) => {
        const isConfirmed = !!flag.is_confirmed;
        const isDismissed = !!flag.dismiss_reason && !flag.is_confirmed;
        const isUnresolved = !flag.is_confirmed && !flag.dismiss_reason;
        return (
          <div
            key={flag.id}
            className={`rounded-lg border px-4 py-3 ${
              isConfirmed
                ? "bg-blue-50 border-blue-200"
                : isDismissed
                  ? "bg-slate-50 border-slate-200"
                  : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    isConfirmed
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : isDismissed
                        ? "bg-slate-100 text-slate-500 border-slate-200"
                        : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}
                >
                  {isConfirmed
                    ? "✅ Dikonfirmasi"
                    : isDismissed
                      ? "Diabaikan"
                      : "⚠ Temuan"}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {flagTypeLabel(flag.flag_type)}
                </span>
              </div>
              {isUnresolved && canConfirm && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => onDismissClick(flag.id)}
                    className="text-xs font-medium px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Abaikan
                  </button>
                  <button
                    onClick={() => onConfirmClick(flag.id)}
                    className="text-xs font-medium px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Konfirmasi
                  </button>
                </div>
              )}
            </div>
            {isConfirmed && flag.notes && (
              <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
                "{flag.notes}"
              </p>
            )}
            {isDismissed && (
              <p className="text-xs text-slate-500 mt-1.5">
                Alasan: {flag.dismiss_reason}
                {flag.notes && ` — ${flag.notes}`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function WebTicketDetailScreen() {
  const { ticketId } = useParams({ strict: false });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, hasPermission, isRole } = useAuthStore();
  const canApprove = hasPermission("approve_unit");
  const canConfirm = hasPermission("confirm_findings");

  const deleteTicket = useDeleteTicket();
  const editTicket = useEditTicket();
  const approveUnit = useApproveAcUnit();
  const confirmReplace = useConfirmReplacement();
  const rejectReplace = useRejectReplacement();
  const confirmFlagMut = useConfirmFlag();
  const dismissFlagMut = useDismissFlag();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditAcModal, setShowEditAcModal] = useState(false);
  const [confirmingFlagId, setConfirmingFlagId] = useState<string | null>(null);
  const [dismissingFlagId, setDismissingFlagId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: ticket, isLoading: lt } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId!),
    enabled: !!ticketId,
  });
  const {
    data: steps = [],
    isLoading: ls,
    refetch: refetchSteps,
  } = useQuery({
    queryKey: ["ticket-steps", ticketId],
    queryFn: () => fetchSteps(ticketId!),
    enabled: !!ticketId,
  });
  const { data: approvals = [] } = useQuery({
    queryKey: ["ticket-approvals", ticketId],
    queryFn: () => fetchUnitApprovals(ticketId!),
    enabled: !!ticketId,
  });
  const { data: flags = [] } = useQuery({
    // ← FIXED: was missing ✅
    queryKey: ["ticket-flags", ticketId],
    queryFn: () => fetchTicketFlags(ticketId!),
    enabled: !!ticketId,
  });

  const hasUnresolvedFlag = flags.some(
    (f) => !f.is_confirmed && !f.dismiss_reason,
  );

  const stepsByUnit = useMemo(() => {
    const map = new Map<string, AcUnitStep[]>();
    steps.forEach((s) => {
      if (!map.has(s.ac_unit_id)) map.set(s.ac_unit_id, []);
      map.get(s.ac_unit_id)!.push(s);
    });
    return map;
  }, [steps]);

  const approvalMap = useMemo(() => {
    const map = new Map<string, any>();
    approvals.forEach((a) => map.set(a.ac_unit_id, a));
    return map;
  }, [approvals]);

  if (lt || ls)
    return (
      <PageLayout title="Detail tiket">
        <div className="text-center py-16 text-slate-400">Memuat...</div>
      </PageLayout>
    );
  if (!ticket)
    return (
      <PageLayout title="Detail tiket">
        <div className="text-center py-16 text-slate-400">
          Tiket tidak ditemukan.
        </div>
      </PageLayout>
    );

  const canEdit = !["in_progress", "submitted", "approved"].includes(
    ticket.status,
  );
  const canDelete = canEdit;

  return (
    <PageLayout title="Detail tiket">
      {/* ── Modals ── */}
      {showEditModal && (
        <EditTicketModal
          ticket={ticket}
          isPending={editTicket.isPending}
          onClose={() => setShowEditModal(false)}
          onConfirm={async (changes) => {
            await editTicket.mutateAsync({
              ticketId: ticketId!,
              editedBy: user?.id ?? "",
              ...changes,
            });
            setShowEditModal(false);
          }}
        />
      )}
      {showEditAcModal && ticket?.location_id && (
        <EditAcUnitsModal
          ticketId={ticketId!}
          locationId={ticket.location_id}
          onClose={() => setShowEditAcModal(false)}
        />
      )}
      {showDeleteModal && (
        <DeleteConfirmModal
          title="Hapus tiket ini?"
          description="Tiket akan disembunyikan dari semua tampilan. Data tetap tersimpan untuk keperluan analitik."
          itemLabel={`${ticket.ticket_number} · ${ticket.scheduled_date}`}
          reasons={["Dibatalkan oleh pelanggan", "Duplikat tiket", "Lainnya"]}
          confirmLabel="Ya, hapus tiket"
          isPending={deleteTicket.isPending}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async (reason, notes) => {
            const projectId = ticket.project_ticket_id;
            await deleteTicket.mutateAsync({
              ticketId: ticketId!,
              deletedBy: user?.id ?? "",
              reason,
              notes,
            });
            qc.invalidateQueries({ queryKey: ["projects"] });
            window.location.href = `/projects/${projectId}`;
          }}
        />
      )}

      {/* ── Flag modals ── */}
      {confirmingFlagId && (
        <ConfirmModal
          flagType={
            flags.find((f) => f.id === confirmingFlagId)?.flag_type ?? ""
          }
          isPending={confirmFlagMut.isPending}
          onClose={() => setConfirmingFlagId(null)}
          onConfirm={(notes) => {
            confirmFlagMut.mutate({
              flagId: confirmingFlagId,
              confirmedBy: user?.id ?? "",
              notes,
              ticketId: ticketId!,
            });
            setConfirmingFlagId(null);
          }}
        />
      )}
      {dismissingFlagId && (
        <DismissModal
          flagType={
            flags.find((f) => f.id === dismissingFlagId)?.flag_type ?? ""
          }
          isPending={dismissFlagMut.isPending}
          onClose={() => setDismissingFlagId(null)}
          onDismiss={(reason, notes) => {
            dismissFlagMut.mutate({
              flagId: dismissingFlagId,
              dismissReason: reason,
              dismissedBy: user?.id ?? "",
              notes,
              ticketId: ticketId!,
            });
            setDismissingFlagId(null);
          }}
        />
      )}

      {/* ── Ticket info card ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-medium text-blue-600">
                {ticket.ticket_number}
              </span>
              {ticket.is_flagged && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                  ⚠ Temuan
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                {typeLabel(ticket.type)}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadgeClass(ticket.status)}`}
              >
                {statusLabel(ticket.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mb-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <i
              className="ti ti-user"
              style={{ fontSize: 14 }}
              aria-hidden="true"
            />
            <span>{ticket.technician?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <i
              className="ti ti-calendar"
              style={{ fontSize: 14 }}
              aria-hidden="true"
            />
            <span>
              {fmtDate(ticket.scheduled_date)} ·{" "}
              {fmtTime(ticket.scheduled_time)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <i
              className="ti ti-map-pin"
              style={{ fontSize: 14 }}
              aria-hidden="true"
            />
            <span>{ticket.location?.name ?? "—"}</span>
          </div>
        </div>

        {ticket.location?.access_regulations && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-3">
            <i
              className="ti ti-shield-lock text-amber-600 flex-shrink-0 mt-0.5"
              style={{ fontSize: 14 }}
            />
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-0.5">
                Regulasi akses lokasi
              </p>
              <p className="text-xs text-amber-700 leading-relaxed whitespace-pre-line">
                {ticket.location.access_regulations}
              </p>
            </div>
          </div>
        )}

        {/* Flag action bar ✅ */}
        {flags.length > 0 && (
          <FlagActionBar
            flags={flags}
            canConfirm={canConfirm}
            onConfirmClick={setConfirmingFlagId}
            onDismissClick={setDismissingFlagId}
          />
        )}

        {hasPermission("manage_tickets") && (
          <div className="border-t border-slate-100 pt-3 mt-1">
            {canEdit ? (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowEditAcModal(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
                >
                  <i
                    className="ti ti-air-conditioning"
                    style={{ fontSize: 14 }}
                  />
                  Edit unit AC
                </button>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <i className="ti ti-edit" style={{ fontSize: 14 }} />
                  Edit tiket
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <i className="ti ti-trash" style={{ fontSize: 14 }} />
                  Hapus
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <i className="ti ti-lock" style={{ fontSize: 13 }} />
                Tiket tidak dapat diedit atau dihapus
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        Laporan unit AC
      </p>

      <div className="flex flex-col gap-4">
        {[...stepsByUnit.entries()].map(([acUnitId, unitSteps]) => (
          <AcUnitCard
            key={acUnitId}
            steps={unitSteps}
            approval={approvalMap.get(acUnitId)}
            ticketId={ticketId!}
            canApprove={canApprove}
            hasUnresolvedFlag={hasUnresolvedFlag}
            onApproved={() => {
              qc.invalidateQueries({
                queryKey: ["ticket-approvals", ticketId],
              });
              qc.invalidateQueries({ queryKey: ["ticket-flags", ticketId] });
              qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
              qc.invalidateQueries({ queryKey: ["projects"] });
              refetchSteps();
            }}
            onError={setError}
          />
        ))}
      </div>
    </PageLayout>
  );
}

// ── AC Unit Card ──────────────────────────────────────────────────────────────

function AcUnitCard({
  steps,
  approval,
  ticketId,
  canApprove,
  hasUnresolvedFlag,
  onApproved,
  onError,
}: {
  steps: AcUnitStep[];
  approval: any;
  ticketId: string;
  canApprove: boolean; // ← gates approve button ✅
  hasUnresolvedFlag: boolean; // ← blocks approve if true ✅
  onApproved: () => void;
  onError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(!approval?.is_approved);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const approveUnit = useApproveAcUnit();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (!steps.length) return null;

  const ac = steps[0].ac_unit;
  const bu = ac.building_unit;
  const unitLabel =
    fmtBuildingUnit(bu?.floor, bu?.room, bu?.zone_label) || ac.ac_code;
  const isApproved = approval?.is_approved ?? false;
  const hasStarted = steps.some((s) => s.is_completed);

  const suhuAwal = steps.find((s) => s.description === "Suhu Awal");
  const suhuAkhir = steps.find((s) => s.description === "Suhu Akhir");
  const arusAwal = steps.find((s) => s.description === "Ampere Awal");
  const arusAkhir = steps.find((s) => s.description === "Ampere Akhir");
  const pcbIn = steps.find((s) => s.description === "PCB Indoor terlindungi");
  const pcbOut = steps.find((s) => s.description === "PCB Outdoor terlindungi");
  const areaIn = steps.find((s) => s.description === "Area Indoor dirapikan");
  const areaOut = steps.find((s) => s.description === "Area Outdoor dirapikan");
  const problems = steps.filter(
    (s) =>
      s.is_condition_abnormal ||
      (s.step_type === "dynamic_finding_photo" && s.input_value?.trim()),
  );

  const suhuB = parseFloat(suhuAwal?.input_value ?? "");
  const suhuA = parseFloat(suhuAkhir?.input_value ?? "");
  const arusB = parseFloat(arusAwal?.input_value ?? "");
  const arusA = parseFloat(arusAkhir?.input_value ?? "");

  const suhuStatus =
    !isNaN(suhuB) && !isNaN(suhuA) ? deltaStatus(suhuB, suhuA, "suhu") : null;
  const arusStatus =
    !isNaN(arusB) && !isNaN(arusA) ? deltaStatus(arusB, arusA, "arus") : null;
  const hasIssues = problems.length > 0;

  async function handleApprove() {
    try {
      await approveUnit.mutateAsync({
        ticketId,
        acUnitId: ac.id,
        adminId: user?.id ?? "",
      });
      setConfirmOpen(false);
      setExpanded(false);
      onApproved();
    } catch {
      onError("Gagal menyetujui unit.");
    }
  }

  return (
    <>
      <div
        className={`bg-white border rounded-xl overflow-hidden transition-all ${
          isApproved
            ? "border-green-200"
            : hasIssues
              ? "border-red-200"
              : "border-slate-200"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center gap-3 px-5 py-4 cursor-pointer ${
            isApproved ? "bg-green-50" : hasIssues ? "bg-red-50" : "bg-slate-50"
          }`}
          onClick={() => hasStarted && setExpanded((e) => !e)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{unitLabel}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {ac.type} · {ac.capacity_pk}
            </p>
            {isApproved && (
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-xs text-green-600">
                  {suhuStatus &&
                    arusStatus &&
                    `Suhu ${suhuB}→${suhuA}°C · Arus ${arusB}→${arusA}A`}
                  {hasIssues && " · Ada temuan"}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: `/tickets/${ticketId}/units/${ac.id}` });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 underline decoration-dotted"
                >
                  Lihat laporan →
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!hasStarted ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-slate-50 text-slate-400 border-slate-200">
                Menunggu pengerjaan
              </span>
            ) : isApproved ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                ✅ Disetujui
              </span>
            ) : (
              <>
                {hasIssues && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                    ⚠ Temuan
                  </span>
                )}
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  Menunggu
                </span>
              </>
            )}
            {hasStarted && (
              <i
                className={`ti ti-chevron-down text-slate-400 text-sm transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            )}
          </div>
        </div>

        {/* Expanded body */}
        {expanded && hasStarted && (
          <div className="p-5 flex flex-col gap-5">
            {/* Kondisi unit */}
            {(pcbIn || pcbOut || areaIn || areaOut) && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Kondisi unit
                </p>
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Foto unit AC
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {approval?.photo_unit_indoor_url ? (
                      <div>
                        <a
                          href={approval.photo_unit_indoor_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={approval.photo_unit_indoor_url}
                            alt="Unit indoor"
                            className="w-full h-24 object-cover rounded-lg border border-slate-200 hover:opacity-90 cursor-zoom-in"
                          />
                        </a>
                        <p className="text-xs text-slate-400 mt-1">
                          Unit indoor
                        </p>
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                        <span className="text-xs text-slate-300">
                          Belum ada foto
                        </span>
                      </div>
                    )}
                    {approval?.photo_unit_outdoor_url ? (
                      <div>
                        <a
                          href={approval.photo_unit_outdoor_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={approval.photo_unit_outdoor_url}
                            alt="Unit outdoor"
                            className="w-full h-24 object-cover rounded-lg border border-slate-200 hover:opacity-90 cursor-zoom-in"
                          />
                        </a>
                        <p className="text-xs text-slate-400 mt-1">
                          Unit outdoor
                        </p>
                      </div>
                    ) : (
                      <div className="w-full h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                        <span className="text-xs text-slate-300">
                          Belum ada foto
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 pb-2 border-b border-slate-200 mb-3">
                      Sebelum dicuci
                    </p>
                    <div className="flex flex-col gap-3">
                      {[
                        { s: pcbIn, l: "PCB Indoor" },
                        { s: pcbOut, l: "PCB Outdoor" },
                      ].map(
                        ({ s, l }) =>
                          s?.photo_url && (
                            <div key={l}>
                              <a
                                href={s.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={s.photo_url}
                                  alt={l}
                                  className="w-full h-24 object-cover rounded-lg border border-slate-200 hover:opacity-90 cursor-zoom-in"
                                />
                              </a>
                              <p className="text-xs text-slate-400 mt-1">{l}</p>
                            </div>
                          ),
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 pb-2 border-b border-slate-200 mb-3">
                      Sesudah dicuci
                    </p>
                    <div className="flex flex-col gap-3">
                      {[
                        { s: areaIn, l: "Area Indoor" },
                        { s: areaOut, l: "Area Outdoor" },
                      ].map(
                        ({ s, l }) =>
                          s?.photo_url && (
                            <div key={l}>
                              <a
                                href={s.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={s.photo_url}
                                  alt={l}
                                  className="w-full h-24 object-cover rounded-lg border border-slate-200 hover:opacity-90 cursor-zoom-in"
                                />
                              </a>
                              <p className="text-xs text-slate-400 mt-1">{l}</p>
                            </div>
                          ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pengukuran */}
            {(suhuAwal || arusAwal) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Pengukuran
                  </p>
                  <div className="flex gap-2">
                    {suhuStatus && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${suhuStatus === "good" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                      >
                        {suhuStatus === "good" ? "✅ Suhu baik" : "❌ Suhu"}
                      </span>
                    )}
                    {arusStatus && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${arusStatus === "good" ? "bg-green-50 text-green-700 border-green-200" : arusStatus === "warn" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}
                      >
                        {arusStatus === "good" ? "✅ Arus" : "⚠ Arus"}
                      </span>
                    )}
                  </div>
                </div>
                {suhuAwal && suhuAkhir && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Suhu unit AC
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        {suhuAwal.photo_url && (
                          <a
                            href={suhuAwal.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="w-14 h-12 bg-slate-100 border border-slate-200 rounded-lg flex-shrink-0 cursor-zoom-in overflow-hidden">
                              <img
                                src={suhuAwal.photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </a>
                        )}
                        <div>
                          <p className="text-lg font-semibold">
                            {suhuAwal.input_value}°C
                          </p>
                          <p className="text-xs text-slate-400">Sebelum</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {suhuAkhir.photo_url && (
                          <a
                            href={suhuAkhir.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="w-14 h-12 bg-slate-100 border border-slate-200 rounded-lg flex-shrink-0 cursor-zoom-in overflow-hidden">
                              <img
                                src={suhuAkhir.photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </a>
                        )}
                        <div>
                          <p
                            className={`text-lg font-semibold ${suhuStatus === "good" ? "text-green-600" : "text-red-600"}`}
                          >
                            {suhuAkhir.input_value}°C
                          </p>
                          <p className="text-xs text-slate-400">Sesudah</p>
                        </div>
                      </div>
                    </div>
                    {suhuStatus && (
                      <div
                        className={`flex items-center justify-between mt-2 px-3 py-2 rounded-lg ${suhuStatus === "good" ? "bg-green-50" : "bg-red-50"}`}
                      >
                        <span
                          className={`text-xs ${suhuStatus === "good" ? "text-green-700" : "text-red-700"}`}
                        >
                          {suhuStatus === "good"
                            ? `Suhu akhir ${suhuA}°C di bawah batas ${SUHU_MAX}°C`
                            : `Suhu akhir ${suhuA}°C melebihi batas ${SUHU_MAX}°C`}
                        </span>
                        <span
                          className={`text-xs font-semibold ${suhuStatus === "good" ? "text-green-700" : "text-red-700"}`}
                        >
                          ↓ {Math.abs(suhuA - suhuB).toFixed(1)}°C
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {arusAwal && arusAkhir && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Arus listrik
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        {arusAwal.photo_url && (
                          <a
                            href={arusAwal.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="w-14 h-12 bg-slate-100 border border-slate-200 rounded-lg flex-shrink-0 cursor-zoom-in overflow-hidden">
                              <img
                                src={arusAwal.photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </a>
                        )}
                        <div>
                          <p className="text-lg font-semibold">
                            {arusAwal.input_value}A
                          </p>
                          <p className="text-xs text-slate-400">Sebelum</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {arusAkhir.photo_url && (
                          <a
                            href={arusAkhir.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="w-14 h-12 bg-slate-100 border border-slate-200 rounded-lg flex-shrink-0 cursor-zoom-in overflow-hidden">
                              <img
                                src={arusAkhir.photo_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </a>
                        )}
                        <div>
                          <p
                            className={`text-lg font-semibold ${arusStatus === "good" ? "text-green-600" : arusStatus === "warn" ? "text-amber-600" : "text-red-600"}`}
                          >
                            {arusAkhir.input_value}A
                          </p>
                          <p className="text-xs text-slate-400">Sesudah</p>
                        </div>
                      </div>
                    </div>
                    {arusStatus && !isNaN(arusB) && !isNaN(arusA) && (
                      <div
                        className={`flex items-center justify-between mt-2 px-3 py-2 rounded-lg ${arusStatus === "good" ? "bg-green-50" : arusStatus === "warn" ? "bg-amber-50" : "bg-red-50"}`}
                      >
                        <span
                          className={`text-xs ${arusStatus === "good" ? "text-green-700" : arusStatus === "warn" ? "text-amber-700" : "text-red-700"}`}
                        >
                          {arusStatus === "good"
                            ? `Penurunan ${(((arusB - arusA) / arusB) * 100).toFixed(1)}% memenuhi standar minimum ${ARUS_MIN_PCT}%`
                            : `Penurunan ${(((arusB - arusA) / arusB) * 100).toFixed(1)}% di bawah batas minimum ${ARUS_MIN_PCT}%`}
                        </span>
                        <span
                          className={`text-xs font-semibold ${arusStatus === "good" ? "text-green-700" : arusStatus === "warn" ? "text-amber-700" : "text-red-700"}`}
                        >
                          ↓ {(((arusB - arusA) / arusB) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Findings */}
            {problems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">
                  ⚠ Temuan & masalah
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-3">
                  {problems.map((p) => (
                    <div key={p.id} className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">
                          {p.description}
                        </p>
                        {p.input_value && (
                          <p className="text-sm text-red-700 mt-1 bg-white rounded-lg px-3 py-2 border border-red-100">
                            {p.input_value}
                          </p>
                        )}
                      </div>
                      {p.photo_url && (
                        <a
                          href={p.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={p.photo_url}
                            alt="Foto temuan"
                            className="w-24 h-20 object-cover rounded-lg border border-red-200 hover:opacity-90 cursor-zoom-in flex-shrink-0"
                          />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() =>
                  navigate({ to: `/tickets/${ticketId}/units/${ac.id}` })
                }
                className="text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <i className="ti ti-list-details text-sm mr-1 align-[-2px]" />
                Lihat laporan lengkap
              </button>

              {/* Approve button — gated by role + unresolved flags ✅ */}
              {!isApproved &&
                canApprove &&
                (hasUnresolvedFlag ? (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠ Selesaikan temuan terlebih dahulu
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className="text-sm font-medium px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    Setujui unit ini
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Approve confirmation dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-0">
              <p className="text-base font-medium text-slate-800 mb-1">
                Setujui unit ini?
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Pastikan laporan sudah
                diperiksa sebelum menyetujui.
              </p>
            </div>
            <div className="mx-6 my-4 bg-slate-50 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">{unitLabel}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {ac.type} · {ac.capacity_pk}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suhuStatus !== null && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${suhuStatus === "good" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
                  >
                    {suhuStatus === "good"
                      ? "Suhu < 12°C Lulus"
                      : "Suhu ≥ 12°C Tidak Lulus"}
                  </span>
                )}
                {arusStatus !== null && arusB > 0 && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${arusStatus === "good" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {"Arus ↓" +
                      (((arusB - arusA) / arusB) * 100).toFixed(2) +
                      "% " +
                      (arusStatus === "good" ? "Baik" : "Perlu Perhatian")}
                  </span>
                )}
              </div>
            </div>
            {problems.length > 0 && (
              <div className="mx-6 mb-4 flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <i
                  className="ti ti-alert-triangle text-amber-600 flex-shrink-0 mt-0.5"
                  style={{ fontSize: 14 }}
                />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Ada {problems.length} catatan perlu perhatian. Pastikan sudah
                  ditinjau sebelum menyetujui.
                </p>
              </div>
            )}
            <div className="flex gap-2 p-4 border-t border-slate-100">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleApprove}
                disabled={approveUnit.isPending}
                className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {approveUnit.isPending ? (
                  "Menyetujui..."
                ) : (
                  <>
                    <i className="ti ti-check" style={{ fontSize: 13 }} /> Ya,
                    setujui
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
