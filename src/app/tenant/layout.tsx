// src/app/tenant/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "Tenant | Municipal Platform",
};

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Simple breadcrumb / section header for all /tenant routes */}
      <div className="border-b border-zinc-900 px-6 py-3 text-xs text-zinc-500">
        Home / Tenant
      </div>

      {/* Page content (Tenant Home, Tenant Admin, etc.) */}
      <div>{children}</div>
    </div>
  );
}
