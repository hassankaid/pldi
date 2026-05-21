import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

/**
 * Data Access Layer — single source of truth for "who is logged in".
 *
 * Memoized with React's `cache()` so multiple calls within the same render
 * pass share a single Supabase round-trip.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Throws (via redirect) if the user is not authenticated. Use at the top
 * of any protected Server Component / Action.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
