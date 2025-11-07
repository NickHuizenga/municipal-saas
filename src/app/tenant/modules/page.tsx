// src/app/tenant/modules/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULE_DEFINITIONS,
  ModuleKey,
  ModuleCategory,
} from "@/config/modules";
import { getTenantContext } from "@/lib/tenantContext";

export const revalidate = 0;

type ModuleRow = {
  key: ModuleKey;
  label: string;
  description?: string;
  category: ModuleCategory | "other";
  enabled: boolean;
};

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

// ---- Server action: update tenant-level module flags ----
async function updateTenantModules(formData: FormData) {
  "use server";

  const tenantId = formData.get("tenant_id") as string | null;
  if (!tenantId) {
    redirect("/tenant/select");
  }

  const supabase = getSupabaseServer();

  // Current user / session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Check platform owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Check tenant role
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  const tenantRole = membership?.role ?? null;
  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  // Only platform owners or tenant owners/admins can change module flags
  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // Build upsert rows from form data
  const updates: { tenant_id: string; module_name: string; enabled: boolean }[] =
    [];

  const moduleKeys = Object.keys(MODULE_DEFINITIONS) as ModuleKey[];

  for (const key of moduleKeys) {
    const fieldName = `module__${key}`;
    const value = formData.get(fieldName) as string | null;
    const enabled = value === "enabled";

    updates.push({
      tenant_id: tenantId,
      module_name: key,
      enabled,
    });
  }

  if (updates.length > 0) {
    const { error } = await supabase
      .from("modules")
      .upsert(updates, { onConflict: "tenant_id,module_name" });

    if (error) {
      console.error("Error updating tenant modules:", error);
    }
  }

  redirect("/tenant/modules");
}

export default async function TenantModulesPage() {
  const ctx = await getTenantContext();
  const { tenantId, tenantName, tenantRole, isPlatformOwner } = ctx;

  const supabase = getSupabaseServer();

  // Only platform owners or tenant owners/admins can view this page
  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // Load current module flags for this tenant
  const { data: moduleRows, error: modulesError } = await supabase
    .from("modules")
    .select("module_name, enabled")
    .eq("tenant_id", tenantId);

  if (modulesError) {
    console.error("Error loading modules in tenant modules page:", modulesError);
  }

  const enabledMap = new Map<string, boolean>();
  (moduleRows ?? []).forEach((row) => {
    enabledMap.set(row.module_name as string, row.enabled === true);
  });

  // Build module list from canonical definitions
  const allDefinitions = MODULE_DEFINITIONS;
  const allKeys = Object.keys(allDefinitions) as ModuleKey[];

  const modules: ModuleRow[] = allKeys
    .map((key) => {
      const def = allDefinitions[key];
      const enabled = enabledMap.get(key) ?? false;
      return {
        key,
        label: def.label,
        description: def.description,
        category: def.category ?? "other",
        enabled,
      };
    })
    .sort((a, b) => {
      if (a.category === b.category) {
        return a.label.localeCompare(b.label);
      }
      return a.category.localeCompare(b.category);
    });

  // Group by category
  const modulesByCategory: Record<ModuleCategory | "other", ModuleRow[]> = {
    public_works: [],
    utilities: [],
    compliance: [],
    finance: [],
    planning: [],
    community: [],
    admin: [],
    other: [],
  };

  for (const mod of modules) {
    const cat = mod.category ?? "other";
    modulesByCategory[cat].push(mod);
  }

  const hasAnyModules = modules.length > 0;

  return (
    <main className="p-6 space-y-6">
      {/* Heading */}
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Module Settings</h1>
        <p className="text-sm text-zinc-400">
          Tenant:{" "}
          <span className="font-medium text-zinc-200">
            {tenantName}
          </span>
        </p>
        <p className="text-xs text-zinc-500">
          Use this page to turn modules on or off for this municipality. Per-user
          access is managed separately in the Tenant Admin Dashboard.
        </p>
      </section>

      {!hasAnyModules ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
          No modules are defined for this tenant yet. Make sure you&apos;ve run
          your seed script to create module rows in the <code>modules</code> table.
        </section>
      ) : (
        <form action={updateTenantModules} className="space-y-4">
          <input type="hidden" name="tenant_id" value={tenantId} />

          <div className="space-y-5">
            {(Object.keys(modulesByCategory) as Array<
              ModuleCategory | "other"
            >).map((categoryKey) => {
              const mods = modulesByCategory[categoryKey];
              if (mods.length === 0) return null;

              return (
                <section key={categoryKey} className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {CATEGORY_LABELS[categoryKey]}
                  </h2>
                  <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/60">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Module
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mods.map((mod) => {
                          const fieldName = `module__${mod.key}`;
                          const defaultValue = mod.enabled
                            ? "enabled"
                            : "disabled";

                          return (
                            <tr
                              key={mod.key}
                              className="border-t border-zinc-900 hover:bg-zinc-900/40"
                            >
                              <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                                {mod.label}
                                <div className="mt-0.5 text-[10px] font-mono uppercase tracking-wide text-zinc-500">
                                  {mod.key}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-zinc-400">
                                {mod.description ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <select
                                  name={fieldName}
                                  defaultValue={defaultValue}
                                  className="inline-flex rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="enabled">Enabled</option>
                                  <option value="disabled">Disabled</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-indigo-500 hover:bg-zinc-900/80"
            >
              Save module settings
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
