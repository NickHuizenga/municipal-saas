// src/app/tenant/select/page.tsx

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role =
  | "owner"
  | "admin"
  | "dispatcher"
  | "crew_leader"
  | "crew"
  | "viewer"
  | string;

type TenantFeatureFlags = {
  [key: string]: boolean | null | undefined;
};

type UiTenant = {
  id: string;
  name: string;
  role: Role | null; // role for the CURRENT user in this tenant, if any
  features: TenantFeatureFlags;
};

/* ---------- helpers ---------- */

function formatModuleName(key: string): string {
  switch (key) {
    case "work_orders":
      return "Work Orders";
    case "sampling":
      return "Sampling & Compliance";
    case "mft":
      return "MFT Tracker";
    case "dmr":
      return "DMR Reports";
    case "water_reports":
      return "Water Reports";
    case "grants":
      return "Grants";
    default:
      return key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

function roleLabel(role: Role | null): string | null {
  if (!role) return null;
  // You can prettify here if needed
  return role;
}

/* ---------- page ---------- */

export default async function TenantSelectPage() {
  const supabase = getSupabaseServer();

  // 1) Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  // 2) Load profile to see if this is a platform owner
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_platform_owner, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("tenant/select: profile error", profileError);
  }

  const isPlatformOwner = !!profile?.is_platform_owner;

  let tenants: UiTenant[] = [];

  if (isPlatformOwner) {
    // 3a) PLATFORM OWNER: show ALL tenants
    //     and mark role if the user is a member of each.
    const { data: allTenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, features")
      .order("name", { ascending: true });

    if (tenantsError) {
      console.error("tenant/select: tenants error", tenantsError);
    }

    // membership rows (for this user) to get roles where they exist
    const { data: membershipRows, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", user.id);

    if (membershipError) {
      console.error("tenant/select: membership error", membershipError);
    }

    const roleByTenant = new Map<string, Role>();
    (membershipRows ?? []).forEach((m: any) => {
      roleByTenant.set(String(m.tenant_id), String(m.role));
    });

    tenants =
      (allTenants ?? []).map((t: any) => ({
        id: String(t.id),
        name: String(t.name ?? "Unnamed tenant"),
        features: (t.features ?? {}) as TenantFeatureFlags,
        role: roleByTenant.get(String(t.id)) ?? null,
      })) ?? [];
  } else {
    // 3b) NORMAL USER: show ONLY tenants they have memberships in
    const { data: rows, error: rowsError } = await supabase
      .from("tenant_memberships")
      .select("role, tenants(id, name, features)")
      .eq("user_id", user.id)
      .order("tenants(name)", { ascending: true });

    if (rowsError) {
      console.error("tenant/select: memberships+tenants error", rowsError);
    }

    tenants =
      (rows ?? [])
        .map((row: any) => {
          const t = row.tenants;
          if (!t) return null;
          return {
            id: String(t.id),
            name: String(t.name ?? "Unnamed tenant"),
            features: (t.features ?? {}) as TenantFeatureFlags,
            role: row.role as Role,
          } as UiTenant;
        })
        .filter(Boolean) ?? [];
  }

  const hasTenants = tenants.length > 0;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">
          Select a Tenant
        </h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          Pick a municipality to continue.
        </p>
        {isPlatformOwner && (
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            You are a platform owner. All tenants are visible here. Tenants
            where you are also a member will show your role.
          </p>
        )}
      </header>

      {/* No tenants found */}
      {!hasTenants && (
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-sm text-[rgb(var(--muted-foreground))]">
          <p className="font-medium text-[rgb(var(--card-foreground))]">
            No tenants linked to your account yet.
          </p>
          {!isPlatformOwner && (
            <p className="mt-2">
              Ask an owner to invite you, or{" "}
              <a
                href="/invite"
                className="underline underline-offset-2 hover:text-[rgb(var(--foreground))]"
              >
                invite a user
              </a>{" "}
              if you&apos;re an owner.
            </p>
          )}
          {isPlatformOwner && (
            <p className="mt-2">
              As a platform owner, you can create new tenants from your owner
              dashboard.
            </p>
          )}
        </section>
      )}

      {/* Tenant cards */}
      {hasTenants && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tenants.map((tenant) => {
            const features = tenant.features || {};
            const enabledModules = Object.entries(features).filter(
              ([, value]) => !!value
            );

            const role = roleLabel(tenant.role);

            return (
              <div
                key={tenant.id}
                className="flex flex-col rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm"
              >
                {/* Header row */}
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-[rgb(var(--card-foreground))]">
                      {tenant.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-[rgb(var(--muted-foreground))]">
                      {tenant.id}
                    </p>
                  </div>
                  {role && (
                    <span className="rounded-full border border-[rgb(var(--border))] px-3 py-0.5 text-xs text-[rgb(var(--muted-foreground))]">
                      {role}
                    </span>
                  )}
                </div>

                {/* Module chips */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {enabledModules.length > 0 ? (
                    enabledModules.map(([key]) => (
                      <span
                        key={key}
                        className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/20 px-3 py-1 text-xs text-[rgb(var(--muted-foreground))]"
                      >
                        {formatModuleName(key)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[rgb(var(--muted-foreground))] italic">
                      No modules enabled
                    </span>
                  )}
                </div>

                {/* Continue button */}
                <div className="mt-auto pt-2">
                  <form
                    action="/tenant/resolve"
                    method="post"
                    className="inline"
                  >
                    <input
                      type="hidden"
                      name="tenant_id"
                      value={tenant.id}
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-[rgb(var(--border))] px-4 py-1.5 text-sm text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
                    >
                      Continue
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
