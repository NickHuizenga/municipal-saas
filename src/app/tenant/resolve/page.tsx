import { cookies } from 'next/headers';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabaseServer';

type Perm = { work_orders: boolean; sampling: boolean; mft: boolean; grants: boolean; };
const compute = (enabled: Record<string, boolean>): Perm => ({
  work_orders: !!enabled['work_orders'],
  sampling: !!enabled['sampling'],
  mft: !!enabled['mft'],
  grants: !!enabled['grants']
});

async function getContext() {
  const supabase = createSupabaseServer();
  const tenantId = cookies().get('tenant_id')?.value;
  if (!tenantId) return { redirect: '/tenant/select' as const };

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, tenants:tenant_id(name, id)')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!membership) return { redirect: '/tenant/select' as const };

  const { data: tfs } = await supabase
    .from('tenant_features')
    .select('feature_key, enabled')
    .eq('tenant_id', tenantId);

  const enabled: Record<string, boolean> = {};
  (tfs ?? []).forEach(tf => { enabled[tf.feature_key] = tf.enabled; });

  return {
    tenantName: membership.tenants.name,
    role: membership.role as string,
    perms: compute(enabled),
    featuresEnabled: enabled
  };
}

export default async function ResolvePage() {
  const res = await getContext();
  if ('redirect' in res) return <div className="p-6">Redirecting… <a className="underline" href={res.redirect}>continue</a></div>;

  const { tenantName, role, perms, featuresEnabled } = res;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">You’re in: {tenantName}</h1>

        <div className="rounded-2xl border border-neutral-800 p-4">
          <div className="text-sm text-neutral-400">Your role</div>
          <div className="text-lg">{role}</div>
        </div>

        <div className="rounded-2xl border border-neutral-800 p-4">
          <div className="text-sm text-neutral-400 mb-2">Features enabled</div>
          <ul className="space-y-2">
            {Object.entries(featuresEnabled).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between">
                <span className="capitalize">{k.replace('_',' ')}</span>
                <span className={`rounded-full px-3 py-1 text-xs ${v ? 'bg-emerald-600/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}>
                  {v ? 'Enabled' : 'Disabled'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-neutral-800 p-4">
          <div className="text-sm text-neutral-400 mb-2">Where you can go</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link href="/dashboard" className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-3 text-center">Owner Dashboard</Link>
            {perms.work_orders && <Link href="/work-orders" className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-3 text-center">Work Orders</Link>}
            {perms.sampling && <Link href="/sampling" className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-3 text-center">Sampling & Compliance</Link>}
            {perms.mft && <Link href="/mft" className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-3 text-center">MFT Tracker</Link>}
            {perms.grants && <Link href="/grants" className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-3 text-center">Grants & Expenses</Link>}
          </div>
        </div>

        <form action="/tenant/clear" method="post">
          <button className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-2">Switch tenant</button>
        </form>
      </div>
    </div>
  );
}
