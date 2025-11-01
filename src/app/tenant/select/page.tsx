import { createSupabaseServer } from '@/lib/supabaseServer';

async function getMemberships() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, memberships: [] as any[] };

  const { data, error } = await supabase
    .from('memberships')
    .select('tenant_id, role, tenants:tenant_id(name, slug, id)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) throw error;
  return { user, memberships: data ?? [] };
}

export default async function TenantSelectPage({ searchParams }: { searchParams: { next?: string } }) {
  const { user, memberships } = await getMemberships();
  const next = searchParams?.next ?? '/tenant/resolve';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Choose a Tenant</h1>

        <div className="grid sm:grid-cols-2 gap-4">
          {memberships.map((m: any) => (
            <form key={m.tenants.id} action="/tenant/select/use" method="post" className="rounded-2xl border border-neutral-800 p-4">
              <input type="hidden" name="tenant_id" value={m.tenants.id} />
              <input type="hidden" name="next" value={next} />
              <div className="text-lg">{m.tenants.name}</div>
              <div className="text-sm text-neutral-400 mt-1">Your role: {m.role}</div>
              <button className="mt-4 w-full rounded-2xl bg-white/10 hover:bg-white/15 py-2">Use this tenant</button>
            </form>
          ))}
        </div>

        {/* Manual fallback: paste a tenant UUID from Supabase if memberships are empty */}
        {(!memberships || memberships.length === 0) && (
          <div className="rounded-2xl border border-neutral-800 p-4">
            <div className="text-sm text-neutral-400 mb-2">
              No memberships found. Paste a tenant ID from Supabase to continue:
            </div>
            <form action="/tenant/select/use" method="post" className="flex gap-2 flex-col sm:flex-row">
              <input
                name="tenant_id"
                placeholder="tenant UUID…"
                className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2"
                required
              />
              <input type="hidden" name="next" value={next} />
              <button className="rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2">Use</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
