// src/config/modules.ts
export type ModuleCategory =
  | "public_works"
  | "utilities"
  | "compliance"
  | "finance"
  | "planning"
  | "community"
  | "admin"
  | "other";

export type ModuleKey =
  | "work_orders"
  | "water_system"
  | "wastewater_system"
  | "stormwater_system"
  | "streets"
  | "fleet"
  | "budget_tracker"
  | "facilities"
  | "electric_system"
  | "solid_waste"
  | "sampling_compliance"
  | "dmr_reporting"
  | "mft_tracker"
  | "grant_management"
  | "capital_projects"
  | "asset_inventory"
  | "asset_management"
  | "resident_requests"
  | "permits"
  | "code_enforcement"
  | "cemetery"
  | "parks"
  | "marina"
  | "time_cards"
  | "sidewalks"
  | "searchable_documents"
  | "safety"
  | "staffing"
  | "dashboards";

export const MODULE_DEFINITIONS: Record<
  ModuleKey,
  { label: string; description?: string; category: ModuleCategory }
> = {
  work_orders: {
    label: "Work Orders",
    description: "Manage maintenance and repair tasks across departments.",
    category: "public_works",
  },
  water_system: {
    label: "Water System",
    description: "Monitor wells, pumps, and water infrastructure.",
    category: "utilities",
  },
  wastewater_system: {
    label: "Wastewater System",
    description: "Track plant operations, lift stations, and DMR reporting.",
    category: "utilities",
  },
  stormwater_system: {
    label: "Stormwater System",
    description: "Inspect and maintain storm drains and retention areas.",
    category: "utilities",
  },
  streets: {
    label: "Streets",
    description: "Street repairs, signage, and seasonal operations.",
    category: "public_works",
  },
  fleet: {
    label: "Fleet Management",
    description: "Track and schedule maintenance for vehicles and equipment.",
    category: "public_works",
  },
  budget_tracker: {
    label: "Budget Tracker",
    description: "Monitor expenses and funding across departments.",
    category: "finance",
  },
  facilities: {
    label: "Facilities",
    description: "Manage municipal buildings, maintenance, and inspections.",
    category: "planning",
  },
  electric_system: {
    label: "Electric System",
    description: "Track electrical grid assets and maintenance records.",
    category: "utilities",
  },
  solid_waste: {
    label: "Solid Waste",
    description: "Track garbage collection and landfill operations.",
    category: "utilities",
  },
  sampling_compliance: {
    label: "Sampling & Compliance",
    description: "Record water and wastewater sampling data.",
    category: "compliance",
  },
  dmr_reporting: {
    label: "DMR Reporting",
    description: "Submit and review Discharge Monitoring Reports.",
    category: "compliance",
  },
  mft_tracker: {
    label: "MFT Tracker",
    description: "Track Motor Fuel Tax projects and expenditures.",
    category: "finance",
  },
  grant_management: {
    label: "Grant Management",
    description: "Track grant applications, deadlines, and funds.",
    category: "finance",
  },
  capital_projects: {
    label: "Capital Projects",
    description: "Track progress, budgets, and documentation for projects.",
    category: "planning",
  },
  asset_inventory: {
    label: "Asset Inventory",
    description: "Catalog and locate all municipal assets.",
    category: "planning",
  },
  asset_management: {
    label: "Asset Management",
    description: "Track condition, depreciation, and replacement schedules.",
    category: "planning",
  },
  resident_requests: {
    label: "Resident Requests",
    description: "Handle requests and complaints from residents.",
    category: "community",
  },
  permits: {
    label: "Permits",
    description: "Track issued and pending building or utility permits.",
    category: "community",
  },
  code_enforcement: {
    label: "Code Enforcement",
    description: "Document violations and enforcement actions.",
    category: "community",
  },
  cemetery: {
    label: "Cemetery Management",
    description: "Maintain plot records and work orders for cemetery grounds.",
    category: "community",
  },
  parks: {
    label: "Parks",
    description: "Manage park facilities, maintenance, and events.",
    category: "community",
  },
  marina: {
    label: "Marina",
    description: "Track slip rentals, maintenance, and seasonal use.",
    category: "community",
  },
  time_cards: {
    label: "Time Cards",
    description: "Track employee hours and assignments.",
    category: "admin",
  },
  sidewalks: {
    label: "Sidewalks",
    description: "Monitor sidewalk repair, replacement, and accessibility.",
    category: "public_works",
  },
  searchable_documents: {
    label: "Searchable Documents",
    description: "Central repository for indexed and searchable records.",
    category: "admin",
  },
  safety: {
    label: "Safety",
    description: "Record safety inspections, training, and incidents.",
    category: "admin",
  },
  staffing: {
    label: "Staffing",
    description: "Manage personnel assignments and contact info.",
    category: "admin",
  },
  dashboards: {
    label: "Dashboards",
    description: "Cross-department analytics and visualization hub.",
    category: "admin",
  },
};

export const MODULE_ROUTES: Record<ModuleKey, string> = Object.keys(
  MODULE_DEFINITIONS
).reduce((acc, key) => {
  acc[key as ModuleKey] = `/tenant/modules/${key}`;
  return acc;
}, {} as Record<ModuleKey, string>);

export function isModuleKey(value: string): value is ModuleKey {
  return value in MODULE_DEFINITIONS;
}
