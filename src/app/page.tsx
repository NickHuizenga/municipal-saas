// src/app/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const revalidate = 0;

export default async function HomePage() {
  try {
    const supabase = getSupabaseServer();

    // 1️⃣ Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError.message);
      redirect("/login");
    }

    if (!session) {
      redirect("/login");
    }

    const userId = session.user.id;

    // 2️⃣ Fetch user profile (role / ownership)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_platform_owner")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error loading profile:", profileError.message);
      redirect("/tenant/select");
    }

    // 3️⃣ Route appropriately
    if (profile?.is_platform_owner) {
      redirect("/owner");
    }

    redirect("/tenant/select");
  } catch (err: any) {
    console.error("Unhandled error in / route:", err.message);
    redirect("/login");
  }
}
