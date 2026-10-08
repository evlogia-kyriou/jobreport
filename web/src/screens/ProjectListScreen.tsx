import { PageLayout } from "@/components/shared/PageLayout";
import { useProjects } from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/authStore";
import type { ProjectTicket } from "@/types/app";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_confirm":
      return "Menunggu Konfirmasi";
    case "in_progress":
      return "Aktif";
    case "awaiting_final_signature":
      return "Menunggu TTD";
    case "completed":
      return "Selesai";
    case "reported":
      return "Dilaporkan";
    case "ditangguhkan":
      return "Ditangguhkan";
    case "cancelled":
      return "Dibatalkan";
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "draft":
      return "bg-slate-50 text-slate-500 border-slate-200";
    case "pending_confirm":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "awaiting_final_signature":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    case "reported":
      return "bg-green-50 text-green-700 border-green-200";
    case "ditangguhkan":
      return "bg-slate-50 text-slate-500 border-slate-200";
    case "cancelled":
      return "bg-red-50 text-red-600 border-red-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case "cleaning":
      return "Cuci";
    case "service":
      return "Servis";
    case "installation":
      return "Pasang";
    default:
      return type;
  }
}

function typeColor(type: string): string {
  switch (type) {
    case "cleaning":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "service":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "installation":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200";
  }
}

function formatDateRange(project: ProjectTicket): string {
  const tickets = (project as any).work_tickets ?? [];
  if (tickets.length === 0) return "—";
  const dates = tickets
    .map((t: any) => t.scheduled_date)
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return "—";
  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first === last ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
}

function getTechnicians(project: ProjectTicket): string {
  const tickets = (project as any).work_tickets ?? [];
  const names = [
    ...new Set(tickets.map((t: any) => t.technician?.name).filter(Boolean)),
  ] as string[];
  return names.join(", ") || "—";
}

// ── Group definitions ──────────────────────────────────────────────────────────

const ALL_GROUPS = [
  {
    key: "booking",
    label: "Menunggu Konfirmasi",
    icon: "⏳",
    statuses: ["draft", "pending_confirm"],
    headerClass: "text-amber-700 bg-amber-50 border-amber-200",
    salesOnly: true,
  },
  {
    key: "perlu_persetujuan",
    label: "Perlu Persetujuan",
    icon: "⚡",
    statuses: ["awaiting_final_signature"],
    headerClass: "text-amber-700 bg-amber-50 border-amber-200",
    salesOnly: false,
  },
  {
    key: "aktif",
    label: "Aktif",
    icon: "📋",
    statuses: ["in_progress"],
    headerClass: "text-blue-700 bg-blue-50 border-blue-200",
    salesOnly: false,
  },
  {
    key: "selesai",
    label: "Selesai",
    icon: "✅",
    statuses: ["completed", "reported"],
    headerClass: "text-green-700 bg-green-50 border-green-200",
    salesOnly: false,
  },
];

// ── Main Screen ───────────────────────────────────────────────────────────────

export function ProjectListScreen() {
  const { data: projects = [], isLoading, error, refetch } = useProjects();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const { isRole } = useAuthStore();
  const isSales = isRole("admin_sales", "admin");

  // admin_technician does NOT see draft/pending bookings ✅
  const GROUPS = ALL_GROUPS.filter((g) => isSales || !g.salesOnly);

  const filtered = useMemo(() => {
    const excludeStatuses = isSales ? [] : ["draft", "pending_confirm"]; // tech cannot see booking requests ✅

    return projects.filter((p) => {
      if (excludeStatuses.includes(p.status)) return false;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.project_number?.toLowerCase().includes(q) ||
        (p as any).customer?.name?.toLowerCase().includes(q) ||
        (p as any).location?.name?.toLowerCase().includes(q);

      const matchesFilter =
        filterGroup === "all" ||
        GROUPS.find((g) => g.key === filterGroup)?.statuses.includes(p.status);

      return matchesSearch && matchesFilter;
    });
  }, [projects, search, filterGroup]);

  const grouped = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      projects: filtered.filter((p) => g.statuses.includes(p.status)),
    })).filter((g) => g.projects.length > 0);
  }, [filtered]);

  return (
    <PageLayout
      title="Proyek"
      actions={
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Buat Proyek
        </Link>
      }
    >
      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "Semua" },
            ...GROUPS.map((g) => ({ key: g.key, label: g.label })),
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterGroup(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filterGroup === f.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari pelanggan, lokasi, nomor proyek..."
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* States */}
      {isLoading && (
        <div className="text-center py-16 text-slate-400">Memuat proyek...</div>
      )}
      {error && (
        <div className="text-center py-16">
          <p className="text-red-500 text-sm mb-3">Gagal memuat proyek.</p>
          <button
            onClick={() => refetch()}
            className="text-blue-600 text-sm hover:underline"
          >
            Coba lagi
          </button>
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          {search ? "Tidak ada proyek yang cocok." : "Belum ada proyek."}
        </div>
      )}

      {/* Grouped project list */}
      {!isLoading &&
        !error &&
        grouped.map((group) => (
          <div key={group.key} className="mb-8">
            {/* Group header */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 ${group.headerClass}`}
            >
              <span>{group.icon}</span>
              <span className="text-sm font-semibold">{group.label}</span>
              <span className="ml-auto text-xs font-medium opacity-70">
                {group.projects.length} proyek
              </span>
            </div>

            {/* Project cards */}
            <div className="flex flex-col gap-3">
              {group.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        ))}
    </PageLayout>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: ProjectTicket }) {
  const customer = (project as any).customer;
  const location = (project as any).location;
  const technicians = getTechnicians(project);
  const dateRange = formatDateRange(project);

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      {/* Row 1: status + type + date */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(project.status)}`}
        >
          {statusLabel(project.status)}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor(project.type)}`}
        >
          {typeLabel(project.type)}
        </span>
        {project.is_flagged && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
            ⚠ Temuan
          </span>
        )}
        <span className="ml-auto text-xs text-slate-400">{dateRange}</span>
      </div>

      {/* Row 2: customer name */}
      <p className="text-sm font-semibold text-slate-800">
        {customer?.name ?? "—"}
      </p>

      {/* Row 3: location */}
      <p className="text-xs text-slate-500 mt-0.5 truncate">
        {location?.name ?? "—"} · {location?.address ?? ""}
      </p>

      {/* Row 4: tickets + ac units + technicians */}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="text-xs text-slate-400">
          {project.total_ac_units ?? 0} unit AC
        </span>
        <span className="text-xs text-slate-300">·</span>
        <span className="text-xs text-slate-400 truncate">{technicians}</span>
        <span className="ml-auto text-xs font-mono text-slate-300">
          {project.project_number}
        </span>
      </div>
    </Link>
  );
}
