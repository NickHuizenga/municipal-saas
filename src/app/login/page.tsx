'use client';

import { useMemo, useState } from 'react';
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

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`; // must exist

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // lightweight email sanity check
    const ok = /\S+@\S+\.\S+/.test(email);
    if (!ok) {
      setStatus('error');
      setMessage('Enter a valid email.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo, // this is where the magic link lands
      },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message || 'Something went wrong. Try again.');
      return;
    }

    setStatus('sent');
    setMessage('Check your inbox for the magic link.');
  }

  return (
    <main className="min-h-screen w-full bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 shadow-xl backdrop-blur p-8">
          {/* Brand header */}
          <div className="mb-6 text-center">
            {/* Replace with your logo if you have one */}
            <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="text-sm font-semibold">A</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-zinc-400">
              We’ll email you a one-time magic link.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@city.gov"
                className="w-full rounded-xl border border-white/10 bg-zinc-800/70 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                autoComplete="email"
                required
              />
            </label>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-xl bg-white text-black font-medium py-3 hover:bg-zinc-100 disabled:opacity-60"
            >
              {status === 'loading' ? 'Sending…' : 'Send Magic Link'}
            </button>
          </form>

          {/* Status / helper text */}
          {message ? (
            <div
              className={`mt-4 text-sm ${
                status === 'error' ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {message}
            </div>
          ) : null}

          {/* Small footer */}
          <p className="mt-6 text-xs text-zinc-500 text-center">
            By continuing you agree to receive a one-time sign-in email.
          </p>
        </div>
      </div>
    </main>
  );
}
