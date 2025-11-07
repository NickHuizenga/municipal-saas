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
    // Not a platform owner — send them to normal tenant selection
    redirect("/tenant/select");
  }

  // All tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, name")
    .order("name", { ascending: true });

  if (tenantsError) {
    console.error("Error loading tenants:", tenantsError);
  }

  // Memberships for member counts
  const { data: memberships, error: membershipsError } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, user_id");

  if (membershipsError) {
    console.error("Error loading memberships:", membershipsError);
  }

  // Enabled modules per tenant
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("tenant_id, module_name, enabled")
    .eq("enabled", true);

  if (modulesError) {
    console.error("Error loading modules:", modulesError);
  }

  const memberCountMap = new Map<string, number>();
  (memberships ?? []).forEach((row) => {
    const tid = row.tenant_id as string;
    memberCountMap.set(tid, (memberCountMap.get(tid) ?? 0) + 1);
  });

  const modulesMap = new Map<string, string[]>();
  (modules ?? []).forEach((row) => {
    const tid = row.tenant_id as string;
    const list = modulesMap.get(tid) ?? [];
    list.push(row.module_name as string);
    modulesMap.set(tid, list);
  });

  const cards: OwnerTenantCard[] =
    (tenants ?? []).map((t) => ({
      id: t.id as string,
      name: t.name as string,
      memberCount: memberCountMap.get(t.id as string) ?? 0,
      modules: modulesMap.get(t.id as string) ?? [],
    })) ?? [];

  const resolveModuleLabel = (key: string) => {
    if (isModuleKey(key)) {
      const def = MODULE_DEFINITIONS[key as ModuleKey];
      return def.label;
    }
    return key;
  };

  return (
    <main className="p-6 space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Platform Owner Dashboard</h1>
        <p className="text-sm text-zinc-400">
          See all tenants, enabled modules, and jump into each tenant&apos;s
          settings as platform owner.
        </p>
      </section>

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
              <div className="text-xs text-zinc-500">
                {tenant.memberCount}{" "}
                {tenant.memberCount === 1 ? "member" : "members"}
              </div>

              {tenant.modules.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tenant.modules.map((modKey) => (
                    <span
                      key={modKey}
                      className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-200"
                    >
                      {resolveModuleLabel(modKey)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-zinc-600">
                  No modules enabled yet.
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-end">
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
