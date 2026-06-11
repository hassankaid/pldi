import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type MonthAccounting = {
  month: string;
  ca_net_eur: number | string;
  ca_brut_eur: number | string;
  succeeded_count: number;
  refund_eur: number | string;
  refund_count: number;
  failed_count: number;
  failed_attempted_eur: number | string;
  a_venir_est_eur: number | string;
  a_venir_est_count: number;
  en_retard_est_eur: number | string;
  en_retard_est_count: number;
  revenue_status: "provisional" | "finalized";
  finalized_at: string;
};

export type PaymentDetail = {
  payment_id: string;
  sale_id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  offer_label_snapshot: string | null;
  payment_type: string | null;
  installment_n: number | null;
  amount_cents: number;
  amount_signed_cents: number;
  currency: string | null;
  provider: string;
  action: string;
  state: string;
  occurred_at: string;
  is_successful_charge: boolean;
  is_refund: boolean;
  is_failed: boolean;
};

export type ScheduleDetail = {
  sale_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  offer_label_snapshot: string | null;
  payment_type: string | null;
  installment_n: number;
  planned_installments: number;
  planned_source: string;
  expected_at: string;
  expected_amount_cents: number;
  paid_at: string | null;
  paid_amount_cents: number | null;
  days_late_paid: number | null;
  days_until_expected: number;
  status: string;
};

/** "2026-05" -> { start: "2026-05-01", end: "2026-06-01" } */
export function monthBounds(slug: string) {
  const [y, m] = slug.split("-").map(Number);
  const start = `${slug}-01`;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const end = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
  return { start, end };
}

/** Validate a "YYYY-MM" slug */
export function isValidMonthSlug(slug: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(slug);
}

export function shiftMonth(slug: string, delta: number): string {
  const [y, m] = slug.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getMonthAccounting(
  slug: string,
): Promise<MonthAccounting | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_month_accounting")
    .select("*")
    .eq("month", `${slug}-01`)
    .maybeSingle();
  if (error) throw error;
  return data as MonthAccounting | null;
}

export type PaymentKind = "paid" | "failed" | "refund";

export async function getMonthPayments(
  slug: string,
  kind: PaymentKind,
): Promise<PaymentDetail[]> {
  const { start, end } = monthBounds(slug);
  const supabase = createAdminClient();
  let q = supabase
    .from("v_payment_detail")
    .select("*")
    .gte("occurred_at", start)
    .lt("occurred_at", end);
  if (kind === "paid") q = q.eq("is_successful_charge", true);
  else if (kind === "failed") q = q.eq("is_failed", true);
  else q = q.eq("is_refund", true);
  const { data, error } = await q.order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaymentDetail[];
}

export async function getMonthSchedule(
  slug: string,
): Promise<ScheduleDetail[]> {
  const { start, end } = monthBounds(slug);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_schedule_detail")
    .select("*")
    .gte("expected_at", start)
    .lt("expected_at", end)
    .in("status", ["scheduled", "in_retry", "late", "missed"])
    .order("expected_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScheduleDetail[];
}

/** All months that have data, ascending "YYYY-MM" — for prev/next bounds. */
export async function getAvailableMonths(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_month_accounting")
    .select("month")
    .order("month", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => String(r.month).slice(0, 7));
}
