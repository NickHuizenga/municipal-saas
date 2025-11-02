'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type Tenant = { id: string; name: string };

export default function TenantCards() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );

    (async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id,name')
        .order('name', { ascending: true });

      if (error) setError(error.message);
      else setTenants(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = q
    ? tenants.filter(t => t.name.toLowerCase().includes(q.toLowerCase()))
    : tenants;

  if (loading) return <main className="min-h-screen grid place-items-center bg-black text-white">Loading…</main>;
  if (error)   return <main className="min-h-screen grid place-items-center bg-black text-red-400">Error: {error}</main>;
  if (!tenants.length) return <main className="min-h-screen grid place-items-center bg-black text-white">No tenants found.</main>;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Select a Tenant</h1>
          <input
            placeholder="Search tenants…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/tenant/${t.id}`)}
              className="text-left rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <div className="text-lg font-medium">{t.name}</div>
              <div className="mt-2 text-xs text-zinc-500">{t.id}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
