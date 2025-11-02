// src/app/login/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LoginState = {
  error?: string | null;
};

async function doLogin(_: LoginState, formData: FormData): Promise<LoginState> {
  "use server";

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase gives messages like "Invalid login credentials"
      return { error: error.message || "Invalid credentials." };
    }
  } catch (e) {
    return { error: "Auth service unavailable. Try again in a moment." };
  }

  // Success → take user to tenant selection
  redirect("/tenant/select");
}

function ErrorBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-300 bg-red-50/80 text-red-900 px-3 py-2 text-sm">
      {message}
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const initialError =
    searchParams?.error === "no_tenant"
      ? "Please choose a tenant to continue."
      : searchParams?.error === "unknown_tenant"
      ? "That tenant no longer exists. Please choose again."
      : searchParams?.error === "not_member"
      ? "You’re not a member of that tenant."
      : null;

  // Minimal, standalone form (works with /login/layout.tsx you added)
  return (
    <main className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-background/70 backdrop-blur shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-center">Sign in</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          Use your email and password.
        </p>

        <div className="mt-4">
          <ErrorBox message={initialError} />
        </div>

        {/* Server Action form */}
        <form action={doLogin.bind(null, {})} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border rounded-lg px-3 py-2 bg-background"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border rounded-lg px-3 py-2 bg-background"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg border px-4 py-2 hover:shadow-sm"
          >
            Sign in
          </button>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>No self-signups.</span>
            <a href="#" className="underline">Forgot password</a>
          </div>
        </form>
      </div>
    </main>
  );
}
