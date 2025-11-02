import Link from 'next/link';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '../../../lib/supabaseServer';


type Flags = { work_orders?: boolean; sampling?: boolean; mft?: boolean; grants?: boolean };

function ModuleCard({
  title,
  href,
  enabled,
  description
}: {
  title: string;
  href: string;
  enabled: boolean;
  description: string;
}) {
  if (enabled) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/60 transition p-5 block"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <span className="text-xs rounded-full px-2 py-1 bg-emerald-600/20 text-emerald-300">Enabled</span>
        </div>
        <p className="text-sm text-neutral-400">{description}</p>
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-5 opacity-60">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs rounded-full px-2 py-1 bg-neutral-800 text-neutral-400">Coming soon</span>
      </div>
      <p className="text-sm text-neutral-400">{description}</p>
    </div>
  );
}

async function getContext() {
  const supabase = createSupabaseServer();
  const tenantId = cookies().get('tenant_id')?.value;
  if (!tenantId) return { redirect: '/tenant/select' as const };

  // role for this tenant
  const { data: membership, error: mErr } = await supabase
    .from('memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (mErr) throw mErr;
  if (!membership) return { redirect: '/tenant/select' as const };

  // tenant name
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .maybeSingle();
  if (tErr) throw tErr;

  // feature flags
  const { data: tfs, error: fErr } = await supabase
    .from('tenant_features')
    .select('feature_key, enabled')
    .eq('tenant_id', tenantId);
  if (fErr) throw fErr;

  const flags: Flags = {};
  (tfs ?? []).forEach((tf: any) => { flags[tf.feature_key as keyof Flags] = !!tf.enabled; });

  return {
    tenantName: tenant?.name ?? 'Selected Tenant',
    role: membership.role as string,
    flags
  };
}

export default async function ResolvePage() {
  const ctx = await getContext();
  if ('redirect' in ctx) {
    return (
      <div className="p-6 text-neutral-200">
        Redirecting… <a className="underline" href={ctx.redirect}>continue</a>
      </div>
    );
  }

  const { tenantName, role, flags } = ctx;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">You’re in: {tenantName}</h1>
            <p className="text-sm text-neutral-400 mt-1">Role: <span className="capitalize">{role.replace('_', ' ')}</span></p>
          </div>
          <form action="/tenant/clear" method="post">
            <button className="rounded-2xl bg-white/10 hover:bg-white/15 px-4 py-2">Switch tenant</button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ModuleCard
            title="Owner Dashboard"
            href="/dashboard"
            enabled={true}
            description="Cross-tenant metrics, growth, and quick actions."
          />
          <ModuleCard
            title="Work Orders"
            href="/work-orders"
            enabled={!!flags.work_orders}
            description="Create, assign, track, and close tickets with attachments and checklists."
          />
          <ModuleCard
            title="Sampling & Compliance"
            href="/sampling"
            enabled={!!flags.sampling}
            description="Schedules, results, and IEPA-ready reports with anomaly flags."
          />
          <ModuleCard
            title="MFT Tracker"
            href="/mft"
            enabled={!!flags.mft}
            description="Motor Fuel Tax: project logs, invoices, and reimbursement tracking."
          />
          <ModuleCard
            title="Grants & Expenses"
            href="/grants"
            enabled={!!flags.grants}
            description="Track grant applications, awards, drawdowns, and matching costs."
          />
        </div>
      </div>
    </div>
  );
}
