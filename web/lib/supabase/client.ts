import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Use in Client Components.
 * Uses the publishable (anon) key — safe to expose.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
