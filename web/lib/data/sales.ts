import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Sale, Payment, ScheduleRow } from "./types";

export async function getAllSales(): Promise<Sale[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "sale_id, customer_id, offer_kajabi_id_ref, offer_label_snapshot, offer_title_public_snapshot, amount_per_installment_cents, amount_source, amount_per_installment_cents_raw, currency, payment_type, coupon_code, installments_made_kajabi, payments_succeeded, payments_failed, refunds_count, net_collected_cents, refund_cents, sold_at, effective_start_at, deactivated_at, deactivation_reason, last_succeeded_at, last_failed_at, last_payment_attempt_at, state_business",
    )
    .order("sold_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Sale[];
}

export async function getSaleById(saleId: string): Promise<Sale | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "sale_id, customer_id, offer_kajabi_id_ref, offer_label_snapshot, offer_title_public_snapshot, amount_per_installment_cents, amount_source, amount_per_installment_cents_raw, currency, payment_type, coupon_code, installments_made_kajabi, payments_succeeded, payments_failed, refunds_count, net_collected_cents, refund_cents, sold_at, effective_start_at, deactivated_at, deactivation_reason, last_succeeded_at, last_failed_at, last_payment_attempt_at, state_business",
    )
    .eq("sale_id", saleId)
    .maybeSingle();
  if (error) throw error;
  return data as Sale | null;
}

export async function getPaymentsForSale(saleId: string): Promise<Payment[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "payment_id, sale_id, customer_id, offer_kajabi_id_ref, amount_cents, amount_signed_cents, currency, sales_tax_cents, state, action, provider, transaction_payment_type, installment_n, occurred_at, is_successful_charge, is_refund, is_failed",
    )
    .eq("sale_id", saleId)
    .order("occurred_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function getScheduleForSale(saleId: string): Promise<ScheduleRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_schedule")
    .select(
      "sale_id, installment_n, expected_at, expected_amount_cents, currency, planned_installments, planned_source, paid_payment_id, paid_at, paid_amount_cents, days_late_paid, days_until_expected, status",
    )
    .eq("sale_id", saleId)
    .order("installment_n", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScheduleRow[];
}

/**
 * Fetch a customer's contact info from raw.kajabi_contacts.
 * Requires raw schema exposed OR use service_role direct (which we have).
 * We fall back to looking up via app.v_customer_summary which is in app schema.
 */
export async function getCustomerInfo(customerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("v_customer_summary")
    .select(
      "customer_id, name, email, phone_number, address_country, marketing_subscribed, total_sales, active_sales, completed_sales, canceled_sales, refunded_sales, defaulted_sales, multipay_sales, single_sales, subscription_sales, free_sales, total_paid_eur, total_successful_charges, total_failed_charges, impaye_count_estimated, impaye_amount_eur_estimated, first_sale_at, last_sale_at, last_payment_at",
    )
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSalesForCustomer(customerId: string): Promise<Sale[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "sale_id, customer_id, offer_kajabi_id_ref, offer_label_snapshot, offer_title_public_snapshot, amount_per_installment_cents, amount_source, amount_per_installment_cents_raw, currency, payment_type, coupon_code, installments_made_kajabi, payments_succeeded, payments_failed, refunds_count, net_collected_cents, refund_cents, sold_at, effective_start_at, deactivated_at, deactivation_reason, last_succeeded_at, last_failed_at, last_payment_attempt_at, state_business",
    )
    .eq("customer_id", customerId)
    .order("sold_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Sale[];
}
