// src/lib/modules.ts

// All known module IDs in your app.
// These should match:
//  - keys in tenants.features
//  - values in member_module_access.module
export type ModuleId =
  | "work_orders"
  | "sampling"
  | "mft"
  | "dmr"
  | "water_reports"
  | "grants";

export interface ModuleSummaryContext {
  supabase: any;        // server-side Supabase client (we pass it from pages)
  tenantId: string;
  userId: string;
  date: string;         // e.g. "2025-11-05"
}

export interface ModuleSummary {
  module: ModuleId;
  title: string;
  // Short lines you can show in a card: e.g. "3 open work orders"
  lines: string[];
  // Optional count of alerts/issues/etc.
  alerts?: number;
}

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  description?: string;
  // Later: icon, color, etc.
  // Optional summary function: if present, this module can "inform" the dashboard.
  summary?: (ctx: ModuleSummaryContext) => Promise<ModuleSummary | null>;
}

/* ---------- Placeholder per-module summary functions ---------- */
/* These are stubs for now; later each module can implement real logic. */

// Example: DMR module informs the dashboard
async function summarizeDmr(
  ctx: ModuleSummaryContext
): Promise<ModuleSummary | null> {
  const { tenantId, userId, date } = ctx;

  // TODO: Replace with real DMR queries (e.g. dmr_reports table).
  return {
    module: "dmr",
    title: "DMR Snapshot",
    lines: [
      `Tenant ${tenantId.slice(0, 8)} · User ${userId.slice(0, 8)}`,
      `Date: ${date}`,
      "TODO: implement real DMR summary here.",
    ],
    alerts: 0,
  };
}

// Example: Water Reports module informs the dashboard
async function summarizeWaterReports(
  ctx: ModuleSummaryContext
): Promise<ModuleSummary | null> {
  const { tenantId, userId, date } = ctx;

  // TODO: Replace with real water report queries.
  return {
    module: "water_reports",
    title: "Water Reports Overview",
    lines: [
      `Tenant ${tenantId.slice(0, 8)} · User ${userId.slice(0, 8)}`,
      `Date: ${date}`,
      "TODO: implement real Water Reports summary here.",
    ],
    alerts: 0,
  };
}

/* ---------- Module registry ---------- */

export const MODULES: Record<ModuleId, ModuleDefinition> = {
  work_orders: {
    id: "work_orders",
    label: "Work Orders",
    description: "Track and manage field work orders.",
    // summary: async (ctx) => { ... } // you can add later
  },
  sampling: {
    id: "sampling",
    label: "Sampling & Compliance",
    description: "Sampling schedules, results, and compliance status.",
  },
  mft: {
    id: "mft",
    label: "MFT Tracker",
    description: "Track hauled waste manifests.",
  },
  dmr: {
    id: "dmr",
    label: "DMR Reports",
    description: "Discharge Monitoring Reports.",
    summary: summarizeDmr,
  },
  water_reports: {
    id: "water_reports",
    label: "Water Reports",
    description: "Consumer confidence reports, water quality summaries, etc.",
    summary: summarizeWaterReports,
  },
  grants: {
    id: "grants",
    label: "Grants & Funding",
    description: "Grant tracking and funding opportunities.",
  },
};

/* ---------- Daily summary engine ---------- */

/**
 * Ask each enabled module for a summary for this user.
 * This is the hook that lets ANY module "inform" the dashboard.
 */
export async function computeDailySummaryForUser(args: {
  supabase: any;
  tenantId: string;
  userId: string;
  date: string;
  modules: ModuleId[];
}): Promise<ModuleSummary[]> {
  const { supabase, tenantId, userId, date, modules } = args;

  const ctx: ModuleSummaryContext = { supabase, tenantId, userId, date };

  const summaries = await Promise.all(
    modules.map(async (id) => {
      const def = MODULES[id];
      if (!def?.summary) return null;
      try {
        return await def.summary(ctx);
      } catch (err) {
        console.error(`Error computing summary for module ${id}:`, err);
        return null;
      }
    })
  );

  return summaries.filter((x): x is ModuleSummary => !!x);
}
