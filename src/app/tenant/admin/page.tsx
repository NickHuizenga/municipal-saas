// src/app/tenant/admin/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/header";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULE_DEFINITIONS,
  isModuleKey,
  ModuleKey,
} from "@/config/modules";

export const revalidate = 0;

// 🔧 Server action to save the access matrix
async function updateUserModuleAccess(formData: FormData) {
  "use server";

  const tenantId = formData.get("tenant_id") as string | null;
  if (!tenantId) {
    redirect("/tenant/select");
  }

  const supabase = getSupabaseServer();

  // Get current user/session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Check profile (platform owner?)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Check tenant membership/role for this tenant
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  const isTenantAdmin =
    membership && ["owner", "admin"].includes(membership.role);

  if (!isPlatformOwner && !isTenantAdmin) {
    // Not allowed to modify module access
    redirect("/tenant/home");
  }

  // Fetch members & enabled modules so we know all possible combinations
  const { data: members, error: membersError } = await supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", tenantId);

  if (membersError) {
    console.error("Error loading members in action:", membersError);
    redirect("/tenant/admin");
  }

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("module_name")
    .eq("tenant_id", tenantId)
    .eq("enabled", true);

  if (modulesError) {
    console.error("Error loading modules in action:", modulesError);
    redirect("/tenant/admin");
  }

  if (!members || !modules) {
    redirect("/tenant/admin");
  }

  // Build updates from the submitted form
  const updates: {
    tenant_id: string;
    user_id: string;
    module_name: string;
    enabled: boolean;
  }[] = [];

  for (const member of members) {
    for (const mod of modules) {
      const moduleName = mod.module_name as string;
      const key = `access__${member.user_id}__${moduleName}`;
      const value = formData.get(key) as string | null;

      // Dropdown values: "enabled" | "disabled"
      const enabled = value === "enabled";

      updates.push({
        tenant_id: tenantId,
        user_id: member.user_id,
        module_name: moduleName,
        enabled,
      });
    }
  }

  // Upsert all rows in one go
  if (updates.length > 0) {
    const { error: upsertError } = await supabase
      .from("user_module_access")
      .upsert(updates, {
        onConflict: "tenant_id,user_id,module_name",
      });

    if (upsertError) {
      console.error("Error upserting user_module_access:", upsertError);
    }
  }

  // Reload the page with fresh data
  redirect("/tenant/admin");
}

export default async function TenantAdminPage() {
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

  // Tenant membership for this user
  const { data: membership } = await supabase
    .from("tenant_membersments")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", authUserId)
    .maybeSingle();

  const isTenantAdmin =
    membership && ["owner", "admin"].includes(membership.role);

  // Only admins / owners / platform_owner can access this page
  if (!isPlatformOwner && !isTenantAdmin) {
    redirect("/tenant/home");
  }

  // Tenant name (simple lookup)
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  const tenantName = tenantRow?.name ?? "(Selected Tenant)";

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

  // Existing user-module access flags (we read all, not just enabled=true,
  // so we can show "Disabled" as a real state instead of "no row")
  const { data: accessRows, error: accessError } = await supabase
    .from("user_module_access")
    .select("user_id, module_name, enabled")
    .eq("tenant_id", tenantId);

  if (accessError) {
    console.error("Error loading user_module_access:", accessError);
  }

  const moduleNames: string[] =
    modules?.map((m) => m.module_name as string) ?? [];

  const displayModules = moduleNames.map((name) => {
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

  const memberRows =
    members?.map((m) => ({
      userId: m.user_id as string,
      role: m.role as string,
      fullName: (m as any).profiles?.full_name ?? "Unknown User",
      email: (m as any).profiles?.email ?? "",
    })) ?? [];

  // Build a lookup: "userId__moduleName" -> enabled:boolean
  const accessMap = new Map<string, boolean>();
  (accessRows ?? []).forEach((row) => {
    const key = `${row.user_id}__${row.module_name}`;
    accessMap.set(key, row.enabled === true);
  });

  return (
    <>
      <Header />
      <main className="p-6 space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Tenant Admin Dashboard</h1>
          <p className="text-sm text-zinc-400">
            Tenant:{" "}
            <span className="font-medium text-zinc-200">
              {tenantName}
            </span>
          </p>
          <p className="text-xs text-zinc-500">
            Manage per-user access to modules for this municipality.
          </p>
        </div>

        {!modules || modules.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
            No modules are enabled for this tenant yet. Enable modules first in
            your tenant settings or owner dashboard.
          </div>
        ) : memberRows.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
            No members found for this tenant. Invite users and add them to this
            tenant before assigning module access.
          </div>
        ) : (
          <form action={updateUserModuleAccess} className="space-y-4">
            <input type="hidden" name="tenant_id" value={tenantId} />

            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Role
                    </th>
                    {displayModules.map((module) => (
                      <th
                        key={module.key}
                        className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400"
                      >
                        {module.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memberRows.map((member) => (
                    <tr
                      key={member.userId}
                      className="border-t border-zinc-900 hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-100">
                            {member.fullName}
                          </span>
                          {member.email && (
                            <span className="text-xs text-zinc-500">
                              {member.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {member.role}
                      </td>
                      {displayModules.map((module) => {
                        const moduleName = module.key;
                        const key = `${member.userId}__${moduleName}`;
                        const enabled = accessMap.get(key) ?? false;
                        const fieldName = `access__${member.userId}__${moduleName}`;

                        return (
                          <td
                            key={moduleName}
                            className="px-3 py-3 text-center align-middle"
                          >
                            <select
                              name={fieldName}
                              defaultValue={enabled ? "enabled" : "disabled"}
                              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="enabled">Enabled</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-indigo-500 hover:bg-zinc-900/80"
              >
                Save changes
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
