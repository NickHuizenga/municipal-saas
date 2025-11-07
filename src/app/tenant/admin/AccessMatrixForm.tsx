"use client";

import { useState } from "react";
import { updateUserModuleAccess } from "./actions";

export type AdminMemberRow = {
  userId: string;
  role: string;
  fullName: string;
  email: string;
};

export type AdminModuleColumn = {
  key: string;
  label: string;
};

type Props = {
  tenantId: string;
  members: AdminMemberRow[];
  modules: AdminModuleColumn[];
  accessDefaults: Record<string, boolean>; // key: `${userId}__${moduleKey}`
};

export default function AccessMatrixForm({
  tenantId,
  members,
  modules,
  accessDefaults,
}: Props) {
  const [dirty, setDirty] = useState(false);

  const baseBtn =
    "rounded-xl border px-4 py-2 text-sm font-medium transition-colors";
  const activeBtn =
    "border-indigo-500 bg-indigo-600 text-white shadow-sm hover:bg-indigo-500";
  const inactiveBtn =
    "border-zinc-700 bg-zinc-900 text-zinc-400 opacity-70 cursor-default";

  const handleChange = () => {
    setDirty(true);
  };

  return (
    <form action={updateUserModuleAccess} className="space-y-4">
      <input type="hidden" name="tenant_id" value={tenantId} />

      {/* Sticky save bar just under the header */}
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
                Role
              </th>
              {modules.map((module) => (
                <th
                  key={module.key}
                  className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400"
                >
                  {module.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.userId}
                className="border-t border-zinc-900 hover:bg-zinc-900/40"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-100">
                      {member.fullName}
                    </span>
                    {member.email && (
                      <span className="text-xs text-zinc-500">
                        {member.email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-300">
                  {member.role}
                </td>
                {modules.map((module) => {
                  const key = `${member.userId}__${module.key}`;
                  const mapValue = accessDefaults[key];
                  // Default: if no override row, treat as enabled
                  const enabled =
                    mapValue !== undefined ? mapValue : true;
                  const fieldName = `access__${member.userId}__${module.key}`;

                  return (
                    <td
                      key={module.key}
                      className="px-3 py-3 text-center align-middle"
                    >
                      <select
                        name={fieldName}
                        defaultValue={enabled ? "enabled" : "disabled"}
                        onChange={handleChange}
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
