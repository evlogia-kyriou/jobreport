import { PageLayout } from '@/components/shared/PageLayout'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects } from '@/hooks/useProjectTickets'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

// ── Filter options ────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
    { value: undefined, label: 'Semua' },
    { value: 'in_progress', label: 'Berlangsung' },
    { value: 'completed', label: 'Selesai' },
    { value: 'reported', label: 'Dilaporkan' },
]

const TYPE_FILTERS = [
    { value: undefined, label: 'Semua Tipe' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'install', label: 'Install' },
    { value: 'service', label: 'Service' },
]

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressPill({
    approved,
    total
}: {
    approved: number
    total: number
}) {
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs text-slate-500 shrink-0">
                {approved}/{total}
            </span>
        </div>
    )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ProjectListScreen() {
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
    const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)

    const { data: projects, isLoading, error, refetch } = useProjects()

    // Client-side filtering
    const filtered = projects?.filter(p => {
        if (statusFilter && p.status !== statusFilter) return false
        if (typeFilter && p.type !== typeFilter) return false
        return true
    })

    return (
        <PageLayout
            title="Proyek"
            subtitle={`${filtered?.length ?? 0} proyek`}
            action={
                <Link
                    to="/projects/create"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    + Buat Proyek
                </Link>
            }
        >
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.label}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium
                                    transition-colors ${statusFilter === f.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}

                <div className="w-px bg-slate-200 mx-1" />

                {TYPE_FILTERS.map(f => (
                    <button
                        key={f.label}
                        onClick={() => setTypeFilter(f.value)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium
                                    transition-colors ${typeFilter === f.value
                                ? 'bg-slate-800 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}

                <button
                    onClick={() => refetch()}
                    className="ml-auto px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                    ↻ Refresh
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-5 py-3
                                border-b border-slate-200 bg-slate-50">
                    <div className="col-span-3 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide">
                        Proyek
                    </div>
                    <div className="col-span-3 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide">
                        Lokasi
                    </div>
                    <div className="col-span-1 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide">
                        Tipe
                    </div>
                    <div className="col-span-2 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide">
                        Unit AC
                    </div>
                    <div className="col-span-2 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide">
                        Progress
                    </div>
                    <div className="col-span-1 text-xs font-semibold
                                    text-slate-500 uppercase tracking-wide">
                        Status
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="p-5 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-lg" />
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-8 text-center">
                        <p className="text-red-500 text-sm">
                            Gagal memuat data. Coba refresh.
                        </p>
                    </div>
                )}

                {/* Empty */}
                {!isLoading && !error && filtered?.length === 0 && (
                    <div className="p-12 text-center">
                        <p className="text-slate-400 text-sm">
                            Tidak ada proyek
                        </p>
                    </div>
                )}

                {/* Rows */}
                {!isLoading && filtered?.map(project => {
                    const approvedCount = project.work_tickets?.filter(
                        t => t.status === 'approved'
                    ).length ?? 0
                    const totalTickets = project.work_tickets?.length ?? 0

                    return (
                        <Link
                            key={project.id}
                            to="/projects/$projectId"
                            params={{ projectId: project.id }}
                            className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center"
                        >
                            {/* Project + customer */}
                            <div className="col-span-3">
                                <div className="flex items-center gap-1.5">
                                    {project.is_flagged && (
                                        <span title="Bermasalah">🚩</span>
                                    )}
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        {project.project_number}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {project.customer?.name ?? '—'}
                                </p>
                            </div>

                            {/* Location */}
                            <div className="col-span-3">
                                <p className="text-sm text-slate-600 truncate">
                                    {project.location?.name ?? '—'}
                                </p>
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {project.location?.kelurahan ?? ''}
                                </p>
                            </div>

                            {/* Type */}
                            <div className="col-span-1">
                                <span className={`text-xs font-medium px-2 py-0.5
                                                  rounded-full ${project.type === 'cleaning'
                                        ? 'bg-blue-100 text-blue-700'
                                        : project.type === 'install'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {project.type}
                                </span>
                            </div>

                            {/* AC count */}
                            <div className="col-span-2">
                                <p className="text-sm text-slate-600">
                                    {project.total_ac_units} unit
                                </p>
                            </div>

                            {/* Progress */}
                            <div className="col-span-2">
                                <ProgressPill
                                    approved={approvedCount}
                                    total={totalTickets}
                                />
                            </div>

                            {/* Status */}
                            <div className="col-span-1">
                                <StatusBadge status={project.status} />
                            </div>
                        </Link>
                    )
                })}
            </div>
        </PageLayout>
    )
}