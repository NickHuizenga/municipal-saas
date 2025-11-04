// src/app/owner/add-tenant/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";
import SaveButton from "@/components/SaveButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function doCreateTenant(formData: FormData) {
  "use server";

  const supabase = getSupabaseServer();
  const cookieStore = cookies();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) redirect("/");

  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert({ name })
    .select("id")
    .maybeSingle();

  if (!tenant || error) {
    console.error("add-tenant error:", error);
    cookieStore.set("owner_refresh", "1", { path: "/" });
    redirect("/owner");
  }

  await supabase.from("tenant_memberships").upsert(
    {
      tenant_id: tenant.id,
      user_id: user.id,
      role: "owner",
    },
    { onConflict: "tenant_id,user_id" }
  );

  cookieStore.set("owner_refresh", "1", { path: "/" });
  redirect("/owner");
}

export default async function AddTenantPage() {
  const supabase = getSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_platform_owner) redirect("/");

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-[rgb(var(--foreground))]">
        Add Tenant
      </h1>
      <p className="mb-4 text-sm text-[rgb(var(--muted-foreground))]">
        Create a new municipality and assign yourself as its owner.
      </p>

      <form
        id="add-tenant-form"
        action={doCreateTenant}
        className="rounded-2xl border border-[rgb(var(--border))] p-4"
      >
        <label className="mb-1 block text-sm">Tenant name</label>
        <input
          name="name"
          type="text"
          required
          placeholder="Village of Example, IL"
          className="mb-4 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
        />

        <SaveButton label="Create Tenant" formId="add-tenant-form" />
      </form>
    </main>
  );
}
