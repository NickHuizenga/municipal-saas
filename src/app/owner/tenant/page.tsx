// src/app/owner/tenant/page.tsx
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getTenantContext } from "@/lib/tenantContext";

export const revalidate = 0;

export default async function OwnerTenantPage() {
  const ctx = await getTenantContext();
  const { tenantId, tenantName, isPlatformOwner } = ctx;

  const supabase = getSupabaseServer();

  if (!isPlatformOwner) {
    return (
      <main className="p-6">
        <p className="text-red-500">Access denied. Platform owners only.</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{tenantName}</h1>
        <p className="text-xs text-zinc-500">
          Tenant ID:{" "}
          <span className="font-mono text-zinc-300">{tenantId}</span>
        </p>
        <p className="text-xs text-zinc-500">
          Manage users, roles, modules, and permissions for this municipality.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/tenant/admin"
          className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 hover:border-indigo-500 hover:bg-zinc-900/70 transition"
        >
          <h2 className="text-sm font-semibold text-zinc-100">
            Members & Roles
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            View and manage tenant members, roles, and invitations.
          </p>
        </a>

        <a
          href="/tenant/modules"
          className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 hover:border-indigo-500 hover:bg-zinc-900/70 transition"
        >
          <h2 className="text-sm font-semibold text-zinc-100">
            Tenant Module Settings
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Toggle feature availability for this municipality.
          </p>
        </a>

        <a
          href="/tenant/admin"
          className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 hover:border-indigo-500 hover:bg-zinc-900/70 transition"
        >
          <h2 className="text-sm font-semibold text-zinc-100">
            User Permissions
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Manage per-user module access and privilege levels.
          </p>
        </a>

        <a
          href="#"
          className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 hover:border-indigo-500 hover:bg-zinc-900/70 transition"
        >
          <h2 className="text-sm font-semibold text-zinc-100">
            Feature Flags (Upcoming)
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Control beta features and experimental modules.
          </p>
        </a>
      </section>
    </main>
  );
}
