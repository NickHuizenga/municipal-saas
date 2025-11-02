'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Tenant = { id: string; name: string };

export default function OwnerInvitePage() {
  const [email, setEmail] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string>('');
  const [role, setRole] = useState('viewer');
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
    (async () => {
      // Optionally restrict this page to owners by checking profile client-side
      const { data: me } = await supabase.from('profiles').select('is_platform_owner').single();
      if (!me?.is_platform_owner) {
        setErr('Forbidden: owner only');
        return;
      }
      const { data, error } = await supabase.from('tenants').select('id,name').order('name');
      if (error) setErr(error.message);
      else setTenants(data ?? []);
    })();
  }, []);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          tenantId: tenantId || null,
          role,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || 'Invite failed');
      } else {
        setMsg('Invite sent. User will set their password via email.');
        setEmail('');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Invite failed');
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold mb-2">Invite a User</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Sends an email invite. Optional: immediately add them to a tenant with a role.
        </p>

        <form onSubmit={onInvite} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              placeholder="user@city.gov"
              className="w-full rounded-xl border border-white/10 bg-zinc-800/70 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Tenant (optional)</span>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-800/70 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="">— None —</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-800/70 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="viewer">viewer</option>
                <option value="crew">crew</option>
                <option value="crew_leader">crew_leader</option>
                <option value="dispatcher">dispatcher</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-white text-black font-medium px-4 py-3 hover:bg-zinc-100"
            >
              Send Invite
            </button>
            {msg && <div className="text-emerald-400 text-sm">{msg}</div>}
            {err && <div className="text-red-400 text-sm">{err}</div>}
          </div>
        </form>
      </div>
    </main>
  );
}
