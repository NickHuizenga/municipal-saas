// src/lib/access.ts
import type { ModuleId } from "./modules";

export type TenantFeatureFlags = {
  [key: string]: boolean | null | undefined;
};

export type MemberModuleAccessRow = {
  module: string;
  enabled: boolean | null;
};

/**
 * Given:
 *  - tenantFeatures: which modules are ON at tenant level (tenants.features)
 *  - memberAccess: rows from member_module_access for this tenant+user
 *
 * Returns:
 *  - final list of ModuleIds the member should see.
 *
 * Rules:
 *  - Only modules that are enabled at tenant level are considered.
 *  - Per-member rows can flip a module on/off for that member.
 */
export function computeEffectiveModulesForMember(
  tenantFeatures: TenantFeatureFlags | null | undefined,
  memberAccess: MemberModuleAccessRow[],
  allModuleIds: ModuleId[]
): ModuleId[] {
  const tenantEnabled = new Set<string>();

  // Start with tenant-level modules that are true.
  if (tenantFeatures) {
    for (const [key, value] of Object.entries(tenantFeatures)) {
      if (value) {
        tenantEnabled.add(key);
      }
    }
  }

  // Apply per-member overrides (only for modules that exist at tenant level).
  for (const row of memberAccess) {
    const mod = row.module;
    if (!tenantEnabled.has(mod)) continue; // ignore modules tenant doesn't have

    if (row.enabled === true) {
      tenantEnabled.add(mod);
    } else if (row.enabled === false) {
      tenantEnabled.delete(mod);
    }
  }

  // Filter down to known ModuleIds so we don't get random junk.
  return allModuleIds.filter((id) => tenantEnabled.has(id));
}
