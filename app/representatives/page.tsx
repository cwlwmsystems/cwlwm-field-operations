"use client";

import { AppShell } from "@/components/AppShell";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";

export default function RepresentativesPage() {
  const { reps, teams, territories, loading, error } = useSupabaseConfig();
  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Territory Operations · Supabase</div><h1>Representatives</h1><p className="muted">Live team and territory assignments.</p></div></div>
    {error && <div className="error-banner"><strong>Representative load failed</strong><span>{error}</span></div>}
    <div className="card table-card">
      {loading ? <div className="empty-state">Loading representatives…</div> :
      <table><thead><tr><th>Name</th><th>Team</th><th>Territories</th><th>Status</th></tr></thead><tbody>
        {reps.map((rep)=><tr key={rep.id}>
          <td><strong>{rep.name}</strong><div className="muted small">{rep.email}</div></td>
          <td>{teams.find((t)=>t.id===rep.teamId)?.name ?? "Unassigned"}</td>
          <td>{rep.territoryIds.map((id)=>territories.find((t)=>t.id===id)?.name).filter(Boolean).join(", ") || "None"}</td>
          <td><span className="badge">{rep.status}</span></td>
        </tr>)}
      </tbody></table>}
    </div>
  </AppShell>;
}
