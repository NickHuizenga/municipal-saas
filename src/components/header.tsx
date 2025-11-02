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

export default async function Header() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const tenantCookieName = process.env.TENANT_COOKIE_NAME || "tenant_id";
  const tenantId = cookies().get(tenantCookieName)?.value;

  // Platform owner flag (global)
  let isPlatformOwner = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_owner, full_name")
      .eq("id", user.id)
      .maybeSingle();
    isPlatformOwner = !!profile?.is_platform_owner;
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

  // Nav items — platform owner sees ALL modules regardless of membership/flags
  const items: { href: string; label: string; show: boolean }[] = [
    { href: "/", label: "Dashboard", show: true },
    { href: "/tenant/select", label: "Tenants", show: true },
    { href: "/owner", label: "Owner Dashboard", show: isPlatformOwner },

    // Module links
    {
      href: "/work-orders",
      label: "Work Orders",
      show: isPlatformOwner || !!features.work_orders,
    },
    {
      href: "/sampling",
      label: "Sampling & Compliance",
      show: isPlatformOwner || !!features.sampling,
    },
    { href: "/mft", label: "MFT Tracker", show: isPlatformOwner || !!features.mft },
    { href: "/grants", label: "Grants", show: isPlatformOwner || !!features.grants },

    // Admin links
    {
      href: "/settings/members",
      label: "Members",
      show: isPlatformOwner || isOwnerOrAdmin(role),
    },
    {
      href: "/settings/invite",
      label: "Invite",
      show: isPlatformOwner || isOwnerOrAdmin(role),
    },
  ];

  return (
    <header className="border-b bg-background/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground leading-none">
            {isPlatformOwner ? "Platform Owner" : tenantName ? "Tenant" : "No tenant selected"}
          </div>
          <div className="text-base font-medium truncate">
            {isPlatformOwner ? (
              <>
                <Link href="/owner" className="underline">Owner Dashboard</Link>
              </>
            ) : tenantName ? (
              tenantName
            ) : (
              <Link href="/tenant/select" className="underline">Choose a tenant</Link>
            )}
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2 text-sm">
          {items.filter(i => i.show).map(i => (
            <Link
              key={i.href}
              href={i.href}
              className="rounded-lg px-3 py-1.5 hover:bg-muted transition"
            >
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="md:hidden">
          {/* Simple mobile entry-point; expand later */}
          <Link href="/tenant/select" className="rounded-lg px-3 py-1.5 border">
            Menu
          </Link>
        </div>
      </div>

      {!tenantId && !isPlatformOwner && (
        <div className="bg-amber-50 text-amber-900 border-t border-amber-200">
          <div className="mx-auto max-w-6xl px-4 py-2 text-sm">
            You don’t have a tenant active. Go to{" "}
            <Link href="/tenant/select" className="underline">Tenant Select</Link>.
          </div>
        </div>
      )}
    </header>
  );
}
