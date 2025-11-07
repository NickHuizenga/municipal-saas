"use client";

import { useState } from "react";
import type { ModuleGroup } from "./page";
import { updateTenantModules } from "./actions";

type Props = {
  tenantId: string;
  groups: ModuleGroup[];
};

export default function ModuleSettingsForm({ tenantId, groups }: Props) {
  const [dirty, setDirty] = useState(false);

  const baseBtn =
    "rounded-xl border px-4 py-2 text-sm font-medium transition-colors";
  const activeBtn =
    "border-indigo-500 bg-indigo-600 text-white shadow-sm hover:bg-indigo-500";
  const inactiveBtn =
    "border-zinc-700 bg-zinc-900 text-zinc-400 opacity-70 cursor-default";

  return (
    <form action={updateTenantModules} className="space-y-6">
      <input type="hidden" name="tenant_id" value={tenantId} />

      {/* Sticky save bar just under the header */}
      <div className="sticky top-16 z-30 flex justify-end">
        <button
          type="submit"
          disabled={!dirty}
          className={`${baseBtn} ${dirty ? activeBtn : inactiveBtn}`}
        >
          Save Module Settings
        </button>
      </div>

      {/* Categories + cards */}
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.categoryKey} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {group.label}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.modules.map((mod) => {
                const fieldName = `module__${mod.key}__enabled`;

                return (
                  <label
                    key={mod.key}
                    className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                      mod.enabled
                        ? "border-indigo-500/70 bg-zinc-900/80"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-100">
                            {mod.label}
                          </h3>
                          <p className="mt-1 text-[10px] font-mono uppercase text-zinc-500">
                            {mod.key}
                          </p>
                        </div>

                        {/* Toggle + live status text */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center gap-2">
                            <input
                              type="checkbox"
                              name={fieldName}
                              defaultChecked={mod.enabled}
                              className="peer sr-only"
                              onChange={() => setDirty(true)}
                            />
                            <span className="text-[10px] uppercase tracking-wide text-zinc-500 peer-checked:hidden">
                              Disabled
                            </span>
                            <span className="hidden text-[10px] uppercase tracking-wide text-indigo-400 peer-checked:inline">
                              Enabled
                            </span>
                            <div className="h-5 w-9 rounded-full bg-zinc-700 peer-checked:bg-indigo-500 transition-colors flex items-center">
                              <div className="h-4 w-4 rounded-full bg-zinc-950 shadow-sm translate-x-1 peer-checked:translate-x-4 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-zinc-400 leading-snug">
                        {mod.description ?? "—"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </form>
  );
}
