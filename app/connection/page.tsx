"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ConnectionPage() {
  const { user, membership, organization, membershipError, operationalDataMode, refreshOrganizationContext } = useAuth();

  return <AppShell>
    <div className="page-header">
      <div>
        <div className="eyebrow">v1.0 Integration Verification</div>
        <h1>Supabase Connection</h1>
        <p className="muted">
          Authentication, organization context, Admin configuration, and Territory Operations are live in Supabase. Sales and downstream transaction modules still use the local store during Phase 3.
        </p>
      </div>
      <button className="button secondary" onClick={() => refreshOrganizationContext()}>Recheck membership</button>
    </div>

    {membershipError ? <div className="error-banner">
      <strong>Organization context failed</strong>
      <span>{membershipError}</span>
    </div> : <div className="success-banner">
      <strong>Supabase authentication verified</strong>
      <span>Your account can read its organization through the installed RLS policies.</span>
    </div>}

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Authenticated user</div>
        <h2>{user?.email ?? "No user"}</h2>
        <div className="summary-list">
          <div><span>User ID</span><strong className="mono small">{user?.id ?? "—"}</strong></div>
          <div><span>Session</span><strong>{user ? "Authenticated" : "Missing"}</strong></div>
        </div>
      </section>

      <section className="card">
        <div className="eyebrow">Organization context</div>
        <h2>{organization?.name ?? "No organization"}</h2>
        <div className="summary-list">
          <div><span>Organization ID</span><strong className="mono small">{organization?.id ?? "—"}</strong></div>
          <div><span>Role</span><strong>{membership?.role?.replaceAll("_", " ") ?? "—"}</strong></div>
          <div><span>Status</span><strong>{organization?.status ?? "—"}</strong></div>
          <div><span>Timezone</span><strong>{organization?.timezone ?? "—"}</strong></div>
        </div>
      </section>
    </div>

    <section className="card section-block">
      <div className="eyebrow">Current data mode</div>
      <h2>{operationalDataMode === "mock" ? "Mock operational data + real Supabase auth" : "Supabase operational data"}</h2>
      <p className="muted">
        Phase 3 also writes location interactions, current dispositions, follow-up data, and location rep assignment to Supabase. Sales, scheduling, lifecycle, finance, and reporting transactions remain local for now.
      </p>
      <Link className="button" href="/dashboard">Continue to dashboard</Link>
    </section>
  </AppShell>;
}
