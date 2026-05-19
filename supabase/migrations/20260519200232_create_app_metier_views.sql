-- ============================================================================
-- Migration: 20260519200232_create_app_metier_views
--
-- Final business views for the dashboard:
--   1. app.v_revenue_monthly  -- FACTUAL : monthly revenue (provisional vs finalized)
--   2. app.v_impaye           -- ESTIMATED : impayes table for relances
--   3. app.v_customer_summary -- FACTUAL + small estimated section
--
-- Provisional vs finalized rule:
--   A month M is "finalized" when M+1 + 21 days has passed.
--   Before that, M is "provisional" (retries can still affect the numbers).
-- ============================================================================

CREATE OR REPLACE VIEW app.v_revenue_monthly AS
SELECT
  date_trunc('month', occurred_at)::date AS month,
  count(*) FILTER (WHERE is_successful_charge)                                          AS succeeded_count,
  count(*) FILTER (WHERE is_refund)                                                     AS refund_count,
  ROUND(SUM(amount_signed_cents) FILTER (WHERE is_successful_charge)::numeric / 100, 2) AS gross_collected_eur,
  ROUND(SUM(amount_cents)        FILTER (WHERE is_refund)::numeric / 100, 2)            AS refund_amount_eur,
  ROUND(SUM(amount_signed_cents)::numeric / 100, 2)                                     AS net_collected_eur,
  CASE
    WHEN (date_trunc('month', occurred_at) + interval '1 month' + interval '21 days')::date <= CURRENT_DATE
    THEN 'finalized'
    ELSE 'provisional'
  END                                                                                   AS revenue_status,
  (date_trunc('month', occurred_at) + interval '1 month' + interval '21 days')::date    AS finalized_at
FROM app.payments
WHERE state = 'succeeded'
GROUP BY date_trunc('month', occurred_at)
ORDER BY month DESC;

COMMENT ON VIEW app.v_revenue_monthly IS
  'FACTUAL : monthly revenue from successful charges minus refunds. revenue_status indicates if the month is finalized (no more retries possible) or still provisional.';

CREATE OR REPLACE VIEW app.v_impaye AS
SELECT
  ps.sale_id,
  s.customer_id,
  c.name                                       AS customer_name,
  c.email                                      AS customer_email,
  c.phone_number                               AS customer_phone,
  s.offer_label_snapshot,
  ps.installment_n,
  ps.planned_installments                      AS plan_total_installments,
  ps.expected_at,
  ROUND(ps.expected_amount_cents::numeric / 100, 2) AS expected_eur,
  s.currency,
  -ps.days_until_expected                      AS days_overdue,
  ps.status,
  ps.planned_source                            AS confidence_source,
  s.sold_at::date                              AS sale_started_at,
  s.last_succeeded_at::date                    AS last_payment_at,
  s.payments_succeeded                         AS installments_paid_to_date,
  ROUND(s.net_collected_cents::numeric / 100, 2) AS sale_paid_to_date_eur
FROM app.payment_schedule ps
JOIN app.sales s              ON s.sale_id     = ps.sale_id
LEFT JOIN raw.kajabi_contacts c ON c.customer_id = s.customer_id
WHERE ps.status IN ('in_retry', 'late', 'missed');

COMMENT ON VIEW app.v_impaye IS
  'ESTIMATED : impayés flagged from payment_schedule (in_retry, late, missed). confidence_source indicates how planned_installments was inferred (title=parsed from internal_title, ratio=offer.price/installment).';

CREATE OR REPLACE VIEW app.v_customer_summary AS
WITH per_customer AS (
  SELECT
    customer_id,
    count(*)                                              AS total_sales,
    count(*) FILTER (WHERE state_business = 'active')     AS active_sales,
    count(*) FILTER (WHERE state_business = 'completed')  AS completed_sales,
    count(*) FILTER (WHERE state_business = 'canceled')   AS canceled_sales,
    count(*) FILTER (WHERE state_business = 'refunded')   AS refunded_sales,
    count(*) FILTER (WHERE state_business = 'defaulted')  AS defaulted_sales,
    count(*) FILTER (WHERE payment_type   = 'multipay')   AS multipay_sales,
    count(*) FILTER (WHERE payment_type   = 'single')     AS single_sales,
    count(*) FILTER (WHERE payment_type   = 'subscription') AS subscription_sales,
    count(*) FILTER (WHERE payment_type   = 'free')       AS free_sales,
    SUM(net_collected_cents)                              AS total_paid_cents,
    SUM(payments_succeeded)                               AS total_successful_charges,
    SUM(payments_failed)                                  AS total_failed_charges,
    MIN(sold_at)                                          AS first_sale_at,
    MAX(sold_at)                                          AS last_sale_at,
    MAX(last_succeeded_at)                                AS last_payment_at
  FROM app.sales
  GROUP BY customer_id
),
per_customer_impaye AS (
  SELECT
    s.customer_id,
    count(*)                              AS impaye_count_estimated,
    SUM(ps.expected_amount_cents)         AS impaye_amount_cents_estimated
  FROM app.payment_schedule ps
  JOIN app.sales s ON s.sale_id = ps.sale_id
  WHERE ps.status IN ('in_retry', 'late', 'missed')
  GROUP BY s.customer_id
)
SELECT
  pc.customer_id,
  c.name,
  c.email,
  c.phone_number,
  c.address_country,
  c.subscribed                                          AS marketing_subscribed,
  pc.total_sales,
  pc.multipay_sales,
  pc.single_sales,
  pc.subscription_sales,
  pc.free_sales,
  pc.active_sales,
  pc.completed_sales,
  pc.canceled_sales,
  pc.refunded_sales,
  pc.defaulted_sales,
  ROUND(pc.total_paid_cents::numeric / 100, 2)          AS total_paid_eur,
  pc.total_successful_charges,
  pc.total_failed_charges,
  COALESCE(pci.impaye_count_estimated, 0)                                            AS impaye_count_estimated,
  ROUND(COALESCE(pci.impaye_amount_cents_estimated, 0)::numeric / 100, 2)            AS impaye_amount_eur_estimated,
  pc.first_sale_at::date                                AS first_sale_at,
  pc.last_sale_at::date                                 AS last_sale_at,
  pc.last_payment_at::date                              AS last_payment_at
FROM per_customer pc
LEFT JOIN raw.kajabi_contacts c     ON c.customer_id = pc.customer_id
LEFT JOIN per_customer_impaye pci   ON pci.customer_id = pc.customer_id
ORDER BY pc.total_paid_cents DESC NULLS LAST;

COMMENT ON VIEW app.v_customer_summary IS
  '360 customer view. Columns marked _estimated are based on payment_schedule (67% coverage of multipay sales). Other columns are factual.';

GRANT SELECT ON app.v_revenue_monthly  TO service_role;
GRANT SELECT ON app.v_impaye           TO service_role;
GRANT SELECT ON app.v_customer_summary TO service_role;
