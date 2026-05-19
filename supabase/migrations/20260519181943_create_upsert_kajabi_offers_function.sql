-- ============================================================================
-- Migration: 20260519181943_create_upsert_kajabi_offers_function
--
-- Creates public.upsert_kajabi_offers(jsonb) for idempotent backfill from
-- the local PowerShell loader via PostgREST RPC.
--
-- Service-role only (REVOKE FROM PUBLIC, anon, authenticated; GRANT to service_role).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_kajabi_offers(data jsonb)
RETURNS integer
LANGUAGE sql
AS $func$
  WITH ins AS (
    INSERT INTO raw.kajabi_offers (
      kajabi_id, title, internal_title, description, currency,
      price_in_cents, payment_type, payment_method, price_description,
      recurring_offer, subscription, one_time, single, free,
      token, checkout_url, image_url, site_id, product_ids, payload
    )
    SELECT
      o->>'id',
      o->'attributes'->>'title',
      o->'attributes'->>'internal_title',
      o->'attributes'->>'description',
      o->'attributes'->>'currency',
      NULLIF(o->'attributes'->>'price_in_cents','')::bigint,
      o->'attributes'->>'payment_type',
      o->'attributes'->>'payment_method',
      o->'attributes'->>'price_description',
      (o->'attributes'->>'recurring_offer')::boolean,
      (o->'attributes'->>'subscription')::boolean,
      (o->'attributes'->>'one_time')::boolean,
      (o->'attributes'->>'single')::boolean,
      (o->'attributes'->>'free')::boolean,
      o->'attributes'->>'token',
      o->'attributes'->>'checkout_url',
      o->'attributes'->>'image_url',
      o->'relationships'->'site'->'data'->>'id',
      COALESCE(
        ARRAY(SELECT jsonb_array_elements(o->'relationships'->'products'->'data')->>'id'),
        ARRAY[]::text[]
      ),
      o
    FROM jsonb_array_elements(data) o
    ON CONFLICT (kajabi_id) DO UPDATE SET
      title             = EXCLUDED.title,
      internal_title    = EXCLUDED.internal_title,
      description       = EXCLUDED.description,
      currency          = EXCLUDED.currency,
      price_in_cents    = EXCLUDED.price_in_cents,
      payment_type      = EXCLUDED.payment_type,
      payment_method    = EXCLUDED.payment_method,
      price_description = EXCLUDED.price_description,
      recurring_offer   = EXCLUDED.recurring_offer,
      subscription      = EXCLUDED.subscription,
      one_time          = EXCLUDED.one_time,
      single            = EXCLUDED.single,
      free              = EXCLUDED.free,
      token             = EXCLUDED.token,
      checkout_url      = EXCLUDED.checkout_url,
      image_url         = EXCLUDED.image_url,
      site_id           = EXCLUDED.site_id,
      product_ids       = EXCLUDED.product_ids,
      payload           = EXCLUDED.payload,
      synced_at         = now()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM ins;
$func$;

COMMENT ON FUNCTION public.upsert_kajabi_offers(jsonb) IS
  'Idempotent UPSERT of Kajabi offers from a JSONB array. Service-role only.';

REVOKE ALL ON FUNCTION public.upsert_kajabi_offers(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_kajabi_offers(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_kajabi_offers(jsonb) TO service_role;
