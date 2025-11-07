// src/app/tenant/users/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import UserManagementForm, {
  TenantUserRow,
} from "./UserManagementForm";

export const revalidate = 0;

// Admin client using service role key (server-side only)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default async function TenantUsersPage() {
  const cookieStore = cookies();
  const supabase = getSupabaseServer();

  // 1) Require auth
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUserId = session.user.id;

  // 2) Resolve tenant from cookie (set by /tenant/resolve)
  const tenantId = cookieStore.get("tenant_id")?.value ?? null;

  if (!tenantId) {
    redirect("/tenant/select");
  }

  // 3) Profile: are we platform owner?
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", currentUserId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // 4) Current user's membership role for this tenant
  const { data: myMembership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  const myTenantRole = myMembership?.role as string | undefined;
  const isTenantAdminOrOwner =
    myTenantRole != null && ["owner", "admin"].includes(myTenantRole);

  // Only platform owners or tenant owners/admins can manage users
  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // 5) Get tenant name for header (using normal client)
  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError) {
    console.error("Error loading tenant in /tenant/users:", tenantError);
  }

  const tenantName =
    (tenantRow?.name as string | undefined) ?? "Selected Tenant";

  // 6) NOW use admin client (service role) to *bypass RLS* and read memberships
  const {
    data: membershipRows,
    error: membershipsError,
  } = await adminSupabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenantId);

  if (membershipsError) {
    console.error(
      "Admin error loading tenant memberships in /tenant/users:",
      membershipsError
    );
  }

  const memberships = membershipRows ?? [];
  const userIds = memberships.map((m: any) => m.user_id as string);

  // 7) Load profiles for those user IDs (also via admin client to avoid RLS issues)
  let profileMap = new Map<string, { full_name: string | null }>();

  if (userIds.length > 0) {
    const {
      data: profileRows,
      error: profilesError,
    } = await adminSupabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error(
        "Admin error loading profiles for tenant users:",
        profilesError
      );
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
        <UserManagementForm tenantId={tenantId} users={users} />
      )}
    </main>
  );
}
