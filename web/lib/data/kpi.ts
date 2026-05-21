import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DashboardKPIs = {
  totalNetCollectedCents: number;
  currentMonthEur: number;
  currentMonthLabel: string;
  previousMonthEur: number;
  monthOverMonthPct: number | null;
  totalSales: number;
  activeSales: number;
  totalRefundsEur: number;
  impayesActionableCount: number;
  impayesActionableEur: number;
  impayesMissedCount: number;
  impayesMissedEur: number;
  receivable90dEur: number;
};

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const supabase = createAdminClient();

  // 1. Sales aggregates (FACTUAL)
  const { data: sales, error: salesErr } = await supabase
    .from("sales")
    .select(
      "net_collected_cents, refund_cents, state_business, payment_type",
    );
  if (salesErr) throw salesErr;

  let totalNetCollectedCents = 0;
  let totalRefundsEur = 0;
  let totalSales = 0;
  let activeSales = 0;
  for (const s of sales ?? []) {
    totalNetCollectedCents += s.net_collected_cents ?? 0;
    totalRefundsEur += (s.refund_cents ?? 0) / 100;
    totalSales += 1;
    if (s.state_business === "active") activeSales += 1;
  }

  // 2. Revenue per month
  const { data: revenue, error: revErr } = await supabase
    .from("v_revenue_monthly")
    .select("month, net_collected_eur")
    .order("month", { ascending: false })
    .limit(2);
  if (revErr) throw revErr;

  const current = revenue?.[0];
  const previous = revenue?.[1];
  const currentMonthEur = current ? Number(current.net_collected_eur ?? 0) : 0;
  const previousMonthEur = previous ? Number(previous.net_collected_eur ?? 0) : 0;
  const monthOverMonthPct =
    previousMonthEur > 0
      ? ((currentMonthEur - previousMonthEur) / previousMonthEur) * 100
      : null;

  // 3. Schedule aggregates (ESTIMATED — based on payment_schedule)
  const { data: schedule, error: schedErr } = await supabase
    .from("payment_schedule")
    .select("expected_amount_cents, status, days_until_expected");
  if (schedErr) throw schedErr;

  let impayesActionableCount = 0;
  let impayesActionableEur = 0;
  let impayesMissedCount = 0;
  let impayesMissedEur = 0;
  let receivable90dEur = 0;
  for (const row of schedule ?? []) {
    const eur = (row.expected_amount_cents ?? 0) / 100;
    if (row.status === "in_retry" || row.status === "late") {
      impayesActionableCount += 1;
      impayesActionableEur += eur;
    } else if (row.status === "missed") {
      impayesMissedCount += 1;
      impayesMissedEur += eur;
    } else if (
      row.status === "scheduled" &&
      (row.days_until_expected ?? 0) <= 90
    ) {
      receivable90dEur += eur;
    }
  }

  return {
    totalNetCollectedCents,
    currentMonthEur,
    currentMonthLabel: current?.month ?? "",
    previousMonthEur,
    monthOverMonthPct,
    totalSales,
    activeSales,
    totalRefundsEur,
    impayesActionableCount,
    impayesActionableEur,
    impayesMissedCount,
    impayesMissedEur,
    receivable90dEur,
  };
}

export async function getMonthlyRevenue(limitMonths = 18) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_revenue_monthly")
    .select(
      "month, net_collected_eur, gross_collected_eur, refund_amount_eur, succeeded_count, refund_count, revenue_status, finalized_at",
    )
    .order("month", { ascending: false })
    .limit(limitMonths);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function getTopCustomers(limit = 10) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_customer_summary")
    .select(
      "customer_id, name, email, total_sales, active_sales, completed_sales, total_paid_eur, impaye_count_estimated, impaye_amount_eur_estimated",
    )
    .order("total_paid_eur", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
