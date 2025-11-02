'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type Tenant = { id: string; name: string };

export default function TenantHome() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
    );
    (async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id,name')
        .eq('id', id)
        .single();

      if (error) setError(error.message);
      else {
        setTenant(data);
        // store the active tenant for the rest of the app (modules can read this)
        try { localStorage.setItem('activeTenantId', data.id); } catch {}
      }
    })();
  }, [id]);

  if (error) return <main className="min-h-screen grid place-items-center bg-black text-red-400">Error: {error}</main>;
  if (!tenant) return <main className="min-h-screen grid place-items-center bg-black text-white">Loading tenant…</main>;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">{tenant.id}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => router.push('/work-orders')}
            className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-left hover:border-white/20"
          >
            Work Orders
          </button>
          <button
            onClick={() => router.push('/sampling')}
            className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-left hover:border-white/20"
          >
            Sampling & Compliance
          </button>
          <button
            onClick={() => router.push('/mft')}
            className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-left hover:border-white/20"
          >
            MFT Tracker
          </button>
          <button
            onClick={() => router.push('/grants')}
            className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-left hover:border-white/20"
          >
            Grants & Expenses
          </button>
        </div>
      </div>
    </main>
  );
}
