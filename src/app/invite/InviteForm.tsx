// src/app/invite/InviteForm.tsx
"use client";

import { useState } from "react";
import { inviteUser } from "./actions";

export type TenantOption = {
  id: string;
  name: string;
};

type Props = {
  tenants: TenantOption[];
  defaultTenantId: string;
};

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "crew_leader", label: "Crew Leader" },
  { value: "crew", label: "Crew" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "viewer", label: "Viewer" },
];

export default function InviteForm({ tenants, defaultTenantId }: Props) {
  const [dirty, setDirty] = useState(false);

  const baseBtn =
    "rounded-xl border px-4 py-2 text-sm font-medium transition-colors";
  const activeBtn =
    "border-indigo-500 bg-indigo-600 text-white shadow-sm hover:bg-indigo-500";
  const inactiveBtn =
    "border-zinc-700 bg-zinc-900 text-zinc-400 opacity-70 cursor-default";

  const onChange = () => {
    if (!dirty) setDirty(true);
  };

  return (
    <form action={inviteUser} className="space-y-4">
      {/* Sticky bar */}
      <div className="sticky top-16 z-30 flex justify-end pb-2">
        <button
          type="submit"
          disabled={!dirty}
          className={`${baseBtn} ${dirty ? activeBtn : inactiveBtn}`}
        >
          Send Invite
        </button>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="space-y-1">
          <label
            htmlFor="tenant_id"
            className="text-xs font-medium text-zinc-300"
          >
            Tenant
          </label>
          <select
            id="tenant_id"
            name="tenant_id"
            defaultValue={defaultTenantId}
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-xs font-medium text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="user@example.com"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="full_name"
            className="text-xs font-medium text-zinc-300"
          >
            Full name (optional)
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Jane Doe"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="role"
            className="text-xs font-medium text-zinc-300"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="viewer"
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}
