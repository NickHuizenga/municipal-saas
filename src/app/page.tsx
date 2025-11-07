// src/app/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = getSupabaseServer();

  // 1) Check session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error getting session on /:", sessionError);
  }

  if (!session) {
    redirect("/login");
  }

  const userId = session!.user.id;

  // 2) Load profile to see if platform owner
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_platform_owner")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Error loading profile on /:", profileError);
  }

  const isPlatformOwner = profile?.is_platform_owner === true;

  // 3) Route based on role
  if (isPlatformOwner) {
    redirect("/owner");
  }

  // Non-platform users: send to tenant selection
  redirect("/tenant/select");
}
