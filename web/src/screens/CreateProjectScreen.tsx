import { CustomerListSection } from "@/components/shared/CustomerListSection";
import { EntityPopover } from "@/components/shared/EntityPopover";
import { LocationListSection } from "@/components/shared/LocationListSection";
import { PageLayout } from "@/components/shared/PageLayout";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcUnitsByLocation } from "@/hooks/useAcUnits";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  getCustomerWarningConfig,
  getCustomerWarningLevel,
  useCustomerPerformance,
  useCustomers,
} from "@/hooks/useCustomers";
import { useLocationsByCustomer } from "@/hooks/useLocations";
import { useCreateProject } from "@/hooks/useProjectTickets";
import { useTechnicians } from "@/hooks/useTechnician";
import {
  getAcBlockingStatus,
  getCustomerAvailability,
  getLocationAvailability,
  type AcBlockStatus,
  type CustomerAvailability,
  type LocationAvailability,
} from "@/repositories/projectRepository";
import { ticketRepository } from "@/repositories/ticketRepository";
import { useAuthStore } from "@/stores/authStore";
import { useProjectDraftStore } from "@/stores/projectDraftStore";
import type { AcUnit, Customer, Location, WorkTicketDraft } from "@/types/app";
import {
  availabilityColor,
  availabilityLabel,
  formatDistance,
} from "@/utils/distanceUtils";
import {
  fmtBuildingUnit,
  fmtFloor,
  fmtRoom,
  fmtZona,
} from "@/utils/locationFormatters";
import {
  getScheduleWithLocation,
  rankTechnicians,
  type ScheduleEntry,
  type TechnicianRanked,
} from "@/utils/technicianAvailability";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type JobType = "cleaning" | "service" | "installation";
type TicketDraft = WorkTicketDraft & { localId: string };

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  number,
  title,
  locked,
  completed,
  children,
}: {
  number: number;
  title: string;
  locked: boolean;
  completed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        locked
          ? "border-slate-100 opacity-50 pointer-events-none"
          : completed
            ? "border-green-200"
            : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div
          className={`w-7 h-7 rounded-full flex items-center
                                 justify-center text-xs font-bold shrink-0 ${
                                   locked
                                     ? "bg-slate-100 text-slate-400"
                                     : completed
                                       ? "bg-green-500 text-white"
                                       : "bg-blue-600 text-white"
                                 }`}
        >
          {completed ? "✓" : number}
        </div>
        <h2
          className={`font-semibold ${
            locked ? "text-slate-400" : "text-slate-800"
          }`}
        >
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Ticket draft card ─────────────────────────────────────────────────────────

function TicketDraftCard({
  index,
  draft,
  allAcUnits,
  technicians,
  jobType,
  takenAcIds,
  inProjectSchedule,
  onUpdate,
  onRemove,
  canRemove,
  targetLat,
  targetLng,
}: {
  index: number;
  draft: TicketDraft;
  allAcUnits: AcUnit[];
  technicians: {
    id: string;
    name: string;
    technician_id: string;
    skills?: string[];
  }[];
  jobType: JobType;
  takenAcIds: Set<string>;
  inProjectSchedule: {
    technician_id: string;
    scheduled_time: string;
    estimated_minutes: number;
    ticketIndex: number;
  }[];
  onUpdate: (field: string, value: string | string[]) => void;
  onRemove: () => void;
  canRemove: boolean;
  targetLat?: number | null;
  targetLng?: number | null;
}) {
  const { data: settings } = useAppSettings();
  const [rankedTechs, setRankedTechs] = useState<TechnicianRanked[]>([]);
  const [dbScheduleExt, setDbScheduleExt] = useState<ScheduleEntry[]>([]);

  const scheduleComplete =
    !!draft.scheduled_date &&
    !!draft.scheduled_time &&
    !!draft.estimated_minutes;

  // Fetch extended schedule when date changes ✅
  useEffect(() => {
    if (!draft.scheduled_date) {
      setDbScheduleExt([]);
      setRankedTechs([]);
      return;
    }
    getScheduleWithLocation(draft.scheduled_date)
      .then(setDbScheduleExt)
      .catch(() => setDbScheduleExt([]));
  }, [draft.scheduled_date]);

  // Rank technicians when schedule is complete ✅
  useEffect(() => {
    if (!scheduleComplete || !settings) return;
    const eligible = technicians.filter((t) =>
      (t as any).skills?.includes(jobType),
    );
    rankTechnicians({
      technicians: eligible as any,
      targetLat: targetLat ?? null,
      targetLng: targetLng ?? null,
      date: draft.scheduled_date,
      scheduledTime: draft.scheduled_time,
      estimatedMinutes: Number(draft.estimated_minutes),
      acUnitCount: draft.ac_unit_ids.length || undefined, // ← Phase D ✅
      settings,
      inProjectSchedule: inProjectSchedule.map((s) => ({ ...s })),
      dbSchedule: dbScheduleExt,
    })
      .then(setRankedTechs)
      .catch(() => setRankedTechs([]));
  }, [
    scheduleComplete,
    draft.scheduled_date,
    draft.scheduled_time,
    draft.estimated_minutes,
    draft.ac_unit_ids.length,
    dbScheduleExt,
    settings,
    targetLat,
    targetLng,
    technicians,
    jobType,
    inProjectSchedule,
  ]);

  const availableAcUnits = allAcUnits.filter(
    (ac) => !takenAcIds.has(ac.id) || draft.ac_unit_ids.includes(ac.id),
  );

  const inputClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const labelClass =
    "text-xs font-medium text-slate-500 uppercase tracking-wide";

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700">
          Tiket #{index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Hapus
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 1. Unit AC */}
        <div className="col-span-2">
          <label className={labelClass}>Unit AC untuk tiket ini *</label>
          <div className="space-y-1.5 mt-1">
            {availableAcUnits.map((ac) => (
              <label
                key={ac.id}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={draft.ac_unit_ids.includes(ac.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...draft.ac_unit_ids, ac.id]
                      : draft.ac_unit_ids.filter((id) => id !== ac.id);
                    onUpdate("ac_unit_ids", next);
                  }}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-slate-700">
                  {fmtBuildingUnit(
                    (ac as any).building_unit?.floor,
                    (ac as any).building_unit?.room,
                    (ac as any).building_unit?.zone_label,
                  ) || ac.ac_code}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {ac.ac_code}
                </span>
              </label>
            ))}
            {availableAcUnits.length === 0 && (
              <p className="text-xs text-slate-400 italic">
                Semua unit AC sudah dialokasikan ke tiket lain.
              </p>
            )}
          </div>
        </div>

        {/* 2. Tanggal */}
        <div>
          <label className={labelClass}>Tanggal *</label>
          <input
            type="date"
            value={draft.scheduled_date}
            onChange={(e) => onUpdate("scheduled_date", e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Waktu Mulai *</label>
          <input
            type="time"
            value={draft.scheduled_time}
            onChange={(e) => onUpdate("scheduled_time", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="col-span-2">
          <label className={labelClass}>Estimasi Durasi (menit) *</label>
          <input
            type="number"
            value={draft.estimated_minutes || ""}
            onChange={(e) => onUpdate("estimated_minutes", e.target.value)}
            min={15}
            step={15}
            placeholder="Contoh: 120"
            className={inputClass}
          />
        </div>

        {/* 3. Teknisi — ranked by distance ✅ */}
        <div className="col-span-2">
          <label className={labelClass}>Teknisi *</label>
          {!scheduleComplete ? (
            <div className="mt-1 px-3 py-2.5 text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white">
              Isi tanggal, waktu, dan estimasi terlebih dahulu
            </div>
          ) : (
            <div className="mt-1 space-y-1.5">
              {rankedTechs.map((tech) => {
                const isSelected = draft.technician_id === tech.id;
                const canPick = tech.canSelect;
                const isConflict = tech.availability === "konflik";
                const isMepet = tech.availability === "mepet";
                return (
                  <label
                    key={tech.id}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : canPick
                          ? "border-slate-200 bg-white cursor-pointer hover:border-blue-300"
                          : "border-slate-100 bg-slate-50 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`tech-${draft.id}`}
                      value={tech.id}
                      checked={isSelected}
                      disabled={!canPick}
                      onChange={() =>
                        canPick && onUpdate("technician_id", tech.id)
                      }
                      className="mt-0.5 accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${canPick ? "text-slate-800" : "text-slate-400"}`}
                      >
                        {tech.name}
                        <span className="ml-1.5 text-xs font-normal text-slate-400">
                          · {tech.technician_id}
                        </span>
                      </p>
                      {tech.distanceKm !== null && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDistance(tech.distanceKm)} · ~{tech.travelMins}{" "}
                          mnt dari {tech.startSource}
                        </p>
                      )}
                      {tech.conflictReason && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {tech.conflictReason}
                        </p>
                      )}
                      {isMepet && !isConflict && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          ⚠ Waktu mepet — kurang dari 30 menit buffer
                        </p>
                      )}
                    </div>
                    {!isSelected && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${availabilityColor(
                          tech.availability as any,
                        )}`}
                      >
                        {availabilityLabel(tech.availability as any)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function CreateProjectScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const createProject = useCreateProject();

  // ── Draft store ───────────────────────────────────────────────────────────
  // ← ADD HERE (right after hook declarations, before state)
  const draft = useProjectDraftStore();
  const isPreFilled = draft.isPreFilled;
  // ── Selections ────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [selectedAcIds, setSelectedAcIds] = useState<string[]>([]);
  const [tickets, setTickets] = useState<TicketDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: customers } = useCustomers();
  const { data: locations } = useLocationsByCustomer(customer?.id ?? "");
  const { data: acUnits } = useAcUnitsByLocation(location?.id ?? "");
  const { data: technicians } = useTechnicians();
  const { data: perf } = useCustomerPerformance(customer?.id ?? "");

  // AC blocking status — fetched when location changes
  const [acBlockMap, setAcBlockMap] = useState<Map<string, AcBlockStatus>>(
    new Map(),
  );
  useEffect(() => {
    if (!location?.id) {
      setAcBlockMap(new Map());
      return;
    }
    getAcBlockingStatus(location.id)
      .then((statuses) => {
        const map = new Map<string, AcBlockStatus>();
        for (const s of statuses) map.set(s.ac_unit_id, s);
        setAcBlockMap(map);
      })
      .catch(() => setAcBlockMap(new Map()));
  }, [location?.id]);

  // Customer availability — fetched once on mount
  const [customerBlockMap, setCustomerBlockMap] = useState<
    Map<string, CustomerAvailability>
  >(new Map());
  useEffect(() => {
    getCustomerAvailability()
      .then(setCustomerBlockMap)
      .catch(() => {});
  }, []);

  // Location availability — fetched when customer changes
  const [locationBlockMap, setLocationBlockMap] = useState<
    Map<string, LocationAvailability>
  >(new Map());
  useEffect(() => {
    if (!customer?.id) {
      setLocationBlockMap(new Map());
      return;
    }
    getLocationAvailability(customer.id)
      .then(setLocationBlockMap)
      .catch(() => {});
  }, [customer?.id]);

  // ── Apply draft on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isPreFilled) return;
    if (!draft.customerId || !draft.locationId) return;

    const c = customers?.find((c) => c.id === draft.customerId);
    const l = locations?.find((l) => l.id === draft.locationId);

    if (c) setCustomer(c);
    if (l) setLocation(l);

    if (draft.jobType) setJobType(draft.jobType);

    if (draft.selectedAcIds.length > 0) {
      setSelectedAcIds(draft.selectedAcIds);
    }

    // Pre-fill first ticket with proposed date from booking ✅
    if (draft.proposedDate) {
      setTickets([
        {
          localId: `ticket-${Date.now()}`,
          id: `ticket-${Date.now()}`,
          technician_id: "",
          scheduled_date: draft.proposedDate,
          scheduled_time: draft.proposedTime ?? "",
          transport_minutes: 0,
          estimated_minutes: 120,
          ac_unit_ids: [],
        },
      ]);
    }
  }, [isPreFilled, customers, locations]);

  // Auto-select available ACs when jobType = "cleaning" is pre-filled
  // (fires after acUnits and acBlockMap are loaded)
  useEffect(() => {
    if (!isPreFilled) return;
    if (draft.jobType !== "cleaning") return;
    if (!acUnits || acUnits.length === 0) return;
    if (draft.selectedAcIds.length > 0) return; // explicit selection takes priority

    // Select all ACs that are NOT in the block map (available for cleaning)
    const availableIds = acUnits
      .filter((ac) => !acBlockMap.has(ac.id))
      .map((ac) => ac.id);
    if (availableIds.length > 0) {
      setSelectedAcIds(availableIds);
    }
  }, [isPreFilled, draft.jobType, acUnits, acBlockMap]);

  // ── Warning ───────────────────────────────────────────────────────────────
  const warningLevel = perf ? getCustomerWarningLevel(perf) : "none";
  const warningConfig = perf
    ? getCustomerWarningConfig(warningLevel, perf)
    : null;

  // Check if all locations for the selected customer have blocked ACs
  const allAcsBlocked =
    acUnits &&
    acUnits.length > 0 &&
    acUnits.every((ac) => acBlockMap.has(ac.id));

  // ── Section lock states ───────────────────────────────────────────────────
  const s2Locked = !customer;
  const s3Locked = !location;
  const s4Locked = !jobType;
  const s5Locked = selectedAcIds.length === 0;

  // ── Completion states ─────────────────────────────────────────────────────
  const s1Done = !!customer;
  const s2Done = !!location;
  const s3Done = !!jobType;
  const s4Done = selectedAcIds.length > 0;
  const s5Done =
    tickets.length > 0 &&
    tickets.every(
      (t) =>
        t.technician_id &&
        t.scheduled_date &&
        t.scheduled_time &&
        t.estimated_minutes > 0 &&
        t.ac_unit_ids.length > 0,
    );

  const canSubmit =
    s1Done && s2Done && s3Done && s4Done && s5Done && !createProject.isPending;

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedAcUnits = useMemo(
    () => (acUnits ?? []).filter((ac) => selectedAcIds.includes(ac.id)),
    [acUnits, selectedAcIds],
  );

  const assignedAcIds = useMemo(
    () => new Set(tickets.flatMap((t) => t.ac_unit_ids)),
    [tickets],
  );

  const unassignedCount = selectedAcIds.filter(
    (id) => !assignedAcIds.has(id),
  ).length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCustomerChange(c: Customer) {
    setCustomer(c);
    setLocation(null);
    setJobType(null);
    setSelectedAcIds([]);
    setTickets([]);
  }

  function handleLocationChange(l: Location) {
    setLocation(l);
    setJobType(null);
    setSelectedAcIds([]);
    setTickets([]);
  }

  function handleTypeChange(type: JobType) {
    setJobType(type);
    setSelectedAcIds([]);
    setTickets([]);
  }

  function handleSelectAllAc(checked: boolean, availableIds?: string[]) {
    const ids =
      availableIds ??
      (acUnits ?? []).filter((ac) => !acBlockMap.has(ac.id)).map((ac) => ac.id);
    setSelectedAcIds(checked ? ids : []);
    setTickets([]);
  }

  function handleAcToggle(acId: string, checked: boolean) {
    setSelectedAcIds((prev) =>
      checked ? [...prev, acId] : prev.filter((id) => id !== acId),
    );
    setTickets([]);
  }

  function addTicket() {
    setTickets((prev) => [
      ...prev,
      {
        localId: `ticket-${Date.now()}`,
        id: `ticket-${Date.now()}`,
        technician_id: "",
        scheduled_date: "",
        scheduled_time: "",
        transport_minutes: 0,
        estimated_minutes: 120,
        ac_unit_ids: [],
      },
    ]);
  }

  function removeTicket(localId: string) {
    setTickets((prev) => prev.filter((t) => t.localId !== localId));
  }

  function updateTicket(
    localId: string,
    field: string,
    value: string | string[],
  ) {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.localId !== localId) return t;
        if (field === "estimated_minutes") {
          return { ...t, estimated_minutes: parseInt(value as string) || 0 };
        }
        return { ...t, [field]: value };
      }),
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customer || !location || !jobType) return;

    if (unassignedCount > 0) {
      setError(`${unassignedCount} unit AC belum ditugaskan ke tiket manapun.`);
      return;
    }

    try {
      await createProject.mutateAsync({
        customer_id: customer.id,
        location_id: location.id,
        type: jobType,
        ac_unit_ids: selectedAcIds,
        work_tickets: tickets.map((t) => ({
          id: t.id,
          technician_id: t.technician_id,
          scheduled_date: t.scheduled_date,
          scheduled_time: t.scheduled_time,
          estimated_minutes: t.estimated_minutes,
          transport_minutes: t.transport_minutes,
          ac_unit_ids: t.ac_unit_ids,
        })),
        created_by: user?.id ?? "",
      });

      // ← clear draft after success
      draft.clearDraft();
      navigate({ to: "/projects" });
    } catch (err: any) {
      // Extract the most useful error message.
      // Supabase wraps DB trigger errors inside err.message or err.details.
      const raw: string =
        err?.message ?? err?.details ?? err?.hint ?? "Gagal membuat proyek.";

      // Map known DB trigger messages to friendly Indonesian messages
      let friendly = raw;
      if (raw.includes("waktu yang sama") || raw.includes("overlap")) {
        friendly =
          "Jadwal teknisi bertabrakan dengan tiket lain pada tanggal dan waktu yang dipilih. Silakan pilih waktu atau teknisi yang berbeda.";
      } else if (raw.includes("keahlian") || raw.includes("skill")) {
        friendly =
          "Teknisi yang dipilih tidak memiliki keahlian yang dibutuhkan untuk jenis pekerjaan ini.";
      } else if (raw.includes("Not authenticated")) {
        friendly = "Sesi Anda telah berakhir. Silakan login kembali.";
      }

      setError(friendly);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="Buat Proyek"
      subtitle="Isi semua bagian untuk membuat proyek baru"
      action={
        <Link
          to="/projects"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          Batalkan
        </Link>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {/* Section 1 — Pelanggan */}
            <Section
              number={1}
              title="Pilih Pelanggan"
              locked={false}
              completed={s1Done}
            >
              {/* ← REPLACE SearchableSelect with this block */}
              {isPreFilled ? (
                <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-800">
                    {customer?.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dipilih dari halaman lokasi ·{" "}
                    <button
                      type="button"
                      onClick={() => {
                        draft.clearDraft();
                        setCustomer(null);
                        setLocation(null);
                        setSelectedAcIds([]);
                        setTickets([]);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Ubah
                    </button>
                  </p>
                </div>
              ) : (
                <CustomerListSection
                  customers={customers ?? []}
                  blockMap={customerBlockMap}
                  selectedId={customer?.id ?? ""}
                  onChange={handleCustomerChange}
                />
              )}

              {customer && warningConfig && (
                <div
                  className={`mt-3 rounded-lg border px-4 py-3 ${warningConfig.className}`}
                >
                  <p className="text-sm font-semibold">
                    {warningConfig.icon} {warningConfig.label}
                  </p>
                  <p className="text-xs mt-1">{warningConfig.detail}</p>
                  <p className="text-xs mt-2 opacity-75">
                    Anda tetap dapat melanjutkan.
                  </p>
                </div>
              )}

              {customer && allAcsBlocked && (
                <div className="mt-2">
                  <EntityPopover
                    trigger={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        ⚠ Semua lokasi sedang aktif
                      </button>
                    }
                    config={{ kind: "customer", customerId: customer.id }}
                  />
                </div>
              )}
            </Section>

            {/* Section 2 — Lokasi */}
            <Section
              number={2}
              title="Pilih Lokasi"
              locked={s2Locked}
              completed={s2Done}
            >
              {/* ← Lock location too if pre-filled */}
              {isPreFilled ? (
                <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-800">
                    {location?.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dipilih dari halaman lokasi
                  </p>
                </div>
              ) : (
                <LocationListSection
                  locations={locations ?? []}
                  blockMap={locationBlockMap}
                  selectedId={location?.id ?? ""}
                  onChange={handleLocationChange}
                />
              )}
            </Section>

            {/* Section 3 — Jenis Pekerjaan */}
            <Section
              number={3}
              title="Pilih Jenis Pekerjaan"
              locked={s3Locked}
              completed={s3Done}
            >
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { value: "cleaning", label: "Cleaning", icon: "🧹" },
                    { value: "installation", label: "Instalasi", icon: "🔧" },
                    { value: "service", label: "Servis", icon: "⚙️" },
                  ] as { value: JobType; label: string; icon: string }[]
                ).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTypeChange(t.value)}
                    disabled={s3Locked}
                    className={`px-4 py-4 rounded-xl border-2 text-left transition-colors ${
                      jobType === t.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{t.icon}</div>
                    <p
                      className={`text-sm font-medium ${
                        jobType === t.value ? "text-blue-700" : "text-slate-700"
                      }`}
                    >
                      {t.label}
                    </p>
                  </button>
                ))}
              </div>
            </Section>

            {/* Section 4 — Unit AC */}
            <Section
              number={4}
              title="Pilih Unit AC"
              locked={s4Locked}
              completed={s4Done}
            >
              {!acUnits ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-lg" />
                  ))}
                </div>
              ) : acUnits.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-sm">
                    Belum ada unit AC di lokasi ini.
                  </p>
                  <Link
                    to="/ac-units/register"
                    className="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-block"
                  >
                    + Daftarkan unit AC
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer pb-2 border-b border-slate-100">
                    <input
                      type="checkbox"
                      checked={
                        selectedAcIds.length ===
                          (acUnits ?? []).filter((ac) => !acBlockMap.has(ac.id))
                            .length &&
                        (acUnits ?? []).filter((ac) => !acBlockMap.has(ac.id))
                          .length > 0
                      }
                      onChange={(e) => {
                        const available = (acUnits ?? [])
                          .filter((ac) => !acBlockMap.has(ac.id))
                          .map((ac) => ac.id);
                        handleSelectAllAc(e.target.checked, available);
                      }}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Pilih semua yang tersedia (
                      {
                        (acUnits ?? []).filter((ac) => !acBlockMap.has(ac.id))
                          .length
                      }{" "}
                      tersedia
                      {acBlockMap.size > 0 &&
                        `, ${acBlockMap.size} tidak tersedia`}
                      )
                    </span>
                  </label>
                  {(acUnits ?? []).map((ac) => {
                    const block = acBlockMap.get(ac.id);
                    const isBlocked = !!block;

                    return (
                      <div
                        key={ac.id}
                        className={`py-1 ${isBlocked ? "opacity-60" : ""}`}
                      >
                        <label
                          className={`flex items-start gap-2.5 ${isBlocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAcIds.includes(ac.id)}
                            disabled={isBlocked}
                            onChange={(e) =>
                              !isBlocked &&
                              handleAcToggle(ac.id, e.target.checked)
                            }
                            className="accent-blue-600 w-4 h-4 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm ${isBlocked ? "text-slate-400" : "text-slate-700"}`}
                              >
                                {fmtBuildingUnit(
                                  (ac as any).building_unit?.floor,
                                  (ac as any).building_unit?.room,
                                  (ac as any).building_unit?.zone_label,
                                ) || "—"}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                {ac.ac_code}
                              </span>
                              <span className="text-xs text-slate-400">
                                {ac.type} · {ac.capacity_pk} PK
                              </span>
                            </div>

                            {/* Blocking reason */}
                            {block && (
                              <p className="text-xs text-red-500 mt-0.5">
                                {block.reason === "active_ticket" ? (
                                  <>
                                    Tidak tersedia · Terjadwal dalam pekerjaan
                                    aktif :{" "}
                                    {block.ticket_id ? (
                                      <EntityPopover
                                        trigger={
                                          <button
                                            type="button"
                                            className="underline decoration-dotted font-medium hover:text-red-700"
                                          >
                                            {block.ticket_number}
                                          </button>
                                        }
                                        config={{
                                          kind: "ticket",
                                          entityTitle: ac.ac_code,
                                          ticketId: block.ticket_id,
                                        }}
                                      />
                                    ) : (
                                      <span className="font-medium">
                                        {block.ticket_number}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  `Tidak tersedia · Sudah dibersihkan · ${block.days_remaining} hari lagi sampai jadwal berikutnya`
                                )}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Section 5 — Tiket Kerja */}
            <Section
              number={5}
              title="Buat Tiket Kerja"
              locked={s5Locked}
              completed={s5Done}
            >
              <div className="space-y-4">
                {tickets.map((ticket, index) => {
                  // ACs taken by OTHER tickets (not this one)
                  const takenByOthers = new Set(
                    tickets
                      .filter((t) => t.localId !== ticket.localId)
                      .flatMap((t) => t.ac_unit_ids),
                  );
                  // Schedule entries from other tickets in THIS project (not in DB yet)
                  const inProjectSchedule = tickets
                    .filter(
                      (t) =>
                        t.localId !== ticket.localId &&
                        !!t.technician_id &&
                        !!t.scheduled_date &&
                        t.scheduled_date === ticket.scheduled_date,
                    )
                    .map((t, i) => ({
                      technician_id: t.technician_id,
                      scheduled_time: t.scheduled_time,
                      estimated_minutes: Number(t.estimated_minutes),
                      ticketIndex: tickets.indexOf(t),
                    }));
                  return (
                    <TicketDraftCard
                      key={ticket.localId}
                      index={index}
                      draft={ticket}
                      allAcUnits={selectedAcUnits}
                      technicians={technicians ?? []}
                      jobType={jobType ?? "cleaning"}
                      takenAcIds={takenByOthers}
                      inProjectSchedule={inProjectSchedule}
                      onUpdate={(field, value) =>
                        updateTicket(ticket.localId, field, value)
                      }
                      onRemove={() => removeTicket(ticket.localId)}
                      canRemove={tickets.length > 1}
                      targetLat={(location as any)?.lat ?? null}
                      targetLng={(location as any)?.lng ?? null}
                    />
                  );
                })}

                <button
                  type="button"
                  onClick={addTicket}
                  disabled={s5Locked}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors font-medium"
                >
                  + Tambah Tiket Kerja
                </button>

                {unassignedCount > 0 && tickets.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-amber-700">
                      ⚠ {unassignedCount} unit AC belum ditugaskan ke tiket
                      manapun.
                    </p>
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* Right — summary */}
          <div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6 space-y-4">
              <h2 className="font-semibold text-slate-800">Ringkasan Proyek</h2>
              <div className="space-y-2">
                <SummaryRow label="Pelanggan" value={customer?.name ?? "—"} />
                <SummaryRow label="Lokasi" value={location?.name ?? "—"} />
                <SummaryRow
                  label="Jenis"
                  value={
                    jobType
                      ? jobType.charAt(0).toUpperCase() + jobType.slice(1)
                      : "—"
                  }
                />
                <SummaryRow
                  label="Total AC"
                  value={
                    selectedAcIds.length > 0
                      ? `${selectedAcIds.length} unit`
                      : "—"
                  }
                />
                <SummaryRow
                  label="Tiket Kerja"
                  value={tickets.length > 0 ? `${tickets.length} tiket` : "—"}
                />
              </div>

              {tickets.map((t, i) => {
                const tech = (technicians ?? []).find(
                  (tech) => tech.id === t.technician_id,
                );
                return t.technician_id ? (
                  <div
                    key={t.localId}
                    className="bg-slate-50 rounded-lg px-3 py-2 text-xs"
                  >
                    <p className="font-medium text-slate-700">Tiket #{i + 1}</p>
                    <p className="text-slate-500 mt-0.5">{tech?.name ?? "—"}</p>
                    <p className="text-slate-400">
                      {t.scheduled_date} · {t.scheduled_time}
                    </p>
                    <p className="text-slate-400">
                      {t.ac_unit_ids.length} unit AC
                    </p>
                  </div>
                ) : null;
              })}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {createProject.isPending ? "Membuat proyek..." : "Buat Proyek"}
              </button>

              {!canSubmit && (
                <p className="text-xs text-slate-400 text-center">
                  Lengkapi semua bagian untuk melanjutkan
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}

// ── Sub components ────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-slate-100">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right max-w-36 truncate">
        {value}
      </span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputClass = `
    w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
    focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white
    disabled:bg-slate-50 disabled:text-slate-400
`.trim();

const labelClass = `
    text-sm font-medium text-slate-700 mb-1.5 block
`.trim();
