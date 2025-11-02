// src/app/owner/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TenantFeatureFlags = {
  work_orders?: boolean;
  sampling?: boolean;
  mft?: boolean;
  grants?: boolean;
  [key: string]: boolean | undefined;
};

type UiTenant = {
  id: string;
  name: string;
  features: TenantFeatureFlags;
  memberCount: number;
};

function formatModuleName(key: string): string {
  switch (key) {
    case "work_orders":
      return "Work Orders";
    case "sampling":
      return "Sampling & Compliance";
    case "mft":
      return "MFT Tracker";
    case "grants":
      return "Grants";
    default:
      return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

export default async function OwnerDashboard() {
  const supabase = getSupabaseServer();

  // --- 1) Verify user + platform owner ---
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const isOwner = !!profile?.is_platform_owner;
  if (!isOwner) redirect("/");

  // --- 2) Load tenants and memberships (defensive) ---
  let tenants: UiTenant[] = [];
  const debug: string[] = [];

  const { data: trows, error: terr } = await supabase
    .from("tenants")
    .select("id, name, features")
    .order("name", { ascending: true });

  if (terr) debug.push(`tenants error: ${terr.message}`);

  // Fetch all memberships (owner is allowed by RLS)
  const { data: mrows, error: merr } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, user_id");

  if (merr) debug.push(`memberships error: ${merr.message}`);

  // Build counts per tenant_id
  const countByTenant = new Map<string, number>();
  (mrows ?? []).forEach((m: any) => {
    const id = String(m.tenant_id);
    countByTenant.set(id, (countByTenant.get(id) ?? 0) + 1);
  });

  tenants =
    (trows ?? []).map((t: any) => ({
      id: String(t.id),
      name: String(t.name ?? "Unnamed"),
      features: (t.features ?? {}) as TenantFeatureFlags,
      memberCount: countByTenant.get(String(t.id)) ?? 0,
    })) || [];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">
          Platform Owner Dashboard
        </h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          See all tenants, enabled modules, and member counts.
        </p>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border p-6">
          <p>No tenants found.</p>
          {debug.length > 0 && (
            <pre className="mt-3 text-xs text-[rgb(var(--muted-foreground))] whitespace-pre-wrap">
              Debug:
              {"\n"}
              {debug.join("\n")}
            </pre>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenants.map((t) => {
            const enabled = Object.entries(t.features).filter(([_, v]) => v);
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-medium text-[rgb(var(--card-foreground))]">
                      {t.name}
                    </div>
                    <div className="text-xs text-[rgb(var(--muted-foreground))]">
                      {t.id}
                    </div>
                  </div>
                  <div className="text-xs rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[rgb(var(--muted-foreground))]">
                    {t.memberCount} member{t.memberCount === 1 ? "" : "s"}
                  </div>
                </div>

                {/* Module chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {enabled.length > 0 ? (
                    enabled.map(([key]) => (
                      <span
                        key={key}
                        className="rounded-full border border-[rgb(var(--accent))]/40 bg-[rgb(var(--muted))]/40 text-[rgb(var(--accent-foreground))]/80 text-xs px-2 py-0.5"
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
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
