-- ============================================================================
-- Migration: fix_amount_per_installment_from_transactions
--
-- BUG : raw.kajabi_purchases.amount_in_cents is NOT reliably the per-installment.
-- For some offers, Kajabi stores an unrelated value (legacy total? old config?).
--
-- Evidence: sale 2204149505 (LTA GOLD + PND OFFRE 2025 "24 X 100€")
--   - purchase.amount_in_cents = 270000 (2700 EUR)   <-- WRONG
--   - actual charges all at 10000 cents (100 EUR)    <-- correct
--   - 16 payments x 100 EUR = 1600 EUR collected
--
-- Fix : compute amount_per_installment_cents from the MODE of successful
-- non-refund transaction amounts for each sale. Fallback to purchase value
-- when no transactions exist yet.
--
-- Impact :
--   - app.v_revenue_monthly, app.v_customer_summary (factual) : UNCHANGED -- they
--     already sum real transactions.
--   - app.payment_schedule, app.v_impaye : projections now correct.
--   - app.sales.amount_per_installment_cents_raw : keep original for audit.
--   - amount_source column ('observed' | 'purchase_fallback') traces provenance.
--
-- Validation results :
--   - 1281 sales use observed (have transactions)
--   - 3155 sales use fallback (no transactions yet -- free offers, future sales)
--   - Sale 2204149505 now shows 100 EUR per_installment (was 2700)
--   - Overpayments dropped from 60 to 20 (false overpayments were caused by
--     the wrong purchase amount)
--   - Detected impayes : 175 -> 231 (+32%)
-- ============================================================================

DROP VIEW IF EXISTS app.v_sales_review_needed;
DROP VIEW IF EXISTS app.v_customer_summary;
DROP VIEW IF EXISTS app.v_impaye;
DROP VIEW IF EXISTS app.payment_schedule;
DROP VIEW IF EXISTS app.sales;

CREATE VIEW app.sales AS
WITH sale_payments AS (
  SELECT
    purchase_id,
    COUNT(*) FILTER (WHERE state = 'succeeded' AND action <> 'refund')        AS payments_succeeded,
    COUNT(*) FILTER (WHERE state = 'failed')                                  AS payments_failed,
    COUNT(*) FILTER (WHERE state = 'succeeded' AND action = 'refund')         AS refunds_count,
    COALESCE(SUM(CASE
      WHEN state = 'succeeded' AND action = 'refund' THEN -amount_in_cents
      WHEN state = 'succeeded'                       THEN  amount_in_cents
      ELSE 0
    END), 0)                                                                   AS net_collected_cents,
    COALESCE(SUM(amount_in_cents) FILTER (WHERE state = 'succeeded' AND action = 'refund'), 0) AS refund_cents,
    MAX(created_at) FILTER (WHERE state = 'succeeded' AND action <> 'refund')  AS last_succeeded_at,
    MAX(created_at) FILTER (WHERE state = 'failed')                            AS last_failed_at,
    MAX(created_at)                                                            AS last_payment_attempt_at,
    mode() WITHIN GROUP (ORDER BY amount_in_cents)
      FILTER (WHERE state = 'succeeded' AND action <> 'refund')                AS modal_charge_amount_cents
  FROM raw.kajabi_transactions
  WHERE purchase_id IS NOT NULL
  GROUP BY purchase_id
)
SELECT
  p.kajabi_id                                  AS sale_id,
  p.customer_id,
  p.offer_id                                   AS offer_kajabi_id_ref,
  o.internal_title                             AS offer_label_snapshot,
  o.title                                      AS offer_title_public_snapshot,
  -- FIX : amount per installment = mode observe (reliable), fallback purchase
  COALESCE(sp.modal_charge_amount_cents, p.amount_in_cents) AS amount_per_installment_cents,
  CASE
    WHEN sp.modal_charge_amount_cents IS NOT NULL THEN 'observed'
    ELSE 'purchase_fallback'
  END                                          AS amount_source,
  p.amount_in_cents                            AS amount_per_installment_cents_raw,
  p.currency,
  p.payment_type,
  p.coupon_code,
  COALESCE(p.multipay_payments_made, 0)        AS installments_made_kajabi,
  COALESCE(sp.payments_succeeded, 0)           AS payments_succeeded,
  COALESCE(sp.payments_failed, 0)              AS payments_failed,
  COALESCE(sp.refunds_count, 0)                AS refunds_count,
  sp.net_collected_cents,
  sp.refund_cents,
  p.created_at                                 AS sold_at,
  p.effective_start_at,
  p.deactivated_at,
  p.deactivation_reason,
  sp.last_succeeded_at,
  sp.last_failed_at,
  sp.last_payment_attempt_at,
  CASE
    WHEN COALESCE(sp.refunds_count, 0) > 0 AND COALESCE(sp.net_collected_cents, 0) <= 0 THEN 'refunded'
    WHEN p.deactivation_reason = 'failed_payment'                                       THEN 'defaulted'
    WHEN p.deactivated_at IS NOT NULL                                                   THEN 'canceled'
    WHEN p.payment_type IN ('single', 'free') AND COALESCE(sp.payments_succeeded, 0) > 0 THEN 'completed'
    ELSE 'active'
  END                                          AS state_business,
  p.source                                     AS kajabi_source,
  p.synced_at                                  AS last_synced_from_kajabi_at
FROM raw.kajabi_purchases p
LEFT JOIN sale_payments sp    ON sp.purchase_id = p.kajabi_id
LEFT JOIN raw.kajabi_offers o ON o.kajabi_id    = p.offer_id;
COMMENT ON VIEW app.sales IS
  'One row per sale. amount_per_installment_cents = mode of observed transaction amounts (reliable); falls back to purchase.amount_in_cents (UNRELIABLE) when no transactions yet.';
GRANT SELECT ON app.sales TO service_role;

-- Recreate payment_schedule using fixed sales view
CREATE VIEW app.payment_schedule AS
WITH parsed_title AS (
  SELECT
    o.kajabi_id AS offer_id,
    CASE WHEN o.internal_title ~* '\d+\s*[xX×]\s*\d+(?:[,\.]\d+)?\s*[€$£]?'
         THEN substring(o.internal_title from '(\d+)\s*[xX×]\s*\d')::integer ELSE NULL END AS parsed_n,
    CASE WHEN o.internal_title ~* '\d+\s*[xX×]\s*\d+(?:[,\.]\d+)?'
         THEN (REPLACE(substring(o.internal_title from '\d+\s*[xX×]\s*(\d+(?:[,\.]\d+)?)'), ',', '.')::numeric * 100)::bigint ELSE NULL END AS parsed_per_installment_cents
  FROM raw.kajabi_offers o
),
sale_plan AS (
  SELECT s.sale_id, s.sold_at, s.effective_start_at, s.amount_per_installment_cents, s.currency,
         s.deactivated_at, s.deactivation_reason, s.state_business, s.payments_succeeded,
         mpo.planned_installments AS planned_from_override,
         CASE WHEN pt.parsed_n IS NOT NULL AND pt.parsed_per_installment_cents = s.amount_per_installment_cents AND pt.parsed_n BETWEEN 1 AND 100
              THEN pt.parsed_n ELSE NULL END AS planned_from_title,
         CASE WHEN o.price_in_cents > 0 AND s.amount_per_installment_cents > 0 AND o.price_in_cents % s.amount_per_installment_cents = 0 AND (o.price_in_cents / s.amount_per_installment_cents) BETWEEN 1 AND 100
              THEN (o.price_in_cents / s.amount_per_installment_cents)::integer ELSE NULL END AS planned_from_ratio,
         CASE WHEN mpo.planned_installments IS NOT NULL THEN 'override'
              WHEN pt.parsed_n IS NOT NULL AND pt.parsed_per_installment_cents = s.amount_per_installment_cents AND pt.parsed_n BETWEEN 1 AND 100 THEN 'title'
              WHEN o.price_in_cents > 0 AND s.amount_per_installment_cents > 0 AND o.price_in_cents % s.amount_per_installment_cents = 0 AND (o.price_in_cents / s.amount_per_installment_cents) BETWEEN 1 AND 100 THEN 'ratio'
              ELSE NULL END AS planned_source
  FROM app.sales s
  LEFT JOIN raw.kajabi_offers o            ON o.kajabi_id   = s.offer_kajabi_id_ref
  LEFT JOIN parsed_title pt                ON pt.offer_id   = s.offer_kajabi_id_ref
  LEFT JOIN app.manual_plan_overrides mpo  ON mpo.sale_id   = s.sale_id
  WHERE s.payment_type = 'multipay'
),
sale_plan_final AS (SELECT sp.*, COALESCE(sp.planned_from_override, sp.planned_from_title, sp.planned_from_ratio) AS planned_installments FROM sale_plan sp),
expected AS (
  SELECT sp.sale_id, sp.amount_per_installment_cents, sp.currency, sp.deactivated_at, sp.deactivation_reason, sp.state_business,
         sp.planned_installments, sp.planned_source, n AS installment_n,
         (COALESCE(sp.effective_start_at, sp.sold_at)::date + ((n - 1) || ' months')::interval)::date AS expected_at
  FROM sale_plan_final sp CROSS JOIN LATERAL generate_series(1, sp.planned_installments) AS n
  WHERE sp.planned_installments IS NOT NULL
)
SELECT e.sale_id, e.installment_n, e.expected_at, e.amount_per_installment_cents AS expected_amount_cents, e.currency, e.planned_installments, e.planned_source,
       p.payment_id AS paid_payment_id, p.occurred_at::date AS paid_at, p.amount_signed_cents AS paid_amount_cents,
       CASE WHEN p.occurred_at IS NOT NULL THEN (p.occurred_at::date - e.expected_at) ELSE NULL END AS days_late_paid,
       (e.expected_at - CURRENT_DATE) AS days_until_expected,
       CASE WHEN p.payment_id IS NOT NULL THEN 'paid'
            WHEN e.deactivated_at IS NOT NULL AND e.expected_at > e.deactivated_at::date THEN 'canceled'
            WHEN e.expected_at > CURRENT_DATE THEN 'scheduled'
            WHEN CURRENT_DATE <= e.expected_at + INTERVAL '7 days' THEN 'in_retry'
            WHEN CURRENT_DATE <= e.expected_at + INTERVAL '21 days' THEN 'late'
            ELSE 'missed' END AS status
FROM expected e
LEFT JOIN app.payments p ON p.sale_id = e.sale_id AND p.installment_n = e.installment_n AND p.is_successful_charge;
GRANT SELECT ON app.payment_schedule TO service_role;

CREATE VIEW app.v_impaye AS
SELECT ps.sale_id, s.customer_id, c.name AS customer_name, c.email AS customer_email, c.phone_number AS customer_phone,
       s.offer_label_snapshot, ps.installment_n, ps.planned_installments AS plan_total_installments, ps.expected_at,
       ROUND(ps.expected_amount_cents::numeric / 100, 2) AS expected_eur, s.currency, -ps.days_until_expected AS days_overdue,
       ps.status, ps.planned_source AS confidence_source, s.sold_at::date AS sale_started_at, s.last_succeeded_at::date AS last_payment_at,
       s.payments_succeeded AS installments_paid_to_date, ROUND(s.net_collected_cents::numeric / 100, 2) AS sale_paid_to_date_eur
FROM app.payment_schedule ps
JOIN app.sales s              ON s.sale_id     = ps.sale_id
LEFT JOIN raw.kajabi_contacts c ON c.customer_id = s.customer_id
WHERE ps.status IN ('in_retry', 'late', 'missed');
GRANT SELECT ON app.v_impaye TO service_role;

CREATE VIEW app.v_customer_summary AS
WITH per_customer AS (
  SELECT customer_id, count(*) AS total_sales,
         count(*) FILTER (WHERE state_business = 'active') AS active_sales,
         count(*) FILTER (WHERE state_business = 'completed') AS completed_sales,
         count(*) FILTER (WHERE state_business = 'canceled') AS canceled_sales,
         count(*) FILTER (WHERE state_business = 'refunded') AS refunded_sales,
         count(*) FILTER (WHERE state_business = 'defaulted') AS defaulted_sales,
         count(*) FILTER (WHERE payment_type = 'multipay') AS multipay_sales,
         count(*) FILTER (WHERE payment_type = 'single') AS single_sales,
         count(*) FILTER (WHERE payment_type = 'subscription') AS subscription_sales,
         count(*) FILTER (WHERE payment_type = 'free') AS free_sales,
         SUM(net_collected_cents) AS total_paid_cents,
         SUM(payments_succeeded) AS total_successful_charges, SUM(payments_failed) AS total_failed_charges,
         MIN(sold_at) AS first_sale_at, MAX(sold_at) AS last_sale_at, MAX(last_succeeded_at) AS last_payment_at
  FROM app.sales GROUP BY customer_id
),
per_customer_impaye AS (
  SELECT s.customer_id, count(*) AS impaye_count_estimated, SUM(ps.expected_amount_cents) AS impaye_amount_cents_estimated
  FROM app.payment_schedule ps JOIN app.sales s ON s.sale_id = ps.sale_id
  WHERE ps.status IN ('in_retry', 'late', 'missed') GROUP BY s.customer_id
)
SELECT pc.customer_id, c.name, c.email, c.phone_number, c.address_country, c.subscribed AS marketing_subscribed,
       pc.total_sales, pc.multipay_sales, pc.single_sales, pc.subscription_sales, pc.free_sales,
       pc.active_sales, pc.completed_sales, pc.canceled_sales, pc.refunded_sales, pc.defaulted_sales,
       ROUND(pc.total_paid_cents::numeric / 100, 2) AS total_paid_eur,
       pc.total_successful_charges, pc.total_failed_charges,
       COALESCE(pci.impaye_count_estimated, 0) AS impaye_count_estimated,
       ROUND(COALESCE(pci.impaye_amount_cents_estimated, 0)::numeric / 100, 2) AS impaye_amount_eur_estimated,
       pc.first_sale_at::date AS first_sale_at, pc.last_sale_at::date AS last_sale_at, pc.last_payment_at::date AS last_payment_at
FROM per_customer pc
LEFT JOIN raw.kajabi_contacts c     ON c.customer_id = pc.customer_id
LEFT JOIN per_customer_impaye pci   ON pci.customer_id = pc.customer_id
ORDER BY pc.total_paid_cents DESC NULLS LAST;
GRANT SELECT ON app.v_customer_summary TO service_role;

CREATE VIEW app.v_sales_review_needed AS
WITH coverage AS (SELECT DISTINCT sale_id, planned_installments, planned_source FROM app.payment_schedule)
SELECT s.sale_id, c.email AS customer_email, c.name AS customer_name,
       o.internal_title AS offer_internal_title, o.title AS offer_public_title,
       ROUND(s.amount_per_installment_cents::numeric / 100, 2) AS amount_per_installment_eur,
       s.amount_source, s.currency, s.payments_succeeded AS installments_paid_so_far,
       ROUND(s.net_collected_cents::numeric / 100, 2) AS total_paid_eur,
       s.sold_at::date AS sold_at, s.deactivated_at::date AS deactivated_at, s.state_business,
       cov.planned_installments AS estimated_planned_installments, cov.planned_source,
       CASE WHEN cov.sale_id IS NULL THEN 'no_coverage'
            WHEN s.payments_succeeded > cov.planned_installments THEN 'overpayment'
            ELSE NULL END AS issue_type,
       NULL::integer AS REAL_planned_installments, NULL::text AS REVIEW_NOTE
FROM app.sales s
LEFT JOIN raw.kajabi_contacts c ON c.customer_id = s.customer_id
LEFT JOIN raw.kajabi_offers o   ON o.kajabi_id   = s.offer_kajabi_id_ref
LEFT JOIN coverage cov          ON cov.sale_id   = s.sale_id
WHERE s.payment_type = 'multipay'
  AND (cov.sale_id IS NULL OR s.payments_succeeded > cov.planned_installments)
ORDER BY s.payments_succeeded DESC NULLS LAST, s.sold_at DESC;
GRANT SELECT ON app.v_sales_review_needed TO service_role;
