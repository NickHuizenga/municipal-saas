// src/app/tenant/home/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/header";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULE_DEFINITIONS,
  isModuleKey,
  ModuleKey,
  ModuleCategory,
} from "@/config/modules";

export const revalidate = 0;

const CATEGORY_LABELS: Record<ModuleCategory | "other", string> = {
  public_works: "Public Works",
  utilities: "Utilities",
  compliance: "Compliance & Reporting",
  finance: "Financial & Funding",
  planning: "Planning & Assets",
  community: "Community-Facing",
  admin: "Admin & Internal",
  other: "Other",
};

type DisplayModule = {
  key: string;
  label: string;
  description?: string;
  category: ModuleCategory | "other";
};

export default async function TenantHomePage() {
  const cookieStore = cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;

  if (!tenantId) {
    redirect("/tenant/select");
  }

  const supabase = getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const authUserId = session.user.id;

  // Profile → check if platform owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_platform_owner")
    .eq("id", authUserId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Tenant membership for this user (and tenant name via FK if configured)
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role, tenants(name)")
    .eq("tenant_id", tenantId)
    .eq("user_id", authUserId)
    .maybeSingle();

  const tenantRole = membership?.role ?? null;
  const tenantName =
    (membership as any)?.tenants?.name || "(Selected Tenant)";

  // If not platform_owner and not a member of this tenant, nope
  if (!isPlatformOwner && !tenantRole) {
    redirect("/tenant/select");
  }

  // Enabled modules for this tenant
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("module_name")
    .eq("tenant_id", tenantId)
    .eq("enabled", true)
    .order("module_name", { ascending: true });

  if (modulesError) {
    console.error("Error loading modules:", modulesError);
  }

  const enabledModuleNames: string[] =
    modules?.map((m) => m.module_name as string) ?? [];

  // Per-user module access overrides (if any exist)
  const { data: accessRows, error: accessError } = await supabase
    .from("user_module_access")
    .select("module_name, enabled")
    .eq("tenant_id", tenantId)
    .eq("user_id", authUserId)
    .eq("enabled", true);

  if (accessError) {
    console.error("Error loading user_module_access:", accessError);
  }

  const accessMap = new Map<string, boolean>();
  (accessRows ?? []).forEach((row) => {
    accessMap.set(row.module_name as string, row.enabled === true);
  });

  const hasOverrides = (accessRows?.length ?? 0) > 0;

  const allowedModuleNames = hasOverrides
    ? enabledModuleNames.filter((name) => accessMap.get(name) === true)
    : enabledModuleNames;

  const displayModules: DisplayModule[] = allowedModuleNames.map((name) => {
    if (isModuleKey(name)) {
      const def = MODULE_DEFINITIONS[name as ModuleKey];
      return {
        key: name,
        label: def.label,
        description: def.description,
        category: def.category,
      };
    }
    return {
      key: name,
      label: name,
      description: undefined,
      category: "other",
    };
  });

  // Group by category
  const modulesByCategory: Record<ModuleCategory | "other", DisplayModule[]> = {
    public_works: [],
    utilities: [],
    compliance: [],
    finance: [],
    planning: [],
    community: [],
    admin: [],
    other: [],
  };

  for (const mod of displayModules) {
    modulesByCategory[mod.category].push(mod);
  }

  const hasAnyModules = displayModules.length > 0;

  return (
    <>
      <Header />
      <main className="p-6 space-y-6">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold">Tenant Home</h1>
          <p className="text-sm text-zinc-400">
            Tenant:{" "}
            <span className="font-medium text-zinc-200">
              {tenantName}
            </span>
          </p>
          {tenantRole && (
            <p className="text-xs text-zinc-500">
              Your role for this tenant:{" "}
              <span className="font-mono text-zinc-300">{tenantRole}</span>
            </p>
          )}
        </section>

        {/* Daily Summary placeholder */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">
            Daily Summary (Coming Soon)
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            This will be your at-a-glance overview across Work Orders,
            Sampling, DMRs, and other enabled modules for this tenant.
          </p>
        </section>

        {/* Modules by Category */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Modules for this Tenant
            </h2>
            {!hasAnyModules && (
              <span className="text-xs text-zinc-500">
                No modules enabled yet. An admin can turn them on from the
                Tenant Admin Dashboard.
              </span>
            )}
          </div>

          {hasAnyModules ? (
            <div className="space-y-5">
              {(Object.keys(modulesByCategory) as Array<
                ModuleCategory | "other"
              >).map((categoryKey) => {
                const mods = modulesByCategory[categoryKey];
                if (mods.length === 0) return null;

                return (
                  <div key={categoryKey} className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {CATEGORY_LABELS[categoryKey]}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {mods.map((mod) => (
                        <div
                          key={mod.key}
                          className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 hover:border-indigo-500 hover:bg-zinc-900/70"
                        >
                          <div>
                            <div className="text-sm font-medium text-zinc-50">
                              {mod.label}
                            </div>
                            {mod.description && (
                              <p className="mt-1 text-xs text-zinc-400">
                                {mod.description}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 text-[10px] uppercase tracking-wide text-zinc-500">
                            Module key:{" "}
                            <span className="font-mono text-zinc-400">
                              {mod.key}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-400">
              No modules are currently enabled for this tenant. An owner or
              admin can enable modules from the Tenant Admin Dashboard.
            </div>
          )}
        </section>
      </main>
    </>
  );
}
