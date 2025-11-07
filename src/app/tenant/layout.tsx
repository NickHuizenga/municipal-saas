// src/app/tenant/layout.tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "Tenant | Municipal Platform",
};

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {children}
    </div>
  );
}
