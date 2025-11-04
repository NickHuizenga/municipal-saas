// src/app/invite/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

async function doInvite(formData: FormData) {
  "use server";

  const supabase = getSupabaseServer();
  const admin = getSupabaseAdmin();
  const cookieStore = cookies();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const tenant_id = String(formData.get("tenant_id") ?? "");
  const role = String(formData.get("role") ?? "viewer") as Role;

  if (!email || !tenant_id) return;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

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
      console.error("listUsers fallback error:", e);
    }
  }

  if (!invitedUserId) {
    console.error("Could not resolve invitedUserId for email:", email, inviteErr);
    cookieStore.set("owner_refresh", "1", { path: "/" });
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

  cookieStore.set("owner_refresh", "1", { path: "/" });
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  const isPlatformOwner = !!profile?.is_platform_owner;

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

  const preselect =
    (typeof searchParams?.tenant_id === "string" && searchParams.tenant_id) ||
    "";

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-[rgb(var(--foreground))]">
        Invite User
      </h1>
      <p className="mb-4 text-sm text-[rgb(var(--muted-foreground))]">
        Invite a user, assign them to a tenant, and set their role.
      </p>

      <form
        id="invite-form"
        action={doInvite}
        className="rounded-2xl border border-[rgb(var(--border))] p-4"
      >
        <label className="mb-1 block text-sm">Full Name</label>
        <input
          name="full_name"
          type="text"
          required
          placeholder="Jane Doe"
          className="mb-3 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
        />

        <label className="mb-1 block text-sm">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          className="mb-3 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
        />

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

        <SaveButton label="Send Invite" formId="invite-form" />
      </form>
    </main>
  );
}
