// src/app/owner/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import SaveButton from "@/components/SaveButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role =
  | "owner"
  | "admin"
  | "dispatcher"
  | "crew_leader"
  | "crew"
  | "viewer";

const ROLES: Role[] = [
  "owner",
  "admin",
  "dispatcher",
  "crew_leader",
  "crew",
  "viewer",
];

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

/* --------- Helpers --------- */

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

/* --------- Server actions --------- */

async function doUpdateFeatures(formData: FormData): Promise<void> {
  "use server";
  const supabase = getSupabaseServer();

  const tenant_id = String(formData.get("tenant_id") ?? "");
  if (!tenant_id) return;

  const flags: TenantFeatureFlags = {
    work_orders: formData.get("work_orders") === "on",
    sampling: formData.get("sampling") === "on",
    mft: formData.get("mft") === "on",
    grants: formData.get("grants") === "on",
  };

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) redirect("/");

  await supabase.from("tenants").update({ features: flags }).eq("id", tenant_id);

  redirect("/owner");
}

/**
 * Update a member's role for a tenant.
 * Uses:
 *  - server client to authenticate + confirm platform owner
 *  - admin client to read owners + update membership (bypasses RLS)
 */
async function doUpdateRole(formData: FormData): Promise<void> {
  "use server";
  const supabase = getSupabaseServer();
  const admin = getSupabaseAdmin();

  const tenant_id = String(formData.get("tenant_id") ?? "");
  const user_id = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!tenant_id || !user_id || !role) return;
  if (!ROLES.includes(role)) return;

  // auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) redirect("/");

  // Guard: cannot demote the last owner of a tenant
  // Use admin client so RLS can't interfere with the check.
  const { data: mrows } = await admin
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenant_id);

  const ownerIds =
    (mrows ?? [])
      .filter((m: any) => m.role === "owner")
      .map((m: any) => String(m.user_id)) || [];

  const isTargetOwner = ownerIds.includes(user_id);
  if (isTargetOwner && role !== "owner" && ownerIds.length <= 1) {
    // silently ignore + bounce back
    redirect("/owner");
  }

  // Actually update the role via admin client (bypass RLS)
  await admin
    .from("tenant_memberships")
    .update({ role })
    .eq("tenant_id", tenant_id)
    .eq("user_id", user_id);

  redirect("/owner");
}

/**
 * Add member directly from a tenant card.
 * Uses admin client for invite + membership + profile.
 */
async function doAddMember(formData: FormData): Promise<void> {
  "use server";

  const supabase = getSupabaseServer();
  const admin = getSupabaseAdmin();

  const tenant_id = String(formData.get("tenant_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const role: Role = "viewer";

  if (!tenant_id || !email) return;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) redirect("/");

  let invitedUserId: string | null = null;

  const { data: inviteData, error: inviteErr } =
    await (admin as any).auth.admin.inviteUserByEmail(email);

  if (!inviteErr && inviteData) {
    const raw = inviteData as any;
    const userObj = raw?.user ?? raw;
    if (userObj?.id) invitedUserId = userObj.id;
  }

  if (!invitedUserId && inviteErr) {
    try {
      const listRes = await (admin as any).auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      const users: any[] =
        (listRes as any)?.data?.users ?? (listRes as any)?.users ?? [];

      const match = users.find(
        (u) =>
          typeof u.email === "string" &&
          u.email.toLowerCase() === email.toLowerCase()
      );

      if (match?.id) invitedUserId = match.id as string;
    } catch (e) {
      console.error("doAddMember listUsers fallback error:", e);
    }
  }

  if (!invitedUserId) {
    console.error("doAddMember: could not resolve user for email", email, inviteErr);
    redirect("/owner");
  }

  await admin
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id,
        user_id: invitedUserId,
        role,
      },
      { onConflict: "tenant_id,user_id" }
    );

  if (full_name) {
    await admin.from("profiles").upsert(
      {
        id: invitedUserId,
        full_name,
        is_platform_owner: false,
      },
      { onConflict: "id" }
    );
  }

  redirect("/owner");
}

/* --------- Page --------- */

export default async function OwnerDashboard() {
  const supabase = getSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) redirect("/");

  const { data: trows } = await supabase
    .from("tenants")
    .select("id, name, features")
    .order("name", { ascending: true });

  const tenants: UiTenant[] =
    (trows ?? []).map((t: any) => ({
      id: String(t.id),
      name: String(t.name ?? "Unnamed tenant"),
      features: (t.features ?? {}) as TenantFeatureFlags,
      memberCount: 0,
    })) || [];

  const tenantIds = tenants.map((t) => t.id);

  if (tenantIds.length === 0) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">
            Platform Owner Dashboard
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            See all tenants, enabled modules, and manage members &amp; roles.
          </p>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-sm text-[rgb(var(--muted-foreground))]">
          No tenants found. Use the <strong>Add → Add Tenant</strong> menu to
          create one.
        </div>
      </main>
    );
  }

  const { data: mrows } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, user_id, role")
    .in("tenant_id", tenantIds);

  const membersRaw: any[] = mrows ?? [];

  const userIds = Array.from(
    new Set(membersRaw.map((m) => String(m.user_id)))
  );

  const { data: prow } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as any[] };

  const nameById = new Map<string, string | null>(
    (prow ?? []).map((p: any) => [String(p.id), p.full_name ?? null])
  );

  const membersByTenant = new Map<string, UiMember[]>();
  membersRaw.forEach((m: any) => {
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
          See all tenants, enabled modules, and manage members &amp; roles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tenants.map((t) => {
          const members = membersByTenant.get(t.id) ?? [];
          const enabled = Object.entries(t.features).filter(([_, v]) => v);

          return (
            <div
              key={t.id}
              className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm"
            >
              {/* Card header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium text-[rgb(var(--card-foreground))]">
                    {t.name}
                  </div>
                  <div className="text-xs text-[rgb(var(--muted-foreground))]">
                    {t.id}
                  </div>
                </div>
                <div className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-xs text-[rgb(var(--muted-foreground))]">
                  {t.memberCount} member{t.memberCount === 1 ? "" : "s"}
                </div>
              </div>

              {/* Modules chips */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {enabled.length > 0 ? (
                  enabled.map(([key]) => (
                    <span
                      key={key}
                      className="rounded-full border border-[rgb(var(--accent))]/40 bg-[rgb(var(--muted))]/40 px-2 py-0.5 text-xs text-[rgb(var(--accent-foreground))]/80"
                    >
                      {formatModuleName(key)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-[rgb(var(--muted-foreground))]">
                    No modules enabled
                  </span>
                )}
              </div>

              {/* Manage */}
              <details className="group mt-4">
                <summary className="inline-flex cursor-pointer list-none items-center rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]">
                  Manage{" "}
                  <span className="ml-2 transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>

                <div className="mt-3 space-y-4">
                  {/* Module toggles */}
                  <form
                    id={`modules-${t.id}`}
                    action={doUpdateFeatures}
                    className="rounded-xl border border-[rgb(var(--border))] p-3"
                  >
                    <input type="hidden" name="tenant_id" value={t.id} />
                    <div className="mb-2 text-sm font-medium">Modules</div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {(
                        [
                          "work_orders",
                          "sampling",
                          "mft",
                          "grants",
                        ] as (keyof TenantFeatureFlags)[]
                      ).map((k) => (
                        <label
                          key={String(k)}
                          className="inline-flex items-center gap-2"
                        >
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
                    <div className="mt-3">
                      <SaveButton
                        label="Save Modules"
                        formId={`modules-${t.id}`}
                      />
                    </div>
                  </form>

                  {/* Members & Add Member */}
                  <div className="rounded-xl border border-[rgb(var(--border))] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium">Members</div>

                      {/* Add Member dropdown */}
                      <details className="group relative">
                        <summary className="inline-flex cursor-pointer list-none items-center rounded-md border border-[rgb(var(--border))] px-2 py-1 text-xs text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]">
                          Add Member
                          <span className="ml-1 transition group-open:rotate-180">
                            ▾
                          </span>
                        </summary>
                        <div className="mt-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-xs">
                          <form
                            id={`add-member-${t.id}`}
                            action={doAddMember}
                            className="space-y-2"
                          >
                            <input
                              type="hidden"
                              name="tenant_id"
                              value={t.id}
                            />
                            <div>
                              <label className="mb-1 block">Full Name</label>
                              <input
                                name="full_name"
                                required
                                placeholder="Jane Doe"
                                className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block">Email</label>
                              <input
                                name="email"
                                type="email"
                                required
                                placeholder="user@example.com"
                                className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-2 py-1 text-xs"
                              />
                            </div>
                            <SaveButton
                              label="Add"
                              formId={`add-member-${t.id}`}
                              className="mt-1 px-2 py-1 text-xs"
                            />
                          </form>
                        </div>
                      </details>
                    </div>

                    {members.length === 0 ? (
                      <div className="text-xs text-[rgb(var(--muted-foreground))]">
                        No members yet.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {members.map((m) => (
                          <li
                            key={m.user_id}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm text-[rgb(var(--card-foreground))]">
                                {m.full_name || m.user_id}
                              </div>
                              {m.full_name && (
                                <div className="text-xs text-[rgb(var(--muted-foreground))]">
                                  {m.user_id}
                                </div>
                              )}
                            </div>
                            <form
                              id={`member-role-${t.id}-${m.user_id}`}
                              action={doUpdateRole}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="hidden"
                                name="tenant_id"
                                value={t.id}
                              />
                              <input
                                type="hidden"
                                name="user_id"
                                value={m.user_id}
                              />
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
                              <SaveButton
                                label="Save"
                                formId={`member-role-${t.id}-${m.user_id}`}
                                className="px-2 py-1 text-sm"
                              />
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
    </main>
  );
}
