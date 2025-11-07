// src/app/login/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();

  // After login, send the user back into the app (root route will
  // send platform owners to /owner etc. based on their profile).
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
        <h1 className="mb-2 text-center text-2xl font-semibold">Sign in</h1>
        <p className="mb-4 text-center text-sm text-zinc-400">
          Use your email and password to access the municipal dashboard.
        </p>

        <Auth
          supabaseClient={supabase}
          view="sign_in"
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#4f46e5",
                  brandAccent: "#6366f1",
                  inputBorder: "#3f3f46",
                  inputLabelText: "#e4e4e7",
                },
              },
            },
          }}
          providers={[]}
          onlyThirdPartyProviders={false}
        />

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
