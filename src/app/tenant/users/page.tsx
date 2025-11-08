// src/app/tenant/users/page.tsx
// Shows users for the CURRENT tenant, using v_tenant_user_memberships.
// This will make /tenant/users match the member counts shown on the
// Platform Owner dashboard cards.

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getTenantMembers } from "@/lib/tenantMembers";

export const revalidate = 0;

export default async function TenantUsersPage() {
  const cookieStore = cookies();
  const tenantId = cookieStore.get("tenant_id")?.value;

  // If no tenant selected, send back to tenant picker
  if (!tenantId) {
    redirect("/tenant/select");
  }

  const supabase = getSupabaseServer();

  // 1. Make sure there is a logged-in user
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 2. Check profile (is platform owner?)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  // 3. If not platform owner, make sure they belong to this tenant
  if (!profile?.is_platform_owner) {
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      redirect("/tenant/select");
    }
  }

  // 4. Load tenant info for the header
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, created_at")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    console.error("[TenantUsersPage] tenant not found", tenantError);
    redirect("/tenant/select");
  }

  // 5. Load members using the unified view helper
  const members = await getTenantMembers(tenantId);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-zinc-950 px-6 py-6 text-zinc-50">
      {/* Header */}
      <section className="space-y-1 mb-4">
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <p className="text-sm text-zinc-400">
          Tenant User Management · Update roles for members of this municipality.
        </p>
        <p className="text-xs text-zinc-500">
          {members.length}{" "}
          {members.length === 1 ? "member" : "members"} in this tenant.
        </p>
      </section>

      {/* Users Table */}
      <section className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/80">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">
                Name
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">
                Email
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">
                Role
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user_id} className="border-t border-zinc-800">
                <td className="px-4 py-2 text-sm text-zinc-100">
                  {m.full_name ?? "(no name on profile)"}
                </td>
                <td className="px-4 py-2 text-sm text-zinc-300">
                  {m.email ?? "—"}
                </td>
                <td className="px-4 py-2 text-sm text-zinc-200 capitalize">
                  {m.role}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-sm text-zinc-500"
                >
                  No users are currently assigned to this tenant. Invite users
                  and add them to this municipality to manage their roles here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
