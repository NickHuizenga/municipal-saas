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

// ---------- SERVER ACTION ----------
async function updateTenantModules(formData: FormData) {
  "use server";

  const tenantId = formData.get("tenant_id") as string | null;
  if (!tenantId) redirect("/tenant/select");

  const supabase = getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

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

  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // Read toggle values: presence of checkbox => enabled
  const updates: { tenant_id: string; module_name: string; enabled: boolean }[] =
    [];

  const moduleKeys = Object.keys(MODULE_DEFINITIONS) as ModuleKey[];

  for (const key of moduleKeys) {
    const fieldName = `module__${key}__enabled`;
    const isChecked = formData.get(fieldName) != null;
    updates.push({
      tenant_id: tenantId,
      module_name: key,
      enabled: isChecked,
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

// ---------- PAGE ----------
export default async function TenantModulesPage() {
  const ctx = await getTenantContext();
  const { tenantId, tenantName, tenantRole, isPlatformOwner } = ctx;

  const supabase = getSupabaseServer();

  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // Load current module flags for this tenant
  const { data: moduleRows, error } = await supabase
    .from("modules")
    .select("module_name, enabled")
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error loading modules:", error);
  }

  const enabledMap = new Map<string, boolean>();
  (moduleRows ?? []).forEach((row) => {
    enabledMap.set(row.module_name as string, row.enabled === true);
  });

  // Build canonical list from definitions
  const allKeys = Object.keys(MODULE_DEFINITIONS) as ModuleKey[];
  const modules: ModuleRow[] = allKeys.map((key) => {
    const def = MODULE_DEFINITIONS[key];
    const enabled = enabledMap.get(key) ?? false;
    return {
      key,
      label: def.label,
      description: def.description,
      category: def.category ?? "other",
      enabled,
    };
  });

  // Group by category
  const grouped: Record<ModuleCategory | "other", ModuleRow[]> = {
    public_works: [],
    utilities: [],
    compliance: [],
    finance: [],
    planning: [],
    community: [],
    admin: [],
    other: [],
  };

  modules.forEach((m) => grouped[m.category].push(m));

  return (
    <main className="p-6 space-y-6">
      {/* Heading */}
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Module Settings</h1>
        <p className="text-sm text-zinc-400">
          Tenant:{" "}
          <span className="font-medium text-zinc-200">{tenantName}</span>
        </p>
        <p className="text-xs text-zinc-500">
          Turn modules on or off for this municipality. Per-user permissions are
          controlled separately in the Tenant Admin Dashboard.
        </p>
      </section>

      <form action={updateTenantModules} className="space-y-8">
        <input type="hidden" name="tenant_id" value={tenantId} />

        {Object.entries(grouped).map(([category, list]) =>
          list.length > 0 ? (
            <section key={category} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {CATEGORY_LABELS[category as ModuleCategory]}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {list.map((mod) => {
                  const fieldName = `module__${mod.key}__enabled`;
                  return (
                    <label
                      key={mod.key}
                      className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                        mod.enabled
                          ? "border-indigo-500/70 bg-zinc-900/80"
                          : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-100">
                              {mod.label}
                            </h3>
                            <p className="mt-1 text-[10px] font-mono uppercase text-zinc-500">
                              {mod.key}
                            </p>
                          </div>

                          {/* Toggle + live status text (pure CSS via peer) */}
                          <div className="flex items-center gap-2">
                            <div className="relative flex items-center gap-2">
                              <input
                                type="checkbox"
                                name={fieldName}
                                defaultChecked={mod.enabled}
                                className="peer sr-only"
                              />
                              <span className="text-[10px] uppercase tracking-wide text-zinc-500 peer-checked:hidden">
                                Disabled
                              </span>
                              <span className="hidden text-[10px] uppercase tracking-wide text-indigo-400 peer-checked:inline">
                                Enabled
                              </span>
                              <div className="h-5 w-9 rounded-full bg-zinc-700 peer-checked:bg-indigo-500 transition-colors flex items-center">
                                <div className="h-4 w-4 rounded-full bg-zinc-950 shadow-sm translate-x-1 peer-checked:translate-x-4 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-xs text-zinc-400 leading-snug">
                          {mod.description ?? "—"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          ) : null
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-indigo-500 hover:bg-zinc-900/80"
          >
            Save Module Settings
          </button>
        </div>
      </form>
    </main>
  );
}
