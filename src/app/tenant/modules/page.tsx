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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  const tenantRole = membership?.role ?? null;
  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  if (!isPlatformOwner && !isTenantAdminOrOwner) redirect("/tenant/home");

  const updates: { tenant_id: string; module_name: string; enabled: boolean }[] =
    [];

  const moduleKeys = Object.keys(MODULE_DEFINITIONS) as ModuleKey[];

  for (const key of moduleKeys) {
    const fieldName = `module__${key}`;
    const value = formData.get(fieldName) as string | null;
    const enabled = value === "enabled";
    updates.push({ tenant_id: tenantId, module_name: key, enabled });
  }

  if (updates.length > 0) {
    const { error } = await supabase
      .from("modules")
      .upsert(updates, { onConflict: "tenant_id,module_name" });
    if (error) console.error("Error updating tenant modules:", error);
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

  if (!isPlatformOwner && !isTenantAdminOrOwner) redirect("/tenant/home");

  const { data: moduleRows, error } = await supabase
    .from("modules")
    .select("module_name, enabled")
    .eq("tenant_id", tenantId);

  if (error) console.error("Error loading modules:", error);

  const enabledMap = new Map<string, boolean>();
  (moduleRows ?? []).forEach((row) => {
    enabledMap.set(row.module_name as string, row.enabled === true);
  });

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
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Module Settings</h1>
        <p className="text-sm text-zinc-400">
          Tenant:{" "}
          <span className="font-medium text-zinc-200">{tenantName}</span>
        </p>
        <p className="text-xs text-zinc-500">
          Use this page to turn modules on or off for this municipality. Per-user
          access is managed separately in the Tenant Admin Dashboard.
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
                  const fieldName = `module__${mod.key}`;
                  const defaultValue = mod.enabled ? "enabled" : "disabled";
                  return (
                    <div
                      key={mod.key}
                      className={`relative flex flex-col justify-between rounded-xl border ${
                        mod.enabled
                          ? "border-indigo-500/60 bg-zinc-900/70"
                          : "border-zinc-800 bg-zinc-950/50"
                      } p-4 hover:border-indigo-400/70 transition`}
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">
                          {mod.label}
                        </h3>
                        <p className="mt-1 text-[10px] font-mono uppercase text-zinc-500">
                          {mod.key}
                        </p>
                        <p className="mt-2 text-xs text-zinc-400 leading-snug">
                          {mod.description ?? "—"}
                        </p>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <select
                          name={fieldName}
                          defaultValue={defaultValue}
                          className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="enabled">Enabled</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>
                    </div>
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
