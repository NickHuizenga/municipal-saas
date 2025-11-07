// src/app/tenant/users/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getTenantContext } from "@/lib/tenantContext";
import UserManagementForm, {
  TenantUserRow,
} from "./UserManagementForm";

export const revalidate = 0;

export default async function TenantUsersPage() {
  const ctx = await getTenantContext();
  const { tenantId: ctxTenantId, tenantName, tenantRole, isPlatformOwner } = ctx;

  const supabase = getSupabaseServer();

  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  // Only platform owners or tenant owners/admins can manage members
  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // 1) Resolve the canonical tenant ID from the tenants table.
  //    This avoids any mismatch between cookie/context and DB.
  const {
    data: tenantRecord,
    error: tenantError,
  } = await supabase
    .from("tenants")
    .select("id")
    .eq("name", tenantName)
    .maybeSingle();

  if (tenantError) {
    console.error("Error resolving tenant in /tenant/users:", tenantError);
  }

  const tenantDbId: string | null =
    (tenantRecord?.id as string | undefined) ?? ctxTenantId ?? null;

  if (!tenantDbId) {
    // We can't safely resolve the tenant id; bail.
    return (
      <main className="p-6 space-y-6">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold">{tenantName}</h1>
          <p className="text-xs text-zinc-500">
            Tenant User Management · Unable to resolve tenant identifier.
          </p>
        </section>
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
          We couldn&apos;t resolve the tenant ID for this municipality. Please
          check your tenant configuration.
        </div>
      </main>
    );
  }

  // 2) Get memberships for THIS tenant id (not all tenants)
  const {
    data: membershipRows,
    error: membershipsError,
  } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenantDbId);

  if (membershipsError) {
    console.error("Error loading tenant memberships:", membershipsError);
  }

  const memberships = membershipRows ?? [];
  const userIds = memberships.map((m: any) => m.user_id as string);

  // 3) Load profiles for those users for display names
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
      {/* Breadcrumbs */}
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Home
        </Link>
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
        <UserManagementForm tenantId={tenantDbId} users={users} />
      )}
    </main>
  );
}
