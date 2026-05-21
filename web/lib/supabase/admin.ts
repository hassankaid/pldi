import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * Use ONLY in Server Components / Server Actions to query the data layer
 * (raw.*, app.*) which is locked down to service_role.
 *
 * NEVER import this from a Client Component — would leak the key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
    );
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "app" },
  });
}

/**
 * Same as createAdminClient() but explicitly targets the `public` schema
 * (used for RPC calls like public.upsert_kajabi_*).
 */
export function createAdminClientPublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
