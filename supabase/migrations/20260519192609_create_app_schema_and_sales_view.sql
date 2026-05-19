-- ============================================================================
-- Migration: 20260519192609_create_app_schema_and_sales_view
--
-- Crée le schéma `app` (couche métier) et la vue `app.sales` qui projette
-- raw.kajabi_purchases enrichi des agrégats de paiements (raw.kajabi_transactions).
--
-- Décision architecturale (validée avec Hassan le 2026-05-19):
--   - La "vérité comptable" vit dans raw.kajabi_purchases (amount, payment_type,
--     dates -- figés au moment de la vente).
--   - raw.kajabi_offers est utilisé UNIQUEMENT comme libellé snapshot. Pas la
--     source de vérité financière (les offres peuvent muter dans le temps).
--
-- state_business (v1) -- à enrichir avec payment_schedule plus tard:
--   refunded  : refund émis et net collecté <= 0
--   defaulted : deactivation_reason = 'failed_payment'
--   canceled  : purchase désactivé (autres raisons)
--   completed : single/free avec >=1 paiement réussi
--   active    : tout le reste
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app;
COMMENT ON SCHEMA app IS 'Business layer: normalized views built on top of raw.*. Reflects business reality, not API structure.';

GRANT USAGE ON SCHEMA app TO service_role;

-- ============================================================================
-- app.sales -- one row per sale (= purchase)
-- ============================================================================

CREATE OR REPLACE VIEW app.sales AS
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
    MAX(created_at)                                                            AS last_payment_attempt_at
  FROM raw.kajabi_transactions
  WHERE purchase_id IS NOT NULL
  GROUP BY purchase_id
)
SELECT
  -- Identity
  p.kajabi_id                                  AS sale_id,
  p.customer_id,
  p.offer_id                                   AS offer_kajabi_id_ref,
  o.internal_title                             AS offer_label_snapshot,
  o.title                                      AS offer_title_public_snapshot,

  -- Locked at sale time
  p.amount_in_cents                            AS amount_per_installment_cents,
  p.currency,
  p.payment_type,
  p.coupon_code,

  -- Progress (from Kajabi)
  COALESCE(p.multipay_payments_made, 0)        AS installments_made_kajabi,

  -- Payment aggregates (computed from raw.kajabi_transactions)
  COALESCE(sp.payments_succeeded, 0)           AS payments_succeeded,
  COALESCE(sp.payments_failed, 0)              AS payments_failed,
  COALESCE(sp.refunds_count, 0)                AS refunds_count,
  sp.net_collected_cents,
  sp.refund_cents,

  -- Dates
  p.created_at                                 AS sold_at,
  p.effective_start_at,
  p.deactivated_at,
  p.deactivation_reason,
  sp.last_succeeded_at,
  sp.last_failed_at,
  sp.last_payment_attempt_at,

  -- Business state
  CASE
    WHEN COALESCE(sp.refunds_count, 0) > 0 AND COALESCE(sp.net_collected_cents, 0) <= 0
      THEN 'refunded'
    WHEN p.deactivation_reason = 'failed_payment'
      THEN 'defaulted'
    WHEN p.deactivated_at IS NOT NULL
      THEN 'canceled'
    WHEN p.payment_type IN ('single', 'free') AND COALESCE(sp.payments_succeeded, 0) > 0
      THEN 'completed'
    ELSE 'active'
  END                                          AS state_business,

  -- Audit
  p.source                                     AS kajabi_source,
  p.synced_at                                  AS last_synced_from_kajabi_at

FROM raw.kajabi_purchases p
LEFT JOIN sale_payments sp    ON sp.purchase_id = p.kajabi_id
LEFT JOIN raw.kajabi_offers o ON o.kajabi_id    = p.offer_id;

COMMENT ON VIEW app.sales IS 'One row per sale (= Kajabi purchase). Aggregates payments and computes business state.';

GRANT SELECT ON app.sales TO service_role;
