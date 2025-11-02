// Server-side Supabase client helper for Next.js App Router
// Works across @supabase/ssr versions by providing get/set/remove methods.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          // ensure the return type is void to satisfy the expected signature
          cookieStore.set({ name, value, ...(options || {}) });
          return;
        },
        remove(name: string, options?: any) {
          cookieStore.set({ name, value: "", ...(options || {}), maxAge: 0 });
          return;
        },
      } as any,
    } as any
  );
}
