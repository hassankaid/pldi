-- ============================================================================
-- Migration: 20260519180011_create_raw_schema_kajabi_tables
--
-- Crée le schéma `raw` qui mirrore les données brutes de l'API Kajabi.
--
-- Conventions:
--   - Une table par entité Kajabi : raw.kajabi_<entity>
--   - kajabi_id (text) en PK (tolérant aux changements de format d'ID)
--   - Champs critiques extraits en colonnes typées (filtres/joins rapides)
--   - JSON brut conservé dans `payload jsonb` (escape hatch, zéro perte data)
--   - synced_at = dernier fetch (upsert idempotent par kajabi_id)
--   - Pas de FK physiques entre raw.* : ingestion order-independent
--   - RLS activée, aucune policy : seul service_role accède (intentionnel)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS raw;
COMMENT ON SCHEMA raw IS 'Raw, immutable copies of source data from Kajabi API. Idempotent upserts by kajabi_id.';

-- ============================================================================
-- Sync runs log
-- ============================================================================
CREATE TABLE raw.sync_runs (
  id           bigserial PRIMARY KEY,
  entity       text NOT NULL CHECK (entity IN ('offers','purchases','transactions','contacts')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  rows_synced  integer,
  status       text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error','partial')),
  error_msg    text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ON raw.sync_runs (entity, started_at DESC);
ALTER TABLE raw.sync_runs ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE raw.sync_runs IS 'Audit log of each backfill/sync execution per entity.';

-- ============================================================================
-- Offers
-- ============================================================================
CREATE TABLE raw.kajabi_offers (
  kajabi_id          text PRIMARY KEY,
  title              text,
  internal_title     text,
  description        text,
  currency           text,
  price_in_cents     bigint,
  payment_type       text,
  payment_method     text,
  price_description  text,
  recurring_offer    boolean,
  subscription       boolean,
  one_time           boolean,
  single             boolean,
  free               boolean,
  token              text,
  checkout_url       text,
  image_url          text,
  site_id            text,
  product_ids        text[],
  payload            jsonb NOT NULL,
  synced_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON raw.kajabi_offers (payment_type);
CREATE INDEX ON raw.kajabi_offers (site_id);
ALTER TABLE raw.kajabi_offers ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE raw.kajabi_offers IS 'Raw Kajabi offers (products in catalog).';
COMMENT ON COLUMN raw.kajabi_offers.internal_title IS 'Manually maintained internal name -- often more reliable than public title.';
COMMENT ON COLUMN raw.kajabi_offers.price_in_cents IS 'TOTAL price of the offer (sum of all installments for a payment plan).';
COMMENT ON COLUMN raw.kajabi_offers.payment_type IS 'Kajabi type: multipay (= payment plan), one_time, subscription, single, free.';

-- ============================================================================
-- Purchases
-- ============================================================================
CREATE TABLE raw.kajabi_purchases (
  kajabi_id                     text PRIMARY KEY,
  amount_in_cents               bigint,
  payment_type                  text,
  multipay_payments_made        integer,
  currency                      text,
  effective_start_at            timestamptz,
  cardholder_name               text,
  billing_address_zip           text,
  deactivated_at                timestamptz,
  deactivation_reason           text,
  source                        text,
  referrer                      text,
  quantity                      integer,
  coupon_code                   text,
  created_at                    timestamptz,
  updated_at                    timestamptz,
  customer_id                   text,
  offer_id                      text,
  product_ids                   text[],
  transaction_ids               text[],
  raw_extra_contact_information jsonb,
  payload                       jsonb NOT NULL,
  synced_at                     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON raw.kajabi_purchases (customer_id);
CREATE INDEX ON raw.kajabi_purchases (offer_id);
CREATE INDEX ON raw.kajabi_purchases (created_at);
CREATE INDEX ON raw.kajabi_purchases (deactivated_at) WHERE deactivated_at IS NOT NULL;
CREATE INDEX ON raw.kajabi_purchases (payment_type);
ALTER TABLE raw.kajabi_purchases ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE raw.kajabi_purchases IS 'Raw Kajabi purchases (one row per sale = customer + offer).';
COMMENT ON COLUMN raw.kajabi_purchases.amount_in_cents IS 'Amount of ONE installment (for multipay), or full price (one_time).';
COMMENT ON COLUMN raw.kajabi_purchases.multipay_payments_made IS 'Number of successful installments paid so far.';
COMMENT ON COLUMN raw.kajabi_purchases.deactivation_reason IS 'Why a plan was stopped: admin, customer, refund, churn, etc.';

-- ============================================================================
-- Transactions
-- ============================================================================
CREATE TABLE raw.kajabi_transactions (
  kajabi_id        text PRIMARY KEY,
  action           text,
  state            text,
  amount_in_cents  bigint,
  currency         text,
  created_at       timestamptz,
  updated_at       timestamptz,
  purchase_id      text,
  customer_id      text,
  offer_id         text,
  payload          jsonb NOT NULL,
  synced_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON raw.kajabi_transactions (purchase_id);
CREATE INDEX ON raw.kajabi_transactions (customer_id);
CREATE INDEX ON raw.kajabi_transactions (created_at);
CREATE INDEX ON raw.kajabi_transactions (state);
CREATE INDEX ON raw.kajabi_transactions (action);
ALTER TABLE raw.kajabi_transactions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE raw.kajabi_transactions IS 'Raw Kajabi transactions (= individual charges: success / fail / refund).';
COMMENT ON COLUMN raw.kajabi_transactions.action IS 'Type of charge: subscription_charge, refund, etc.';
COMMENT ON COLUMN raw.kajabi_transactions.state IS 'Result: succeeded, failed, etc.';

-- ============================================================================
-- Contacts
-- ============================================================================
CREATE TABLE raw.kajabi_contacts (
  kajabi_id          text PRIMARY KEY,
  name               text,
  email              text,
  phone_number       text,
  address_line_1     text,
  address_line_2     text,
  address_city       text,
  address_country    text,
  address_state      text,
  address_zip        text,
  business_number    text,
  subscribed         boolean,
  external_user_id   text,
  created_at         timestamptz,
  updated_at         timestamptz,
  customer_id        text,
  site_id            text,
  tag_ids            text[],
  payload            jsonb NOT NULL,
  synced_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON raw.kajabi_contacts (lower(email));
CREATE INDEX ON raw.kajabi_contacts (customer_id);
CREATE INDEX ON raw.kajabi_contacts (created_at);
ALTER TABLE raw.kajabi_contacts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE raw.kajabi_contacts IS 'Raw Kajabi contacts (marketing-side record); linked to customers via customer_id.';

-- ============================================================================
-- Grants
-- ============================================================================
GRANT USAGE ON SCHEMA raw TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA raw TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA raw TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA raw GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA raw GRANT ALL ON SEQUENCES TO service_role;
