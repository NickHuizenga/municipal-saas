// src/app/debug/memberships/page.tsx
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client – bypasses RLS so we see the real data
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const revalidate = 0;

export default async function DebugMembershipsPage() {
  const { data, error } = await adminSupabase
    .from("tenant_memberships")
    .select("tenant_id, user_id, role")
    .order("tenant_id", { ascending: true });

  if (error) {
    console.error("Error loading tenant_memberships:", error);
  }

  const rows = data ?? [];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-zinc-50">
        Debug: tenant_memberships
      </h1>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
          No rows found in tenant_memberships.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                <th className="px-3 py-2 text-left font-semibold text-zinc-300">
                  tenant_id
                </th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-300">
                  user_id
                </th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-300">
                  role
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, idx: number) => (
                <tr
                  key={`${r.tenant_id}-${r.user_id}-${idx}`}
                  className="border-t border-zinc-900"
                >
                  <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
                    {r.tenant_id}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-zinc-400">
                    {r.user_id}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-zinc-100">
                    {r.role}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
