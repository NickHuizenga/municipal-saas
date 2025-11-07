// src/app/owner/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULE_DEFINITIONS,
  isModuleKey,
  ModuleKey,
} from "@/config/modules";

export const revalidate = 0;

type OwnerTenantCard = {
  id: string;
  name: string;
  memberCount: number;
  modules: string[];
};

export default async function OwnerDashboardPage() {
  const supabase = getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.is_platform_owner) {
    redirect("/tenant/select");
  }

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, user_id");

  const { data: modules } = await supabase
    .from("modules")
    .select("tenant_id, module_name, enabled")
    .eq("enabled", true);

  const memberCountMap = new Map<string, number>();
  (memberships ?? []).forEach((m) => {
    memberCountMap.set(m.tenant_id, (memberCountMap.get(m.tenant_id) ?? 0) + 1);
  });

  const moduleMap = new Map<string, string[]>();
  (modules ?? []).forEach((m) => {
    const arr = moduleMap.get(m.tenant_id) ?? [];
    arr.push(m.module_name);
    moduleMap.set(m.tenant_id, arr);
  });

  const cards: OwnerTenantCard[] =
    tenants?.map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: memberCountMap.get(t.id) ?? 0,
      modules: moduleMap.get(t.id) ?? [],
    })) ?? [];

  const resolveModuleLabel = (key: string) =>
    isModuleKey(key)
      ? MODULE_DEFINITIONS[key as ModuleKey].label
      : key;

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Platform Owner Dashboard</h1>
        <p className="text-sm text-zinc-400">
          See all tenants, manage users, modules, and feature access.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((tenant) => (
          <div
            key={tenant.id}
            className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
          >
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-100">
                {tenant.name}
              </h2>
              <p className="text-[11px] font-mono text-zinc-500 break-all">
                {tenant.id}
              </p>
              <p className="text-xs text-zinc-500">
                {tenant.memberCount}{" "}
                {tenant.memberCount === 1 ? "member" : "members"}
              </p>

              {tenant.modules.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tenant.modules.map((mod) => (
                    <span
                      key={mod}
                      className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200"
                    >
                      {resolveModuleLabel(mod)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-zinc-600">
                  No modules enabled yet.
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-between gap-2">
              <form action="/tenant/resolve" method="post">
                <input type="hidden" name="tenant_id" value={tenant.id} />
                <input
                  type="hidden"
                  name="redirect_to"
                  value="/owner/tenant"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:border-indigo-500 hover:bg-zinc-900/80"
                >
                  Manage Tenant
                </button>
              </form>

              <form action="/tenant/resolve" method="post">
                <input type="hidden" name="tenant_id" value={tenant.id} />
                <input
                  type="hidden"
                  name="redirect_to"
                  value="/tenant/modules"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:border-indigo-500 hover:bg-zinc-900/80"
                >
                  Module Settings
                </button>
              </form>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
