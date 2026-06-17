import { supabase } from "@/lib/supabase";
import type { AcBrand, AcUnit, AcUnitWithLocation } from "@/types/app";

export const acUnitRepository = {
  async getAllAcUnits() {
    const { data, error } = await supabase
      .from("ac_units")
      .select(
        `
                *,
                brand:ac_brands!brand_id(name),
                building_unit:building_units!building_unit_id(
                    display_name, floor, room
                ),
                location:locations!location_id(
                    name,
                    customer:customers!customer_id(name)
                )
            `,
      )
      .eq("is_active", true)
      .order("ac_code");

    if (error) throw error;
    return (data ?? []) as unknown as AcUnitWithLocation[];
  },

  async getAcUnitsByLocation(
    locationId: string,
  ): Promise<AcUnitWithLocation[]> {
    const { data, error } = await supabase
      .from("ac_units")
      .select(
        `
                *,
                building_unit:building_units!building_unit_id(
                    id, zone, floor, room, display_name
                ),
                brand:ac_brands!brand_id(name)
            `,
      )
      .eq("location_id", locationId)
      .eq("is_active", true)
      .order("unit_label");

    if (error) throw error;
    return (data ?? []) as unknown as AcUnitWithLocation[];
  },

  async getBrands(): Promise<AcBrand[]> {
    const { data, error } = await supabase
      .from("ac_brands")
      .select("*")
      .order("name");

    if (error) throw error;
    return (data ?? []) as AcBrand[];
  },

  async registerAcUnit(payload: Partial<AcUnit>): Promise<AcUnit> {
    const { data, error } = await supabase
      .from("ac_units")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as AcUnit;
  },
};
