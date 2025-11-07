// src/app/tenant/users/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getTenantContext } from "@/lib/tenantContext";
import UserManagementForm, {
  TenantUserRow,
} from "./UserManagementForm";

export const revalidate = 0;

export default async function TenantUsersPage() {
  const ctx = await getTenantContext();
  const { tenantId, tenantName, tenantRole, isPlatformOwner } = ctx;

  const supabase = getSupabaseServer();

  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  // Only platform owners or tenant owners/admins can manage users
  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // Load all members for this tenant with profile info
  const { data: rows, error } = await supabase
    .from("tenant_memberships")
    .select("user_id, role, profiles(full_name, email)")
    .eq("tenant_id", tenantId)
    .order("role", { ascending: true });

  if (error) {
    console.error("Error loading tenant users:", error);
  }

  const users: TenantUserRow[] =
    rows?.map((row: any) => ({
      userId: row.user_id as string,
      role: row.role as string,
      fullName: row.profiles?.full_name ?? "",
      email: row.profiles?.email ?? null,
    })) ?? [];

  const hasUsers = users.length > 0;

  return (
    <main className="p-6 space-y-6">
      {/* Heading */}
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">{tenantName}</h1>
        <p className="text-xs text-zinc-500">
          Tenant User Management · Update roles for members of this municipality.
        </p>
      </section>

      {!hasUsers ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
          No users are currently assigned to this tenant. Invite users and add
          them to this municipality to manage their roles here.
        </div>
      ) : (
        <UserManagementForm tenantId={tenantId} users={users} />
      )}
    </main>
  );
}
