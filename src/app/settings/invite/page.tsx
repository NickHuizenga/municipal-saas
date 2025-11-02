// src/app/settings/invite/page.tsx
"use client";

import { useState } from "react";

const ROLES = ["viewer","crew","crew_leader","dispatcher","admin","owner"] as const;
type Role = typeof ROLES[number];

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Sending…");
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    if (res.ok) {
      setStatus("Invite sent ✅");
      setEmail("");
      setRole("viewer");
    } else {
      setStatus(`Invite failed (${res.status})`);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Invite a User</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Owners/admins can invite new members to this tenant.
      </p>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-background"
            placeholder="user@example.com"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full border rounded px-3 py-2 bg-background"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border hover:shadow-sm"
          >
            Send Invite
          </button>
          {status && <span className="text-sm text-muted-foreground">{status}</span>}
        </div>
      </form>
    </main>
  );
}
