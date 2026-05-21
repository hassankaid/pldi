-- ============================================================================
-- Migration: expose `app` schema to PostgREST so the Next.js frontend can
-- query app.* views via .schema('app') in supabase-js.
--
-- Without this, only `public` is exposed and the API returns 404 on app.*
-- ============================================================================

GRANT USAGE ON SCHEMA app TO authenticator;

-- Persist the schema list in the authenticator role's GUC.
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, app';

-- Reload PostgREST so the change takes effect immediately.
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
