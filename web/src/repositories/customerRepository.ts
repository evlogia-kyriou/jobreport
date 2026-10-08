import { supabase } from "@/lib/supabase";
import type { Customer } from "@/types/app";

export const customerRepository = {
  async getCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from("customers")
      .select(
        `
                *,
                phones:customer_phones(id, phone, label, is_primary)
            `,
      )
      .order("name", { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as Customer[];
  },

  async getCustomerById(customerId: string): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .select(
        `
                *,
                phones:customer_phones(id, phone, label, is_primary)
            `,
      )
      .eq("id", customerId)
      .single();

    if (error) throw error;
    return data as unknown as Customer;
  },

  async searchCustomers(query: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from("customers")
      .select(
        `
                id, name, pic_name, type, stage,
                phones:customer_phones(phone, is_primary)
            `,
      )
      .or(`name.ilike.%${query}%`)
      .eq("stage", "active")
      .order("name")
      .limit(20);

    if (error) throw error;
    return (data ?? []) as unknown as Customer[];
  },

  async createCustomer(payload: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  // Returns count of projects for this customer (any status)
  async getCustomerProjectCount(customerId: string): Promise<number> {
    const { count, error } = await supabase
      .from("project_tickets")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId);
    if (error) throw error;
    return count ?? 0;
  },

  // Hard delete customer + all related data (blocked if has projects)
  // TODO PRODUCTION: consider soft delete (is_active = false) for customers with history
  async hardDeleteCustomer(
    customerId: string,
    customerName: string,
    reason: string,
    notes?: string,
  ): Promise<void> {
    // 1. Log the deletion BEFORE data is removed (snapshot customer name for BI)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("customer_deletion_log").insert({
      customer_id: customerId,
      customer_name: customerName,
      reason,
      notes: notes?.trim() || null,
      deleted_by: user?.id ?? null,
      deleted_at: new Date().toISOString(),
    });

    // 2. Get all location IDs for this customer
    const { data: locations } = await supabase
      .from("locations")
      .select("id")
      .eq("customer_id", customerId);

    const locationIds = (locations ?? []).map((l) => l.id);

    if (locationIds.length > 0) {
      // 3. Get all AC unit IDs across all locations
      const { data: acUnits } = await supabase
        .from("ac_units")
        .select("id")
        .in("location_id", locationIds);

      const acIds = (acUnits ?? []).map((a) => a.id);

      if (acIds.length > 0) {
        // 4. Delete AC related records
        await supabase
          .from("ac_unit_action_log")
          .delete()
          .in("ac_unit_id", acIds);
        await supabase.from("ticket_ac_units").delete().in("ac_unit_id", acIds);
        await supabase.from("ac_units").delete().in("location_id", locationIds);
      }

      // 5. Delete building structure
      await supabase
        .from("building_units")
        .delete()
        .in("location_id", locationIds);
      await supabase.from("buildings").delete().in("location_id", locationIds);

      // 6. Delete locations
      await supabase.from("locations").delete().eq("customer_id", customerId);
    }

    // 7. Delete customer records
    await supabase
      .from("customer_phones")
      .delete()
      .eq("customer_id", customerId);
    await supabase
      .from("customer_notes")
      .delete()
      .eq("customer_id", customerId);
    await supabase
      .from("customer_activity_log")
      .delete()
      .eq("customer_id", customerId);

    // 8. Delete the customer itself
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);
    if (error) throw error;
  },
};
