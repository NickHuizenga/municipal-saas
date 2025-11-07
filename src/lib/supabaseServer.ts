// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for Next.js App Router.
 * - Uses @supabase/ssr to bind to the request/response cookie store.
 * - Safe to call in server components, route handlers, and server actions.
 * - IMPORTANT: no global caching; we create a fresh client per request so
 *   cookies are always in sync (otherwise login / session checks break).
 */
export function getSupabaseServer(): SupabaseClient {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  return supabase;
}
