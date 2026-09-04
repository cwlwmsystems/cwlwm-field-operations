import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { demoLocations } from "@/lib/mock/data";

export default function LocationsPage() {
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="eyebrow">Territory Operations</div>
          <h1>Locations</h1>
          <p className="muted">Synthetic service locations used to exercise the generic workflow.</p>
        </div>
        <span className="badge">{demoLocations.length} demo records</span>
      </div>
      <div className="card table-card">
        <table>
          <thead><tr><th>Address</th><th>Territory</th><th>Team</th><th>Disposition</th></tr></thead>
          <tbody>{demoLocations.map((location) => <tr key={location.id}>
            <td><Link className="table-link" href={`/locations/${location.id}`}>{location.address}</Link><div className="muted small">{location.city}, {location.state} {location.postalCode}</div></td>
            <td><Link className="text-link" href={`/territories/${location.territoryId}`}>{location.territory}</Link></td>
            <td>{location.team}</td>
            <td><span className="badge">{location.disposition}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
    </AppShell>
  );
}
