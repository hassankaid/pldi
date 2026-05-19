-- ============================================================================
-- Migration: 20260519195143_recreate_app_payment_schedule_v2_with_title_parsing
--
-- Améliore la couverture du payment_schedule (51% -> 67%) en parsant le format
-- "(N x M€)" depuis offer.internal_title, validé par match du per-installment
-- amount avec purchase.amount_per_installment_cents.
--
-- DROP/CREATE car nouvelle colonne `planned_source` ajoutée -- CREATE OR REPLACE
-- ne permet pas de réordonner les colonnes d'une vue.
--
-- Stratégie:
--   Method A (preferred) : parse "N x M EUR" from internal_title.
--     Valide si parsed_M_cents == purchase.amount_per_installment_cents.
--     -> N est fiable car configuré au moment où l'offre a été créée.
--   Method B (fallback)  : offer.price_in_cents / per_installment.
--     Peut être faux si l'offre a muté depuis la vente.
--   Sinon                : NULL -> sale absente du schedule.
--
-- Résultats validation:
--   v1 (ratio only) : 257/500 = 51%, 132k EUR paid, 131 impayés
--   v2 (title+ratio): 334/500 = 67%, 225k EUR paid, 175 impayés
--
-- planned_source ('title' | 'ratio') exposée pour debug et reporting qualité.
-- ============================================================================

DROP VIEW IF EXISTS app.payment_schedule;

CREATE VIEW app.payment_schedule AS
WITH parsed_title AS (
  SELECT
    o.kajabi_id AS offer_id,
    CASE
      WHEN o.internal_title ~* '\d+\s*[xX×]\s*\d+(?:[,\.]\d+)?\s*[€$£]?'
      THEN substring(o.internal_title from '(\d+)\s*[xX×]\s*\d')::integer
      ELSE NULL
    END AS parsed_n,
    CASE
      WHEN o.internal_title ~* '\d+\s*[xX×]\s*\d+(?:[,\.]\d+)?'
      THEN (
        REPLACE(
          substring(o.internal_title from '\d+\s*[xX×]\s*(\d+(?:[,\.]\d+)?)'),
          ',', '.'
        )::numeric * 100
      )::bigint
      ELSE NULL
    END AS parsed_per_installment_cents
  FROM raw.kajabi_offers o
),
sale_plan AS (
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
      WHEN pt.parsed_n IS NOT NULL
        AND pt.parsed_per_installment_cents = s.amount_per_installment_cents
        AND pt.parsed_n BETWEEN 1 AND 100
      THEN pt.parsed_n
      ELSE NULL
    END AS planned_from_title,
    CASE
      WHEN o.price_in_cents > 0
        AND s.amount_per_installment_cents > 0
        AND o.price_in_cents % s.amount_per_installment_cents = 0
        AND (o.price_in_cents / s.amount_per_installment_cents) BETWEEN 1 AND 100
      THEN (o.price_in_cents / s.amount_per_installment_cents)::integer
      ELSE NULL
    END AS planned_from_ratio,
    CASE
      WHEN pt.parsed_n IS NOT NULL
        AND pt.parsed_per_installment_cents = s.amount_per_installment_cents
        AND pt.parsed_n BETWEEN 1 AND 100
      THEN 'title'
      WHEN o.price_in_cents > 0
        AND s.amount_per_installment_cents > 0
        AND o.price_in_cents % s.amount_per_installment_cents = 0
        AND (o.price_in_cents / s.amount_per_installment_cents) BETWEEN 1 AND 100
      THEN 'ratio'
      ELSE NULL
    END AS planned_source
  FROM app.sales s
  LEFT JOIN raw.kajabi_offers o ON o.kajabi_id = s.offer_kajabi_id_ref
  LEFT JOIN parsed_title pt    ON pt.offer_id  = s.offer_kajabi_id_ref
  WHERE s.payment_type = 'multipay'
),
sale_plan_final AS (
  SELECT
    sp.*,
    COALESCE(sp.planned_from_title, sp.planned_from_ratio) AS planned_installments
  FROM sale_plan sp
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
    sp.planned_source,
    n AS installment_n,
    (COALESCE(sp.effective_start_at, sp.sold_at)::date
       + ((n - 1) || ' months')::interval)::date AS expected_at
  FROM sale_plan_final sp
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
  e.planned_source,
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
  'v2: projection of expected installments. Title parsing (preferred, validated by amount match) + offer price ratio (fallback). planned_source tracks which method was used.';

GRANT SELECT ON app.payment_schedule TO service_role;
