// src/app/tenant/select/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UiTenant = { id: string; name: string; role: string };

async function loadTenantsForUser(): Promise<{ tenants: UiTenant[]; debug?: string }> {
  const supabase = getSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) {
    redirect("/login");
  }

  // 1) Get memberships for THIS user (no join)
  const { data: memberships, error: mErr } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("user_id", user!.id);

  if (mErr) {
    return { tenants: [], debug: `membership error: ${mErr.message}` };
  }
  if (!memberships || memberships.length === 0) {
    return { tenants: [], debug: "no membership rows for this user" };
  }

  const tenantIds = [...new Set(memberships.map((m) => m.tenant_id).filter(Boolean))] as string[];
  if (tenantIds.length === 0) {
    return { tenants: [], debug: "membership rows exist but tenant_ids were empty" };
  }

  // 2) Fetch tenants by IDs (no implicit join)
  const { data: tenants, error: tErr } = await supabase
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds);

  if (tErr) {
    return { tenants: [], debug: `tenants error: ${tErr.message}` };
  }

  // 3) Merge role back in
  const roleByTenant = new Map(memberships.map((m) => [m.tenant_id, m.role]));
  const ui = (tenants ?? []).map((t) => ({
    id: t.id as string,
    name: (t.name as string) ?? "Unnamed",
    role: (roleByTenant.get(t.id as string) as string) ?? "viewer",
  }));

  return { tenants: ui };
}

export default async function TenantSelectPage() {
  const { tenants, debug } = await loadTenantsForUser();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Select a Tenant</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Pick a municipality to continue.
      </p>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border p-6">
          <p className="mb-2">No tenants linked to your account yet.</p>
          <p className="text-sm text-muted-foreground">
            Ask an owner to invite you, or{" "}
            <Link className="underline" href="/settings/invite">invite a user</Link> if you’re an owner.
          </p>
          {debug && (
            <pre className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap">
              Debug: {debug}
            </pre>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((t) => (
            <form
              key={t.id}
              action="/tenant/select/set"
              method="post"
              className="text-left rounded-2xl border p-4 shadow-sm hover:shadow transition bg-background/50"
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">{t.name}</div>
                <span className="text-xs rounded-full border px-2 py-0.5">
                  {t.role}
                </span>
              </div>
              <input type="hidden" name="tenant_id" value={t.id} />
              <button
                className="mt-3 inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:shadow-sm"
              >
                Continue
              </button>
            </form>
          ))}
        </div>
      )}
    </main>
  );
}
