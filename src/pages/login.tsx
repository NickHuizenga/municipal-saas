'use client';

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const Page: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h1 className="text-xl font-semibold mb-3">Sign in</h1>
        <p className="text-sm text-neutral-400 mb-4">
          Enter your email and we’ll send you a magic link.
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#10b981', brandAccent: '#34d399' } } } }}
          providers={[]}
          view="magic_link"
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/tenant/select`}
          showLinks={false}
        />
      </div>
    </div>
  );
};

export default Page;
