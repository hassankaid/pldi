import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CustomerPunctuality = {
  customer_id: string;
  plans_count: number;
  total_planned: number;
  installments_paid: number;
  paid_on_time: number;
  paid_late: number;
  overdue_count: number;
  overdue_eur: number | string;
  worst_days_late: number;
};

export type TimelineEvent = {
  customer_id: string;
  source: "schedule" | "payment";
  sale_id: string;
  offer_label_snapshot: string | null;
  payment_type: string | null;
  installment_n: number | null;
  planned_installments: number | null;
  event_date: string;
  amount_cents: number;
  paid_at: string | null;
  paid_amount_cents: number | null;
  days_late_paid: number | null;
  status: string;
  planned_source: string | null;
};

export async function getCustomerPunctuality(
  customerId: string,
): Promise<CustomerPunctuality | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_customer_punctuality")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data as CustomerPunctuality | null;
}

export async function getCustomerTimeline(
  customerId: string,
): Promise<TimelineEvent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_customer_timeline")
    .select("*")
    .eq("customer_id", customerId)
    .order("event_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TimelineEvent[];
}
