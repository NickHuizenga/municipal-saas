// src/app/owner/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "owner" | "admin" | "dispatcher" | "crew_leader" | "crew" | "viewer";
const ROLES: Role[] = ["owner", "admin", "dispatcher", "crew_leader", "crew", "viewer"];

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

type UiMember = {
  tenant_id: string;
  user_id: string;
  role: Role;
  full_name?: string | null;
};

/* -------------------- Helpers -------------------- */

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

/* -------------------- Server Actions -------------------- */

export async function doUpdateFeatures(_prev: any, formData: FormData) {
  "use server";
  const supabase = getSupabaseServer();

  const tenant_id = String(formData.get("tenant_id") ?? "");
  if (!tenant_id) return { ok: false, error: "Missing tenant_id" };

  const flags: TenantFeatureFlags = {
    work_orders: formData.get("work_orders") === "on",
    sampling: formData.get("sampling") === "on",
    mft: formData.get("mft") === "on",
    grants: formData.get("grants") === "on",
  };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/login");

  // must be platform owner
  const { data: prof, error: pErr } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (pErr || !prof?.is_platform_owner) return { ok: false, error: "Not a platform owner." };

  const { error } = await supabase
    .from("tenants")
    .update({ features: flags })
    .eq("id", tenant_id);

  if (error) return { ok: false, error: error.message };

  // Next 14: redirect to refresh the page
  redirect("/owner");
}

export async function doUpdateRole(_prev: any, formData: FormData) {
  "use server";
  const supabase = getSupabaseServer();

  const tenant_id = String(formData.get("tenant_id") ?? "");
  const user_id = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!tenant_id || !user_id || !role) return { ok: false, error: "Missing fields." };
  if (!ROLES.includes(role)) return { ok: false, error: "Invalid role." };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/login");

  // must be platform owner
  const { data: prof, error: pErr } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (pErr || !prof?.is_platform_owner) return { ok: false, error: "Not a platform owner." };

  // guard: cannot demote the last owner
  const { data: mrows, error: mErr } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenant_id);

  if (mErr) return { ok: false, error: mErr.message };

  const ownerIds = (mrows ?? [])
    .filter((m: any) => m.role === "owner")
    .map((m: any) => String(m.user_id));

  const isTargetOwner = ownerIds.includes(user_id);
  if (isTargetOwner && role !== "owner" && ownerIds.length <= 1) {
    return { ok: false, error: "You can’t demote the last owner of a tenant." };
  }

  const { error } = await supabase
    .from("tenant_memberships")
    .update({ role })
    .eq("tenant_id", tenant_id)
    .eq("user_id", user_id);

  if (error) return { ok: false, error: error.message };

  // Next 14 refresh
  redirect("/owner");
}

/* -------------------- Page -------------------- */

export default async function OwnerDashboard() {
  const supabase = getSupabaseServer();

  // auth + platform owner check
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) redirect("/");

  // tenants
  const { data: trows, error: terr } = await supabase
    .from("tenants")
    .select("id, name, features")
    .order("name", { ascending: true });

  if (terr) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-2xl border p-6">
          <div className="text-sm text-[rgb(var(--muted-foreground))]">
            Error loading tenants: {terr.message}
          </div>
        </div>
      </main>
    );
  }

  const tenants: UiTenant[] =
    (trows ?? []).map((t: any) => ({
      id: String(t.id),
      name: String(t.name ?? "Unnamed"),
      features: (t.features ?? {}) as TenantFeatureFlags,
      memberCount: 0,
    })) || [];

  const tenantIds = tenants.map((t) => t.id);

  // memberships for those tenants
  const { data: mrows } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, user_id, role")
    .in("tenant_id", tenantIds);

  // gather user names from profiles (best effort)
  const userIds = Array.from(new Set((mrows ?? []).map((m) => String(m.user_id))));
  const { data: prow } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as any[] };

  const nameById = new Map<string, string | null>((prow ?? []).map((p: any) => [String(p.id), p.full_name ?? null]));

  const membersByTenant = new Map<string, UiMember[]>();
  (mrows ?? []).forEach((m: any) => {
    const tid = String(m.tenant_id);
    const arr = membersByTenant.get(tid) ?? [];
    arr.push({
      tenant_id: tid,
      user_id: String(m.user_id),
      role: m.role as Role,
      full_name: nameById.get(String(m.user_id)) ?? null,
    });
    membersByTenant.set(tid, arr);
  });

  // fill member counts
  tenants.forEach((t) => {
    t.memberCount = membersByTenant.get(t.id)?.length ?? 0;
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">
          Platform Owner Dashboard
        </h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          See all tenants, enabled modules, and manage members & roles.
        </p>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border p-6">No tenants found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenants.map((t) => {
            const members = membersByTenant.get(t.id) ?? [];
            const enabled = Object.entries(t.features).filter(([_, v]) => v);

            return (
              <div
                key={t.id}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-medium text-[rgb(var(--card-foreground))]">
                      {t.name}
                    </div>
                    <div className="text-xs text-[rgb(var(--muted-foreground))]">{t.id}</div>
                  </div>
                  <div className="text-xs rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[rgb(var(--muted-foreground))]">
                    {t.memberCount} member{t.memberCount === 1 ? "" : "s"}
                  </div>
                </div>

                {/* Current module chips */}
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

                {/* Manage details */}
                <details className="group mt-4">
                  <summary className="list-none cursor-pointer inline-flex items-center rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm hover:bg-[rgb(var(--muted))]">
                    Manage
                    <span className="ml-2 transition group-open:rotate-180">▾</span>
                  </summary>

                  <div className="mt-3 space-y-4">
                    {/* Module toggles */}
                    <form action={doUpdateFeatures} className="rounded-xl border border-[rgb(var(--border))] p-3">
                      <input type="hidden" name="tenant_id" value={t.id} />
                      <div className="text-sm font-medium mb-2">Modules</div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {(["work_orders", "sampling", "mft", "grants"] as (keyof TenantFeatureFlags)[]).map((k) => (
                          <label key={String(k)} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              name={String(k)}
                              defaultChecked={!!t.features?.[k]}
                              className="accent-[rgb(var(--accent))]"
                            />
                            <span className="text-[rgb(var(--muted-foreground))]">
                              {formatModuleName(String(k))}
                            </span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="submit"
                        className="mt-3 inline-flex items-center rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm hover:bg-[rgb(var(--muted))]"
                      >
                        Save Modules
                      </button>
                    </form>

                    {/* Members & roles */}
                    <div className="rounded-xl border border-[rgb(var(--border))] p-3">
                      <div className="text-sm font-medium mb-2">Members</div>
                      {members.length === 0 ? (
                        <div className="text-xs text-[rgb(var(--muted-foreground))]">No members yet.</div>
                      ) : (
                        <ul className="space-y-2">
                          {members.map((m) => (
                            <li key={m.user_id} className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-[rgb(var(--card-foreground))] truncate">
                                  {m.full_name || m.user_id}
                                </div>
                              </div>
                              <form action={doUpdateRole} className="flex items-center gap-2">
                                <input type="hidden" name="tenant_id" value={t.id} />
                                <input type="hidden" name="user_id" value={m.user_id} />
                                <select
                                  name="role"
                                  defaultValue={m.role}
                                  className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-1 text-sm"
                                >
                                  {ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="submit"
                                  className="rounded-md border border-[rgb(var(--border))] px-2 py-1 text-sm hover:bg-[rgb(var(--muted))]"
                                  title="Save role"
                                >
                                  Save
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
