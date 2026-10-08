import { DeleteConfirmModal } from "@/components/shared/DeleteConfirmModal";
import { EditProjectModal } from "@/components/shared/EditProjectModal";
import { PageLayout } from "@/components/shared/PageLayout";
import {
  useApproveAllTickets,
  useApproveTicket,
  useDeleteProject,
  useDeleteTicket,
  useEditProject,
  useProjectById,
  useProjectWorkTickets,
} from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/authStore";
import type { WorkTicket } from "@/types/app";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeLabel(type: string) {
  return type === "cleaning"
    ? "Cuci AC"
    : type === "service"
      ? "Servis"
      : "Pasang";
}

function typeBadgeClass(type: string) {
  return type === "cleaning"
    ? "bg-sky-50 text-sky-700 border-sky-200"
    : type === "service"
      ? "bg-violet-50 text-violet-700 border-violet-200"
      : "bg-orange-50 text-orange-700 border-orange-200";
}

function ticketStatusLabel(status: string) {
  switch (status) {
    case "assigned":
      return "Belum Mulai";
    case "in_progress":
      return "Berlangsung";
    case "submitted":
      return "Terkirim";
    case "approved":
      return "Disetujui";
    case "cancelled":
      return "Dibatalkan";
    default:
      return status;
  }
}

function ticketStatusClass(status: string) {
  switch (status) {
    case "assigned":
      return "bg-slate-50 text-slate-500 border-slate-200";
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "submitted":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "approved":
      return "bg-green-50 text-green-700 border-green-200";
    case "cancelled":
      return "bg-red-50 text-red-600 border-red-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(timeStr: string) {
  if (!timeStr) return "";
  return timeStr.substring(0, 5) + " WIB";
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ProjectDetailScreen() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const navigate = useNavigate();
  const { user, hasPermission, isRole } = useAuthStore();

  const canApprove = hasPermission("approve_ticket"); // ← passed to TicketRow ✅
  const isTech = isRole("admin_technician", "admin");
  const isSales = isRole("admin_sales", "admin"); // ← gates edit/delete ✅

  const deleteProject = useDeleteProject();
  const deleteTicket = useDeleteTicket();
  const editProject = useEditProject();

  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [showDeleteTicket, setShowDeleteTicket] = useState<string | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: project, isLoading: loadingProject } =
    useProjectById(projectId);
  const {
    data: tickets = [],
    isLoading: loadingTickets,
    refetch,
  } = useProjectWorkTickets(projectId);

  const approveTicket = useApproveTicket();
  const approveAll = useApproveAllTickets();

  const customer = (project as any)?.customer;
  const location = (project as any)?.location;
  const activeTickets = tickets.filter((t) => !(t as any).is_deleted);

  const totalTickets = activeTickets.length;
  const approvedCount = activeTickets.filter(
    (t) => t.status === "approved",
  ).length;
  const submittedCount = activeTickets.filter(
    (t) => t.status === "submitted",
  ).length;
  const progressPct =
    totalTickets > 0 ? Math.round((approvedCount / totalTickets) * 100) : 0;
  const allSubmitted =
    totalTickets > 0 &&
    activeTickets.every(
      (t) => t.status === "submitted" || t.status === "approved",
    );
  const allApproved =
    totalTickets > 0 && activeTickets.every((t) => t.status === "approved");

  const hasBlockedTickets = activeTickets.some((t) =>
    ["submitted", "approved"].includes(t.status),
  );
  const canDeleteProject = activeTickets.length === 0;
  const canEditProject = !hasBlockedTickets;

  async function handleApproveOne(ticketId: string) {
    setApprovingId(ticketId);
    setError(null);
    try {
      await approveTicket.mutateAsync(ticketId);
      await refetch();
    } catch {
      setError("Gagal menyetujui tiket.");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleApproveAll() {
    setApprovingAll(true);
    setError(null);
    try {
      await approveAll.mutateAsync(projectId);
      await refetch();
    } catch {
      setError("Gagal menyetujui semua tiket.");
    } finally {
      setApprovingAll(false);
    }
  }

  if (loadingProject || loadingTickets) {
    return (
      <PageLayout title="Detail proyek">
        <div className="text-center py-16 text-slate-400">Memuat...</div>
      </PageLayout>
    );
  }
  if (!project) {
    return (
      <PageLayout title="Detail proyek">
        <div className="text-center py-16 text-slate-400">
          Proyek tidak ditemukan.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Detail proyek">
      {/* ── Modals ── */}
      {showEditProject && (
        <EditProjectModal
          project={project}
          isPending={editProject.isPending}
          onClose={() => setShowEditProject(false)}
          onConfirm={async (changes) => {
            await editProject.mutateAsync({
              projectId: project.id,
              editedBy: user?.id ?? "",
              ...changes,
            });
            setShowEditProject(false);
          }}
        />
      )}

      {showDeleteProject && (
        <DeleteConfirmModal
          title="Hapus proyek ini?"
          description="Proyek akan disembunyikan dari semua tampilan. Data tetap tersimpan untuk keperluan analitik."
          itemLabel={`${project.project_number} · ${customer?.name ?? ""}`}
          reasons={[
            "Dibatalkan oleh pelanggan",
            "Duplikat proyek",
            "Perubahan jadwal",
            "Lainnya",
          ]}
          confirmLabel="Ya, hapus proyek"
          isPending={deleteProject.isPending}
          onClose={() => setShowDeleteProject(false)}
          onConfirm={async (reason, notes) => {
            await deleteProject.mutateAsync({
              projectId: project.id,
              deletedBy: user?.id ?? "",
              reason,
              notes,
            });
            window.location.href = "/projects";
          }}
        />
      )}

      {showDeleteTicket &&
        (() => {
          const tkt = tickets.find((t) => t.id === showDeleteTicket);
          return tkt ? (
            <DeleteConfirmModal
              title="Hapus tiket ini?"
              description="Tiket akan disembunyikan dari semua tampilan. Data tetap tersimpan untuk keperluan analitik."
              itemLabel={`${tkt.ticket_number} · ${tkt.scheduled_date}`}
              reasons={[
                "Dibatalkan oleh pelanggan",
                "Duplikat tiket",
                "Lainnya",
              ]}
              confirmLabel="Ya, hapus tiket"
              isPending={deleteTicket.isPending}
              onClose={() => setShowDeleteTicket(null)}
              onConfirm={async (reason, notes) => {
                await deleteTicket.mutateAsync({
                  ticketId: showDeleteTicket,
                  deletedBy: user?.id ?? "",
                  reason,
                  notes,
                });
                setShowDeleteTicket(null);
                refetch();
              }}
            />
          ) : null;
        })()}

      {/* ── Project info card ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        {/* Booking banner ✅ */}
        {(project.status === "pending_confirm" ||
          project.status === "draft") && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              {project.status === "pending_confirm"
                ? "⏳ Menunggu konfirmasi customer"
                : "📝 Draft booking"}
            </p>
            <p className="text-xs text-amber-700 mb-3">
              Booking ini belum dikonfirmasi. Konfirmasi untuk membuat proyek
              aktif.
            </p>
            {isSales && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const { projectRepository } =
                      await import("@/repositories/projectRepository");
                    const { useProjectDraftStore } =
                      await import("@/stores/projectDraftStore");
                    const acUnits =
                      (project as any).project_ticket_ac_units ?? [];
                    const acIds = acUnits.map((u: any) => u.ac_unit_id);
                    await projectRepository.confirmBooking(project.id);
                    useProjectDraftStore
                      .getState()
                      .setDraft(
                        project.customer_id,
                        project.location_id,
                        acIds,
                        project.type as any,
                      );
                    navigate({ to: "/projects/create" });
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Konfirmasi →
                </button>
                <button
                  onClick={async () => {
                    const reason = window.prompt("Alasan penolakan:");
                    if (!reason) return;
                    const { projectRepository } =
                      await import("@/repositories/projectRepository");
                    await projectRepository.declineBooking(project.id, reason);
                    navigate({ to: "/projects/bookings" });
                  }}
                  className="flex-1 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  Tolak
                </button>
              </div>
            )}
          </div>
        )}

        {/* Customer + type */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900 leading-snug">
              {customer?.name ?? "—"}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {location?.name ?? "—"}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${typeBadgeClass(project.type)}`}
          >
            {typeLabel(project.type)}
          </span>
        </div>

        {/* Detail rows */}
        <div className="flex flex-col gap-1.5 mb-3">
          {location?.address && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <i
                className="ti ti-map-pin"
                style={{ fontSize: 14 }}
                aria-hidden="true"
              />
              <span>{location.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <i
              className="ti ti-hash"
              style={{ fontSize: 14 }}
              aria-hidden="true"
            />
            <span className="font-mono text-xs">{project.project_number}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {approvedCount} dari {totalTickets} tiket disetujui
          </span>
          <span className="text-xs font-medium text-slate-500">
            {progressPct}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {submittedCount > 0 && (
          <p className="text-xs text-amber-600 mb-3">
            {submittedCount} tiket menunggu persetujuan
          </p>
        )}

        {/* ── Admin actions — role-gated ✅ ── */}
        {isSales && (
          <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-end gap-2">
            {/* Edit project — isSales only ✅ */}
            {canEditProject ? (
              <button
                onClick={() => setShowEditProject(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <i
                  className="ti ti-edit"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                Edit proyek
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <i
                  className="ti ti-lock"
                  style={{ fontSize: 12 }}
                  aria-hidden="true"
                />
                Tidak dapat diedit
              </div>
            )}

            {/* Delete project — isSales only ✅ */}
            {canDeleteProject ? (
              <button
                onClick={() => setShowDeleteProject(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <i
                  className="ti ti-trash"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                Hapus proyek
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <i
                  className="ti ti-trash"
                  style={{ fontSize: 12 }}
                  aria-hidden="true"
                />
                Hapus semua tiket terlebih dahulu
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
        Daftar tiket
      </p>

      <div className="flex flex-col gap-3 mb-5">
        {activeTickets.map((ticket) => {
          const canDeleteTkt = ![
            "in_progress",
            "submitted",
            "approved",
          ].includes(ticket.status);
          return (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              canApprove={canApprove}
              onApprove={() => handleApproveOne(ticket.id)}
              isApproving={approvingId === ticket.id}
              onView={() => navigate({ to: `/tickets/${ticket.id}` })}
              onDelete={
                canDeleteTkt && isSales // ← isSales only ✅
                  ? () => setShowDeleteTicket(ticket.id)
                  : undefined
              }
            />
          );
        })}
      </div>

      {allSubmitted && !allApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-700 mb-3 font-medium">
            Semua tiket sudah terkirim — siap untuk disetujui.
          </p>
          <button
            onClick={handleApproveAll}
            disabled={approvingAll || !canApprove}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {approvingAll ? "Menyetujui..." : "Setujui semua tiket"}
          </button>
        </div>
      )}

      {allApproved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-semibold text-sm">
            ✅ Semua tiket telah disetujui
          </p>
          <p className="text-green-600 text-xs mt-1">Proyek selesai</p>
        </div>
      )}
    </PageLayout>
  );
}

// ── Ticket Row ────────────────────────────────────────────────────────────────

function TicketRow({
  ticket,
  canApprove, // ← NEW: passed from screen ✅
  onApprove,
  isApproving,
  onView,
  onDelete,
}: {
  ticket: WorkTicket;
  canApprove: boolean; // ← permission from screen ✅
  onApprove: () => void;
  isApproving: boolean;
  onView: () => void;
  onDelete?: () => void;
}) {
  const technician = (ticket as any).technician;
  // canApproveBtn combines status check + role permission ✅
  const canApproveBtn = ticket.status === "submitted" && canApprove;

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 cursor-pointer transition-all"
      onClick={onView}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-blue-600">
              {ticket.ticket_number}
            </span>
            {ticket.is_flagged && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                ⚠ Temuan
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800">
            {technician?.name ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatDate(ticket.scheduled_date)} ·{" "}
            {formatTime(ticket.scheduled_time)} ·{" "}
            {(ticket as any).ac_units?.length ?? 0} unit AC
          </p>
        </div>
        <div
          className="flex items-center gap-2 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ticketStatusClass(ticket.status)}`}
          >
            {ticketStatusLabel(ticket.status)}
          </span>
          {canApproveBtn && (
            <button
              onClick={onApprove}
              disabled={isApproving}
              className="text-xs font-medium px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isApproving ? "..." : "Setujui"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Hapus tiket"
            >
              <i
                className="ti ti-trash"
                style={{ fontSize: 14 }}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
