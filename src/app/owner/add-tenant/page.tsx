// src/app/owner/add-tenant/page.tsx
import SmartForm from "@/components/SmartForm";
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

  // 1) Create tenant (features default empty {})
  const { data: t, error: terr } = await supabase
    .from("tenants")
    .insert({ name, features: {} })
    .select("id")
    .maybeSingle();

  if (terr || !t?.id) return;

  // 2) Ensure the creator is an owner member of the new tenant
  await supabase
    .from("tenant_memberships")
    .insert({ tenant_id: t.id, user_id: user.id, role: "owner" })
    .select("tenant_id")
    .maybeSingle();

  // 3) Back to owner dashboard
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
      <p className="text-sm text-[rgb(var(--muted-foreground))] mb-4">
        Create a new municipality and assign yourself as its owner.
      </p>

      <SmartForm action={createTenant} className="rounded-2xl border border-[rgb(var(--border))] p-4">
        <label className="block text-sm mb-1">Tenant name</label>
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
      </SmartForm>
    </main>
  );
}
