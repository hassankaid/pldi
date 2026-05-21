import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ReviewRow } from "./types";

export async function getReviewList(): Promise<ReviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_sales_review_needed")
    .select(
      "sale_id, customer_email, customer_name, offer_internal_title, offer_public_title, amount_per_installment_eur, amount_source, currency, installments_paid_so_far, total_paid_eur, sold_at, deactivated_at, state_business, estimated_planned_installments, planned_source, issue_type",
    )
    .order("total_paid_eur", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as ReviewRow[];
}
