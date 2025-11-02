// src/app/tenant/select/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "../../../lib/supabaseServer";

async function setTenantCookie(tenantId: string) {
  "use server";
  cookies().set({ name: "tenant_id", value: tenantId, path: "/", httpOnly: true });
  redirect("/tenant/resolve");
}

export default async function SelectTenantPage() {
  const supabase = getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find tenants where the user has a membership
  const { data: memberships, error: memErr } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id);

  if (memErr) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold mb-2">Select a Tenant</h1>
        <p className="text-red-500">Error loading memberships: {memErr.message}</p>
      </main>
    );
  }

  if (!memberships || memberships.length === 0) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold mb-2">Select a Tenant</h1>
        <p className="text-gray-400">No tenants found for your account.</p>
      </main>
    );
  }

  // Load tenant records for those IDs
  const tenantIds = memberships.map(m => m.tenant_id);
  const { data: tenants, error: tenantsErr } = await supabase
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds);

  if (tenantsErr) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold mb-2">Select a Tenant</h1>
        <p className="text-red-500">Error loading tenants: {tenantsErr.message}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Select a Tenant</h1>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {(tenants ?? []).map((t) => (
          <form key={t.id} action={async () => setTenantCookie(t.id)} className="contents">
            <button
              type="submit"
              className="w-full text-left p-4 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-750 transition"
            >
              <div className="text-lg font-semibold">{t.name}</div>
              <div className="text-xs text-gray-400 mt-1">{t.id}</div>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
