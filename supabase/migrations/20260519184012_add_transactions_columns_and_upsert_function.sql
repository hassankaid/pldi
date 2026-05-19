-- ============================================================================
-- Migration: 20260519184012_add_transactions_columns_and_upsert_function
--
-- Adds columns to raw.kajabi_transactions observed in real API responses
-- (not visible during initial discovery) and creates the upsert RPC.
--
-- Note: transaction JSON does NOT include a purchase_id relationship.
-- It is derived post-insert via:
--   WITH mapping AS (
--     SELECT unnest(transaction_ids) AS tx_id, kajabi_id AS purchase_id
--     FROM raw.kajabi_purchases
--   )
--   UPDATE raw.kajabi_transactions t
--   SET purchase_id = m.purchase_id
--   FROM mapping m
--   WHERE t.kajabi_id = m.tx_id;
-- ============================================================================

-- New columns observed in actual transaction payloads
ALTER TABLE raw.kajabi_transactions
  ADD COLUMN IF NOT EXISTS provider           text,
  ADD COLUMN IF NOT EXISTS sales_tax_in_cents bigint,
  ADD COLUMN IF NOT EXISTS payment_type       text;

CREATE INDEX IF NOT EXISTS kajabi_transactions_provider_idx
  ON raw.kajabi_transactions (provider);

COMMENT ON COLUMN raw.kajabi_transactions.provider IS 'Payment provider: Stripe, PayPal.';
COMMENT ON COLUMN raw.kajabi_transactions.sales_tax_in_cents IS 'Sales tax for this charge (usually 0 in this dataset).';
COMMENT ON COLUMN raw.kajabi_transactions.payment_type IS 'Transaction-level type (e.g., "multi", "single").';

-- ============================================================================
-- public.upsert_kajabi_transactions(jsonb)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_kajabi_transactions(data jsonb)
RETURNS integer
LANGUAGE sql
AS $func$
  WITH ins AS (
    INSERT INTO raw.kajabi_transactions (
      kajabi_id, action, state, payment_type, amount_in_cents,
      sales_tax_in_cents, currency, provider,
      created_at, updated_at,
      customer_id, offer_id, payload
    )
    SELECT
      o->>'id',
      o->'attributes'->>'action',
      o->'attributes'->>'state',
      o->'attributes'->>'payment_type',
      NULLIF(o->'attributes'->>'amount_in_cents','')::bigint,
      NULLIF(o->'attributes'->>'sales_tax_in_cents','')::bigint,
      o->'attributes'->>'currency',
      o->'attributes'->>'provider',
      NULLIF(o->'attributes'->>'created_at','')::timestamptz,
      NULLIF(o->'attributes'->>'updated_at','')::timestamptz,
      o->'relationships'->'customer'->'data'->>'id',
      o->'relationships'->'offer'->'data'->>'id',
      o
    FROM jsonb_array_elements(data) o
    ON CONFLICT (kajabi_id) DO UPDATE SET
      action             = EXCLUDED.action,
      state              = EXCLUDED.state,
      payment_type       = EXCLUDED.payment_type,
      amount_in_cents    = EXCLUDED.amount_in_cents,
      sales_tax_in_cents = EXCLUDED.sales_tax_in_cents,
      currency           = EXCLUDED.currency,
      provider           = EXCLUDED.provider,
      created_at         = EXCLUDED.created_at,
      updated_at         = EXCLUDED.updated_at,
      customer_id        = EXCLUDED.customer_id,
      offer_id           = EXCLUDED.offer_id,
      payload            = EXCLUDED.payload,
      synced_at          = now()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM ins;
$func$;

COMMENT ON FUNCTION public.upsert_kajabi_transactions(jsonb) IS
  'Idempotent UPSERT of Kajabi transactions. purchase_id is populated post-insert via separate UPDATE.';

REVOKE ALL ON FUNCTION public.upsert_kajabi_transactions(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_kajabi_transactions(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_kajabi_transactions(jsonb) TO service_role;
