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

  // If not logged in, show the existing landing card
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

  // Logged-in user: decide where "Home" should send them
  const userId = session.user.id;

  // Check if platform owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  if (isPlatformOwner) {
    // Platform owner home = global owner dashboard
    redirect("/owner");
  }

  const cookieStore = cookies();
  const tenantId = cookieStore.get("tenant_id")?.value ?? null;

  if (tenantId) {
    // See if the user is a member of this tenant and what their role is
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

    // Stale tenant cookie (no membership) – fall through to tenant selection
  }

  // No tenant cookie, or not a member of the cookie tenant:
  // send to tenant selector to pick a municipality
  redirect("/tenant/select");
}
