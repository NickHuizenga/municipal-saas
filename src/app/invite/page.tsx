// src/app/invite/page.tsx
import SmartForm from "@/components/SmartForm";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "owner" | "admin" | "dispatcher" | "crew_leader" | "crew" | "viewer";

async function doInvite(formData: FormData) {
  "use server";
  const supabase = getSupabaseServer();
  const admin = getSupabaseAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const role = (String(formData.get("role") ?? "viewer") as Role);

  if (!email || !tenant_id) return;

  // Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  // Permission: platform owner OR owner of the tenant
  const { data: prof } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  let allowed = !!prof?.is_platform_owner;
  if (!allowed) {
    const { data: me } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .maybeSingle();
    allowed = me?.role === "owner";
  }
  if (!allowed) redirect("/");

  // 1) Invite user via Admin API (creates auth user immediately)
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteErr || !invited?.user) {
    // Could also render a toast; just return to avoid reload loop
    return;
  }

  const invitedUserId = invited.user.id;

  // 2) Assign membership to the tenant
  await supabase
    .from("tenant_memberships")
    .insert({ tenant_id, user_id: invitedUserId, role })
    .select("tenant_id")
    .maybeSingle();

  // 3) Done → back to owner dashboard (SmartForm also reloads, but redirect keeps deep links clean)
  redirect("/owner");
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  const isPlatformOwner = !!prof?.is_platform_owner;

  // Tenants current user can invite into:
  // Platform owner: all tenants; otherwise only tenants where user is owner.
  const tenantQuery = isPlatformOwner
    ? supabase.from("tenants").select("id, name").order("name")
    : supabase
        .from("tenant_memberships")
        .select("tenant_id:tenant_id, tenants!inner(id, name)")
        .eq("user_id", user.id)
        .eq("role", "owner");

  const { data: rows } = await tenantQuery;
  const tenants: { id: string; name: string }[] =
    (rows ?? []).map((r: any) => ("tenants" in r ? r.tenants : r)) ?? [];

  const preselect = (typeof searchParams?.tenant_id === "string" && searchParams.tenant_id) || "";

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-[rgb(var(--foreground))]">Invite User</h1>
      <p className="text-sm text-[rgb(var(--muted-foreground))] mb-4">
        Invite a user and assign them to a tenant. A tenant selection is required.
      </p>

      <SmartForm action={doInvite} className="rounded-2xl border border-[rgb(var(--border))] p-4">
        <label className="block text-sm mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm mb-3"
        />

        <label className="block text-sm mb-1">Tenant</label>
        <select
          name="tenant_id"
          required
          defaultValue={preselect || ""}
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm mb-3"
        >
          <option value="" disabled>
            Select a tenant…
          </option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <label className="block text-sm mb-1">Role</label>
        <select
          name="role"
          defaultValue="viewer"
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm mb-4"
        >
          <option value="viewer">viewer</option>
          <option value="crew">crew</option>
          <option value="crew_leader">crew_leader</option>
          <option value="dispatcher">dispatcher</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>

        <button
          type="submit"
          className="inline-flex items-center rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm hover:bg-[rgb(var(--muted))]"
        >
          Send Invite
        </button>
      </SmartForm>
    </main>
  );
}
