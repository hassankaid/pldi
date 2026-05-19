-- ============================================================================
-- Migration: create_upsert_kajabi_contacts_function
--
-- public.upsert_kajabi_contacts(jsonb) for idempotent backfill via PostgREST RPC.
-- Service-role only.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_kajabi_contacts(data jsonb)
RETURNS integer
LANGUAGE sql
AS $func$
  WITH ins AS (
    INSERT INTO raw.kajabi_contacts (
      kajabi_id, name, email, phone_number,
      address_line_1, address_line_2, address_city,
      address_country, address_state, address_zip,
      business_number, subscribed, external_user_id,
      created_at, updated_at,
      customer_id, site_id, tag_ids, payload
    )
    SELECT
      o->>'id',
      o->'attributes'->>'name',
      o->'attributes'->>'email',
      o->'attributes'->>'phone_number',
      o->'attributes'->>'address_line_1',
      o->'attributes'->>'address_line_2',
      o->'attributes'->>'address_city',
      o->'attributes'->>'address_country',
      o->'attributes'->>'address_state',
      o->'attributes'->>'address_zip',
      o->'attributes'->>'business_number',
      (o->'attributes'->>'subscribed')::boolean,
      o->'attributes'->>'external_user_id',
      NULLIF(o->'attributes'->>'created_at','')::timestamptz,
      NULLIF(o->'attributes'->>'updated_at','')::timestamptz,
      o->'relationships'->'customer'->'data'->>'id',
      o->'relationships'->'site'->'data'->>'id',
      COALESCE(
        ARRAY(SELECT jsonb_array_elements(o->'relationships'->'tags'->'data')->>'id'),
        ARRAY[]::text[]
      ),
      o
    FROM jsonb_array_elements(data) o
    ON CONFLICT (kajabi_id) DO UPDATE SET
      name             = EXCLUDED.name,
      email            = EXCLUDED.email,
      phone_number     = EXCLUDED.phone_number,
      address_line_1   = EXCLUDED.address_line_1,
      address_line_2   = EXCLUDED.address_line_2,
      address_city     = EXCLUDED.address_city,
      address_country  = EXCLUDED.address_country,
      address_state    = EXCLUDED.address_state,
      address_zip      = EXCLUDED.address_zip,
      business_number  = EXCLUDED.business_number,
      subscribed       = EXCLUDED.subscribed,
      external_user_id = EXCLUDED.external_user_id,
      created_at       = EXCLUDED.created_at,
      updated_at       = EXCLUDED.updated_at,
      customer_id      = EXCLUDED.customer_id,
      site_id          = EXCLUDED.site_id,
      tag_ids          = EXCLUDED.tag_ids,
      payload          = EXCLUDED.payload,
      synced_at        = now()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM ins;
$func$;

COMMENT ON FUNCTION public.upsert_kajabi_contacts(jsonb) IS
  'Idempotent UPSERT of Kajabi contacts from a JSONB array. Service-role only.';

REVOKE ALL ON FUNCTION public.upsert_kajabi_contacts(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_kajabi_contacts(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_kajabi_contacts(jsonb) TO service_role;
