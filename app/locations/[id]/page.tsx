import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LocationInteractionPanel } from "@/components/territory/LocationInteractionPanel";
import { demoDispositions, demoReps, getLocation, getLocationInteractions } from "@/lib/mock/data";

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const location = getLocation(id);
  if (!location) notFound();

  const reps = demoReps.filter((rep) => rep.territoryIds.includes(location.territoryId));
  const interactions = getLocationInteractions(location.id);
  const assignedRep = demoReps.find((rep) => rep.id === location.assignedRepId);

  return (
    <AppShell>
      <div className="breadcrumbs"><Link href="/territories">Territories</Link><span>/</span><Link href={`/territories/${location.territoryId}`}>{location.territory}</Link><span>/</span>{location.address}</div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Location Detail</div>
          <h1>{location.address}</h1>
          <p className="muted">{location.city}, {location.state} {location.postalCode}</p>
        </div>
        <span className="badge">{location.disposition}</span>
      </div>

      <div className="grid location-summary-grid">
        <div className="card"><div className="eyebrow">External ID</div><div className="metric-small">{location.externalId}</div></div>
        <div className="card"><div className="eyebrow">Territory</div><div className="metric-small"><Link className="text-link" href={`/territories/${location.territoryId}`}>{location.territory}</Link></div></div>
        <div className="card"><div className="eyebrow">Team</div><div className="metric-small">{location.team}</div></div>
        <div className="card"><div className="eyebrow">Assigned Rep</div><div className="metric-small">{assignedRep?.name ?? "Unassigned"}</div></div>
      </div>

      <div className="mock-notice"><strong>Mock mode:</strong> interactions you add below are saved only to this browser&apos;s local storage. No customer or employer data is used.</div>

      <LocationInteractionPanel locationId={location.id} reps={reps} dispositions={demoDispositions} initialInteractions={interactions} />
    </AppShell>
  );
}
