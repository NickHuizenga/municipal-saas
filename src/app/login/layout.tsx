// src/app/login/layout.tsx
import "../globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="mx-auto max-w-md px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
