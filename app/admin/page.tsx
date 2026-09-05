"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseLifecycle } from "@/lib/lifecycle/SupabaseLifecycleProvider";
import { useSupabaseFinance } from "@/lib/finance/SupabaseFinanceProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { buildSetupReadiness } from "@/lib/admin/setupReadiness";

export default function AdminPage() {
  const config = useSupabaseConfig();
  const lifecycle = useSupabaseLifecycle();
  const finance = useSupabaseFinance();
  const sales = useSupabaseSales();
  const scheduling = useSupabaseScheduling();

  const readiness = buildSetupReadiness({
    organization: config.organization,
    teams: config.teams,
    markets: config.markets,
    territories: config.territories,
    reps: config.reps,
    dispositions: config.dispositions,
    locations: config.locations,
    products: sales.products,
    offers: sales.offers,
    policies: scheduling.policies,
    lifecycleStages: lifecycle.stages,
  });

  const cards = [
    ["Teams", config.teams.length, "/admin/teams"],
    ["Markets", config.markets.length, "/admin/markets"],
    ["Territories", config.territories.length, "/admin/territories"],
    ["Representatives", config.reps.length, "/admin/representatives"],
    ["Dispositions", config.dispositions.length, "/admin/dispositions"],
    ["Locations", config.locations.length, "/admin/locations"],
    ["Lifecycle stages", lifecycle.stages.length, "/admin/lifecycle"],
    ["Invoice batches", finance.batches.length, "/finance"],
  ] as const;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Administration · Supabase</div>
          <h1>Configuration</h1>
          <p className="muted">Manage organization settings, operating structure, field rules, and production configuration.</p>
        </div>
        <Link className="button" href="/admin/setup">Open Setup Center</Link>
      </div>

      <AdminNav />

      <section className="card admin-readiness-banner">
        <div>
          <div className="eyebrow">Configuration Readiness</div>
          <h2>{readiness.readiness}% complete</h2>
          <p>
            {readiness.complete} of {readiness.steps.length} setup areas are ready.
            {readiness.nextStep ? ` Next recommended step: ${readiness.nextStep.title}.` : " The setup checklist is complete."}
          </p>
        </div>
        <div className="admin-readiness-actions">
          <div className="admin-progress-track"><span style={{ width: `${readiness.readiness}%` }} /></div>
          <Link className="text-link" href="/admin/setup">View guided checklist →</Link>
        </div>
      </section>

      <div className="grid admin-metric-grid">
        {cards.map(([label, count, href]) => (
          <Link href={href} className="card admin-stat" key={label}>
            <div className="eyebrow">{label}</div>
            <div className="metric">{count.toLocaleString()}</div>
            <span className="text-link">Manage →</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
