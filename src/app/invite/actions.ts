// src/app/invite/actions.ts
"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client (no cookies, service role key)
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function inviteUser(formData: FormData) {
  const supabase = getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const currentUserId = session.user.id;

  const rawEmail = formData.get("email") as string | null;
  const fullNameRaw = formData.get("full_name") as string | null;
  const tenantId = formData.get("tenant_id") as string | null;
  const role = formData.get("role") as string | null;

  const email = rawEmail?.trim().toLowerCase();
  const fullName = fullNameRaw?.trim() || "";

  if (!email || !tenantId || !role) {
    redirect("/invite?error=missing");
  }

  // --- Permission check: platform owner OR owner/admin of that tenant ---

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", currentUserId)
    .maybeSingle();

  const isPlatformOwner = profile?.is_platform_owner === true;

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  const tenantRole = membership?.role as string | undefined;
  const isTenantAdminOrOwner =
    tenantRole != null && ["owner", "admin"].includes(tenantRole);

  if (!isPlatformOwner && !isTenantAdminOrOwner) {
    redirect("/tenant/home");
  }

  // --- Find or create auth user via Admin API ---

  let userId: string | null = null;

  try {
    // listUsers only supports { page, perPage } in v2, so we filter by email ourselves
    const { data: listData, error: listErr } =
      await adminSupabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (listErr) {
      console.error("Error listing users:", listErr);
    }

    const existingUser =
      listData?.users?.find(
        (u) => u.email && u.email.toLowerCase() === email
      ) ?? null;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // No existing user → invite
      const { data: inviteData, error: inviteErr } =
        await adminSupabase.auth.admin.inviteUserByEmail(email, {
          data: fullName ? { full_name: fullName } : undefined,
        });

      if (inviteErr || !inviteData?.user) {
        console.error("Error inviting user:", inviteErr);
        redirect("/invite?error=invite_failed");
      }

      userId = inviteData.user.id;
    }
  } catch (e) {
    console.error("Unexpected error in invite:", e);
    redirect("/invite?error=invite_failed");
  }

  if (!userId) {
    redirect("/invite?error=invite_failed");
  }

  // --- Upsert profile for this user (using app client so RLS applies) ---

  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: fullName,
        email,
      },
      { onConflict: "id" }
    );

  if (profileUpsertError) {
    console.error("Error upserting profile:", profileUpsertError);
  }

  // --- Add membership for this tenant ---

  const { error: membershipError } = await supabase
    .from("tenant_memberships")
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role,
      },
      { onConflict: "tenant_id,user_id" }
    );

  if (membershipError) {
    console.error("Error adding tenant membership:", membershipError);
    redirect(`/invite?tenant_id=${tenantId}&error=membership_failed`);
  }

  // On success, go manage users for that tenant
  redirect("/tenant/users");
}
