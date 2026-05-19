-- ============================================================================
-- Migration: 20260519193321_create_app_payments_view
--
-- app.payments : one row per Kajabi transaction (charge / refund / failed).
--
-- Adds 3 conveniences vs raw.kajabi_transactions:
--   1. amount_signed_cents (+ succeeded, - refund, 0 failed) -> easy SUM
--   2. installment_n (chronological rank of successful non-refund charge)
--   3. boolean flags (is_successful_charge, is_refund, is_failed)
--
-- Validated against app.sales: SUM(amount_signed_cents WHERE state='succeeded')
-- exactly matches SUM(net_collected_cents) -> 64,321,213 cents (643,212.13 EUR).
-- ============================================================================

CREATE OR REPLACE VIEW app.payments AS
WITH installment_numbers AS (
  -- Rank successful (non-refund) payments chronologically per sale
  SELECT
    kajabi_id,
    ROW_NUMBER() OVER (
      PARTITION BY purchase_id
      ORDER BY created_at, kajabi_id
    ) AS installment_n
  FROM raw.kajabi_transactions
  WHERE state = 'succeeded' AND action <> 'refund'
)
SELECT
  -- Identity
  t.kajabi_id                                        AS payment_id,
  t.purchase_id                                      AS sale_id,
  t.customer_id,
  t.offer_id                                         AS offer_kajabi_id_ref,

  -- Amounts
  t.amount_in_cents                                  AS amount_cents,
  CASE
    WHEN t.state = 'succeeded' AND t.action  = 'refund' THEN -t.amount_in_cents
    WHEN t.state = 'succeeded' AND t.action <> 'refund' THEN  t.amount_in_cents
    ELSE 0
  END                                                AS amount_signed_cents,
  t.currency,
  COALESCE(t.sales_tax_in_cents, 0)                  AS sales_tax_cents,

  -- Payment meta
  t.state,
  t.action,
  t.provider,
  t.payment_type                                     AS transaction_payment_type,
  inst.installment_n,

  -- Dates
  t.created_at                                       AS occurred_at,

  -- Flags
  (t.state = 'succeeded' AND t.action <> 'refund')   AS is_successful_charge,
  (t.state = 'succeeded' AND t.action  = 'refund')   AS is_refund,
  (t.state = 'failed')                               AS is_failed,

  -- Audit
  t.synced_at                                        AS last_synced_from_kajabi_at

FROM raw.kajabi_transactions t
LEFT JOIN installment_numbers inst ON inst.kajabi_id = t.kajabi_id;

COMMENT ON VIEW app.payments IS 'One row per Kajabi transaction (charge / refund / failed). Adds signed amount, installment rank, and convenient boolean flags.';

GRANT SELECT ON app.payments TO service_role;
