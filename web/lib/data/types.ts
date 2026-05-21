/**
 * Manually-typed snapshots of the columns we read from app.* views.
 * Not auto-generated to keep iteration speed; we can switch to
 * supabase gen types later if it becomes painful.
 */

export type Sale = {
  sale_id: string;
  customer_id: string;
  offer_kajabi_id_ref: string | null;
  offer_label_snapshot: string | null;
  offer_title_public_snapshot: string | null;
  amount_per_installment_cents: number | null;
  amount_source: "observed" | "purchase_fallback" | null;
  amount_per_installment_cents_raw: number | null;
  currency: string | null;
  payment_type: string | null;
  coupon_code: string | null;
  installments_made_kajabi: number;
  payments_succeeded: number;
  payments_failed: number;
  refunds_count: number;
  net_collected_cents: number | null;
  refund_cents: number | null;
  sold_at: string;
  effective_start_at: string | null;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  last_succeeded_at: string | null;
  last_failed_at: string | null;
  last_payment_attempt_at: string | null;
  state_business: "active" | "completed" | "canceled" | "refunded" | "defaulted";
};

export type Payment = {
  payment_id: string;
  sale_id: string;
  customer_id: string;
  offer_kajabi_id_ref: string | null;
  amount_cents: number;
  amount_signed_cents: number;
  currency: string | null;
  sales_tax_cents: number;
  state: string;
  action: string;
  provider: string;
  transaction_payment_type: string | null;
  installment_n: number | null;
  occurred_at: string;
  is_successful_charge: boolean;
  is_refund: boolean;
  is_failed: boolean;
};

export type ScheduleRow = {
  sale_id: string;
  installment_n: number;
  expected_at: string;
  expected_amount_cents: number;
  currency: string | null;
  planned_installments: number;
  planned_source: "override" | "title" | "ratio";
  paid_payment_id: string | null;
  paid_at: string | null;
  paid_amount_cents: number | null;
  days_late_paid: number | null;
  days_until_expected: number;
  status: "paid" | "scheduled" | "in_retry" | "late" | "missed" | "canceled";
};

export type ImpayeRow = {
  sale_id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  offer_label_snapshot: string | null;
  installment_n: number;
  plan_total_installments: number;
  expected_at: string;
  expected_eur: number;
  currency: string | null;
  days_overdue: number;
  status: "in_retry" | "late" | "missed";
  confidence_source: "override" | "title" | "ratio";
  sale_started_at: string;
  last_payment_at: string | null;
  installments_paid_to_date: number;
  sale_paid_to_date_eur: number;
};

export type CustomerSummary = {
  customer_id: string;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  address_country: string | null;
  marketing_subscribed: boolean | null;
  total_sales: number;
  multipay_sales: number;
  single_sales: number;
  subscription_sales: number;
  free_sales: number;
  active_sales: number;
  completed_sales: number;
  canceled_sales: number;
  refunded_sales: number;
  defaulted_sales: number;
  total_paid_eur: number;
  total_successful_charges: number;
  total_failed_charges: number;
  impaye_count_estimated: number;
  impaye_amount_eur_estimated: number;
  first_sale_at: string | null;
  last_sale_at: string | null;
  last_payment_at: string | null;
};

export type RevenueMonth = {
  month: string;
  succeeded_count: number;
  refund_count: number;
  gross_collected_eur: number;
  refund_amount_eur: number | null;
  net_collected_eur: number;
  revenue_status: "provisional" | "finalized";
  finalized_at: string;
};

export type ReviewRow = {
  sale_id: string;
  customer_email: string | null;
  customer_name: string | null;
  offer_internal_title: string | null;
  offer_public_title: string | null;
  amount_per_installment_eur: number;
  amount_source: string | null;
  currency: string | null;
  installments_paid_so_far: number;
  total_paid_eur: number;
  sold_at: string;
  deactivated_at: string | null;
  state_business: string;
  estimated_planned_installments: number | null;
  planned_source: string | null;
  issue_type: "no_coverage" | "overpayment";
};
