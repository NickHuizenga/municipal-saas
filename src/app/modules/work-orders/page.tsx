// src/app/modules/work-orders/page.tsx
import Header from "@/components/header";
import { requireModuleAccess } from "@/lib/tenantContext";
import { MODULE_DEFINITIONS } from "@/config/modules";

export const revalidate = 0;

export default async function WorkOrdersModulePage() {
  // This will redirect to /tenant/home if user cannot access 'work_orders'
  const ctx = await requireModuleAccess("work_orders");

  const def = MODULE_DEFINITIONS.work_orders;
  const { tenantName } = ctx;

  return (
    <>
      <Header />
      <main className="p-6 space-y-6">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold">{def.label}</h1>
          <p className="text-sm text-zinc-400">
            Tenant:{" "}
            <span className="font-medium text-zinc-200">
              {tenantName}
            </span>
          </p>
          {def.description && (
            <p className="text-xs text-zinc-500">{def.description}</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-xs text-zinc-400">
            This is the placeholder for the <span className="font-mono">work_orders</span> module.
            Here we&apos;ll wire in:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-400">
            <li>Work order list & filters</li>
            <li>New work order form</li>
            <li>Per-role actions (dispatcher, crew, viewer, etc.)</li>
            <li>Integration with your existing work order logic</li>
          </ul>
        </section>
      </main>
    </>
  );
}
