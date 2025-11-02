'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Tenant = { id: string; name: string };

export default function TenantCards() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

      if (error) {
        setError(error.message);
      } else {
        setTenants(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-black">
        Loading tenants...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center text-red-400 bg-black">
        Error: {error}
      </main>
    );
  }

  if (!tenants.length) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-black">
        No tenants found.
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-black text-white">
      <h1 className="text-2xl font-semibold mb-6">All Tenants</h1>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tenants.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-white/10 bg-zinc-900/60 p-6 shadow"
          >
            <div className="text-lg font-medium">{t.name}</div>
            <div className="text-xs text-zinc-500 mt-2">{t.id}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
