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

  // Only platform owners or tenant owners/admins can manage members
  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // 1) Load ALL memberships (same approach as Platform Owner Dashboard)
  const {
    data: allMemberships,
    error: membershipsError,
  } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, user_id, role");

  if (membershipsError) {
    console.error("Error loading tenant memberships:", membershipsError);
  }

  const membershipsForTenant =
    allMemberships?.filter(
      (m: any) => (m.tenant_id as string) === tenantId
    ) ?? [];

  const userIds = membershipsForTenant.map(
    (m: any) => m.user_id as string
  );

  // 2) Load profiles for those users (for names)
  let profileMap = new Map<string, { full_name: string | null }>();

  if (userIds.length > 0) {
    const {
      data: profileRows,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error loading profiles for tenant users:", profilesError);
    }

    (profileRows ?? []).forEach((p: any) => {
      profileMap.set(p.id as string, {
        full_name: (p.full_name as string | null) ?? null,
      });
    });
  }

  const users: TenantUserRow[] = membershipsForTenant.map((m: any) => {
    const uid = m.user_id as string;
    const prof = profileMap.get(uid);
    return {
      userId: uid,
      role: (m.role as string) ?? "viewer",
      fullName: prof?.full_name ?? "",
    };
  });

  const hasUsers = users.length > 0;

  return (
    <main className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-xs text-zinc-500">
        <span className="text-zinc-400">Home</span>
        <span className="mx-1">/</span>
        <span>Tenant</span>
        <span className="mx-1">/</span>
        <span>Users</span>
      </nav>

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
