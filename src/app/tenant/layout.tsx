// src/app/tenant/layout.tsx
import type { ReactNode } from "react";
import Header from "@/components/header";

export const metadata = {
  title: "Tenant | Municipal Platform",
};

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Global header with role pill + dropdowns */}
      <Header />

      {/* Simple breadcrumb / section header */}
      <div className="border-b border-zinc-900 px-6 py-3 text-xs text-zinc-500">
        Home / Tenant
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
