"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";

function pct(value:number,total:number){return total?`${Math.round((value/total)*100)}%`:"—";}

export default function TerritoriesPage() {
  const { territories, markets, teams, reps, locations, loading, error } = useSupabaseConfig();

  return <AppShell>
    <div className="page-header">
      <div>
        <div className="eyebrow">Territory Intelligence · Supabase</div>
        <h1>Territories</h1>
        <p className="muted">Coverage, customer penetration, eligible workload, and rep assignments across the full footprint.</p>
      </div>
    </div>

    {error && <div className="error-banner"><strong>Territory load failed</strong><span>{error}</span></div>}

    <div className="card table-card territory-intelligence-table">
      {loading ? <div className="empty-state">Loading territories…</div> :
      <table>
        <thead><tr><th>Territory</th><th>Team</th><th>Total</th><th>Prospects</th><th>Customers</th><th>Penetration</th><th>Unworked</th><th>Assigned</th><th></th></tr></thead>
        <tbody>
          {territories.map((territory) => {
            const territoryReps = reps.filter((r) => r.territoryIds.includes(territory.id));
            const rows = locations.filter((l) => l.territoryId === territory.id);
            const prospects = rows.filter((l)=>(l.serviceStatus??"prospect") === "prospect");
            const customers = rows.filter((l)=>l.serviceStatus === "current_customer");
            const serviceable = prospects.length + customers.length;
            const unworked = prospects.filter((l)=>l.disposition === "Unvisited").length;
            const assigned = prospects.filter((l)=>Boolean(l.assignedRepId)).length;
            return <tr key={territory.id}>
              <td><strong>{territory.name}</strong><div className="muted small">{markets.find((m) => m.id === territory.marketId)?.name ?? territory.market ?? "—"} · {territoryReps.length} rep{territoryReps.length===1?"":"s"}</div></td>
              <td>{teams.find((t) => t.id === territory.teamId)?.name ?? "Unassigned"}</td>
              <td>{rows.length.toLocaleString()}</td>
              <td><strong>{prospects.length.toLocaleString()}</strong></td>
              <td>{customers.length.toLocaleString()}</td>
              <td><span className="penetration-pill">{pct(customers.length,serviceable)}</span></td>
              <td>{unworked.toLocaleString()}</td>
              <td>{assigned.toLocaleString()} / {prospects.length.toLocaleString()}</td>
              <td><Link className="text-link" href={`/territories/${territory.id}`}>Manage</Link></td>
            </tr>;
          })}
        </tbody>
      </table>}
    </div>
  </AppShell>;
}
