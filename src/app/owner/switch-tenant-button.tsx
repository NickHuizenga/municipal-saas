// src/app/owner/switch-tenant-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SwitchTenantButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchToTenant() {
    setBusy(true);
    await fetch("/tenant/select/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    // Hand off to existing resolve flow; if your resolve page requires membership,
    // platform owners may need a relaxed check or to add themselves as a member.
    router.push("/tenant/resolve");
  }

  return (
    <button
      onClick={switchToTenant}
      disabled={busy}
      className="text-sm rounded-lg border px-3 py-1.5 hover:bg-muted"
      title="Switch context to this tenant"
    >
      {busy ? "Switching…" : "Switch"}
    </button>
  );
}
