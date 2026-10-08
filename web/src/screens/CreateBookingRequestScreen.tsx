import { CustomerListSection } from "@/components/shared/CustomerListSection";
import { LocationListSection } from "@/components/shared/LocationListSection";
import { PageLayout } from "@/components/shared/PageLayout";
import { useAcUnitsByLocation } from "@/hooks/useAcUnits";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useCustomers } from "@/hooks/useCustomers";
import { useLocationsByCustomer } from "@/hooks/useLocations";
import { useTechnicians } from "@/hooks/useTechnician";
import {
  getCustomerAvailability,
  getLocationAvailability,
  projectRepository,
  type CustomerAvailability,
  type LocationAvailability,
} from "@/repositories/projectRepository";
import { useAuthStore } from "@/stores/authStore";
import { useProjectDraftStore } from "@/stores/projectDraftStore";
import type { Customer, Location } from "@/types/app";
import {
  availabilityColor,
  availabilityLabel,
  formatDistance,
} from "@/utils/distanceUtils";
import { fmtBuildingUnit } from "@/utils/locationFormatters";
import {
  getScheduleWithLocation,
  rankTechnicians,
  type ScheduleEntry,
  type TechnicianRanked,
} from "@/utils/technicianAvailability";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

type JobType = "cleaning" | "service" | "installation";

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
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
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
          className={`font-semibold ${locked ? "text-slate-400" : "text-slate-800"}`}
        >
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Proposed date row ─────────────────────────────────────────────────────────

interface ProposedDate {
  id: string;
  date: string;
  time: string;
  notes: string;
}

function ProposedDateRow({
  row,
  index,
  onUpdate,
  onRemove,
  canRemove,
  rankedTechs,
  locationHasCoords,
}: {
  row: ProposedDate;
  index: number;
  onUpdate: (field: keyof ProposedDate, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  rankedTechs: TechnicianRanked[];
  locationHasCoords: boolean;
}) {
  const inputClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Opsi {index + 1}</p>
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
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Tanggal *
          </label>
          <input
            type="date"
            value={row.date}
            onChange={(e) => onUpdate("date", e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Waktu (opsional)
          </label>
          <input
            type="time"
            value={row.time}
            onChange={(e) => onUpdate("time", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Catatan (opsional)
          </label>
          <input
            type="text"
            value={row.notes}
            onChange={(e) => onUpdate("notes", e.target.value)}
            placeholder="e.g. Pagi saja, atau weekday saja"
            className={inputClass}
          />
        </div>
      </div>

      {/* Technician availability (informational only) ✅ */}
      {row.date && row.time && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          {!locationHasCoords ? (
            <p className="text-xs text-slate-400 italic">
              Tambahkan koordinat lokasi untuk melihat info jarak teknisi ✅
            </p>
          ) : rankedTechs.length === 0 ? (
            <p className="text-xs text-slate-400">Memuat info teknisi...</p>
          ) : (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">
                Perkiraan ketersediaan teknisi (belum ditetapkan):
              </p>
              <div className="space-y-1.5">
                {rankedTechs.slice(0, 5).map((tech) => (
                  <div
                    key={tech.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700">
                        {tech.name}
                      </p>
                      {tech.distanceKm !== null && (
                        <p className="text-xs text-slate-400">
                          {formatDistance(tech.distanceKm)} · ~{tech.travelMins}{" "}
                          mnt dari {tech.startSource}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${availabilityColor(
                        tech.availability as any,
                      )}`}
                    >
                      {availabilityLabel(tech.availability as any)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2 italic">
                Ini perkiraan saja. Teknisi dipilih saat booking dikonfirmasi.
                ✅
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function CreateBookingRequestScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const draftStore = useProjectDraftStore();

  // ── Selections ────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [selectedAcIds, setSelectedAcIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [proposedDates, setProposedDates] = useState<ProposedDate[]>([
    { id: "1", date: "", time: "", notes: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: settings } = useAppSettings();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: customers } = useCustomers();
  const { data: locations } = useLocationsByCustomer(customer?.id ?? "");
  const { data: acUnits } = useAcUnitsByLocation(location?.id ?? "");

  const [customerBlockMap, setCustomerBlockMap] = useState<
    Map<string, CustomerAvailability>
  >(new Map());
  const [locationBlockMap, setLocationBlockMap] = useState<
    Map<string, LocationAvailability>
  >(new Map());

  useEffect(() => {
    getCustomerAvailability()
      .then(setCustomerBlockMap)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!customer?.id) {
      setLocationBlockMap(new Map());
      return;
    }
    getLocationAvailability(customer.id)
      .then(setLocationBlockMap)
      .catch(() => {});
  }, [customer?.id]);

  // ── Section lock states ───────────────────────────────────────────────────
  const s2Locked = !customer;
  const s3Locked = !location;
  const s4Locked = !jobType;
  const s5Locked = selectedAcIds.length === 0;

  const s1Done = !!customer;
  const s2Done = !!location;
  const s3Done = !!jobType;
  const s4Done = selectedAcIds.length > 0;
  const s5Done = proposedDates.some((d) => !!d.date);

  const canSave = s1Done && s2Done && s3Done && s4Done && s5Done && !saving;

  // ── Technician ranking per date ──────────────────────────────────────────
  const { data: technicians } = useTechnicians();
  const [rankedByDate, setRankedByDate] = useState<
    Record<string, TechnicianRanked[]>
  >({});

  useEffect(() => {
    if (!settings || !location || !technicians) return;
    const lat = (location as any).lat ?? null;
    const lng = (location as any).lng ?? null;
    const estimatedMinutes =
      selectedAcIds.length * (settings.avgMinutesPerAcUnit ?? 60);

    for (const row of proposedDates) {
      if (!row.date || !row.time) continue;
      const key = `${row.date}-${row.time}`;
      getScheduleWithLocation(row.date).then((dbSchedule) => {
        rankTechnicians({
          technicians: (technicians as any[]).filter((t) =>
            t.skills?.includes(jobType ?? "cleaning"),
          ),
          targetLat: lat,
          targetLng: lng,
          date: row.date,
          scheduledTime: row.time,
          estimatedMinutes,
          settings,
          inProjectSchedule: [],
          dbSchedule,
        }).then((ranked) => {
          setRankedByDate((prev) => ({ ...prev, [key]: ranked }));
        });
      });
    }
  }, [proposedDates, settings, location, technicians, selectedAcIds, jobType]);

  // ── Proposed date helpers ─────────────────────────────────────────────────
  function addDate() {
    setProposedDates((prev) => [
      ...prev,
      { id: String(Date.now()), date: "", time: "", notes: "" },
    ]);
  }
  function removeDate(id: string) {
    setProposedDates((prev) => prev.filter((d) => d.id !== id));
  }
  function updateDate(id: string, field: keyof ProposedDate, value: string) {
    setProposedDates((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || !location || !jobType) return;
    setError(null);
    setSaving(true);

    const filledDates = proposedDates.filter((d) => !!d.date);
    if (!filledDates.length) {
      setError("Isi minimal satu tanggal usulan.");
      setSaving(false);
      return;
    }

    try {
      await projectRepository.createBookingRequest({
        customerId: customer.id,
        locationId: location.id,
        type: jobType,
        acUnitIds: selectedAcIds,
        proposedDates: filledDates.map((d) => ({
          date: d.date,
          time: d.time || undefined,
          notes: d.notes || undefined,
        })),
        notes: notes.trim() || undefined,
        createdBy: user?.id ?? "",
      });
      navigate({ to: "/projects/bookings" });
    } catch (err: any) {
      setError(err?.message ?? "Gagal membuat permintaan booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageLayout
      title="Permintaan Booking"
      subtitle="Catat usulan jadwal dari customer sebelum dikonfirmasi"
      action={
        <Link
          to="/projects/bookings"
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          Batalkan
        </Link>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {/* Section 1 — Customer */}
            <Section
              number={1}
              title="Pilih Pelanggan"
              locked={false}
              completed={s1Done}
            >
              <CustomerListSection
                customers={customers ?? []}
                blockMap={customerBlockMap}
                selectedId={customer?.id ?? ""}
                onChange={(c) => {
                  setCustomer(c);
                  setLocation(null);
                  setSelectedAcIds([]);
                }}
              />
            </Section>

            {/* Section 2 — Location */}
            <Section
              number={2}
              title="Pilih Lokasi"
              locked={s2Locked}
              completed={s2Done}
            >
              <LocationListSection
                locations={locations ?? []}
                blockMap={locationBlockMap}
                selectedId={location?.id ?? ""}
                onChange={(l) => {
                  setLocation(l);
                  setSelectedAcIds([]);
                }}
              />
            </Section>

            {/* Section 3 — Job Type */}
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
                    onClick={() => {
                      setJobType(t.value);
                      setSelectedAcIds([]);
                    }}
                    className={`px-4 py-4 rounded-xl border-2 text-left transition-colors ${
                      jobType === t.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{t.icon}</div>
                    <p
                      className={`text-sm font-medium ${jobType === t.value ? "text-blue-700" : "text-slate-700"}`}
                    >
                      {t.label}
                    </p>
                  </button>
                ))}
              </div>
            </Section>

            {/* Section 4 — AC units */}
            <Section
              number={4}
              title="Pilih Unit AC"
              locked={s4Locked}
              completed={s4Done}
            >
              {!acUnits ? (
                <p className="text-sm text-slate-400">Memuat...</p>
              ) : acUnits.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Belum ada unit AC di lokasi ini.
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer pb-2 border-b border-slate-100">
                    <input
                      type="checkbox"
                      checked={
                        selectedAcIds.length === acUnits.length &&
                        acUnits.length > 0
                      }
                      onChange={(e) =>
                        setSelectedAcIds(
                          e.target.checked ? acUnits.map((a) => a.id) : [],
                        )
                      }
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Pilih semua ({acUnits.length} unit)
                    </span>
                  </label>
                  {acUnits.map((ac) => (
                    <label
                      key={ac.id}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAcIds.includes(ac.id)}
                        onChange={(e) => {
                          setSelectedAcIds((prev) =>
                            e.target.checked
                              ? [...prev, ac.id]
                              : prev.filter((id) => id !== ac.id),
                          );
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
                </div>
              )}
            </Section>

            {/* Section 5 — Proposed dates */}
            <Section
              number={5}
              title="Usulan Jadwal"
              locked={s5Locked}
              completed={s5Done}
            >
              <div className="space-y-3">
                {proposedDates.map((row, i) => (
                  <ProposedDateRow
                    key={row.id}
                    row={row}
                    index={i}
                    onUpdate={(field, value) =>
                      updateDate(row.id, field, value)
                    }
                    onRemove={() => removeDate(row.id)}
                    canRemove={proposedDates.length > 1}
                    rankedTechs={rankedByDate[`${row.date}-${row.time}`] ?? []}
                    locationHasCoords={
                      !!(location as any)?.lat && !!(location as any)?.lng
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={addDate}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  + Tambah opsi tanggal lain
                </button>

                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                    Catatan booking (opsional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Hal yang perlu diperhatikan customer, dll."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                  />
                </div>
              </div>
            </Section>
          </div>

          {/* Right — summary */}
          <div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-6 space-y-4">
              <h2 className="font-semibold text-slate-800">
                Ringkasan Booking
              </h2>
              <div className="space-y-2">
                {[
                  { label: "Pelanggan", value: customer?.name ?? "—" },
                  { label: "Lokasi", value: location?.name ?? "—" },
                  { label: "Jenis", value: jobType ?? "—" },
                  {
                    label: "Unit AC",
                    value:
                      selectedAcIds.length > 0
                        ? `${selectedAcIds.length} unit`
                        : "—",
                  },
                  {
                    label: "Tgl usul",
                    value:
                      proposedDates.filter((d) => d.date).length > 0
                        ? `${proposedDates.filter((d) => d.date).length} opsi`
                        : "—",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between text-sm py-1 border-b border-slate-100"
                  >
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-800 truncate max-w-28">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSave}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? "Menyimpan..." : "Simpan Permintaan"}
              </button>

              {!canSave && (
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
