// src/app/invite/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { inviteUser } from "./actions";

export const revalidate = 0;

type TenantOption = {
  id: string;
  name: string;
};

type InvitePageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "crew_leader", label: "Crew Leader" },
  { value: "crew", label: "Crew" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "viewer", label: "Viewer" },
];

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

        <InviteFormInternal tenants={tenants} defaultTenantId={defaultTenantId} />
      </section>
    </main>
  );
}

// Small client wrapper for sticky / dirty button behavior
function InviteFormInternal({
  tenants,
  defaultTenantId,
}: {
  tenants: TenantOption[];
  defaultTenantId: string;
}) {
  "use client";

  const [dirty, setDirty] = (require("react") as typeof import("react")).useState(false);

  const baseBtn =
    "rounded-xl border px-4 py-2 text-sm font-medium transition-colors";
  const activeBtn =
    "border-indigo-500 bg-indigo-600 text-white shadow-sm hover:bg-indigo-500";
  const inactiveBtn =
    "border-zinc-700 bg-zinc-900 text-zinc-400 opacity-70 cursor-default";

  const onChange = () => {
    if (!dirty) setDirty(true);
  };

  return (
    <form action={inviteUser} className="space-y-4">
      {/* Sticky bar */}
      <div className="sticky top-16 z-30 flex justify-end pb-2">
        <button
          type="submit"
          disabled={!dirty}
          className={`${baseBtn} ${dirty ? activeBtn : inactiveBtn}`}
        >
          Send Invite
        </button>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="space-y-1">
          <label
            htmlFor="tenant_id"
            className="text-xs font-medium text-zinc-300"
          >
            Tenant
          </label>
          <select
            id="tenant_id"
            name="tenant_id"
            defaultValue={defaultTenantId}
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-xs font-medium text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="user@example.com"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="full_name"
            className="text-xs font-medium text-zinc-300"
          >
            Full name (optional)
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Jane Doe"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="role"
            className="text-xs font-medium text-zinc-300"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="viewer"
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}
