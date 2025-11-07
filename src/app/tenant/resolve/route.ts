// src/app/tenant/resolve/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const tenantId = formData.get("tenant_id") as string | null;
  const redirectToRaw = formData.get("redirect_to") as string | null;
  const redirectTo =
    redirectToRaw && redirectToRaw.startsWith("/") ? redirectToRaw : null;

  if (!tenantId) {
    return NextResponse.redirect(new URL("/tenant/select", req.url));
  }

  const supabase = getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = session.user.id;

  // Profile → platform owner?
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  // Tenant membership for this user
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  const tenantRole = membership?.role ?? null;

  // If not platform owner and not a member of that tenant, bounce
  if (!isPlatformOwner && !tenantRole) {
    return NextResponse.redirect(new URL("/tenant/select", req.url));
  }

  // Set tenant_id cookie for tenant-scoped pages
  const cookieStore = cookies();
  cookieStore.set("tenant_id", tenantId, {
    path: "/",
    sameSite: "lax",
  });

  // Decide where to send them
  let destination: string;

  if (redirectTo) {
    destination = redirectTo;
  } else if (
    isPlatformOwner ||
    (tenantRole && ["owner", "admin"].includes(tenantRole))
  ) {
    destination = "/tenant/admin";
  } else {
    destination = "/tenant/home";
  }

  return NextResponse.redirect(new URL(destination, req.url));
}
