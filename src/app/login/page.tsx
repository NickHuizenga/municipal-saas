'use client';

import { useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      ),
    []
  );

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [msg, setMsg] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading'); setMsg('');
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        setStatus('ok'); setMsg('Signed in.');
        // Go somewhere useful (owner dashboard, etc.)
        window.location.href = '/tenant'; // change if you want another landing
      } else {
        // SIGN UP
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset`
          }
        });
        if (error) throw error;
        setStatus('ok');
        setMsg('Account created. If email confirmation is required, check your inbox.');
      }
    } catch (err: any) {
      setStatus('error');
      setMsg(err?.message ?? 'Something went wrong.');
    }
  }

  async function onForgotPassword() {
    setStatus('loading'); setMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset`,
      });
      if (error) throw error;
      setStatus('ok'); setMsg('Password reset email sent.');
    } catch (err: any) {
      setStatus('error'); setMsg(err?.message ?? 'Could not send reset email.');
    }
  }

  return (
    <main className="min-h-screen w-full bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 shadow-xl backdrop-blur p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {mode === 'signin'
                ? 'Use your email and password.'
                : 'Enter your email and a new password.'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Email</span>
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

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Password</span>
              <div className="flex items-stretch gap-2">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder={mode === 'signin' ? 'Your password' : 'Create a password'}
                  className="w-full rounded-xl border border-white/10 bg-zinc-800/70 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="px-3 rounded-xl border border-white/10 bg-zinc-800/70 text-xs"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-xl bg-white text-black font-medium py-3 hover:bg-zinc-100 disabled:opacity-60"
            >
              {status === 'loading'
                ? (mode === 'signin' ? 'Signing in…' : 'Creating…')
                : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          {/* Actions */}
          <div className="mt-4 text-sm flex items-center justify-between">
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-zinc-300 hover:underline"
              type="button"
            >
              {mode === 'signin' ? 'Create an account' : 'Have an account? Sign in'}
            </button>

            <button
              onClick={onForgotPassword}
              className="text-zinc-300 hover:underline"
              type="button"
              disabled={!email || status === 'loading'}
              title={!email ? 'Enter your email first' : ''}
            >
              Forgot password
            </button>
          </div>

          {/* Status */}
          {msg ? (
            <div
              className={`mt-4 text-sm ${
                status === 'error' ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {msg}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
