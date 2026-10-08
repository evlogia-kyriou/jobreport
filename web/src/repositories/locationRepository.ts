import { supabase } from "@/lib/supabase";
import type {
  BuildingRegistry,
  BuildingUnit,
  Location,
  Region,
} from "@/types/app";

export const locationRepository = {
  async getLocationsByCustomer(customerId: string): Promise<Location[]> {
    const { data, error } = await supabase
      .from("locations")
      .select(
        `
                *,
                ac_unit_count:ac_units(count),
                room_count:building_units(count),
                tipe_bangunan:ref_tipe_bangunan(id, label),
                kategori_fungsi:ref_kategori_fungsi(id, label)
            `,
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Flatten counts from Supabase aggregate format
    return (data ?? []).map((loc) => ({
      ...loc,
      ac_unit_count:
        (loc.ac_unit_count as unknown as { count: number }[])?.[0]?.count ?? 0,
      room_count:
        (loc.room_count as unknown as { count: number }[])?.[0]?.count ?? 0,
    })) as unknown as Location[];
  },

  async getBuildingUnits(locationId: string): Promise<BuildingUnit[]> {
    const { data, error } = await supabase
      .from("building_units")
      .select("*")
      .eq("location_id", locationId)
      .order("floor")
      .order("room")
      .order("zone_label");

    if (error) throw error;
    return (data ?? []) as BuildingUnit[];
  },

  async searchBuildings(query: string): Promise<BuildingRegistry[]> {
    const { data, error } = await supabase
      .from("buildings_registry")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(10);

    if (error) throw error;
    return (data ?? []) as BuildingRegistry[];
  },

  async getRegions(filters: {
    province?: string;
    kabupaten?: string;
    kecamatan?: string;
  }): Promise<Region[]> {
    let query = supabase.from("regions").select("*");
    if (filters.province) query = query.eq("province", filters.province);
    if (filters.kabupaten) query = query.eq("kabupaten", filters.kabupaten);
    if (filters.kecamatan) query = query.eq("kecamatan", filters.kecamatan);
    const { data, error } = await query.order("kelurahan");
    if (error) throw error;
    return (data ?? []) as Region[];
  },

  async createLocation(payload: Partial<Location>): Promise<Location> {
    const { data, error } = await supabase
      .from("locations")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Location;
  },
  async softDeleteLocation(locationId: string): Promise<void> {
    const { error } = await supabase
      .from("locations")
      .update({ is_active: false })
      .eq("id", locationId);
    if (error) throw error;
  },

  // ── Delete location ────────────────────────────────────────────────────────
  // TODO PRODUCTION: replace with softDeleteLocation(locationId)
  // Deletes in correct FK order: logs → ac_units → building_units → buildings → location
  async hardDeleteLocation(locationId: string): Promise<void> {
    // 1. Get all ac_unit IDs for this location
    const { data: acUnits } = await supabase
      .from("ac_units")
      .select("id")
      .eq("location_id", locationId);
    const acIds = (acUnits ?? []).map((a) => a.id);

    if (acIds.length > 0) {
      // 2. Delete service history logs
      await supabase
        .from("ac_unit_action_log")
        .delete()
        .in("ac_unit_id", acIds);

      // 3. Delete ticket assignments
      await supabase.from("ticket_ac_units").delete().in("ac_unit_id", acIds);

      // 4. Delete AC units
      await supabase.from("ac_units").delete().eq("location_id", locationId);
    }

    // 5. Delete building units (zones)
    await supabase
      .from("building_units")
      .delete()
      .eq("location_id", locationId);

    // 6. Delete buildings
    await supabase.from("buildings").delete().eq("location_id", locationId);

    // 7. Delete location itself
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId);
    if (error) throw error;
  },

  // Returns count of projects for this location (any status)
  async getLocationProjectCount(locationId: string): Promise<number> {
    const { count, error } = await supabase
      .from("project_tickets")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId);
    if (error) throw error;
    return count ?? 0;
  },

  async reactivateLocation(locationId: string): Promise<void> {
    const { error } = await supabase
      .from("locations")
      .update({ is_active: true })
      .eq("id", locationId);
    if (error) throw error;
  },

  async updateLocation(
    locationId: string,
    payload: Partial<Location>,
  ): Promise<void> {
    const { error } = await supabase
      .from("locations")
      .update(payload)
      .eq("id", locationId);
    if (error) throw error;
  },

  async deleteBuildingUnit(buildingUnitId: string): Promise<void> {
    const { error } = await supabase
      .from("building_units")
      .delete()
      .eq("id", buildingUnitId);
    if (error) throw error;
  },

  async renameBuildingUnit(
    buildingUnitId: string,
    room: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("building_units")
      .update({ room })
      .eq("id", buildingUnitId);
    if (error) throw error;
  },

  async renameFloor(
    locationId: string,
    oldFloor: string,
    newFloor: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("building_units")
      .update({ floor: newFloor })
      .eq("location_id", locationId)
      .eq("floor", oldFloor);
    if (error) throw error;
  },
};

// ── Building (new) ─────────────────────────────────────────────────────────────

export const buildingRepository = {
  async getByLocation(locationId: string) {
    const { data, error } = await supabase
      .from("buildings")
      .select(
        `
        *,
        building_units(
          id, floor, room, zone_label, notes,
          ac_unit:ac_units(
            id, ac_code, type, capacity_pk, is_active,
            brand:ac_brands!brand_id(id, name)
          )
        )
      `,
      )
      .eq("location_id", locationId)
      .order("name");
    if (error) throw error;

    // PostgREST returns ac_unit as an array (one-to-many from building_unit's side).
    // Flatten to a single object since 1 zone = max 1 AC.
    return (data ?? []).map((building: any) => ({
      ...building,
      building_units: (building.building_units ?? []).map((bu: any) => ({
        ...bu,
        ac_unit: Array.isArray(bu.ac_unit)
          ? (bu.ac_unit[0] ?? null)
          : (bu.ac_unit ?? null),
      })),
    })) as any[];
  },

  async create(locationId: string, name: string, notes?: string) {
    const { data, error } = await supabase
      .from("buildings")
      .insert({ location_id: locationId, name, notes })
      .select()
      .single();
    if (error) throw error;
    return data as any;
  },

  async update(buildingId: string, name: string, notes?: string) {
    const { error } = await supabase
      .from("buildings")
      .update({ name, notes, updated_at: new Date().toISOString() })
      .eq("id", buildingId);
    if (error) throw error;
  },

  async delete(buildingId: string) {
    const { error } = await supabase
      .from("buildings")
      .delete()
      .eq("id", buildingId);
    if (error) throw error;
  },

  // Create a zone (building_unit) only — AC added separately via addAcToZone
  async addZone(payload: {
    location_id: string;
    building_id: string;
    floor: string;
    room: string;
    zone_label: string;
    notes?: string;
  }) {
    const { data: zone, error } = await supabase
      .from("building_units")
      .insert({
        location_id: payload.location_id,
        building_id: payload.building_id,
        floor: payload.floor,
        room: payload.room,
        zone_label: payload.zone_label,
        notes: payload.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return zone;
  },

  // Add an AC unit to an existing zone (1:1 — zone must not already have an AC)
  async addAcToZone(payload: {
    location_id: string;
    building_unit_id: string;
    ac_type: string;
    ac_capacity: string;
    ac_brand_id?: string;
  }) {
    const { error } = await supabase.from("ac_units").insert({
      location_id: payload.location_id,
      building_unit_id: payload.building_unit_id,
      type: payload.ac_type,
      capacity_pk: payload.ac_capacity,
      brand_id: payload.ac_brand_id ?? null,
      unit_label: "1",
      is_active: true,
    });
    if (error) throw error;
  },

  // Get next available zone label for a room
  async getNextZoneLabel(
    buildingId: string,
    floor: string,
    room: string,
  ): Promise<string> {
    const { data } = await supabase
      .from("building_units")
      .select("zone_label")
      .eq("building_id", buildingId)
      .eq("floor", floor)
      .eq("room", room)
      .order("zone_label");

    const used = new Set((data ?? []).map((z: any) => z.zone_label));
    // Find next available letter A-Z
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i); // A=65
      if (!used.has(letter)) return letter;
    }
    return `Z${(data?.length ?? 0) + 1}`; // fallback
  },

  async deleteZone(buildingUnitId: string): Promise<void> {
    // 1. Find the AC unit linked to this zone
    const { data: acUnits } = await supabase
      .from("ac_units")
      .select("id")
      .eq("building_unit_id", buildingUnitId);

    const acIds = (acUnits ?? []).map((a) => a.id);

    if (acIds.length > 0) {
      // 2. Delete service history for this AC
      await supabase
        .from("ac_unit_action_log")
        .delete()
        .in("ac_unit_id", acIds);

      // 3. Delete ticket assignments for this AC
      await supabase.from("ticket_ac_units").delete().in("ac_unit_id", acIds);

      // 4. Delete the AC unit itself
      await supabase
        .from("ac_units")
        .delete()
        .eq("building_unit_id", buildingUnitId);
    }

    // 5. Now safe to delete the zone (building_unit)
    const { error } = await supabase
      .from("building_units")
      .delete()
      .eq("id", buildingUnitId);
    if (error) throw error;
  },

  // ── Remove AC from zone (keep zone as empty slot) ─────────────────────────
  async removeAcFromZone(buildingUnitId: string): Promise<void> {
    const { data: acUnits } = await supabase
      .from("ac_units")
      .select("id")
      .eq("building_unit_id", buildingUnitId);
    const acIds = (acUnits ?? []).map((a) => a.id);
    if (acIds.length > 0) {
      await supabase
        .from("ac_unit_action_log")
        .delete()
        .in("ac_unit_id", acIds);
      await supabase.from("ticket_ac_units").delete().in("ac_unit_id", acIds);
      await supabase
        .from("ac_units")
        .delete()
        .eq("building_unit_id", buildingUnitId);
    }
  },

  // ── Rename building ────────────────────────────────────────────────────────
  async renameBuilding(buildingId: string, name: string): Promise<void> {
    const { error } = await supabase
      .from("buildings")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", buildingId);
    if (error) throw error;
  },

  // Delete building — only if 0 building_units remain
  async deleteBuilding(buildingId: string): Promise<void> {
    const { count } = await supabase
      .from("building_units")
      .select("id", { count: "exact", head: true })
      .eq("building_id", buildingId);
    if ((count ?? 0) > 0) throw new Error("Hapus semua zona terlebih dahulu.");
    const { error } = await supabase
      .from("buildings")
      .delete()
      .eq("id", buildingId);
    if (error) throw error;
  },

  // ── Rename floor (updates all building_units with this building+floor) ─────
  async renameFloor(
    buildingId: string,
    oldFloor: string,
    newFloor: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("building_units")
      .update({ floor: newFloor })
      .eq("building_id", buildingId)
      .eq("floor", oldFloor);
    if (error) throw error;
  },

  // Delete floor — only if 0 zones in this building+floor
  async deleteFloor(buildingId: string, floor: string): Promise<void> {
    const { count } = await supabase
      .from("building_units")
      .select("id", { count: "exact", head: true })
      .eq("building_id", buildingId)
      .eq("floor", floor);
    if ((count ?? 0) > 0)
      throw new Error("Hapus semua zona di lantai ini terlebih dahulu.");
    // No rows → nothing to delete (floor exists only through zones)
  },

  // ── Rename room (updates all building_units with this building+floor+room) ─
  async renameRoom(
    buildingId: string,
    floor: string,
    oldRoom: string,
    newRoom: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("building_units")
      .update({ room: newRoom })
      .eq("building_id", buildingId)
      .eq("floor", floor)
      .eq("room", oldRoom);
    if (error) throw error;
  },

  // Delete room — only if 0 zones in this building+floor+room
  async deleteRoom(
    buildingId: string,
    floor: string,
    room: string,
  ): Promise<void> {
    const { count } = await supabase
      .from("building_units")
      .select("id", { count: "exact", head: true })
      .eq("building_id", buildingId)
      .eq("floor", floor)
      .eq("room", room);
    if ((count ?? 0) > 0)
      throw new Error("Hapus semua zona di ruangan ini terlebih dahulu.");
  },
};
