// src/app/owner/page.tsx
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";
import SwitchTenantButton from "./switch-tenant-button";

type Tenant = {
  id: string;
  name: string;
  features: Record<string, boolean>;
};

type MembershipRow = { tenant_id: string; user_id: string };

function featureChips(features: Record<string, boolean> = {}) {
  const order = ["work_orders", "sampling", "mft", "grants"];
  return order
    .filter((k) => features?.[k])
    .map((k) => ({
      key: k,
      label:
        k === "work_orders"
          ? "Work Orders"
          : k === "sampling"
          ? "Sampling"
          : k === "mft"
          ? "MFT"
          : k === "grants"
          ? "Grants"
          : k,
    }));
}

export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // Guard: only platform owners can see this
  let isPlatformOwner = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_owner")
      .eq("id", user.id)
      .maybeSingle();
    isPlatformOwner = !!profile?.is_platform_owner;
  }

  if (!user || !isPlatformOwner) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You must be a platform owner to view this page.
        </p>
      </main>
    );
  }

  // Load all tenants (RLS policy added above lets owners see all)
  const { data: tenantsRaw } = await supabase
    .from("tenants")
    .select("id, name, features")
    .order("name", { ascending: true });

  const tenants: Tenant[] =
    (tenantsRaw ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      features: (t.features ?? {}) as Record<string, boolean>,
    })) ?? [];

  // Load all memberships (owner-wide read allowed), then count per tenant
  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, user_id");

  const counts = new Map<string, number>();
  (memberships ?? []).forEach((m: MembershipRow) => {
    counts.set(m.tenant_id, 1 + (counts.get(m.tenant_id) ?? 0));
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Owner Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            All tenants at a glance. Click **Switch** to act in that tenant context.
          </p>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border p-6">
          <p>No tenants found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => {
            const chips = featureChips(t.features);
            const memberCount = counts.get(t.id) ?? 0;
            return (
              <div key={t.id} className="rounded-2xl border p-4 hover:shadow-sm transition">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {memberCount} {memberCount === 1 ? "user" : "users"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {chips.length > 0 ? (
                    chips.map((c) => (
                      <span
                        key={c.key}
                        className="text-xs rounded-full border px-2 py-0.5"
                      >
                        {c.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No modules enabled</span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <SwitchTenantButton tenantId={t.id} />
                  <a
                    href="/settings/members"
                    className="text-sm rounded-lg border px-3 py-1.5 hover:bg-muted"
                    title="Manage members (within tenant context)"
                    onClick={(e) => {
                      // This will work best after switching tenant.
                      // If you click it before switching, it may use your current cookie.
                    }}
                  >
                    Manage
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
