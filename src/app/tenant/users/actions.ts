// src/app/tenant/users/actions.ts
"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { ModuleKey } from "@/config/modules"; // not actually used, but keeps path consistent if tree-shaking

export async function updateTenantUserRoles(formData: FormData) {
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

  const currentUserId = session.user.id;

  // Check if current user is platform owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", currentUserId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Check tenant membership role
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  const tenantRole = membership?.role as string | undefined;
  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // Collect role updates from form fields
  const updates: {
    tenant_id: string;
    user_id: string;
    role: string;
  }[] = [];

  formData.forEach((value, name) => {
    if (name === "tenant_id") return;
    if (!name.startsWith("role__")) return;

    // role__<userId>
    const parts = name.split("__");
    if (parts.length !== 2) return;

    const userIdPart = parts[1];
    const newRole = String(value);

    if (!newRole) return;

    updates.push({
      tenant_id: tenantId,
      user_id: userIdPart,
      role: newRole,
    });
  });

  if (updates.length > 0) {
    const { error } = await supabase
      .from("tenant_memberships")
      .upsert(updates, {
        onConflict: "tenant_id,user_id",
      });

    if (error) {
      console.error("Error updating tenant_memberships roles:", error);
    }
  }

  redirect("/tenant/users");
}
