"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";

export default function TerritoriesPage() {
  const { territories, markets, teams, reps, locations, loading, error } = useSupabaseConfig();

  return <AppShell>
    <div className="page-header">
      <div>
        <div className="eyebrow">Territory Operations · Supabase</div>
        <h1>Territories</h1>
        <p className="muted">Live territory configuration and field coverage from Supabase.</p>
      </div>
    </div>

    {error && <div className="error-banner"><strong>Territory load failed</strong><span>{error}</span></div>}

    <div className="card table-card">
      {loading ? <div className="empty-state">Loading territories…</div> :
      <table>
        <thead><tr><th>Territory</th><th>Market</th><th>Team</th><th>Reps</th><th>Locations</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {territories.map((territory) => {
            const territoryReps = reps.filter((r) => r.territoryIds.includes(territory.id));
            return <tr key={territory.id}>
              <td><strong>{territory.name}</strong><div className="muted small">{territory.description || "No description"}</div></td>
              <td>{markets.find((m) => m.id === territory.marketId)?.name ?? territory.market ?? "—"}</td>
              <td>{teams.find((t) => t.id === territory.teamId)?.name ?? "Unassigned"}</td>
              <td>{territoryReps.length}</td>
              <td>{locations.filter((l) => l.territoryId === territory.id).length}</td>
              <td><span className="badge">{territory.status}</span></td>
              <td><Link className="text-link" href={`/territories/${territory.id}`}>Open</Link></td>
            </tr>;
          })}
        </tbody>
      </table>}
    </div>
  </AppShell>;
}
