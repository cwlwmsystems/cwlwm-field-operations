import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getTerritory, getTerritoryLocations, getTerritoryReps } from "@/lib/mock/data";

export default async function TerritoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const territory = getTerritory(id);
  if (!territory) notFound();

  const reps = getTerritoryReps(territory.id);
  const locations = getTerritoryLocations(territory.id);
  const contacted = locations.filter((location) => location.disposition !== "Unvisited").length;

  return (
    <AppShell>
      <div className="breadcrumbs"><Link href="/territories">Territories</Link><span>/</span>{territory.name}</div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Territory Detail</div>
          <h1>{territory.name}</h1>
          <p className="muted">{territory.description}</p>
        </div>
        <span className="badge success">{territory.status}</span>
      </div>

      <div className="grid metric-grid">
        <div className="card"><div className="eyebrow">Market</div><div className="metric-small">{territory.market}</div></div>
        <div className="card"><div className="eyebrow">Primary team</div><div className="metric-small">{territory.team}</div></div>
        <div className="card"><div className="eyebrow">Assigned reps</div><div className="metric">{reps.length}</div></div>
        <div className="card"><div className="eyebrow">Demo progress</div><div className="metric">{contacted}/{locations.length}</div><div className="muted small">locations contacted</div></div>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div><div className="eyebrow">Coverage</div><h2>Assigned Representatives</h2></div>
          <Link className="text-link" href="/representatives">View all reps</Link>
        </div>
        <div className="rep-grid">
          {reps.map((rep) => (
            <div className="card rep-card" key={rep.id}>
              <div className="avatar">{rep.name.split(" ").map((part) => part[0]).join("")}</div>
              <div><strong>{rep.name}</strong><div className="muted small">{rep.email}</div><span className="badge success">{rep.status}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><div className="eyebrow">Field inventory</div><h2>Locations</h2></div>
          <span className="muted small">Showing synthetic development records</span>
        </div>
        <div className="card table-card">
          <table>
            <thead><tr><th>Address</th><th>External ID</th><th>Current Disposition</th><th>Assigned Rep</th></tr></thead>
            <tbody>
              {locations.map((location) => {
                const rep = reps.find((candidate) => candidate.id === location.assignedRepId);
                return <tr key={location.id}>
                  <td><Link className="table-link" href={`/locations/${location.id}`}>{location.address}</Link><div className="muted small">{location.city}, {location.state} {location.postalCode}</div></td>
                  <td>{location.externalId}</td>
                  <td><span className={`badge ${location.disposition === "Unvisited" ? "neutral" : ""}`}>{location.disposition}</span></td>
                  <td>{rep?.name ?? "Unassigned"}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
