// src/lib/tenantContext.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULE_DEFINITIONS,
  isModuleKey,
  ModuleKey,
  ModuleCategory,
} from "@/config/modules";

export type AllowedModule = {
  key: string;
  label: string;
  description?: string;
  category: ModuleCategory | "other";
};

export type TenantContext = {
  tenantId: string;
  tenantName: string;
  userId: string;
  isPlatformOwner: boolean;
  tenantRole: string | null;
  allowedModules: AllowedModule[];
  enabledModuleNames: string[];
};

/**
 * Get the current tenant + user context for tenant-scoped pages.
 * Redirects to /tenant/select or /login when needed.
 */
export async function getTenantContext(): Promise<TenantContext> {
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

  const userId = session.user.id;

  // Profile → platform owner?
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Tenant membership + tenant name
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role, tenants(name)")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  const tenantRole = membership?.role ?? null;
  const tenantName =
    (membership as any)?.tenants?.name || "(Selected Tenant)";

  // If they aren't platform_owner AND not a member of this tenant → bounce
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
    console.error("Error loading modules in getTenantContext:", modulesError);
  }

  const enabledModuleNames: string[] =
    modules?.map((m) => m.module_name as string) ?? [];

  // Per-user module access overrides for this tenant
  const { data: accessRows, error: accessError } = await supabase
    .from("user_module_access")
    .select("module_name, enabled")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("enabled", true);

  if (accessError) {
    console.error("Error loading user_module_access in getTenantContext:", accessError);
  }

  const accessMap = new Map<string, boolean>();
  (accessRows ?? []).forEach((row) => {
    accessMap.set(row.module_name as string, row.enabled === true);
  });

  const hasOverrides = (accessRows?.length ?? 0) > 0;

  const allowedModuleNames = hasOverrides
    ? enabledModuleNames.filter((name) => accessMap.get(name) === true)
    : enabledModuleNames;

  const allowedModules: AllowedModule[] = allowedModuleNames.map((name) => {
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
      category: "other" as const,
    };
  });

  return {
    tenantId,
    tenantName,
    userId,
    isPlatformOwner,
    tenantRole,
    allowedModules,
    enabledModuleNames,
  };
}

/**
 * Convenience check used in module pages.
 * Redirects to /tenant/home if the user doesn't have access to this module.
 */
export async function requireModuleAccess(moduleKey: string) {
  const ctx = await getTenantContext();
  const canAccess = ctx.allowedModules.some((m) => m.key === moduleKey);

  if (!canAccess) {
    redirect("/tenant/home");
  }

  return ctx;
}
