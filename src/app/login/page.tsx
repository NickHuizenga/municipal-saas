'use client';

import { useMemo } from 'react';
import { Auth } from '@supabase/auth-ui-react'; // ⬅ no ThemeSupa
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      ),
    []
  );

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Auth
          supabaseClient={supabase}
          view="magic_link"
          // appearance removed (no ThemeSupa)
          redirectTo={redirectTo}
          showLinks={false}
          providers={[]} // email-only
        />
      </div>
    </main>
  );
}
