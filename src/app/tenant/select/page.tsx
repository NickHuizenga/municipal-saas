// src/app/tenant/select/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULE_DEFINITIONS,
  isModuleKey,
  ModuleKey,
} from "@/config/modules";

export const revalidate = 0;

type TenantCard = {
  id: string;
  name: string;
  roleForCurrentUser: string | null;
  enabledModules: string[];
};

export default async function TenantSelectPage() {
  const supabase = getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Profile → platform owner?
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Get tenants + roles
  let tenants: { id: string; name: string }[] = [];
  let membershipMap = new Map<string, string>();

  if (isPlatformOwner) {
    // All tenants
    const { data: tenantRows, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name")
      .order("name", { ascending: true });

    if (tenantsError) {
      console.error("Error loading tenants:", tenantsError);
    }

    tenants =
      tenantRows?.map((t) => ({
        id: t.id as string,
        name: t.name as string,
      })) ?? [];

    // Current user's memberships for role badges
    const { data: memberships, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", userId);

    if (membershipError) {
      console.error("Error loading memberships:", membershipError);
    }

    membershipMap = new Map(
      (memberships ?? []).map((m) => [m.tenant_id as string, m.role as string])
    );
  } else {
    // Non-platform users only see tenants where they are members
    const { data: membershipRows, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("role, tenants(id, name)")
      .eq("user_id", userId);

    if (membershipError) {
      console.error("Error loading tenant memberships:", membershipError);
    }

    tenants =
      membershipRows
        ?.map((row) => ({
          id: (row as any).tenants?.id as string,
          name: (row as any).tenants?.name as string,
        }))
        .filter((t) => t.id && t.name) ?? [];

    membershipMap = new Map(
      (membershipRows ?? []).map((m) => [
        (m as any).tenants?.id as string,
        m.role as string,
      ])
    );
  }

  const tenantIds = tenants.map((t) => t.id);

  // Enabled modules per tenant
  let modulesMap = new Map<string, string[]>();

  if (tenantIds.length > 0) {
    const { data: modules, error: modulesError } = await supabase
      .from("modules")
      .select("tenant_id, module_name")
      .in("tenant_id", tenantIds)
      .eq("enabled", true);

    if (modulesError) {
      console.error("Error loading modules:", modulesError);
    }

    modulesMap = new Map<string, string[]>();
    (modules ?? []).forEach((row) => {
      const tid = row.tenant_id as string;
      const list = modulesMap.get(tid) ?? [];
      list.push(row.module_name as string);
      modulesMap.set(tid, list);
    });
  }

  const tenantsForCards: TenantCard[] = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    roleForCurrentUser: membershipMap.get(t.id) ?? null,
    enabledModules: modulesMap.get(t.id) ?? [],
  }));

  const resolveModuleLabel = (key: string) =>
    isModuleKey(key)
      ? MODULE_DEFINITIONS[key as ModuleKey].label
      : key;

  return (
    <main className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Home
        </Link>
        <span className="mx-1">/</span>
        <span>Tenant</span>
        <span className="mx-1">/</span>
        <span>Select</span>
      </nav>

      {/* Heading */}
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Select a Tenant</h1>
        <p className="text-sm text-zinc-400">
          Pick a municipality to continue.
        </p>
        {isPlatformOwner ? (
          <p className="text-xs text-zinc-500">
            You are a platform owner. All tenants are visible here. Tenants
            where you are also a member will show your role.
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            Only tenants where you have been added as a member are listed here.
          </p>
        )}
      </section>

      {/* Tenant cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenantsForCards.map((tenant) => (
          <div
            key={tenant.id}
            className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">
                    {tenant.name}
                  </h2>
                  <p className="text-[11px] font-mono text-zinc-500 break-all">
                    {tenant.id}
                  </p>
                </div>
                {tenant.roleForCurrentUser && (
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] lowercase text-zinc-200">
                    {tenant.roleForCurrentUser}
                  </span>
                )}
              </div>

              {tenant.enabledModules.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tenant.enabledModules.map((modKey) => (
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
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:border-indigo-500 hover:bg-zinc-900/80"
                >
                  Continue
                </button>
              </form>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
