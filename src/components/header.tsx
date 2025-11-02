// src/components/header.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  // hard fallbacks so header never breaks /login
  let isPlatformOwner = false;
  let fullName: string | undefined;
  let role: Role | undefined;
  let tenantName: string | undefined;
  let features: TenantFeatures = {};
  let hasTenantCookie = false;

  try {
    const supabase = getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    const tenantCookieName = process.env.TENANT_COOKIE_NAME || "tenant_id";
    const tenantId = cookies().get(tenantCookieName)?.value;
    hasTenantCookie = !!tenantId;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_platform_owner, full_name")
        .eq("id", user.id)
        .maybeSingle();
      isPlatformOwner = !!profile?.is_platform_owner;
      fullName = profile?.full_name ?? undefined;

      if (tenantId) {
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
    }
  } catch {
    // swallow — render a minimal header
  }

  const viewItems = [
    { href: "/", label: "Dashboard", show: true },
    { href: "/tenant/select", label: "Tenants", show: true },
    { href: "/owner", label: "Owner Dashboard", show: isPlatformOwner },
  ];

  const moduleItems = [
    { href: "/work-orders", label: "Work Orders", show: isPlatformOwner || !!features.work_orders },
    { href: "/sampling", label: "Sampling & Compliance", show: isPlatformOwner || !!features.sampling },
    { href: "/mft", label: "MFT Tracker", show: isPlatformOwner || !!features.mft },
    { href: "/grants", label: "Grants", show: isPlatformOwner || !!features.grants },
  ];

  const identityLabel = isPlatformOwner
    ? "Platform Owner"
    : tenantName
    ? tenantName
    : "No tenant selected";

  const identityHref = isPlatformOwner ? "/owner" : tenantName ? "/" : "/tenant/select";

  return (
    <header className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <div className="rounded-2xl border bg-background/70 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground leading-none">
                {isPlatformOwner ? "Signed in as" : tenantName ? "Tenant" : "Context"}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Link
                  href={identityHref}
                  className="inline-flex items-center rounded-full border px-3 py-1 text-sm hover:shadow-sm transition whitespace-nowrap"
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
            <div className="hidden sm:flex items-center gap-2" />
          </div>

          <div className="mt-3 px-3 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* VIEW */}
              <details className="group relative">
                <summary className="list-none inline-flex items-center rounded-2xl border px-3 py-1.5 text-sm hover:shadow-sm hover:bg-background transition cursor-pointer">
                  View <span className="ml-2 inline-block transition group-open:rotate-180">▾</span>
                </summary>
                <div className="absolute mt-2 w-56 rounded-2xl border bg-popover shadow-md overflow-hidden z-50">
                  <ul className="py-1 text-sm">
                    {viewItems.filter(i => i.show).map(i => (
                      <li key={i.href}>
                        <Link href={i.href} className="block px-3 py-2 hover:bg-muted transition">
                          {i.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>

              {/* MODULE */}
              <details className="group relative">
                <summary className="list-none inline-flex items-center rounded-2xl border px-3 py-1.5 text-sm hover:shadow-sm hover:bg-background transition cursor-pointer">
                  Module <span className="ml-2 inline-block transition group-open:rotate-180">▾</span>
                </summary>
                <div className="absolute mt-2 w-72 rounded-2xl border bg-popover shadow-md overflow-hidden z-50">
                  <ul className="py-1 text-sm">
                    {moduleItems.filter(i => i.show).map(i => (
                      <li key={i.href}>
                        <Link href={i.href} className="block px-3 py-2 hover:bg-muted transition">
                          {i.label}
                        </Link>
                      </li>
                    ))}
                    {moduleItems.every(i => !i.show) && (
                      <li className="px-3 py-2 text-muted-foreground">No modules available</li>
                    )}
                  </ul>
                </div>
              </details>
            </div>
          </div>
        </div>

        {!hasTenantCookie && !isPlatformOwner && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2 text-sm text-amber-900">
            You don’t have a tenant active. Go to{" "}
            <Link href="/tenant/select" className="underline">Tenant Select</Link>.
          </div>
        )}
      </div>
    </header>
  );
}
