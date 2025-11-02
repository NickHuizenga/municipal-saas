// src/components/header.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";

type Role = "owner" | "admin" | "dispatcher" | "crew_leader" | "crew" | "viewer";

type TenantFeatures = {
  work_orders?: boolean;
  sampling?: boolean;
  mft?: boolean;
  grants?: boolean;
  [key: string]: boolean | undefined;
};

function isOwnerOrAdmin(role?: Role) {
  return role === "owner" || role === "admin";
}

/**
 * Header
 * - Card-like container (rounded-2xl, border, soft shadow)
 * - Pill-style nav links that match your card styling
 * - Permission-aware (platform owner sees all)
 * - Feature-flag-aware for tenant-scoped users
 * - Compact, with horizontal scroll on smaller screens
 */
export default async function Header() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const tenantCookieName = process.env.TENANT_COOKIE_NAME || "tenant_id";
  const tenantId = cookies().get(tenantCookieName)?.value;

  // Global platform owner flag
  let isPlatformOwner = false;
  let fullName: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_owner, full_name")
      .eq("id", user.id)
      .maybeSingle();
    isPlatformOwner = !!profile?.is_platform_owner;
    fullName = profile?.full_name ?? undefined;
  }

  // Tenant-scoped info
  let role: Role | undefined;
  let tenantName: string | undefined;
  let features: TenantFeatures = {};

  if (user && tenantId) {
    const { data } = await supabase
      .from("tenant_memberships")
      .select("role, tenants!inner(name, features)")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    role = (data?.role as Role) || undefined;
    tenantName = (data as any)?.tenants?.name;
    features = ((data as any)?.tenants?.features ?? {}) as TenantFeatures;
  }

  // Nav items — platform owner sees ALL modules regardless of flags
  const items: { href: string; label: string; show: boolean }[] = [
    { href: "/", label: "Dashboard", show: true },
    { href: "/tenant/select", label: "Tenants", show: true },
    { href: "/owner", label: "Owner Dashboard", show: isPlatformOwner },

    { href: "/work-orders", label: "Work Orders", show: isPlatformOwne
