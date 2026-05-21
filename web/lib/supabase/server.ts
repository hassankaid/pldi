import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client tied to the user's session via cookies.
 * Use in Server Components, Server Actions, and Route Handlers when you
 * want to act on behalf of the authenticated user (RLS-aware).
 *
 * Next.js 16: cookies() is async — always await.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — fine when proxy.ts
            // is refreshing sessions on each request.
          }
        },
      },
    },
  );
}
