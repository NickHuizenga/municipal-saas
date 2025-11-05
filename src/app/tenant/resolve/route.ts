// src/app/tenant/resolve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const TENANT_COOKIE_NAME =
  process.env.TENANT_COOKIE_NAME || "tenant_id";


export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();

  // 1) Read tenant_id from the form
  const formData = await req.formData();
  const tenantId = String(formData.get("tenant_id") ?? "");

  if (!tenantId) {
    // No tenant selected → back to selector
    return NextResponse.redirect(new URL("/tenant/select", req.url));
  }

  // 2) Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3) Load profile (to know if this is platform_owner)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("tenant/resolve: profile error", profileError);
  }

  const isPlatformOwner = !!profile?.is_platform_owner;

  // 4) Check membership for this tenant
  const { data: membership, error: membershipError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("tenant/resolve: membership error", membershipError);
  }

  // 5) Decide where to send them
  //    - platform_owner: can always continue; if they ALSO have a membership and are
  //      owner/admin, send to /tenant/admin, else /tenant/home (for testing).
  //    - normal user: must have a membership; owner/admin → /tenant/admin, others → /tenant/home.

  let targetPath = "/tenant/home";

  if (isPlatformOwner) {
    if (membership?.role === "owner" || membership?.role === "admin") {
      targetPath = "/tenant/admin";
    } else {
      targetPath = "/tenant/home";
    }
  } else {
    if (!membership) {
      // Not a member → back to selector
      return NextResponse.redirect(new URL("/tenant/select", req.url));
    }

    if (membership.role === "owner" || membership.role === "admin") {
      targetPath = "/tenant/admin";
    } else {
      targetPath = "/tenant/home";
    }
  }

  // 6) Set tenant cookie + redirect
  const res = NextResponse.redirect(new URL(targetPath, req.url));

  res.cookies.set(TENANT_COOKIE_NAME, tenantId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return res;
}
