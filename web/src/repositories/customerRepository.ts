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
};
