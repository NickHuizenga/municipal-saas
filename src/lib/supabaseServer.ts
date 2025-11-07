// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Server-side Supabase client for Next.js App Router.
 * - Uses @supabase/ssr to bind to the request/response cookie store.
 * - Safe to call in server components, route handlers, and server actions.
 * - In non-production, logs the current user + tenant_id for debugging.
 */
export function getSupabaseServer(): SupabaseClient {
  // Simple singleton per request context to avoid re-creating the client
  if (cachedClient) {
    return cachedClient;
  }

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

  // Lightweight debug logging so we can see SSR context if something goes weird.
  if (process.env.NODE_ENV !== "production") {
    const tenantId = cookieStore.get("tenant_id")?.value;

    // Fire-and-forget; we don't await inside this helper.
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.log("[supabaseServer] getSession error:", error.message);
          return;
        }

        const userId = data.session?.user?.id ?? null;

        console.log(
          "[supabaseServer] SSR context",
          JSON.stringify(
            {
              userId,
              tenantId,
            },
            null,
            2
          )
        );
      })
      .catch((err) => {
        console.log("[supabaseServer] getSession threw:", err);
      });
  }

  cachedClient = supabase;
  return supabase;
}
