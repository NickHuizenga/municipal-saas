// src/components/header.tsx
import { cookies } from "next/headers";
import Link from "next/link";
import NavMenusClient from "@/components/NavMenusClient";
import { getSupabaseServer } from "@/lib/supabaseServer";

const TENANT_COOKIE_NAME = process.env.TENANT_COOKIE_NAME ?? "tenant_id";

type Role = "owner" | "admin" | "dispatcher" | "crew_leader" | "crew" | "viewer";
type TenantFeatures = { work_orders?: boolean; sampling?: boolean; mft?: boolean; grants?: boolean };

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[rgb(var(--border))] px-3 py-1 text-sm text-[rgb(var(--muted-foreground))]">
      {children}
    </span>
  );
}

export default async function Header() {
  const supabase = getSupabaseServer();

  // Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return (
      <header className="mx-auto mb-4 mt-2 w-full max-w-6xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pill>Signed out</Pill>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-sm text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]"
          >
            Login
          </Link>
        </div>
      </header>
    );
  }

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();
  const name = profile?.full_name ?? user.email ?? "User";
  const isPlatformOwner = !!profile?.is_platform_owner;

  // Tenant & membership
  const tenantId = cookies().get(TENANT_COOKIE_NAME)?.value ?? null;

  let role: Role | null = null;
  if (tenantId) {
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .maybeSingle();
    role = (membership?.role as Role) ?? null;
  }

  // Features for Module menu
  let features: TenantFeatures | null = null;
  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("features")
      .eq("id", tenantId)
      .maybeSingle();
    features = (tenant?.features as TenantFeatures) ?? null;
  }

  // VIEW menu
  const viewItems = [
    { href: "/", label: "Dashboard" },
    { href: "/tenant/select", label: "Tenants" },
    ...(isPlatformOwner ? [{ href: "/owner", label: "Owner Dashboard" }] : []),
  ];

  // MODULE menu (respect tenant features; owner can see disabled but they’re greyed out)
  const catalog = [
    { key: "work_orders", label: "Work Orders", href: "/work-orders" },
    { key: "sampling", label: "Sampling & Compliance", href: "/sampling" },
    { key: "mft", label: "MFT Tracker", href: "/mft" },
    { key: "grants", label: "Grants", href: "/grants" },
  ] as const;

  const moduleItems = catalog
    .map((m) => {
      const enabled = tenantId && features ? !!(features as any)[m.key] : true;
      const disabled = tenantId ? !enabled && !isPlatformOwner : false;
      const visible = isPlatformOwner || enabled || !tenantId;
      return visible ? { label: m.label, href: m.href, disabled } : null;
    })
    .filter(Boolean) as { label: string; href: string; disabled?: boolean }[];

  // ADD menu (owner page only). “Add User” requires tenant pre-selection.
  const inviteHref = tenantId ? `/invite?tenant_id=${encodeURIComponent(tenantId)}` : "/invite";
  const addItems =
    isPlatformOwner
      ? [
          { label: "Add Tenant", href: "/owner/add-tenant" },
          { label: "Add User", href: inviteHref, disabled: !tenantId }, // disabled until a tenant is selected
        ]
      : [];

  return (
    <header className="mx-auto mb-4 mt-2 w-full max-w-6xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: account info */}
        <div className="flex items-center gap-3">
          <Pill>{isPlatformOwner ? "Platform Owner" : role ?? "Member"}</Pill>
          <span className="text-sm text-[rgb(var(--muted-foreground))]">{name}</span>
        </div>

        {/* Right: View / Module / Add (Add shows only on /owner via client check) */}
        <NavMenusClient
          viewItems={viewItems}
          moduleItems={moduleItems}
          addItems={isPlatformOwner ? addItems : undefined}
          showAddWhenPathStartsWith="/owner"
        />
      </div>
    </header>
  );
}
