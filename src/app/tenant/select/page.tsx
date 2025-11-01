import { createSupabaseServer } from '@/lib/supabaseServer';

type Row = {
  tenant_id: string;
  tenant_name: string;
  role: string;
};

async function loadData() {
  const supabase = createSupabaseServer();

  // Get all tenants you belong to (any role)
  const { data, error } = await supabase
    .from('v_user_memberships') // created earlier
    .select('tenant_id, tenant_name, role')
    .order('tenant_name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Row[];
}

function initials(name: string) {
  return name.split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

export default async function TenantSelectPage({ searchParams }: { searchParams: { next?: string } }) {
  const rows = await loadData();
  const next = searchParams?.next ?? '/tenant/resolve';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Choose a Tenant</h1>
        <p className="text-neutral-400 text-sm mt-1">Click a card to continue.</p>

        {rows.length === 0 && (
          <div className="mt-6 rounded-2xl border border-neutral-800 p-4 text-neutral-300">
            No tenants yet. Add a row in <code>memberships</code> linking your user to a tenant (role = <b>owner</b>), then refresh.
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
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

              <button
                className="sr-only"
                aria-label={`Use ${m.tenant_name}`}
              />
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
