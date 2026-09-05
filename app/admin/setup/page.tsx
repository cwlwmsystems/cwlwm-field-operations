"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminNav } from "@/components/admin/AdminNav";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseSales } from "@/lib/sales/SupabaseSalesProvider";
import { useSupabaseScheduling } from "@/lib/scheduling/SupabaseSchedulingProvider";
import { useSupabaseLifecycle } from "@/lib/lifecycle/SupabaseLifecycleProvider";
import { buildSetupReadiness } from "@/lib/admin/setupReadiness";

export default function SetupPage() {
  const config = useSupabaseConfig();
  const sales = useSupabaseSales();
  const scheduling = useSupabaseScheduling();
  const lifecycle = useSupabaseLifecycle();

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

  const unassignedProspects = config.locations.filter(
    (location) =>
      (location.serviceStatus ?? "prospect") === "prospect" &&
      !location.assignedRepId
  ).length;

  return (
    <AppShell>
      <div className="page-header setup-page-header">
        <div>
          <div className="eyebrow">Administration · Guided Setup</div>
          <h1>Setup Center</h1>
          <p className="muted">
            Configure a new organization in the correct order and see what is still needed before field operations begin.
          </p>
        </div>
        {readiness.nextStep && readiness.nextStep.status !== "blocked" && (
          <Link className="button" href={readiness.nextStep.href}>
            Next: {readiness.nextStep.title}
          </Link>
        )}
      </div>

      <AdminNav />

      <section className="setup-readiness-card card">
        <div className="setup-readiness-main">
          <div className="setup-score-ring" style={{ "--setup-progress": `${readiness.readiness * 3.6}deg` } as CSSProperties}>
            <div><strong>{readiness.readiness}%</strong><span>ready</span></div>
          </div>
          <div>
            <div className="eyebrow">Workspace Readiness</div>
            <h2>{readiness.operationalReady ? "Core field setup is operational" : "Finish the core setup checklist"}</h2>
            <p>
              {readiness.complete} of {readiness.steps.length} configuration areas are ready.
              {readiness.blocked ? ` ${readiness.blocked} step${readiness.blocked === 1 ? " is" : "s are"} waiting on prerequisites.` : ""}
            </p>
          </div>
        </div>
        <div className={`setup-health-badge ${readiness.operationalReady ? "ready" : "building"}`}>
          <span className="setup-health-dot" />
          {readiness.operationalReady ? "Operationally ready" : "Setup in progress"}
        </div>
      </section>

      <div className="grid setup-summary-grid">
        <div className="card"><div className="eyebrow">Locations</div><div className="metric">{config.locations.length.toLocaleString()}</div><small>Full footprint loaded</small></div>
        <div className="card"><div className="eyebrow">Active reps</div><div className="metric">{config.reps.filter((rep) => rep.status === "active").length}</div><small>Field representatives</small></div>
        <div className="card"><div className="eyebrow">Unassigned prospects</div><div className="metric">{unassignedProspects.toLocaleString()}</div><small>Available workload</small></div>
        <div className="card"><div className="eyebrow">Location assignment</div><div className="metric">{Math.round(readiness.assignmentCoverage * 100)}%</div><small>All locations assigned to a rep</small></div>
      </div>

      <section className="setup-step-list">
        {readiness.steps.map((step) => (
          <article className={`card setup-step setup-${step.status}`} key={step.id}>
            <div className="setup-step-number">{step.order}</div>
            <div className="setup-step-copy">
              <div className="setup-step-title-row">
                <h2>{step.title}</h2>
                <span className={`setup-status-pill ${step.status}`}>
                  {step.status === "complete" ? "Complete" : step.status === "blocked" ? "Waiting" : "Action needed"}
                </span>
              </div>
              <p>{step.description}</p>
              <small>{step.note}</small>
            </div>
            <div className="setup-step-actions">
              {typeof step.count === "number" && <strong className="setup-step-count">{step.count.toLocaleString()}</strong>}
              <Link
                href={step.href}
                className={step.status === "complete" ? "button secondary" : "button"}
                aria-disabled={step.status === "blocked"}
              >
                {step.status === "complete" ? "Review" : step.actionLabel}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="card setup-launch-card">
        <div>
          <div className="eyebrow">Launch Check</div>
          <h2>{readiness.operationalReady ? "The core workspace can support field operations." : "Core setup is not complete yet."}</h2>
          <p className="muted">
            Advanced items such as scheduling, products/offers, lifecycle integrations, finance, and reporting can continue to be refined after the core operating structure is ready.
          </p>
        </div>
        <div className="setup-launch-actions">
          <Link className="button secondary" href="/territories">Review territories</Link>
          <Link className="button secondary" href="/field">Open field workspace</Link>
          <Link className="button secondary" href="/connection">System connection</Link>
        </div>
      </section>
    </AppShell>
  );
}
