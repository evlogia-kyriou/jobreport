import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {

  // ── Work ticket statuses ──────────────────────────────────────────
  assigned: {
    label: "Ditugaskan",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  in_progress: {
    label: "Berlangsung",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  submitted: {
    label: "Dikirim",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Disetujui",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-red-50 text-red-600 border-red-200",
  },

  // ── Project ticket statuses ───────────────────────────────────────
  in_progress_project: {
    label: "Berlangsung",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Selesai",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  reported: {
    label: "Dilaporkan",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },

  // ── Technician history outcomes ───────────────────────────────────
  completed_outcome: {
    label: "Selesai",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  customer_issue: {
    label: "Masalah Pelanggan",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  rework_required: {
    label: "Perlu Perbaikan",
    className: "bg-red-50 text-red-700 border-red-200",
  },

  // ── Customer history outcomes ─────────────────────────────────────
  completed_disputed: {
    label: "Selesai (Sengketa)",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  cancelled_by_customer: {
    label: "Dibatalkan Pelanggan",
    className: "bg-red-50 text-red-600 border-red-200",
  },
  flagged: {
    label: "Bermasalah",
    className: "bg-red-100 text-red-700 border-red-300",
  },

  // ── Customer stage ────────────────────────────────────────────────
  prospect: {
    label: "Prospek",
    className: "bg-blue-50 text-blue-600 border-blue-200",
  },
  active: {
    label: "Aktif",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  suggested_dormant: {
    label: "Perlu Ditinjau",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  dormant: {
    label: "Tidak Aktif",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
  churned: {
    label: "Berhenti",
    className: "bg-red-50 text-red-500 border-red-200",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full",
      "text-xs font-medium border",
      config.className,
    )}>
      {config.label}
    </span>
  )
}