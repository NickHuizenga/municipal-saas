// src/app/owner/add-tenant/page.tsx
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Server action: create tenant + make current user owner (via service role)
async function createTenant(formData: FormData) {
  "use server";

  const supabase = getSupabaseServer();
  const admin = getSupabaseAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  // 1) Auth & platform owner check
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof?.is_platform_owner) redirect("/");

  // 2) Create tenant (RLS allows platform owner to insert)
  const { data: t, error: terr } = await supabase
    .from("tenants")
    .insert({ name }) // id + slug are generated in DB
    .select("id")
    .maybeSingle();

  if (terr || !t?.id) {
    console.error("createTenant: tenant insert failed", terr);
    redirect("/owner");
  }

  // 3) Make current user an owner of this tenant
  //    Use service-role client so RLS cannot block it.
  const { error: merr } = await admin
    .from("tenant_memberships")
    .insert({
      tenant_id: t.id,
      user_id: user.id,
      role: "owner",
    });

  if (merr) {
    console.error("createTenant: membership insert failed", merr);
    // We still redirect, but now you'll see the error in server logs.
  }

  // 4) Back to owner dashboard
  redirect("/owner");
}

export default async function AddTenantPage() {
  const supabase = getSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof?.is_platform_owner) redirect("/");

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-[rgb(var(--foreground))]">
        Add Tenant
      </h1>
      <p className="mb-4 text-sm text-[rgb(var(--muted-foreground))]">
        Create a new municipality and assign yourself as its owner.
      </p>

      {/* Plain form so Next.js can follow the redirect from the server action */}
      <form
        action={createTenant}
        className="rounded-2xl border border-[rgb(var(--border))] p-4"
      >
        <label className="mb-1 block text-sm">Tenant name</label>
        <input
          name="name"
          required
          placeholder="Village of Example, IL"
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="mt-3 inline-flex items-center rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-sm hover:bg-[rgb(var(--muted))]"
        >
          Create Tenant
        </button>
      </form>
    </main>
  );
}
