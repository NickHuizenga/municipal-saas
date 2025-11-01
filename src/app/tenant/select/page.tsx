import { createSupabaseServer } from '@/lib/supabaseServer';

type Membership = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string | null;
  role: string;
};

async function loadData() {
  const supabase = createSupabaseServer();
  // Read from the helper view we created earlier
  const { data: { user } } = await supabase.auth.getUser();

  // If you didn't create the view, fall back is easy to add — but we’ll assume you did:
  const { data: rows, error } = await supabase
    .from('v_user_memberships')
    .select('tenant_id, tenant_name, tenant_slug, role')
    .order('tenant_name', { ascending: true });

  if (error) throw error;

  // Get feature matrix for ALL tenants at once
  const { data: fm } = await supabase
    .from('v_tenant_feature_matrix')
    .select('*');

  // index features by tenant_id for quick lookup
  const byTenant: Record<string, any> = {};
  (fm ?? []).forEach((r: any) => { byTenant[r.tenant_id] = r; });

  return {
    user: user ?? null,
    memberships: (rows ?? []) as Membership[],
    featureMap: byTenant
  };
}

function initials(name: string) {
  return name.split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function FeaturePill({ on }: { on: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${on ? 'bg-emerald-600/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}>
      {on ? 'On' : 'Off'}
    </span>
  );
}

export default async function TenantSelectPage({ searchParams }: { searchParams: { next?: string } }) {
  const { memberships, featureMap } = await loadData();
  const next = searchParams?.next ?? '/tenant/resolve';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Choose a Tenant</h1>
        <p className="text-neutral-400 text-sm mt-1">Pick the municipality you want to work in.</p>

        {memberships.length === 0 && (
          <div className="mt-6 rounded-2xl border border-neutral-800 p-4 text-neutral-300">
            No memberships found. Add one in Supabase (<code>memberships</code>), then refresh.
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m) => {
            const f = featureMap[m.tenant_id] ?? {};
            return (
              <form
                key={m.tenant_id}
                action="/tenant/select/use"
                method="post"
                className="group rounded-2xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/60 transition p-4 flex flex-col"
              >
                <input type="hidden" name="tenant_id" value={m.tenant_id} />
                <input type="hidden" name="next" value={next} />

                {/* Avatar / logo */}
                <div className="flex items-center gap-3">
                  {/* If you later add logo_url in tenants table and fetch it, render an <img> here */}
                  <div className="h-10 w-10 rounded-xl bg-neutral-800 grid place-items-center text-sm font-semibold">
                    {initials(m.tenant_name)}
                  </div>
                  <div>
                    <div className="text-base">{m.tenant_name}</div>
                    <div className="text-xs text-neutral-400 capitalize">Role: {m.role.replace('_',' ')}</div>
                  </div>
                </div>

                {/* Feature hints */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl border border-neutral-800 px-2 py-1">
                    <span>Work Orders</span>
                    <FeaturePill on={!!f.work_orders} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-neutral-800 px-2 py-1">
                    <span>Sampling</span>
                    <FeaturePill on={!!f.sampling} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-neutral-800 px-2 py-1">
                    <span>MFT</span>
                    <FeaturePill on={!!f.mft} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-neutral-800 px-2 py-1">
                    <span>Grants</span>
                    <FeaturePill on={!!f.grants} />
                  </div>
                </div>

                <button
                  className="mt-4 rounded-2xl bg-white/10 hover:bg-white/15 py-2"
                  aria-label={`Use ${m.tenant_name}`}
                >
                  Use this tenant
                </button>
              </form>
            );
          })}
        </div>
      </div>
    </div>
  );
}
