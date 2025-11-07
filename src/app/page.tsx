// src/app/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Not logged in → show landing card
  if (!session) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-zinc-50">
            Municipal SaaS Platform
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Multi-tenant management platform powered by Next.js and Supabase.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Logged-in user: decide their "home" based on profile + tenant context
  const userId = session.user.id;

  // 1) Platform owner? → /owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_platform_owner) {
    redirect("/owner");
  }

  // 2) Not a platform owner → consider tenant cookie
  const cookieStore = cookies();
  const tenantId = cookieStore.get("tenant_id")?.value ?? null;

  if (tenantId) {
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membership) {
      const role = membership.role as string;
      if (["owner", "admin"].includes(role)) {
        redirect("/tenant/admin");
      } else {
        redirect("/tenant/home");
      }
    }
    // If cookie points at a tenant where they’re not a member, fall through.
  }

  // 3) No tenant selected / no valid membership → go pick a municipality
  redirect("/tenant/select");
}
