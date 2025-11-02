// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Municipal SaaS Platform",
  description: "Multi-tenant municipal management platform for work orders, sampling, and compliance.",
};

/**
 * RootLayout wraps all pages.
 * - Loads global Tailwind styles
 * - Adds the permission-based Header
 * - Centers content within a consistent max width
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-background text-foreground antialiased flex flex-col"
      >
        {/* Permission-based navigation header */}
        <Header />

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
