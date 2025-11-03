// src/components/header.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";

const TENANT_COOKIE_NAME = process.env.TENANT_COOKIE_NAME ?? "tenant_id";

type Role =
  | "owner"
  | "admin"
  | "dispatcher"
  | "crew_leader"
  | "crew"
  | "viewer";

type TenantFeatures = {
  work_orders?: boolean;
  sampling?: boolean;
  mft?: boolean;
  grants?: boolean;
};

function Pill({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[rgb(var(--border))] px-3 py-1 text-sm text-[rgb(var(--muted-foreground))] ${className}`}
    >
      {children}
    </span>
  );
}

function Dropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  // Uses native <details> for zero-JS dropdown
  return (
    <details className="group relative">
      <summary className="list-none cursor-pointer">
        <Pill className="hover:bg-[rgb(var(--muted))]">
          {label}
          <svg
            className="ml-2 h-4 w-4 transition group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.106l3.71-3.875a.75.75 0 111.08 1.04l-4.24 4.43a.75.75 0 01-1.08 0l-4.24-4.43a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </Pill>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--popover))] shadow-xl">
        <nav className="flex flex-col py-1">{children}</nav>
      </div>
    </details>
  );
}

function DropItem({
  href,
  children,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const cls =
    "px-3 py-2 text-sm text-[rgb(var(--popover-foreground))] hover:bg-[rgb(var(--muted))]";
  if (disabled) {
    return (
      <div
        className={`${cls} opacity-50 cursor-not-allowed select-none`}
        aria-disabled="true"
      >
        {children}
      </div>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export default async function Header() {
  const supabase = getSupabaseServer();

  // Current user
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  // If unauthenticated, render a minimal bar
  if (!user) {
    return (
      <div className="mx-auto mb-4 mt-2 w-full max-w-6xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Pill>Signed out</Pill>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-sm text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Profile & platform-owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.full_name ?? user.email ?? "User";
  const isPlatformOwner = !!profile?.is_platform_owner;

  // Current tenant & membership role
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

  // Current tenant features to drive Module dropdown
  let features: TenantFeatures | null = null;
  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("features")
      .eq("id", tenantId)
      .maybeSingle();
    features = (tenant?.features as TenantFeatures) ?? null;
  }

  // VIEW dropdown items (permission aware)
  const viewItems: { href: string; label: string; show: boolean }[] = [
    { href: "/", label: "Dashboard", show: true },
    { href: "/tenant/select", label: "Tenants", show: true },
    { href: "/owner", label: "Owner Dashboard", show: isPlatformOwner },
  ];

  // MODULE dropdown items (filtered by features if tenant selected)
  // If no tenant yet, show everything enabled for owner, otherwise filter by features.
  const modulesCatalog = [
    { key: "work_orders", label: "Work Orders", href: "/work-orders" },
    { key: "sampling", label: "Sampling & Compliance", href: "/sampling" },
    { key: "mft", label: "MFT Tracker", href: "/mft" },
    { key: "grants", label: "Grants", href: "/grants" },
  ] as const;

  const modulesToShow = modulesCatalog.map((m) => {
    let enabled = true;
    if (tenantId && features) {
      enabled = !!(features as any)[m.key];
    }
    // Platform owner sees items even when disabled, but grayed out if tenant has it off
    const disabled = tenantId ? !enabled && !isPlatformOwner : false;
    const visible = isPlatformOwner || enabled || !tenantId;
    return { ...m, visible, disabled };
  });

  return (
    <div className="mx-auto mb-4 mt-2 w-full max-w-6xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: Account info */}
        <div className="flex items-center gap-3">
          <Pill>
            {isPlatformOwner ? "Platform Owner" : role ? role : "Member"}
          </Pill>
          <span className="text-sm text-[rgb(var(--muted-foreground))]">
            {name}
          </span>
        </div>

        {/* Right: Dropdowns (side by side) */}
        <div className="flex items-center gap-3">
          <Dropdown label="View">
            {viewItems
              .filter((i) => i.show)
              .map((i) => (
                <DropItem key={i.href} href={i.href}>
                  {i.label}
                </DropItem>
              ))}
          </Dropdown>

          <Dropdown label="Module">
            {modulesToShow
              .filter((m) => m.visible)
              .map((m) => (
                <DropItem
                  key={m.href}
                  href={m.href}
                  disabled={m.disabled}
                >
                  {m.label}
                </DropItem>
              ))}
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
