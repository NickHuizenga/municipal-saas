// src/app/owner/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TenantRow = {
  id: string;
  name: string | null;
  slug?: string | null;
};

export default function OwnerDashboardPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // 1️⃣ Ensure we have a user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        if (!cancelled) {
          setError(userError.message || "Unable to check current user.");
          setLoading(false);
        }
        return;
      }

      if (!user) {
        if (!cancelled) {
          setError("You are not signed in. Go to /login and sign in again.");
          setLoading(false);
        }
        return;
      }

      // 2️⃣ Load tenants (RLS will enforce platform_owner access)
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .order("name", { ascending: true });

      if (!cancelled) {
        if (error) {
          console.error("Error loading tenants:", error);
          setError(error.message || "Unable to load tenants.");
        } else {
          setTenants(data ?? []);
        }
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#020617] text-zinc-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Platform Owner Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            See all tenants and basic info. We&apos;ll reattach full management
            controls after this is stable.
          </p>
        </header>

        {loading && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
            Loading tenants…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tenants.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-300">
                No tenants found.
              </div>
            )}

            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-sm"
              >
                <div>
                  <h2 className="text-sm font-semibold">
                    {tenant.name || "Unnamed Tenant"}
                  </h2>
                  <p className="mt-1 text-[11px] text-zinc-500 break-all">
                    {tenant.id}
                  </p>
                  {tenant.slug && (
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
                      {tenant.slug}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    disabled
                    className="flex-1 cursor-not-allowed rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400"
                  >
                    Manage Tenant (coming back)
                  </button>
                  <button
                    disabled
                    className="flex-1 cursor-not-allowed rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400"
                  >
                    Module Settings (coming back)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
