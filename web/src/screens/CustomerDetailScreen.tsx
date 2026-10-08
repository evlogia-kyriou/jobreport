import { EntityPopover } from "@/components/shared/EntityPopover";
import { KategoriFungsiIcon } from "@/components/shared/LocationIcons";
import { PageLayout } from "@/components/shared/PageLayout";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCustomerWarningConfig,
  getCustomerWarningLevel,
  useCustomer,
  useCustomerPerformance,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { useLocationsByCustomer } from "@/hooks/useLocations";
import { useProjects } from "@/hooks/useProjectTickets";
import { formatDateTime } from "@/lib/utils";
import {
  addCustomerActivity,
  addCustomerNote,
  getCustomerActivityLog,
  getCustomerNotes,
  getLocationCleaningStatus,
  softDeleteCustomerNote,
  type ActivityEventType,
  type CleaningStatus,
  type CustomerActivity,
  type CustomerNote,
} from "@/repositories/projectRepository";
import { useAuthStore } from "@/stores/authStore";
import { useProjectDraftStore } from "@/stores/projectDraftStore";
import type { JobType } from "@/types/app";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const LOCATION_ALL_LIMIT = 5;
const PROJECT_PREVIEW = 10;

type Tab = "ringkasan" | "lokasi" | "proyek" | "riwayat" | "catatan";

const EVENT_TYPE_LABELS: Record<string, string> = {
  project_created: "Proyek dibuat",
  project_completed: "Proyek selesai",
  report_sent: "Laporan terkirim",
  keluhan_pelanggan: "Keluhan pelanggan",
  pic_tidak_hadir: "PIC tidak ada di lokasi",
  pembatalan: "Pembatalan",
  lainnya: "Catatan",
};

const MANUAL_EVENT_TYPES: { value: ActivityEventType; label: string }[] = [
  { value: "keluhan_pelanggan", label: "Keluhan Pelanggan" },
  { value: "pic_tidak_hadir", label: "PIC Tidak Ada di Lokasi" },
  { value: "pembatalan", label: "Pembatalan" },
  { value: "lainnya", label: "Lainnya" },
];

const SYSTEM_TYPES = new Set([
  "project_created",
  "project_completed",
  "report_sent",
]);

export function CustomerDetailScreen() {
  const { customerId } = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setDraft = useProjectDraftStore((s) => s.setDraft);

  const [activeTab, setActiveTab] = useState<Tab>("ringkasan");

  // Customer deletion
  const deleteCustomer = useDeleteCustomer();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteNote, setDeleteNote] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: customer, isLoading: cLoading } = useCustomer(customerId);
  const { data: locations, isLoading: lLoading } =
    useLocationsByCustomer(customerId);
  const { data: projects } = useProjects();
  const { data: perf } = useCustomerPerformance(customerId);

  // Cleaning status per location
  const [cleaningMap, setCleaningMap] = useState<Map<string, CleaningStatus>>(
    new Map(),
  );
  useEffect(() => {
    if (!customerId) return;
    getLocationCleaningStatus(customerId)
      .then(setCleaningMap)
      .catch(() => {});
  }, [customerId]);

  // Activity log
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [actLoading, setActLoading] = useState(false);
  useEffect(() => {
    if (activeTab !== "riwayat" || !customerId) return;
    setActLoading(true);
    getCustomerActivityLog(customerId)
      .then(setActivities)
      .catch(() => {})
      .finally(() => setActLoading(false));
  }, [activeTab, customerId]);

  // Notes
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  useEffect(() => {
    if (activeTab !== "catatan" || !customerId) return;
    setNotesLoading(true);
    getCustomerNotes(customerId)
      .then(setNotes)
      .catch(() => {})
      .finally(() => setNotesLoading(false));
  }, [activeTab, customerId]);

  // Add activity modal
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [actEventType, setActEventType] =
    useState<ActivityEventType>("keluhan_pelanggan");
  const [actDesc, setActDesc] = useState("");
  const [actRefId, setActRefId] = useState("");
  const [actSaving, setActSaving] = useState(false);

  // Add note modal
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const customerProjects =
    projects?.filter((p) => p.customer_id === customerId) ?? [];
  const hasAnyProject = customerProjects.length > 0;

  const activeProjects = customerProjects.filter(
    (p) => !["completed", "reported", "ditangguhkan"].includes(p.status),
  );
  const sortedProjects = [
    ...customerProjects.filter(
      (p) => !["completed", "reported", "ditangguhkan"].includes(p.status),
    ),
    ...customerProjects
      .filter((p) =>
        ["completed", "reported", "ditangguhkan"].includes(p.status),
      )
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
  ];

  async function handleDeleteCustomer() {
    if (!deleteReason || !customer) return;
    setDeleteError(null);
    try {
      await deleteCustomer.mutateAsync({
        customerId,
        customerName: customer.name,
        reason: deleteReason,
        notes: deleteNote,
      });
      navigate({ to: "/customers" });
    } catch (err: any) {
      setDeleteError(err?.message ?? "Gagal menghapus pelanggan.");
    }
  }
  const warningLevel = perf ? getCustomerWarningLevel(perf) : "none";
  const warningConfig = perf
    ? getCustomerWarningConfig(warningLevel, perf)
    : null;
  const isLoading = cLoading || lLoading;

  async function handleAddActivity() {
    if (!customerId || !user || !actDesc.trim()) return;
    setActSaving(true);
    try {
      await addCustomerActivity({
        customer_id: customerId,
        event_type: actEventType,
        description: actDesc.trim(),
        reference_id: actRefId || undefined,
        reference_type: actRefId ? "project" : undefined,
        author_user_id: user.id,
      });
      setActDesc("");
      setActRefId("");
      setShowAddActivity(false);
      getCustomerActivityLog(customerId).then(setActivities);
    } catch {
      /* ignore */
    } finally {
      setActSaving(false);
    }
  }

  async function handleAddNote() {
    if (!customerId || !user || !noteContent.trim()) return;
    setNoteSaving(true);
    try {
      await addCustomerNote(customerId, noteContent.trim(), user.id);
      setNoteContent("");
      setShowAddNote(false);
      getCustomerNotes(customerId).then(setNotes);
    } catch {
      /* ignore */
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!user) return;
    try {
      await softDeleteCustomerNote(noteId, user.id);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      /* ignore */
    }
  }

  function handleBuatProyek(locationId?: string, jobType?: JobType) {
    if (!customerId) return;
    setDraft(customerId, locationId ?? "", [], jobType ?? null);
    navigate({ to: "/projects/create" });
  }

  if (isLoading)
    return (
      <PageLayout title="Detail Pelanggan">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </PageLayout>
    );

  if (!customer)
    return (
      <PageLayout title="Detail Pelanggan">
        <p className="text-red-500 text-sm">Pelanggan tidak ditemukan.</p>
      </PageLayout>
    );

  const primaryPhone =
    customer.phones?.find((p) => p.is_primary) ?? customer.phones?.[0];
  const showAllLocationsLink = (locations?.length ?? 0) > LOCATION_ALL_LIMIT;

  // ── Location row component ────────────────────────────────────────────────

  function LocationRow({ loc }: { loc: any }) {
    const cs = cleaningMap.get(loc.id);
    const needsCleaning = cs?.needs_cleaning ?? true;
    const daysLeft = cs?.min_days_remaining;

    // Active cleaning project blocks Bersihkan (highest priority)
    const activeCleaningProject = customerProjects.find(
      (p) =>
        p.location_id === loc.id &&
        p.type === "cleaning" &&
        !["completed", "reported"].includes(p.status),
    );
    const blockedByProject = !!activeCleaningProject;

    // Determine Bersihkan button state (priority: active project > 90-day > available)
    const bersihkanState: "active" | "blocked_project" | "blocked_clean" =
      blockedByProject
        ? "blocked_project"
        : !needsCleaning
          ? "blocked_clean"
          : "active";

    return (
      <div className="px-5 py-4 border-b border-slate-100 last:border-0">
        <div className="flex items-start gap-4">
          <Link
            to="/customers/$customerId/locations/$locationId"
            params={{ customerId, locationId: loc.id }}
            className="flex-1 min-w-0"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-slate-800 hover:text-blue-600 transition-colors">
                {loc.name}
              </p>
              {(loc as any).kategori_fungsi?.label && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 shrink-0">
                  <KategoriFungsiIcon
                    label={(loc as any).kategori_fungsi.label}
                    size={11}
                  />
                  {(loc as any).kategori_fungsi.label}
                </span>
              )}
              {customerProjects.some(
                (p) =>
                  p.location_id === loc.id &&
                  !["completed", "reported", "ditangguhkan"].includes(p.status),
              ) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 shrink-0">
                  ⚡ Ada proyek aktif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {(loc as any).location_number && (
                <span className="text-slate-500 font-mono mr-1">
                  {(loc as any).location_number} ·
                </span>
              )}
              {(loc as any).tipe_bangunan?.label ?? loc.type?.replace("_", " ")}{" "}
              · {loc.address}
              {" · "}
              {(loc as any).room_count ?? 0} ruangan
              {" · "}
              {(loc as any).ac_unit_count ?? 0} unit AC
            </p>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {bersihkanState === "active" && (
              <button
                onClick={() => handleBuatProyek(loc.id, "cleaning")}
                className="text-xs px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium"
              >
                ✓ Bersihkan
              </button>
            )}
            {bersihkanState === "blocked_project" && (
              <button
                disabled
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
              >
                Proyek aktif
              </button>
            )}
            {bersihkanState === "blocked_clean" && (
              <button
                disabled
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
              >
                ⏳{" "}
                {daysLeft != null ? `${daysLeft} hari lagi` : "Tidak tersedia"}
              </button>
            )}
            <button
              onClick={() => handleBuatProyek(loc.id, "service")}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Servis
            </button>
            <button
              onClick={() => handleBuatProyek(loc.id, "installation")}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Pasang
            </button>
          </div>
        </div>

        {/* Reason text below buttons */}
        {bersihkanState === "blocked_project" && activeCleaningProject && (
          <p className="text-xs text-red-500 mt-2">
            Tidak tersedia · Sedang dalam proyek aktif :{" "}
            <EntityPopover
              trigger={
                <button
                  type="button"
                  className="underline decoration-dotted font-medium hover:text-red-600"
                >
                  {activeCleaningProject.project_number} ↗
                </button>
              }
              config={{
                kind: "project",
                entityTitle: loc.name,
                projectId: activeCleaningProject.id,
              }}
            />
          </p>
        )}
        {bersihkanState === "blocked_clean" && daysLeft != null && (
          <p className="text-xs text-amber-600 mt-2">
            Tidak tersedia · Sudah dibersihkan · {daysLeft} hari lagi sampai
            jadwal berikutnya
          </p>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title={
        <div className="flex items-center gap-2">
          <span>{customer.name}</span>
          <StatusBadge status={customer.stage} />
          {warningConfig && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${warningConfig.className}`}
            >
              {warningConfig.icon} {warningConfig.label}
            </span>
          )}
        </div>
      }
      subtitle={customer.type === "company" ? "Perusahaan" : "Perorangan"}
      action={
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end gap-0.5">
            {hasAnyProject ? (
              <button
                disabled
                className="px-4 py-2 border border-slate-200 text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                Hapus Pelanggan
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteReason("");
                  setDeleteNote("");
                  setDeleteError(null);
                }}
                className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"
              >
                Hapus Pelanggan
              </button>
            )}
            {hasAnyProject && (
              <span className="text-xs text-slate-400">
                Ada {customerProjects.length} proyek — tidak bisa dihapus
              </span>
            )}
          </div>
          <Link
            to="/customers/$customerId/edit"
            params={{ customerId }}
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            Edit Pelanggan
          </Link>
          <Link
            to="/customers"
            className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            ← Kembali
          </Link>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 border-b border-slate-200">
        {(["ringkasan", "lokasi", "proyek", "riwayat", "catatan"] as Tab[]).map(
          (t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                activeTab === t
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ),
        )}
      </div>

      {/* ── RINGKASAN ─────────────────────────────────────────────────── */}
      {activeTab === "ringkasan" && (
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              label="Total Proyek"
              value={customerProjects.length.toString()}
              icon="📋"
            />
            <StatCard
              label="Selesai"
              value={customerProjects
                .filter(
                  (p) => p.status === "completed" || p.status === "reported",
                )
                .length.toString()}
              icon="✅"
            />
            <StatCard
              label="Lokasi"
              value={(locations?.length ?? 0).toString()}
              icon="📍"
            />
            <StatCard
              label="Unit AC"
              value={(
                locations?.reduce(
                  (s, l) => s + ((l as any).ac_unit_count ?? 0),
                  0,
                ) ?? 0
              ).toString()}
              icon="❄️"
            />
          </div>

          {/* Location section */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">Lokasi</h2>
              <div className="flex items-center gap-3">
                <Link
                  to="/customers/$customerId/locations/create"
                  params={{ customerId }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  + Lokasi
                </Link>
                {showAllLocationsLink && (
                  <button
                    onClick={() => setActiveTab("lokasi")}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Lihat semua →
                  </button>
                )}
              </div>
            </div>
            {(locations ?? []).slice(0, LOCATION_ALL_LIMIT).map((loc) => (
              <LocationRow key={loc.id} loc={loc} />
            ))}
            {(locations?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada lokasi
              </div>
            )}
          </div>

          {/* Active projects section */}
          {activeProjects.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200">
              <div className="px-5 py-3.5 border-b border-amber-100 flex items-center justify-between bg-amber-50 rounded-t-xl">
                <h2 className="font-semibold text-amber-800 text-sm">
                  ⚡ Proyek Aktif ({activeProjects.length})
                </h2>
                <button
                  onClick={() => handleBuatProyek()}
                  className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-100 font-medium"
                >
                  + Proyek
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {activeProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <EntityPopover
                      trigger={
                        <button
                          type="button"
                          className="flex flex-col items-start hover:opacity-75 transition-opacity text-left"
                        >
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-blue-600 underline decoration-dotted">
                              {project.project_number}
                            </p>
                            <JobTypeBadge type={project.type} />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {project.location?.name ?? "—"} ·{" "}
                            {project.total_ac_units} unit AC
                          </p>
                        </button>
                      }
                      config={{
                        kind: "project",
                        entityTitle: customer.name,
                        projectId: project.id,
                      }}
                    />
                    <StatusBadge status={project.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project history section */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">
                Riwayat proyek
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleBuatProyek()}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  + Proyek
                </button>
                <button
                  onClick={() => setActiveTab("proyek")}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Lihat semua →
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {customerProjects.slice(0, PROJECT_PREVIEW).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <EntityPopover
                    trigger={
                      <button
                        type="button"
                        className="flex flex-col items-start hover:opacity-75 transition-opacity text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-blue-600 underline decoration-dotted">
                            {project.project_number}
                          </p>
                          <JobTypeBadge type={project.type} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {project.location?.name ?? "—"} ·{" "}
                          {project.total_ac_units} unit AC
                        </p>
                      </button>
                    }
                    config={{
                      kind: "project",
                      entityTitle: customer.name,
                      projectId: project.id,
                    }}
                  />
                  <StatusBadge status={project.status} />
                </div>
              ))}
              {customerProjects.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Belum ada proyek
                </div>
              )}
            </div>
          </div>

          {/* Contact info (compact) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-3">
              Informasi Kontak
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Nama" value={customer.name} />
              <InfoRow label="PIC" value={customer.pic_name} />
              <InfoRow label="Telepon" value={primaryPhone?.phone ?? "—"} />
              <InfoRow
                label="Bergabung"
                value={formatDateTime(customer.acquired_at)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── LOKASI TAB ────────────────────────────────────────────────── */}
      {activeTab === "lokasi" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">
              Semua lokasi ({locations?.length ?? 0})
            </h2>
            <Link
              to="/customers/$customerId/locations/create"
              params={{ customerId }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              + Lokasi
            </Link>
          </div>
          {(locations ?? []).map((loc) => (
            <LocationRow key={loc.id} loc={loc} />
          ))}
          {(locations?.length ?? 0) === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              Belum ada lokasi
            </div>
          )}
        </div>
      )}

      {/* ── PROYEK TAB ────────────────────────────────────────────────── */}
      {activeTab === "proyek" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">
              Semua proyek ({customerProjects.length})
            </h2>
            <button
              onClick={() => handleBuatProyek()}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              + Proyek
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {sortedProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <EntityPopover
                  trigger={
                    <button
                      type="button"
                      className="flex flex-col items-start hover:opacity-75 transition-opacity text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-blue-600 underline decoration-dotted">
                          {project.project_number}
                        </p>
                        <JobTypeBadge type={project.type} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {project.location?.name ?? "—"} ·{" "}
                        {project.total_ac_units} unit AC
                        {project.updated_at &&
                          ` · ${project.updated_at.substring(0, 10)}`}
                      </p>
                    </button>
                  }
                  config={{
                    kind: "project",
                    entityTitle: customer.name,
                    projectId: project.id,
                  }}
                />
                <StatusBadge status={project.status} />
              </div>
            ))}
            {customerProjects.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada proyek
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RIWAYAT TAB ───────────────────────────────────────────────── */}
      {activeTab === "riwayat" && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">
              Riwayat aktivitas
            </h2>
            <button
              onClick={() => setShowAddActivity(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
            >
              + Tambah aktivitas
            </button>
          </div>

          {/* Add activity form */}
          {showAddActivity && (
            <div className="px-5 py-4 border-b border-blue-100 bg-blue-50 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Jenis aktivitas
                </label>
                <select
                  value={actEventType}
                  onChange={(e) =>
                    setActEventType(e.target.value as ActivityEventType)
                  }
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MANUAL_EVENT_TYPES.map((et) => (
                    <option key={et.value} value={et.value}>
                      {et.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Keterangan
                </label>
                <textarea
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  rows={3}
                  placeholder="Tulis keterangan aktivitas..."
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Tautkan ke proyek (opsional)
                </label>
                <select
                  value={actRefId}
                  onChange={(e) => setActRefId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Tidak ditautkan —</option>
                  {customerProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddActivity}
                  disabled={actSaving || !actDesc.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actSaving ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={() => setShowAddActivity(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Activity list */}
          {actLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Memuat...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Belum ada aktivitas tercatat
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              {activities.map((act) => {
                const isSystem = SYSTEM_TYPES.has(act.event_type);
                return (
                  <div key={act.id} className="flex gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isSystem ? "bg-blue-400" : "bg-amber-400"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold ${isSystem ? "text-blue-600" : "text-amber-600"}`}
                      >
                        {EVENT_TYPE_LABELS[act.event_type] ?? act.event_type}
                      </p>
                      <p className="text-sm text-slate-800 mt-0.5">
                        {act.description}
                      </p>
                      {act.reference_id && (
                        <EntityPopover
                          trigger={
                            <button
                              type="button"
                              className="text-xs text-blue-600 underline decoration-dotted mt-1"
                            >
                              {customerProjects.find(
                                (p) => p.id === act.reference_id,
                              )?.project_number ?? act.reference_id}{" "}
                              ↗
                            </button>
                          }
                          config={{
                            kind: "project",
                            entityTitle: customer.name,
                            projectId: act.reference_id,
                          }}
                        />
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {isSystem ? "Sistem" : (act.author?.name ?? "Admin")}
                        {" · "}
                        {new Date(act.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CATATAN TAB ───────────────────────────────────────────────── */}
      {activeTab === "catatan" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddNote(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
            >
              + Tambah catatan
            </button>
          </div>

          {/* Add note form */}
          {showAddNote && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 space-y-3">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                placeholder="Tulis catatan tentang pelanggan ini..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddNote}
                  disabled={noteSaving || !noteContent.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {noteSaving ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={() => setShowAddNote(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {notesLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Memuat...
            </div>
          ) : notes.length === 0 && !showAddNote ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              Belum ada catatan. Tambahkan catatan tentang preferensi, akses
              lokasi, atau informasi penting lainnya.
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl border border-slate-200 px-5 py-4"
              >
                <p className="text-sm text-slate-800 leading-relaxed">
                  {note.content}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    {note.author?.name ?? "Admin"}
                    {" · "}
                    {new Date(note.created_at).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Delete Customer Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              Hapus Pelanggan
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              <span className="font-medium text-slate-700">
                {customer.name}
              </span>{" "}
              dan semua lokasi, unit AC, serta catatan terkait akan dihapus
              permanen.
            </p>

            <div className="space-y-4">
              {/* Reason dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Alasan penghapusan <span className="text-red-500">*</span>
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">— Pilih alasan —</option>
                  <option value="duplikasi_entri">Duplikasi entri</option>
                  <option value="data_uji_coba">Data uji coba / testing</option>
                  <option value="salah_input">Salah input pelanggan</option>
                  <option value="permintaan_pelanggan">
                    Permintaan pelanggan
                  </option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              {/* Optional note — always shown, required for "lainnya" */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catatan{" "}
                  {deleteReason === "lainnya" && (
                    <span className="text-red-500">*</span>
                  )}
                  {deleteReason !== "lainnya" && (
                    <span className="text-slate-400 font-normal">
                      (opsional)
                    </span>
                  )}
                </label>
                <textarea
                  value={deleteNote}
                  onChange={(e) => setDeleteNote(e.target.value)}
                  rows={3}
                  placeholder="Detail tambahan tentang penghapusan ini..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
              </div>

              {deleteError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {deleteError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={
                  deleteCustomer.isPending ||
                  !deleteReason ||
                  (deleteReason === "lainnya" && !deleteNote.trim())
                }
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {deleteCustomer.isPending ? "Menghapus..." : "Hapus Pelanggan"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// ── Sub components ─────────────────────────────────────────────────────────────

function JobTypeBadge({ type }: { type?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    cleaning: {
      label: "Cleaning",
      className: "bg-blue-50 text-blue-600 border-blue-200",
    },
    service: {
      label: "Servis",
      className: "bg-amber-50 text-amber-600 border-amber-200",
    },
    installation: {
      label: "Instalasi",
      className: "bg-purple-50 text-purple-600 border-purple-200",
    },
  };
  const cfg = map[type ?? ""] ?? {
    label: type ?? "—",
    className: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
