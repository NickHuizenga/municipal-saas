// src/app/login/page.tsx
'use client';

import { useMemo } from 'react';
import { Auth, ThemeSupa } from '@supabase/auth-ui-react';
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

  // Must point to a real callback route that exchanges the code for a session
  const redirectTo =
    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Auth
          supabaseClient={supabase}
          view="magic_link"
          appearance={{ theme: ThemeSupa }}
          redirectTo={redirectTo}
          showLinks={false}
          providers={[]} // email-only (magic link)
        />
      </div>
    </main>
  );
}
