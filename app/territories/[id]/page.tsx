"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";

export default function TerritoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { territories, markets, teams, reps, locations, loading } = useSupabaseConfig();
  const territory = territories.find((row) => row.id === id);

  if (loading) return <AppShell><div className="card">Loading territory…</div></AppShell>;
  if (!territory) return <AppShell><div className="card"><h1>Territory not found</h1><Link href="/territories">Return</Link></div></AppShell>;

  const territoryReps = reps.filter((rep) => rep.territoryIds.includes(territory.id));
  const territoryLocations = locations.filter((location) => location.territoryId === territory.id);

  return <AppShell>
    <div className="breadcrumbs"><Link href="/territories">Territories</Link><span>/</span>{territory.name}</div>
    <div className="page-header">
      <div>
        <div className="eyebrow">Territory Operations · Supabase</div>
        <h1>{territory.name}</h1>
        <p className="muted">{territory.description || "Live territory data from Supabase."}</p>
      </div>
      <span className="badge">{territory.status}</span>
    </div>

    <div className="grid location-summary-grid">
      <div className="card"><div className="eyebrow">Market</div><div className="metric-small">{markets.find((m)=>m.id===territory.marketId)?.name ?? territory.market ?? "—"}</div></div>
      <div className="card"><div className="eyebrow">Primary team</div><div className="metric-small">{teams.find((t)=>t.id===territory.teamId)?.name ?? "Unassigned"}</div></div>
      <div className="card"><div className="eyebrow">Representatives</div><div className="metric-small">{territoryReps.length}</div></div>
      <div className="card"><div className="eyebrow">Locations</div><div className="metric-small">{territoryLocations.length}</div></div>
    </div>

    <div className="grid two-column section-block">
      <section className="card">
        <div className="eyebrow">Assigned Representatives</div><h2>Field team</h2>
        {territoryReps.length === 0 ? <div className="empty-state">No representatives assigned.</div> :
        <div className="stack-list">{territoryReps.map((rep)=><div key={rep.id}><strong>{rep.name}</strong><span className="muted small">{rep.email || "No email"}</span></div>)}</div>}
      </section>

      <section className="card table-card">
        <div className="eyebrow">Locations</div><h2>Operational list</h2>
        {territoryLocations.length === 0 ? <div className="empty-state">No locations assigned.</div> :
        <table><thead><tr><th>Address</th><th>Rep</th><th>Disposition</th><th></th></tr></thead><tbody>
          {territoryLocations.map((location)=><tr key={location.id}>
            <td><strong>{location.address}</strong><div className="muted small">{location.city}, {location.state} {location.postalCode}</div></td>
            <td>{reps.find((r)=>r.id===location.assignedRepId)?.name ?? "Unassigned"}</td>
            <td>{location.disposition}</td>
            <td><Link className="text-link" href={`/locations/${location.id}`}>Open</Link></td>
          </tr>)}
        </tbody></table>}
      </section>
    </div>
  </AppShell>;
}
