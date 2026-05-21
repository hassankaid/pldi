import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomerSummary } from "./types";

export async function getAllCustomers(): Promise<CustomerSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_customer_summary")
    .select(
      "customer_id, name, email, phone_number, address_country, marketing_subscribed, total_sales, multipay_sales, single_sales, subscription_sales, free_sales, active_sales, completed_sales, canceled_sales, refunded_sales, defaulted_sales, total_paid_eur, total_successful_charges, total_failed_charges, impaye_count_estimated, impaye_amount_eur_estimated, first_sale_at, last_sale_at, last_payment_at",
    )
    .order("total_paid_eur", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as CustomerSummary[];
}
