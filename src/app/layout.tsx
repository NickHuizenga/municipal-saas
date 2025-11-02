// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/header";
import Breadcrumbs from "@/components/breadcrumbs";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "Municipal SaaS Platform",
  description:
    "Multi-tenant municipal management platform for work orders, sampling, and compliance.",
};

/**
 * RootLayout wraps all pages.
 * - Loads global Tailwind styles
 * - Adds the permission-based Header
 * - Adds a tenant-aware Breadcrumbs bar
 * - Centers content within a consistent max width
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve active tenant name (server-side; no client flash)
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const tenantCookieName = process.env.TENANT_COOKIE_NAME || "tenant_id";
  const tenantId = cookies().get(tenantCookieName)?.value ?? null;

  let tenantName: string | null = null;

  if (user && tenantId) {
    const { data } = await supabase
      .from("tenant_memberships")
      .select("tenants!inner(name)")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    tenantName = ((data as any)?.tenants?.name as string) || null;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col">
        {/* Permission-based navigation header */}
        <Header />

        {/* Breadcrumbs (tenant-aware) */}
        <div className="mx-auto w-full max-w-6xl px-4">
          <Breadcrumbs tenantName={tenantName} />
        </div>

        {/* Main content area */}
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </main>

        {/* Footer (optional) */}
        <footer className="border-t mt-8 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Municipal SaaS Platform
        </footer>
      </body>
    </html>
  );
}
