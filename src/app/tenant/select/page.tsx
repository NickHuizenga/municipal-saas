// src/app/tenant/select/page.tsx
import TenantCard from "./tenant-card";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function getTenantsForUser() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("role, tenants!inner(id, name)")
    .eq("user_id", user.id);

  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.tenants.id as string,
    name: row.tenants.name as string,
    role: row.role as string,
  }));
}

export default async function TenantSelectPage() {
  const tenants = await getTenantsForUser();

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Select a Tenant</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Pick a municipality to continue.
      </p>

      {tenants.length === 0 ? (
        <div className="rounded-2xl border p-6">
          <p className="mb-1">No tenants linked to your account yet.</p>
          <p className="text-sm text-muted-foreground">
            Ask an owner to invite you, or if you’re an owner,{" "}
            <Link href="/settings/invite" className="underline">invite a user</Link>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((t) => <TenantCard key={t.id} tenant={t} />)}
        </div>
      )}
    </main>
  );
}
