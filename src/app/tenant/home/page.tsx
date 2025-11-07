// src/app/tenant/home/page.tsx
import {
  MODULE_ROUTES,
  isModuleKey,
  ModuleKey,
  ModuleCategory,
} from "@/config/modules";
import {
  getTenantContext,
  AllowedModule,
} from "@/lib/tenantContext";

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

type DisplayModule = AllowedModule & {
  route?: string;
};

export default async function TenantHomePage() {
  const ctx = await getTenantContext();

  const { tenantName, tenantRole, allowedModules } = ctx;

  const displayModules: DisplayModule[] = allowedModules.map((mod) => {
    let route: string | undefined;
    if (isModuleKey(mod.key)) {
      route = MODULE_ROUTES[mod.key as ModuleKey];
    }

    return {
      ...mod,
      route,
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
                    {mods.map((mod) => {
                      const content = (
                        <div className="flex h-full flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 hover:border-indigo-500 hover:bg-zinc-900/70">
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
                      );

                      // If we have a route, the card is clickable; if not, it's just a static card for now
                      return mod.route ? (
                        <a key={mod.key} href={mod.route}>
                          {content}
                        </a>
                      ) : (
                        <div key={mod.key}>{content}</div>
                      );
                    })}
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
  );
}
