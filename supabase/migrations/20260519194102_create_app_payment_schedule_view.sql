-- ============================================================================
-- Migration: 20260519194102_create_app_payment_schedule_view
--
-- app.payment_schedule : projection des échéances attendues pour chaque vente
-- multipay, matchées avec les paiements réels (app.payments).
--
-- Algorithme v1:
--   1. Pour chaque sale multipay, planned_installments =
--        offer.price_in_cents / purchase.amount_per_installment_cents
--      Garde-fous: division entière propre, dans [1, 100], NULL sinon.
--   2. Générer N expected rows via generate_series.
--   3. expected_at = effective_start_at + (n-1) mois.
--   4. Matching par installment_n (RANG des paiements réussis).
--   5. Status: paid / scheduled / in_retry (0-7j) / late (8-21j) / missed (22j+) / canceled.
--
-- Couverture v1: ~51% des sales multipay (257/500).
-- Les 49% restants correspondent à des ventes où l'offre a muté depuis l'achat
-- (offer.price_in_cents ne match plus -- exactement le cas signalé par Hassan).
-- A améliorer en v2 via parsing de internal_title.
--
-- Seuils d'impayé paramétrables ici (CASE ci-dessous):
--   in_retry: 0-7 jours, late: 8-21, missed: 22+.
-- ============================================================================

CREATE OR REPLACE VIEW app.payment_schedule AS
WITH sale_plan AS (
  SELECT
    s.sale_id,
    s.sold_at,
    s.effective_start_at,
    s.amount_per_installment_cents,
    s.currency,
    s.deactivated_at,
    s.deactivation_reason,
    s.state_business,
    s.payments_succeeded,
    CASE
      WHEN o.price_in_cents > 0
        AND s.amount_per_installment_cents > 0
        AND o.price_in_cents % s.amount_per_installment_cents = 0
        AND (o.price_in_cents / s.amount_per_installment_cents) BETWEEN 1 AND 100
      THEN (o.price_in_cents / s.amount_per_installment_cents)::integer
      ELSE NULL
    END AS planned_installments
  FROM app.sales s
  LEFT JOIN raw.kajabi_offers o ON o.kajabi_id = s.offer_kajabi_id_ref
  WHERE s.payment_type = 'multipay'
),
expected AS (
  SELECT
    sp.sale_id,
    sp.amount_per_installment_cents,
    sp.currency,
    sp.deactivated_at,
    sp.deactivation_reason,
    sp.state_business,
    sp.planned_installments,
    n AS installment_n,
    (COALESCE(sp.effective_start_at, sp.sold_at)::date
       + ((n - 1) || ' months')::interval)::date AS expected_at
  FROM sale_plan sp
  CROSS JOIN LATERAL generate_series(1, sp.planned_installments) AS n
  WHERE sp.planned_installments IS NOT NULL
)
SELECT
  e.sale_id,
  e.installment_n,
  e.expected_at,
  e.amount_per_installment_cents                                        AS expected_amount_cents,
  e.currency,
  e.planned_installments,
  p.payment_id                                                          AS paid_payment_id,
  p.occurred_at::date                                                   AS paid_at,
  p.amount_signed_cents                                                 AS paid_amount_cents,
  CASE
    WHEN p.occurred_at IS NOT NULL THEN (p.occurred_at::date - e.expected_at)
    ELSE NULL
  END                                                                    AS days_late_paid,
  (e.expected_at - CURRENT_DATE)                                         AS days_until_expected,
  CASE
    WHEN p.payment_id IS NOT NULL                                          THEN 'paid'
    WHEN e.deactivated_at IS NOT NULL
      AND e.expected_at > e.deactivated_at::date                            THEN 'canceled'
    WHEN e.expected_at > CURRENT_DATE                                       THEN 'scheduled'
    WHEN CURRENT_DATE <= e.expected_at + INTERVAL '7 days'                  THEN 'in_retry'
    WHEN CURRENT_DATE <= e.expected_at + INTERVAL '21 days'                 THEN 'late'
    ELSE 'missed'
  END                                                                      AS status
FROM expected e
LEFT JOIN app.payments p
  ON p.sale_id        = e.sale_id
 AND p.installment_n  = e.installment_n
 AND p.is_successful_charge;

COMMENT ON VIEW app.payment_schedule IS
  'Projection of expected installments for multipay sales, matched with actual successful payments. Drives impayes detection.';

GRANT SELECT ON app.payment_schedule TO service_role;
