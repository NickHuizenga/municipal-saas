'use client';

import { useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ResetPasswordPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      ),
    []
  );

  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [msg, setMsg] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading'); setMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setStatus('ok'); setMsg('Password updated. Redirecting…');
      setTimeout(() => (window.location.href = '/login'), 1000);
    } catch (err: any) {
      setStatus('error'); setMsg(err?.message ?? 'Could not update password.');
    }
  }

  return (
    <main className="min-h-screen w-full bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/60 p-8">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="text-sm text-zinc-400 mt-1">
          This page is opened from your password-reset email.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-300">New password</span>
            <div className="flex items-stretch gap-2">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-800/70 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="px-3 rounded-xl border border-white/10 bg-zinc-800/70 text-xs"
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
            {status === 'loading' ? 'Updating…' : 'Update password'}
          </button>
        </form>

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
    </main>
  );
}
