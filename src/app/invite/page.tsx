// src/app/invite/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Role = "owner" | "admin" | "dispatcher" | "crew_leader" | "crew" | "viewer";

async function doInvite(formData: FormData) {
  "use server";

  const supabase = getSupabaseServer();
  const admin = getSupabaseAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const role = String(formData.get("role") ?? "viewer") as Role;

  if (!email || !tenant_id) return;

  // 1) Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  // 2) Permission: platform owner OR owner of that tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  const isPlatformOwner = !!profile?.is_platform_owner;

  let allowed = isPlatformOwner;

  if (!allowed) {
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .maybeSingle();

    allowed = membership?.role === "owner";
  }

  if (!allowed) redirect("/");

  // 3) Invite user via Admin API
  const { data: inviteData, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email);

  // Supabase returns the user in inviteData.user for new invites.
  // If user already exists, inviteErr may be non-null but we still want membership.
  const invitedUserId = inviteData?.user?.id;

  if (!invitedUserId) {
    console.error("Invite error or missing user from invite:", inviteErr);
    redirect("/owner");
  }

  // 4) Assign membership via ADMIN client (bypasses RLS)
  //    Use upsert so repeating an invite for same tenant/user doesn't blow up.
  const { error: memberErr } = await admin
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id,
        user_id: invitedUserId,
        role,
      },
      { onConflict: "tenant_id,user_id" }
    );

  if (memberErr) {
    console.error("Membership upsert error", memberErr);
    // still redirect so UI stays normal, but you'll have server logs
  }

  // 5) Back to owner dashboard
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

  // Are we a platform owner?
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  const isPlatformOwner = !!profile?.is_platform_owner;

  // Collect tenants we can invite into
  let tenants: { id: string; name: string }[] = [];

  if (isPlatformOwner) {
    const { data: trows } = await supabase
      .from("tenants")
      .select("id, name")
      .order("name", { ascending: true });

    tenants =
      (trows ?? []).map((t: any) => ({
        id: String(t.id),
        name: String(t.name ?? "Unnamed tenant"),
      })) || [];
  } else {
    const { data: trows } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role, tenants!inner(id, name)")
      .eq("user_id", user.id)
      .eq("role", "owner");

    tenants =
      (trows ?? []).map((row: any) => {
        const t = row.tenants ?? row;
        return {
          id: String(t.id),
          name: String(t.name ?? "Unnamed tenant"),
        };
      }) || [];
  }

  // Preselect tenant from query params if present
  const preselect =
    (typeof searchParams?.tenant_id === "string" && searchParams.tenant_id) ||
    "";

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-[rgb(var(--foreground))]">
        Invite User
      </h1>
      <p className="mb-4 text-sm text-[rgb(var(--muted-foreground))]">
        Invite a user and assign them to a tenant. Selecting a tenant is
        required.
      </p>

      <form
        action={doInvite}
        className="rounded-2xl border border-[rgb(var(--border))] p-4"
      >
        {/* Email */}
        <label className="mb-1 block text-sm">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="mb-3 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
        />

        {/* Tenant */}
        <label className="mb-1 block text-sm">Tenant</label>
        <select
          name="tenant_id"
          required
          defaultValue={preselect || ""}
          className="mb-3 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
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

        {/* Role */}
        <label className="mb-1 block text-sm">Role</label>
        <select
          name="role"
          defaultValue="viewer"
          className="mb-4 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
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
      </form>
    </main>
  );
}
