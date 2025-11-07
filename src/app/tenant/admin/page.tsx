// src/app/tenant/admin/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULE_DEFINITIONS,
  isModuleKey,
  ModuleKey,
} from "@/config/modules";
import { getTenantContext } from "@/lib/tenantContext";
import AccessMatrixForm, {
  AdminMemberRow,
  AdminModuleColumn,
} from "./AccessMatrixForm";

export const revalidate = 0;

export default async function TenantAdminPage() {
  const ctx = await getTenantContext();
  const { tenantId, tenantName, tenantRole, isPlatformOwner } = ctx;

  const supabase = getSupabaseServer();

  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  // Only platform owners or tenant owners/admins may view this page
  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // All members in this tenant with profile info
  const { data: members, error: membersError } = await supabase
    .from("tenant_memberships")
    .select("user_id, role, profiles(full_name, email)")
    .eq("tenant_id", tenantId)
    .order("role", { ascending: true });

  if (membersError) {
    console.error("Error loading members:", membersError);
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

  // Existing per-user access flags
  const { data: accessRows, error: accessError } = await supabase
    .from("user_module_access")
    .select("user_id, module_name, enabled")
    .eq("tenant_id", tenantId);

  if (accessError) {
    console.error("Error loading user_module_access:", accessError);
  }

  const moduleNames: string[] =
    modules?.map((m) => m.module_name as string) ?? [];

  const displayModules: AdminModuleColumn[] = moduleNames.map((name) => {
    if (isModuleKey(name)) {
      const def = MODULE_DEFINITIONS[name as ModuleKey];
      return {
        key: name,
        label: def.label,
      };
    }
    return {
      key: name,
      label: name,
    };
  });

  const memberRows: AdminMemberRow[] =
    members?.map((m) => ({
      userId: m.user_id as string,
      role: m.role as string,
      fullName: (m as any).profiles?.full_name ?? "Unknown User",
      email: (m as any).profiles?.email ?? "",
    })) ?? [];

  // Build lookup: "userId__moduleKey" -> enabled
  const accessDefaults: Record<string, boolean> = {};
  (accessRows ?? []).forEach((row) => {
    const key = `${row.user_id}__${row.module_name}`;
    accessDefaults[key] = row.enabled === true;
  });

  const hasModules = displayModules.length > 0;
  const hasMembers = memberRows.length > 0;

  return (
    <main className="p-6 space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tenant Admin Dashboard</h1>
        <p className="text-sm text-zinc-400">
          Tenant:{" "}
          <span className="font-medium text-zinc-200">
            {tenantName}
          </span>
        </p>
        <p className="text-xs text-zinc-500">
          Manage per-user access to modules for this municipality. Tenant-level
          modules are enabled on the Module Settings page.
        </p>
      </div>

      {!hasModules ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
          No modules are enabled for this tenant yet. Use the{" "}
          <span className="font-mono text-xs">Module Settings</span> view to
          turn modules on for this tenant before assigning per-user access.
        </div>
      ) : !hasMembers ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
          No members found for this tenant. Invite users and add them to this
          tenant before assigning module access.
        </div>
      ) : (
        <AccessMatrixForm
          tenantId={tenantId}
          members={memberRows}
          modules={displayModules}
          accessDefaults={accessDefaults}
        />
      )}
    </main>
  );
}
