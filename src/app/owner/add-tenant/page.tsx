// src/app/owner/add-tenant/page.tsx
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function createTenant(formData: FormData) {
  "use server";
  const supabase = getSupabaseServer();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  // Auth & must be platform owner
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof?.is_platform_owner) redirect("/");

  // 1) Create tenant (features default {})
  const { data: t, error: terr } = await supabase
    .from("tenants")
    .insert({ name, features: {} })
    .select("id")
    .maybeSingle();
  if (terr || !t?.id) redirect("/owner"); // fall back

  // 2) Make current user owner of the new tenant
  await supabase
    .from("tenant_memberships")
    .insert({ tenant_id: t.id, user_id: user.id, role: "owner" });

  // 3) Go back to Owner dashboard
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
      <h1 className="text-2xl font-semibold text-[rgb(var(--foreground))]">Add Tenant</h1>
      <p className="mb-4 text-sm text-[rgb(var(--muted-foreground))]">
        Create a new municipality and assign yourself as its owner.
      </p>

      {/* NOTE: plain <form> so Next can follow redirect without our client reload */}
      <form action={createTenant} className="rounded-2xl border border-[rgb(var(--border))] p-4">
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
