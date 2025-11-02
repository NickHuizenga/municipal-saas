// src/app/tenant/resolve/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "../../../lib/supabaseServer";

export default async function ResolveTenantPage() {
  // If a tenant cookie is already set, continue into the app (adjust path if needed)
  const tenantId = cookies().get("tenant_id")?.value;
  if (!tenantId) {
    redirect("/tenant/select");
  }

  // (Optional) sanity check: ensure the current user still has a membership for this tenant
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle?.() ?? await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();

  if (!membership) {
    // user lost access; clear cookie and send them to selection
    cookies().set({ name: "tenant_id", value: "", maxAge: 0, path: "/" });
    redirect("/tenant/select");
  }

  // Success: route them into your app’s main area.
  // Change "/" to whatever your main app route is (e.g. "/work-orders")
  redirect("/");
}
