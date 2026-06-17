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
                ac_unit_count:ac_units(count)
            `,
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Flatten count from Supabase aggregate format
    return (data ?? []).map((loc) => ({
      ...loc,
      ac_unit_count:
        (loc.ac_unit_count as unknown as { count: number }[])?.[0]?.count ?? 0,
    })) as unknown as Location[];
  },

  async getBuildingUnits(locationId: string): Promise<BuildingUnit[]> {
    const { data, error } = await supabase
      .from("building_units")
      .select("*")
      .eq("location_id", locationId)
      .order("display_name");

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
