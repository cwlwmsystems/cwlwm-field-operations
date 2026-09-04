"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LocationInteractionPanel } from "@/components/territory/LocationInteractionPanel";
import { useSupabaseConfig } from "@/lib/config/SupabaseConfigProvider";
import { useSupabaseTerritoryOps } from "@/lib/operations/SupabaseTerritoryOpsProvider";

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locations, territories, teams, reps, loading } = useSupabaseConfig();
  const { interactions } = useSupabaseTerritoryOps();
  const location = locations.find((row) => row.id === id);

  if (loading) return <AppShell><div className="card">Loading location…</div></AppShell>;
  if (!location) return <AppShell><div className="card"><h1>Location not found</h1><Link href="/locations">Return</Link></div></AppShell>;

  const territory = territories.find((row) => row.id === location.territoryId);
  const team = teams.find((row) => row.id === location.teamId);
  const rep = reps.find((row) => row.id === location.assignedRepId);
  const latest = interactions.filter((row)=>row.locationId===location.id).sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt))[0];

  return <AppShell>
    <div className="breadcrumbs"><Link href="/locations">Locations</Link><span>/</span>{location.address}</div>
    <div className="page-header">
      <div><div className="eyebrow">Location Operations · Supabase</div><h1>{location.address}</h1><p className="muted">{location.city}, {location.state} {location.postalCode}</p></div>
      <span className="badge">{latest?.disposition ?? location.disposition ?? "Unvisited"}</span>
    </div>

    <div className="grid location-summary-grid">
      <div className="card"><div className="eyebrow">Territory</div><div className="metric-small">{territory?.name ?? "Unassigned"}</div></div>
      <div className="card"><div className="eyebrow">Team</div><div className="metric-small">{team?.name ?? "Unassigned"}</div></div>
      <div className="card"><div className="eyebrow">Representative</div><div className="metric-small">{rep?.name ?? "Unassigned"}</div></div>
      <div className="card"><div className="eyebrow">Interactions</div><div className="metric-small">{interactions.filter((row)=>row.locationId===location.id).length}</div></div>
    </div>

    <section className="card section-block">
      <div className="eyebrow">Location Record</div>
      <div className="summary-list">
        <div><span>External ID</span><strong>{location.externalId || "—"}</strong></div>
        <div><span>Current disposition</span><strong>{latest?.disposition ?? location.disposition ?? "Unvisited"}</strong></div>
      </div>
    </section>

    <section className="section-block">
      <LocationInteractionPanel locationId={location.id} />
    </section>

    <section className="section-block">
      <Link className="button" href={`/sales/new/${location.id}`}>Start Sale</Link>
      <p className="muted small">Sales remains on the Phase 2 local transaction path until Phase 4.</p>
    </section>
  </AppShell>;
}
