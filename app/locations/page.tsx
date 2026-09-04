"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";

export default function LocationsPage() {
  const { locations, territories, reps, loading, error } = useSupabaseConfig();

  return <AppShell>
    <div className="page-header"><div><div className="eyebrow">Territory Operations · Supabase</div><h1>Locations</h1><p className="muted">Live service locations and current field assignment.</p></div></div>
    {error && <div className="error-banner"><strong>Location load failed</strong><span>{error}</span></div>}
    <div className="card table-card">
      {loading ? <div className="empty-state">Loading locations…</div> :
      <table><thead><tr><th>Address</th><th>External ID</th><th>Territory</th><th>Assigned rep</th><th>Current disposition</th><th></th></tr></thead><tbody>
        {locations.map((location)=><tr key={location.id}>
          <td><strong>{location.address}</strong><div className="muted small">{location.city}, {location.state} {location.postalCode}</div></td>
          <td>{location.externalId || "—"}</td>
          <td>{territories.find((t)=>t.id===location.territoryId)?.name ?? "Unassigned"}</td>
          <td>{reps.find((r)=>r.id===location.assignedRepId)?.name ?? "Unassigned"}</td>
          <td><span className="badge">{location.disposition}</span></td>
          <td><Link className="text-link" href={`/locations/${location.id}`}>Open</Link></td>
        </tr>)}
      </tbody></table>}
    </div>
  </AppShell>;
}
