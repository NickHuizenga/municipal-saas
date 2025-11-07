// src/app/tenant/modules/page.tsx
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULE_DEFINITIONS,
  ModuleKey,
  ModuleCategory,
} from "@/config/modules";
import { getTenantContext } from "@/lib/tenantContext";
import ModuleSettingsForm from "./ModuleSettingsForm";

export const revalidate = 0;

export type ModuleRow = {
  key: ModuleKey;
  label: string;
  description?: string;
  category: ModuleCategory | "other";
  enabled: boolean;
};

export type ModuleGroup = {
  categoryKey: ModuleCategory | "other";
  label: string;
  modules: ModuleRow[];
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

export default async function TenantModulesPage() {
  const ctx = await getTenantContext();
  const { tenantId, tenantName, tenantRole, isPlatformOwner } = ctx;

  const supabase = getSupabaseServer();

  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    // Non-admins shouldn’t be here
    // Tenant Home is their landing page
    // (getTenantContext already ensures membership)
    return null;
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

  modules.forEach((m) => {
    grouped[m.category].push(m);
  });

  const groups: ModuleGroup[] = (Object.keys(grouped) as Array<
    ModuleCategory | "other"
  >)
    .map((categoryKey) => ({
      categoryKey,
      label: CATEGORY_LABELS[categoryKey],
      modules: grouped[categoryKey],
    }))
    .filter((g) => g.modules.length > 0);

  return (
    <main className="p-6 space-y-6">
      {/* Heading stays at top; sticky Save button lives just below via ModuleSettingsForm */}
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

      <ModuleSettingsForm tenantId={tenantId} groups={groups} />
    </main>
  );
}
