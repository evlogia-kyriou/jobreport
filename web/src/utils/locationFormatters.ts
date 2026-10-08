/**
 * locationFormatters.ts
 * Shared display helpers for building unit labels.
 * DB stores clean values ("L1", "Bar", "A").
 * These helpers add the Indonesian prefix at render time.
 */

export function fmtFloor(floor?: string | null): string {
  if (!floor || floor.trim() === "") return "—";
  const trimmed = floor.trim();
  // Avoid double prefix if admin accidentally typed "Lantai L1"
  if (trimmed.toLowerCase().startsWith("lantai")) return trimmed;
  return `Lantai ${trimmed}`;
}

export function fmtRoom(room?: string | null): string {
  if (!room || room.trim() === "") return "—";
  const trimmed = room.trim();
  if (trimmed.toLowerCase().startsWith("ruang")) return trimmed;
  return `Ruang ${trimmed}`;
}

export function fmtZona(zona?: string | null): string {
  if (!zona || zona.trim() === "") return "—";
  const trimmed = zona.trim();
  if (trimmed.toLowerCase().startsWith("zona")) return trimmed;
  return `Zona ${trimmed}`;
}

/** Full display label for a building unit: "Lantai L1 · Ruang Bar · Zona A" */
export function fmtBuildingUnit(
  floor?: string | null,
  room?: string | null,
  zona?: string | null,
): string {
  return [
    floor ? fmtFloor(floor) : null,
    room ? fmtRoom(room) : null,
    zona ? fmtZona(zona) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
