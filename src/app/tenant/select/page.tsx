import Link from 'next/link';
import { getSupabaseServer } from '../../../lib/supabaseServer';


type Row = { tenant_id: string; tenant_name: string; role: string };

function initials(name: string) {
  return name.split(/\s+/).slice(0,2).map(w => (w[0]?.toUpperCase() ?? '')).join('');
}

async function loadRows(): Promise<Row[]> {
  const supabase = createSupabaseServer();

  // must be signed in (RLS)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 1) Try the helper view (best path)
  const v = await supabase
    .from('v_user_memberships')
    .select('tenant_id, tenant_name, role')
    .order('tenant_name', { ascending: true });

  if (!v.error && v.data) return v.data as Row[];

  // 2) Fallback if the view doesn't exist: simple join
  const j = await supabase
    .from('memberships')
    .select(`
      role,
      tenant_id,
      tenants:tenant_id ( name, id )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('role', { ascending: true });

  if (j.error || !j.data) return [];

  return (j.data as any[]).map(r => ({
    tenant_id: r.tenants?.id ?? r.tenant_id,
    tenant_name: r.tenants?.name ?? 'Tenant',
    role: r.role
  }));
}

export default async function TenantSelectPage({ searchParams }: { searchParams: { next?: string } }) {
  const rows = await loadRows();
  const next = searchParams?.next ?? '/tenant/resolve';

  // If not signed in, rows = [] — show login prompt (no crash)
  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 grid place-items-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Please sign in</h1>
          <p className="text-sm text-neutral-400 mb-4">After login, your municipalities will appear here.</p>
          <Link href="/login" className="rounded-2xl bg-white/10 hover:bg.white/15 px-4 py-2 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Choose a Tenant</h1>
        <p className="text-neutral-400 text-sm mt-1">Click a card to continue.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(m => (
            <form
              key={m.tenant_id}
              action="/tenant/select/use"
              method="post"
              className="group rounded-2xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/60 transition p-4 flex flex-col cursor-pointer"
            >
              <input type="hidden" name="tenant_id" value={m.tenant_id} />
              <input type="hidden" name="next" value={next} />

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-neutral-800 grid place-items-center text-sm font-semibold">
                  {initials(m.tenant_name)}
                </div>
                <div>
                  <div className="text-base">{m.tenant_name}</div>
                  <div className="text-xs text-neutral-400 capitalize">Role: {m.role.replace('_',' ')}</div>
                </div>
              </div>

              {/* Submit on click anywhere via hidden button */}
              <button className="sr-only" aria-label={`Use ${m.tenant_name}`} />
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
