-- ============================================================================
-- Migration: 20260519183500_create_upsert_kajabi_purchases_function
--
-- Creates public.upsert_kajabi_purchases(jsonb) for idempotent backfill
-- from the local PowerShell loader via PostgREST RPC.
--
-- Service-role only.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_kajabi_purchases(data jsonb)
RETURNS integer
LANGUAGE sql
AS $func$
  WITH ins AS (
    INSERT INTO raw.kajabi_purchases (
      kajabi_id, amount_in_cents, payment_type, multipay_payments_made,
      currency, effective_start_at, cardholder_name, billing_address_zip,
      deactivated_at, deactivation_reason, source, referrer, quantity, coupon_code,
      created_at, updated_at,
      customer_id, offer_id, product_ids, transaction_ids,
      raw_extra_contact_information, payload
    )
    SELECT
      o->>'id',
      NULLIF(o->'attributes'->>'amount_in_cents','')::bigint,
      o->'attributes'->>'payment_type',
      NULLIF(o->'attributes'->>'multipay_payments_made','')::integer,
      o->'attributes'->>'currency',
      NULLIF(o->'attributes'->>'effective_start_at','')::timestamptz,
      o->'attributes'->>'cardholder_name',
      o->'attributes'->>'billing_address_zip',
      NULLIF(o->'attributes'->>'deactivated_at','')::timestamptz,
      o->'attributes'->>'deactivation_reason',
      o->'attributes'->>'source',
      o->'attributes'->>'referrer',
      NULLIF(o->'attributes'->>'quantity','')::integer,
      o->'attributes'->>'coupon_code',
      NULLIF(o->'attributes'->>'created_at','')::timestamptz,
      NULLIF(o->'attributes'->>'updated_at','')::timestamptz,
      o->'relationships'->'customer'->'data'->>'id',
      o->'relationships'->'offer'->'data'->>'id',
      COALESCE(
        ARRAY(SELECT jsonb_array_elements(o->'relationships'->'products'->'data')->>'id'),
        ARRAY[]::text[]
      ),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements(o->'relationships'->'transactions'->'data')->>'id'),
        ARRAY[]::text[]
      ),
      o->'attributes'->'raw_extra_contact_information',
      o
    FROM jsonb_array_elements(data) o
    ON CONFLICT (kajabi_id) DO UPDATE SET
      amount_in_cents               = EXCLUDED.amount_in_cents,
      payment_type                  = EXCLUDED.payment_type,
      multipay_payments_made        = EXCLUDED.multipay_payments_made,
      currency                      = EXCLUDED.currency,
      effective_start_at            = EXCLUDED.effective_start_at,
      cardholder_name               = EXCLUDED.cardholder_name,
      billing_address_zip           = EXCLUDED.billing_address_zip,
      deactivated_at                = EXCLUDED.deactivated_at,
      deactivation_reason           = EXCLUDED.deactivation_reason,
      source                        = EXCLUDED.source,
      referrer                      = EXCLUDED.referrer,
      quantity                      = EXCLUDED.quantity,
      coupon_code                   = EXCLUDED.coupon_code,
      created_at                    = EXCLUDED.created_at,
      updated_at                    = EXCLUDED.updated_at,
      customer_id                   = EXCLUDED.customer_id,
      offer_id                      = EXCLUDED.offer_id,
      product_ids                   = EXCLUDED.product_ids,
      transaction_ids               = EXCLUDED.transaction_ids,
      raw_extra_contact_information = EXCLUDED.raw_extra_contact_information,
      payload                       = EXCLUDED.payload,
      synced_at                     = now()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM ins;
$func$;

COMMENT ON FUNCTION public.upsert_kajabi_purchases(jsonb) IS
  'Idempotent UPSERT of Kajabi purchases from a JSONB array. Service-role only.';

REVOKE ALL ON FUNCTION public.upsert_kajabi_purchases(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_kajabi_purchases(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_kajabi_purchases(jsonb) TO service_role;
