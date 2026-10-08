import type { AppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/lib/supabase";
import type { Technician } from "@/types/app";
import {
    checkAvailability,
    haversineKm,
    toMinutes,
    travelMinutes,
    type AvailabilityStatus,
} from "@/utils/distanceUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScheduleEntry {
  technician_id: string;
  scheduled_time: string;
  estimated_minutes: number;
  location_lat?: number | null;
  location_lng?: number | null;
  ticketIndex?: number; // for in-project conflict display ✅
}

export interface TechnicianRanked {
  id: string;
  name: string;
  technician_id: string;
  skills: string[];
  distanceKm: number | null;
  travelMins: number | null;
  startSource: string; // label for UI transparency ✅
  availability: AvailabilityStatus | "konflik" | "no_data";
  conflictReason: string | null;
  canSelect: boolean;
}

// ── Get technician start point ────────────────────────────────────────────────

export async function getTechnicianStartPoint(
  technicianId: string,
  date: string,
  beforeTime: string, // only look at jobs BEFORE this time ✅
  settings: AppSettings,
): Promise<{ lat: number; lng: number; source: string }> {
  const HQ = {
    lat: settings.hqLat,
    lng: settings.hqLng,
    source: "HQ (default)",
  };

  const beforeMinutes = toMinutes(beforeTime);

  // 1. Check for earlier ticket that day with location coords ✅
  const { data: earlierTickets } = await supabase
    .from("tickets")
    .select(
      `
      scheduled_time, estimated_minutes,
      location:locations!location_id(lat, lng)
    `,
    )
    .eq("technician_id", technicianId)
    .eq("scheduled_date", date)
    .neq("status", "cancelled");

  // Find the latest job that ends BEFORE the new job starts ✅
  let latestEndMinutes = -1;
  let latestLocation: { lat: number; lng: number } | null = null;

  for (const t of earlierTickets ?? []) {
    const loc = (t as any).location;
    if (!loc?.lat || !loc?.lng) continue;
    const startMin = toMinutes(t.scheduled_time);
    const endMin = startMin + (t.estimated_minutes ?? 0);
    if (endMin <= beforeMinutes && endMin > latestEndMinutes) {
      latestEndMinutes = endMin;
      latestLocation = { lat: loc.lat, lng: loc.lng };
    }
  }

  if (latestLocation) {
    return { ...latestLocation, source: "Tiket sebelumnya" };
  }

  // 2. Check TechnicianShift for that date ✅
  const { data: shift } = await supabase
    .from("technician_shifts")
    .select("start_lat, start_lng")
    .eq("technician_id", technicianId)
    .eq("shift_date", date)
    .not("start_lat", "is", null)
    .limit(1)
    .single()
    .catch(() => ({ data: null }));

  if (shift?.start_lat && shift?.start_lng) {
    return {
      lat: shift.start_lat,
      lng: shift.start_lng,
      source: "Titik awal shift",
    };
  }

  // 3. Fall back to HQ ✅
  return HQ;
}

// ── Get extended schedule with location coords ────────────────────────────────

export async function getScheduleWithLocation(
  date: string,
): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      `
      technician_id, scheduled_time, estimated_minutes,
      location:locations!location_id(lat, lng)
    `,
    )
    .eq("scheduled_date", date)
    .neq("status", "cancelled");

  if (error) throw error;

  return (data ?? []).map((t: any) => ({
    technician_id: t.technician_id,
    scheduled_time: t.scheduled_time,
    estimated_minutes: t.estimated_minutes ?? 0,
    location_lat: t.location?.lat ?? null,
    location_lng: t.location?.lng ?? null,
  }));
}

// ── Per-technician avg minutes (Phase D) ──────────────────────────────────────

export async function getTechnicianAvgMinutes(
  technicianId: string,
  globalAvg: number,
): Promise<number> {
  try {
    const { data } = await supabase
      .from("v_technician_performance")
      .select("avg_min_per_ac_recent")
      .eq("technician_id", technicianId)
      .single();
    const personal = data?.avg_min_per_ac_recent;
    return personal && personal > 0 ? personal : globalAvg;
  } catch {
    return globalAvg; // fallback ✅
  }
}

// ── Rank technicians by distance ──────────────────────────────────────────────

const BUFFER_MINUTES = 30;

export async function rankTechnicians(params: {
  technicians: Technician[];
  targetLat: number | null;
  targetLng: number | null;
  date: string;
  scheduledTime: string;
  estimatedMinutes: number;
  acUnitCount?: number; // ← NEW ✅ for per-tech duration estimate
  settings: AppSettings;
  inProjectSchedule: ScheduleEntry[];
  dbSchedule: ScheduleEntry[];
}): Promise<TechnicianRanked[]> {
  const {
    technicians,
    targetLat,
    targetLng,
    date,
    scheduledTime,
    estimatedMinutes,
    acUnitCount,
    settings,
    inProjectSchedule,
    dbSchedule,
  } = params;

  const newStart = toMinutes(scheduledTime);
  const newEnd = newStart + estimatedMinutes;

  function overlaps(s1: number, e1: number, s2: number, e2: number): boolean {
    return s1 < e2 + BUFFER_MINUTES && e1 > s2 - BUFFER_MINUTES;
  }

  function fmtEnd(time: string, dur: number): string {
    const total = toMinutes(time) + dur;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  // Check hard conflict (schedule overlap) ✅
  function getConflict(techId: string): string | null {
    for (const s of inProjectSchedule) {
      if (s.technician_id !== techId) continue;
      const es = toMinutes(s.scheduled_time);
      const ee = es + s.estimated_minutes;
      if (overlaps(newStart, newEnd, es, ee)) {
        return `Konflik dengan Tiket #${(s.ticketIndex ?? 0) + 1} proyek ini (${s.scheduled_time.slice(0, 5)} – ${fmtEnd(s.scheduled_time, s.estimated_minutes)})`;
      }
    }
    for (const s of dbSchedule) {
      if (s.technician_id !== techId) continue;
      const es = toMinutes(s.scheduled_time);
      const ee = es + s.estimated_minutes;
      if (overlaps(newStart, newEnd, es, ee)) {
        return `Sudah ditugaskan di proyek lain (${s.scheduled_time.slice(0, 5)} – ${fmtEnd(s.scheduled_time, s.estimated_minutes)})`;
      }
    }
    return null;
  }

  // Process each technician ✅
  const results: TechnicianRanked[] = await Promise.all(
    technicians.map(async (tech) => {
      const conflictReason = getConflict(tech.id);

      // Per-technician duration estimate (Phase D) ✅
      // Uses personal avg if available, global as fallback ✅
      const personalAvg = await getTechnicianAvgMinutes(
        tech.id,
        settings.avgMinutesPerAcUnit,
      );
      const techEstMins = acUnitCount
        ? Math.ceil(acUnitCount * personalAvg)
        : estimatedMinutes;

      // No location coords → can still show but no distance ✅
      if (!targetLat || !targetLng) {
        return {
          id: tech.id,
          name: tech.name,
          technician_id: tech.technician_id,
          skills: tech.skills,
          distanceKm: null,
          travelMins: null,
          startSource: "—",
          availability: conflictReason ? "konflik" : "no_data",
          conflictReason,
          canSelect: !conflictReason,
        } as TechnicianRanked;
      }

      // Get start point ✅
      const startPoint = await getTechnicianStartPoint(
        tech.id,
        date,
        scheduledTime,
        settings,
      );
      const distKm = haversineKm(
        startPoint.lat,
        startPoint.lng,
        targetLat,
        targetLng,
      );
      const travelMn = travelMinutes(distKm, settings.avgTravelSpeedKmh);

      // Find when technician's previous job ends ✅
      const allSchedule = [...inProjectSchedule, ...dbSchedule];
      const prevJob = allSchedule
        .filter((s) => s.technician_id === tech.id)
        .map((s) => ({
          end: toMinutes(s.scheduled_time) + s.estimated_minutes,
        }))
        .filter((s) => s.end <= newStart)
        .sort((a, b) => b.end - a.end)[0];

      const prevEndMinutes = prevJob?.end ?? 0;

      let availability: TechnicianRanked["availability"] = checkAvailability({
        prevJobEndMinutes: prevEndMinutes,
        travelMins: travelMn,
        newJobStartMinutes: newStart,
      });

      if (conflictReason) availability = "konflik";

      return {
        id: tech.id,
        name: tech.name,
        technician_id: tech.technician_id,
        skills: tech.skills,
        distanceKm: distKm,
        travelMins: travelMn,
        startSource: startPoint.source,
        availability,
        conflictReason,
        canSelect: availability === "tersedia" || availability === "mepet",
      } as TechnicianRanked;
    }),
  );

  // Sort: tersedia → mepet → tidak_bisa → konflik → no_data ✅
  const order: Record<string, number> = {
    tersedia: 0,
    mepet: 1,
    tidak_bisa: 2,
    konflik: 3,
    no_data: 4,
  };

  return results.sort((a, b) => {
    const oa = order[a.availability] ?? 5;
    const ob = order[b.availability] ?? 5;
    if (oa !== ob) return oa - ob;
    // Within same group: sort by travel time ✅
    if (a.travelMins !== null && b.travelMins !== null) {
      return a.travelMins - b.travelMins;
    }
    return 0;
  });
}
