// src/app/tenant/select/tenant-card.tsx
"use client";

import { useRouter } from "next/navigation";

export default function TenantCard({
  tenant,
}: {
  tenant: { id: string; name: string; role: string };
}) {
  const router = useRouter();

  async function choose() {
    await fetch("/tenant/select/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenant.id }),
    });
    router.push("/tenant/resolve");
  }

  return (
    <button
      onClick={choose}
      className="group text-left rounded-2xl border p-4 shadow-sm hover:shadow transition
                 bg-background/50 hover:bg-background"
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">{tenant.name}</div>
        <span className="text-xs rounded-full border px-2 py-0.5">
          {tenant.role}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        Click to continue →
      </div>
    </button>
  );
}
