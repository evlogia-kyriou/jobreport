import { PageLayout } from "@/components/shared/PageLayout";
import { RescheduleTicketModal } from "@/components/shared/RescheduleTicketModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject, useProjectWorkTickets } from "@/hooks/useProjectTickets";
import type { WorkTicket } from "@/types/app";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

export function ProjectDetailScreen() {
  const { projectId } = useParams({ strict: false });
  const queryClient = useQueryClient();

  const { data: project, isLoading: pLoading } = useProject(projectId);
  const { data: tickets, isLoading: tLoading } =
    useProjectWorkTickets(projectId);

  const [rescheduleTicket, setRescheduleTicket] = useState<WorkTicket | null>(
    null,
  );

  const isLoading = pLoading || tLoading;

  const submittedCount =
    tickets?.filter((t) => t.status === "submitted").length ?? 0;
  const totalCount = tickets?.length ?? 0;
  const pct =
    totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <PageLayout title="Detail Proyek">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!project) {
    return (
      <PageLayout title="Detail Proyek">
        <p className="text-red-500 text-sm">Proyek tidak ditemukan.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={project.project_number}
      subtitle={project.customer?.name}
      action={
        <div className="flex items-center gap-3">
          <StatusBadge status={project.status} />
          {project.is_flagged && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
              🚩 Bermasalah
            </span>
          )}
          <Link
            to="/projects"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            ← Kembali
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Left — work tickets */}
        <div className="col-span-2 space-y-4">
          {/* Progress */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">
                Progress Tiket Kerja
              </p>
              <p className="text-sm font-bold text-slate-800">
                {submittedCount} / {totalCount} selesai
              </p>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{pct}% selesai</p>
          </div>

          {/* Work ticket list */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">
                Tiket Kerja ({totalCount})
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {tickets?.map((ticket) => (
                <div key={ticket.id}>
                  <Link
                    to="/tickets/$ticketId"
                    params={{ ticketId: ticket.id }}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          {ticket.ticket_number}
                        </p>
                        <StatusBadge status={ticket.status} />
                        {ticket.is_flagged && (
                          <span className="text-xs text-red-500">
                            🚩 {ticket.flag_type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ticket.technician?.name ?? "—"}
                        {" · "}
                        {ticket.scheduled_date}{" "}
                        {ticket.scheduled_time?.substring(0, 5)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ticket.ac_units?.length ?? 0} unit AC
                        {ticket.submitted_at && (
                          <> · Dikirim {ticket.submitted_at.substring(0, 10)}</>
                        )}
                      </p>
                    </div>
                    <span className="text-slate-400 text-sm">→</span>
                  </Link>

                  {/* ← Jadwalkan Ulang button */}
                  {ticket.status === "cancelled" &&
                    ticket.flag_type === "no_client" && (
                      <div className="px-5 pb-3">
                        <button
                          onClick={() =>
                            setRescheduleTicket(ticket as WorkTicket)
                          }
                          className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                        >
                          🔄 Jadwalkan Ulang
                        </button>
                      </div>
                    )}
                </div>
              ))}

              {totalCount === 0 && (
                <div className="p-8 text-center">
                  <p className="text-slate-400 text-sm">
                    Belum ada tiket kerja
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — project info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">
              Informasi Proyek
            </h2>
            <div className="space-y-3">
              <InfoRow label="Nomor Proyek" value={project.project_number} />
              <InfoRow
                label="Pelanggan"
                value={project.customer?.name ?? "—"}
              />
              <InfoRow label="PIC" value={project.customer?.pic_name ?? "—"} />
              <InfoRow label="Lokasi" value={project.location?.name ?? "—"} />
              <InfoRow
                label="Alamat"
                value={project.location?.address ?? "—"}
              />
              <InfoRow
                label="Kelurahan"
                value={project.location?.kelurahan ?? "—"}
              />
              <InfoRow
                label="Jenis"
                value={
                  project.type.charAt(0).toUpperCase() + project.type.slice(1)
                }
              />
              <InfoRow
                label="Total AC"
                value={`${project.total_ac_units} unit`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule modal */}
      {rescheduleTicket && (
        <RescheduleTicketModal
          ticket={rescheduleTicket}
          onClose={() => setRescheduleTicket(null)}
          onSuccess={() => {
            setRescheduleTicket(null);
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            queryClient.invalidateQueries({ queryKey: ["tickets"] });
          }}
        />
      )}
    </PageLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right max-w-40 truncate">
        {value}
      </span>
    </div>
  );
}
