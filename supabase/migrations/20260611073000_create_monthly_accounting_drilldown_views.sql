-- ============================================================================
-- Vues pour la compta mensuelle précise + drill-down (mois & client).
-- Définitions VÉRIFIÉES adversarialement (réconciliation exacte avec
-- app.v_revenue_monthly, 0 double comptage).
--
--  1. app.v_month_accounting     : 1 ligne/mois, KPI cash (factuel) + schedule
--                                  (estimé). Frontend: .eq('month', 'YYYY-MM-01').
--  2. app.v_payment_detail       : 1 ligne/transaction enrichie (offre+client)
--                                  pour les listes drill-down d'un mois.
--  3. app.v_schedule_detail      : échéances projetées enrichies (à venir/retard).
--  4. app.v_customer_punctuality : agrégat ponctualité par client.
--  5. app.v_customer_timeline    : flux chronologique GLOBAL d'un client,
--                                  incluant les ventes SANS schedule (abonnements
--                                  / multipay non couvert) via UNION ALL.
-- ============================================================================

CREATE OR REPLACE VIEW app.v_month_accounting AS
WITH cash AS (
  SELECT
    date_trunc('month', occurred_at)::date AS month,
    round(sum(amount_signed_cents) FILTER (WHERE is_successful_charge)/100.0, 2) AS ca_brut_eur,
    count(*)                       FILTER (WHERE is_successful_charge)            AS succeeded_count,
    round(sum(amount_cents)        FILTER (WHERE is_refund)/100.0, 2)            AS refund_eur,
    count(*)                       FILTER (WHERE is_refund)                       AS refund_count,
    round(sum(amount_signed_cents) FILTER (WHERE state = 'succeeded')/100.0, 2)  AS ca_net_eur,
    count(*)                       FILTER (WHERE is_failed)                       AS failed_count,
    round(sum(amount_cents)        FILTER (WHERE is_failed)/100.0, 2)            AS failed_attempted_eur
  FROM app.payments
  GROUP BY 1
),
sched AS (
  SELECT
    date_trunc('month', expected_at)::date AS month,
    round(sum(expected_amount_cents) FILTER (WHERE status = 'scheduled')/100.0, 2) AS a_venir_est_eur,
    count(*)                          FILTER (WHERE status = 'scheduled')          AS a_venir_est_count,
    round(sum(expected_amount_cents) FILTER (WHERE status IN ('in_retry','late','missed'))/100.0, 2) AS en_retard_est_eur,
    count(*)                          FILTER (WHERE status IN ('in_retry','late','missed'))           AS en_retard_est_count
  FROM app.payment_schedule
  GROUP BY 1
)
SELECT
  COALESCE(c.month, s.month)                          AS month,
  COALESCE(c.ca_net_eur, 0)                           AS ca_net_eur,
  COALESCE(c.ca_brut_eur, 0)                          AS ca_brut_eur,
  COALESCE(c.succeeded_count, 0)                      AS succeeded_count,
  COALESCE(c.refund_eur, 0)                           AS refund_eur,
  COALESCE(c.refund_count, 0)                         AS refund_count,
  COALESCE(c.failed_count, 0)                         AS failed_count,
  COALESCE(c.failed_attempted_eur, 0)                 AS failed_attempted_eur,
  COALESCE(s.a_venir_est_eur, 0)                      AS a_venir_est_eur,
  COALESCE(s.a_venir_est_count, 0)                    AS a_venir_est_count,
  COALESCE(s.en_retard_est_eur, 0)                    AS en_retard_est_eur,
  COALESCE(s.en_retard_est_count, 0)                  AS en_retard_est_count,
  CASE
    WHEN (COALESCE(c.month, s.month) + interval '1 month' + interval '21 days')::date <= CURRENT_DATE
    THEN 'finalized' ELSE 'provisional'
  END                                                 AS revenue_status,
  (COALESCE(c.month, s.month) + interval '1 month' + interval '21 days')::date AS finalized_at
FROM cash c
FULL OUTER JOIN sched s ON c.month = s.month;

COMMENT ON VIEW app.v_month_accounting IS
  'One row per month: cash KPIs (factual, app.payments) + projected KPIs (estimated, app.payment_schedule). Reconciles exactly with app.v_revenue_monthly.';

CREATE OR REPLACE VIEW app.v_payment_detail AS
SELECT
  p.payment_id, p.sale_id, p.customer_id,
  c.name AS customer_name, c.email AS customer_email,
  s.offer_label_snapshot, s.payment_type,
  p.installment_n, p.amount_cents, p.amount_signed_cents,
  p.currency, p.provider, p.action, p.state, p.occurred_at,
  p.is_successful_charge, p.is_refund, p.is_failed
FROM app.payments p
LEFT JOIN app.sales s          ON s.sale_id     = p.sale_id
LEFT JOIN raw.kajabi_contacts c ON c.customer_id = p.customer_id;

COMMENT ON VIEW app.v_payment_detail IS
  'Transactions enrichies (offre + client) pour le drill-down mensuel.';

CREATE OR REPLACE VIEW app.v_schedule_detail AS
SELECT
  ps.sale_id, s.customer_id,
  c.name AS customer_name, c.email AS customer_email,
  s.offer_label_snapshot, s.payment_type,
  ps.installment_n, ps.planned_installments, ps.planned_source,
  ps.expected_at, ps.expected_amount_cents, ps.paid_at, ps.paid_amount_cents,
  ps.days_late_paid, ps.days_until_expected, ps.status
FROM app.payment_schedule ps
LEFT JOIN app.sales s           ON s.sale_id     = ps.sale_id
LEFT JOIN raw.kajabi_contacts c ON c.customer_id = s.customer_id;

COMMENT ON VIEW app.v_schedule_detail IS
  'Échéances projetées enrichies (offre + client) pour la liste à venir/en retard du mois.';

CREATE OR REPLACE VIEW app.v_customer_punctuality AS
WITH plan AS (
  SELECT DISTINCT ps.sale_id, s.customer_id, ps.planned_installments
  FROM app.payment_schedule ps
  JOIN app.sales s ON s.sale_id = ps.sale_id
),
plan_agg AS (
  SELECT customer_id, count(*) AS plans_count, sum(planned_installments) AS total_planned
  FROM plan GROUP BY customer_id
),
ech AS (
  SELECT
    s.customer_id,
    count(*) FILTER (WHERE ps.status = 'paid')                                    AS installments_paid,
    count(*) FILTER (WHERE ps.status = 'paid' AND COALESCE(ps.days_late_paid,0) <= 0) AS paid_on_time,
    count(*) FILTER (WHERE ps.status = 'paid' AND ps.days_late_paid > 0)          AS paid_late,
    count(*) FILTER (WHERE ps.status IN ('in_retry','late','missed'))             AS overdue_count,
    round(sum(ps.expected_amount_cents) FILTER (WHERE ps.status IN ('in_retry','late','missed'))/100.0, 2) AS overdue_eur,
    greatest(0, COALESCE(max(ps.days_late_paid) FILTER (WHERE ps.status = 'paid'), 0)) AS worst_days_late
  FROM app.payment_schedule ps
  JOIN app.sales s ON s.sale_id = ps.sale_id
  GROUP BY s.customer_id
)
SELECT
  e.customer_id, pa.plans_count, pa.total_planned,
  e.installments_paid, e.paid_on_time, e.paid_late,
  e.overdue_count, e.overdue_eur, e.worst_days_late
FROM ech e
JOIN plan_agg pa ON pa.customer_id = e.customer_id;

COMMENT ON VIEW app.v_customer_punctuality IS
  'Ponctualité par client sur les plans multipay couverts (avancement, à temps vs retard, risque actuel).';

CREATE OR REPLACE VIEW app.v_customer_timeline AS
SELECT
  s.customer_id, 'schedule'::text AS source, ps.sale_id,
  s.offer_label_snapshot, s.payment_type,
  ps.installment_n, ps.planned_installments,
  ps.expected_at AS event_date, ps.expected_amount_cents AS amount_cents,
  ps.paid_at, ps.paid_amount_cents, ps.days_late_paid, ps.status, ps.planned_source
FROM app.payment_schedule ps
JOIN app.sales s ON s.sale_id = ps.sale_id
UNION ALL
SELECT
  p.customer_id, 'payment'::text AS source, p.sale_id,
  s.offer_label_snapshot, s.payment_type,
  p.installment_n, NULL::int,
  p.occurred_at::date AS event_date, p.amount_cents,
  p.occurred_at::date AS paid_at, p.amount_signed_cents, NULL::int,
  'paid'::text, NULL::text
FROM app.payments p
JOIN app.sales s ON s.sale_id = p.sale_id
WHERE p.is_successful_charge
  AND NOT EXISTS (SELECT 1 FROM app.payment_schedule ps2 WHERE ps2.sale_id = p.sale_id);

COMMENT ON VIEW app.v_customer_timeline IS
  'Flux chronologique global par client. Inclut échéances projetées ET charges réelles des ventes sans schedule (abonnements, multipay non couvert).';

GRANT SELECT ON app.v_month_accounting     TO service_role;
GRANT SELECT ON app.v_payment_detail       TO service_role;
GRANT SELECT ON app.v_schedule_detail      TO service_role;
GRANT SELECT ON app.v_customer_punctuality TO service_role;
GRANT SELECT ON app.v_customer_timeline    TO service_role;
