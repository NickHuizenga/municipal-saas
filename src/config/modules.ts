// src/config/modules.ts

export type ModuleCategory =
  | "public_works"
  | "utilities"
  | "compliance"
  | "finance"
  | "planning"
  | "community"
  | "admin";

export type SubmoduleKey = string;

export type ModuleDefinition = {
  label: string;
  category: ModuleCategory;
  description?: string;
  submodules?: {
    key: SubmoduleKey;
    label: string;
    description?: string;
  }[];
};

export const MODULE_DEFINITIONS = {
  work_orders: {
    label: "Work Orders",
    category: "public_works",
    description: "General work orders and maintenance tasks.",
    submodules: [
      { key: "water_distribution", label: "Water Distribution" },
      { key: "wastewater_collection", label: "Wastewater Collection" },
      { key: "streets_surface", label: "Street Surface" },
      { key: "facilities_maintenance", label: "Facilities Maintenance" },
      { key: "parks_maintenance", label: "Parks Maintenance" },
    ],
  },
  water_system: {
    label: "Water System",
    category: "utilities",
    description: "Wells, towers, distribution, and service lines.",
    submodules: [
      { key: "source_wells", label: "Source Wells" },
      { key: "storage_tanks", label: "Storage Tanks & Towers" },
      { key: "distribution_valves", label: "Distribution Valves" },
      { key: "hydrants", label: "Hydrants" },
      { key: "service_lines", label: "Service Lines" },
    ],
  },
  wastewater_system: {
    label: "Wastewater System",
    category: "utilities",
    description: "Collection system, lift stations, and treatment.",
  },
  stormwater: {
    label: "Stormwater",
    category: "public_works",
    description: "Ditches, culverts, intakes, and storm conveyance.",
  },
  streets: {
    label: "Streets & Sidewalks",
    category: "public_works",
    description: "Street surfaces, alleys, sidewalks.",
  },
  fleet: {
    label: "Fleet & Equipment",
    category: "public_works",
    description: "Vehicles and heavy equipment.",
  },
  facilities: {
    label: "Buildings & Facilities",
    category: "public_works",
    description: "Village hall, PW shop, and public buildings.",
  },
  electric_utility: {
    label: "Electric Utility",
    category: "utilities",
    description: "Local electric distribution system.",
  },
  gas_utility: {
    label: "Natural Gas Utility",
    category: "utilities",
    description: "Municipal natural gas utility (where applicable).",
  },
  solid_waste: {
    label: "Solid Waste & Recycling",
    category: "utilities",
    description: "Garbage, recycling, and yard waste.",
  },
  sampling_compliance: {
    label: "Sampling & Compliance",
    category: "compliance",
    description: "Water & wastewater sampling schedules and results.",
  },
  dmr_reporting: {
    label: "DMR & IEPA Reporting",
    category: "compliance",
    description: "Discharge Monitoring Reports and regulatory filings.",
  },
  mft_tracker: {
    label: "MFT Tracker",
    category: "finance",
    description: "Motor Fuel Tax projects and expenditures.",
  },
  grants: {
    label: "Grants & Funding",
    category: "finance",
    description: "Grant applications, awards, and reporting.",
  },
  capital_projects: {
    label: "Capital Projects",
    category: "planning",
    description: "Large multi-year infrastructure projects.",
  },
  asset_inventory: {
    label: "Asset & Inventory",
    category: "planning",
    description: "Inventory of critical infrastructure and parts.",
  },
  citizen_requests: {
    label: "Citizen Requests / 311",
    category: "community",
    description: "Resident-submitted service requests.",
  },
  permits: {
    label: "Permits & Inspections",
    category: "community",
    description: "ROW permits, utility taps, and inspections.",
  },
  code_enforcement: {
    label: "Code Enforcement",
    category: "community",
    description: "Nuisance, weed, and property maintenance violations.",
  },
  cemetery: {
    label: "Cemetery Management",
    category: "community",
    description: "Plots, burials, and cemetery maintenance.",
  },
  parks_rec: {
    label: "Parks & Recreation",
    category: "community",
    description: "Parks, trails, and recreation programs.",
  },
  documents: {
    label: "Documents & Policies",
    category: "admin",
    description: "Internal documents, SOPs, and policies.",
  },
  safety_training: {
    label: "Safety & Training",
    category: "admin",
    description: "Training records and safety meetings.",
  },
  staffing: {
    label: "Staffing & Schedules",
    category: "admin",
    description: "Schedules, on-call rotations, and staffing.",
  },
  dashboards: {
    label: "Dashboards & Analytics",
    category: "admin",
    description: "Cross-module analytics and summary dashboards.",
  },
} as const;

export type ModuleKey = keyof typeof MODULE_DEFINITIONS;

// Type guard so we can safely narrow a string into ModuleKey
export function isModuleKey(value: string): value is ModuleKey {
  return Object.prototype.hasOwnProperty.call(MODULE_DEFINITIONS, value);
}

/**
 * Route mapping for each module key.
 * You can change these paths later; this just centralizes them.
 */
export const MODULE_ROUTES: Partial<Record<ModuleKey, string>> = {
  work_orders: "/modules/work-orders",
  water_system: "/modules/water-system",
  wastewater_system: "/modules/wastewater-system",
  stormwater: "/modules/stormwater",
  streets: "/modules/streets",
  fleet: "/modules/fleet",
  facilities: "/modules/facilities",
  electric_utility: "/modules/electric-utility",
  gas_utility: "/modules/gas-utility",
  solid_waste: "/modules/solid-waste",

  sampling_compliance: "/modules/sampling-compliance",
  dmr_reporting: "/modules/dmr-reporting",
  mft_tracker: "/modules/mft-tracker",
  grants: "/modules/grants",

  capital_projects: "/modules/capital-projects",
  asset_inventory: "/modules/asset-inventory",

  citizen_requests: "/modules/citizen-requests",
  permits: "/modules/permits",
  code_enforcement: "/modules/code-enforcement",
  cemetery: "/modules/cemetery",
  parks_rec: "/modules/parks-rec",

  documents: "/modules/documents",
  safety_training: "/modules/safety-training",
  staffing: "/modules/staffing",
  dashboards: "/modules/dashboards",
};
