import { EditAcUnitModal } from "@/components/shared/EditAcUnitModal";
import { PageLayout } from "@/components/shared/PageLayout";
import {
  useAcMedicalRecord,
  useAcUnitById,
  type AcMedicalRecord,
} from "@/hooks/useAcUnits";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/lib/supabase";
import { fmtBuildingUnit } from "@/utils/locationFormatters";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function cleaningStatus(
  lastCleaned?: string | null,
  intervalDays = 90,
): {
  label: string;
  color: string;
  bg: string;
  days: number | null;
  remaining: number | null;
} {
  const days = daysSince(lastCleaned);
  if (days === null)
    return {
      label: "Belum pernah dicuci",
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      days: null,
      remaining: null,
    };
  const remaining = intervalDays - days;
  if (remaining < 0)
    return {
      label: `Overdue ${Math.abs(remaining)} hari`,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      days,
      remaining,
    };
  if (remaining <= 14)
    return {
      label: `Segera — ${remaining} hari lagi`,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      days,
      remaining,
    };
  return {
    label: `${remaining} hari hingga jadwal berikutnya`,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    days,
    remaining,
  };
}

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

// ── Medical record row ────────────────────────────────────────────────────────

function MedicalRow({
  record,
  acUnitId,
}: {
  record: AcMedicalRecord;
  acUnitId: string;
}) {
  return (
    <Link
      to={`/tickets/${record.ticket_id}/units/${acUnitId}`}
      className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-5 px-5 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-mono text-blue-600">
            {record.ticket_number}
          </span>
          <PassBadge passed={record.suhu_passed} label="Suhu" />
          <PassBadge passed={record.arus_passed} label="Arus" />
        </div>
        <p className="text-xs text-slate-400">
          {fmtDate(record.scheduled_date)} · {record.technician_name}
          {record.suhu_awal &&
            record.suhu_akhir &&
            ` · ${record.suhu_awal}→${record.suhu_akhir}°C`}
          {record.arus_awal &&
            record.arus_akhir &&
            ` · ${record.arus_awal}→${record.arus_akhir}A`}
        </p>
      </div>
      <i
        className="ti ti-chevron-right text-slate-300"
        style={{ fontSize: 14 }}
        aria-hidden="true"
      />
    </Link>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AcUnitDetailScreen() {
  const { acUnitId } = useParams({ strict: false }) as { acUnitId: string };
  const [showEdit, setShowEdit] = useState(false);

  const { data: settings } = useAppSettings();
  const intervalDays = settings?.cleaningIntervalDays ?? 90;

  const { data: acUnit, isLoading, error: acError } = useAcUnitById(acUnitId);
  const { data: records = [] } = useAcMedicalRecord(acUnitId, 10);

  // Unresolved findings from latest ticket ✅
  const { data: findings = [] } = useQuery({
    queryKey: ["ac-unit-findings", acUnitId],
    queryFn: async () => {
      const { data: ticketUnits } = await supabase
        .from("ticket_ac_units")
        .select("ticket_id, ticket:tickets!ticket_id(approved_at)")
        .eq("ac_unit_id", acUnitId)
        .eq("is_approved", true)
        .order("approved_at", { ascending: false, referencedTable: "tickets" })
        .limit(1);

      if (!ticketUnits?.length) return [];
      const latestTicketId = ticketUnits[0].ticket_id;

      const { data: flags } = await supabase
        .from("ticket_flags")
        .select("id, flag_type, notes, ticket_id")
        .eq("ticket_id", latestTicketId)
        .is("resolved_at", null);

      return flags ?? [];
    },
    enabled: !!acUnitId,
  });

  if (isLoading)
    return (
      <PageLayout title="Detail unit AC">
        <div className="text-center py-16 text-slate-400">Memuat...</div>
      </PageLayout>
    );
  if (acError)
    return (
      <PageLayout title="Detail unit AC">
        <div className="text-center py-16 text-red-500 text-sm">
          Error: {(acError as any)?.message ?? "Gagal memuat data"}
        </div>
      </PageLayout>
    );
  if (!acUnit)
    return (
      <PageLayout title="Detail unit AC">
        <div className="text-center py-16 text-slate-400">
          Unit AC tidak ditemukan.
        </div>
      </PageLayout>
    );

  const bu = (acUnit as any).building_unit;
  const unitLabel = bu
    ? fmtBuildingUnit(bu.floor, bu.room, bu.zone_label)
    : acUnit.ac_code;
  const status = cleaningStatus(acUnit.last_cleaned_at, intervalDays);

  return (
    <PageLayout title="Detail unit AC">
      {showEdit && (
        <EditAcUnitModal
          acUnit={acUnit as any}
          onClose={() => setShowEdit(false)}
        />
      )}

      <div className="flex flex-col gap-5">
        {/* ── Info card ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {unitLabel}
              </p>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {acUnit.ac_code}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${acUnit.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
            >
              {acUnit.is_active ? "Aktif" : "Nonaktif"}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <i
                className="ti ti-air-conditioning"
                style={{ fontSize: 14 }}
                aria-hidden="true"
              />
              <span>
                {acUnit.type} · {acUnit.capacity_pk} PK
              </span>
            </div>
            {(acUnit as any).brand && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <i
                  className="ti ti-tag"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                <span>{(acUnit as any).brand.name}</span>
              </div>
            )}
            {(acUnit as any).location && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <i
                  className="ti ti-map-pin"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                <span>{(acUnit as any).location.name}</span>
              </div>
            )}
            {bu && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <i
                  className="ti ti-door"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                <span>{bu.display_name}</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 flex justify-end">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <i
                className="ti ti-edit"
                style={{ fontSize: 14 }}
                aria-hidden="true"
              />
              Edit unit AC
            </button>
          </div>
        </div>

        {/* ── Cleaning status ── */}
        <div className={`border rounded-xl p-5 ${status.bg}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Status kebersihan
          </p>
          <p className={`text-sm font-medium ${status.color}`}>
            {status.label}
          </p>
          {acUnit.last_cleaned_at && (
            <p className="text-xs text-slate-500 mt-1">
              Terakhir dicuci: {fmtDate(acUnit.last_cleaned_at)}
            </p>
          )}
        </div>

        {/* ── Unresolved findings ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Temuan belum diselesaikan
          </p>
          {findings.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              Tidak ada temuan yang belum diselesaikan ✅
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {findings.map((f: any) => (
                <div
                  key={f.id}
                  className="bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  <p className="text-sm font-medium text-red-800">
                    {f.flag_type}
                  </p>
                  {f.notes && (
                    <p className="text-xs text-red-700 mt-0.5">{f.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Medical record ── */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Rekam servis
            </p>
            <Link
              to={`/ac-units/${acUnitId}/history`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Lihat semua →
            </Link>
          </div>
          <div className="px-5">
            {records.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8 italic">
                Belum ada riwayat servis
              </p>
            ) : (
              records.map((r) => (
                <MedicalRow key={r.ticket_id} record={r} acUnitId={acUnitId} />
              ))
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
