// src/app/tenant/users/UserManagementForm.tsx
"use client";

import { useState } from "react";
import { updateTenantUserRoles } from "./actions";

export type TenantUserRow = {
  userId: string;
  fullName: string;
  email: string | null;
  role: string;
};

type Props = {
  tenantId: string;
  users: TenantUserRow[];
};

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "crew_leader", label: "Crew Leader" },
  { value: "crew", label: "Crew" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "viewer", label: "Viewer" },
];

export default function UserManagementForm({ tenantId, users }: Props) {
  const [dirty, setDirty] = useState(false);

  const baseBtn =
    "rounded-xl border px-4 py-2 text-sm font-medium transition-colors";
  const activeBtn =
    "border-indigo-500 bg-indigo-600 text-white shadow-sm hover:bg-indigo-500";
  const inactiveBtn =
    "border-zinc-700 bg-zinc-900 text-zinc-400 opacity-70 cursor-default";

  return (
    <form action={updateTenantUserRoles} className="space-y-4">
      <input type="hidden" name="tenant_id" value={tenantId} />

      {/* Sticky save bar */}
      <div className="sticky top-16 z-30 flex justify-end">
        <button
          type="submit"
          disabled={!dirty}
          className={`${baseBtn} ${dirty ? activeBtn : inactiveBtn}`}
        >
          Save Changes
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Role
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const fieldName = `role__${u.userId}`;
              return (
                <tr
                  key={u.userId}
                  className="border-t border-zinc-900 hover:bg-zinc-900/40"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-zinc-100">
                      {u.fullName || "Unnamed User"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {u.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      name={fieldName}
                      defaultValue={u.role}
                      onChange={() => setDirty(true)}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
