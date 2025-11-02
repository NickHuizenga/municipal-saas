'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type Member = { user_id: string; email: string | null; role: string };

export default function TenantMembersPage() {
  const { id: tenantId } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<{ id: string | null }>({ id: null });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      setErr(''); setMsg(''); setLoading(true);

      // Get my user id for "don't revoke self" guard
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      );
      const { data: userRes } = await supabase.auth.getUser();
      setMe({ id: userRes?.user?.id ?? null });

      // Load members via server route (owner-only)
      const res = await fetch(`/api/memberships/list?tenantId=${tenantId}`);
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error || 'Failed to load members');
      } else {
        setMembers(json.members || []);
      }
      setLoading(false);
    })();
  }, [tenantId]);

  async function revoke(user_id: string) {
    setErr(''); setMsg('');
    if (user_id === me.id) {
      setErr('Refusing to revoke your own membership.');
      return;
    }
    const res = await fetch('/api/memberships/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId, userId: user_id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || 'Revoke failed');
    } else {
      setMsg('Membership revoked.');
      setMembers(prev => prev.filter(m => m.user_id !== user_id));
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-semibold mb-4">Tenant Members</h1>

        {loading && <div>Loading…</div>}
        {!loading && err && <div className="text-red-400">{err}</div>}
        {!loading && msg && <div className="text-emerald-400">{msg}</div>}

        {!loading && !err && (
          <div className="space-y-2">
            {members.length === 0 ? (
              <div className="text-zinc-400">No members.</div>
            ) : (
              members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                  <div>
                    <div className="text-sm font-medium">{m.email ?? '(no email found)'}</div>
                    <div className="text-xs text-zinc-400">{m.user_id}</div>
                    <div className="text-xs text-zinc-400">role: {m.role}</div>
                  </div>
                  <button
                    onClick={() => revoke(m.user_id)}
                    className="rounded-xl bg-white text-black text-sm font-medium px-3 py-2 hover:bg-zinc-100"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
