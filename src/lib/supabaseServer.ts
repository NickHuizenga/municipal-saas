// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client for use in App Router
 * (server components, server actions, etc.).
 *
 * Uses the request cookies so auth sessions work on the server.
 */
export function getSupabaseServer() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // cookies() is read-only in some runtimes (edge) – ignore
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ignore
          }
        },
      },
    }
  );

  return supabase;
}
