import { PageLayout } from "@/components/shared/PageLayout";
import {
    useAcMedicalRecord,
    useAcUnitById,
    type AcMedicalRecord,
} from "@/hooks/useAcUnits";
import { Link, useParams } from "@tanstack/react-router";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PassBadge({
  passed,
  label,
}: {
  passed: boolean | null;
  label: string;
}) {
  if (passed === null)
    return <span className="text-xs text-slate-400">{label}: —</span>;
  return (
    <span
      className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${
        passed
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      {label} {passed ? "✅" : "❌"}
    </span>
  );
}

export function AcUnitHistoryScreen() {
  const { acUnitId } = useParams({ strict: false }) as { acUnitId: string };

  const { data: acUnit } = useAcUnitById(acUnitId);
  const { data: records = [], isLoading } = useAcMedicalRecord(acUnitId); // no limit ✅

  return (
    <PageLayout
      title={`Rekam servis — ${acUnit?.ac_code ?? "..."}`}
      subtitle={`${records.length} total kunjungan`}
    >
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <Link
            to={`/ac-units/${acUnitId}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Kembali ke unit AC
          </Link>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide ml-auto">
            {records.length} kunjungan
          </p>
        </div>

        <div className="px-5">
          {isLoading ? (
            <p className="text-center py-12 text-slate-400 text-sm">
              Memuat...
            </p>
          ) : records.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-sm italic">
              Belum ada riwayat servis
            </p>
          ) : (
            records.map((r: AcMedicalRecord) => (
              <Link
                key={r.ticket_id}
                to={`/tickets/${r.ticket_id}/units/${acUnitId}`}
                className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-5 px-5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-blue-600">
                      {r.ticket_number}
                    </span>
                    <PassBadge passed={r.suhu_passed} label="Suhu" />
                    <PassBadge passed={r.arus_passed} label="Arus" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {fmtDate(r.scheduled_date)} · {r.technician_name}
                    {r.suhu_awal &&
                      r.suhu_akhir &&
                      ` · ${r.suhu_awal}→${r.suhu_akhir}°C`}
                    {r.arus_awal &&
                      r.arus_akhir &&
                      ` · ${r.arus_awal}→${r.arus_akhir}A`}
                  </p>
                </div>
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
