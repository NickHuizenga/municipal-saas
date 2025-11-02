// Server-side Supabase client for App Router (uses cookies)
// Works with @supabase/ssr 0.0.10 (the version we pinned)

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function getSupabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { cookies: () => cookies() }
  );
}
