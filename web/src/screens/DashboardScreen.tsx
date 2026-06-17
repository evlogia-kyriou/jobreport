import { PageLayout } from "@/components/shared/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useProjects } from "@/hooks/useProjectTickets";
import { Link } from "@tanstack/react-router";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | undefined;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          {value === undefined ? (
            <Skeleton className="h-8 w-12 mt-1" />
          ) : (
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const { data: stats } = useDashboardStats();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <PageLayout title="Dashboard" subtitle={today}>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Proyek Aktif"
          value={stats?.active_projects}
          icon="📋"
          color="text-slate-800"
        />
        <StatCard
          label="Tiket Selesai"
          value={stats?.submitted_tickets}
          icon="✅"
          color="text-green-600"
        />
        <StatCard
          label="Teknisi Bertugas"
          value={stats?.technicians_today}
          icon="👷"
          color="text-blue-600"
        />
        <StatCard
          label="AC Overdue"
          value={stats?.overdue_ac_units}
          icon="❄️"
          color="text-red-600"
        />
      </div>

      {/* Recent projects */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Proyek Terbaru</h2>
          <Link
            to="/projects"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Lihat semua →
          </Link>
        </div>

        {projectsLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">Belum ada proyek</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects?.slice(0, 8).map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {project.project_number}
                    {" · "}
                    {project.customer?.name ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {project.location?.name ?? "—"}
                    {" · "}
                    {project.total_ac_units} unit AC
                    {project.is_flagged && " · 🚩"}
                  </p>
                </div>
                <div className="ml-4 shrink-0">
                  <StatusBadge status={project.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
