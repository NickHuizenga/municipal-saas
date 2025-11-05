// src/components/header.tsx

import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Header() {
  const supabase = getSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    // Not signed in – show a minimal header
    return (
      <header className="mb-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-sm text-[rgb(var(--muted-foreground))]">
            Not signed in
          </div>
          <Link
            href="/login"
            className="rounded-full border border-[rgb(var(--border))] px-4 py-1.5 text-sm text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
          >
            Sign in
          </Link>
        </div>
      </header>
    );
  }

  // Load profile to get name + platform_owner flag
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("header: profile error", profileError);
  }

  const fullName = profile?.full_name || user.email || "User";
  const isPlatformOwner = !!profile?.is_platform_owner;
  const rolePill = isPlatformOwner ? "Platform Owner" : "Signed in";

  return (
    <header className="mb-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-3">
        <div className="flex items-center justify-between rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
          {/* Left: account info */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs text-[rgb(var(--muted-foreground))]">
              {rolePill}
            </span>
            <span className="text-sm text-[rgb(var(--card-foreground))]">
              {fullName}
            </span>
          </div>

          {/* Right: dropdowns */}
          <div className="flex items-center gap-3 text-sm">
            {/* View dropdown */}
            <Dropdown label="View">
              <DropdownItem href="/">Dashboard</DropdownItem>
              <DropdownItem href="/tenant/select">Tenants</DropdownItem>
              <DropdownItem href="/owner">Owner Dashboard</DropdownItem>
            </Dropdown>

            {/* Module dropdown – links are placeholders for now */}
            <Dropdown label="Module">
              <DropdownItem href="/work-orders">Work Orders</DropdownItem>
              <DropdownItem href="/sampling">Sampling &amp; Compliance</DropdownItem>
              <DropdownItem href="/dmr">DMR Reports</DropdownItem>
              <DropdownItem href="/water-reports">Water Reports</DropdownItem>
              <DropdownItem href="/mft">MFT Tracker</DropdownItem>
              <DropdownItem href="/grants">Grants</DropdownItem>
            </Dropdown>

            {/* Add dropdown – only for platform owners */}
            {isPlatformOwner && (
              <Dropdown label="Add">
                <DropdownItem href="/owner/add-tenant">
                  Add Tenant
                </DropdownItem>
                <DropdownItem href="/invite">
                  Invite User
                </DropdownItem>
              </Dropdown>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Dropdown components (pure server, using <details>) ---------- */

type DropdownProps = {
  label: string;
  children: React.ReactNode;
};

function Dropdown({ label, children }: DropdownProps) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]">
        <span>{label}</span>
        <span className="ml-1 text-[0.7rem] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--popover))] py-1 shadow-lg">
        {children}
      </div>
    </details>
  );
}

type DropdownItemProps = {
  href: string;
  children: React.ReactNode;
};

function DropdownItem({ href, children }: DropdownItemProps) {
  return (
    <Link
      href={href}
      className="block px-3 py-1.5 text-xs text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
    >
      {children}
    </Link>
  );
}
