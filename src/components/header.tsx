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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

    { href: "/work-orders", label: "Work Orders", show: isPlatformOwner || !!features.work_orders },
    { href: "/sampling", label: "Sampling & Compliance", show: isPlatformOwner || !!features.sampling },
    { href: "/mft", label: "MFT Tracker", show: isPlatformOwner || !!features.mft },
    { href: "/grants", label: "Grants", show: isPlatformOwner || !!features.grants },

    { href: "/settings/members", label: "Members", show: isPlatformOwner || isOwnerOrAdmin(role) },
    { href: "/settings/invite", label: "Invite", show: isPlatformOwner || isOwnerOrAdmin(role) },
  ];

  // Identity chip content
  const identityLabel = isPlatformOwner
    ? "Platform Owner"
    : tenantName
    ? tenantName
    : "No tenant selected";

  const identityHref = isPlatformOwner ? "/owner" : tenantName ? "/" : "/tenant/select";

  return (
    <header className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto max-w-6xl px-4 pt-3">
        {/* Card-like container */}
        <div className="rounded-2xl border bg-background/70 backdrop-blur shadow-sm">
          {/* Top row: identity */}
          <div className="flex items-center justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground leading-none">
                {isPlatformOwner ? "Signed in as" : tenantName ? "Tenant" : "Context"}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Link
                  href={identityHref}
                  className="inline-flex items-center rounded-full border px-3 py-1 text-sm hover:shadow-sm transition whitespace-nowrap"
                  title={identityLabel}
                >
                  {identityLabel}
                </Link>
                {fullName && (
                  <span className="hidden sm:inline text-xs text-muted-foreground truncate">
                    {fullName}
                  </span>
                )}
              </div>
            </div>
            {/* (Optional) Right-side space for future quick actions */}
            <div className="hidden sm:flex items-center gap-2" />
          </div>

          {/* Nav row: pill links */}
          <div className="mt-3 px-2 pb-3">
            <nav className="flex items-center gap-2 overflow-x-auto py-1 px-1">
              {items
                .filter((i) => i.show)
                .map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className="inline-flex items-center rounded-2xl border px-3 py-1.5 text-sm hover:shadow-sm hover:bg-background transition whitespace-nowrap"
                  >
                    {i.label}
                  </Link>
                ))}
            </nav>
          </div>
        </div>

        {/* Alert strip when no tenant is active (non-owner) */}
        {!tenantId && !isPlatformOwner && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2 text-sm text-amber-900">
            You don’t have a tenant active. Go to{" "}
            <Link href="/tenant/select" className="underline">
              Tenant Select
            </Link>
            .
          </div>
        )}
      </div>
    </header>
  );
}
