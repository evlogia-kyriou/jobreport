import { PageLayout } from "@/components/shared/PageLayout";
import {
    useTechnician,
    type TechnicianHistoryEntry,
} from "@/hooks/useTechnician";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const cfg =
    outcome === "completed"
      ? "bg-green-50 text-green-700 border-green-200"
      : outcome === "rework"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  const label =
    outcome === "completed"
      ? "Selesai"
      : outcome === "rework"
        ? "Rework"
        : outcome;
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg}`}
    >
      {label}
    </span>
  );
}

export function TechnicianHistoryScreen() {
  const { technicianId } = useParams({ strict: false }) as {
    technicianId: string;
  };

  const { data: tech } = useTechnician(technicianId);

  // Full history — no limit ✅
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["technician-history-full", technicianId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technician_history")
        .select(
          `id, ticket_id, event_date, type, outcome, ac_units_count,
                 duration_minutes, flag_type, cancellation_reason,
                 location:locations!location_id(name)`,
        )
        .eq("technician_id", technicianId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TechnicianHistoryEntry[];
    },
    enabled: !!technicianId,
  });

  return (
    <PageLayout
      title={`Riwayat kerja — ${tech?.name ?? "..."}`}
      subtitle={`${history.length} total pekerjaan`}
    >
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <Link
            to={`/technicians/${technicianId}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Kembali ke profil
          </Link>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide ml-auto">
            {history.length} pekerjaan
          </p>
        </div>

        <div className="px-5">
          {isLoading ? (
            <p className="text-center py-12 text-slate-400 text-sm">
              Memuat...
            </p>
          ) : history.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-sm italic">
              Belum ada riwayat kerja
            </p>
          ) : (
            history.map((entry) => (
              <Link
                key={entry.id}
                to={`/tickets/${entry.ticket_id}`}
                className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-5 px-5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {entry.location?.name ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmtDate(entry.event_date)} · {entry.ac_units_count} unit AC
                    {entry.duration_minutes
                      ? ` · ${entry.duration_minutes} menit`
                      : ""}
                  </p>
                </div>
                <OutcomeBadge outcome={entry.outcome} />
                <i
                  className="ti ti-chevron-right text-slate-300"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
              </Link>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
