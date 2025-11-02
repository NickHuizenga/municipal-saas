// src/app/tenant/resolve/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function TenantResolvePage() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tenantCookieName = process.env.TENANT_COOKIE_NAME || "tenant_id";
  const tenantId = cookies().get(tenantCookieName)?.value || null;

  // No cookie? Send to tenant selector.
  if (!tenantId) {
    redirect("/tenant/select?error=no_tenant");
  }

  // Check tenant actually exists (helps if someone has a stale/bad cookie)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) {
    // Clear the bad cookie and send them to select again
    cookies().set(tenantCookieName, "", { path: "/", maxAge: 0 });
    redirect("/tenant/select?error=unknown_tenant");
  }

  // Platform owner shortcut: allow through without membership
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  const isPlatformOwner = !!profile?.is_platform_owner;
  if (isPlatformOwner) {
    // Owner can assume any tenant context; proceed to dashboard
    redirect("/");
  }

  // Non-owner: require membership in the selected tenant
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/tenant/select?error=not_member");
  }

  // All good — go to the main app/dashboard
  redirect("/");
}
