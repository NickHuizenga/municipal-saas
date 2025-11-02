// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/header";
import Breadcrumbs from "@/components/breadcrumbs";

export const metadata: Metadata = {
  title: "Municipal SaaS Platform",
  description: "Multi-tenant municipal management platform.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))] antialiased flex flex-col">
        <Header />
        <div className="mx-auto w-full max-w-6xl px-4">
          <Breadcrumbs />
        </div>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </main>

        {/* Footer without border */}
        <footer className="py-6 text-center text-xs text-[rgb(var(--muted-foreground))]">
          CMSAlpha&nbsp;2025
        </footer>
      </body>
    </html>
  );
}
