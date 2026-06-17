import { PageLayout } from '@/components/shared/PageLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    useApproveTicket,
    useReopenTicket,
    useTicket,
} from '@/hooks/useTickets'
import { formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'

function calcDuration(arrivalAt?: string, departureAt?: string): string {
    if (!arrivalAt || !departureAt) return '—'
    const diff = new Date(departureAt).getTime() - new Date(arrivalAt).getTime()
    const mins = Math.round(diff / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}j ${m}m` : `${m}m`
}

export function TicketDetailScreen() {
    const { ticketId } = useParams({ strict: false })
    const { user } = useAuthStore()
    const approveMutation = useApproveTicket()
    const reopenMutation = useReopenTicket()

    const [showReopen, setShowReopen] = useState(false)
    const [reopenReason, setReopenReason] = useState('')

    const { data: ticket, isLoading } = useTicket(ticketId)

    if (isLoading) {
        return (
            <PageLayout title="Detail Tiket Kerja">
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                </div>
            </PageLayout>
        )
    }

    if (!ticket) {
        return (
            <PageLayout title="Detail Tiket Kerja">
                <p className="text-red-500 text-sm">Tiket tidak ditemukan.</p>
            </PageLayout>
        )
    }

    return (
        <PageLayout
            title={ticket.ticket_number}
            subtitle={ticket.project_ticket?.project_number}
            action={
                <div className="flex items-center gap-3">
                    <StatusBadge status={ticket.status} />
                    {ticket.status === 'submitted' && (
                        <>
                            <button
                                onClick={() => approveMutation.mutate(ticket.id)}
                                disabled={approveMutation.isPending}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                {approveMutation.isPending
                                    ? 'Menyetujui...'
                                    : '✓ Setujui'
                                }
                            </button>
                            <button
                                onClick={() => setShowReopen(true)}
                                className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
                            >
                                Kembalikan
                            </button>
                        </>
                    )}
                    <Link
                        to="/projects/$projectId"
                        params={{ projectId: ticket.project_ticket_id }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
                    >
                        ← Proyek
                    </Link>
                </div>
            }
        >
            {/* Reopen dialog */}
            {showReopen && (
                <div className="fixed inset-0 bg-black/40 z-50
                                flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="font-semibold text-slate-800 mb-4">
                            Kembalikan Tiket
                        </h3>
                        <label className="block text-sm text-slate-600 mb-2">
                            Alasan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reopenReason}
                            onChange={e => setReopenReason(e.target.value)}
                            placeholder="Apa yang perlu diperbaiki?"
                            rows={3}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowReopen(false)}
                                className="flex-1 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg"
                            >
                                Batalkan
                            </button>
                            <button
                                onClick={() => {
                                    reopenMutation.mutate(
                                        {
                                            ticketId: ticket.id,
                                            reason: reopenReason,
                                            reopenedBy: user?.id ?? 'admin',
                                        },
                                        { onSuccess: () => setShowReopen(false) }
                                    )
                                }}
                                disabled={!reopenReason.trim() || reopenMutation.isPending}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg"
                            >
                                {reopenMutation.isPending ? 'Mengirim...' : 'Kembalikan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-6">

                {/* Left — AC units + steps */}
                <div className="col-span-2 space-y-4">

                    {/* Ticket info */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h2 className="font-semibold text-slate-800 mb-4">
                            Informasi Tiket
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow
                                label="Teknisi"
                                value={ticket.technician?.name ?? '—'}
                            />
                            <InfoRow
                                label="ID Teknisi"
                                value={ticket.technician?.technician_id ?? '—'}
                            />
                            <InfoRow
                                label="Jadwal"
                                value={`${ticket.scheduled_date} ${ticket.scheduled_time?.substring(0, 5)}`}
                            />
                            <InfoRow
                                label="Estimasi"
                                value={`${ticket.estimated_minutes} menit`}
                            />
                            <InfoRow
                                label="Tiba"
                                value={ticket.arrival_at
                                    ? formatDateTime(ticket.arrival_at)
                                    : 'Belum tiba'
                                }
                            />
                            <InfoRow
                                label="Durasi"
                                value={calcDuration(ticket.arrival_at, ticket.departure_at)}
                            />
                            {ticket.submitted_at && (
                                <InfoRow
                                    label="Dikirim"
                                    value={formatDateTime(ticket.submitted_at)}
                                />
                            )}
                            {ticket.is_flagged && (
                                <InfoRow
                                    label="Flag"
                                    value={`🚩 ${ticket.flag_type ?? ''}`}
                                />
                            )}
                        </div>
                    </div>

                    {/* AC Units */}
                    <div className="bg-white rounded-xl border border-slate-200">
                        <div className="px-5 py-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-800">
                                Unit AC ({ticket.ac_units?.length ?? 0})
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {ticket.ac_units?.map(tu => {
                                const unit = tu.ac_unit
                                if (!unit) return null
                                return (
                                    <div
                                        key={tu.ac_unit_id}
                                        className="px-5 py-4"
                                    >
                                        <p className="text-sm font-medium text-slate-800">
                                            {unit.building_unit?.display_name ?? unit.ac_code}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {unit.ac_code}
                                            {' · '}
                                            {unit.brand?.name ?? '—'}
                                            {' · '}
                                            {unit.type}
                                            {' · '}
                                            {unit.capacity_pk}
                                        </p>
                                        {unit.access_notes && (
                                            <p className="text-xs text-amber-600 mt-0.5">
                                                ⚠ {unit.access_notes}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                            {(ticket.ac_units?.length ?? 0) === 0 && (
                                <div className="p-8 text-center">
                                    <p className="text-slate-400 text-sm">
                                        Belum ada unit AC
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right — signatures */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h2 className="font-semibold text-slate-800 mb-4">
                            Tanda Tangan
                        </h2>
                        <SignatureBlock
                            label="Teknisi"
                            name={ticket.technician?.name}
                            imageUrl={undefined}
                        />
                        <div className="border-t border-slate-100 mt-4 pt-4">
                            <SignatureBlock
                                label="PIC Klien"
                                name={ticket.customer?.pic_name}
                                imageUrl={undefined}
                            />
                        </div>
                    </div>

                    {/* Flag info */}
                    {ticket.flag_notes && (
                        <div className="bg-red-50 border border-red-200
                                        rounded-xl p-4">
                            <p className="text-xs font-semibold text-red-600 mb-1">
                                🚩 Catatan Flag
                            </p>
                            <p className="text-sm text-red-700">{ticket.flag_notes}</p>
                        </div>
                    )}

                    {/* Reopen log */}
                    {ticket.reopen_reason && (
                        <div className="bg-amber-50 border border-amber-200
                                        rounded-xl p-4">
                            <p className="text-xs font-semibold text-amber-600 mb-1">
                                ↩ Alasan Dikembalikan
                            </p>
                            <p className="text-sm text-amber-700">
                                {ticket.reopen_reason}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    )
}

// ── Sub components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-slate-800">{value}</p>
        </div>
    )
}

function SignatureBlock({
    label,
    name,
    imageUrl,
}: {
    label: string
    name?: string
    imageUrl?: string
}) {
    return (
        <div>
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            {name && (
                <p className="text-sm font-medium text-slate-700 mb-2">{name}</p>
            )}
            {imageUrl ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={`Tanda tangan ${label}`}
                        className="w-full h-24 object-contain bg-white"
                    />
                </div>
            ) : (
                <p className="text-sm text-slate-400">Belum ditandatangani</p>
            )}
        </div>
    )
}   