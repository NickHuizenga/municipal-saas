// src/app/tenant/home/page.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  MODULES,
  type ModuleId,
  computeDailySummaryForUser,
} from "@/lib/modules";
import {
  computeEffectiveModulesForMember,
  type MemberModuleAccessRow,
  type TenantFeatureFlags,
} from "@/lib/access";

const TENANT_COOKIE_NAME =
  process.env.TENANT_COOKIE_NAME || "tenant_id";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TenantHomePage() {
  const supabase = getSupabaseServer();

  // 1) Auth
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) redirect("/login");
  const userId = user.id;

  // 2) Current tenant from cookie
  const tenantId = cookies().get(TENANT_COOKIE_NAME)?.value ?? null;
  if (!tenantId) {
    // No tenant selected yet → send to tenant selector
    redirect("/tenant/select");
  }

  // 3) Fetch tenant + features
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, features")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    console.error("TenantHomePage: tenant fetch error", tenantError);
    redirect("/tenant/select");
  }

  const tenantName: string = tenant.name ?? "Unnamed tenant";
  const tenantFeatures = (tenant.features ?? {}) as TenantFeatureFlags;

  // 4) Fetch member-level module access for this user in this tenant
  const { data: accessRows, error: accessError } = await supabase
    .from("member_module_access")
    .select("module, enabled")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (accessError) {
    console.error("TenantHomePage: member_module_access error", accessError);
  }

  const memberAccess: MemberModuleAccessRow[] = (accessRows ?? []).map(
    (row: any) => ({
      module: String(row.module),
      enabled: row.enabled,
    })
  );

  // 5) Compute effective modules for this member in this tenant
  const allModuleIds = Object.keys(MODULES) as ModuleId[];
  const effectiveModules = computeEffectiveModulesForMember(
    tenantFeatures,
    memberAccess,
    allModuleIds
  );

  // 6) Ask all those modules for a daily summary
  const todayIso = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const summaries = await computeDailySummaryForUser({
    supabase,
    tenantId,
    userId,
    date: todayIso,
    modules: effectiveModules,
  });

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">
            {tenantName}
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            Your dashboard for this municipality.
          </p>
        </div>
        <div className="text-xs text-[rgb(var(--muted-foreground))]">
          Tenant ID:{" "}
          <span className="font-mono">
            {String(tenantId).slice(0, 8)}…
          </span>
        </div>
      </header>

      {/* Layout: main module cards + daily summary on the right on large screens */}
      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        {/* Module cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[rgb(var(--muted-foreground))]">
            Modules you have access to
          </h2>

          {effectiveModules.length === 0 ? (
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-sm text-[rgb(var(--muted-foreground))]">
              You don&apos;t have any modules assigned yet for this tenant.
              Contact your admin if you think this is a mistake.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {effectiveModules.map((id) => {
                const def = MODULES[id];
                return (
                  <div
                    key={id}
                    className="flex flex-col justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm"
                  >
                    <div>
                      <div className="text-base font-medium text-[rgb(var(--card-foreground))]">
                        {def.label}
                      </div>
                      {def.description && (
                        <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                          {def.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[rgb(var(--muted-foreground))]">
                      <span>Enabled for you</span>
                      {/* Placeholder for future "Go to module" links,
                          e.g. /work-orders, /sampling, etc. */}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily summary card */}
        <aside className="space-y-3">
          <h2 className="text-sm font-medium text-[rgb(var(--muted-foreground))]">
            Daily Summary
          </h2>

          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-sm">
            {summaries.length === 0 ? (
              <p className="text-[rgb(var(--muted-foreground))]">
                No summary available yet. As modules (like DMR and Water
                Reports) add summary logic, you&apos;ll see a daily overview
                here.
              </p>
            ) : (
              <div className="space-y-3">
                {summaries.map((s) => {
                  const def = MODULES[s.module];
                  return (
                    <div key={s.module}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-[rgb(var(--card-foreground))]">
                          {s.title || def.label}
                        </div>
                        {typeof s.alerts === "number" && s.alerts > 0 && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-red-500">
                            {s.alerts} alert{s.alerts === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                      <ul className="mt-1 list-disc pl-4 text-xs text-[rgb(var(--muted-foreground))]">
                        {s.lines.map((line, idx) => (
                          <li key={idx}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
