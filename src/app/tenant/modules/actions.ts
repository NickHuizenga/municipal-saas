"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { MODULE_DEFINITIONS, ModuleKey } from "@/config/modules";

export async function updateTenantModules(formData: FormData) {
  const tenantId = formData.get("tenant_id") as string | null;
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

  // Presence of checkbox ==> enabled
  const updates: {
    tenant_id: string;
    module_name: string;
    enabled: boolean;
  }[] = [];

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
