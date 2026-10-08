/**
 * distanceUtils.ts
 * Pure functions for distance and travel time calculations ✅
 * Uses haversine formula + Jakarta average speed assumption ✅
 */

const EARTH_RADIUS_KM = 6371;
const BUFFER_MINUTES = 30;

// ── Haversine distance ────────────────────────────────────────────────────────

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Travel time ───────────────────────────────────────────────────────────────

export function travelMinutes(
  distanceKm: number,
  speedKmh: number = 20,
): number {
  return Math.ceil((distanceKm / speedKmh) * 60);
}

// ── Time helpers ──────────────────────────────────────────────────────────────

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── Availability check ────────────────────────────────────────────────────────

export type AvailabilityStatus =
  | "tersedia" // enough time including buffer ✅
  | "mepet" // can make it but tight (< 30 min buffer) ✅
  | "tidak_bisa"; // travel time exceeds available gap ✅

export function checkAvailability(params: {
  prevJobEndMinutes: number; // when previous job ends ✅
  travelMins: number; // travel time to new location ✅
  newJobStartMinutes: number; // when new job starts ✅
}): AvailabilityStatus {
  const { prevJobEndMinutes, travelMins, newJobStartMinutes } = params;
  const gapMinutes = newJobStartMinutes - prevJobEndMinutes;

  if (travelMins > gapMinutes) return "tidak_bisa";
  if (travelMins + BUFFER_MINUTES > gapMinutes) return "mepet";
  return "tersedia";
}

// ── Label helpers for UI ──────────────────────────────────────────────────────

export function availabilityLabel(status: AvailabilityStatus): string {
  return {
    tersedia: "Tersedia",
    mepet: "Mepet",
    tidak_bisa: "Tidak bisa",
  }[status];
}

export function availabilityColor(status: AvailabilityStatus): string {
  return {
    tersedia: "text-green-600 bg-green-50 border-green-200",
    mepet: "text-amber-600 bg-amber-50 border-amber-200",
    tidak_bisa: "text-red-600 bg-red-50 border-red-200",
  }[status];
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
