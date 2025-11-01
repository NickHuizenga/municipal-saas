'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const supabase = createClientComponentClient();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-4 text-center">Sign in</h1>
        <p className="text-sm text-neutral-400 mb-6 text-center">
          Enter your email below to receive a magic link to log in.
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          view="magic_link"
          showLinks={false}
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/tenant/select`}
        />
      </div>
    </div>
  );
}
