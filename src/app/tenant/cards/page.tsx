'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Tenant = { id: string; name: string };

export default function TenantCards() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );

    (async () => {
      // Ask the database for tenants. RLS will decide what you can see.
      const { data, error } = await supabase
        .from('tenants')
        .select('id,name')
        .order('name', { ascending: true });

      if (error) setError(error.message);
      else setTenants(data ?? []);
    })();
  }, []);

  if (error) {
    return <main className="min-h-screen p-8 text-red-400">Error: {error}</main>;
  }

  if (!tenants.length) {
    return <main className="min-h-screen p-8 text-white">No tenants found.</main>;
  }

  return (
    <main className="min-h-screen p-6 bg-black text-white">
      <h1 className="text-xl font-semibold mb-4">Tenants</h1>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tenants.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-white/10 bg-zinc-900/60 p-6 shadow"
          >
            <div className="text-lg font-medium">{t.name}</div>
            <div className="text-xs text-zinc-400 mt-1">{t.id}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
