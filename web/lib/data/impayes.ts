import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ImpayeRow } from "./types";

export async function getAllImpayes(): Promise<ImpayeRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_impaye")
    .select(
      "sale_id, customer_id, customer_name, customer_email, customer_phone, offer_label_snapshot, installment_n, plan_total_installments, expected_at, expected_eur, currency, days_overdue, status, confidence_source, sale_started_at, last_payment_at, installments_paid_to_date, sale_paid_to_date_eur",
    )
    .order("days_overdue", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ImpayeRow[];
}
