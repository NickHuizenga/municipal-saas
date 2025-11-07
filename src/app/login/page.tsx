// src/app/login/page.tsx
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const revalidate = 0;

async function handleLogin(formData: FormData) {
  "use server";

  const supabase = getSupabaseServer();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login error:", error.message);
    redirect("/login?error=invalid");
  }

  // On success, go to the root router, which will send you to /owner or /tenant/select
  redirect("/");
}

type LoginPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = getSupabaseServer();

  // If already logged in, skip login page
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/");
  }

  const errorKey = searchParams?.error as string | undefined;
  let errorMessage: string | null = null;

  if (errorKey === "missing") {
    errorMessage = "Please enter both email and password.";
  } else if (errorKey === "invalid") {
    errorMessage = "Invalid email or password.";
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
        <h1 className="mb-2 text-center text-2xl font-semibold">Sign in</h1>
        <p className="mb-4 text-center text-sm text-zinc-400">
          Use your email and password to access the municipal dashboard.
        </p>

        {errorMessage && (
          <div className="mb-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <form action={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-xs font-medium text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-xs font-medium text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-xl border border-indigo-500 bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            Sign in
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-zinc-500">
          No self-signups. Contact your administrator for access.
        </p>
        <p className="mt-8 text-center text-[10px] text-zinc-600">
          CMSAlpha 2025
        </p>
      </div>
    </main>
  );
}
