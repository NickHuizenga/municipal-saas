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

  // 1) Get memberships for this tenant
  const {
    data: membershipRows,
    error: membershipsError,
  } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenantId);

  if (membershipsError) {
    console.error("Error loading tenant memberships:", membershipsError);
  }

  const memberships = membershipRows ?? [];
  const userIds = memberships.map((m: any) => m.user_id as string);

  let profileMap = new Map<string, { full_name: string | null }>();

  // 2) Get profile names for those users
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

  const users: TenantUserRow[] = memberships.map((m: any) => {
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
      {/* Heading */}
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">{tenantName}</h1>
        <p className="text-xs text-zinc-500">
          Tenant Members · Manage roles for users assigned to this municipality.
        </p>
      </section>

      {!hasUsers ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
          No members are currently assigned to this tenant. Use the Invite
          flow to add users to this municipality.
        </div>
      ) : (
        <UserManagementForm tenantId={tenantId} users={users} />
      )}
    </main>
  );
}
