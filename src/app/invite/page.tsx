// src/app/invite/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import InviteForm, { TenantOption } from "./InviteForm";

export const revalidate = 0;

type InvitePageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const supabase = getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Profile → platform owner?
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Build list of tenants this user may invite into
  let tenants: TenantOption[] = [];

  if (isPlatformOwner) {
    const { data: tenantRows, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name")
      .order("name", { ascending: true });

    if (tenantsError) {
      console.error("Error loading tenants in /invite:", tenantsError);
    }

    tenants =
      tenantRows?.map((t) => ({
        id: t.id as string,
        name: t.name as string,
      })) ?? [];
  } else {
    // Non-platform: only tenants where current user is owner/admin
    const { data: membershipRows, error: membershipError } = await supabase
      .from("tenant_memberships")
      .select("role, tenants(id, name)")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"]);

    if (membershipError) {
      console.error("Error loading memberships in /invite:", membershipError);
    }

    tenants =
      membershipRows
        ?.map((row: any) => ({
          id: row.tenants?.id as string,
          name: row.tenants?.name as string,
        }))
        .filter((t) => t.id && t.name) ?? [];
  }

  if (tenants.length === 0) {
    return (
      <main className="p-6 space-y-6">
        <nav className="text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">
            Home
          </Link>
          <span className="mx-1">/</span>
          <span>Invite</span>
        </nav>

        <section className="space-y-2">
          <h1 className="text-2xl font-semibold">Invite User</h1>
          <p className="text-sm text-zinc-400">
            You don&apos;t currently have permission to invite users into any
            tenants. Only platform owners and tenant owners/admins may send
            invites.
          </p>
        </section>
      </main>
    );
  }

  const errorKey = (searchParams?.error as string | undefined) ?? "";
  let errorMessage: string | null = null;

  if (errorKey === "missing") {
    errorMessage = "Please fill out all required fields.";
  } else if (errorKey === "invite_failed") {
    errorMessage =
      "We were unable to send the invite. Please check your Supabase configuration or try again.";
  } else if (errorKey === "membership_failed") {
    errorMessage =
      "The user was created, but adding them to the tenant failed. Please try again.";
  }

  const defaultTenantId =
    (searchParams?.tenant_id as string | undefined) ?? tenants[0]?.id ?? "";

  return (
    <main className="p-6 space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Home
        </Link>
        <span className="mx-1">/</span>
        <span>Invite</span>
      </nav>

      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Invite a User</h1>
        <p className="text-sm text-zinc-400">
          Send an invite to join a municipality and assign their initial role.
        </p>
        <p className="text-xs text-zinc-500">
          Only platform owners and tenant owners/admins can invite users.
        </p>
      </section>

      {/* Form */}
      <section className="max-w-xl">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <InviteForm tenants={tenants} defaultTenantId={defaultTenantId} />
      </section>
    </main>
  );
}
