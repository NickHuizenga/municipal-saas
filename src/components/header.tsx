// src/components/header.tsx

import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { HeaderDropdown } from "./HeaderDropdown";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Header() {
  const supabase = getSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    // Not signed in – simple header
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

  // Load profile for name + platform_owner flag
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

  // Dropdown items
  const viewItems = [
    { href: "/", label: "Dashboard" },
    { href: "/tenant/select", label: "Tenants" },
    { href: "/owner", label: "Owner Dashboard" },
  ];

  const moduleItems = [
    { href: "/work-orders", label: "Work Orders" },
    { href: "/sampling", label: "Sampling & Compliance" },
    { href: "/dmr", label: "DMR Reports" },
    { href: "/water-reports", label: "Water Reports" },
    { href: "/mft", label: "MFT Tracker" },
    { href: "/grants", label: "Grants" },
  ];

  const addItems = [
    { href: "/owner/add-tenant", label: "Add Tenant" },
    { href: "/invite", label: "Invite User" },
  ];

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
            <HeaderDropdown label="View" items={viewItems} />
            <HeaderDropdown label="Module" items={moduleItems} />
            {isPlatformOwner && (
              <HeaderDropdown label="Add" items={addItems} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
