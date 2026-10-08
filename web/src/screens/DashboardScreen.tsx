import { PageLayout } from "@/components/shared/PageLayout";
import { supabase } from "@/lib/supabase";
import { projectRepository } from "@/repositories/projectRepository";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight = false,
  to,
}: {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
  to?: string;
}) {
  const inner = (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p
        className={`text-3xl font-bold ${highlight ? "text-red-600" : "text-slate-800"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function useTechnicianDashboard() {
  return useQuery({
    queryKey: ["dashboard", "technician"],
    staleTime: 30_000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      const [submitted, flagged, confirmedFlags, inProgress] =
        await Promise.all([
          supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("status", "submitted"),
          supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("status", "submitted")
            .eq("is_flagged", true),
          supabase
            .from("ticket_flags")
            .select("*", { count: "exact", head: true })
            .eq("is_confirmed", true)
            .is("resolved_at", null),
          supabase
            .from("tickets")
            .select("*", { count: "exact", head: true })
            .eq("scheduled_date", today)
            .eq("status", "in_progress"),
        ]);

      return {
        submitted: submitted.count ?? 0,
        flagged: flagged.count ?? 0,
        confirmedFlags: confirmedFlags.count ?? 0,
        inProgress: inProgress.count ?? 0,
      };
    },
  });
}

function useSalesDashboard() {
  return useQuery({
    queryKey: ["dashboard", "sales"],
    staleTime: 30_000,
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const deadline48h = new Date();
      deadline48h.setHours(deadline48h.getHours() - 48);

      const deadline24h = new Date();
      deadline24h.setHours(deadline24h.getHours() - 24);

      const [
        overdueAc,
        pendingReminders,
        reportsDue,
        activeProjects,
        pendingBookings,
      ] = await Promise.all([
        supabase
          .from("ac_units")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .lt("last_cleaned_at", cutoff.toISOString()),
        supabase
          .from("reminder_sends")
          .select("*", { count: "exact", head: true })
          .in("phase2_status", ["menunggu_respons", "belum_dikirim"])
          .eq("is_dismissed", false),
        supabase
          .from("tickets")
          .select("project_ticket_id")
          .eq("status", "approved")
          .lt("approved_at", deadline48h.toISOString())
          .is("project_ticket_id", null),
        supabase
          .from("project_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "in_progress"),
        supabase
          .from("project_tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_confirm")
          .lt("created_at", deadline24h.toISOString()),
      ]);

      // Projects approved but report not sent > 48h ✅
      const { data: projectsDue } = await supabase
        .from("project_tickets")
        .select("id")
        .eq("status", "approved")
        .is("report_sent_at", null)
        .lt("updated_at", deadline48h.toISOString());

      return {
        overdueAc: overdueAc.count ?? 0,
        pendingReminders: pendingReminders.count ?? 0,
        reportsDue: projectsDue?.length ?? 0,
        activeProjects: activeProjects.count ?? 0,
        pendingBookings: pendingBookings.count ?? 0, // ← NEW ✅
      };
    },
  });
}

// ── Role-specific views ───────────────────────────────────────────────────────

function TechnicianDashboard() {
  const { data, isLoading } = useTechnicianDashboard();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SectionLabel>Perlu tindakan</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Tiket menunggu persetujuan"
            value={isLoading ? "…" : (data?.submitted ?? 0)}
            highlight={(data?.submitted ?? 0) > 0}
            to="/projects"
          />
          <StatCard
            label="Tiket dengan temuan"
            value={isLoading ? "…" : (data?.flagged ?? 0)}
            sub="Perlu konfirmasi atau dismiss"
            highlight={(data?.flagged ?? 0) > 0}
            to="/projects"
          />
          <StatCard
            label="Temuan dikonfirmasi"
            value={isLoading ? "…" : (data?.confirmedFlags ?? 0)}
            sub="Menunggu penyelesaian"
            highlight={(data?.confirmedFlags ?? 0) > 0}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Hari ini</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Tiket sedang dikerjakan"
            value={isLoading ? "…" : (data?.inProgress ?? 0)}
          />
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-3">Aksi cepat</p>
            <Link
              to="/projects"
              className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg text-center transition-colors"
            >
              Lihat tiket masuk →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesDashboard() {
  const { data, isLoading } = useSalesDashboard();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SectionLabel>Perlu tindakan</SectionLabel>
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Booking belum dikonfirmasi"
            value={isLoading ? "…" : (data?.pendingBookings ?? 0)}
            sub="> 24 jam menunggu"
            highlight={(data?.pendingBookings ?? 0) > 0}
            to="/projects/bookings"
          />
          <StatCard
            label="Unit AC overdue"
            value={isLoading ? "…" : (data?.overdueAc ?? 0)}
            sub="Lebih dari 90 hari belum dicuci"
            highlight={(data?.overdueAc ?? 0) > 0}
            to="/customers"
          />
          <StatCard
            label="Reminder belum direspons"
            value={isLoading ? "…" : (data?.pendingReminders ?? 0)}
            highlight={(data?.pendingReminders ?? 0) > 0}
            to="/reminders"
          />
          <StatCard
            label="Laporan proyek terlambat"
            value={isLoading ? "…" : (data?.reportsDue ?? 0)}
            sub="Disetujui > 48 jam, belum terkirim"
            highlight={(data?.reportsDue ?? 0) > 0}
            to="/projects"
          />
        </div>
      </div>

      <div>
        <SectionLabel>Operasional</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Proyek aktif"
            value={isLoading ? "…" : (data?.activeProjects ?? 0)}
            to="/projects"
          />
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-3">Aksi cepat</p>
            <div className="flex flex-col gap-2">
              <Link
                to="/projects/create"
                className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg text-center transition-colors"
              >
                + Buat proyek baru
              </Link>
              <Link
                to="/reminders"
                className="block w-full py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg text-center transition-colors"
              >
                Kelola reminder →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  // Full admin sees both ✅
  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Operasional lapangan</SectionLabel>
        <TechnicianDashboard />
      </div>
      <div className="border-t border-slate-200 pt-8">
        <SectionLabel>Pelanggan & pelaporan</SectionLabel>
        <SalesDashboard />
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const { user, isRole } = useAuthStore();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Selamat pagi";
    if (h < 17) return "Selamat siang";
    return "Selamat sore";
  };

  const subtitle = () => {
    if (isRole("admin_technician")) return "Operasional lapangan";
    if (isRole("admin_sales")) return "Pelanggan & pelaporan";
    if (isRole("admin")) return "Semua operasional";
    if (isRole("manager")) return "Analitik bisnis";
    return "";
  };

  return (
    <PageLayout
      title={`${greeting()}, ${user?.name?.split(" ")[0] ?? "—"} 👋`}
      subtitle={subtitle()}
    >
      {isRole("admin_technician") && <TechnicianDashboard />}
      {isRole("admin_sales") && <SalesDashboard />}
      {isRole("admin") && <AdminDashboard />}
      {isRole("manager") && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm mb-4">
            Akses laporan dan analitik bisnis di bawah ini.
          </p>
          <Link
            to="/laporan"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Buka Analitik BI →
          </Link>
        </div>
      )}
      {isRole("developer") && (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm">Developer dashboard</p>
        </div>
      )}
    </PageLayout>
  );
}
