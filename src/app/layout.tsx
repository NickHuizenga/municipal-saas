// src/app/layout.tsx
import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Municipal SaaS",
  description: "Multi-tenant municipal platform built with Next.js + Supabase",
};

// ✅ This wraps every page of your app
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
