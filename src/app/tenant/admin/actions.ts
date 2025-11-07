"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function updateUserModuleAccess(formData: FormData) {
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

  // Check profile (platform owner?)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Check tenant membership / role
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

  // Build updates directly from form fields
  const updates: {
    tenant_id: string;
    user_id: string;
    module_name: string;
    enabled: boolean;
  }[] = [];

  for (const [name, value] of formData.entries()) {
    if (name === "tenant_id") continue;
    if (!name.startsWith("access__")) continue;

    // access__<userId>__<moduleName>
    const parts = name.split("__");
    if (parts.length !== 3) continue;

    const userIdPart = parts[1];
    const moduleName = parts[2];
    const enabled = (value as string) === "enabled";

    updates.push({
      tenant_id: tenantId,
      user_id: userIdPart,
      module_name: moduleName,
      enabled,
    });
  }

  if (updates.length > 0) {
    const { error } = await supabase
      .from("user_module_access")
      .upsert(updates, {
        onConflict: "tenant_id,user_id,module_name",
      });

    if (error) {
      console.error("Error upserting user_module_access:", error);
    }
  }

  redirect("/tenant/admin");
}
