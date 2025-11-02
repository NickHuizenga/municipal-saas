// src/app/settings/members/members-client.tsx
"use client";

import { useEffect, useState, useTransition } from "react";

type Role = "owner" | "admin" | "dispatcher" | "crew_leader" | "crew" | "viewer";
type Member = {
  user_id: string;
  email?: string;
  full_name?: string;
  role: Role;
};

const ROLES: Role[] = ["owner","admin","dispatcher","crew_leader","crew","viewer"];

export default function MembersClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/memberships/list", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setMembers(json.members ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateRole(user_id: string, role: Role) {
    startTransition(async () => {
      const res = await fetch("/api/memberships/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, role }),
      });
      if (res.ok) {
        setMembers((m) => m.map(x => x.user_id === user_id ? { ...x, role } : x));
      } else {
        alert("Could not update role (owner-safety rule or auth).");
      }
    });
  }

  function revoke(user_id: string) {
    if (!confirm("Remove this member from the tenant?")) return;
    startTransition(async () => {
      const res = await fetch("/api/memberships/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id }),
      });
      if (res.ok) {
        setMembers((m) => m.filter(x => x.user_id !== user_id));
      } else {
        alert("Could not revoke (owner-safety rule or auth).");
      }
    });
  }

  return (
    <div className="rounded-2xl border overflow-hidden">
      <div className="p-3 border-b bg-muted/30 text-sm">
        {loading ? "Loading members…" : `${members.length} member(s)`}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Email</th>
            <th className="text-left p-3">Role</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.user_id} className="border-t">
              <td className="p-3">{m.full_name ?? "—"}</td>
              <td className="p-3">{m.email ?? "—"}</td>
              <td className="p-3">
                <select
                  className="border rounded px-2 py-1 bg-background"
                  value={m.role}
                  disabled={pending}
                  onChange={(e) => updateRole(m.user_id, e.target.value as Role)}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td className="p-3 text-right">
                <button
                  onClick={() => revoke(m.user_id)}
                  disabled={pending}
                  className="px-3 py-1 rounded border hover:bg-destructive/10"
                >
                  Revoke
                </button>
              </td>
            </tr>
          ))}
          {!loading && members.length === 0 && (
            <tr><td className="p-3 text-muted-foreground" colSpan={4}>No members yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
