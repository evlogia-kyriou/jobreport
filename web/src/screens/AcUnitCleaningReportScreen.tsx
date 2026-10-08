import { PageLayout } from "@/components/shared/PageLayout";
import { useApproveAcUnit } from "@/hooks/useProjects";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { fmtBuildingUnit } from "@/utils/locationFormatters";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AcUnitStep {
  id: string;
  ac_unit_id: string;
  section: string;
  order_number: number;
  description: string;
  step_type: string;
  input_unit: string | null;
  input_value: string | null;
  is_checked: boolean;
  is_condition_abnormal: boolean;
  photo_url: string | null;
  is_completed: boolean;
  ac_unit: {
    id: string;
    ac_code: string;
    type: string;
    capacity_pk: string;
    building_unit: {
      floor: string | null;
      room: string | null;
      zone_label: string | null;
    } | null;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUHU_MAX = 12;
const ARUS_MIN_PCT = 3;

// ── 8 sections — updated to match SOP ✅ ──────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  kedatangan: "Kedatangan",
  pengecekan_ac: "Pengecekan AC",
  persiapan_pencucian: "Persiapan pencucian",
  pencucian_indoor: "Cuci indoor",
  pencucian_outdoor: "Cuci outdoor",
  pengecekan_akhir: "Pengecekan akhir",
  dokumentasi_akhir: "Dokumentasi akhir",
  laporan_kerusakan: "Temuan & kerusakan",
};

const SECTIONS = [
  "kedatangan",
  "pengecekan_ac",
  "persiapan_pencucian",
  "pencucian_indoor",
  "pencucian_outdoor",
  "pengecekan_akhir",
  "dokumentasi_akhir",
  "laporan_kerusakan",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function suhuStatus(after: number): "good" | "bad" {
  return after < SUHU_MAX ? "good" : "bad";
}

function arusStatus(before: number, after: number): "good" | "warn" | "bad" {
  const drop = ((before - after) / before) * 100;
  if (drop >= ARUS_MIN_PCT) return "good";
  if (drop > 0) return "warn";
  return "bad";
}

function dropPct(before: number, after: number) {
  return (((before - after) / before) * 100).toFixed(1);
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchStepsForUnit(ticketId: string, acUnitId: string) {
  const { data, error } = await supabase
    .from("ticket_steps")
    .select(
      `
      id, ac_unit_id, section, order_number, description, step_type,
      input_unit, input_value, is_checked, is_condition_abnormal,
      photo_url, is_completed,
      ac_unit:ac_units!ac_unit_id(
        id, ac_code, type, capacity_pk,
        building_unit:building_units!building_unit_id(floor, room, zone_label)
      )
    `,
    )
    .eq("ticket_id", ticketId)
    .eq("ac_unit_id", acUnitId)
    .order("order_number");
  if (error) throw error;
  return (data ?? []) as unknown as AcUnitStep[];
}

async function fetchUnitApproval(ticketId: string, acUnitId: string) {
  const { data } = await supabase
    .from("ticket_ac_units")
    .select(`is_approved, photo_unit_indoor_url, photo_unit_outdoor_url`)
    .eq("ticket_id", ticketId)
    .eq("ac_unit_id", acUnitId)
    .single();
  return data;
}

async function fetchTicketInfo(ticketId: string) {
  const { data } = await supabase
    .from("tickets")
    .select(
      `ticket_number, type, scheduled_date,
             technician:technicians!technician_id(name),
             location:locations!location_id(name)`,
    )
    .eq("id", ticketId)
    .single();
  return data as any;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function AcUnitCleaningReportScreen() {
  const { ticketId, acUnitId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { user, hasPermission, isRole } = useAuthStore();
  const canApprove = hasPermission("approve_unit");
  const canConfirm = hasPermission("confirm_findings");
  const approveUnit = useApproveAcUnit();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: steps = [], isLoading: ls } = useQuery({
    queryKey: ["unit-steps", ticketId, acUnitId],
    queryFn: () => fetchStepsForUnit(ticketId!, acUnitId!),
    enabled: !!ticketId && !!acUnitId,
  });

  const { data: approval } = useQuery({
    queryKey: ["unit-approval", ticketId, acUnitId],
    queryFn: () => fetchUnitApproval(ticketId!, acUnitId!),
    enabled: !!ticketId && !!acUnitId,
  });

  const { data: ticket } = useQuery({
    queryKey: ["ticket-info", ticketId],
    queryFn: () => fetchTicketInfo(ticketId!),
    enabled: !!ticketId,
  });

  if (ls)
    return (
      <PageLayout title="Laporan unit AC">
        <div className="text-center py-16 text-slate-400">Memuat...</div>
      </PageLayout>
    );
  if (!steps.length)
    return (
      <PageLayout title="Laporan unit AC">
        <div className="text-center py-16 text-slate-400">
          Data tidak ditemukan.
        </div>
      </PageLayout>
    );

  const ac = steps[0].ac_unit;
  const bu = ac.building_unit;
  const unitLabel =
    fmtBuildingUnit(bu?.floor, bu?.room, bu?.zone_label) || ac.ac_code;
  const isApproved = approval?.is_approved ?? false;

  const suhuAwal = steps.find((s) => s.description === "Suhu Awal");
  const suhuAkhir = steps.find((s) => s.description === "Suhu Akhir");
  const arusAwal = steps.find((s) => s.description === "Ampere Awal");
  const arusAkhir = steps.find((s) => s.description === "Ampere Akhir");
  const pcbIn = steps.find((s) => s.description === "PCB Indoor terlindungi");
  const pcbOut = steps.find((s) => s.description === "PCB Outdoor terlindungi");
  const areaIn = steps.find((s) => s.description === "Area Indoor dirapikan");
  const areaOut = steps.find((s) => s.description === "Area Outdoor dirapikan");
  const problems = steps.filter(
    (s) =>
      s.is_condition_abnormal ||
      (s.step_type === "dynamic_finding_photo" && s.input_value?.trim()),
  );

  const suhuB = parseFloat(suhuAwal?.input_value ?? "");
  const suhuA = parseFloat(suhuAkhir?.input_value ?? "");
  const arusB = parseFloat(arusAwal?.input_value ?? "");
  const arusA = parseFloat(arusAkhir?.input_value ?? "");

  const sStatus = !isNaN(suhuB) && !isNaN(suhuA) ? suhuStatus(suhuA) : null;
  const aStatus =
    !isNaN(arusB) && !isNaN(arusA) ? arusStatus(arusB, arusA) : null;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  async function handleApprove() {
    try {
      await approveUnit.mutateAsync({
        ticketId: ticketId!,
        acUnitId: acUnitId!,
        adminId: user?.id ?? "",
      });
      setConfirmOpen(false);
      await qc.refetchQueries({
        queryKey: ["unit-approval", ticketId, acUnitId],
      });
      await qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      await qc.invalidateQueries({ queryKey: ["ticket-approvals", ticketId] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: `/tickets/${ticketId}` });
    } catch {
      setError("Gagal menyetujui unit. Coba lagi.");
    }
  }

  return (
    <PageLayout title="Laporan unit AC">
      {/* ── Confirmation dialog — SINGLE instance only ✅ ── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-0">
              <p className="text-base font-medium text-slate-800 mb-1">
                Setujui unit ini?
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Pastikan laporan sudah
                diperiksa sebelum menyetujui.
              </p>
            </div>
            <div className="mx-6 my-4 bg-slate-50 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">{unitLabel}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {ac.type} · {ac.capacity_pk}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {!isNaN(suhuA) && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${suhuStatus(suhuA) === "good" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
                  >
                    {suhuStatus(suhuA) === "good"
                      ? "Suhu < 12°C Lulus"
                      : "Suhu ≥ 12°C Tidak Lulus"}
                  </span>
                )}
                {!isNaN(arusB) && !isNaN(arusA) && arusB > 0 && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${arusStatus(arusB, arusA) === "good" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {"Arus ↓" +
                      (((arusB - arusA) / arusB) * 100).toFixed(2) +
                      "% " +
                      (arusStatus(arusB, arusA) === "good"
                        ? "Baik"
                        : "Perlu Perhatian")}
                  </span>
                )}
              </div>
            </div>
            {problems.length > 0 && (
              <div className="mx-6 mb-4 flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <i
                  className="ti ti-alert-triangle text-amber-600 flex-shrink-0 mt-0.5"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Ada {problems.length} catatan perlu perhatian. Pastikan sudah
                  ditinjau sebelum menyetujui.
                </p>
              </div>
            )}
            <div className="flex gap-2 p-4 border-t border-slate-100">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleApprove}
                disabled={approveUnit.isPending || !canApprove}
                className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {approveUnit.isPending ? (
                  "Menyetujui..."
                ) : (
                  <>
                    <i
                      className="ti ti-check"
                      style={{ fontSize: 13 }}
                      aria-hidden="true"
                    />{" "}
                    Ya, setujui
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* ── Unit info card ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900 leading-snug">
                {unitLabel}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {ac.type} · {ac.capacity_pk} · {ac.ac_code}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              {isApproved ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                  ✅ Disetujui
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  Menunggu persetujuan
                </span>
              )}
              {problems.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                  ⚠ Temuan
                </span>
              )}
            </div>
          </div>
          {ticket && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <i
                  className="ti ti-hash"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                <span className="font-mono text-xs">
                  {ticket.ticket_number}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <i
                  className="ti ti-user"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                <span>{ticket.technician?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <i
                  className="ti ti-calendar"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
                <span>{fmtDate(ticket.scheduled_date)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── 1. Temuan ── */}
        {problems.length > 0 && (
          <Section label="⚠ Temuan & masalah" labelClass="text-red-600">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-3">
              {problems.map((p) => (
                <div key={p.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      {p.description}
                    </p>
                    {p.input_value && (
                      <p className="text-sm text-red-700 mt-1 bg-white rounded-lg px-3 py-2 border border-red-100">
                        {p.input_value}
                      </p>
                    )}
                  </div>
                  {p.photo_url && (
                    <a
                      href={p.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={p.photo_url}
                        alt="Foto temuan"
                        className="w-24 h-20 object-cover rounded-lg border border-red-200 hover:opacity-90 cursor-zoom-in flex-shrink-0"
                      />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 2. Pengukuran ── */}
        <Section
          label="Pengukuran"
          action={
            <div className="flex gap-2">
              {sStatus && <StatusBadge status={sStatus} label="Suhu" />}
              {aStatus && <StatusBadge status={aStatus} label="Arus" />}
            </div>
          }
        >
          {suhuAwal && suhuAkhir && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Suhu unit AC
              </p>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <MeasSide step={suhuAwal} label="Sebelum" unit="°C" />
                <MeasSide
                  step={suhuAkhir}
                  label="Sesudah"
                  unit="°C"
                  colorClass={
                    sStatus === "good" ? "text-green-600" : "text-red-600"
                  }
                />
              </div>
              {sStatus && (
                <AssessBar status={sStatus}>
                  {sStatus === "good"
                    ? `Suhu akhir ${suhuA}°C di bawah batas maksimum ${SUHU_MAX}°C`
                    : `Suhu akhir ${suhuA}°C melebihi batas maksimum ${SUHU_MAX}°C`}
                  <span className="font-semibold ml-auto">
                    ↓ {Math.abs(suhuA - suhuB).toFixed(1)}°C
                  </span>
                </AssessBar>
              )}
            </div>
          )}
          {suhuAwal && suhuAkhir && arusAwal && arusAkhir && (
            <div className="h-px bg-slate-100 my-4" />
          )}
          {arusAwal && arusAkhir && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">
                Arus listrik
              </p>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <MeasSide step={arusAwal} label="Sebelum" unit="A" />
                <MeasSide
                  step={arusAkhir}
                  label="Sesudah"
                  unit="A"
                  colorClass={
                    aStatus === "good"
                      ? "text-green-600"
                      : aStatus === "warn"
                        ? "text-amber-600"
                        : "text-red-600"
                  }
                />
              </div>
              {aStatus && (
                <AssessBar status={aStatus}>
                  {aStatus === "good"
                    ? `Penurunan ${dropPct(arusB, arusA)}% memenuhi standar minimum ${ARUS_MIN_PCT}%`
                    : `Penurunan ${dropPct(arusB, arusA)}% di bawah batas minimum ${ARUS_MIN_PCT}% — kompresor perlu diperiksa`}
                  <span className="font-semibold ml-auto">
                    ↓ {dropPct(arusB, arusA)}%
                  </span>
                </AssessBar>
              )}
            </div>
          )}
        </Section>

        {/* ── 3. Kondisi unit ── */}
        <Section label="Kondisi unit">
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-500 mb-3">
              Foto unit AC
            </p>
            <div className="grid grid-cols-2 gap-3">
              {approval?.photo_unit_indoor_url ? (
                <PhotoCard
                  url={approval.photo_unit_indoor_url}
                  label="Unit indoor"
                />
              ) : (
                <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                  <span className="text-xs text-slate-300">Belum ada foto</span>
                </div>
              )}
              {approval?.photo_unit_outdoor_url ? (
                <PhotoCard
                  url={approval.photo_unit_outdoor_url}
                  label="Unit outdoor"
                />
              ) : (
                <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                  <span className="text-xs text-slate-300">Belum ada foto</span>
                </div>
              )}
            </div>
          </div>
          {(pcbIn || pcbOut || areaIn || areaOut) && (
            <>
              {(approval?.photo_unit_indoor_url ||
                approval?.photo_unit_outdoor_url) && (
                <div className="h-px bg-slate-100 mb-4" />
              )}
              <p className="text-xs font-medium text-slate-500 mb-3">
                Sebelum vs sesudah dicuci
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 pb-2 border-b border-slate-200 mb-3">
                    Sebelum
                  </p>
                  <div className="flex flex-col gap-3">
                    {pcbIn?.photo_url && (
                      <PhotoCard url={pcbIn.photo_url} label="PCB indoor" />
                    )}
                    {pcbOut?.photo_url && (
                      <PhotoCard url={pcbOut.photo_url} label="PCB outdoor" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 pb-2 border-b border-slate-200 mb-3">
                    Sesudah
                  </p>
                  <div className="flex flex-col gap-3">
                    {areaIn?.photo_url && (
                      <PhotoCard url={areaIn.photo_url} label="Area indoor" />
                    )}
                    {areaOut?.photo_url && (
                      <PhotoCard url={areaOut.photo_url} label="Area outdoor" />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </Section>

        {/* ── 4. All steps — 8 sections ── */}
        <Section
          label={`Semua langkah — ${steps.filter((s) => s.is_completed).length}/${steps.length}`}
        >
          {SECTIONS.map((sec) => {
            const secSteps = steps.filter((s) => s.section === sec);
            if (!secSteps.length) return null;
            return (
              <div key={sec} className="mb-4 last:mb-0">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  {SECTION_LABELS[sec]}
                </p>
                <div className="divide-y divide-slate-50 border border-slate-100 rounded-lg overflow-hidden">
                  {secSteps.map((s) => {
                    const ok = s.is_completed && !s.is_condition_abnormal;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <span
                          className={`text-sm flex-shrink-0 ${ok ? "text-green-500" : s.is_completed ? "text-amber-500" : "text-slate-300"}`}
                        >
                          {ok ? "✅" : s.is_completed ? "⚠" : "○"}
                        </span>
                        <span className="flex-1 text-xs text-slate-600 truncate">
                          {s.description}
                        </span>
                        {s.input_value && (
                          <span
                            className={`text-xs flex-shrink-0 ${
                              s.description === "Suhu Akhir" &&
                              sStatus === "bad"
                                ? "text-red-500"
                                : s.description === "Ampere Akhir" &&
                                    aStatus !== "good"
                                  ? "text-amber-500"
                                  : "text-slate-400"
                            }`}
                          >
                            {s.input_value} {s.input_unit ?? ""}
                          </span>
                        )}
                        {s.photo_url && (
                          <a
                            href={s.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-600 text-xs flex-shrink-0"
                          >
                            <i
                              className="ti ti-camera"
                              style={{ fontSize: 13 }}
                              aria-hidden="true"
                            />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Section>

        {/* ── Approve bar ── */}
        <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-between px-5 py-4">
          <button
            onClick={() => navigate({ to: `/tickets/${ticketId}` })}
            className="text-sm font-medium px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ← Kembali ke tiket
          </button>
          {!isApproved && canApprove && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="text-sm font-medium px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              Setujui unit ini
            </button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  label,
  labelClass = "",
  action,
  children,
}: {
  label: string;
  labelClass?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${labelClass || "text-slate-400"}`}
        >
          {label}
        </p>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: "good" | "warn" | "bad";
  label: string;
}) {
  const cls = {
    good: "bg-green-50 text-green-700 border-green-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    bad: "bg-red-50 text-red-700 border-red-200",
  }[status];
  const icon = { good: "✅", warn: "⚠", bad: "❌" }[status];
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}
    >
      {icon} {label}
      {status === "good" ? " Baik" : ""}
    </span>
  );
}

function MeasSide({
  step,
  label,
  unit,
  colorClass = "text-slate-800",
}: {
  step: any;
  label: string;
  unit: string;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {step.photo_url ? (
        <a href={step.photo_url} target="_blank" rel="noopener noreferrer">
          <img
            src={step.photo_url}
            alt={label}
            className="w-14 h-12 object-cover rounded-lg border border-slate-200 flex-shrink-0 cursor-zoom-in hover:opacity-90"
          />
        </a>
      ) : (
        <div className="w-14 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
          <i
            className="ti ti-camera text-slate-300"
            style={{ fontSize: 16 }}
            aria-hidden="true"
          />
        </div>
      )}
      <div>
        <p className={`text-xl font-semibold ${colorClass}`}>
          {step.input_value}
          {unit}
        </p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function AssessBar({
  status,
  children,
}: {
  status: "good" | "warn" | "bad";
  children: React.ReactNode;
}) {
  const cls = {
    good: "bg-green-50 text-green-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-red-50 text-red-700",
  }[status];
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${cls}`}
    >
      {children}
    </div>
  );
}

function PhotoCard({ url, label }: { url: string; label: string }) {
  return (
    <div>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={label}
          className="w-full h-28 object-cover rounded-lg border border-slate-200 hover:opacity-90 cursor-zoom-in"
        />
      </a>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}
