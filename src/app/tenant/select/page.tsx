// src/app/tenant/select/page.tsx
import Link from "next/link";
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
  role: string;
  features: TenantFeatureFlags;
};

async function loadTenantsForUser(): Promise<{ tenants: UiTenant[]; debug?: string }> {
  const supabase = getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  // 1️⃣ memberships for this user
  const { data: memberships, error: mErr } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants!inner(name, features)")
    .eq("user_id", user.id);

  if (mErr) return { tenants: [], debug: mErr.message };
  if (!memberships || memberships.length === 0)
    return { tenants: [], debug: "no membership rows" };

  const tenants = memberships.map((m) => ({
    id: m.tenant_id,
    name: (m as any).tenants?.name || "Unnamed",
    role: m.role,
    features: ((m as any).tenants?.features ?? {}) as TenantFeatureFlags,
  }));

  return { tenants };
}

export default async function TenantSelectPage() {
  const { tenants, debug } = await loadTenantsForUser();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">
        Select a Tenant
      </h1>
      <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1 mb-6">
        Pick a municipality to continue.
      </p>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border p-6">
          <p className="mb-2">No tenants linked to your account yet.</p>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            Ask an owner to invite you, or{" "}
            <Link className="underline" href="/settings/invite">
              invite a user
            </Link>{" "}
            if you’re an owner.
          </p>
          {debug && (
            <pre className="mt-3 text-xs text-[rgb(var(--muted-foreground))] whitespace-pre-wrap">
              Debug: {debug}
            </pre>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((t) => {
            const enabledModules = Object.entries(t.features)
              .filter(([_, v]) => v)
              .map(([k]) => k);

            return (
              <form
                key={t.id}
                action="/tenant/select/set"
                method="post"
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm hover:shadow-[0_0_12px_rgba(80,110,160,0.15)] transition"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium text-[rgb(var(--card-foreground))]">
                    {t.name}
                  </div>
                  <span className="text-xs rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[rgb(var(--muted-foreground))]">
                    {t.role}
                  </span>
                </div>

                {/* Module chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {enabledModules.length > 0 ? (
                    enabledModules.map((mod) => (
                      <span
                        key={mod}
                        className="rounded-full border border-[rgb(var(--accent))]/40 bg-[rgb(var(--muted))]/40 text-[rgb(var(--accent-foreground))]/80 text-xs px-2 py-0.5"
                      >
                        {formatModuleName(mod)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[rgb(var(--muted-foreground))] italic">
                      No modules enabled
                    </span>
                  )}
                </div>

                <input type="hidden" name="tenant_id" value={t.id} />
                <button
                  type="submit"
                  className="mt-4 inline-flex items-center rounded-lg border border-[rgb(var(--border))] bg-transparent px-3 py-1.5 text-sm hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--accent-foreground))] transition"
                >
                  Continue
                </button>
              </form>
            );
          })}
        </div>
      )}
    </main>
  );
}

/** Simple label formatter for chips */
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
