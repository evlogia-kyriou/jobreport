/**
 * EntityPopover — click-triggered popover for entity references
 * in CreateProjectScreen.
 *
 * Used when an AC unit, technician, location, or customer reference
 * is clickable inline. Fetches data on open, renders portal above
 * all scroll containers (Radix UI / shadcn popover handles this).
 *
 * Popover title = the entity (AC code, technician name, etc.)
 * Subtitle = the reference (TKT-2026-001)
 * Body = contextual details
 * Footer = [↗ Buka X] link to detail page
 */

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getCustomerPopoverData,
  getLocationPopoverData,
  getProjectPopoverData,
  getTicketPopoverData,
} from "@/repositories/projectRepository";
import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EntityPopoverType =
  | { kind: "ticket"; entityTitle: string; ticketId: string }
  | { kind: "location"; locationId: string }
  | { kind: "customer"; customerId: string }
  | { kind: "project"; entityTitle: string; projectId: string };

// ── Helper: row in popover body ────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}

// ── Status label helper ────────────────────────────────────────────────────────

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    assigned: "Ditugaskan",
    in_progress: "Sedang berjalan",
    awaiting_final_signature: "Menunggu tanda tangan",
    completed: "Selesai",
    reported: "Laporan terkirim",
    ditangguhkan: "Ditangguhkan",
    menunggu_pembatalan: "Menunggu pembatalan",
  };
  return map[status] ?? status;
}

function locationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    gedung_kantor: "Gedung Kantor",
    lantai_kantor: "Lantai Kantor",
    rumah: "Rumah",
    ruko: "Ruko",
    apartemen: "Apartemen",
    pabrik: "Pabrik",
    kios: "Kios",
    kosan: "Kosan",
    lainnya: "Lainnya",
  };
  return map[type] ?? type;
}

// ── Popover contents ───────────────────────────────────────────────────────────

function TicketPopoverContent({
  entityTitle,
  ticketId,
}: {
  entityTitle: string;
  ticketId: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTicketPopoverData(ticketId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [ticketId]);

  return (
    <div className="w-64">
      {/* Title + subtitle */}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">{entityTitle}</p>
        {data?.ticket_number && (
          <p className="text-xs text-slate-400 mt-0.5">{data.ticket_number}</p>
        )}
      </div>

      {loading ? (
        <div className="px-4 py-3 text-xs text-slate-400">Memuat...</div>
      ) : !data ? (
        <div className="px-4 py-3 text-xs text-red-400">Gagal memuat data</div>
      ) : (
        <>
          <div className="px-4 py-3 space-y-2">
            {data.technician?.name && (
              <Row label="Teknisi" value={data.technician.name} />
            )}
            {data.scheduled_date && (
              <Row
                label="Tanggal"
                value={`${data.scheduled_date}${data.scheduled_time ? ", " + data.scheduled_time.substring(0, 5) : ""}`}
              />
            )}
            {data.location?.name && (
              <Row label="Lokasi" value={data.location.name} />
            )}
            {data.project_ticket?.project_number && (
              <Row label="Proyek" value={data.project_ticket.project_number} />
            )}
            {data.status && (
              <Row label="Status" value={statusLabel(data.status)} />
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100">
            <a
              href={`/tickets/${ticketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              ↗ Buka Tiket
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function LocationPopoverContent({ locationId }: { locationId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocationPopoverData(locationId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [locationId]);

  return (
    <div className="w-64">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">
          {data?.name ?? "Lokasi"}
        </p>
      </div>

      {loading ? (
        <div className="px-4 py-3 text-xs text-slate-400">Memuat...</div>
      ) : !data ? (
        <div className="px-4 py-3 text-xs text-red-400">Gagal memuat data</div>
      ) : (
        <>
          <div className="px-4 py-3 space-y-2">
            {data.customer?.name && (
              <Row label="Pelanggan" value={data.customer.name} />
            )}
            {data.address && <Row label="Alamat" value={data.address} />}
            {data.type && (
              <Row label="Tipe" value={locationTypeLabel(data.type)} />
            )}
            <Row
              label="Total AC"
              value={`${data.total_ac} unit · Tidak tersedia`}
            />
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100">
            <a
              href={`/locations/${locationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              ↗ Buka Lokasi
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function CustomerPopoverContent({ customerId }: { customerId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerPopoverData(customerId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <div className="w-64">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">
          {data?.name ?? "Pelanggan"}
        </p>
      </div>

      {loading ? (
        <div className="px-4 py-3 text-xs text-slate-400">Memuat...</div>
      ) : !data ? (
        <div className="px-4 py-3 text-xs text-red-400">Gagal memuat data</div>
      ) : (
        <>
          <div className="px-4 py-3 space-y-2">
            {data.pic_name && <Row label="PIC" value={data.pic_name} />}
            <Row
              label="Total Lokasi"
              value={`${data.total_locations} lokasi · Tidak tersedia`}
            />
            <Row
              label="Total AC"
              value={`${data.total_ac} unit · Tidak tersedia`}
            />
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100">
            <a
              href={`/customers/${customerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              ↗ Buka Pelanggan
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function ProjectPopoverContent({
  entityTitle,
  projectId,
}: {
  entityTitle: string;
  projectId: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectPopoverData(projectId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  const typeLabel: Record<string, string> = {
    cleaning: "Cleaning",
    service: "Servis",
    installation: "Instalasi",
  };

  return (
    <div className="w-64">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">{entityTitle}</p>
        {data?.project_number && (
          <p className="text-xs text-slate-400 mt-0.5">{data.project_number}</p>
        )}
      </div>

      {loading ? (
        <div className="px-4 py-3 text-xs text-slate-400">Memuat...</div>
      ) : !data ? (
        <div className="px-4 py-3 text-xs text-red-400">Gagal memuat data</div>
      ) : (
        <>
          <div className="px-4 py-3 space-y-2">
            {data.location?.name && (
              <Row label="Lokasi" value={data.location.name} />
            )}
            {data.type && (
              <Row label="Jenis" value={typeLabel[data.type] ?? data.type} />
            )}
            {data.total_ac_units != null && (
              <Row label="Total AC" value={`${data.total_ac_units} unit`} />
            )}
            {data.status && (
              <Row label="Status" value={statusLabel(data.status)} />
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100">
            <a
              href={`/projects/${projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              ↗ Buka Proyek
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────

export function EntityPopover({
  trigger,
  config,
}: {
  trigger: React.ReactNode;
  config: EntityPopoverType;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="p-0 shadow-lg rounded-xl border border-slate-200 overflow-hidden w-auto bg-white"
        align="start"
        sideOffset={6}
      >
        {config.kind === "ticket" && (
          <TicketPopoverContent
            entityTitle={config.entityTitle}
            ticketId={config.ticketId}
          />
        )}
        {config.kind === "location" && (
          <LocationPopoverContent locationId={config.locationId} />
        )}
        {config.kind === "customer" && (
          <CustomerPopoverContent customerId={config.customerId} />
        )}
        {config.kind === "project" && (
          <ProjectPopoverContent
            entityTitle={config.entityTitle}
            projectId={config.projectId}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
